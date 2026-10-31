/**
 * Small rotating Three.js preview mounts (units / heroes / monsters).
 */
import * as THREE from '../vendor/three.module.js';
import {
  detectWebGL,
  addGoldenHourLights,
  makeUnitMesh,
  makeHeroMesh,
  makeMonsterMesh,
} from './meshes3d.js';

const runtimes = new Map();

function disposeOne(id) {
  const rt = runtimes.get(id);
  if (!rt) return;
  cancelAnimationFrame(rt.raf);
  rt.renderer?.dispose();
  rt.mount?.replaceChildren();
  runtimes.delete(id);
}

export function disposePreview(id) {
  if (id) disposeOne(id);
  else [...runtimes.keys()].forEach(disposeOne);
}

/**
 * @param {HTMLElement} mount
 * @param {{ kind: 'unit'|'hero'|'monster', meshKey: string, factionId?: string, id?: string, bg?: number }} opts
 */
export function mountPreview3D(mount, opts) {
  const id = opts.id || `pv_${Math.random().toString(36).slice(2, 8)}`;
  disposeOne(id);

  if (!detectWebGL()) {
    mount.innerHTML = `<div class="preview3d-fallback muted">معاينة 3D غير متاحة</div>`;
    return { ok: false, id };
  }

  mount.innerHTML = '';
  mount.classList.add('preview3d-host');
  const canvas = document.createElement('canvas');
  canvas.className = 'preview3d-canvas';
  mount.appendChild(canvas);

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) {
    mount.innerHTML = `<div class="preview3d-fallback muted">فشل WebGL</div>`;
    return { ok: false, id };
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.setClearColor(opts.bg ?? 0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 40);
  const camY = opts.kind === 'hero' ? 2.4 : 2.1;
  const lookY = opts.kind === 'hero' ? 0.95 : 0.7;
  camera.position.set(2.6, camY, 3.0);
  camera.lookAt(0, lookY, 0);

  addGoldenHourLights(scene, { castShadow: true, scale: 0.4 });
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(1.4, 24),
    new THREE.MeshStandardMaterial({ color: 0xc4a06a, roughness: 0.92 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  let subject;
  if (opts.kind === 'hero') subject = makeHeroMesh(opts.meshKey, opts.factionId);
  else if (opts.kind === 'monster') subject = makeMonsterMesh(opts.meshKey);
  else subject = makeUnitMesh(opts.meshKey || 'infantry', opts.factionId);
  scene.add(subject);

  function resize() {
    const w = mount.clientWidth || 160;
    const h = mount.clientHeight || 160;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();

  const rt = { raf: 0, renderer, mount, subject };
  function tick() {
    rt.raf = requestAnimationFrame(tick);
    subject.rotation.y += 0.012;
    renderer.render(scene, camera);
  }
  runtimes.set(id, rt);
  tick();

  const ro = new ResizeObserver(() => resize());
  ro.observe(mount);
  rt.ro = ro;

  return { ok: true, id, resize };
}
