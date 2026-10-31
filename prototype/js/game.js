/**
 * Game state, economy ticks, queues — browser vertical slice (localStorage as "server").
 * Tables loaded from ../data/*.json (Unity-ready pack).
 */
import { resolveCombat, heroRawPower, unitNominalPower, unitStatsAtLevel, armyNominalPower } from './combat.js';

const STORAGE_KEY = 'arush_al_usur_phase1_v1';
const ALLIANCE_KEY = 'arush_al_usur_phase1_alliances';

export const BUILDING_ORDER = [
  'palace', 'farm', 'lumber', 'quarry', 'goldmine', 'warehouse',
  'barracks', 'archery', 'wall', 'embassy', 'hospital', 'academy', 'shrine',
];

export async function loadTables() {
  const base = new URL('../../data/', import.meta.url);
  const files = [
    'buildings_l1-5.json',
    'units_slice.json',
    'heroes_launch.json',
    'factions.json',
    'combat_constants_slice.json',
    'npc_camps.json',
    'warehouse_protection.json',
    'stamina.json',
    'quests_daily_slice.json',
    'alliance_slice.json',
    'world_map_slice.json',
    'monsters.json',
    'resource_fields.json',
    'story_chapters.json',
  ];
  const out = {};
  await Promise.all(files.map(async (f) => {
    const res = await fetch(new URL(f, base));
    if (!res.ok) throw new Error(`فشل تحميل ${f}`);
    const key = f.replace('.json', '').replace(/-/g, '_');
    out[key] = await res.json();
  }));
  // normalize keys
  return {
    buildings: out.buildings_l1_5 || out['buildings_l1-5'],
    units: out.units_slice,
    heroes: out.heroes_launch,
    factions: out.factions,
    combat: out.combat_constants_slice,
    npc: out.npc_camps,
    warehouse: out.warehouse_protection,
    stamina: out.stamina,
    quests: out.quests_daily_slice,
    alliance: out.alliance_slice,
    world: out.world_map_slice,
    monsters: out.monsters,
    fields: out.resource_fields,
    story: out.story_chapters,
  };
}

function unitsById(tables) {
  const m = {};
  for (const u of tables.units.units) m[u.id] = u;
  return m;
}

function heroByFaction(tables, factionId) {
  return tables.heroes.heroes.find((h) => h.factionId === factionId);
}

function defaultBuildings() {
  const b = {};
  for (const id of BUILDING_ORDER) b[id] = id === 'palace' || id === 'farm' || id === 'lumber' || id === 'barracks' ? 1 : 0;
  return b;
}

export function createNewState(name, factionId, tables) {
  const hero = heroByFaction(tables, factionId);
  const now = Date.now();
  return {
    version: 1,
    playerName: name,
    factionId,
    createdAt: now,
    lastTick: now,
    timeScale: 60, // 1 real second ≈ 1 game minute (dev slice)
    resources: { food: 2500, wood: 2500, stone: 800, gold: 400 },
    stamina: tables.stamina.cap,
    staminaAccMs: 0,
    buildings: defaultBuildings(),
    buildQueue: null,
    trainQueue: null,
    army: {
      light_infantry: 0, archers: 0, heavy_infantry: 0,
      mangonel_engineers: 0, armored_legion: 0, mounted_archers: 0,
    },
    unitLevels: {},
    wounded: {},
    healQueue: null,
    hero: {
      id: hero.id,
      level: 1,
      skillLevel: 1,
      equip: [
        { id: 'bronze_blade', bonus: 15 },
        { id: 'leather_cloak', bonus: 10 },
      ],
      nowruzChoice: 'march_speed',
    },
    marches: [],
    fieldOccupancy: {},
    fieldStock: {},
    gatherBuffUntil: 0,
    garrisonDefBuffUntil: 0,
    reports: [],
    allianceId: null,
    allianceRole: null,
    helpOnQueue: 0,
    quests: Object.fromEntries((tables.quests.daily || []).map((q) => [q.id, { progress: 0, done: false, claimed: false }])),
    beginnerShieldUntil: now + 48 * 3600 * 1000,
    onboardingStep: 0,
    analytics: [],
    speedMinutes: 5,
    scoutedNodes: {},
    selectedWorldNodeId: null,
    selectedBuildingId: null,
    worldViewBox: null,
  };
}

export function worldNodeById(tables, id) {
  return tables.world?.nodes?.find((n) => n.id === id) || null;
}

export function monsterById(tables, id) {
  return tables.monsters?.monsters?.find((m) => m.id === id) || null;
}

export function fieldById(tables, id) {
  return tables.fields?.fields?.find((f) => f.id === id) || null;
}

export function fieldLevelRow(tables, level) {
  return tables.fields?.levelTable?.find((r) => r.level === level) || null;
}

export function fieldRuntime(state, tables, fieldId) {
  const def = fieldById(tables, fieldId) || fieldById(tables, worldNodeById(tables, fieldId)?.fieldId);
  if (!def) return null;
  const row = fieldLevelRow(tables, def.level);
  const mult = tables.fields?.meta?.resourceStockMult?.[def.resource] ?? 1;
  const stockMax = Math.floor((row?.stockBase || 2000) * mult);
  state.fieldStock = state.fieldStock || {};
  if (state.fieldStock[def.id] == null) {
    state.fieldStock[def.id] = { remaining: stockMax, refillAt: null };
  }
  const st = state.fieldStock[def.id];
  if (st.refillAt && Date.now() >= st.refillAt) {
    st.remaining = stockMax;
    st.refillAt = null;
  }
  return {
    def,
    row,
    stockMax,
    remaining: st.remaining,
    refillAt: st.refillAt,
    gatherPerHour: row?.gatherPerHour || 300,
    stamina: row?.stamina || 5,
    recommendedPower: row?.recommendedPower,
    occupyMinutes: def.occupyMinutesSlice || 1.5,
  };
}

export function resolveAttackTarget(tables, targetId) {
  // Direct NPC camp id
  let camp = tables.npc.camps.find((c) => c.id === targetId);
  if (camp) return { nameAr: camp.nameAr, garrison: camp.garrison, loot: camp.loot, kind: 'npc_camp' };

  const node = worldNodeById(tables, targetId);
  if (!node) return null;

  const monster = monsterById(tables, node.monsterId || node.id);
  if (monster || node.kind === 'monster') {
    const m = monster || {
      nameAr: node.nameAr,
      garrison: node.garrison,
      loot: node.loot,
      recommendedPower: null,
      specialReward: null,
      failWoundMult: 1,
    };
    return {
      nameAr: m.nameAr || node.nameAr,
      garrison: m.garrison || node.garrison,
      loot: m.loot || node.loot || {},
      kind: 'monster',
      recommendedPower: m.recommendedPower,
      specialReward: m.specialReward,
      failWoundMult: m.failWoundMult || 1,
      defensePowerApprox: m.defensePowerApprox,
      monsterId: m.id || node.id,
    };
  }

  if (node.garrison) {
    return { nameAr: node.nameAr, garrison: node.garrison, loot: node.loot || {}, kind: node.kind };
  }
  if (node.npcCampId) {
    camp = tables.npc.camps.find((c) => c.id === node.npcCampId);
    if (camp) {
      return {
        nameAr: node.nameAr || camp.nameAr,
        garrison: camp.garrison,
        loot: camp.loot,
        kind: node.kind,
        recommendedPower: camp.nominalPowerApprox,
        approxPower: camp.nominalPowerApprox,
      };
    }
  }
  return null;
}

export function scoutNode(state, tables, nodeId) {
  const node = worldNodeById(tables, nodeId);
  if (!node) return { ok: false, reason: 'هدف غير موجود' };
  const cost = 2;
  if (state.stamina < cost) return { ok: false, reason: 'طاقة غير كافية للاستطلاع' };
  state.stamina -= cost;
  state.scoutedNodes = state.scoutedNodes || {};
  state.scoutedNodes[nodeId] = Date.now();
  const monster = monsterById(tables, node.monsterId || node.id);
  const fieldRt = node.kind === 'resource' ? fieldRuntime(state, tables, node.fieldId || node.id) : null;
  const detail = monster
    ? `وحش · قوة موصى ≥ ${monster.recommendedPower} · دفاع≈ ${monster.defensePowerApprox}`
    : node.garrison
      ? `حامية مرصودة ≈ ${Object.values(node.garrison).reduce((a, b) => a + b, 0)} وحدة`
      : node.npcCampId
        ? `يرتبط بمعسكر ${node.npcCampId}`
        : fieldRt
          ? `حقل ${fieldRt.def.resource} م${fieldRt.def.level} · متبقٍ ${fieldRt.remaining}/${fieldRt.stockMax} · ${fieldRt.gatherPerHour}/س · طاقة ${fieldRt.stamina}`
          : (node.notes || 'استطلاع مكتمل');
  state.reports.unshift({
    id: `r_${Date.now()}`,
    kind: 'scout',
    at: Date.now(),
    targetName: node.nameAr,
    text: `استطلاع: ${node.nameAr} — ${detail}`,
  });
  track(state, 'scout', { nodeId });
  return { ok: true, detail };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function clearState() {
  localStorage.removeItem(STORAGE_KEY);
}

export function loadAlliances() {
  try {
    return JSON.parse(localStorage.getItem(ALLIANCE_KEY) || '{"list":[]}');
  } catch {
    return { list: [] };
  }
}

export function saveAlliances(db) {
  localStorage.setItem(ALLIANCE_KEY, JSON.stringify(db));
}

export function track(state, event, payload = {}) {
  state.analytics.push({ event, at: Date.now(), ...payload });
  if (state.analytics.length > 100) state.analytics.shift();
}

function buildingDef(tables, id) {
  return tables.buildings.buildings[id];
}

export function canUpgrade(state, tables, buildingId) {
  const def = buildingDef(tables, buildingId);
  if (!def) return { ok: false, reason: 'مبنى غير معروف' };
  const level = state.buildings[buildingId] || 0;
  if (level >= def.maxLevelSlice) return { ok: false, reason: 'وصلت للحد الأقصى في الشريحة' };
  if (level === 0) {
    // unlock rules
    if (buildingId === 'archery' && (state.buildings.palace || 0) < 4) return { ok: false, reason: 'يتطلب قصر 4' };
    if (buildingId === 'embassy' && (state.buildings.palace || 0) < 3) return { ok: false, reason: 'يتطلب قصر 3' };
    if (buildingId === 'shrine' && (state.buildings.palace || 0) < 2) return { ok: false, reason: 'يتطلب قصر 2' };
    if (buildingId === 'academy' && (state.buildings.palace || 0) < 2) return { ok: false, reason: 'يتطلب قصر 2' };
  }
  if (state.buildQueue) return { ok: false, reason: 'طابور البناء مشغول' };
  const fromLevel = Math.max(1, level);
  // If level 0, cost is upgrade from "virtual 0" → use L1→2 base as construct cost lighter
  let cost;
  if (level === 0) {
    const l1 = def.levels['1'];
    cost = l1?.upgradeToNext
      ? { food: Math.floor(l1.upgradeToNext.food * 0.5), wood: Math.floor(l1.upgradeToNext.wood * 0.5), stone: Math.floor((l1.upgradeToNext.stone || 0) * 0.5), gold: Math.floor((l1.upgradeToNext.gold || 0) * 0.5), minutes: Math.max(1, Math.floor((l1.upgradeToNext.minutes || 1) * 0.5)) }
      : { food: 100, wood: 100, stone: 0, gold: 0, minutes: 1 };
  } else {
    cost = def.levels[String(level)]?.upgradeToNext;
  }
  if (!cost) return { ok: false, reason: 'لا توجد تكلفة' };
  for (const r of ['food', 'wood', 'stone', 'gold']) {
    if ((state.resources[r] || 0) < (cost[r] || 0)) return { ok: false, reason: `موارد غير كافية (${r})`, cost };
  }
  return { ok: true, cost, nextLevel: level + 1 };
}

export function startUpgrade(state, tables, buildingId) {
  const check = canUpgrade(state, tables, buildingId);
  if (!check.ok) return check;
  for (const r of ['food', 'wood', 'stone', 'gold']) {
    state.resources[r] -= check.cost[r] || 0;
  }
  const durationMs = (check.cost.minutes * 60 * 1000) / state.timeScale;
  state.buildQueue = {
    buildingId,
    targetLevel: check.nextLevel,
    startedAt: Date.now(),
    completesAt: Date.now() + durationMs,
    baseDurationMs: durationMs,
    helps: 0,
  };
  bumpQuest(state, 'upgrade_any', 1);
  return { ok: true };
}

function applyHelpToTimer(timer, tables, state) {
  const cfg = tables.alliance.help;
  if ((timer.helps || 0) >= cfg.maxHelpsPerTimer) return { ok: false, reason: 'وصلت سقف المساعدات' };
  const remaining = timer.completesAt - Date.now();
  if (remaining <= 0) return { ok: false, reason: 'المؤقّت مكتمل' };
  const cut = Math.max(cfg.minReductionSeconds * 1000 / state.timeScale, remaining * cfg.timeReductionPercentPerHelp);
  timer.completesAt -= cut;
  timer.helps = (timer.helps || 0) + 1;
  bumpQuest(state, 'alliance_help', 1);
  return { ok: true, cutMs: cut };
}

export function requestBuildHelp(state, tables) {
  if (!state.buildQueue) return { ok: false, reason: 'لا يوجد مؤقّت بناء' };
  if (!state.allianceId) return { ok: false, reason: 'انضم لتحالف أولاً' };
  return applyHelpToTimer(state.buildQueue, tables, state);
}

export function requestHealHelp(state, tables) {
  if (!state.healQueue) return { ok: false, reason: 'لا يوجد مؤقّت شفاء' };
  if (!state.allianceId) return { ok: false, reason: 'انضم لتحالف أولاً' };
  return applyHelpToTimer(state.healQueue, tables, state);
}

/** kind: 'build' | 'heal' */
export function requestAllianceHelp(state, tables, kind = 'build') {
  return kind === 'heal' ? requestHealHelp(state, tables) : requestBuildHelp(state, tables);
}

export function formatEta(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  if (s < 60) return `${s}ث`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r ? `${m}د ${r}ث` : `${m}د`;
}

export function playerCastlePos(tables) {
  const n = worldNodeById(tables, 'castle_player');
  return n ? { x: n.x, y: n.y } : { x: 500, y: 520 };
}

export function marchProgress(march, now = Date.now()) {
  if (march.status === 'traveling') {
    const total = Math.max(1, march.arrivesAt - march.startedAt);
    const t = Math.min(1, Math.max(0, (now - march.startedAt) / total));
    return { phase: 'traveling', t, etaMs: Math.max(0, march.arrivesAt - now) };
  }
  if (march.status === 'gathering') {
    const total = Math.max(1, march.gatherEndsAt - march.arrivesAt);
    const t = Math.min(1, Math.max(0, (now - march.arrivesAt) / total));
    return { phase: 'gathering', t, etaMs: Math.max(0, march.gatherEndsAt - now) };
  }
  if (march.status === 'returning') {
    const start = march.returnStartedAt || march.arrivesAt;
    const total = Math.max(1, march.returnsAt - start);
    const t = Math.min(1, Math.max(0, (now - start) / total));
    return { phase: 'returning', t, etaMs: Math.max(0, march.returnsAt - now) };
  }
  return { phase: march.status, t: 1, etaMs: 0 };
}

export function marchLabelAr(march) {
  if (march.type === 'gather') {
    if (march.status === 'gathering') return 'احتلال جمع';
    if (march.status === 'returning') return 'عودة جمع';
    return 'مسير جمع';
  }
  if (march.status === 'returning') return 'عودة غارة';
  return 'مسير غارة';
}

export function applySpeedToBuild(state, minutes) {
  if (!state.buildQueue || minutes <= 0) return { ok: false };
  const use = Math.min(minutes, state.speedMinutes);
  if (use <= 0) return { ok: false, reason: 'لا تسريع متاح' };
  state.speedMinutes -= use;
  state.buildQueue.completesAt -= (use * 60 * 1000) / state.timeScale;
  return { ok: true };
}

function productionPerHour(state, tables) {
  const rates = { food: 0, wood: 0, stone: 0, gold: 0 };
  const map = { farm: 'food', lumber: 'wood', quarry: 'stone', goldmine: 'gold' };
  for (const [bid, res] of Object.entries(map)) {
    const lvl = state.buildings[bid] || 0;
    if (lvl <= 0) continue;
    const entry = buildingDef(tables, bid)?.levels?.[String(lvl)];
    rates[res] += entry?.productionPerHour?.[res] || 0;
  }
  return rates;
}

function warehouseCap(state, tables) {
  const lvl = state.buildings.warehouse || 0;
  if (lvl <= 0) return 0;
  return tables.warehouse.protectionByLevel[String(lvl)]
    || buildingDef(tables, 'warehouse')?.levels?.[String(lvl)]?.protectionPerResource
    || 0;
}

export function tick(state, tables, now = Date.now()) {
  const events = [];
  const dt = Math.max(0, now - state.lastTick);
  if (dt <= 0) return events;

  // Production: every 60 game-seconds add prod/60
  // With timeScale, real ms maps to game ms * timeScale
  const gameMs = dt * state.timeScale;
  const rates = productionPerHour(state, tables);
  const hours = gameMs / (3600 * 1000);
  for (const r of Object.keys(rates)) {
    state.resources[r] = Math.floor(state.resources[r] + rates[r] * hours);
  }

  // Stamina regen: 1 / 3 game minutes
  const staminaInterval = tables.stamina.regenOnePointEveryMinutes * 60 * 1000;
  state.staminaAccMs = (state.staminaAccMs || 0) + gameMs;
  while (state.staminaAccMs >= staminaInterval && state.stamina < tables.stamina.cap) {
    state.stamina += 1;
    state.staminaAccMs -= staminaInterval;
  }

  // Build complete
  if (state.buildQueue && now >= state.buildQueue.completesAt) {
    const { buildingId, targetLevel } = state.buildQueue;
    state.buildings[buildingId] = targetLevel;
    state.buildQueue = null;
    events.push({ type: 'building_complete', buildingId, level: targetLevel });
    track(state, 'building_complete', { buildingId, level: targetLevel });
  }

  // Train complete
  if (state.trainQueue && now >= state.trainQueue.completesAt) {
    const { unitId, count, level } = state.trainQueue;
    state.army[unitId] = (state.army[unitId] || 0) + count;
    state.unitLevels = state.unitLevels || {};
    state.unitLevels[unitId] = Math.max(state.unitLevels[unitId] || 1, level || 1);
    state.trainQueue = null;
    events.push({ type: 'train_complete', unitId, count, level: level || 1 });
  }

  // Heal complete
  if (state.healQueue && now >= state.healQueue.completesAt) {
    for (const [uid, c] of Object.entries(state.healQueue.units || {})) {
      state.army[uid] = (state.army[uid] || 0) + c;
    }
    const n = Object.values(state.healQueue.units || {}).reduce((a, b) => a + b, 0);
    state.healQueue = null;
    events.push({ type: 'heal_complete', healed: n });
  }

  // Marches
  for (const m of state.marches) {
    if (m.status === 'traveling' && now >= m.arrivesAt) {
      if (m.type === 'gather') {
        beginGatherOccupy(state, tables, m);
        events.push({ type: 'gather_start', id: m.id });
      } else {
        finishCombatMarch(state, tables, m);
        events.push({ type: 'march_report', id: m.id });
      }
    } else if (m.status === 'gathering' && now >= m.gatherEndsAt) {
      finishGatherOccupy(state, tables, m);
      events.push({ type: 'gather_done', id: m.id });
    } else if (m.status === 'returning' && now >= m.returnsAt) {
      for (const [uid, c] of Object.entries(m.armyReturning || {})) {
        state.army[uid] = (state.army[uid] || 0) + c;
      }
      if (m.gatherLoot) {
        for (const r of Object.keys(m.gatherLoot)) state.resources[r] += m.gatherLoot[r];
      }
      m.status = 'done';
      events.push({ type: 'march_home', id: m.id, loot: m.gatherLoot || null });
    }
  }
  state.marches = state.marches.filter((m) => m.status !== 'done');

  state.lastTick = now;
  return events;
}

export function unitLevelDef(unit, level = 1) {
  if (!unit) return null;
  if (unit.levels) return unit.levels[String(level)] || unit.levels['1'] || null;
  return {
    nominalPower: unit.nominalPower,
    cost: unit.cost,
    trainSeconds: unit.trainSeconds,
    stats: unit.stats,
    requiresPalace: unit.requiresPalace || 1,
    requiresBuildingLevel: 1,
  };
}

export function maxUnlockableUnitLevel(state, tables, unitId) {
  const u = unitsById(tables)[unitId];
  if (!u?.levels) return 1;
  const palace = state.buildings.palace || 0;
  const bLvl = state.buildings[u.trainBuilding] || 0;
  let max = 0;
  for (const [lv, def] of Object.entries(u.levels)) {
    const n = Number(lv);
    if (palace >= (def.requiresPalace || 1) && bLvl >= (def.requiresBuildingLevel || 1)) {
      max = Math.max(max, n);
    }
  }
  return max;
}

export function canTrain(state, tables, unitId, count, level = 1) {
  const u = unitsById(tables)[unitId];
  if (!u) return { ok: false, reason: 'وحدة غير معروفة' };
  if (count < 1) return { ok: false, reason: 'العدد غير صالح' };
  if (state.trainQueue) return { ok: false, reason: 'طابور التدريب مشغول' };
  const bLvl = state.buildings[u.trainBuilding] || 0;
  if (bLvl < 1) return { ok: false, reason: `ابنِ ${u.trainBuilding} أولاً` };
  if (u.factionId && u.factionId !== state.factionId) return { ok: false, reason: 'وحدة فصيل آخر' };
  const lvDef = unitLevelDef(u, level);
  if (!lvDef) return { ok: false, reason: `مستوى ${level} غير متاح` };
  if ((state.buildings.palace || 0) < (lvDef.requiresPalace || 1)) {
    return { ok: false, reason: `يتطلب قصر ${lvDef.requiresPalace}` };
  }
  if (bLvl < (lvDef.requiresBuildingLevel || 1)) {
    return { ok: false, reason: `يتطلب ${u.trainBuilding} مستوى ${lvDef.requiresBuildingLevel}` };
  }
  if (level > (u.maxLevelSlice || 5)) return { ok: false, reason: 'فوق سقف مستوى الشريحة' };
  for (const r of ['food', 'wood', 'stone', 'gold']) {
    const need = (lvDef.cost?.[r] || 0) * count;
    if ((state.resources[r] || 0) < need) return { ok: false, reason: 'موارد غير كافية' };
  }
  return { ok: true, unit: u, levelDef: lvDef, level };
}

export function startTrain(state, tables, unitId, count, level = 1) {
  const check = canTrain(state, tables, unitId, count, level);
  if (!check.ok) return check;
  const u = check.unit;
  const lvDef = check.levelDef;
  for (const r of ['food', 'wood', 'stone', 'gold']) {
    state.resources[r] -= (lvDef.cost?.[r] || 0) * count;
  }
  let seconds = (lvDef.trainSeconds || 20) * count;
  if (state.factionId === 'rome') seconds *= 0.92;
  const heroDef = tables.heroes.heroes.find((h) => h.id === state.hero.id);
  if (heroDef?.passive?.effect === 'infantry_train_time_reduction' && u.category === 'infantry') {
    seconds *= 1 - heroDef.passive.value;
  }
  const durationMs = (seconds * 1000) / state.timeScale;
  state.trainQueue = { unitId, count, level, completesAt: Date.now() + durationMs };
  bumpQuest(state, 'train_50', count);
  return { ok: true };
}

function bumpQuest(state, id, n) {
  const q = state.quests[id];
  if (!q || q.done) return;
  q.progress = (q.progress || 0) + n;
  const need = id === 'train_50' ? 50 : 1;
  if (q.progress >= need) q.done = true;
}

export function claimQuest(state, tables, id) {
  const q = state.quests[id];
  const def = tables.quests.daily.find((x) => x.id === id);
  if (!q?.done || q.claimed || !def) return { ok: false };
  q.claimed = true;
  const rw = def.reward || {};
  for (const r of ['food', 'wood', 'stone', 'gold']) if (rw[r]) state.resources[r] += rw[r];
  if (rw.speedMinutes) state.speedMinutes += rw.speedMinutes;
  if (rw.stamina) state.stamina = Math.min(tables.stamina.cap, state.stamina + rw.stamina);
  return { ok: true };
}

export function playerArmyPower(state, tables) {
  const ub = unitsById(tables);
  return Math.round(armyNominalPower(state.army, ub, state.unitLevels || {}));
}

export function startMarch(state, tables, { type, targetId, army, useHeroSkill = true }) {
  const node = worldNodeById(tables, targetId);
  let cost = tables.stamina.costs[type === 'gather' ? 'gather' : 'raid_npc'] || 8;
  if (type === 'gather') {
    const rt = fieldRuntime(state, tables, node?.fieldId || targetId);
    if (rt) cost = rt.stamina;
  }
  if (state.stamina < cost) return { ok: false, reason: 'طاقة مسير غير كافية' };

  let total = 0;
  for (const c of Object.values(army || {})) total += c;
  if (total < 1) return { ok: false, reason: 'اختر وحدات' };
  if (total > 1000) return { ok: false, reason: 'سقف المسيرة 1000' };

  for (const [uid, c] of Object.entries(army)) {
    if ((state.army[uid] || 0) < c) return { ok: false, reason: 'وحدات غير كافية' };
  }

  if (type === 'gather') {
    if (state.fieldOccupancy?.[targetId]) return { ok: false, reason: 'الحقل محتل بمسيرة أخرى' };
    if (state.marches.some((m) => m.type === 'gather' && m.targetId === targetId && m.status !== 'done')) {
      return { ok: false, reason: 'مسيرة جمع لهذا الحقل جارية' };
    }
    const rt = fieldRuntime(state, tables, node?.fieldId || targetId);
    if (rt && rt.remaining <= 0) return { ok: false, reason: 'الحقل فارغ — بانتظار إعادة الملء' };
  }

  for (const [uid, c] of Object.entries(army)) state.army[uid] -= c;
  state.stamina -= cost;

  const ub = unitsById(tables);
  let speed = 4;
  for (const [uid, c] of Object.entries(army)) {
    if (c && ub[uid]) {
      const st = unitStatsAtLevel(ub[uid], state.unitLevels?.[uid] || 1);
      speed = Math.min(speed, st?.marchTilesPerMin || 4);
    }
  }
  if (state.factionId === 'persia') speed *= 1.1;
  if (useHeroSkill && state.hero.nowruzChoice === 'march_speed' && state.factionId === 'persia') {
    speed *= 1.12;
  }

  const home = playerCastlePos(tables);
  const dest = node ? { x: node.x, y: node.y } : { x: home.x + 80, y: home.y - 60 };
  const dist = Math.hypot(dest.x - home.x, dest.y - home.y) / 40;
  const tiles = Math.max(type === 'gather' ? 5 : 6, dist);
  const travelGameMin = tiles / speed;
  const travelMs = (travelGameMin * 60 * 1000) / state.timeScale;
  const rtGather = type === 'gather' ? fieldRuntime(state, tables, node?.fieldId || targetId) : null;
  const occupyMin = rtGather?.occupyMinutes || 1.5;
  const gatherMs = type === 'gather' ? (occupyMin * 60 * 1000) / state.timeScale : 0;

  const id = `m_${Date.now()}_${Math.floor(Math.random() * 999)}`;
  const march = {
    id,
    type,
    targetId,
    targetNameAr: node?.nameAr || targetId,
    army: { ...army },
    unitLevels: { ...(state.unitLevels || {}) },
    useHeroSkill,
    status: 'traveling',
    startedAt: Date.now(),
    arrivesAt: Date.now() + travelMs,
    gatherEndsAt: null,
    gatherMs,
    returnStartedAt: null,
    returnsAt: null,
    from: { ...home },
    to: { ...dest },
    armyReturning: null,
    gatherLoot: null,
  };
  state.marches.push(march);
  track(state, 'march_sent', { type, targetId });
  if (type !== 'gather') bumpQuest(state, 'raid_npc', 1);
  return { ok: true, march };
}

function computeGatherLoot(state, tables, march, progress = 1) {
  const ub = unitsById(tables);
  const node = worldNodeById(tables, march.targetId);
  const rt = fieldRuntime(state, tables, node?.fieldId || march.targetId);
  const loot = { food: 40, wood: 40, stone: 20, gold: 10 };
  let primary = node?.yieldHint || 400;
  let resource = node?.resource;
  if (rt) {
    resource = rt.def.resource;
    // Expected yield ≈ gatherPerHour * occupy hours, capped by remaining + load
    const hours = (rt.occupyMinutes || 1.5) / 60;
    primary = Math.floor(rt.gatherPerHour * hours * Math.max(0.15, Math.min(1, progress)));
    primary = Math.min(primary, rt.remaining);
  }
  if (resource) {
    loot.food = resource === 'food' ? primary : 20;
    loot.wood = resource === 'wood' ? primary : 20;
    loot.stone = resource === 'stone' ? primary : 10;
    loot.gold = resource === 'gold' ? primary : 5;
  } else {
    loot.food = 400; loot.wood = 350; loot.stone = 80; loot.gold = 20;
  }
  let load = 0;
  for (const [uid, c] of Object.entries(march.army)) {
    const st = unitStatsAtLevel(ub[uid], march.unitLevels?.[uid] || state.unitLevels?.[uid] || 1);
    load += (st?.load || 0) * c;
  }
  if (state.factionId === 'persia' && march.army.mounted_archers) {
    load = Math.floor(load * 1.05);
  }
  const heroDef = tables.heroes.heroes.find((h) => h.id === state.hero.id);
  if (heroDef?.passive?.effect === 'cavalry_load') {
    load = Math.floor(load * (1 + heroDef.passive.value));
  }
  if (state.gatherBuffUntil && Date.now() < state.gatherBuffUntil) {
    for (const k of Object.keys(loot)) loot[k] = Math.floor(loot[k] * 1.2);
  }
  const scale = Math.min(1, load / Math.max(80, primary || 200));
  for (const k of Object.keys(loot)) loot[k] = Math.floor(loot[k] * Math.max(0.2, scale));
  // Deduct stock
  if (rt && state.fieldStock?.[rt.def.id]) {
    const taken = loot[resource] || 0;
    state.fieldStock[rt.def.id].remaining = Math.max(0, state.fieldStock[rt.def.id].remaining - taken);
    if (state.fieldStock[rt.def.id].remaining <= 0) {
      const [lo, hi] = rt.row?.refillMinutes || [20, 30];
      const mins = lo + Math.random() * (hi - lo);
      state.fieldStock[rt.def.id].refillAt = Date.now() + (mins * 60 * 1000) / state.timeScale;
    }
  }
  return loot;
}

function beginGatherOccupy(state, tables, march) {
  state.fieldOccupancy = state.fieldOccupancy || {};
  state.fieldOccupancy[march.targetId] = march.id;
  march.status = 'gathering';
  march.gatherEndsAt = Date.now() + (march.gatherMs || 2000);
}

function finishGatherOccupy(state, tables, march, earlyProgress = 1) {
  if (state.fieldOccupancy?.[march.targetId] === march.id) {
    delete state.fieldOccupancy[march.targetId];
  }
  const loot = computeGatherLoot(state, tables, march, earlyProgress);
  march.gatherLoot = loot;
  march.armyReturning = { ...march.army };
  const travelMs = Math.max(500, march.arrivesAt - march.startedAt);
  march.status = 'returning';
  march.returnStartedAt = Date.now();
  march.returnsAt = Date.now() + travelMs;
  const tmp = march.from;
  march.from = { ...march.to };
  march.to = tmp;
  const place = march.targetNameAr || 'حقل برّي';
  const node = worldNodeById(tables, march.targetId);
  const rt = fieldRuntime(state, tables, node?.fieldId || march.targetId);
  const stockLine = rt
    ? ` · متبقٍ في الحقل ${rt.remaining}/${rt.stockMax} · عائد ${rt.gatherPerHour}/س`
    : '';
  state.reports.unshift({
    id: `r_${Date.now()}`,
    kind: 'gather',
    at: Date.now(),
    loot,
    fieldLevel: rt?.def?.level,
    text: earlyProgress < 1
      ? `أُلغي الجمع مبكراً من ${place}${stockLine} — غنيمة جزئية.`
      : `اكتمل احتلال ${place}${stockLine} — القافلة في طريق العودة.`,
  });
}

function finishCombatMarch(state, tables, march) {
  const target = resolveAttackTarget(tables, march.targetId);
  if (!target) {
    march.armyReturning = { ...march.army };
    march.status = 'returning';
    march.returnStartedAt = Date.now();
    march.returnsAt = Date.now() + 2000;
    const tmp = march.from; march.from = { ...march.to }; march.to = tmp;
    return;
  }

  const heroDef = tables.heroes.heroes.find((h) => h.id === state.hero.id);
  const equipBonus = (state.hero.equip || []).reduce((s, e) => s + (e.bonus || 0), 0);
  const attackerBuffs = {};
  if (state.factionId === 'rome') attackerBuffs.infantryAttack = 0.05;
  const skillBonus = (heroDef?.active?.valueAtLevel1 || 0)
    + ((state.hero.skillLevel || 1) - 1) * (heroDef?.active?.valuePerSkillLevel || 0);
  if (march.useHeroSkill && heroDef?.active?.effect === 'infantry_attack_first_round') {
    attackerBuffs.infantryAttack = (attackerBuffs.infantryAttack || 0) + skillBonus;
  }
  if (march.useHeroSkill && state.factionId === 'persia' && state.hero.nowruzChoice === 'cavalry_attack_on_arrival') {
    attackerBuffs.infantryAttack = (attackerBuffs.infantryAttack || 0) + 0.08;
  }
  if (state.garrisonDefBuffUntil && Date.now() < state.garrisonDefBuffUntil) {
    // unused on attack; kept for city defense later
  }

  const report = resolveCombat({
    attackerArmy: march.army,
    defenderArmy: target.garrison,
    unitsById: unitsById(tables),
    combatConstants: tables.combat,
    attackerHero: {
      level: state.hero.level,
      heroRawPowerAtLevel1: heroDef.heroRawPowerAtLevel1,
      heroRawPowerAtLevel20Approx: heroDef.heroRawPowerAtLevel20Approx,
      equipBonus,
    },
    attackerBuffs,
    attackerUnitLevels: march.unitLevels || state.unitLevels || {},
    wallLevel: 0,
    lootTable: target.loot,
    monsterFailWoundMult: target.failWoundMult || 1,
  });

  for (const [uid, w] of Object.entries(report.attacker.wounded || {})) {
    if (w > 0) state.wounded[uid] = (state.wounded[uid] || 0) + w;
  }

  march.armyReturning = { ...report.attacker.after };
  let specialLine = '';
  if (report.outcome === 'win') {
    for (const r of Object.keys(report.loot)) state.resources[r] += report.loot[r];
    if (target.specialReward) {
      specialLine = ` · مكافأة: ${target.specialReward.nameAr}`;
      if (target.specialReward.id === 'gather_buff_2h') {
        state.gatherBuffUntil = Date.now() + (2 * 3600 * 1000) / state.timeScale;
      }
      if (target.specialReward.id === 'garrison_def_buff') {
        state.garrisonDefBuffUntil = Date.now() + (2 * 3600 * 1000) / state.timeScale;
      }
      if (target.specialReward.id === 'caravan_chest') {
        state.resources.gold += 40;
        report.loot.gold = (report.loot.gold || 0) + 40;
      }
      if (target.specialReward.id === 'legend_token') {
        state.resources.gold += 100;
        state.resources.food += 500;
        report.loot.gold = (report.loot.gold || 0) + 100;
        report.loot.food = (report.loot.food || 0) + 500;
      }
    }
  }

  const outcomeAr = report.outcome === 'win' ? 'فوز' : report.outcome === 'loss' ? 'خسارة' : 'تعادل';
  const lvlLine = report.levelNote ? ` · مستويات وحدات: ${report.levelNote}` : '';
  const recLine = target.recommendedPower ? ` · موصى ≥${target.recommendedPower} (قوتك ${report.attPower})` : '';
  state.reports.unshift({
    id: `r_${Date.now()}`,
    kind: 'combat',
    at: Date.now(),
    targetName: target.nameAr,
    outcome: report.outcome,
    outcomeAr,
    R: report.R,
    hero: report.hero,
    attacker: report.attacker,
    loot: report.loot,
    attPower: report.attPower,
    defPower: report.defPower,
    recommendedPower: target.recommendedPower || null,
    specialReward: target.specialReward || null,
    unitLevelsUsed: report.unitLevelsUsed,
    text: `غارة على ${target.nameAr}: ${outcomeAr}. مساهمة البطل ${Math.round(report.hero.contributionRatio * 100)}٪ (سقف 25٪).${recLine}${lvlLine}${specialLine}`,
  });
  if (state.reports.length > 30) state.reports.pop();
  track(state, 'march_report', { outcome: report.outcome, heroRatio: report.hero.contributionRatio });

  const travelMs = Math.max(500, march.arrivesAt - march.startedAt);
  march.status = 'returning';
  march.returnStartedAt = Date.now();
  march.returnsAt = Date.now() + travelMs;
  const tmp = march.from; march.from = { ...march.to }; march.to = tmp;
}

export function recallMarch(state, tables, marchId) {
  const march = state.marches.find((m) => m.id === marchId);
  if (!march || march.status === 'done') return { ok: false, reason: 'مسيرة غير موجودة' };

  if (march.status === 'traveling') {
    const prog = marchProgress(march);
    const x = march.from.x + (march.to.x - march.from.x) * prog.t;
    const y = march.from.y + (march.to.y - march.from.y) * prog.t;
    const home = playerCastlePos(tables);
    const remainFrac = Math.max(0.2, prog.t);
    const travelMs = Math.max(400, (march.arrivesAt - march.startedAt) * remainFrac);
    march.armyReturning = { ...march.army };
    march.gatherLoot = null;
    march.from = { x, y };
    march.to = { ...home };
    march.status = 'returning';
    march.returnStartedAt = Date.now();
    march.returnsAt = Date.now() + travelMs;
    track(state, 'march_recall', { id: marchId, phase: 'traveling' });
    return { ok: true, message: 'استُدعيت المسيرة — في طريق العودة' };
  }

  if (march.status === 'gathering') {
    const prog = marchProgress(march);
    finishGatherOccupy(state, tables, march, Math.max(0.2, prog.t));
    track(state, 'march_recall', { id: marchId, phase: 'gathering' });
    return { ok: true, message: 'أُلغي الاحتلال — غنيمة جزئية والعودة جارية' };
  }

  if (march.status === 'returning') {
    return { ok: false, reason: 'المسيرة عائدة بالفعل' };
  }
  return { ok: false, reason: 'لا يمكن الاستدعاء' };
}

export function startHeal(state, tables) {
  const hosp = state.buildings.hospital || 0;
  if (hosp < 1) return { ok: false, reason: 'ابنِ المستشفى' };
  if (state.healQueue) return { ok: false, reason: 'طابور الشفاء مشغول' };
  const units = {};
  let total = 0;
  for (const [uid, n] of Object.entries(state.wounded || {})) {
    if (n > 0) { units[uid] = n; total += n; }
  }
  if (total < 1) return { ok: false, reason: 'لا جرحى' };
  const foodCost = total * 2;
  if (state.resources.food < foodCost) return { ok: false, reason: 'طعام غير كافٍ' };
  state.resources.food -= foodCost;
  state.wounded = {};
  const gameSec = Math.max(20, total * (10 - Math.min(3, hosp)));
  const durationMs = (gameSec * 1000) / state.timeScale;
  state.healQueue = {
    units,
    startedAt: Date.now(),
    completesAt: Date.now() + durationMs,
    helps: 0,
    total,
  };
  return { ok: true, total, durationMs };
}

export function healWounded(state, tables) {
  return startHeal(state, tables);
}

export function upgradeHero(state) {
  if (state.hero.level >= 20) return { ok: false, reason: 'سقف الشريحة 20' };
  const cost = { food: 200 * state.hero.level, gold: 20 * state.hero.level };
  if (state.resources.food < cost.food || state.resources.gold < cost.gold) {
    return { ok: false, reason: 'موارد غير كافية' };
  }
  state.resources.food -= cost.food;
  state.resources.gold -= cost.gold;
  state.hero.level += 1;
  bumpQuest(state, 'hero_level', 1);
  return { ok: true };
}

export function upgradeHeroSkill(state) {
  if (state.hero.skillLevel >= 5) return { ok: false, reason: 'سقف مهارة الشريحة' };
  const cost = { gold: 30 * state.hero.skillLevel };
  if (state.resources.gold < cost.gold) return { ok: false, reason: 'ذهب غير كافٍ' };
  state.resources.gold -= cost.gold;
  state.hero.skillLevel += 1;
  bumpQuest(state, 'hero_level', 1);
  return { ok: true };
}

export function createAlliance(state, name, tag, desc = '') {
  if (state.allianceId) return { ok: false, reason: 'أنت بالفعل في تحالف' };
  if ((state.buildings.embassy || 0) < 1) return { ok: false, reason: 'ابنِ السفارة' };
  const db = loadAlliances();
  const id = `a_${Date.now()}`;
  const alliance = {
    id,
    name,
    tag: (tag || 'عرش').slice(0, 4),
    desc,
    members: [{ name: state.playerName, role: 'leader', power: approxPower(state) }],
  };
  db.list.push(alliance);
  saveAlliances(db);
  state.allianceId = id;
  state.allianceRole = 'leader';
  track(state, 'alliance_join', { create: true, id });
  return { ok: true, alliance };
}

export function joinAlliance(state, allianceId) {
  if (state.allianceId) return { ok: false, reason: 'أنت بالفعل في تحالف' };
  if ((state.buildings.embassy || 0) < 1) return { ok: false, reason: 'ابنِ السفارة' };
  const db = loadAlliances();
  const a = db.list.find((x) => x.id === allianceId);
  if (!a) return { ok: false, reason: 'تحالف غير موجود' };
  if (a.members.length >= 30) return { ok: false, reason: 'التحالف ممتلئ' };
  a.members.push({ name: state.playerName, role: 'member', power: approxPower(state) });
  saveAlliances(db);
  state.allianceId = allianceId;
  state.allianceRole = 'member';
  track(state, 'alliance_join', { id: allianceId });
  return { ok: true, alliance: a };
}

export function leaveAlliance(state) {
  if (!state.allianceId) return { ok: false };
  const db = loadAlliances();
  const a = db.list.find((x) => x.id === state.allianceId);
  if (a) {
    a.members = a.members.filter((m) => m.name !== state.playerName);
    if (!a.members.length) db.list = db.list.filter((x) => x.id !== a.id);
    else if (state.allianceRole === 'leader' && a.members[0]) a.members[0].role = 'leader';
    saveAlliances(db);
  }
  state.allianceId = null;
  state.allianceRole = null;
  return { ok: true };
}

export function getAlliance(state) {
  if (!state.allianceId) return null;
  return loadAlliances().list.find((x) => x.id === state.allianceId) || null;
}

export function approxPower(state, tables = null) {
  let p = 0;
  if (tables) {
    p = playerArmyPower(state, tables);
  } else {
    for (const [uid, c] of Object.entries(state.army || {})) {
      const nom = {
        light_infantry: 2, archers: 3, heavy_infantry: 5,
        mangonel_engineers: 9, armored_legion: 7, mounted_archers: 8,
      }[uid] || 2;
      const lvl = state.unitLevels?.[uid] || 1;
      p += c * nom * (1.12 ** (lvl - 1));
    }
  }
  p += (state.buildings.palace || 0) * 50;
  return Math.round(p);
}

export function formatResources(res) {
  return res;
}

export {
  unitsById, heroByFaction, productionPerHour, warehouseCap, heroRawPower,
  unitNominalPower, unitStatsAtLevel, armyNominalPower,
};
