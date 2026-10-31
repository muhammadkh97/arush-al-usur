import * as G from './game.js';
import * as Maps from './maps.js';
import * as Castle3D from './castle3d.js';
import * as World3D from './world3d.js';
import * as Preview3D from './preview3d.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

let tables = null;
let state = null;
let view = 'city';
let selectedNodeId = null;
let selectedBuildingId = null;
let castle3dApi = null;
let castle3dBuildSig = '';
let world3dApi = null;
let world3dSig = '';
let previewIds = [];

const ONBOARD = [
  'مرحباً بك في عروش العصور. اضغط مبنىً على خريطة القلعة الداخلية ورقِّه.',
  'من الثكنات أو ميدان الرماة درِّب وحدات عبر لوحة المبنى.',
  'افتح خريطة العالم، اختر معسكراً أو وحشاً ضعيفاً، وأرسل غارة.',
  'ابنِ السفارة من داخل القلعة، أنشئ تحالفاً، واطلب مساعدة بناء.',
  'افتح شاشة البطل وارفع مستواه أو مهارته مرة.',
  'أحسنت — تنقّل بين القلعة والعالم بحرّية.',
];

function toast(msg) {
  const host = $('#toast-host');
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  host.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

function showScreen(id) {
  $$('.screen').forEach((s) => s.classList.remove('active'));
  $(`#${id}`)?.classList.add('active');
}

function factionName(id) {
  return tables.factions.factions.find((f) => f.id === id)?.nameAr || id;
}

function buildingName(id) {
  return tables.buildings.buildings[id]?.nameAr || id;
}

function unitName(id) {
  return tables.units.units.find((u) => u.id === id)?.nameAr || id;
}

function persist() {
  G.saveState(state);
}

function bootCreate() {
  showScreen('screen-create');
  const rail = $('#faction-rail');
  rail.innerHTML = '';
  for (const f of tables.factions.factions) {
    const hero = tables.heroes.heroes.find((h) => h.id === f.starterHeroId);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'faction-option';
    btn.dataset.faction = f.id;
    btn.innerHTML = `
      <div class="faction-glyph">${f.id === 'jazira' ? 'ج' : f.id === 'rome' ? 'ر' : 'ف'}</div>
      <div>
        <h3>${f.nameAr}</h3>
        <p>البطل: ${hero?.nameAr || '—'} · الوحدة الخاصة تُفتح داخل القلعة</p>
      </div>`;
    btn.addEventListener('click', () => {
      $$('.faction-option').forEach((b) => b.classList.remove('selected'));
      btn.classList.add('selected');
    });
    rail.appendChild(btn);
  }
  rail.firstChild?.classList.add('selected');

  $('#btn-create').onclick = () => {
    const name = ($('#player-name').value || '').trim() || 'قائد';
    const selected = $('.faction-option.selected')?.dataset.faction;
    if (!selected) return toast('اختر فصيلاً');
    state = G.createNewState(name, selected, tables);
    G.track(state, 'register', { name });
    G.track(state, 'faction_select', { factionId: selected });
    persist();
    toast(`مرحباً ${name} — الفصيل مُقفل: ${factionName(selected)}`);
    enterGame();
  };
}

function enterGame() {
  showScreen('screen-game');
  const hash = (location.hash || '').replace('#', '');
  const qView = new URLSearchParams(location.search).get('view');
  view = qView || hash || 'city';
  if (!['city', 'map', 'hero', 'alliance', 'reports', 'quests'].includes(view)) view = 'city';
  selectedBuildingId = state.selectedBuildingId || 'palace';
  selectedNodeId = state.selectedWorldNodeId || 'castle_player';
  renderAll();
  advanceOnboarding();
}

function advanceOnboarding() {
  const box = $('#onboarding');
  if (!state || state.onboardingStep >= ONBOARD.length) {
    box.classList.remove('visible');
    return;
  }
  box.classList.add('visible');
  $('#onboarding-text').textContent = ONBOARD[state.onboardingStep];
}

$('#btn-onboard-next')?.addEventListener('click', () => {
  if (!state) return;
  state.onboardingStep += 1;
  persist();
  advanceOnboarding();
});

function setNav(active) {
  $$('.hud-nav button').forEach((b) => b.classList.toggle('active', b.dataset.view === active));
  $('#main-stage')?.classList.toggle('stage-wide', active === 'city' || active === 'map');
}

function renderTop() {
  $('#brand-mini').textContent = 'عروش العصور';
  const r = state.resources;
  $('#res-bar').innerHTML = `
    <span class="res-chip" title="طعام"><i class="res-ico food"></i>طعام <strong>${Math.floor(r.food)}</strong></span>
    <span class="res-chip" title="خشب"><i class="res-ico wood"></i>خشب <strong>${Math.floor(r.wood)}</strong></span>
    <span class="res-chip" title="حجر"><i class="res-ico stone"></i>حجر <strong>${Math.floor(r.stone)}</strong></span>
    <span class="res-chip" title="ذهب"><i class="res-ico gold"></i>ذهب <strong>${Math.floor(r.gold)}</strong></span>
    <span class="res-chip" title="طاقة"><i class="res-ico stam"></i>طاقة <strong>${state.stamina}</strong></span>
    <span class="res-chip" title="تسريع"><i class="res-ico spd"></i><strong>${state.speedMinutes}د</strong></span>`;
  $('#timescale').textContent = `تسريع ×${state.timeScale} · درع مبتدئين حتى ${new Date(state.beginnerShieldUntil).toLocaleString('ar')}`;
  document.body.classList.toggle('game-live', !!state && $('#screen-game')?.classList.contains('active'));
}

function summarizeArmy(army) {
  return Object.entries(army || {})
    .filter(([, c]) => c > 0)
    .map(([id, c]) => `${unitName(id)} ${c}`)
    .join(' · ') || 'لا وحدات';
}

function allianceHelpStripHtml() {
  const hasBuild = !!state.buildQueue;
  const hasHeal = !!state.healQueue;
  if (!hasBuild && !hasHeal) return '';
  let html = `<div class="help-strip">
    <strong>مساعدة التحالف</strong>
    ${!state.allianceId ? '<span class="muted"> — انضم لتحالف لتفعيل المساعدة</span>' : ''}`;
  if (hasBuild) {
    html += `<button class="btn btn-ghost btn-small" id="btn-help-build" ${state.allianceId ? '' : 'disabled'}>مساعدة بناء (${state.buildQueue.helps || 0}/5)</button>`;
  }
  if (hasHeal) {
    html += `<button class="btn btn-ghost btn-small" id="btn-help-heal" ${state.allianceId ? '' : 'disabled'}>مساعدة شفاء (${state.healQueue.helps || 0}/5)</button>`;
  }
  html += `</div>`;
  return html;
}

function queueBannerHtml() {
  let html = '';
  if (state.buildQueue) {
    const left = Math.max(0, state.buildQueue.completesAt - Date.now());
    html += `<div class="queue-banner">بناء: ${buildingName(state.buildQueue.buildingId)} → ${state.buildQueue.targetLevel}
      · ETA ${G.formatEta(left)} · مساعدات ${state.buildQueue.helps || 0}
      <div class="inline-actions">
        <button class="btn btn-ghost btn-small" id="btn-help-build">مساعدة تحالف</button>
        <button class="btn btn-ghost btn-small" id="btn-speed-build">تسريع دقيقة</button>
      </div></div>`;
  }
  if (state.trainQueue) {
    const left = Math.max(0, state.trainQueue.completesAt - Date.now());
    html += `<div class="queue-banner">تدريب ${unitName(state.trainQueue.unitId)} ×${state.trainQueue.count} · ETA ${G.formatEta(left)}</div>`;
  }
  if (state.healQueue) {
    const left = Math.max(0, state.healQueue.completesAt - Date.now());
    html += `<div class="queue-banner heal-banner">شفاء ${state.healQueue.total} جريح · ETA ${G.formatEta(left)} · مساعدات ${state.healQueue.helps || 0}
      <div class="inline-actions">
        <button class="btn btn-ghost btn-small" id="btn-help-heal">مساعدة شفاء</button>
      </div></div>`;
  }
  html += allianceHelpStripHtml();
  return html;
}

function currentStoryChapter() {
  const chapters = tables.story?.chapters || [];
  if (!chapters.length) return null;
  const hasArmy = Object.values(state.army || {}).some((count) => count > 0)
    || (state.reports || []).some((report) => ['combat', 'scout'].includes(report.kind));
  const hasAlliance = !!state.allianceId;
  const hasLegacy = (state.buildings?.palace || 0) >= 3
    || (state.reports || []).some((report) => report.kind === 'combat' && report.outcome === 'win');
  if (hasLegacy) return chapters.find((chapter) => chapter.id === 'horizon') || chapters.at(-1);
  if (hasAlliance) return chapters.find((chapter) => chapter.id === 'oath') || chapters[2] || chapters.at(-1);
  if (hasArmy) return chapters.find((chapter) => chapter.id === 'first-blood') || chapters[1] || chapters.at(-1);
  return chapters.find((chapter) => chapter.id === 'awakening') || chapters[0];
}

function storyLedgerHtml() {
  const chapter = currentStoryChapter();
  if (!chapter) return '';
  const chapters = tables.story?.chapters || [];
  const index = Math.max(0, chapters.findIndex((item) => item.id === chapter.id));
  const progress = Math.round(((index + 1) / chapters.length) * 100);
  return `<section class="story-ledger" style="--story-accent:${chapter.accent || '#d7a95f'}">
    <div class="story-ledger-mark" aria-hidden="true"><span>✦</span></div>
    <div class="story-ledger-copy">
      <div class="story-kicker"><span>${tables.story?.season || 'سجل العرش'}</span><b>${chapter.eyebrowAr || ''}</b></div>
      <h2>${chapter.titleAr}</h2>
      <p>${chapter.textAr}</p>
      <div class="story-objective"><i></i><span>${chapter.objectiveAr}</span></div>
      <div class="story-progress"><span>مسار الموسم</span><b>${index + 1}/${chapters.length}</b><em><i style="width:${progress}%"></i></em></div>
    </div>
  </section>`;
}

function castleResourceLedgerHtml() {
  const resourceMeta = [
    ['food', 'القمح', 'food', '🌾'],
    ['wood', 'الأخشاب', 'wood', '▥'],
    ['stone', 'الحجر', 'stone', '◈'],
    ['gold', 'الذهب', 'gold', '✦'],
  ];
  const production = { food: 0, wood: 0, stone: 0, gold: 0 };
  for (const [id, level] of Object.entries(state.buildings || {})) {
    const row = tables.buildings.buildings[id]?.levels?.[String(level)]?.productionPerHour;
    if (!row) continue;
    for (const key of Object.keys(production)) production[key] += row[key] || 0;
  }
  return `<section class="castle-resource-ledger">
    <div class="ledger-heading"><span class="ledger-kicker">خزائن القلعة · تدفق حي</span><strong>مخزون المملكة</strong><span class="ledger-capacity">قصر ${state.buildings?.palace || 0} · ${Object.keys(state.buildings || {}).filter((id) => state.buildings[id] > 0).length} منشآت عاملة</span></div>
    <div class="resource-ledger-grid">
      ${resourceMeta.map(([id, label, cls, icon]) => `<div class="resource-ledger-card resource-${cls}">
        <div class="resource-ledger-icon">${icon}</div>
        <div><span>${label}</span><strong>${Math.floor(state.resources?.[id] || 0).toLocaleString('ar')}</strong><em>+${production[id] || 0}/س</em></div>
      </div>`).join('')}
    </div>
  </section>`;
}

function bindQueueButtons() {
  $('#btn-help-build')?.addEventListener('click', () => {
    const r = G.requestBuildHelp(state, tables);
    toast(r.ok ? 'خُفض زمن البناء بمساعدة التحالف' : r.reason);
    if (r.ok && state.onboardingStep === 3) state.onboardingStep = 4;
    persist();
    renderAll();
  });
  $('#btn-help-heal')?.addEventListener('click', () => {
    const r = G.requestHealHelp(state, tables);
    toast(r.ok ? 'خُفض زمن الشفاء بمساعدة التحالف' : r.reason);
    if (r.ok && state.onboardingStep === 3) state.onboardingStep = 4;
    persist();
    renderAll();
  });
  $('#btn-speed-build')?.addEventListener('click', () => {
    const r = G.applySpeedToBuild(state, 1);
    toast(r.ok ? 'تم التسريع' : (r.reason || 'تعذّر'));
    persist();
    renderAll();
  });
}

/* ——— Castle interior map (Three.js / WebGL) ——— */
function buildingTaskPanel(def, lvl) {
  const role = def.roleAr ? `<p class="bldg-role"><strong>الدور:</strong> ${def.roleAr}</p>` : '';
  const fn = def.functionAr ? `<p class="bldg-fn">${def.functionAr}</p>` : '';
  const unlock = def.unlocksAtPalace
    ? `<p class="muted">يفتح عند قصر ${def.unlocksAtPalace}</p>` : '';
  let tasks = '';
  if (def.tasks) {
    const t = def.tasks;
    const useHint = lvl <= 0 ? t.build : (lvl < (def.maxLevelSlice || 1) ? t.upgrade : t.use);
    tasks = `<div class="bldg-tasks">
      <h3>المهام</h3>
      <ul>
        <li><span class="task-tag">شيّد</span> ${t.build || '—'}</li>
        <li><span class="task-tag">رقِّ</span> ${t.upgrade || '—'}</li>
        <li><span class="task-tag">استخدم</span> ${t.use || '—'}</li>
      </ul>
      <p class="ok task-now">الآن: ${useHint || '—'}</p>
    </div>`;
  }
  return `${role}${fn}${unlock}${tasks}`;
}

function buildingsSig() {
  return JSON.stringify(state.buildings || {});
}

function buildingDockHtml(bid) {
  const def = tables.buildings.buildings[bid];
  if (!def) return `<div class="map-dock"><p class="muted">مبنى غير معروف</p></div>`;
  const lvl = state.buildings[bid] || 0;
  const check = G.canUpgrade(state, tables, bid);
  const prod = def.levels?.[String(lvl)]?.productionPerHour;
  const prot = def.levels?.[String(lvl)]?.protectionPerResource;

  let dock = `<div class="map-dock building-dock">
    <div class="dock-head">
      <h2>${def.nameAr}</h2>
      <button type="button" class="btn btn-ghost btn-small" id="btn-goto-world">خريطة العالم ←</button>
    </div>
    ${buildingTaskPanel(def, lvl)}
    <p class="muted">${lvl === 0 ? 'غير مبني' : `مستوى ${lvl}/${def.maxLevelSlice}`}${prod ? ` · إنتاج ${Object.entries(prod).map(([, v]) => `${v}/س`).join(' ')}` : ''}${prot ? ` · حماية ${prot}` : ''}</p>
    ${!check.ok ? `<p class="muted">${check.reason || ''}</p>` : ''}
    <div class="inline-actions">
      <button class="btn btn-primary btn-small" id="btn-upgrade-sel" ${check.ok ? '' : 'disabled'}>${lvl === 0 ? 'بناء' : 'ترقية'}</button>
    </div>`;

  const trainUnits = tables.units.units.filter((u) => {
    if (u.factionId && u.factionId !== state.factionId) return false;
    return u.trainBuilding === bid;
  });
  if (trainUnits.length) {
    dock += `<h3>تدريب · معاينة 3D</h3><div class="unit-train-grid">`;
    for (const u of trainUnits) {
      const maxLv = G.maxUnlockableUnitLevel(state, tables, u.id);
      const curLv = Math.max(1, Math.min(maxLv || 1, state.unitLevels?.[u.id] || 1));
      const lvDef = G.unitLevelDef(u, curLv || 1);
      const locked = maxLv < 1;
      const reqPalace = G.unitLevelDef(u, 1)?.requiresPalace || 1;
      const reqB = G.unitLevelDef(u, 1)?.requiresBuildingLevel || 1;
      let levelOpts = '';
      for (let lv = 1; lv <= (u.maxLevelSlice || 1); lv++) {
        const d = G.unitLevelDef(u, lv);
        const open = (state.buildings.palace || 0) >= (d?.requiresPalace || 1)
          && (state.buildings[u.trainBuilding] || 0) >= (d?.requiresBuildingLevel || 1);
        levelOpts += `<option value="${lv}" ${lv === curLv ? 'selected' : ''} ${open ? '' : 'disabled'}>م${lv} · قوة ${d?.nominalPower ?? '—'}${open ? '' : ' (مقفل)'}</option>`;
      }
      dock += `<div class="unit-card" data-unit-card="${u.id}">
        <div class="unit-preview" id="unit-preview-${u.id}" aria-label="معاينة ${u.nameAr}"></div>
        <div class="unit-card-body">
          <strong>${u.nameAr}</strong>
          <p class="muted">${u.descriptionAr || u.category}${u.softLaunch ? ' · Soft' : ''}</p>
          <p class="unit-stats">هجوم ${lvDef?.stats?.attack ?? '—'} · دفاع ${lvDef?.stats?.defense ?? '—'} · صحة ${lvDef?.stats?.hp ?? '—'} · حمولة ${lvDef?.stats?.load ?? '—'}</p>
          <p class="muted">فتح: قصر ${reqPalace}+ · ${buildingName(u.trainBuilding)} ${reqB}+${locked ? ' — غير مفتوح' : ` · متاح حتى م${maxLv}`}</p>
          <label>المستوى</label>
          <select data-train-level="${u.id}">${levelOpts}</select>
          <div class="inline-actions" style="margin-top:0.35rem">
            <input type="number" min="1" value="10" data-train-count="${u.id}" />
            <button class="btn btn-primary btn-small" data-train="${u.id}" ${locked ? 'disabled' : ''}>درّب</button>
          </div>
        </div>
      </div>`;
    }
    dock += `</div>`;
  }
  if (bid === 'farm' && lvl > 0) {
    dock += `<button class="btn btn-ghost btn-small" id="btn-farm-task">تأكيد مهمة الإنتاج</button>`;
  }
  if (bid === 'hospital') {
    dock += `<h3>المستشفى</h3>`;
    if (state.healQueue) {
      const left = Math.max(0, state.healQueue.completesAt - Date.now());
      dock += `<p class="ok">طابور شفاء نشط: ${state.healQueue.total} · ETA ${G.formatEta(left)}</p>
        <button class="btn btn-ghost btn-small" id="btn-help-heal" ${state.allianceId ? '' : 'disabled'}>مساعدة تحالف على الشفاء</button>`;
    } else if (Object.keys(state.wounded || {}).length) {
      dock += `<p class="danger">جرحى بانتظار العلاج: ${summarizeArmy(state.wounded)}</p>
        <p class="muted">التكلفة: طعام ×2 لكل جريح · زمن حسب العدد ومستوى المستشفى</p>
        <button class="btn btn-primary btn-small" id="btn-heal">بدء طابور الشفاء</button>`;
    } else {
      dock += `<p class="muted">لا جرحى حالياً. الجرحى يصلون من تقارير القتال.</p>`;
    }
  }
  if (bid === 'embassy') {
    dock += `<p class="muted">إدارة التحالف من تبويب التحالف.</p>
      <button class="btn btn-ghost btn-small" id="btn-goto-alliance">افتح التحالف</button>`;
    dock += allianceHelpStripHtml();
  }
  if (bid === 'shrine') {
    dock += `<p class="muted">قاعة البطل — افتح تبويب البطل للترقية.</p>
      <button class="btn btn-ghost btn-small" id="btn-goto-hero">شاشة البطل</button>`;
  }
  if (bid === 'warehouse' && lvl > 0) {
    dock += `<p class="ok">حماية المستودع الحالية: ${prot || 0} لكل مورد</p>`;
  }
  if (bid === 'academy' && lvl > 0) {
    dock += `<p class="muted">البحث العسكري — معاينة الشريحة: ترقية الأكاديمية تفتح مسارات لاحقة.</p>`;
  }
  dock += `<p class="unit-line muted">الجيش: ${summarizeArmy(state.army)}</p></div>`;
  return dock;
}

function bindCityDock(bid) {
  $('#btn-goto-world')?.addEventListener('click', () => {
    view = 'map';
    renderAll();
  });
  $('#btn-goto-hero')?.addEventListener('click', () => {
    view = 'hero';
    renderAll();
  });
  $('#btn-goto-alliance')?.addEventListener('click', () => {
    view = 'alliance';
    renderAll();
  });
  $('#btn-farm-task')?.addEventListener('click', () => {
    toast('مهمة الإنتاج: المزرعة تنتج طعاماً كل دقيقة (× التسريع)');
  });
  $('#btn-upgrade-sel')?.addEventListener('click', () => {
    const r = G.startUpgrade(state, tables, bid);
    if (!r.ok) return toast(r.reason);
    toast(`بدأ البناء: ${buildingName(bid)}`);
    if (state.onboardingStep === 0) state.onboardingStep = 1;
    persist();
    renderAll();
  });
  $$('[data-train]').forEach((btn) => {
    btn.onclick = () => {
      const uid = btn.dataset.train;
      const count = parseInt($(`.unit-train-grid [data-train-count="${uid}"]`)?.value
        || $(`[data-train-count="${uid}"]`)?.value, 10) || 1;
      const level = parseInt($(`.unit-train-grid [data-train-level="${uid}"]`)?.value
        || $(`[data-train-level="${uid}"]`)?.value, 10) || 1;
      const r = G.startTrain(state, tables, uid, count, level);
      if (!r.ok) return toast(r.reason);
      toast(`تدريب ${count} ${unitName(uid)} م${level}`);
      if (state.onboardingStep === 1) state.onboardingStep = 2;
      persist();
      renderAll();
    };
  });
  $$('[data-train-level]').forEach((sel) => {
    sel.onchange = () => {
      const uid = sel.dataset.trainLevel;
      const u = tables.units.units.find((x) => x.id === uid);
      const lv = parseInt(sel.value, 10) || 1;
      const lvDef = G.unitLevelDef(u, lv);
      const card = $(`[data-unit-card="${uid}"]`);
      const stats = card?.querySelector('.unit-stats');
      if (stats && lvDef?.stats) {
        stats.textContent = `هجوم ${lvDef.stats.attack} · دفاع ${lvDef.stats.defense} · صحة ${lvDef.stats.hp} · حمولة ${lvDef.stats.load} · قوة ${lvDef.nominalPower}`;
      }
    };
  });
  // Mount unit 3D previews
  for (const u of tables.units.units) {
    const host = $(`#unit-preview-${u.id}`);
    if (!host) continue;
    if (u.factionId && u.factionId !== state.factionId) continue;
    if (u.trainBuilding !== bid) continue;
    const pv = Preview3D.mountPreview3D(host, {
      kind: 'unit',
      meshKey: u.meshKey || 'infantry',
      factionId: state.factionId,
      id: `unit_${u.id}`,
    });
    if (pv?.id) previewIds.push(pv.id);
  }
  $('#btn-heal')?.addEventListener('click', () => {
    const r = G.startHeal(state, tables);
    toast(r.ok ? `بدأ شفاء ${r.total} جريح` : r.reason);
    persist();
    renderAll();
  });
  bindQueueButtons();
}

function ensureCastle3D() {
  const host = $('#castle-webgl-host');
  if (!host) return;
  const sig = buildingsSig();
  const needsRemount = !castle3dApi?.ok || castle3dBuildSig !== sig || !host.querySelector('canvas, .webgl-fallback');
  if (needsRemount) {
    castle3dApi = Castle3D.mountCastle3D(host, {
      tables,
      state,
      selectedId: selectedBuildingId,
      factionLabel: factionName(state.factionId),
      onSelect: (id) => {
        if (!id || id === selectedBuildingId) return;
        selectedBuildingId = id;
        state.selectedBuildingId = id;
        persist();
        const dockHost = $('#city-dock-host');
        if (dockHost) {
          dockHost.innerHTML = buildingDockHtml(id);
          bindCityDock(id);
        }
        castle3dApi?.setSelected?.(id);
      },
    });
    castle3dBuildSig = sig;
    if (!castle3dApi?.ok) toast('تعذّر تشغيل WebGL — مشهد القلعة ثلاثي الأبعاد غير متاح');
  } else {
    castle3dApi?.setSelected?.(selectedBuildingId);
  }
}

function renderCity() {
  const stage = $('#main-stage');
  if (!selectedBuildingId) selectedBuildingId = 'palace';
  state.selectedBuildingId = selectedBuildingId;
  const bid = selectedBuildingId;

  const keepHost = stage.querySelector('#castle-webgl-host');
  if (!keepHost) {
    Castle3D.disposeCastle3D();
    castle3dApi = null;
    castle3dBuildSig = '';
    stage.innerHTML = `
      <div class="map-compose castle-compose">
        <div class="map-main-col">
          <div class="castle-stage castle-3d-mode theme-${state.factionId}">
            <div class="castle-command-hud">
              <div class="castle-seal">✦</div>
              <div class="castle-command-copy"><span>مقر السيادة · ${factionName(state.factionId)}</span><strong>قلعة ${state.playerName}</strong><em>القصر مستوى ${state.buildings?.palace || 0} · الدرع الملكي فعّال</em></div>
              <div class="castle-command-rank"><b>${Object.values(state.buildings || {}).reduce((sum, level) => sum + (level || 0), 0)}</b><span>رتبة البناء</span></div>
            </div>
            <div id="castle-webgl-host" class="castle-webgl-host castle-3d-host" role="img" aria-label="مشهد القلعة ثلاثي الأبعاد"></div>
          </div>
          <div id="castle-resource-ledger-host">${castleResourceLedgerHtml()}</div>
          <div id="story-ledger-host">${storyLedgerHtml()}</div>
          <div id="city-queue-host">${queueBannerHtml()}</div>
        </div>
        <div id="city-dock-host">${buildingDockHtml(bid)}</div>
      </div>`;
  } else {
    const q = $('#city-queue-host');
    if (q) q.innerHTML = queueBannerHtml();
    const resourceLedgerHost = $('#castle-resource-ledger-host');
    if (resourceLedgerHost) resourceLedgerHost.innerHTML = castleResourceLedgerHtml();
    const storyHost = $('#story-ledger-host');
    if (storyHost) storyHost.innerHTML = storyLedgerHtml();
    const dockHost = $('#city-dock-host');
    if (dockHost) dockHost.innerHTML = buildingDockHtml(bid);
  }

  ensureCastle3D();
  bindCityDock(bid);
}

/* ——— External world map ——— */
function marchFormHtml() {
  const power = G.playerArmyPower(state, tables);
  let html = `<p class="ok">قوة جيشك الحالية ≈ <strong>${power}</strong></p>
    <div class="army-controls" id="march-form">
    <div class="march-preview-row"><div class="unit-preview compact" id="march-unit-preview" aria-label="معاينة مسير"></div></div>`;
  for (const u of tables.units.units) {
    if (u.factionId && u.factionId !== state.factionId) continue;
    const have = state.army[u.id] || 0;
    const lv = state.unitLevels?.[u.id] || 1;
    html += `<div><label>${u.nameAr} م${lv} (${have})</label>
      <input type="number" min="0" max="${have}" value="${Math.min(have, u.id === 'light_infantry' ? 100 : 40)}" data-march="${u.id}" /></div>`;
  }
  return `${html}</div>`;
}

function mountMarchPreview() {
  const host = $('#march-unit-preview');
  if (!host) return;
  const first = tables.units.units.find((u) => (!u.factionId || u.factionId === state.factionId) && (state.army[u.id] || 0) > 0)
    || tables.units.units.find((u) => !u.factionId || u.factionId === state.factionId);
  if (!first) return;
  const pv = Preview3D.mountPreview3D(host, {
    kind: 'unit',
    meshKey: first.meshKey || 'infantry',
    factionId: state.factionId,
    id: 'march_preview',
  });
  if (pv?.id) previewIds.push(pv.id);
}

function readArmy() {
  const army = {};
  $$('[data-march]').forEach((inp) => {
    const n = parseInt(inp.value, 10) || 0;
    if (n > 0) army[inp.dataset.march] = n;
  });
  return army;
}

function nodeDetailHtml(node) {
  if (!node) return '';
  const kindAr = tables.world.legend.find((l) => l.kind === node.kind)?.nameAr || node.kind;
  const power = G.playerArmyPower(state, tables);
  let extra = '';

  if (node.kind === 'castle') {
    const ownerAr = node.owner === 'player' ? 'قلعتك'
      : node.owner === 'alliance_placeholder' ? 'حليف (وهمي)'
        : 'قلعة NPC';
    extra = `<p class="ok">${ownerAr} · قصر/tier ${node.palaceLevel || node.tier || '—'} · قوة≈ ${node.approxPower || '—'}</p>
      <div class="node-preview" id="node-mesh-preview"></div>`;
  } else if (node.kind === 'monster') {
    const m = G.monsterById(tables, node.monsterId || node.id);
    const rec = m?.recommendedPower || 0;
    const ok = power >= rec;
    extra = `<div class="power-gate ${ok ? 'is-ok' : 'is-low'}">
        <strong>القوة الموصى بها للقتل: ≥ ${rec}</strong>
        <span>قوتك الآن ≈ ${power} — ${ok ? 'جاهز للهجوم' : 'أضعف من الموصى (مخاطرة)'}</span>
      </div>
      <p class="muted">${m?.loreAr || ''}</p>
      <p class="ok">مكافأة مميزة: ${m?.specialReward?.nameAr || '—'}</p>
      <div class="node-preview" id="node-mesh-preview"></div>`;
  } else if (node.kind === 'resource') {
    const rt = G.fieldRuntime(state, tables, node.fieldId || node.id);
    if (rt) {
      extra = `<p class="ok">مستوى الحقل ${rt.def.level} · متبقٍ <strong>${rt.remaining}</strong> / ${rt.stockMax}</p>
        <p>عائد متوقع ≈ ${rt.gatherPerHour}/س · طاقة المسير ${rt.stamina}
          ${rt.recommendedPower ? ` · قوة موصى Soft ≥${rt.recommendedPower}` : ''}</p>
        <p class="muted">زمن احتلال الشريحة ≈ ${rt.occupyMinutes} د (وقت لعب)</p>
        <div class="node-preview" id="node-mesh-preview"></div>`;
    }
  } else if (node.npcCampId) {
    const camp = tables.npc.camps.find((c) => c.id === node.npcCampId);
    if (camp) {
      const rec = camp.nominalPowerApprox;
      const ok = power >= rec * 0.9;
      extra = `<div class="power-gate ${ok ? 'is-ok' : 'is-low'}">
        <strong>قوة المعسكر ≈ ${rec}</strong>
        <span>قوتك ≈ ${power}</span>
      </div>`;
    }
  }

  return `<p class="muted">${kindAr}${node.tier ? ` · مستوى ${node.tier}` : ''}${node.resource ? ` · ${node.resource}` : ''}
    ${state.scoutedNodes?.[node.id] ? ' · مُستطلَع' : ''}</p>
    ${node.notes ? `<p class="muted">${node.notes}</p>` : ''}
    ${extra}
    <div class="inline-actions" id="node-actions"></div>`;
}

function mountNodePreview(node) {
  const host = $('#node-mesh-preview');
  if (!host || !node) return;
  let opts = null;
  if (node.kind === 'monster') {
    const m = G.monsterById(tables, node.monsterId || node.id);
    opts = { kind: 'monster', meshKey: node.meshKey || m?.meshKey || 'beast_caravan', id: 'node_pv' };
  } else if (node.kind === 'castle') {
    // reuse hero-size castle via unit preview path — mount small castle via Preview using monster path fallback
    opts = { kind: 'unit', meshKey: 'special_legion', factionId: state.factionId, id: 'node_pv' };
  } else if (node.kind === 'resource') {
    opts = { kind: 'unit', meshKey: 'infantry', factionId: state.factionId, id: 'node_pv' };
  }
  if (!opts) return;
  // Prefer dedicated mesh for monster; for castle/field show via world scene (preview is optional)
  if (node.kind === 'monster') {
    const pv = Preview3D.mountPreview3D(host, opts);
    if (pv?.id) previewIds.push(pv.id);
  } else {
    host.innerHTML = `<p class="muted">انظر النموذج ثلاثي الأبعاد على الخريطة</p>`;
  }
}

function mountSvgWorldFallback(host) {
  const svg = Maps.buildWorldSvg(tables, state, selectedNodeId);
  host.innerHTML = `<div class="world-title"><span class="brand-inline">عروش العصور</span> — وضع مبسّط (SVG)</div>
    <svg id="world-svg" class="world-svg" viewBox="${svg.viewBox}" role="img" aria-label="خريطة العالم">${svg.inner}</svg>`;
  const svgEl = $('#world-svg');
  Maps.attachWorldPan(svgEl, state, () => persist());
  svgEl.querySelectorAll('.world-node').forEach((g) => {
    g.addEventListener('click', (e) => {
      e.stopPropagation();
      selectedNodeId = g.getAttribute('data-node');
      persist();
      renderMap();
    });
  });
}

function ensureWorld3D() {
  const host = $('#world-webgl-host');
  if (!host) return;
  const needs = !world3dApi?.ok || !host.querySelector('canvas, .webgl-fallback, #world-svg');
  if (needs) {
    world3dApi = World3D.mountWorld3D(host, {
      tables,
      state,
      selectedId: selectedNodeId,
      onSelect: (id) => {
        if (!id || id === selectedNodeId) return;
        selectedNodeId = id;
        state.selectedWorldNodeId = id;
        persist();
        renderMap(true);
      },
    });
    if (!world3dApi?.ok) {
      toast('وضع مبسّط — SVG بدل عالم 3D');
      mountSvgWorldFallback(host);
    }
  } else if (world3dApi?.ok) {
    world3dApi.setSelected?.(selectedNodeId);
    world3dApi.redrawMarches?.();
  }
}

function renderMap(dockOnly = false) {
  const stage = $('#main-stage');
  if (!selectedNodeId) selectedNodeId = 'castle_player';
  state.selectedWorldNodeId = selectedNodeId;

  const node = G.worldNodeById(tables, selectedNodeId);
  const active = state.marches.filter((m) => m.status !== 'done');

  const worldNodes = tables.world.nodes || [];
  const discovered = worldNodes.filter((item) => state.scoutedNodes?.[item.id] || item.owner === 'player').length;
  let dock = `<div class="map-dock world-dock">
    <div class="dock-head">
      <div><span class="dock-eyebrow">أطلس العصور · ${discovered}/${worldNodes.length} مكتشف</span><h2>${node ? node.nameAr : 'اختر موقعاً'}</h2></div>
      <button type="button" class="btn btn-ghost btn-small" id="btn-goto-castle">→ داخل القلعة</button>
    </div>
    ${nodeDetailHtml(node)}`;

  const canAttack = (node?.actions || []).includes('attack');
  const canGather = (node?.actions || []).includes('gather');
  if (canAttack || canGather) {
    dock += `<h3>تشكيل المسيرة</h3>${marchFormHtml()}`;
  }

  if (active.length) {
    dock += `<h3 style="margin-top:0.7rem">مسيرات نشطة (${active.length})</h3><div class="march-list">`;
    for (const m of active) {
      const prog = G.marchProgress(m);
      const canRecall = m.status === 'traveling' || m.status === 'gathering';
      const occ = m.status === 'gathering' ? ' · احتلال حقل' : '';
      dock += `<div class="march-row" data-focus-march="${m.id}">
        <div>
          <strong>${G.marchLabelAr(m)}</strong>
          <div class="meta">${m.targetNameAr || m.targetId}${occ} · ETA ${G.formatEta(prog.etaMs)}</div>
          <div class="eta-bar"><i style="width:${Math.round(prog.t * 100)}%"></i></div>
        </div>
        ${canRecall ? `<button class="btn btn-ghost btn-small" data-recall="${m.id}">استدعاء</button>` : '<span class="muted">عائدة</span>'}
      </div>`;
    }
    dock += `</div>`;
  }

  if (node?.kind === 'resource' && state.fieldOccupancy?.[node.id]) {
    dock += `<p class="ok">هذا الحقل محتل حالياً بمسيرة جمع.</p>`;
  }

  dock += `<div class="world-legend">`;
  for (const L of tables.world.legend) {
    dock += `<span><i style="background:${L.color}"></i>${L.nameAr}</span>`;
  }
  dock += `</div>
    <p class="muted">عالم 3D · اسحب/قرص · شارات القوة فوق الوحوش · طاقة ${state.stamina}</p>
  </div>`;

  const keepWorld = stage.querySelector('#world-webgl-host');
  if (!keepWorld) {
    World3D.disposeWorld3D();
    world3dApi = null;
    stage.innerHTML = `
      <div class="map-compose world-compose">
        <div class="map-main-col">
          <div class="world-frame world-3d-frame">
            <div class="world-atlas-hud">
              <div class="atlas-crest">✦</div>
              <div><strong>أطلس العصور</strong><span>المجال المعروف · الموسم الأول</span></div>
              <div class="atlas-stat"><b>${worldNodes.length}</b><span>موقع</span></div>
              <div class="atlas-stat"><b>${active.length}</b><span>مسيرة</span></div>
            </div>
            <div class="world-compass" aria-hidden="true"><b>ش</b><i></i><span>أ</span></div>
            <div id="world-webgl-host" class="castle-webgl-host world-webgl-host" role="img" aria-label="خريطة العالم ثلاثية الأبعاد"></div>
          </div>
        </div>
        <div id="world-dock-host">${dock}</div>
      </div>`;
    ensureWorld3D();
  } else {
    const dockHost = $('#world-dock-host');
    if (dockHost) dockHost.innerHTML = dock;
    ensureWorld3D();
    world3dApi?.setSelected?.(selectedNodeId);
    world3dApi?.redrawMarches?.();
  }

  mountNodePreview(node);
  mountMarchPreview();

  $('#btn-goto-castle')?.addEventListener('click', () => {
    view = 'city';
    renderAll();
  });

  $$('[data-recall]').forEach((btn) => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const r = G.recallMarch(state, tables, btn.dataset.recall);
      toast(r.ok ? r.message : r.reason);
      persist();
      renderAll();
    };
  });

  const actions = $('#node-actions');
  if (actions && node) {
    const acts = node.actions || [];
    if (acts.includes('scout')) {
      const b = document.createElement('button');
      b.className = 'btn btn-ghost btn-small';
      b.textContent = 'استطلاع';
      b.onclick = () => {
        const r = G.scoutNode(state, tables, node.id);
        toast(r.ok ? `استطلاع: ${r.detail}` : r.reason);
        persist();
        renderAll();
      };
      actions.appendChild(b);
    }
    if (acts.includes('enter_interior')) {
      const b = document.createElement('button');
      b.className = 'btn btn-primary btn-small';
      b.textContent = 'دخول القلعة';
      b.onclick = () => { view = 'city'; renderAll(); };
      actions.appendChild(b);
    }
    if (acts.includes('gather')) {
      const b = document.createElement('button');
      b.className = 'btn btn-primary btn-small';
      b.textContent = 'جمع موارد';
      b.onclick = () => {
        const r = G.startMarch(state, tables, { type: 'gather', targetId: node.id, army: readArmy() });
        if (!r.ok) return toast(r.reason);
        toast('انطلقت قافلة الجمع');
        persist();
        renderAll();
      };
      actions.appendChild(b);
    }
    if (acts.includes('attack')) {
      const b = document.createElement('button');
      b.className = 'btn btn-primary btn-small';
      const m = node.kind === 'monster' ? G.monsterById(tables, node.monsterId || node.id) : null;
      b.textContent = node.kind === 'monster'
        ? `هجوم (موصى ≥${m?.recommendedPower || '?'})`
        : 'غارة / هجوم';
      b.onclick = () => {
        const r = G.startMarch(state, tables, { type: 'raid_npc', targetId: node.id, army: readArmy() });
        if (!r.ok) return toast(r.reason);
        toast('انطلقت المسيرة');
        if (state.onboardingStep === 2) state.onboardingStep = 3;
        persist();
        renderAll();
      };
      actions.appendChild(b);
    }
  }
}

function renderHero() {
  const stage = $('#main-stage');
  Preview3D.disposePreview();
  previewIds = [];
  const h = tables.heroes.heroes.find((x) => x.id === state.hero.id);
  const raw = G.heroRawPower(state.hero.level, h.heroRawPowerAtLevel1, h.heroRawPowerAtLevel20Approx);
  const equip = (state.hero.equip || []).reduce((s, e) => s + e.bonus, 0);
  const armyP = G.playerArmyPower(state, tables);
  const contrib = Math.min(raw + equip, 0.25 * Math.max(1, armyP));
  const skillVal = (h.active.valueAtLevel1 || 0)
    + ((state.hero.skillLevel || 1) - 1) * (h.active.valuePerSkillLevel || 0);
  let activeDesc = h.active.nameAr;
  if (h.active.choices) {
    activeDesc += ' — ' + h.active.choices.map((c) => c.nameAr).join(' / ');
  } else {
    activeDesc += ` (${Math.round(skillVal * 100)}٪ عند مهارة ${state.hero.skillLevel})`;
  }
  const traits = (h.traits || []).map((t) => `<li><strong>${t.nameAr}</strong> — ${t.descAr}</li>`).join('');
  const sp = h.statsPreview || {};

  stage.innerHTML = `<div class="panel hero-panel">
    <div class="hero-layout">
      <div class="hero-preview-wrap">
        <div class="unit-preview hero-preview" id="hero-preview-3d" aria-label="نموذج البطل"></div>
        <p class="muted center">دوران تلقائي · فن أصلي منخفض البولي</p>
      </div>
      <div class="hero-card-body">
        <h2>${h.nameAr}</h2>
        <p class="ok"><strong>الدور:</strong> ${h.roleAr || '—'} · <strong>أفضل استخدام:</strong> ${h.bestUseAr || '—'}</p>
        <p class="muted">${factionName(state.factionId)} · مستوى ${state.hero.level}/20 · مهارة ${state.hero.skillLevel}/5</p>
        <p>قوة خام≈ ${raw + equip} (تجهيز +${equip}) · مساهمة متوقعة ≈ ${Math.round(contrib)}
          (${Math.round((contrib / Math.max(1, armyP)) * 100)}٪ من جيش ${armyP}) — <strong>سقف 25٪</strong>.</p>
        <div class="hero-stat-row">
          <span>قيادة ${sp.leadership ?? '—'}</span>
          <span>بأس ${sp.might ?? '—'}</span>
          <span>حماية ${sp.ward ?? '—'}</span>
          <span>مسير ${sp.march ?? '—'}</span>
        </div>
        <h3>سمات</h3>
        <ul class="trait-list">${traits || '<li class="muted">—</li>'}</ul>
        <h3>مهارة نشطة</h3><p>${activeDesc}</p>
        <h3>سلبية</h3><p>${h.passive.nameAr} (${Math.round((h.passive.value || 0) * 100)}٪)</p>
        ${h.active.choices ? `
          <h3>اختيار اندفاع النوروز</h3>
          <div class="inline-actions">
            ${h.active.choices.map((c) => `
              <button class="btn btn-ghost btn-small ${state.hero.nowruzChoice === c.id ? 'btn-primary' : ''}" data-nowruz="${c.id}">${c.nameAr}</button>
            `).join('')}
          </div>` : ''}
        <div class="inline-actions">
          <button class="btn btn-primary" id="btn-hero-lvl">رفع المستوى</button>
          <button class="btn btn-ghost" id="btn-hero-skill">رفع المهارة</button>
          <button class="btn btn-ghost" id="btn-back-castle">داخل القلعة</button>
        </div>
      </div>
    </div>
  </div>`;

  const pv = Preview3D.mountPreview3D($('#hero-preview-3d'), {
    kind: 'hero',
    meshKey: h.meshKey || 'hero_sand',
    factionId: state.factionId,
    id: 'hero_main',
  });
  if (pv?.id) previewIds.push(pv.id);

  $$('[data-nowruz]').forEach((b) => {
    b.onclick = () => { state.hero.nowruzChoice = b.dataset.nowruz; persist(); renderHero(); };
  });
  $('#btn-hero-lvl').onclick = () => {
    const r = G.upgradeHero(state);
    toast(r.ok ? 'ارتفع مستوى البطل' : r.reason);
    if (r.ok && state.onboardingStep === 4) state.onboardingStep = 5;
    persist();
    renderAll();
  };
  $('#btn-hero-skill').onclick = () => {
    const r = G.upgradeHeroSkill(state);
    toast(r.ok ? 'ارتفعت المهارة' : r.reason);
    if (r.ok && state.onboardingStep === 4) state.onboardingStep = 5;
    persist();
    renderAll();
  };
  $('#btn-back-castle').onclick = () => { view = 'city'; renderAll(); };
}

function renderAlliance() {
  const stage = $('#main-stage');
  const a = G.getAlliance(state);
  let html = `<div class="panel"><h2>التحالف</h2>
    <p class="muted">أساسي فقط — بلا قلعة تحالف (Phase 2). ابنِ السفارة من خريطة القلعة.</p>`;

  if (!a) {
    html += `<div class="split-2">
      <div>
        <h3>إنشاء</h3>
        <input type="text" id="al-name" placeholder="سيوف العصر" class="field-input" />
        <input type="text" id="al-tag" maxlength="4" placeholder="عروش" class="field-input" />
        <button class="btn btn-primary" id="btn-al-create" style="margin-top:0.5rem;width:100%">إنشاء تحالف</button>
      </div>
      <div><h3>انضمام</h3><div id="al-list"></div></div>
    </div>`;
  } else {
    html += `<p><strong>[${a.tag}] ${a.name}</strong> — ${state.allianceRole === 'leader' ? 'زعيم' : 'عضو'}</p>
      <ul>${a.members.map((m) => `<li>${m.name} · ${m.role === 'leader' ? 'زعيم' : 'عضو'} · قوة≈${m.power}</li>`).join('')}</ul>
      <button class="btn btn-ghost" id="btn-al-leave">مغادرة</button>`;
  }
  html += `</div>`;
  stage.innerHTML = html;

  if (!a) {
    const list = $('#al-list');
    const db = G.loadAlliances();
    if (!db.list.length) list.innerHTML = '<p class="muted">لا تحالفات بعد.</p>';
    else {
      list.innerHTML = db.list.map((x) => `
        <div class="building-row">
          <div><strong>[${x.tag}] ${x.name}</strong><div class="meta">${x.members.length} أعضاء</div></div>
          <button class="btn btn-ghost btn-small" data-join="${x.id}">انضم</button>
        </div>`).join('');
      $$('[data-join]').forEach((b) => {
        b.onclick = () => {
          const r = G.joinAlliance(state, b.dataset.join);
          toast(r.ok ? 'انضممت للتحالف' : r.reason);
          if (r.ok && state.onboardingStep === 3) state.onboardingStep = 4;
          persist();
          renderAll();
        };
      });
    }
    $('#btn-al-create').onclick = () => {
      const r = G.createAlliance(state, $('#al-name').value || 'تحالف', $('#al-tag').value || 'عرش');
      toast(r.ok ? 'أُنشئ التحالف' : r.reason);
      if (r.ok && state.onboardingStep === 3) state.onboardingStep = 4;
      persist();
      renderAll();
    };
  } else {
    $('#btn-al-leave').onclick = () => { G.leaveAlliance(state); persist(); renderAll(); };
  }
}

function renderReports() {
  const stage = $('#main-stage');
  let html = `<div class="panel"><h2>التقارير</h2>`;
  if (!state.reports.length) html += `<p class="muted">لا تقارير بعد.</p>`;
  for (const r of state.reports) {
    const title = r.kind === 'combat' ? r.outcomeAr : r.kind === 'scout' ? 'استطلاع' : 'جمع';
    html += `<div class="building-row" style="cursor:pointer" data-report="${r.id}">
      <div><strong>${title}</strong>
        <div class="meta">${r.text || ''} · ${new Date(r.at).toLocaleTimeString('ar')}</div>
      </div>
      <span class="muted">عرض</span>
    </div>`;
  }
  html += `</div>`;
  stage.innerHTML = html;
  $$('[data-report]').forEach((el) => { el.onclick = () => openReport(el.dataset.report); });
}

function openReport(id) {
  const r = state.reports.find((x) => x.id === id);
  if (!r) return;
  const body = $('#modal-body');
  if (r.kind === 'gather') {
    body.innerHTML = `<h2>تقرير جمع</h2><p>${r.text}</p>
      <p>طعام ${r.loot.food} · خشب ${r.loot.wood} · حجر ${r.loot.stone} · ذهب ${r.loot.gold}</p>
      ${r.fieldLevel ? `<p class="muted">مستوى الحقل ${r.fieldLevel}</p>` : ''}`;
  } else if (r.kind === 'scout') {
    body.innerHTML = `<h2>تقرير استطلاع</h2><p>${r.text}</p>`;
  } else {
    const rows = Object.keys(r.attacker.before || {}).map((uid) => {
      const b = r.attacker.before[uid] || 0;
      const a = r.attacker.after[uid] || 0;
      const k = r.attacker.killed[uid] || 0;
      const w = r.attacker.wounded[uid] || 0;
      const lv = r.unitLevelsUsed?.[uid] || state.unitLevels?.[uid] || 1;
      return `<tr><td>${unitName(uid)} م${lv}</td><td>${b}</td><td>${a}</td><td>${k}</td><td>${w}</td></tr>`;
    }).join('');
    body.innerHTML = `<h2>تقرير قتال — ${r.targetName}</h2>
      <p class="${r.outcome === 'win' ? 'ok' : r.outcome === 'loss' ? 'danger' : ''}">النتيجة: <strong>${r.outcomeAr}</strong> (R=${r.R})
        · قوة ${r.attPower || '—'} ضد ${r.defPower || '—'}</p>
      ${r.recommendedPower ? `<p class="muted">القوة الموصى بها كانت ≥ ${r.recommendedPower}</p>` : ''}
      <p>مساهمة البطل: ${r.hero.contribution} / خام ${r.hero.raw}
        (${Math.round(r.hero.contributionRatio * 100)}٪${r.hero.capped ? ' — سقف 25٪' : ''})</p>
      ${r.specialReward ? `<p class="ok">مكافأة مميزة: ${r.specialReward.nameAr}</p>` : ''}
      <table class="report-table">
        <thead><tr><th>وحدة</th><th>قبل</th><th>بعد</th><th>قتلى</th><th>جرحى</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <p>نهب: طعام ${r.loot.food} · خشب ${r.loot.wood} · حجر ${r.loot.stone} · ذهب ${r.loot.gold}</p>`;
  }
  $('#modal').classList.add('open');
}

function rewardText(rw) {
  if (!rw) return '';
  const bits = [];
  for (const r of ['food', 'wood', 'stone', 'gold']) if (rw[r]) bits.push(`${r === 'food' ? 'طعام' : r === 'wood' ? 'خشب' : r === 'stone' ? 'حجر' : 'ذهب'} ${rw[r]}`);
  if (rw.speedMinutes) bits.push(`تسريع ${rw.speedMinutes}د`);
  if (rw.stamina) bits.push(`طاقة ${rw.stamina}`);
  return bits.join(' · ');
}

function renderQuests() {
  const stage = $('#main-stage');
  let doneCount = 0;
  let claimedCount = 0;
  for (const q of tables.quests.daily) {
    const st = state.quests[q.id] || {};
    if (st.done) doneCount += 1;
    if (st.claimed) claimedCount += 1;
  }
  let html = `<div class="panel quests-panel">
    <h2>مهام يومية</h2>
    <p class="muted">من جدول الشريحة · مكتمل ${doneCount}/${tables.quests.daily.length} · مُحصَّل ${claimedCount}</p>`;
  for (const q of tables.quests.daily) {
    const st = state.quests[q.id] || { progress: 0, done: false, claimed: false };
    const need = q.id === 'train_50' ? 50 : 1;
    const pct = st.done ? 100 : Math.min(100, Math.round(((st.progress || 0) / need) * 100));
    const status = st.claimed ? 'مطالَبة' : st.done ? 'جاهزة للتحصيل' : 'جارٍ';
    html += `<div class="quest-card ${st.done && !st.claimed ? 'is-ready' : ''} ${st.claimed ? 'is-claimed' : ''}">
      <div class="quest-top">
        <strong>${q.nameAr}</strong>
        <span class="quest-status">${status}</span>
      </div>
      <div class="eta-bar"><i style="width:${pct}%"></i></div>
      <p class="meta">التقدم ${Math.min(st.progress || 0, need)}/${need} · مكافأة: ${rewardText(q.reward)}</p>
      <button class="btn ${st.done && !st.claimed ? 'btn-primary' : 'btn-ghost'} btn-small" data-claim="${q.id}" ${st.done && !st.claimed ? '' : 'disabled'}>تحصيل المكافأة</button>
    </div>`;
  }
  html += `</div>`;
  stage.innerHTML = html;
  $$('[data-claim]').forEach((b) => {
    b.onclick = () => {
      const r = G.claimQuest(state, tables, b.dataset.claim);
      toast(r.ok ? 'تم تحصيل مكافأة المهمة' : 'غير متاح');
      persist();
      renderAll();
    };
  });
}

function renderAll() {
  if (!state) return;
  // migrate older saves
  if (!state.scoutedNodes) state.scoutedNodes = {};
  if (!state.fieldOccupancy) state.fieldOccupancy = {};
  if (!state.unitLevels) state.unitLevels = {};
  if (!state.fieldStock) state.fieldStock = {};
  if (state.healQueue === undefined) state.healQueue = null;
  if (state.army && state.army.heavy_infantry == null) state.army.heavy_infantry = 0;
  // ensure quest entries exist for all daily defs
  for (const q of tables.quests.daily) {
    if (!state.quests[q.id]) state.quests[q.id] = { progress: 0, done: false, claimed: false };
  }
  Preview3D.disposePreview();
  previewIds = [];
  renderTop();
  setNav(view);
  advanceOnboarding();
  if (view !== 'city') {
    Castle3D.disposeCastle3D();
    castle3dApi = null;
    castle3dBuildSig = '';
  }
  if (view !== 'map') {
    World3D.disposeWorld3D();
    world3dApi = null;
    world3dSig = '';
  }
  if (view === 'city') renderCity();
  else if (view === 'map') renderMap();
  else if (view === 'hero') renderHero();
  else if (view === 'alliance') renderAlliance();
  else if (view === 'reports') renderReports();
  else if (view === 'quests') renderQuests();
}

function gameLoop() {
  if (state) {
    const ev = G.tick(state, tables);
    if (ev.length) {
      persist();
      for (const e of ev) {
        if (e.type === 'building_complete') toast(`اكتمل: ${buildingName(e.buildingId)} ${e.level}`);
        if (e.type === 'train_complete') toast(`انتهى التدريب: ${unitName(e.unitId)} ×${e.count}`);
        if (e.type === 'heal_complete') toast(`اكتمل الشفاء: ${e.healed} وحدة`);
        if (e.type === 'gather_start') toast('بدأ احتلال حقل الموارد');
        if (e.type === 'gather_done') toast('اكتمل الجمع — القافلة عائدة');
        if (e.type === 'march_report') {
          toast('وصل الجيش — تقرير جديد');
          const latest = state.reports[0];
          if (latest?.kind === 'combat') openReport(latest.id);
        }
        if (e.type === 'march_home') {
          toast(e.loot ? 'عادت المسيرة بالموارد' : 'عادت المسيرة إلى القلعة');
        }
      }
      renderAll();
    } else if (state.buildQueue || state.trainQueue || state.healQueue || state.marches.some((m) => m.status !== 'done')) {
      if (view === 'city' || view === 'map') renderAll();
      else renderTop();
    } else {
      renderTop();
    }
  }
  requestAnimationFrame(() => setTimeout(gameLoop, 400));
}

$('#modal-close')?.addEventListener('click', () => $('#modal').classList.remove('open'));
$('#modal')?.addEventListener('click', (e) => {
  if (e.target.id === 'modal') $('#modal').classList.remove('open');
});

$$('.hud-nav button').forEach((b) => {
  b.addEventListener('click', () => {
    view = b.dataset.view;
    renderAll();
  });
});

$('#btn-reset')?.addEventListener('click', () => {
  if (confirm('حذف الشخصية والبدء من جديد؟ الفصيل سيُختار مجدداً.')) {
    G.clearState();
    state = null;
    bootCreate();
  }
});

async function main() {
  try {
    tables = await G.loadTables();
  } catch (err) {
    document.body.innerHTML = `<div style="padding:2rem;font-family:Cairo,sans-serif;direction:rtl;color:#f3e6d0;background:#1a2433;min-height:100vh">
      <h1>عروش العصور</h1>
      <p>تعذّر تحميل الجداول. من جذر المتجر:</p>
      <pre style="background:#000;padding:1rem">cd /cursor/stores/self
python3 -m http.server 8080
# http://localhost:8080/prototype/</pre>
      <p>${String(err)}</p></div>`;
    return;
  }
  state = G.loadState();
  if (state) {
    G.tick(state, tables);
    persist();
    enterGame();
  } else {
    bootCreate();
  }
  gameLoop();
}

main();
