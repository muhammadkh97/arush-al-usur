/**
 * عروش العصور — Pillar 1: Three.js / WebGL isometric castle (original procedural art).
 */
import * as THREE from '../vendor/three.module.js';
import { OrbitControls } from '../vendor/addons/controls/OrbitControls.js';

let runtime = null;

const CELL = 3.2;
const MAT = {};

function mats() {
  if (MAT.sand) return MAT;
  MAT.sand = new THREE.MeshStandardMaterial({ color: 0xd4a86a, roughness: 0.92, metalness: 0.05 });
  MAT.grass = new THREE.MeshStandardMaterial({ color: 0x4a8a3a, roughness: 0.85 });
  MAT.stone = new THREE.MeshStandardMaterial({ color: 0xe8d4b0, roughness: 0.75, metalness: 0.08 });
  MAT.stoneDark = new THREE.MeshStandardMaterial({ color: 0x8a7048, roughness: 0.8 });
  MAT.gold = new THREE.MeshStandardMaterial({ color: 0xe0b04a, roughness: 0.35, metalness: 0.75 });
  MAT.goldBright = new THREE.MeshStandardMaterial({ color: 0xffe9a8, roughness: 0.28, metalness: 0.85 });
  MAT.roof = new THREE.MeshStandardMaterial({ color: 0x3a6a90, roughness: 0.55, metalness: 0.2 });
  MAT.wood = new THREE.MeshStandardMaterial({ color: 0x6b5340, roughness: 0.85 });
  MAT.water = new THREE.MeshStandardMaterial({
    color: 0x3a8aaa, roughness: 0.2, metalness: 0.35, transparent: true, opacity: 0.82,
  });
  MAT.crop = new THREE.MeshStandardMaterial({ color: 0x5a9b4a, roughness: 0.9 });
  MAT.red = new THREE.MeshStandardMaterial({ color: 0xc45c4a, roughness: 0.55 });
  MAT.white = new THREE.MeshStandardMaterial({ color: 0xf3e6d0, roughness: 0.6 });
  MAT.shadow = new THREE.MeshBasicMaterial({ color: 0x2a1a10, transparent: true, opacity: 0.22 });
  return MAT;
}

function box(w, h, d, material, y = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.y = y + h / 2;
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function cyl(rTop, rBot, h, material, y = 0, seg = 12) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg), material);
  m.position.y = y + h / 2;
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function sphere(r, material, y = 0, seg = 16) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.max(8, seg / 2), 0, Math.PI * 2, 0, Math.PI / 2), material);
  m.position.y = y;
  m.castShadow = true;
  return m;
}

function palm(x, z, s = 1) {
  const g = new THREE.Group();
  const trunk = cyl(0.08 * s, 0.12 * s, 1.4 * s, mats().wood, 0, 6);
  g.add(trunk);
  for (let i = 0; i < 5; i++) {
    const leaf = box(0.9 * s, 0.06 * s, 0.22 * s, mats().grass, 1.35 * s);
    leaf.position.x = Math.cos((i / 5) * Math.PI * 2) * 0.25 * s;
    leaf.position.z = Math.sin((i / 5) * Math.PI * 2) * 0.25 * s;
    leaf.rotation.z = Math.cos((i / 5) * Math.PI * 2) * 0.5;
    leaf.rotation.x = Math.sin((i / 5) * Math.PI * 2) * 0.5;
    g.add(leaf);
  }
  g.position.set(x, 0, z);
  return g;
}

function makePalace(M) {
  const g = new THREE.Group();
  g.add(box(5.0, 0.4, 5.0, M.stoneDark, 0));
  g.add(box(4.0, 2.05, 4.0, M.stone, 0.4));
  // Hero golden dome — larger hemisphere + drum
  const drum = cyl(1.55, 1.65, 0.55, M.stone, 2.45, 20);
  g.add(drum);
  const dome = sphere(1.7, M.gold, 2.95, 24);
  g.add(dome);
  const tip = cyl(0.06, 0.16, 0.7, M.goldBright, 4.55, 8);
  g.add(tip);
  const flag = box(0.65, 0.32, 0.05, M.red, 5.2);
  flag.position.x = 0.32;
  g.add(flag);
  // Corner minarets
  [[-2.05, -2.05], [2.05, -2.05], [-2.05, 2.05], [2.05, 2.05]].forEach(([x, z]) => {
    const tower = cyl(0.32, 0.38, 3.8, M.stone, 0, 12);
    tower.position.set(x, 0, z);
    g.add(tower);
    const balcony = cyl(0.42, 0.42, 0.18, M.stoneDark, 3.5, 12);
    balcony.position.set(x, 0, z);
    g.add(balcony);
    const cap = sphere(0.4, M.gold, 3.85, 14);
    cap.position.set(x, 0, z);
    g.add(cap);
    const spike = cyl(0.04, 0.1, 0.45, M.goldBright, 4.55, 6);
    spike.position.set(x, 0, z);
    g.add(spike);
  });
  // Inner columns under dome
  [[-1.1, -1.1], [1.1, -1.1], [-1.1, 1.1], [1.1, 1.1]].forEach(([x, z]) => {
    const m = cyl(0.2, 0.22, 2.6, M.stoneDark, 0.4, 8);
    m.position.set(x, 0, z);
    g.add(m);
    const c = sphere(0.24, M.goldBright, 3.0, 10);
    c.position.set(x, 0, z);
    g.add(c);
  });
  const ring = new THREE.Mesh(new THREE.RingGeometry(2.9, 3.7, 36), M.water);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.06;
  ring.receiveShadow = true;
  g.add(ring);
  return g;
}

function makeFarm(M) {
  const g = new THREE.Group();
  const field = box(2.6, 0.12, 2.6, M.crop, 0);
  g.add(field);
  for (let i = -1; i <= 1; i++) {
    const row = box(2.4, 0.08, 0.35, M.grass, 0.12);
    row.position.z = i * 0.7;
    g.add(row);
  }
  const shed = box(0.9, 0.7, 0.7, M.stone, 0.12);
  shed.position.set(0.7, 0, 0.7);
  g.add(shed);
  const roof = box(1.05, 0.12, 0.85, M.wood, 0.82);
  roof.position.set(0.7, 0, 0.7);
  g.add(roof);
  return g;
}

function makeBarracks(M) {
  const g = new THREE.Group();
  g.add(box(2.4, 1.2, 1.8, M.stone, 0));
  const roof = box(2.6, 0.2, 2.0, M.wood, 1.2);
  g.add(roof);
  for (let i = -1; i <= 1; i++) {
    const door = box(0.35, 0.55, 0.08, M.wood, 0.15);
    door.position.set(i * 0.55, 0, 0.92);
    g.add(door);
  }
  return g;
}

function makeArchery(M) {
  const g = new THREE.Group();
  g.add(box(1.6, 1.0, 1.6, M.stone, 0));
  const tower = box(0.9, 1.6, 0.9, M.stone, 1.0);
  g.add(tower);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.75, 0.7, 4), M.roof);
  roof.position.y = 2.95;
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  g.add(roof);
  return g;
}

function makeWarehouse(M) {
  const g = new THREE.Group();
  g.add(box(2.5, 1.3, 2.0, M.stone, 0));
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.9, 0.9, 4), M.wood);
  roof.position.y = 1.75;
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  g.add(roof);
  const crate = box(0.5, 0.4, 0.5, M.gold, 0.05);
  crate.position.set(-1.1, 0, 0.9);
  g.add(crate);
  return g;
}

function makeHospital(M) {
  const g = new THREE.Group();
  g.add(box(2.2, 1.15, 1.9, M.stone, 0));
  g.add(box(2.4, 0.18, 2.1, M.white, 1.15));
  const crossV = box(0.18, 0.7, 0.08, M.red, 1.4);
  const crossH = box(0.55, 0.18, 0.08, M.red, 1.55);
  crossV.position.z = 0.96;
  crossH.position.z = 0.96;
  g.add(crossV, crossH);
  return g;
}

function makeEmbassy(M) {
  const g = new THREE.Group();
  g.add(box(2.0, 1.1, 1.8, M.stone, 0));
  // striped awning
  for (let i = 0; i < 5; i++) {
    const stripe = box(0.38, 0.08, 1.2, i % 2 ? M.red : M.white, 1.15);
    stripe.position.set(-0.76 + i * 0.38, 0, 0.55);
    g.add(stripe);
  }
  const pole = cyl(0.04, 0.04, 1.0, M.wood, 1.2, 6);
  pole.position.set(0.7, 0, -0.6);
  g.add(pole);
  const flag = box(0.45, 0.25, 0.04, M.gold, 2.05);
  flag.position.set(0.95, 0, -0.6);
  g.add(flag);
  return g;
}

function makeAcademy(M) {
  const g = new THREE.Group();
  g.add(box(2.0, 1.2, 2.0, M.stone, 0));
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.6, 1.2, 3), M.wood);
  roof.position.y = 1.85;
  roof.castShadow = true;
  g.add(roof);
  const gem = cyl(0.15, 0.15, 0.25, M.gold, 2.4, 8);
  g.add(gem);
  return g;
}

function makeShrine(M) {
  const g = new THREE.Group();
  const obelisk = new THREE.Mesh(new THREE.ConeGeometry(0.55, 2.8, 4), M.gold);
  obelisk.position.y = 1.4;
  obelisk.castShadow = true;
  g.add(obelisk);
  g.add(box(1.4, 0.25, 1.4, M.stoneDark, 0));
  return g;
}

function makeWall(M) {
  const g = new THREE.Group();
  g.add(box(3.6, 1.1, 0.7, M.stone, 0));
  for (let i = -1.5; i <= 1.5; i += 0.75) {
    const merlon = box(0.35, 0.35, 0.75, M.stoneDark, 1.1);
    merlon.position.x = i;
    g.add(merlon);
  }
  const gate = box(0.7, 0.85, 0.2, M.wood, 0.05);
  gate.position.z = 0.35;
  g.add(gate);
  return g;
}

function makeLumber(M) {
  const g = new THREE.Group();
  const trunk = cyl(0.2, 0.25, 1.5, M.wood, 0, 8);
  g.add(trunk);
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(1.1, 12, 10), M.grass);
  canopy.position.y = 2.0;
  canopy.castShadow = true;
  g.add(canopy);
  const log = cyl(0.15, 0.15, 1.2, M.wood, 0.05, 8);
  log.rotation.z = Math.PI / 2;
  log.position.set(0.9, 0, 0.5);
  g.add(log);
  return g;
}

function makeQuarry(M) {
  const g = new THREE.Group();
  const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(1.0, 0), M.stoneDark);
  rock.position.y = 0.7;
  rock.castShadow = true;
  g.add(rock);
  const rock2 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.55, 0), mats().stone);
  rock2.position.set(0.8, 0.4, 0.4);
  rock2.castShadow = true;
  g.add(rock2);
  return g;
}

function makeGoldmine(M) {
  const g = new THREE.Group();
  g.add(box(2.0, 0.9, 1.6, M.wood, 0));
  const mouth = box(0.8, 0.7, 0.2, new THREE.MeshStandardMaterial({ color: 0x1a1010 }), 0.1);
  mouth.position.z = 0.85;
  g.add(mouth);
  const ore = cyl(0.35, 0.35, 0.25, M.goldBright, 0.95, 10);
  g.add(ore);
  return g;
}

const BUILDERS = {
  palace: makePalace,
  farm: makeFarm,
  barracks: makeBarracks,
  archery: makeArchery,
  warehouse: makeWarehouse,
  hospital: makeHospital,
  embassy: makeEmbassy,
  academy: makeAcademy,
  shrine: makeShrine,
  wall: makeWall,
  lumber: makeLumber,
  quarry: makeQuarry,
  goldmine: makeGoldmine,
};

function gridToWorld(col, row, w, h, cols, rows) {
  const cx = col + w / 2 - cols / 2;
  const cz = row + h / 2 - rows / 2;
  return { x: cx * CELL, z: cz * CELL };
}

function detectWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl') || c.getContext('experimental-webgl'));
  } catch {
    return false;
  }
}

export function webglAvailable() {
  return detectWebGL();
}

export function disposeCastle3D() {
  if (!runtime) return;
  cancelAnimationFrame(runtime.raf);
  runtime.ro?.disconnect();
  runtime.controls?.dispose();
  runtime.canvas?.removeEventListener('pointerdown', runtime.onPointer);
  runtime.renderer?.dispose();
  runtime.mount?.replaceChildren();
  runtime = null;
}

/**
 * @param {HTMLElement} mount
 * @param {{ tables: any, state: any, selectedId: string, onSelect: (id:string)=>void, factionLabel?: string }} opts
 */
export function mountCastle3D(mount, opts) {
  disposeCastle3D();
  const { tables, state, selectedId, onSelect } = opts;
  const M = mats();

  if (!detectWebGL()) {
    mount.innerHTML = `<div class="webgl-fallback" role="alert">
      <p><strong>تعذّر تشغيل WebGL</strong></p>
      <p class="muted">مشهد القلعة ثلاثي الأبعاد يتطلب WebGL. حدّث المتصفح أو فعّل تسريع الرسوم.</p>
    </div>`;
    return { ok: false };
  }

  mount.innerHTML = '';
  const canvas = document.createElement('canvas');
  canvas.className = 'castle-webgl-canvas';
  canvas.setAttribute('aria-label', 'مشهد القلعة ثلاثي الأبعاد');
  mount.appendChild(canvas);

  const brand = document.createElement('div');
  brand.className = 'castle-brand castle-3d-brand';
  brand.innerHTML = '<span>عروش العصور</span> · داخل القلعة · 3D';
  mount.appendChild(brand);

  const caption = document.createElement('p');
  caption.className = 'castle-caption';
  caption.textContent = `${state.playerName || ''} — قصر ${state.buildings?.palace || 0}`;
  mount.appendChild(caption);

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  } catch (e) {
    mount.innerHTML = `<div class="webgl-fallback" role="alert"><p><strong>فشل إنشاء WebGL</strong></p><p class="muted">${String(e.message || e)}</p></div>`;
    return { ok: false };
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xc4784a);
  scene.fog = new THREE.Fog(0xc4784a, 28, 55);

  const layout = tables.world.castleInteriorLayout;
  const cols = layout.grid.cols;
  const rows = layout.grid.rows;

  const aspect = 1;
  const camera = new THREE.PerspectiveCamera(36, aspect, 0.1, 120);
  camera.position.set(16, 14.5, 16);
  camera.lookAt(0, 1.2, 0);

  const hemi = new THREE.HemisphereLight(0xb8d0e8, 0x8a6238, 0.55);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffd090, 1.65);
  sun.position.set(-12, 14, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 50;
  sun.shadow.camera.left = -18;
  sun.shadow.camera.right = 18;
  sun.shadow.camera.top = 18;
  sun.shadow.camera.bottom = -18;
  sun.shadow.bias = -0.0008;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0x88aacc, 0.35);
  fill.position.set(8, 6, -10);
  scene.add(fill);

  // Ground
  const groundSize = Math.max(cols, rows) * CELL + 6;
  const ground = new THREE.Mesh(new THREE.CircleGeometry(groundSize * 0.62, 48), M.sand);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Grass patches
  [[-6, -4], [7, 3], [-3, 7], [5, -6]].forEach(([gx, gz]) => {
    const patch = new THREE.Mesh(new THREE.CircleGeometry(2.2, 16), M.grass);
    patch.rotation.x = -Math.PI / 2;
    patch.position.set(gx, 0.03, gz);
    patch.receiveShadow = true;
    scene.add(patch);
  });

  // Palms
  [[-8, -5], [-9, -3], [8, 4], [9, 2], [-5, 8], [4, 9], [7, -7]].forEach(([px, pz], i) => {
    scene.add(palm(px, pz, 0.85 + (i % 3) * 0.1));
  });

  // Path rings toward palace
  const pathMat = new THREE.MeshStandardMaterial({ color: 0xc4a06a, roughness: 0.9 });
  const path = new THREE.Mesh(new THREE.RingGeometry(1.2, 1.7, 32), pathMat);
  path.rotation.x = -Math.PI / 2;
  path.position.y = 0.04;
  scene.add(path);

  const pickables = [];
  const markers = new Map();

  layout.buildings.forEach((b) => {
    const lvl = state.buildings[b.id] || 0;
    const built = lvl > 0;
    const builder = BUILDERS[b.id] || makeWarehouse;
    const mesh = builder(M);
    mesh.traverse((c) => {
      if (c.isMesh) {
        c.castShadow = true;
        c.receiveShadow = true;
        if (!built) {
          c.material = c.material.clone();
          c.material.transparent = true;
          c.material.opacity = 0.4;
          c.material.color = new THREE.Color(0x9aa0a8);
        }
      }
    });
    const pos = gridToWorld(b.col, b.row, b.w, b.h, cols, rows);
    const scale = b.id === 'palace' ? 1.35 : b.w > 1 ? 1.05 : 0.95;
    mesh.scale.setScalar(scale);
    mesh.position.set(pos.x, 0, pos.z);
    mesh.userData.buildingId = b.id;
    scene.add(mesh);
    pickables.push(mesh);

    // Level badge (sprite-like plane)
    const canvas2 = document.createElement('canvas');
    canvas2.width = 128;
    canvas2.height = 64;
    const ctx = canvas2.getContext('2d');
    ctx.fillStyle = 'rgba(26,36,51,0.92)';
    ctx.strokeStyle = '#e8c47a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(4, 8, 120, 48, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#e8c47a';
    ctx.font = 'bold 28px Cairo, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(built ? `م${lvl}` : '—', 64, 42);
    const tex = new THREE.CanvasTexture(canvas2);
    const badge = new THREE.Mesh(
      new THREE.PlaneGeometry(1.4, 0.7),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }),
    );
    badge.position.set(pos.x, (b.id === 'palace' ? 6.4 : 2.8), pos.z);
    badge.userData.billboard = true;
    scene.add(badge);
    markers.set(b.id, { mesh, badge });
  });

  // Selection ring
  const selRing = new THREE.Mesh(
    new THREE.RingGeometry(1.5, 1.75, 32),
    new THREE.MeshBasicMaterial({ color: 0xe8c47a, transparent: true, opacity: 0.85, side: THREE.DoubleSide }),
  );
  selRing.rotation.x = -Math.PI / 2;
  selRing.position.y = 0.08;
  scene.add(selRing);

  function focusSelection(id) {
    const m = markers.get(id);
    if (!m) return;
    selRing.position.x = m.mesh.position.x;
    selRing.position.z = m.mesh.position.z;
    const r = id === 'palace' ? 2.4 : 1.6;
    selRing.geometry.dispose();
    selRing.geometry = new THREE.RingGeometry(r, r + 0.25, 32);
  }
  focusSelection(selectedId || 'palace');

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minPolarAngle = Math.PI * 0.22;
  controls.maxPolarAngle = Math.PI * 0.42;
  controls.minDistance = 12;
  controls.maxDistance = 32;
  controls.target.set(0, 0.6, 0);
  controls.enablePan = true;
  controls.panSpeed = 0.6;
  controls.rotateSpeed = 0.55;
  controls.zoomSpeed = 0.7;
  controls.update();

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  function resize() {
    const w = mount.clientWidth || 360;
    const h = Math.max(280, mount.clientHeight || Math.min(window.innerHeight * 0.48, 480));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();

  function onPointer(ev) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(pickables, true);
    if (!hits.length) return;
    let obj = hits[0].object;
    while (obj && !obj.userData.buildingId) obj = obj.parent;
    if (obj?.userData.buildingId) {
      focusSelection(obj.userData.buildingId);
      onSelect?.(obj.userData.buildingId);
    }
  }
  canvas.addEventListener('pointerdown', onPointer);

  const ro = new ResizeObserver(() => resize());
  ro.observe(mount);

  function tick() {
    runtime.raf = requestAnimationFrame(tick);
    controls.update();
    scene.traverse((o) => {
      if (o.userData.billboard) o.quaternion.copy(camera.quaternion);
    });
    // gentle flag/sun pulse
    sun.intensity = 1.55 + Math.sin(performance.now() * 0.001) * 0.08;
    renderer.render(scene, camera);
  }

  runtime = {
    raf: 0,
    renderer,
    controls,
    canvas,
    mount,
    onPointer,
    ro,
    setSelected: focusSelection,
  };
  tick();

  return {
    ok: true,
    setSelected(id) {
      focusSelection(id);
    },
    resize,
  };
}
