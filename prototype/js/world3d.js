/**
 * عروش العصور — Three.js strategic world map (castles, fields, monsters).
 */
import * as THREE from '../vendor/three.module.js';
import { OrbitControls } from '../vendor/addons/controls/OrbitControls.js';
import {
  detectWebGL,
  addGoldenHourLights,
  makeCastleMesh,
  makeFieldMesh,
  makeMonsterMesh,
  makeFortMesh,
  makeNpcMesh,
  FACTION_TINT,
} from './meshes3d.js';

let runtime = null;

const MAP_W = 1000;
const MAP_H = 900;

function svgToWorld(x, y) {
  // Center map coords around origin; Y flips for Three
  return {
    x: (x - MAP_W / 2) * 0.042,
    z: (y - MAP_H / 2) * 0.042,
  };
}

function makeTerrain(scene) {
  const sand = new THREE.MeshStandardMaterial({ color: 0xd4a86a, roughness: 0.95 });
  const grass = new THREE.MeshStandardMaterial({ color: 0x5a8f4a, roughness: 0.9 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(48, 42, 24, 20), sand);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  // gentle height noise
  const pos = ground.geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    pos.setZ(i, Math.sin(x * 0.35) * 0.15 + Math.cos(y * 0.28) * 0.12);
  }
  pos.needsUpdate = true;
  ground.geometry.computeVertexNormals();
  scene.add(ground);

  [[-12, -8], [10, 6], [-6, 10], [14, -10]].forEach(([gx, gz]) => {
    const patch = new THREE.Mesh(new THREE.CircleGeometry(3.2, 20), grass);
    patch.rotation.x = -Math.PI / 2;
    patch.position.set(gx, 0.06, gz);
    patch.receiveShadow = true;
    scene.add(patch);
  });
}

function badgeTexture(text, color = '#e8c47a') {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 48;
  const ctx = c.getContext('2d');
  ctx.fillStyle = 'rgba(26,36,51,0.92)';
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(4, 6, 120, 36, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.font = 'bold 18px Cairo, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(text, 64, 30);
  return new THREE.CanvasTexture(c);
}

function nodeMesh(node, monstersById) {
  const kind = node.kind;
  if (kind === 'castle') {
    const style = node.owner === 'player' ? 'player'
      : node.owner === 'alliance_placeholder' ? 'ally'
        : (node.eraStyle || node.factionStyle || 'npc');
    return makeCastleMesh(style, node.tier || node.palaceLevel || 1);
  }
  if (kind === 'monster') {
    const m = monstersById[node.monsterId || node.id];
    return makeMonsterMesh(node.meshKey || m?.meshKey || 'beast_caravan');
  }
  if (kind === 'resource') {
    return makeFieldMesh(node.meshKey || node.resource || 'food');
  }
  if (kind === 'fort') return makeFortMesh();
  if (kind === 'ruin' || kind === 'outpost' || kind === 'npc_camp') {
    return makeNpcMesh(kind === 'ruin' ? 'ruin' : 'outpost');
  }
  return makeNpcMesh('outpost');
}

export function disposeWorld3D() {
  if (!runtime) return;
  cancelAnimationFrame(runtime.raf);
  runtime.ro?.disconnect();
  runtime.controls?.dispose();
  runtime.canvas?.removeEventListener('pointerdown', runtime.onPointer);
  runtime.renderer?.dispose();
  runtime.mount?.replaceChildren();
  runtime = null;
}

export function webglAvailable() {
  return detectWebGL();
}

/**
 * @param {HTMLElement} mount
 * @param {{ tables: any, state: any, selectedId: string, onSelect: (id:string)=>void }} opts
 */
export function mountWorld3D(mount, opts) {
  disposeWorld3D();
  const { tables, state, selectedId, onSelect } = opts;

  if (!detectWebGL()) {
    mount.innerHTML = `<div class="webgl-fallback" role="alert">
      <p><strong>تعذّر تشغيل WebGL</strong></p>
      <p class="muted">خريطة العالم ثلاثية الأبعاد تتطلب WebGL.</p>
    </div>`;
    return { ok: false };
  }

  mount.innerHTML = '';
  const canvas = document.createElement('canvas');
  canvas.className = 'world-webgl-canvas';
  canvas.setAttribute('aria-label', 'خريطة العالم ثلاثية الأبعاد');
  mount.appendChild(canvas);

  const brand = document.createElement('div');
  brand.className = 'castle-brand castle-3d-brand';
  brand.innerHTML = '<span>عروش العصور</span> · خريطة العالم · 3D';
  mount.appendChild(brand);

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  } catch (e) {
    mount.innerHTML = `<div class="webgl-fallback"><p><strong>فشل WebGL</strong></p><p class="muted">${String(e.message || e)}</p></div>`;
    return { ok: false };
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xb86840);
  scene.fog = new THREE.Fog(0xb86840, 35, 70);

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);
  camera.position.set(18, 22, 22);
  camera.lookAt(0, 0, 0);

  const lights = addGoldenHourLights(scene, { castShadow: true, scale: 1.4 });
  lights.sun.shadow.camera.left = -30;
  lights.sun.shadow.camera.right = 30;
  lights.sun.shadow.camera.top = 30;
  lights.sun.shadow.camera.bottom = -30;
  lights.sun.shadow.camera.far = 80;
  lights.sun.shadow.mapSize.set(1024, 1024);

  makeTerrain(scene);

  const monstersById = {};
  for (const m of tables.monsters?.monsters || []) monstersById[m.id] = m;

  const pickables = [];
  const markers = new Map();

  for (const node of tables.world.nodes || []) {
    const mesh = nodeMesh(node, monstersById);
    const pos = svgToWorld(node.x, node.y);
    mesh.position.set(pos.x, 0, pos.z);
    // scale camps smaller
    if (node.kind === 'npc_camp') mesh.scale.setScalar(0.55);
    if (node.kind === 'resource') mesh.scale.setScalar(0.95);
    if (node.kind === 'monster') {
      const sz = monstersById[node.monsterId || node.id]?.sizeHint;
      mesh.scale.setScalar(sz === 'large' ? 1.2 : sz === 'tall' ? 1.05 : sz === 'small' ? 0.75 : 0.9);
    }
    mesh.userData.nodeId = node.id;
    mesh.traverse((c) => {
      if (c.isMesh) {
        c.castShadow = true;
        c.receiveShadow = true;
      }
    });
    scene.add(mesh);
    pickables.push(mesh);

    let label = '';
    let color = '#e8c47a';
    if (node.kind === 'castle') {
      label = node.owner === 'player' ? `قصر ${node.palaceLevel || state.buildings?.palace || 1}`
        : `م${node.tier || node.palaceLevel || 1}`;
      color = node.owner === 'player' ? '#e8c47a' : node.owner === 'alliance_placeholder' ? '#6b8cae' : '#c4a35a';
    } else if (node.kind === 'monster') {
      const rec = monstersById[node.monsterId || node.id]?.recommendedPower;
      label = rec ? `≥${rec}` : `T${node.tier || 1}`;
      color = '#c45c4a';
    } else if (node.kind === 'resource') {
      label = `ح${node.level || 1}`;
      color = '#6a9b6e';
    } else if (node.tier) {
      label = `T${node.tier}`;
      color = '#b87333';
    }
    if (label) {
      const tex = badgeTexture(label, color);
      const badge = new THREE.Mesh(
        new THREE.PlaneGeometry(1.6, 0.6),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }),
      );
      badge.position.set(pos.x, node.kind === 'castle' ? 3.2 : 2.2, pos.z);
      badge.userData.billboard = true;
      scene.add(badge);
      markers.set(node.id, { mesh, badge });
    } else {
      markers.set(node.id, { mesh, badge: null });
    }
  }

  // March path lines
  const marchGroup = new THREE.Group();
  scene.add(marchGroup);

  function redrawMarches() {
    while (marchGroup.children.length) {
      const c = marchGroup.children.pop();
      c.geometry?.dispose?.();
    }
    for (const m of state.marches || []) {
      if (m.status === 'done') continue;
      const from = svgToWorld(m.from.x, m.from.y);
      const to = svgToWorld(m.to.x, m.to.y);
      const pts = [new THREE.Vector3(from.x, 0.35, from.z), new THREE.Vector3(to.x, 0.35, to.z)];
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const line = new THREE.Line(geo, new THREE.LineBasicMaterial({
        color: m.type === 'gather' ? 0x6a9b6e : 0xc45c4a,
        linewidth: 2,
      }));
      marchGroup.add(line);
      const marker = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0xe8c47a, emissive: 0x664400, emissiveIntensity: 0.3 }),
      );
      const t = Math.min(1, Math.max(0, (Date.now() - m.startedAt) / Math.max(1, (m.arrivesAt || m.returnsAt) - m.startedAt)));
      marker.position.set(
        from.x + (to.x - from.x) * t,
        0.5,
        from.z + (to.z - from.z) * t,
      );
      marchGroup.add(marker);
    }
  }
  redrawMarches();

  const selRing = new THREE.Mesh(
    new THREE.RingGeometry(1.2, 1.4, 32),
    new THREE.MeshBasicMaterial({ color: 0xe8c47a, transparent: true, opacity: 0.9, side: THREE.DoubleSide }),
  );
  selRing.rotation.x = -Math.PI / 2;
  selRing.position.y = 0.1;
  scene.add(selRing);

  function focusSelection(id) {
    const m = markers.get(id);
    if (!m) return;
    selRing.position.x = m.mesh.position.x;
    selRing.position.z = m.mesh.position.z;
  }
  focusSelection(selectedId || 'castle_player');

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minPolarAngle = Math.PI * 0.18;
  controls.maxPolarAngle = Math.PI * 0.42;
  controls.minDistance = 12;
  controls.maxDistance = 48;
  controls.target.set(0, 0.4, 0);
  controls.update();

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  function resize() {
    const w = mount.clientWidth || 360;
    const h = Math.max(280, mount.clientHeight || Math.min(window.innerHeight * 0.48, 520));
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
    while (obj && !obj.userData.nodeId) obj = obj.parent;
    if (obj?.userData.nodeId) {
      focusSelection(obj.userData.nodeId);
      onSelect?.(obj.userData.nodeId);
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
    lights.sun.intensity = 1.45 + Math.sin(performance.now() * 0.0008) * 0.08;
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
    redrawMarches,
  };
  tick();

  return {
    ok: true,
    setSelected(id) { focusSelection(id); },
    redrawMarches,
    resize,
  };
}
