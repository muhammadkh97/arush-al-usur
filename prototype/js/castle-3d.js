/**
 * عروش العصور — Three.js / WebGL isometric castle interior (original low-poly art).
 * HUD stays in HTML RTL; this module owns the WebGL city plane only.
 */
import * as THREE from 'three';

const CELL = 2.4;
const GRID_OX = 5;
const GRID_OZ = 3.5;

let runtime = null;

const NAME_AR = {
  palace: 'القصر', farm: 'مزرعة', lumber: 'حطب', quarry: 'محجر', goldmine: 'ذهب',
  warehouse: 'مستودع', barracks: 'ثكنة', archery: 'رماة', wall: 'سور',
  embassy: 'سفارة', hospital: 'مستشفى', academy: 'أكاديمية', shrine: 'ضريح',
};

export function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl') || c.getContext('experimental-webgl'));
  } catch {
    return false;
  }
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function gridToWorld(col, row, w = 1, h = 1) {
  const cx = col + w / 2;
  const cz = row + h / 2;
  return {
    x: (cx - GRID_OX) * CELL,
    z: (cz - GRID_OZ) * CELL,
  };
}

function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: opts.roughness ?? 0.72,
    metalness: opts.metalness ?? 0.08,
    transparent: opts.transparent ?? false,
    opacity: opts.opacity ?? 1,
    emissive: opts.emissive ? new THREE.Color(opts.emissive) : undefined,
    emissiveIntensity: opts.emissiveIntensity ?? 0,
  });
}

function box(w, h, d, material, y = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.y = y + h / 2;
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function cyl(rTop, rBot, h, material, y = 0, segs = 10) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, segs), material);
  m.position.y = y + h / 2;
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function cone(r, h, material, y = 0, segs = 10) {
  const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, segs), material);
  m.position.y = y + h / 2;
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function sphere(r, material, y = 0, wSeg = 12, hSeg = 8) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, wSeg, hSeg), material);
  m.position.y = y;
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function addMinaret(g, x, z, h = 2.4, gold = true) {
  const stone = mat(0xc4a882, { roughness: 0.85 });
  const dome = mat(gold ? 0xe0b04a : 0x3a6a90, { roughness: 0.35, metalness: gold ? 0.55 : 0.15 });
  const shaft = cyl(0.18, 0.22, h, stone, 0, 8);
  shaft.position.x = x;
  shaft.position.z = z;
  g.add(shaft);
  const balc = box(0.55, 0.12, 0.55, stone, h * 0.62);
  balc.position.x = x;
  balc.position.z = z;
  g.add(balc);
  const tip = cone(0.28, 0.45, dome, h, 8);
  tip.position.x = x;
  tip.position.z = z;
  g.add(tip);
  const spire = cyl(0.03, 0.03, 0.35, dome, h + 0.45, 6);
  spire.position.x = x;
  spire.position.z = z;
  g.add(spire);
}

function buildPalace(theme) {
  const g = new THREE.Group();
  const stone = mat(0xf0e0c4, { roughness: 0.78 });
  const side = mat(0xa89070, { roughness: 0.82 });
  const gold = mat(0xe8c47a, { roughness: 0.28, metalness: 0.62, emissive: 0x6a4010, emissiveIntensity: 0.12 });
  const teal = mat(0x3a6a90, { roughness: 0.45, metalness: 0.2 });
  const accent = theme === 'rome' ? teal : gold;

  g.add(box(3.4, 1.15, 3.4, stone, 0));
  const mid = box(2.6, 0.95, 2.6, side, 1.15);
  g.add(mid);
  const upper = box(1.9, 0.7, 1.9, stone, 2.1);
  g.add(upper);

  // Hero golden dome
  const dome = sphere(1.05, accent, 3.35, 20, 12);
  dome.scale.y = 0.72;
  g.add(dome);
  const finial = cyl(0.05, 0.05, 0.55, gold, 4.05, 6);
  g.add(finial);
  const crescent = box(0.35, 0.08, 0.08, gold, 4.55);
  g.add(crescent);

  addMinaret(g, -1.55, -1.55, 3.1, true);
  addMinaret(g, 1.55, -1.55, 3.1, true);
  addMinaret(g, -1.55, 1.55, 2.7, true);
  addMinaret(g, 1.55, 1.55, 2.7, true);

  // Courtyard ring suggestion
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(2.35, 0.12, 8, 32),
    mat(0x2a6a88, { roughness: 0.4, metalness: 0.15 }),
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.06;
  ring.receiveShadow = true;
  g.add(ring);

  return g;
}

function buildFarm() {
  const g = new THREE.Group();
  const soil = mat(0x4a8a3a, { roughness: 0.95 });
  const pad = box(1.9, 0.12, 1.9, soil, 0);
  g.add(pad);
  const crop = mat(0x6ab04a, { roughness: 0.9 });
  for (let i = -2; i <= 2; i++) {
    const row = box(1.7, 0.18, 0.22, crop, 0.12);
    row.position.z = i * 0.32;
    g.add(row);
  }
  const hut = box(0.7, 0.55, 0.7, mat(0xc4a882), 0.12);
  hut.position.set(0.55, 0, -0.55);
  g.add(hut);
  const roof = cone(0.55, 0.4, mat(0x8a6238), 0.67, 4);
  roof.position.set(0.55, 0, -0.55);
  roof.rotation.y = Math.PI / 4;
  g.add(roof);
  return g;
}

function buildLumber() {
  const g = new THREE.Group();
  g.add(box(1.6, 0.15, 1.6, mat(0x6b5340), 0));
  const trunk = mat(0x5c4030, { roughness: 0.9 });
  const leaf = mat(0x2d6b32, { roughness: 0.85 });
  [[-0.45, -0.3], [0.35, 0.2], [0.1, -0.5]].forEach(([x, z], i) => {
    const t = cyl(0.1, 0.14, 0.9 + i * 0.15, trunk, 0.15, 7);
    t.position.set(x, 0, z);
    g.add(t);
    const top = cone(0.45 - i * 0.05, 0.7, leaf, 1.0 + i * 0.15, 7);
    top.position.set(x, 0, z);
    g.add(top);
  });
  const pile = box(0.7, 0.28, 0.4, trunk, 0.15);
  pile.position.set(0.55, 0, 0.5);
  g.add(pile);
  return g;
}

function buildQuarry() {
  const g = new THREE.Group();
  g.add(box(1.7, 0.12, 1.7, mat(0x8a8070), 0));
  const rock = mat(0x9a9ea4, { roughness: 0.95, metalness: 0.05 });
  [[-0.4, 0.2, 0.7], [0.35, -0.25, 0.95], [0.1, 0.45, 0.55]].forEach(([x, z, s]) => {
    const b = box(s * 0.7, s * 0.55, s * 0.6, rock, 0.12);
    b.position.set(x, 0, z);
    b.rotation.y = x * 0.4;
    g.add(b);
  });
  return g;
}

function buildGoldmine() {
  const g = new THREE.Group();
  g.add(box(1.6, 0.14, 1.6, mat(0x7a6248), 0));
  const rock = mat(0x6a7078, { roughness: 0.9 });
  const gold = mat(0xe0b04a, { roughness: 0.3, metalness: 0.7, emissive: 0x5a4010, emissiveIntensity: 0.18 });
  g.add(box(1.2, 0.7, 1.0, rock, 0.14));
  const vein = box(0.15, 0.55, 0.9, gold, 0.2);
  vein.position.x = 0.35;
  g.add(vein);
  const vein2 = box(0.9, 0.12, 0.12, gold, 0.55);
  vein2.position.set(-0.1, 0, 0.2);
  g.add(vein2);
  return g;
}

function buildWarehouse() {
  const g = new THREE.Group();
  const wood = mat(0xb88850, { roughness: 0.8 });
  g.add(box(1.7, 1.1, 1.4, wood, 0));
  const roof = box(1.9, 0.18, 1.6, mat(0x6b5340), 1.1);
  g.add(roof);
  const door = box(0.4, 0.55, 0.08, mat(0x5c4030), 0.1);
  door.position.z = 0.72;
  g.add(door);
  return g;
}

function buildBarracks() {
  const g = new THREE.Group();
  const stone = mat(0xc4a882, { roughness: 0.85 });
  g.add(box(1.8, 1.0, 1.5, stone, 0));
  g.add(box(1.95, 0.22, 1.65, mat(0x8a7048), 1.0));
  // Training poles
  for (let i = -1; i <= 1; i++) {
    const pole = cyl(0.05, 0.05, 0.85, mat(0x5c4030), 0, 6);
    pole.position.set(i * 0.35, 0, 0.95);
    g.add(pole);
  }
  const banner = box(0.08, 0.45, 0.28, mat(0x8b2e2e), 0.9);
  banner.position.set(0.7, 0, -0.55);
  g.add(banner);
  return g;
}

function buildArchery() {
  const g = new THREE.Group();
  g.add(box(1.6, 0.9, 1.4, mat(0xd4b892), 0));
  const roof = cone(1.05, 0.55, mat(0x3a6a90, { roughness: 0.5 }), 0.9, 4);
  roof.rotation.y = Math.PI / 4;
  g.add(roof);
  // Targets
  [-0.5, 0.5].forEach((x) => {
    const t = cyl(0.22, 0.22, 0.08, mat(0xe8c47a), 0.55, 10);
    t.rotation.x = Math.PI / 2;
    t.position.set(x, 0, 0.95);
    g.add(t);
  });
  return g;
}

function buildHospital() {
  const g = new THREE.Group();
  g.add(box(1.7, 1.05, 1.5, mat(0xe8e0d4), 0));
  g.add(box(1.85, 0.16, 1.65, mat(0xa88860), 1.05));
  const crossV = box(0.12, 0.45, 0.08, mat(0xc45c4a), 1.25);
  crossV.position.z = 0.1;
  g.add(crossV);
  const crossH = box(0.4, 0.12, 0.08, mat(0xc45c4a), 1.4);
  crossH.position.z = 0.1;
  g.add(crossH);
  return g;
}

function buildEmbassy() {
  const g = new THREE.Group();
  g.add(box(1.6, 1.15, 1.4, mat(0xd8c8a8), 0));
  g.add(box(1.75, 0.2, 1.55, mat(0x3a5570), 1.15));
  const col1 = cyl(0.1, 0.1, 1.0, mat(0xf0e0c4), 0.1, 8);
  col1.position.set(-0.55, 0, 0.75);
  g.add(col1);
  const col2 = cyl(0.1, 0.1, 1.0, mat(0xf0e0c4), 0.1, 8);
  col2.position.set(0.55, 0, 0.75);
  g.add(col2);
  const flag = box(0.06, 0.7, 0.06, mat(0x5c4030), 1.35);
  flag.position.set(0.7, 0, -0.5);
  g.add(flag);
  const cloth = box(0.35, 0.25, 0.04, mat(0xe8c47a), 1.75);
  cloth.position.set(0.9, 0, -0.5);
  g.add(cloth);
  return g;
}

function buildAcademy() {
  const g = new THREE.Group();
  g.add(box(1.7, 1.2, 1.5, mat(0xe0d4bc), 0));
  const dome = sphere(0.65, mat(0x3a6a90, { roughness: 0.4, metalness: 0.2 }), 1.85, 14, 10);
  dome.scale.y = 0.65;
  g.add(dome);
  const steps = box(1.0, 0.18, 0.45, mat(0xc4a882), 0);
  steps.position.z = 0.95;
  g.add(steps);
  return g;
}

function buildShrine() {
  const g = new THREE.Group();
  g.add(cyl(0.85, 0.95, 0.35, mat(0xc4a882), 0, 8));
  g.add(cyl(0.55, 0.6, 1.1, mat(0xe8dcc4), 0.35, 8));
  const dome = sphere(0.55, mat(0xe0b04a, { roughness: 0.3, metalness: 0.55 }), 1.85, 14, 10);
  dome.scale.y = 0.7;
  g.add(dome);
  const fin = cyl(0.04, 0.04, 0.4, mat(0xe8c47a, { metalness: 0.6 }), 2.2, 6);
  g.add(fin);
  const bowl = cyl(0.25, 0.2, 0.18, mat(0x8a6238), 0.1, 8);
  bowl.position.set(0.85, 0, 0.7);
  g.add(bowl);
  return g;
}

function buildWall() {
  const g = new THREE.Group();
  const stone = mat(0xc4a882, { roughness: 0.88 });
  const dark = mat(0x8a7048, { roughness: 0.9 });
  g.add(box(3.2, 0.95, 0.7, stone, 0));
  for (let i = -3; i <= 3; i++) {
    const merlon = box(0.32, 0.28, 0.55, dark, 0.95);
    merlon.position.x = i * 0.45;
    g.add(merlon);
  }
  const gate = box(0.7, 0.75, 0.2, mat(0x5c4030), 0.05);
  gate.position.z = 0.35;
  g.add(gate);
  return g;
}

const BUILDERS = {
  palace: buildPalace,
  farm: buildFarm,
  lumber: buildLumber,
  quarry: buildQuarry,
  goldmine: buildGoldmine,
  warehouse: buildWarehouse,
  barracks: buildBarracks,
  archery: buildArchery,
  hospital: buildHospital,
  embassy: buildEmbassy,
  academy: buildAcademy,
  shrine: buildShrine,
  wall: buildWall,
};

function makePalm(x, z, scale = 1) {
  const g = new THREE.Group();
  const trunk = cyl(0.06 * scale, 0.1 * scale, 1.4 * scale, mat(0x6b4a28), 0, 6);
  g.add(trunk);
  const leaf = mat(0x3d8a40, { roughness: 0.85 });
  for (let i = 0; i < 5; i++) {
    const frond = box(0.08 * scale, 0.05 * scale, 0.85 * scale, leaf, 1.35 * scale);
    frond.position.y = 1.35 * scale;
    frond.rotation.y = (i / 5) * Math.PI * 2;
    frond.rotation.x = -0.55;
    g.add(frond);
  }
  g.position.set(x, 0, z);
  return g;
}

function buildGround(scene) {
  const sand = mat(0xd4a86a, { roughness: 0.95 });
  const ground = new THREE.Mesh(new THREE.CircleGeometry(18, 48), sand);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const grassMat = mat(0x5a9b4a, { roughness: 0.92 });
  [[-6, -3, 2.2], [7, 2, 2.8], [-3, 6, 2.4], [5, -5, 1.8]].forEach(([x, z, s]) => {
    const patch = new THREE.Mesh(new THREE.CircleGeometry(s, 20), grassMat);
    patch.rotation.x = -Math.PI / 2;
    patch.position.set(x, 0.02, z);
    patch.receiveShadow = true;
    scene.add(patch);
  });

  // Sand paths toward palace
  const pathMat = mat(0xc4a06a, { roughness: 0.98 });
  [[0, 4, 1.1, 5], [-5, 2, 4.5, 0.9], [5, 1.5, 4.2, 0.9]].forEach(([x, z, w, d]) => {
    const p = box(w, 0.04, d, pathMat, 0.01);
    p.position.set(x, 0, z);
    p.castShadow = false;
    scene.add(p);
  });

  [
    [-7, -2], [-8, 0], [8, -1], [7.5, 2], [-4, 7], [3, 7.5], [-2.5, -2.2], [2.8, -2],
  ].forEach(([x, z], i) => scene.add(makePalm(x, z, 0.75 + (i % 3) * 0.12)));
}

function buildSelectionRing() {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(1.05, 1.25, 32),
    new THREE.MeshBasicMaterial({ color: 0xe8c47a, transparent: true, opacity: 0.85, side: THREE.DoubleSide }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.08;
  ring.visible = false;
  return ring;
}

function buildLevelBadge(text) {
  // Simple floating disc + we'll use CSS overlay for Arabic labels instead
  const g = new THREE.Group();
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(0.35, 16),
    new THREE.MeshBasicMaterial({ color: 0x1a2433, transparent: true, opacity: 0.92, side: THREE.DoubleSide }),
  );
  disc.position.y = 0.01;
  g.add(disc);
  const rim = new THREE.Mesh(
    new THREE.RingGeometry(0.32, 0.38, 16),
    new THREE.MeshBasicMaterial({ color: 0xe8c47a, side: THREE.DoubleSide }),
  );
  rim.position.y = 0.02;
  g.add(rim);
  g.rotation.x = -Math.PI / 2;
  return g;
}

/**
 * Shell HTML for castle stage — canvas mounts into #castle-3d-host.
 */
export function buildCastleInteriorHtml(tables, state, selectedBuildingId, factionLabel = '') {
  const theme = state.factionId;
  const factionAr = factionLabel || state.factionId;
  const layout = tables.world.castleInteriorLayout;
  const labels = layout.buildings.map((b) => {
    const name = tables.buildings.buildings[b.id]?.nameAr || NAME_AR[b.id] || b.id;
    const lvl = state.buildings[b.id] || 0;
    const selected = selectedBuildingId === b.id;
    return `<button type="button" class="castle-plot plot-html ${selected ? 'is-selected' : ''} plot-${b.id}"
      data-building="${b.id}" aria-label="${esc(name)}">
      <span class="plot-label">${esc(NAME_AR[b.id] || name)}</span>
      <span class="plot-lvl">${lvl > 0 ? `م${lvl}` : '—'}</span>
    </button>`;
  }).join('');

  return `
    <div class="castle-stage theme-${theme} castle-3d-mode">
      <div class="castle-hour-sky" aria-hidden="true"></div>
      <div class="castle-brand"><span>عروش العصور</span> · داخل القلعة · 3D</div>
      <div class="castle-3d-wrap">
        <div id="castle-3d-host" class="castle-3d-host" role="img" aria-label="مشهد القلعة ثلاثي الأبعاد"></div>
        <div id="castle-3d-fallback" class="castle-3d-fallback" hidden>
          <p>تعذّر تشغيل WebGL على هذا الجهاز. مشهد القلعة ثلاثي الأبعاد مطلوب للمعاينة.</p>
          <p class="muted">جرّب متصفحاً حديثاً مع تسريع رسومي مفعّل.</p>
        </div>
        <div class="castle-label-rail" id="castle-label-rail">${labels}</div>
      </div>
      <p class="castle-caption">${esc(state.playerName)} — ${esc(factionAr)} · قصر ${state.buildings.palace || 0}</p>
    </div>`;
}

export function disposeCastle3D() {
  if (!runtime) return;
  const { renderer, animationId, resizeObs, el, onPointer, onWheel } = runtime;
  if (animationId) cancelAnimationFrame(animationId);
  if (resizeObs) resizeObs.disconnect();
  if (el) {
    el.removeEventListener('pointerdown', onPointer);
    el.removeEventListener('pointermove', onPointer);
    el.removeEventListener('pointerup', onPointer);
    el.removeEventListener('pointercancel', onPointer);
    el.removeEventListener('wheel', onWheel);
  }
  renderer?.dispose();
  runtime.scene?.traverse((obj) => {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
      else obj.material.dispose();
    }
  });
  if (renderer?.domElement?.parentNode) renderer.domElement.remove();
  runtime = null;
}

/**
 * Mount WebGL city into hostEl. onSelect(buildingId) when user picks a mesh.
 */
export function mountCastle3D(hostEl, { tables, state, selectedBuildingId, onSelect }) {
  disposeCastle3D();
  if (!hostEl) return { ok: false, reason: 'no-host' };

  const fallback = document.getElementById('castle-3d-fallback');
  if (!webglAvailable()) {
    if (fallback) fallback.hidden = false;
    hostEl.innerHTML = '';
    return { ok: false, reason: 'webgl' };
  }

  const width = hostEl.clientWidth || 640;
  const height = Math.max(hostEl.clientHeight || 420, 360);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x7a90a0);
  scene.fog = new THREE.Fog(0xc4784a, 28, 48);

  const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 80);
  // Isometric-ish golden-hour vantage
  camera.position.set(14, 13, 14);
  camera.lookAt(0, 0.8, 0);

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  } catch (err) {
    if (fallback) fallback.hidden = false;
    return { ok: false, reason: 'webgl-create', error: err };
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  hostEl.innerHTML = '';
  hostEl.appendChild(renderer.domElement);
  renderer.domElement.className = 'castle-3d-canvas';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.touchAction = 'none';

  // Lighting — golden hour
  const hemi = new THREE.HemisphereLight(0xffe2b0, 0x6a7a50, 0.55);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffc078, 1.35);
  sun.position.set(-10, 14, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 45;
  sun.shadow.camera.left = -18;
  sun.shadow.camera.right = 18;
  sun.shadow.camera.top = 18;
  sun.shadow.camera.bottom = -18;
  sun.shadow.bias = -0.0008;
  sun.shadow.radius = 2.5;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0x9eb8d0, 0.35);
  fill.position.set(8, 6, -10);
  scene.add(fill);
  // Warm sky wash
  const amb = new THREE.AmbientLight(0xffd090, 0.22);
  scene.add(amb);

  buildGround(scene);

  const pickables = [];
  const buildingGroups = new Map();
  const layout = tables.world.castleInteriorLayout;
  const theme = state.factionId;

  for (const b of layout.buildings) {
    const builder = BUILDERS[b.id] || buildWarehouse;
    const meshGroup = b.id === 'palace' ? builder(theme) : builder();
    const { x, z } = gridToWorld(b.col, b.row, b.w, b.h);
    meshGroup.position.set(x, 0, z);
    const lvl = state.buildings[b.id] || 0;
    if (lvl <= 0) {
      meshGroup.traverse((obj) => {
        if (obj.isMesh && obj.material) {
          obj.material = obj.material.clone();
          obj.material.transparent = true;
          obj.material.opacity = 0.42;
          obj.material.depthWrite = false;
        }
      });
    }
    if (b.id === 'palace') meshGroup.scale.setScalar(1.15);
    meshGroup.userData.buildingId = b.id;
    meshGroup.traverse((obj) => {
      if (obj.isMesh) {
        obj.userData.buildingId = b.id;
        pickables.push(obj);
      }
    });
    const badge = buildLevelBadge();
    badge.position.set(0, b.id === 'palace' ? 5.2 : 2.4, 0);
    meshGroup.add(badge);
    scene.add(meshGroup);
    buildingGroups.set(b.id, meshGroup);
  }

  const selectRing = buildSelectionRing();
  scene.add(selectRing);

  function placeRing(id) {
    const g = buildingGroups.get(id);
    if (!g) {
      selectRing.visible = false;
      return;
    }
    selectRing.visible = true;
    selectRing.position.x = g.position.x;
    selectRing.position.z = g.position.z;
    const scale = id === 'palace' ? 1.6 : id === 'wall' ? 1.4 : 1;
    selectRing.scale.set(scale, scale, scale);
  }
  placeRing(selectedBuildingId);

  // Interaction: limited pan / zoom + raycast pick
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let panX = 0;
  let panZ = 0;
  let zoom = 1;
  const look = new THREE.Vector3(0, 0.8, 0);
  let dragging = false;
  let moved = false;
  let lastX = 0;
  let lastY = 0;
  let pointerId = null;

  function applyCamera() {
    const base = new THREE.Vector3(14 * zoom, 13 * zoom, 14 * zoom);
    camera.position.set(look.x + panX + base.x, base.y, look.z + panZ + base.z);
    camera.lookAt(look.x + panX, 0.8, look.z + panZ);
  }

  function pick(clientX, clientY) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(pickables, false);
    if (hits.length) {
      const id = hits[0].object.userData.buildingId;
      if (id && onSelect) onSelect(id);
      placeRing(id);
      return id;
    }
    return null;
  }

  function onPointer(e) {
    if (e.type === 'pointerdown') {
      dragging = true;
      moved = false;
      lastX = e.clientX;
      lastY = e.clientY;
      pointerId = e.pointerId;
      renderer.domElement.setPointerCapture?.(pointerId);
    } else if (e.type === 'pointermove' && dragging) {
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      if (Math.abs(dx) + Math.abs(dy) > 4) moved = true;
      // Pan in ground plane (limited)
      panX = THREE.MathUtils.clamp(panX - dx * 0.02 * zoom, -6, 6);
      panZ = THREE.MathUtils.clamp(panZ - dy * 0.02 * zoom, -6, 6);
      lastX = e.clientX;
      lastY = e.clientY;
      applyCamera();
    } else if (e.type === 'pointerup' || e.type === 'pointercancel') {
      if (dragging && !moved) pick(e.clientX, e.clientY);
      dragging = false;
      if (pointerId != null) renderer.domElement.releasePointerCapture?.(pointerId);
      pointerId = null;
    }
  }

  function onWheel(e) {
    e.preventDefault();
    zoom = THREE.MathUtils.clamp(zoom + e.deltaY * 0.0012, 0.65, 1.55);
    applyCamera();
  }

  renderer.domElement.addEventListener('pointerdown', onPointer);
  renderer.domElement.addEventListener('pointermove', onPointer);
  renderer.domElement.addEventListener('pointerup', onPointer);
  renderer.domElement.addEventListener('pointercancel', onPointer);
  renderer.domElement.addEventListener('wheel', onWheel, { passive: false });

  const resizeObs = new ResizeObserver(() => {
    const w = hostEl.clientWidth || width;
    const h = Math.max(hostEl.clientHeight || height, 320);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  });
  resizeObs.observe(hostEl);

  let animationId = 0;
  const clock = new THREE.Clock();
  function tick() {
    animationId = requestAnimationFrame(tick);
    const t = clock.getElapsedTime();
    // Subtle dome shimmer via sun intensity breathing
    sun.intensity = 1.28 + Math.sin(t * 0.6) * 0.08;
    selectRing.rotation.z = t * 0.5;
    renderer.render(scene, camera);
  }
  applyCamera();
  tick();

  runtime = {
    scene,
    camera,
    renderer,
    animationId,
    resizeObs,
    el: renderer.domElement,
    onPointer,
    onWheel,
    placeRing,
    buildingGroups,
  };

  return { ok: true, renderer, scene, camera };
}

export function setCastle3DSelection(buildingId) {
  if (runtime?.placeRing) runtime.placeRing(buildingId);
}
