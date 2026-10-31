/**
 * عروش العصور — procedural original 3D meshes (units, heroes, castles, fields, monsters).
 * Shared by castle preview, hero screen, and world map.
 */
import * as THREE from '../vendor/three.module.js';

const CACHE = {};

function mat(key, opts) {
  if (CACHE[key]) return CACHE[key];
  CACHE[key] = new THREE.MeshStandardMaterial(opts);
  return CACHE[key];
}

function box(w, h, d, material, y = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.y = y + h / 2;
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function cyl(rTop, rBot, h, material, y = 0, seg = 10) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg), material);
  m.position.y = y + h / 2;
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function sphere(r, material, y = 0, seg = 12) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.max(6, seg / 2)), material);
  m.position.y = y;
  m.castShadow = true;
  return m;
}

function addShadowDisc(g, r = 0.55) {
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(r, 16),
    mat('shadowDisc', { color: 0x1a1010, transparent: true, opacity: 0.28, depthWrite: false }),
  );
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = 0.02;
  g.add(disc);
}

/** Faction accent colors */
export const FACTION_TINT = {
  jazira: 0xc4a35a,
  rome: 0xb87333,
  persia: 0x6a9b6e,
  player: 0xe8c47a,
  ally: 0x6b8cae,
  npc: 0xa67c52,
};

export function makeUnitMesh(meshKey, factionId = 'jazira') {
  const accent = FACTION_TINT[factionId] || 0xc4a35a;
  const cloth = mat(`cloth_${factionId}`, { color: accent, roughness: 0.7, metalness: 0.1 });
  const skin = mat('skin', { color: 0xd4a574, roughness: 0.85 });
  const metal = mat('metal', { color: 0xb0b8c0, roughness: 0.35, metalness: 0.7 });
  const wood = mat('woodU', { color: 0x6b5340, roughness: 0.85 });
  const dark = mat('darkU', { color: 0x2a1a10, roughness: 0.8 });
  const g = new THREE.Group();
  addShadowDisc(g, 0.4);

  if (meshKey === 'archer' || meshKey === 'special_mounted') {
    // body + bow
    g.add(box(0.35, 0.55, 0.22, cloth, 0.35));
    g.add(sphere(0.18, skin, 1.05, 10));
    const bow = cyl(0.03, 0.03, 0.85, wood, 0.4, 6);
    bow.rotation.z = Math.PI / 2;
    bow.position.set(0.32, 0, 0);
    g.add(bow);
    if (meshKey === 'special_mounted') {
      const mount = box(0.7, 0.35, 0.28, mat('mount', { color: 0x5a4030, roughness: 0.8 }), 0.05);
      mount.position.z = -0.05;
      g.add(mount);
      g.scale.setScalar(1.05);
    }
    return g;
  }

  if (meshKey === 'special_siege') {
    g.add(box(0.4, 0.5, 0.28, cloth, 0.3));
    g.add(sphere(0.16, skin, 0.95, 10));
    const frame = box(0.9, 0.12, 0.5, wood, 0.05);
    frame.position.z = 0.35;
    g.add(frame);
    const arm = box(0.12, 0.55, 0.12, wood, 0.2);
    arm.position.set(0, 0, 0.35);
    g.add(arm);
    const stone = sphere(0.1, mat('rock', { color: 0x8a8a90, roughness: 0.9 }), 0.75, 8);
    stone.position.z = 0.35;
    g.add(stone);
    return g;
  }

  if (meshKey === 'special_legion' || meshKey === 'heavy') {
    g.add(box(0.42, 0.6, 0.28, metal, 0.3));
    g.add(sphere(0.17, skin, 1.05, 10));
    const shield = box(0.08, 0.55, 0.4, mat('shield', { color: 0x8b1a1a, roughness: 0.5, metalness: 0.3 }), 0.35);
    shield.position.x = -0.28;
    g.add(shield);
    const spear = cyl(0.025, 0.025, 1.1, wood, 0.2, 6);
    spear.position.x = 0.28;
    g.add(spear);
    if (meshKey === 'heavy') g.scale.setScalar(1.12);
    return g;
  }

  // default infantry
  g.add(box(0.36, 0.55, 0.24, cloth, 0.32));
  g.add(sphere(0.17, skin, 1.0, 10));
  const sword = box(0.08, 0.45, 0.06, metal, 0.4);
  sword.position.x = 0.28;
  g.add(sword);
  const helm = box(0.28, 0.12, 0.28, dark, 1.12);
  g.add(helm);
  return g;
}

export function makeHeroMesh(meshKey, factionId = 'jazira') {
  const g = new THREE.Group();
  const accent = FACTION_TINT[factionId] || 0xc4a35a;
  const cloth = mat(`heroCloth_${meshKey}`, { color: accent, roughness: 0.55, metalness: 0.15 });
  const skin = mat('heroSkin', { color: 0xd4a574, roughness: 0.8 });
  const gold = mat('goldH', { color: 0xe0b04a, roughness: 0.28, metalness: 0.85 });
  const metal = mat('heroMetal', { color: 0xc0c8d0, roughness: 0.35, metalness: 0.7 });
  addShadowDisc(g, 0.7);
  // Legs + torso
  g.add(box(0.28, 0.45, 0.22, cloth, 0.05));
  g.add(box(0.55, 0.75, 0.32, cloth, 0.5));
  // Head
  g.add(sphere(0.22, skin, 1.45, 12));
  // Cape
  const cape = box(0.7, 0.95, 0.1, mat(`cape_${meshKey}`, {
    color: meshKey === 'hero_legion' ? 0xb22222 : meshKey === 'hero_nowruz' ? 0x2e8b57 : 0xa67c2a,
    roughness: 0.65,
  }), 0.45);
  cape.position.z = -0.28;
  g.add(cape);
  // Crown / helm
  g.add(cyl(0.14, 0.2, 0.22, gold, 1.6, 10));
  const spike = cyl(0.03, 0.08, 0.28, gold, 1.82, 6);
  g.add(spike);
  // Weapon
  const blade = box(0.08, 0.85, 0.06, metal, 0.55);
  blade.position.x = 0.42;
  g.add(blade);
  if (meshKey === 'hero_nowruz') {
    const mount = box(0.95, 0.4, 0.35, mat('heroMount', { color: 0x5a4030, roughness: 0.8 }), 0.05);
    mount.position.z = 0.05;
    g.add(mount);
  }
  if (meshKey === 'hero_legion') {
    const shield = box(0.1, 0.7, 0.5, mat('heroShield', { color: 0x8b1a1a, roughness: 0.45, metalness: 0.35 }), 0.55);
    shield.position.x = -0.4;
    g.add(shield);
  }
  g.scale.setScalar(1.15);
  return g;
}

export function makeMonsterMesh(meshKey) {
  const g = new THREE.Group();
  const ink = mat('mInk', { color: 0x3a1810, roughness: 0.7 });
  const flesh = mat('mFlesh', { color: 0xc45c4a, roughness: 0.55 });
  const glow = mat('mGlow', { color: 0x88c0d0, roughness: 0.25, metalness: 0.4, transparent: true, opacity: 0.85 });
  const sand = mat('mSand', { color: 0xb88850, roughness: 0.7 });

  if (meshKey === 'beast_caravan') {
    addShadowDisc(g, 0.55);
    g.add(sphere(0.45, flesh, 0.45, 12));
    g.add(sphere(0.28, flesh, 0.85, 10));
    [[-0.35, 0.2], [0.35, 0.2], [-0.25, -0.25], [0.25, -0.25]].forEach(([x, z]) => {
      const leg = cyl(0.06, 0.08, 0.35, ink, 0, 6);
      leg.position.set(x, 0, z);
      g.add(leg);
    });
    const horn = cyl(0.02, 0.06, 0.35, ink, 1.0, 5);
    horn.position.x = 0.15;
    g.add(horn);
    g.scale.setScalar(0.95);
    return g;
  }

  if (meshKey === 'jinni') {
    addShadowDisc(g, 0.5);
    const body = cyl(0.05, 0.45, 1.1, glow, 0.1, 12);
    g.add(body);
    g.add(sphere(0.35, glow, 1.35, 12));
    const armL = box(0.5, 0.1, 0.1, glow, 1.0);
    armL.position.x = -0.35;
    const armR = box(0.5, 0.1, 0.1, glow, 1.0);
    armR.position.x = 0.35;
    g.add(armL, armR);
    g.scale.setScalar(1.1);
    return g;
  }

  if (meshKey === 'ghost') {
    addShadowDisc(g, 0.4);
    const robe = cyl(0.15, 0.55, 1.8, mat('ghost', {
      color: 0xa8b8c8, roughness: 0.4, transparent: true, opacity: 0.55, metalness: 0.15,
    }), 0.1, 12);
    g.add(robe);
    g.add(sphere(0.32, mat('ghostHead', {
      color: 0xd0dce8, roughness: 0.35, transparent: true, opacity: 0.7,
    }), 2.0, 12));
    g.scale.setScalar(1.15);
    return g;
  }

  // drake
  addShadowDisc(g, 1.1);
  const torso = box(1.2, 0.55, 0.7, sand, 0.35);
  g.add(torso);
  const neck = cyl(0.12, 0.22, 0.7, sand, 0.7, 8);
  neck.position.set(0.55, 0, 0);
  neck.rotation.z = -0.6;
  g.add(neck);
  g.add(sphere(0.28, flesh, 1.35, 10)).position.x = 0.85;
  const wing = box(0.15, 0.08, 1.1, ink, 0.9);
  wing.position.set(-0.1, 0, 0.55);
  wing.rotation.y = 0.3;
  g.add(wing);
  const wing2 = wing.clone();
  wing2.position.z = -0.55;
  wing2.rotation.y = -0.3;
  g.add(wing2);
  const tail = cyl(0.04, 0.14, 0.9, sand, 0.25, 6);
  tail.position.set(-0.85, 0, 0);
  tail.rotation.z = 0.5;
  g.add(tail);
  g.scale.setScalar(1.25);
  return g;
}

export function makeCastleMesh(style = 'player', tier = 1) {
  const g = new THREE.Group();
  const stone = mat(`cst_${style}`, {
    color: style === 'player' ? 0xe8d4b0 : style === 'ally' ? 0xb0c4d8 : style === 'rome' ? 0xc4b8a0 : 0xd4c4a0,
    roughness: 0.75,
    metalness: 0.08,
  });
  const gold = mat('cstGold', { color: 0xe0b04a, roughness: 0.32, metalness: 0.75 });
  const roof = mat(`roof_${style}`, {
    color: style === 'ally' ? 0x4a7a9a : style === 'rome' ? 0x8b3a2a : 0x3a6a90,
    roughness: 0.55,
  });
  addShadowDisc(g, 1.4 + tier * 0.15);
  const base = box(2.2 + tier * 0.15, 0.9 + tier * 0.1, 2.2, stone, 0);
  g.add(base);
  const keep = box(1.2, 1.1 + tier * 0.15, 1.2, stone, 0.9);
  g.add(keep);
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(0.65 + tier * 0.05, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2),
    style === 'player' ? gold : roof,
  );
  dome.position.y = 2.15 + tier * 0.15;
  dome.castShadow = true;
  g.add(dome);
  [[-1.0, -1.0], [1.0, -1.0], [-1.0, 1.0], [1.0, 1.0]].forEach(([x, z]) => {
    const t = cyl(0.18, 0.22, 1.6 + tier * 0.1, stone, 0, 8);
    t.position.set(x, 0, z);
    g.add(t);
    const cap = sphere(0.2, style === 'player' ? gold : roof, 1.7 + tier * 0.1, 8);
    cap.position.set(x, 0, z);
    g.add(cap);
  });
  if (style === 'player') {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1.55, 1.7, 28),
      mat('playerRing', { color: 0xe8c47a, transparent: true, opacity: 0.55, side: THREE.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.05;
    g.add(ring);
  }
  g.scale.setScalar(0.85 + tier * 0.08);
  return g;
}

export function makeFieldMesh(resource) {
  const g = new THREE.Group();
  addShadowDisc(g, 0.9);
  if (resource === 'wood' || resource === 'field_wood') {
    const wood = mat('fWood', { color: 0x5a4030, roughness: 0.85 });
    const leaf = mat('fLeaf', { color: 0x3d7040, roughness: 0.8 });
    for (let i = 0; i < 3; i++) {
      const trunk = cyl(0.06, 0.1, 0.9, wood, 0, 6);
      trunk.position.set((i - 1) * 0.45, 0, (i % 2) * 0.2);
      g.add(trunk);
      const canopy = sphere(0.35, leaf, 1.05, 10);
      canopy.position.copy(trunk.position);
      canopy.position.y = 1.05;
      g.add(canopy);
    }
    return g;
  }
  if (resource === 'stone' || resource === 'field_stone') {
    const rock = mat('fRock', { color: 0x9aa0a8, roughness: 0.9 });
    const a = new THREE.Mesh(new THREE.DodecahedronGeometry(0.55, 0), rock);
    a.position.y = 0.4;
    a.castShadow = true;
    g.add(a);
    const b = new THREE.Mesh(new THREE.DodecahedronGeometry(0.35, 0), rock);
    b.position.set(0.45, 0.25, 0.2);
    b.castShadow = true;
    g.add(b);
    return g;
  }
  if (resource === 'gold' || resource === 'field_gold') {
    const dirt = mat('fDirt', { color: 0x5c4030, roughness: 0.9 });
    const gold = mat('fGold', { color: 0xe0b04a, roughness: 0.28, metalness: 0.85 });
    g.add(box(1.2, 0.35, 1.0, dirt, 0));
    const ore = cyl(0.28, 0.28, 0.22, gold, 0.4, 10);
    g.add(ore);
    const spark = sphere(0.12, gold, 0.7, 8);
    g.add(spark);
    return g;
  }
  // food / wheat
  const crop = mat('fCrop', { color: 0xc4a84a, roughness: 0.85 });
  const soil = mat('fSoil', { color: 0x6b5340, roughness: 0.9 });
  g.add(box(1.4, 0.12, 1.4, soil, 0));
  for (let i = -2; i <= 2; i++) {
    const row = box(1.3, 0.25, 0.12, crop, 0.12);
    row.position.z = i * 0.22;
    g.add(row);
  }
  return g;
}

export function makeFortMesh() {
  const g = new THREE.Group();
  const stone = mat('fortS', { color: 0x8a9aac, roughness: 0.75 });
  addShadowDisc(g, 0.9);
  g.add(box(1.4, 1.0, 1.0, stone, 0));
  for (let i = -0.5; i <= 0.5; i += 0.5) {
    const m = box(0.28, 0.28, 1.0, stone, 1.0);
    m.position.x = i;
    g.add(m);
  }
  return g;
}

export function makeNpcMesh(kind) {
  if (kind === 'ruin') {
    const g = new THREE.Group();
    addShadowDisc(g, 0.7);
    const stone = mat('ruinS', { color: 0x8a7a6a, roughness: 0.9 });
    g.add(box(0.4, 1.0, 0.4, stone, 0));
    const col = box(0.35, 1.4, 0.35, stone, 0);
    col.position.x = 0.5;
    g.add(col);
    return g;
  }
  const g = new THREE.Group();
  addShadowDisc(g, 0.55);
  const tent = mat('tent', { color: 0xb88850, roughness: 0.7 });
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.0, 4), tent);
  cone.position.y = 0.55;
  cone.castShadow = true;
  g.add(cone);
  return g;
}

/** Golden-hour lighting rig shared by previews / world */
export function addGoldenHourLights(scene, { castShadow = true, scale = 1 } = {}) {
  const hemi = new THREE.HemisphereLight(0xb8d0e8, 0x8a6238, 0.55);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffd090, 1.55);
  sun.position.set(-10 * scale, 12 * scale, 5 * scale);
  if (castShadow) {
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.bias = -0.0008;
  }
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0x88aacc, 0.32);
  fill.position.set(8 * scale, 5 * scale, -8 * scale);
  scene.add(fill);
  return { hemi, sun, fill };
}

export function detectWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl') || c.getContext('experimental-webgl'));
  } catch {
    return false;
  }
}
