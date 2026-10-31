import * as G from './game.js';
import * as Maps from './maps.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

let tables = null;
let state = null;
let view = 'city';
let allianceTab = 'hall';
let eventsTab = 'world';
let selectedNodeId = null;
let selectedBuildingId = null;

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
  if (!['city', 'map', 'hero', 'alliance', 'reports', 'quests', 'events'].includes(view)) view = 'city';
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

/* ——— Castle interior map (historical SVG 2D) ——— */
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
    dock += `<h3>تدريب · شارات الوحدات 2D</h3><div class="unit-train-grid">`;
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
  // Mount 2D unit emblems
  for (const u of tables.units.units) {
    const host = $(`#unit-preview-${u.id}`);
    if (!host) continue;
    if (u.factionId && u.factionId !== state.factionId) continue;
    if (u.trainBuilding !== bid) continue;
    host.classList.add('unit-preview-2d');
    host.innerHTML = `<div class="unit-2d-emblem">${u.category === 'ranged' ? '⌁' : u.category === 'mounted' ? '♞' : '✥'}</div><span>${u.nameAr}</span>`;
  }
  $('#btn-heal')?.addEventListener('click', () => {
    const r = G.startHeal(state, tables);
    toast(r.ok ? `بدأ شفاء ${r.total} جريح` : r.reason);
    persist();
    renderAll();
  });
  bindQueueButtons();
}

function ensureCastle2D() {
  const host = $('#castle-2d-host');
  if (!host) return;
  host.innerHTML = Maps.buildCastleInteriorHtml(tables, state, selectedBuildingId, factionName(state.factionId));
  const svg = host.querySelector('.castle-iso-svg');
  if (svg) {
    if (state.castleViewBox) svg.setAttribute('viewBox', `${state.castleViewBox.x} ${state.castleViewBox.y} ${state.castleViewBox.w} ${state.castleViewBox.h}`);
    Maps.attachSvgPan(svg, state, 'castleViewBox', () => persist());
  }
  host.querySelectorAll('[data-building]').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      const id = button.getAttribute('data-building');
      if (!id) return;
      selectedBuildingId = id;
      state.selectedBuildingId = id;
      persist();
      renderCity();
    });
  });
}

function renderCity() {
  const stage = $('#main-stage');
  if (!selectedBuildingId) selectedBuildingId = 'palace';
  state.selectedBuildingId = selectedBuildingId;
  const bid = selectedBuildingId;

  const keepHost = stage.querySelector('#castle-2d-host');
  if (!keepHost) {
    stage.innerHTML = `
      <div class="map-compose castle-compose">
        <div class="map-main-col">
          <div class="castle-stage castle-2d-mode theme-${state.factionId}">
            <div class="castle-command-hud">
              <div class="castle-seal">✦</div>
              <div class="castle-command-copy"><span>مقر السيادة · ${factionName(state.factionId)}</span><strong>قلعة ${state.playerName}</strong><em>القصر مستوى ${state.buildings?.palace || 0} · الدرع الملكي فعّال</em></div>
              <div class="castle-command-rank"><b>${Object.values(state.buildings || {}).reduce((sum, level) => sum + (level || 0), 0)}</b><span>رتبة البناء</span></div>
            </div>
            <div id="castle-2d-host" class="castle-2d-host" role="img" aria-label="مشهد القلعة التاريخي ثنائي الأبعاد"></div>
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

  ensureCastle2D();
  bindCityDock(bid);
}

/* ——— External world map ——— */
function marchFormHtml() {
  const power = G.playerArmyPower(state, tables);
  const totalUnits = Object.values(state.army || {}).reduce((sum, count) => sum + (count || 0), 0);
  let html = `<div class="war-room-card">
    <div class="war-room-banner"><div class="war-room-seal">⚔</div><div><span>قاعة الحرب الملكية</span><strong>تشكيل راية المسير</strong><em>اختر الوحدات التي ستحمل أمر القائد</em></div><div class="war-room-power"><b>${power}</b><span>القوة</span></div></div>
    <div class="war-room-metrics"><span><b>${totalUnits.toLocaleString('ar')}</b> وحدة متاحة</span><span><b>${state.hero?.level || 1}</b> رتبة البطل</span><span><b>${state.stamina}</b> طاقة</span></div>
    <div class="army-controls" id="march-form">
    <div class="march-preview-row"><div class="unit-preview compact" id="march-unit-preview" aria-label="معاينة راية المسير"></div><div class="march-preview-copy"><span>راية المسير</span><strong>قوة موحّدة</strong><small>تتغير حسب التشكيل</small></div></div>`;
  for (const u of tables.units.units) {
    if (u.factionId && u.factionId !== state.factionId) continue;
    const have = state.army[u.id] || 0;
    const lv = state.unitLevels?.[u.id] || 1;
    const preset = Math.min(have, u.id === 'light_infantry' ? 100 : 40);
    html += `<div class="army-unit-slot">
      <div class="army-unit-heading"><span class="army-unit-glyph">${u.category === 'ranged' ? '⌁' : u.category === 'mounted' ? '♞' : '✥'}</span><label>${u.nameAr}<small>م${lv} · ${have.toLocaleString('ar')} متاح</small></label></div>
      <input type="number" min="0" max="${have}" value="${preset}" data-march="${u.id}" aria-label="عدد ${u.nameAr}" />
    </div>`;
  }
  return `${html}</div><div class="war-room-footer"><span>الحد الأقصى يتغير حسب الحامية والطاقة</span><b>جاهز لإصدار الأمر</b></div></div>`;
}

function mountMarchPreview() {
  const host = $('#march-unit-preview');
  if (!host) return;
  const first = tables.units.units.find((u) => (!u.factionId || u.factionId === state.factionId) && (state.army[u.id] || 0) > 0)
    || tables.units.units.find((u) => !u.factionId || u.factionId === state.factionId);
  if (!first) return;
  host.classList.add('unit-preview-2d');
  host.innerHTML = `<div class="unit-2d-emblem">⚔</div><span>${first.nameAr}</span>`;
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
    const monster = G.monsterById(tables, node.monsterId || node.id);
    const level = node.level || monster?.level || ((monster?.tier || 1) * 5 - 2);
    host.classList.add('monster-preview-2d');
    host.innerHTML = `<div class="monster-2d-emblem monster-level-${Math.min(40, level)}">☠</div><span>${monster?.visualArchetype || 'وحش ميداني'} · مستوى ${level}</span>`;
  } else {
    host.innerHTML = `<p class="muted">يظهر الرمز التاريخي على خريطة العالم 2D</p>`;
  }
}

function mountWorld2D(host) {
  const svg = Maps.buildWorldSvg(tables, state, selectedNodeId);
  host.innerHTML = `<div class="world-title"><span class="brand-inline">عروش العصور</span> — الأطلس التاريخي · 2D</div>
    <svg id="world-svg" class="world-svg world-2d-svg" viewBox="${svg.viewBox}" role="img" aria-label="خريطة العالم التاريخية">${svg.inner}</svg>`;
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

function ensureWorld2D() {
  const host = $('#world-webgl-host');
  if (!host) return;
  mountWorld2D(host);
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
    <p class="muted">أطلس 2D تاريخي · اسحب/قرص للتنقل · شارات المستوى فوق الوحوش · طاقة ${state.stamina}</p>
  </div>`;

  const keepWorld = stage.querySelector('#world-webgl-host');
  if (!keepWorld) {
    stage.innerHTML = `
      <div class="map-compose world-compose">
        <div class="map-main-col">
          <div class="world-frame world-2d-frame">
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
    ensureWorld2D();
  } else {
    const dockHost = $('#world-dock-host');
    if (dockHost) dockHost.innerHTML = dock;
    ensureWorld2D();
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

  const levelCost = { food: 200 * state.hero.level, gold: 20 * state.hero.level };
  const skillCost = 30 * state.hero.skillLevel;
  const levelPct = Math.min(100, Math.round((state.hero.level / 20) * 100));
  const skillPct = Math.min(100, Math.round((state.hero.skillLevel / 5) * 100));
  stage.innerHTML = `<div class="panel hero-panel hero-command-panel">
    <div class="hero-command-banner"><div class="hero-crown">♛</div><div><span>مجلس القادة · ${factionName(state.factionId)}</span><h2>${h.nameAr}</h2><p>${h.roleAr || 'قائد ميداني'} · ${h.bestUseAr || 'يقود الجيوش إلى النصر'}</p></div><div class="hero-command-power"><b>${raw + equip}</b><span>القوة الملكية</span></div></div>
    <div class="hero-layout">
      <div class="hero-preview-wrap">
        <div class="unit-preview hero-preview" id="hero-preview-2d" aria-label="بورتريه القائد ثنائي الأبعاد"></div>
        <div class="hero-preview-caption"><span>قائد ${factionName(state.factionId)}</span><b>المستوى ${state.hero.level}/20</b></div>
        <div class="hero-progression"><div><span>مسار القائد</span><b>${levelPct}%</b></div><i><em style="width:${levelPct}%"></em></i></div>
      </div>
      <div class="hero-card-body">
        <div class="hero-overview"><div><span>مساهمة متوقعة</span><strong>${Math.round(contrib)}</strong><small>من قوة الجيش ${armyP} · سقف 25٪</small></div><div><span>المهارة</span><strong>${state.hero.skillLevel}/5</strong><small>${skillPct}% من الإتقان</small></div></div>
        <div class="hero-stat-row"><span>قيادة ${sp.leadership ?? '—'}</span><span>بأس ${sp.might ?? '—'}</span><span>حماية ${sp.ward ?? '—'}</span><span>مسير ${sp.march ?? '—'}</span></div>
        <div class="hero-section-title"><span>ختم القائد</span><h3>المهارات الخاصة</h3></div>
        <div class="hero-skill-grid"><article class="hero-skill-card skill-active"><div class="skill-glyph">✦</div><div><span>نشطة · مستوى ${state.hero.skillLevel}/5</span><strong>${h.active.nameAr}</strong><p>${activeDesc}</p></div></article><article class="hero-skill-card skill-passive"><div class="skill-glyph">◈</div><div><span>سلبية · ثابتة</span><strong>${h.passive.nameAr}</strong><p>${h.passive.descAr || 'تمنح الجيش ميزة مستمرة في ساحة المعركة.'} (${Math.round((h.passive.value || 0) * 100)}٪)</p></div></article></div>
        <div class="hero-section-title"><span>إرث المعركة</span><h3>سمات القائد</h3></div><ul class="trait-list hero-traits">${traits || '<li class="muted">—</li>'}</ul>
        ${h.active.choices ? `<div class="hero-choice"><span>اختيار اندفاع النوروز</span><div>${h.active.choices.map((c) => `<button class="btn btn-ghost btn-small ${state.hero.nowruzChoice === c.id ? 'btn-primary' : ''}" data-nowruz="${c.id}">${c.nameAr}</button>`).join('')}</div></div>` : ''}
        <div class="hero-section-title"><span>إدارة الرتبة</span><h3>ترقية القائد</h3></div><div class="hero-upgrade-grid"><div class="hero-upgrade-card"><div><span>المستوى التالي</span><strong>${state.hero.level >= 20 ? 'مكتمل' : `${state.hero.level} → ${state.hero.level + 1}`}</strong></div><small>🌾 ${levelCost.food} · ✦ ${levelCost.gold}</small><button class="btn btn-primary btn-small" id="btn-hero-lvl" ${state.hero.level >= 20 ? 'disabled' : ''}>رفع المستوى</button></div><div class="hero-upgrade-card"><div><span>تطوير المهارة</span><strong>${state.hero.skillLevel >= 5 ? 'مكتمل' : `${state.hero.skillLevel} → ${state.hero.skillLevel + 1}`}</strong></div><small>✦ ${skillCost} ذهب</small><button class="btn btn-ghost btn-small" id="btn-hero-skill" ${state.hero.skillLevel >= 5 ? 'disabled' : ''}>رفع المهارة</button></div></div>
        <div class="inline-actions"><button class="btn btn-ghost" id="btn-back-castle">داخل القلعة</button></div>
      </div>
    </div>
  </div>`;

  const heroHost = $('#hero-preview-2d');
  if (heroHost) {
    heroHost.classList.add('hero-portrait-2d');
    heroHost.innerHTML = `<div class="hero-portrait-sigil">♛</div><strong>${h.nameAr}</strong><span>${h.roleAr || 'قائد ميداني'}</span>`;
  }

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
  const db = G.loadAlliances();
  const active = a?.supportRequests?.filter((request) => request.status === 'open') || [];
  const totalPower = a?.members?.reduce((sum, member) => sum + (member.power || 0), 0) || 0;
  let html = `<div class="alliance-shell">
    <div class="alliance-hero"><div class="alliance-crown">✦</div><div><span>مجلس العرش · دعم الرايات</span><h2>${a ? `[${a.tag}] ${a.name}` : 'مجلس التحالفات'}</h2><p>${a ? (a.desc || 'تتحد الرايات في مجلس واحد، وتُسمع كل رسالة قبل بدء الزحف.') : 'ابنِ سفارتك، ثم اجمع القادة تحت راية واحدة.'}</p></div>${a ? `<div class="alliance-power"><b>${totalPower}</b><span>قوة المجلس</span></div>` : ''}</div>`;

  if (!a) {
    html += `<div class="alliance-onboarding"><div class="alliance-create-card"><span class="alliance-kicker">راية جديدة</span><h3>أسّس مجلسك</h3><p class="muted">اجمع القادة وابدأ أول سجل للدردشة والدعم المتبادل.</p><input type="text" id="al-name" placeholder="سيوف العصر" class="field-input" /><input type="text" id="al-tag" maxlength="4" placeholder="عرش" class="field-input" /><button class="btn btn-primary" id="btn-al-create">رفع الراية</button></div><div class="alliance-join-card"><span class="alliance-kicker">مجالس قائمة</span><h3>انضم إلى تحالف</h3><div id="al-list"></div></div></div></div>`;
    stage.innerHTML = html;
    const list = $('#al-list');
    if (!db.list.length) list.innerHTML = '<p class="muted">لا توجد رايات قائمة بعد.</p>';
    else list.innerHTML = db.list.map((x) => `<div class="alliance-list-row"><div><strong>[${x.tag}] ${x.name}</strong><span>${x.members.length}/30 قائد · ${x.desc || 'مجلس ناشئ'}</span></div><button class="btn btn-ghost btn-small" data-join="${x.id}">انضمام</button></div>`).join('');
    $$('[data-join]').forEach((button) => { button.onclick = () => { const r = G.joinAlliance(state, button.dataset.join); toast(r.ok ? 'انضممت إلى المجلس' : r.reason); if (r.ok && state.onboardingStep === 3) state.onboardingStep = 4; persist(); renderAll(); }; });
    $('#btn-al-create').onclick = () => { const r = G.createAlliance(state, $('#al-name').value || 'تحالف', $('#al-tag').value || 'عرش'); toast(r.ok ? 'رُفعت راية التحالف' : r.reason); if (r.ok && state.onboardingStep === 3) state.onboardingStep = 4; persist(); renderAll(); };
    return;
  }

  html += `<div class="alliance-tabs"><button class="${allianceTab === 'hall' ? 'active' : ''}" data-alliance-tab="hall">المجلس</button><button class="${allianceTab === 'chat' ? 'active' : ''}" data-alliance-tab="chat">الدردشة <b>${a.chat?.length || 0}</b></button><button class="${allianceTab === 'support' ? 'active' : ''}" data-alliance-tab="support">الدعم <b>${active.length}</b></button></div>`;
  if (allianceTab === 'hall') {
    html += `<div class="alliance-grid"><section class="alliance-card members-card"><div class="card-title"><div><span class="alliance-kicker">حرس الراية</span><h3>أعضاء المجلس</h3></div><b>${a.members.length}/30</b></div>${a.members.map((member) => `<div class="member-row"><span class="member-sigil">${member.role === 'leader' ? '♛' : '✦'}</span><div><strong>${member.name}</strong><span>${member.role === 'leader' ? 'حامل الراية' : 'قائد ميداني'}</span></div><b>${member.power || 0}</b></div>`).join('')}</section><section class="alliance-card council-card"><span class="alliance-kicker">نبض المجلس</span><h3>المعاهدة الملكية</h3><p>كل قائد يساهم في تسريع البناء والشفاء. افتح قناة الدردشة لطلب دعم مباشر، أو أعلن عن إنجازك أمام الحلفاء.</p><div class="council-stat"><span>طلبات مفتوحة</span><b>${active.length}</b></div><div class="council-stat"><span>رسائل المجلس</span><b>${a.chat?.length || 0}</b></div><button class="btn btn-primary btn-small" data-alliance-tab="support">افتح مركز الدعم</button></section></div>`;
  } else if (allianceTab === 'chat') {
    html += `<section class="alliance-card alliance-chat-card"><div class="card-title"><div><span class="alliance-kicker">قناة مشفرة</span><h3>دردشة المجلس</h3></div><span class="live-dot">مباشر</span></div><div class="alliance-chat-log">${(a.chat || []).slice(-12).map((message) => `<div class="chat-message ${message.author === state.playerName ? 'mine' : ''}"><div class="chat-avatar">${message.author.slice(0, 1)}</div><div><strong>${message.author}</strong><p>${message.text}</p><time>${new Date(message.at).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })}</time></div></div>`).join('')}</div><div class="chat-compose"><input id="alliance-chat-input" class="field-input" maxlength="240" placeholder="اكتب نداءً إلى القادة..." /><button class="btn btn-primary" id="btn-alliance-chat">إرسال</button></div></section>`;
  } else {
    html += `<section class="alliance-card support-center"><div class="card-title"><div><span class="alliance-kicker">مساندة متبادلة</span><h3>مركز الدعم</h3></div><span class="support-cap">حتى 5 مساهمات</span></div><div class="support-actions"><button class="btn btn-ghost btn-small" id="btn-request-build" ${state.buildQueue ? '' : 'disabled'}>اطلب دعم البناء</button><button class="btn btn-ghost btn-small" id="btn-request-heal" ${state.healQueue ? '' : 'disabled'}>اطلب دعم الشفاء</button></div>${active.length ? active.map((request) => `<div class="support-request"><div class="support-icon">${request.type === 'heal' ? '✚' : '⌛'}</div><div><strong>${request.requester}</strong><span>${request.target}</span><div class="support-bar"><i style="width:${Math.min(100, (request.supporters / 5) * 100)}%"></i></div><small>${request.supporters}/5 مساهمات</small></div><button class="btn btn-primary btn-small" data-support="${request.id}" ${request.requester === state.playerName ? 'disabled' : ''}>مساندة</button></div>`).join('') : '<div class="empty-support"><span>✦</span><p>لا توجد طلبات دعم مفتوحة.<br>كن أول من يطلب المساندة من المجلس.</p></div>')}</section>`;
  }
  html += `<div class="alliance-footer"><span>${state.allianceRole === 'leader' ? 'أنت حامل الراية' : 'أنت قائد ميداني'} · ${active.length} طلبات دعم نشطة</span><button class="btn btn-ghost btn-small" id="btn-al-leave">مغادرة المجلس</button></div></div>`;
  stage.innerHTML = html;
  $$('[data-alliance-tab]').forEach((button) => { button.onclick = () => { allianceTab = button.dataset.allianceTab; renderAlliance(); }; });
  $('#btn-al-leave')?.addEventListener('click', () => { G.leaveAlliance(state); allianceTab = 'hall'; persist(); renderAll(); });
  $('#btn-alliance-chat')?.addEventListener('click', () => { const r = G.postAllianceMessage(state, $('#alliance-chat-input').value); toast(r.ok ? 'أُرسلت الرسالة إلى المجلس' : r.reason); if (r.ok) { persist(); renderAlliance(); } });
  $('#alliance-chat-input')?.addEventListener('keydown', (event) => { if (event.key === 'Enter') $('#btn-alliance-chat')?.click(); });
  $('#btn-request-build')?.addEventListener('click', () => { const r = G.createSupportRequest(state, 'build'); toast(r.ok ? 'رُفع طلب دعم البناء' : r.reason); if (r.ok) renderAlliance(); });
  $('#btn-request-heal')?.addEventListener('click', () => { const r = G.createSupportRequest(state, 'heal'); toast(r.ok ? 'رُفع طلب دعم الشفاء' : r.reason); if (r.ok) renderAlliance(); });
  $$('[data-support]').forEach((button) => { button.onclick = () => { const r = G.answerSupportRequest(state, tables, button.dataset.support); toast(r.ok ? r.message : r.reason); if (r.ok) { persist(); renderAlliance(); } }; });
}

function renderReports() {
  const stage = $('#main-stage');
  const battles = state.reports.filter((report) => report.kind === 'combat').length;
  const victories = state.reports.filter((report) => report.kind === 'combat' && report.outcome === 'win').length;
  let html = `<div class="panel war-reports-panel"><div class="war-reports-head"><div><span class="dock-eyebrow">أرشيف الرايات · ${battles} معارك</span><h2>قاعة النصر والتقارير</h2></div><div class="war-record"><b>${victories}</b><span>انتصار</span></div></div>`;
  if (!state.reports.length) html += `<p class="muted">لا تقارير بعد.</p>`;
  for (const r of state.reports) {
    const title = r.kind === 'combat' ? r.outcomeAr : r.kind === 'scout' ? 'استطلاع' : 'جمع';
    const targetBadge = r.kind === 'combat' && r.monsterLevel ? ` · ${r.monsterArchetype || 'وحش'} م${r.monsterLevel}` : '';
    const lootBadge = r.kind === 'combat' && r.loot ? ` · غنائم ${r.lootGrade || 'ميدانية'}` : '';
    html += `<div class="building-row report-row report-${r.kind} ${r.outcome === 'win' ? 'report-win' : r.outcome === 'loss' ? 'report-loss' : ''}" style="cursor:pointer" data-report="${r.id}">
      <div><strong><i class="report-emblem">${r.kind === 'combat' ? '⚔' : r.kind === 'scout' ? '◉' : '✦'}</i>${title}</strong>
        <div class="meta">${r.text || ''}${targetBadge}${lootBadge} · ${new Date(r.at).toLocaleTimeString('ar')}</div>
      </div>
      <span class="report-open">عرض السجل</span>
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
    body.innerHTML = `<div class="battle-modal-head report-gather"><span>سجل الإمداد</span><h2>تقرير جمع</h2></div><p>${r.text}</p>
      <p>طعام ${r.loot.food} · خشب ${r.loot.wood} · حجر ${r.loot.stone} · ذهب ${r.loot.gold}</p>
      ${r.fieldLevel ? `<p class="muted">مستوى الحقل ${r.fieldLevel}</p>` : ''}`;
  } else if (r.kind === 'scout') {
    body.innerHTML = `<div class="battle-modal-head report-scout"><span>عيون القصر</span><h2>تقرير استطلاع</h2></div><p>${r.text}</p>`;
  } else {
    const rows = Object.keys(r.attacker.before || {}).map((uid) => {
      const b = r.attacker.before[uid] || 0;
      const a = r.attacker.after[uid] || 0;
      const k = r.attacker.killed[uid] || 0;
      const w = r.attacker.wounded[uid] || 0;
      const lv = r.unitLevelsUsed?.[uid] || state.unitLevels?.[uid] || 1;
      return `<tr><td>${unitName(uid)} م${lv}</td><td>${b}</td><td>${a}</td><td>${k}</td><td>${w}</td></tr>`;
    }).join('');
    const lootLabels = { food: 'طعام', wood: 'خشب', stone: 'حجر', gold: 'ذهب' };
    const lootIcons = { food: '🌾', wood: '⌁', stone: '◆', gold: '✦' };
    const lootCards = ['food', 'wood', 'stone', 'gold'].map((key) => `<div class="loot-card loot-${key}"><span>${lootIcons[key]}</span><div><small>${lootLabels[key]}</small><strong>${(r.loot?.[key] || 0).toLocaleString('ar')}</strong></div></div>`).join('');
    const totalKilled = Object.values(r.attacker.killed || {}).reduce((sum, n) => sum + (n || 0), 0);
    const totalWounded = Object.values(r.attacker.wounded || {}).reduce((sum, n) => sum + (n || 0), 0);
    const level = r.monsterLevel || 0;
    const range = r.monsterLevelMin && r.monsterLevelMax ? `م${r.monsterLevelMin}–م${r.monsterLevelMax}` : `م${level || '—'}`;
    const archetype = r.monsterArchetype || 'حامية ميدانية';
    body.innerHTML = `<div class="battle-modal-head battle-head-${r.outcome === 'win' ? 'win' : r.outcome === 'loss' ? 'loss' : 'draw'}"><span>سجل الراية · ${new Date(r.at).toLocaleString('ar')}</span><h2>تقرير معركة — ${r.targetName}</h2><b>${r.outcomeAr}</b></div>
      <section class="battle-target-card"><div class="report-monster-emblem level-${level || 1}">☠<b>${level ? `م${level}` : 'NPC'}</b></div><div><span class="report-kicker">هدف الغارة · ${r.lootGrade || 'ميداني'}</span><h3>${r.targetName}</h3><p>${archetype} · نطاق الغنائم ${range}</p></div><div class="target-power"><small>الدفاع</small><strong>${(r.defPower || 0).toLocaleString('ar')}</strong></div></section>
      <div class="battle-metric-grid"><div><span>قوة جيشك</span><b>${(r.attPower || 0).toLocaleString('ar')}</b></div><div><span>قوة الخصم</span><b>${(r.defPower || 0).toLocaleString('ar')}</b></div><div><span>قتلى</span><b class="danger">${totalKilled}</b></div><div><span>جرحى</span><b class="warning">${totalWounded}</b></div></div>
      <div class="battle-result-line ${r.outcome === 'win' ? 'is-win' : r.outcome === 'loss' ? 'is-loss' : ''}"><span>النتيجة النهائية</span><strong>${r.outcomeAr}</strong><small>معامل الحسم R=${r.R}</small></div>
      ${r.recommendedPower ? `<p class="muted report-recommendation">القوة الموصى بها للوحش: ≥ ${r.recommendedPower} · ${r.attPower >= r.recommendedPower ? 'تشكيل مناسب' : 'مواجهة عالية المخاطر'}</p>` : ''}
      <section class="report-loot-section"><div class="report-section-head"><div><span class="report-kicker">حصيلة الغارة</span><h3>الغنائم المكتسبة</h3></div><b class="loot-grade-${r.lootGrade || 'ميدانية'}">${r.lootGrade || 'غنائم ميدانية'}</b></div><div class="loot-grid">${lootCards}</div>${r.specialReward ? `<div class="rare-reward"><span>✦</span><div><small>مكافأة الوحش الخاصة</small><strong>${r.specialReward.nameAr}</strong><p>${r.specialReward.descAr || ''}</p></div></div>` : ''}</section>
      <section class="report-army-section"><div class="report-section-head"><div><span class="report-kicker">سجل التشكيل</span><h3>أداء الوحدات</h3></div><span class="hero-contribution">مساهمة البطل ${Math.round((r.hero?.contributionRatio || 0) * 100)}٪</span></div><table class="report-table"><thead><tr><th>الوحدة</th><th>قبل</th><th>بعد</th><th>قتلى</th><th>جرحى</th></tr></thead><tbody>${rows}</tbody></table></section>`;
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

function achievementProgress(def) {
  const reports = state.reports || [];
  if (def.metric === 'combat_wins') return reports.filter((r) => r.kind === 'combat' && r.outcome === 'win').length;
  if (def.metric === 'monster_wins') return reports.filter((r) => r.kind === 'combat' && r.outcome === 'win' && r.monsterLevel).length;
  if (def.metric === 'max_monster_level') return Math.max(0, ...reports.filter((r) => r.kind === 'combat' && r.outcome === 'win').map((r) => r.monsterLevel || 0));
  if (def.metric === 'hero_level') return state.hero?.level || 1;
  if (def.metric === 'palace_level') return state.buildings?.palace || 0;
  if (def.metric === 'alliance') return state.allianceId ? 1 : 0;
  if (def.metric === 'army_count') return Object.values(state.army || {}).reduce((sum, count) => sum + (count || 0), 0);
  if (def.metric === 'resources_total') return Object.values(state.resources || {}).reduce((sum, count) => sum + (count || 0), 0);
  return 0;
}

function renderQuests() {
  const stage = $('#main-stage');
  const daily = tables.quests.daily || [];
  const achievements = tables.achievements?.items || [];
  const dailyDone = daily.filter((q) => state.quests[q.id]?.done).length;
  const dailyClaimed = daily.filter((q) => state.quests[q.id]?.claimed).length;
  const achievementDone = achievements.filter((a) => (state.achievements?.[a.id]?.claimed)).length;
  let html = `<div class="royal-record-shell"><section class="royal-record-hero"><div class="record-seal">✦</div><div><span>سجل العرش · تقدم القائد</span><h2>المهام والإنجازات الملكية</h2><p>كل غارة وترقية وتحالف يترك أثراً في سجل مملكتك. أكمل الأهداف وحوّل التقدم إلى جوائز.</p></div><div class="record-summary"><b>${dailyClaimed + achievementDone}</b><span>جوائز محصّلة</span></div></section><div class="record-stats"><span><b>${dailyDone}/${daily.length}</b> مهام يومية</span><span><b>${achievementDone}/${achievements.length}</b> إنجازات ملكية</span><span><b>${(state.reports || []).filter((r) => r.kind === 'combat' && r.outcome === 'win').length}</b> انتصارات</span></div><section class="record-section"><div class="record-section-head"><div><span class="record-kicker">دورة اليوم</span><h3>أوامر القصر اليومية</h3></div><span class="record-reset">تتجدد مع بداية اليوم</span></div><div class="daily-quest-grid">`;
  for (const q of daily) {
    const st = state.quests[q.id] || { progress: 0, done: false, claimed: false };
    const need = q.id === 'train_50' ? 50 : 1;
    const progress = Math.min(st.progress || 0, need);
    const pct = st.done ? 100 : Math.min(100, Math.round((progress / need) * 100));
    const status = st.claimed ? 'مُحصّلة' : st.done ? 'جاهزة للتحصيل' : 'قيد التنفيذ';
    html += `<article class="royal-quest-card ${st.done && !st.claimed ? 'is-ready' : ''} ${st.claimed ? 'is-claimed' : ''}"><div class="quest-medal">${q.id === 'raid_npc' ? '⚔' : q.id === 'hero_level' ? '♛' : q.id === 'train_50' ? '♞' : '✦'}</div><div class="quest-card-main"><div class="quest-top"><strong>${q.nameAr}</strong><span class="quest-status">${status}</span></div><div class="eta-bar"><i style="width:${pct}%"></i></div><p class="meta">${progress}/${need} · ${rewardText(q.reward)}</p><button class="btn ${st.done && !st.claimed ? 'btn-primary' : 'btn-ghost'} btn-small" data-claim="${q.id}" ${st.done && !st.claimed ? '' : 'disabled'}>${st.claimed ? 'تم التحصيل' : st.done ? 'تحصيل الجائزة' : 'متابعة المهمة'}</button></div></article>`;
  }
  html += `</div></section><section class="record-section achievements-section"><div class="record-section-head"><div><span class="record-kicker">إرث طويل الأمد</span><h3>الإنجازات الملكية</h3></div><span class="record-reset">${achievementDone}/${achievements.length} أوسمة</span></div><div class="achievement-grid">`;
  for (const achievement of achievements) {
    const current = achievementProgress(achievement);
    const claimed = state.achievements?.[achievement.id]?.claimed;
    const complete = current >= achievement.target;
    const pct = Math.min(100, Math.round((current / achievement.target) * 100));
    html += `<article class="achievement-card ${complete && !claimed ? 'is-unlocked' : ''} ${claimed ? 'is-claimed' : ''}"><div class="achievement-icon">${achievement.icon}</div><div class="achievement-body"><div class="quest-top"><strong>${achievement.nameAr}</strong><span class="achievement-state">${claimed ? 'مُنجز' : complete ? 'جاهز' : 'يُبنى'}</span></div><p>${achievement.descAr}</p><div class="achievement-progress"><i style="width:${pct}%"></i></div><div class="achievement-foot"><span>${Math.min(current, achievement.target).toLocaleString('ar')}/${achievement.target.toLocaleString('ar')}</span><small>${rewardText(achievement.reward)}</small></div>${complete && !claimed ? `<button class="btn btn-primary btn-small" data-achievement="${achievement.id}">تحصيل الوسام</button>` : ''}</div></article>`;
  }
  html += `</div></section></div>`;
  stage.innerHTML = html;
  $$('[data-claim]').forEach((button) => { button.onclick = () => { const r = G.claimQuest(state, tables, button.dataset.claim); toast(r.ok ? 'تم تحصيل مكافأة المهمة' : r.reason || 'غير متاح'); persist(); renderAll(); }; });
  $$('[data-achievement]').forEach((button) => { button.onclick = () => { const achievement = achievements.find((item) => item.id === button.dataset.achievement); const r = G.claimAchievement(state, tables, button.dataset.achievement, achievementProgress(achievement)); toast(r.ok ? 'رُفع وسام جديد إلى سجل العرش' : r.reason || 'غير متاح'); persist(); renderAll(); }; });
}

function renderEvents() {
  const stage = $('#main-stage');
  const events = tables.events?.events || [];
  const war = tables.events?.kingdomWar;
  const wins = state.reports.filter((report) => report.kind === 'combat' && report.outcome === 'win').length;
  const scouts = state.reports.filter((report) => report.kind === 'scout').length;
  const playerPoints = wins * 450 + scouts * 35 + (state.allianceId ? 280 : 0);
  const playerRank = playerPoints > 900 ? 2 : playerPoints > 300 ? 3 : 4;
  let html = `<div class="events-shell">
    <section class="events-hero"><div class="events-crest">♛</div><div><span>الموسم الأول · رايات الممالك</span><h2>ساحة الفعاليات الكبرى</h2><p>كل أسبوع يكتب القادة فصلاً جديداً في سجل العروش. اغتنم الحدث قبل أن تغلق البوابة.</p></div><div class="events-week"><b>14</b><span>أسبوع الموسم</span></div></section>
    <div class="events-tabs"><button class="${eventsTab === 'world' ? 'active' : ''}" data-events-tab="world">فعاليات العالم <b>${events.length}</b></button><button class="${eventsTab === 'war' ? 'active' : ''}" data-events-tab="war">حرب الممالك <b>W14</b></button></div>`;
  if (eventsTab === 'world') {
    html += `<div class="event-status-strip"><span class="event-live-dot"></span><strong>المجال مفتوح</strong><span>3 فعاليات كبرى · أول مكافأة بانتظار رايتك</span><b>${G.formatEta(18 * 60 * 60 * 1000)} متبقية</b></div><div class="grand-events-grid">`;
    for (const event of events) {
      html += `<article class="grand-event-card event-${event.accent}"><div class="event-card-top"><span class="event-icon">${event.icon}</span><div><span class="event-type">${event.typeAr}</span><h3>${event.nameAr}</h3></div><b class="event-status">${event.statusAr}</b></div><p>${event.descriptionAr}</p><div class="event-reward"><span>مكافآت الحدث</span><strong>${event.rewardAr}</strong></div><div class="event-card-footer"><span class="event-progress"><i style="width:${event.id === 'crown_rift' ? Math.min(92, 18 + wins * 11) : event.id === 'caravan_war' ? Math.min(54, 12 + scouts * 8) : 8}%"></i></span><button class="btn btn-primary btn-small" data-event-action="${event.targetKind}">${event.targetKind === 'monster' ? 'افتح الخريطة' : event.targetKind === 'resource' ? 'أرسل قافلة' : 'استكشف الأطلال'}</button></div></article>`;
    }
    html += `</div><section class="event-calendar"><div><span class="events-kicker">بوابة الأسبوع</span><h3>روزنامة العالم</h3></div><div class="calendar-rail">${war.days.map((day, index) => `<div class="calendar-day ${day.stateAr === 'نشط' ? 'active' : day.stateAr === 'مكتمل' ? 'done' : ''}"><b>${day.dayAr}</b><span>${day.labelAr}</span><em>${day.stateAr}</em></div>`).join('')}</div></section>`;
  } else {
    html += `<div class="war-banner"><div><span class="events-kicker">الدورة الحالية · ${war.phaseAr}</span><h3>${war.nameAr}</h3><p>${war.descriptionAr}</p></div><div class="war-timer"><b>18:42:16</b><span>حتى إغلاق المرحلة</span></div></div><div class="war-layout"><section class="kingdom-ranking"><div class="section-title"><div><span class="events-kicker">لوح الرايات</span><h3>ترتيب الممالك</h3></div><span class="ranking-live">تحديث حي</span></div>${war.kingdoms.map((kingdom) => `<div class="kingdom-row kingdom-${kingdom.color} ${kingdom.rank === playerRank ? 'is-player' : ''}><b class="kingdom-rank">${kingdom.rank}</b><span class="kingdom-emblem">${kingdom.tag}</span><div><strong>${kingdom.nameAr}</strong><span>${kingdom.statusAr}</span></div><div class="kingdom-points"><b>${(kingdom.rank === playerRank ? kingdom.points + playerPoints : kingdom.points).toLocaleString('ar')}</b><span>نقطة</span></div></div>`).join('')}</section><section class="war-side-card"><div class="your-kingdom"><span class="events-kicker">رايتك هذا الأسبوع</span><h3>${state.allianceId ? 'عرش الجزيرة' : 'قلعة القائد'}</h3><div class="your-score"><b>${playerPoints.toLocaleString('ar')}</b><span>نقاط المساهمة</span></div><div class="contribution-list"><span>انتصارات الغارات <b>${wins}</b></span><span>عمليات الاستطلاع <b>${scouts}</b></span><span>رتبة تقديرية <b>#${playerRank}</b></span></div></div><div class="war-rewards"><span class="events-kicker">جوائز إغلاق الحرب</span><ul>${war.rewardsAr.map((reward) => `<li>✦ ${reward}</li>`).join('')}</ul></div><button class="btn btn-primary" id="btn-war-map">دخول جبهة الحرب</button></section></div><section class="war-phases"><span class="events-kicker">مراحل الحرب</span><div>${war.days.map((day) => `<span class="phase-chip ${day.stateAr === 'نشط' ? 'active' : ''}"><b>${day.dayAr}</b>${day.labelAr}</span>`).join('')}</div></section>`;
  }
  html += `</div>`;
  stage.innerHTML = html;
  $$('[data-events-tab]').forEach((button) => { button.onclick = () => { eventsTab = button.dataset.eventsTab; renderEvents(); }; });
  $$('[data-event-action]').forEach((button) => { button.onclick = () => { view = button.dataset.eventAction === 'ruin' ? 'map' : button.dataset.eventAction === 'monster' || button.dataset.eventAction === 'resource' ? 'map' : 'map'; selectedNodeId = button.dataset.eventAction === 'monster' ? (tables.world.nodes.find((node) => node.kind === 'monster')?.id || 'castle_player') : (tables.world.nodes.find((node) => node.kind === button.dataset.eventAction)?.id || 'castle_player'); renderAll(); }; });
  $('#btn-war-map')?.addEventListener('click', () => { view = 'map'; renderAll(); });
}

function renderAll() {
  if (!state) return;
  // migrate older saves
  if (!state.scoutedNodes) state.scoutedNodes = {};
  if (!state.fieldOccupancy) state.fieldOccupancy = {};
  if (!state.unitLevels) state.unitLevels = {};
  if (!state.fieldStock) state.fieldStock = {};
  if (!state.achievements) state.achievements = {};
  if (state.healQueue === undefined) state.healQueue = null;
  if (state.army && state.army.heavy_infantry == null) state.army.heavy_infantry = 0;
  // ensure quest entries exist for all daily defs
  for (const q of tables.quests.daily) {
    if (!state.quests[q.id]) state.quests[q.id] = { progress: 0, done: false, claimed: false };
  }
  renderTop();
  setNav(view);
  advanceOnboarding();
  if (view === 'city') renderCity();
  else if (view === 'map') renderMap();
  else if (view === 'hero') renderHero();
  else if (view === 'alliance') renderAlliance();
  else if (view === 'reports') renderReports();
  else if (view === 'quests') renderQuests();
  else if (view === 'events') renderEvents();
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
