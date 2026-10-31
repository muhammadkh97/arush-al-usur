/**
 * Combat resolution for Phase 1 vertical slice.
 * Source of truth: docs/economy-combat-tables.md §5–§7 + data/combat_constants_slice.json
 *
 * Intentional simplifications (also listed in combat_constants_slice.json):
 * - Neutral terrain factor = 1.0
 * - NPC camps have no wall
 * - Faction specials mapped via categoryAlias
 * - HeroContribution capped at 25% of ArmyPowerBeforeHero
 * - AU-16: unit level power from levels{} or legacy nominalPower
 */

export function heroRawPower(level, baseAt1 = 120, at20 = 900) {
  const t = Math.max(0, Math.min(1, (level - 1) / 19));
  return Math.round(baseAt1 + (at20 - baseAt1) * t);
}

/** Resolve nominal power for a unit at a given level (supports legacy + levels map). */
export function unitNominalPower(unit, level = 1) {
  if (!unit) return 0;
  const lv = String(level || 1);
  if (unit.levels?.[lv]?.nominalPower != null) return unit.levels[lv].nominalPower;
  if (unit.levels?.['1']?.nominalPower != null) return unit.levels['1'].nominalPower;
  return unit.nominalPower || 0;
}

export function unitStatsAtLevel(unit, level = 1) {
  if (!unit) return null;
  const lv = String(level || 1);
  return unit.levels?.[lv]?.stats || unit.levels?.['1']?.stats || unit.stats || null;
}

export function armyNominalPower(army, unitsById, unitLevels = {}) {
  let p = 0;
  for (const [uid, count] of Object.entries(army || {})) {
    const u = unitsById[uid];
    if (!u || !count) continue;
    const lvl = unitLevels[uid] || 1;
    p += count * unitNominalPower(u, lvl);
  }
  return p;
}

/** Weighted counter: attacker composition vs defender mix */
export function applyCounter(attackerArmy, defenderArmy, unitsById, counterMatrix, categoryAlias, unitLevels = {}) {
  const defCats = {};
  let defTotal = 0;
  for (const [uid, count] of Object.entries(defenderArmy || {})) {
    if (!count) continue;
    const cat = categoryAlias[uid] || unitsById[uid]?.category || 'infantry';
    defCats[cat] = (defCats[cat] || 0) + count;
    defTotal += count;
  }
  if (defTotal <= 0) return armyNominalPower(attackerArmy, unitsById, unitLevels);

  let weighted = 0;
  for (const [uid, count] of Object.entries(attackerArmy || {})) {
    if (!count) continue;
    const u = unitsById[uid];
    if (!u) continue;
    const atkCat = categoryAlias[uid] || u.category || 'infantry';
    const lvl = unitLevels[uid] || 1;
    const nom = unitNominalPower(u, lvl);
    let mult = 0;
    for (const [dCat, dCount] of Object.entries(defCats)) {
      const m = counterMatrix[atkCat]?.[dCat] ?? 1;
      mult += m * (dCount / defTotal);
    }
    weighted += count * nom * mult;
  }
  return weighted;
}

export function applyHeroContribution(armyPowerBeforeHero, heroRaw, buffs = {}) {
  const cap = 0.25;
  const raw = heroRaw * (1 + (buffs.heroRawMult || 0));
  const contribution = Math.min(raw, cap * armyPowerBeforeHero);
  return {
    armyPowerBeforeHero,
    heroRaw: raw,
    heroContribution: contribution,
    heroContributionRatio: armyPowerBeforeHero > 0 ? contribution / armyPowerBeforeHero : 0,
    finalPower: armyPowerBeforeHero + contribution,
  };
}

function lerp(range, t) {
  const [a, b] = range;
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

function applyCasualties(army, killFrac, woundFrac) {
  const before = { ...army };
  const after = {};
  const killed = {};
  const wounded = {};
  for (const [uid, count] of Object.entries(army || {})) {
    const k = Math.floor(count * killFrac);
    const w = Math.floor(count * woundFrac);
    const remain = Math.max(0, count - k - w);
    after[uid] = remain;
    killed[uid] = k;
    wounded[uid] = w;
  }
  return { before, after, killed, wounded };
}

/**
 * Resolve march combat.
 * @returns report object
 */
export function resolveCombat({
  attackerArmy,
  defenderArmy,
  unitsById,
  combatConstants,
  attackerHero = null,
  attackerBuffs = {},
  attackerUnitLevels = {},
  defenderUnitLevels = {},
  wallLevel = 0,
  lootTable = null,
  monsterFailWoundMult = 1,
}) {
  const { counterMatrix, categoryAlias, resolution } = combatConstants;

  let atkBase = applyCounter(
    attackerArmy, defenderArmy, unitsById, counterMatrix, categoryAlias, attackerUnitLevels,
  );
  if (attackerBuffs.infantryAttack) {
    let infPower = 0;
    for (const [uid, count] of Object.entries(attackerArmy || {})) {
      const cat = categoryAlias[uid] || unitsById[uid]?.category;
      if (cat === 'infantry' && count) {
        infPower += count * unitNominalPower(unitsById[uid], attackerUnitLevels[uid] || 1);
      }
    }
    atkBase += infPower * attackerBuffs.infantryAttack;
  }

  let defBase = applyCounter(
    defenderArmy, attackerArmy, unitsById, counterMatrix, categoryAlias, defenderUnitLevels,
  );
  const wallFactor = 1 + Math.min(resolution.wallFactorCap, (resolution.wallFactorPerLevel || 0.02) * wallLevel);
  defBase *= wallFactor;
  if (attackerBuffs.defenderAllDefense) {
    defBase *= 1 + attackerBuffs.defenderAllDefense;
  }

  const heroLevel = attackerHero?.level || 1;
  const heroRaw = attackerHero
    ? heroRawPower(heroLevel, attackerHero.heroRawPowerAtLevel1 || 120, attackerHero.heroRawPowerAtLevel20Approx || 900)
      + (attackerHero.equipBonus || 0)
    : 0;

  const heroPart = applyHeroContribution(atkBase, heroRaw);
  const attPower = heroPart.finalPower;
  const defPower = defBase;

  const R = attPower / (attPower + defPower || 1);
  let outcome;
  if (R >= resolution.winThreshold) outcome = 'win';
  else if (R >= resolution.drawLow) outcome = 'draw';
  else outcome = 'loss';

  const gap = outcome === 'win'
    ? Math.min(1, (R - 0.55) / 0.45)
    : outcome === 'loss'
      ? Math.min(1, (0.45 - R) / 0.45)
      : 0.5;

  let atkKill, atkWound, defKill, defWound;
  if (outcome === 'win') {
    atkKill = lerp(resolution.winnerKillRange, 1 - gap);
    atkWound = lerp(resolution.winnerWoundRange, 1 - gap);
    defKill = lerp(resolution.loserKillRange, gap);
    defWound = lerp(resolution.loserWoundRange, gap);
  } else if (outcome === 'loss') {
    atkKill = lerp(resolution.loserKillRange, gap);
    atkWound = lerp(resolution.loserWoundRange, gap) * (monsterFailWoundMult || 1);
    defKill = lerp(resolution.winnerKillRange, 1 - gap);
    defWound = lerp(resolution.winnerWoundRange, 1 - gap);
  } else {
    atkKill = lerp(resolution.drawKillRange, 0.5);
    atkWound = 0.2;
    defKill = lerp(resolution.drawKillRange, 0.5);
    defWound = 0.2;
  }

  const atkCas = applyCasualties(attackerArmy, atkKill, atkWound);
  const defCas = applyCasualties(defenderArmy, defKill, defWound);

  let loot = { food: 0, wood: 0, stone: 0, gold: 0 };
  if (outcome === 'win' && lootTable) {
    const frac = 0.6 + 0.4 * gap;
    for (const k of Object.keys(loot)) {
      loot[k] = Math.floor((lootTable[k] || 0) * frac);
    }
  }

  const levelNote = Object.entries(attackerUnitLevels || {})
    .filter(([uid]) => (attackerArmy || {})[uid])
    .map(([uid, lv]) => `${uid}@L${lv}`)
    .join(', ');

  return {
    outcome,
    R: Math.round(R * 1000) / 1000,
    attPower: Math.round(attPower),
    defPower: Math.round(defPower),
    hero: {
      contribution: Math.round(heroPart.heroContribution),
      contributionRatio: Math.round(heroPart.heroContributionRatio * 1000) / 1000,
      capped: heroPart.heroContribution < heroPart.heroRaw - 0.01,
      raw: Math.round(heroPart.heroRaw),
    },
    attacker: atkCas,
    defender: defCas,
    loot,
    wallFactor,
    unitLevelsUsed: attackerUnitLevels,
    levelNote,
  };
}
