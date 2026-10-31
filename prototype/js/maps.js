/**
 * عروش العصور — high-detail SVG world + castle art (gameplay-agnostic visuals).
 */

const KIND_COLOR = {
  castle: '#e8c47a',
  monster: '#c45c4a',
  resource: '#6a9b6e',
  npc_camp: '#b87333',
  fort: '#6b8cae',
  ruin: '#8a7a6a',
  outpost: '#a67c52',
};

const RES_COLOR = { food: '#7aab6e', wood: '#5a8f4a', stone: '#9aa0a8', gold: '#d4a84b' };

export function kindColor(kind, resource) {
  if (kind === 'resource' && resource) return RES_COLOR[resource] || KIND_COLOR.resource;
  return KIND_COLOR[kind] || '#c4a35a';
}

function escapeXml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function lerp(a, b, t) { return a + (b - a) * t; }

/** Detailed illustrated markers — larger, distinct silhouettes */
function markerShape(n, color) {
  const { x, y, kind, resource, owner } = n;
  const c = color;
  const player = owner === 'player';
  const ink = '#1a1410';
  // Slight per-node scale jitter so the map doesn't feel stamped
  const seed = (String(n.id || '').length * 17 + Math.round(x) + Math.round(y)) % 7;
  const s = 1.35 + seed * 0.05;

  if (kind === 'castle') {
    return `<g transform="translate(${x},${y}) scale(${player ? 1.35 : s})" class="mk-castle">
      <ellipse cx="0" cy="20" rx="28" ry="9" fill="rgba(0,0,0,0.5)"/>
      <path d="M-24 14 L-24 0 L-18 0 L-18 -12 L-10 -12 L-10 0 L-4 0 L-4 -20 L4 -20 L4 0 L10 0 L10 -12 L18 -12 L18 0 L24 0 L24 14 Z"
        fill="url(#stoneWall)" stroke="${ink}" stroke-width="1.6"/>
      <rect x="-22" y="2" width="44" height="12" fill="#5a4030" stroke="${ink}" stroke-width="0.8"/>
      <path d="M-8 -20 L0 -38 L8 -20 Z" fill="${player ? '#e8c47a' : c}" stroke="${ink}" stroke-width="1.3"/>
      <ellipse cx="0" cy="-26" rx="5" ry="4" fill="${player ? '#f0d78c' : hiSafe(c)}" stroke="${ink}"/>
      <rect x="-3.5" y="-44" width="3.2" height="12" fill="#2a1a10"/>
      <path d="M-0.3 -44 L14 -38 L-0.3 -32 Z" fill="#c45c4a" stroke="${ink}" stroke-width="0.7">
        <animateTransform attributeName="transform" type="skewX" values="0;6;0;-4;0" dur="2.6s" repeatCount="indefinite"/>
      </path>
      <rect x="-16" y="4" width="8" height="9" fill="#0e141c"/><rect x="8" y="4" width="8" height="9" fill="#0e141c"/>
      ${player ? `<circle cx="0" cy="2" r="34" fill="none" stroke="#e8c47a" stroke-opacity="0.45" stroke-width="2.5"/>` : ''}
    </g>`;
  }

  if (kind === 'monster') {
    return `<g transform="translate(${x},${y}) scale(${s + 0.08})" class="mk-monster">
      <ellipse cx="0" cy="18" rx="22" ry="8" fill="rgba(0,0,0,0.5)"/>
      <path d="M0 -22 C14 -14 20 2 12 14 C7 20 0 22 0 22 C0 22 -7 20 -12 14 C-20 2 -14 -14 0 -22 Z"
        fill="url(#monsterSkin)" stroke="${ink}" stroke-width="1.7"/>
      <path d="M-10 -8 Q-18 -22 -12 -28 M10 -8 Q18 -22 12 -28" fill="none" stroke="#5a2018" stroke-width="3.2" stroke-linecap="round">
        <animate attributeName="d" dur="2.4s" repeatCount="indefinite"
          values="M-10 -8 Q-18 -22 -12 -28 M10 -8 Q18 -22 12 -28;M-10 -8 Q-20 -24 -14 -30 M10 -8 Q20 -24 14 -30;M-10 -8 Q-18 -22 -12 -28 M10 -8 Q18 -22 12 -28"/>
      </path>
      <circle cx="-6" cy="-2" r="3.6" fill="#f3e6d0"/><circle cx="-6" cy="-2" r="1.5" fill="#1a1010"/>
      <circle cx="6" cy="-2" r="3.6" fill="#f3e6d0"/><circle cx="6" cy="-2" r="1.5" fill="#1a1010"/>
      <path d="M-8 8 Q0 16 8 8" fill="none" stroke="${ink}" stroke-width="1.8"/>
      <path d="M-4 10 L-2 14 M4 10 L2 14" stroke="#f3e6d0" stroke-width="1.2"/>
      <circle cx="0" cy="4" r="18" fill="none" stroke="${c}" stroke-opacity="0.35" stroke-width="5"/>
    </g>`;
  }

  if (kind === 'resource') {
    if (resource === 'wood') {
      return `<g transform="translate(${x},${y}) scale(${s})">
        <ellipse cx="0" cy="18" rx="18" ry="6" fill="rgba(0,0,0,0.45)"/>
        <rect x="-3" y="2" width="6" height="16" rx="1" fill="#4a3020" stroke="${ink}"/>
        <ellipse cx="0" cy="-8" rx="16" ry="13" fill="#2d5a28" stroke="${ink}" stroke-width="1.3"/>
        <ellipse cx="-6" cy="-14" rx="10" ry="9" fill="#4a8a3a"/><ellipse cx="7" cy="-12" rx="9" ry="8" fill="#3d7040"/>
        <ellipse cx="0" cy="-18" rx="7" ry="6" fill="#6a9b5a"/>
      </g>`;
    }
    if (resource === 'stone') {
      return `<g transform="translate(${x},${y}) scale(${s})">
        <ellipse cx="0" cy="18" rx="20" ry="6" fill="rgba(0,0,0,0.45)"/>
        <path d="M-18 12 L-12 -4 L0 -18 L16 -6 L20 12 Z" fill="url(#rockGrad)" stroke="${ink}" stroke-width="1.5"/>
        <path d="M-8 2 L4 -10 L12 6" fill="none" stroke="#f0f4f8" stroke-width="1.4"/>
        <circle cx="8" cy="6" r="4" fill="#6a7078" stroke="${ink}"/>
      </g>`;
    }
    if (resource === 'gold') {
      return `<g transform="translate(${x},${y}) scale(${s})">
        <ellipse cx="0" cy="18" rx="17" ry="6" fill="rgba(0,0,0,0.45)"/>
        <path d="M-10 10 L-12 -4 L0 -20 L12 -4 L10 10 Z" fill="#5c4030" stroke="${ink}" stroke-width="1.4"/>
        <circle cx="0" cy="-2" r="9" fill="url(#goldGrad)" stroke="#8b6914" stroke-width="1.6"/>
        <circle cx="0" cy="-2" r="14" fill="none" stroke="#d4a84b" stroke-opacity="0.55">
          <animate attributeName="r" values="11;17;11" dur="2.8s" repeatCount="indefinite"/>
          <animate attributeName="stroke-opacity" values="0.6;0.15;0.6" dur="2.8s" repeatCount="indefinite"/>
        </circle>
      </g>`;
    }
    return `<g transform="translate(${x},${y}) scale(${s})">
      <ellipse cx="0" cy="18" rx="20" ry="6" fill="rgba(0,0,0,0.42)"/>
      <rect x="-18" y="4" width="36" height="12" fill="#4a8a3a" stroke="${ink}" stroke-width="1.2" rx="1"/>
      <path d="M-16 4 H16 M-16 8 H16 M-16 12 H16" stroke="#2a5020" stroke-width="1.2"/>
      <path d="M-14 4 L-10 -4 L-6 4 M-2 4 L2 -6 L6 4 M10 4 L14 -3 L18 4" stroke="#e8c47a" stroke-width="1.5" fill="none"/>
      <path d="M6 10 L12 -8 H18 L24 10 Z" fill="#a67c52" stroke="${ink}" stroke-width="1.2"/>
      <path d="M12 -8 H18 L15 -14 Z" fill="#5a4030" stroke="${ink}"/>
    </g>`;
  }

  if (kind === 'fort') {
    return `<g transform="translate(${x},${y}) scale(${s})">
      <ellipse cx="0" cy="18" rx="20" ry="6" fill="rgba(0,0,0,0.48)"/>
      <path d="M-20 12 V-6 L-14 -6 V-16 L-6 -16 V-6 L0 -6 V-16 L6 -16 V-6 L14 -6 V-16 L20 -16 V-6 L20 12 Z"
        fill="url(#fortStone)" stroke="${ink}" stroke-width="1.5"/>
      <rect x="-6" y="0" width="12" height="12" fill="#0e141c"/>
      <rect x="-16" y="-4" width="5" height="4" fill="#0e141c"/><rect x="11" y="-4" width="5" height="4" fill="#0e141c"/>
      <path d="M-20 4 H20" stroke="#c8d0d8" stroke-width="1.2" opacity="0.35"/>
    </g>`;
  }

  if (kind === 'ruin') {
    return `<g transform="translate(${x},${y}) scale(${s})">
      <ellipse cx="0" cy="18" rx="18" ry="6" fill="rgba(0,0,0,0.4)"/>
      <rect x="-18" y="-6" width="8" height="22" fill="#8a7a6a" stroke="${ink}" stroke-width="1.2"/>
      <rect x="-6" y="-20" width="8" height="36" fill="#9a8a7a" stroke="${ink}" stroke-width="1.2"/>
      <path d="M-6 -20 L4 -26 L4 -20" fill="#7a6a5a" stroke="${ink}"/>
      <rect x="10" y="2" width="8" height="14" fill="#7a6e62" stroke="${ink}"/>
      <path d="M-20 14 L22 14" stroke="#5a4a3a" stroke-width="4" opacity="0.55"/>
      <circle cx="-10" cy="8" r="2.5" fill="#6a5a4a"/>
    </g>`;
  }

  if (kind === 'outpost') {
    return `<g transform="translate(${x},${y}) scale(${s})">
      <ellipse cx="0" cy="18" rx="15" ry="5" fill="rgba(0,0,0,0.42)"/>
      <path d="M-14 10 L0 -22 L14 10 Z" fill="#b88850" stroke="${ink}" stroke-width="1.5"/>
      <path d="M-8 10 L0 -6 L8 10" fill="#6b5340"/>
      <rect x="-2.5" y="2" width="5" height="10" fill="#4a3020" stroke="${ink}"/>
      <circle cx="12" cy="-4" r="3" fill="#c45c4a" stroke="${ink}"/>
    </g>`;
  }

  // npc_camp — varied camp kits (avoid stamp repetition)
  const campStyle = seed % 4;
  if (campStyle === 0) {
    return `<g transform="translate(${x},${y}) scale(${s})">
      <ellipse cx="0" cy="17" rx="18" ry="6" fill="rgba(0,0,0,0.48)"/>
      <path d="M-16 10 L0 -22 L16 10 Z" fill="${c}" stroke="${ink}" stroke-width="1.6"/>
      <path d="M-12 2 L12 2 M-8 -8 L8 -8" stroke="#f3e6d0" stroke-width="1.5" opacity="0.6"/>
      <path d="M0 -22 V10" stroke="${ink}" stroke-width="1.4"/>
      <rect x="-20" y="4" width="7" height="10" fill="#5c4030" stroke="${ink}"/>
      <circle cx="-22" cy="-2" r="3.2" fill="#c45c4a" stroke="${ink}"/>
    </g>`;
  }
  if (campStyle === 1) {
    return `<g transform="translate(${x},${y}) scale(${s})">
      <ellipse cx="0" cy="17" rx="20" ry="6" fill="rgba(0,0,0,0.48)"/>
      <path d="M-18 10 L-8 -14 L2 10 Z" fill="${c}" stroke="${ink}" stroke-width="1.4"/>
      <path d="M-2 10 L8 -16 L18 10 Z" fill="#8a5a32" stroke="${ink}" stroke-width="1.4"/>
      <rect x="-4" y="2" width="5" height="10" fill="#3a2a18"/>
      <path d="M6 -4 H14" stroke="#e8c47a" stroke-width="2"/>
    </g>`;
  }
  if (campStyle === 2) {
    return `<g transform="translate(${x},${y}) scale(${s})">
      <ellipse cx="0" cy="17" rx="17" ry="6" fill="rgba(0,0,0,0.48)"/>
      <rect x="-14" y="-2" width="28" height="14" fill="${c}" stroke="${ink}" stroke-width="1.5" rx="1"/>
      <path d="M-14 -2 L0 -18 L14 -2 Z" fill="#6b5340" stroke="${ink}" stroke-width="1.3"/>
      <rect x="-4" y="4" width="8" height="8" fill="#1a1410"/>
      <circle cx="16" cy="-8" r="3" fill="#c45c4a" stroke="${ink}"/>
    </g>`;
  }
  return `<g transform="translate(${x},${y}) scale(${s})">
    <ellipse cx="0" cy="17" rx="16" ry="6" fill="rgba(0,0,0,0.48)"/>
    <path d="M-12 10 Q-14 -8 0 -20 Q14 -8 12 10 Z" fill="${c}" stroke="${ink}" stroke-width="1.5"/>
    <path d="M0 -20 V10" stroke="${ink}" stroke-width="1.2"/>
    <circle cx="0" cy="-6" r="3" fill="#f3e6d0" opacity="0.35"/>
    <rect x="10" y="2" width="8" height="6" fill="#5c4030" stroke="${ink}"/>
  </g>`;
}

function hiSafe(c) {
  return c || '#c4a35a';
}

export function buildMarchPathsSvg(marches, now = Date.now()) {
  if (!marches?.length) return '';
  const colors = { traveling: '#e8c47a', gathering: '#6a9b6e', returning: '#7a9ec4' };
  return `
    <defs>
      <filter id="pathGlow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="2.2" result="b"/>
        <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <marker id="marchArrow" markerWidth="9" markerHeight="9" refX="7" refY="3.5" orient="auto">
        <path d="M0,0 L7,3.5 L0,7 Z" fill="#e8c47a"/>
      </marker>
      <marker id="marchArrowRet" markerWidth="9" markerHeight="9" refX="7" refY="3.5" orient="auto">
        <path d="M0,0 L7,3.5 L0,7 Z" fill="#7a9ec4"/>
      </marker>
      <marker id="marchArrowGath" markerWidth="9" markerHeight="9" refX="7" refY="3.5" orient="auto">
        <path d="M0,0 L7,3.5 L0,7 Z" fill="#6a9b6e"/>
      </marker>
    </defs>
    ${marches.filter((m) => m.status !== 'done' && m.from && m.to).map((m) => {
      const col = colors[m.status] || '#e8c47a';
      const marker = m.status === 'returning' ? 'url(#marchArrowRet)' : m.status === 'gathering' ? 'url(#marchArrowGath)' : 'url(#marchArrow)';
      let t = 0;
      if (m.status === 'traveling') {
        const total = Math.max(1, m.arrivesAt - m.startedAt);
        t = Math.min(1, Math.max(0, (now - m.startedAt) / total));
      } else if (m.status === 'gathering') t = 1;
      else if (m.status === 'returning') {
        const start = m.returnStartedAt || m.arrivesAt;
        const total = Math.max(1, m.returnsAt - start);
        t = Math.min(1, Math.max(0, (now - start) / total));
      }
      const cx = lerp(m.from.x, m.to.x, t);
      const cy = lerp(m.from.y, m.to.y, t);
      return `
        <g class="march-path" data-march="${m.id}" filter="url(#pathGlow)">
          <line x1="${m.from.x}" y1="${m.from.y}" x2="${m.to.x}" y2="${m.to.y}"
            stroke="${col}" stroke-width="4" stroke-opacity="0.22"/>
          <line x1="${m.from.x}" y1="${m.from.y}" x2="${m.to.x}" y2="${m.to.y}"
            stroke="${col}" stroke-width="2" stroke-dasharray="10 7" stroke-opacity="0.95" marker-end="${marker}">
            <animate attributeName="stroke-dashoffset" from="34" to="0" dur="1.1s" repeatCount="indefinite"/>
          </line>
          <circle cx="${cx}" cy="${cy}" r="8" fill="${col}" stroke="#1a2433" stroke-width="1.6"/>
          <circle cx="${cx}" cy="${cy}" r="3" fill="#f3e6d0"/>
          ${m.status === 'gathering' ? `<circle cx="${m.to.x}" cy="${m.to.y}" r="20" fill="none" stroke="${col}" stroke-width="2" stroke-dasharray="5 4" opacity="0.85">
            <animate attributeName="r" values="16;24;16" dur="2s" repeatCount="indefinite"/>
          </circle>` : ''}
        </g>`;
    }).join('')}`;
}

function worldDefs(w, h) {
  return `<defs>
    <linearGradient id="seaGrad" x1="0" y1="0" x2="0.3" y2="1">
      <stop offset="0%" stop-color="#163a4c"/>
      <stop offset="50%" stop-color="#0f2d3c"/>
      <stop offset="100%" stop-color="#0a222e"/>
    </linearGradient>
    <linearGradient id="coastShimmer" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#3a7a8a" stop-opacity="0"/>
      <stop offset="50%" stop-color="#6ab0c0" stop-opacity="0.45"/>
      <stop offset="100%" stop-color="#3a7a8a" stop-opacity="0">
        <animate attributeName="offset" values="0;1;0" dur="6s" repeatCount="indefinite"/>
      </stop>
    </linearGradient>
    <linearGradient id="greenLand" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#3d5a40"/>
      <stop offset="100%" stop-color="#2a4030"/>
    </linearGradient>
    <linearGradient id="desertLand" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#c4a06a"/>
      <stop offset="55%" stop-color="#a67c52"/>
      <stop offset="100%" stop-color="#8a6238"/>
    </linearGradient>
    <radialGradient id="oasisGreen" cx="35%" cy="65%" r="30%">
      <stop offset="0%" stop-color="#5a8f4a" stop-opacity="0.75"/>
      <stop offset="100%" stop-color="#5a8f4a" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="stoneWall" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#d4b896"/><stop offset="100%" stop-color="#8b6914"/>
    </linearGradient>
    <linearGradient id="fortStone" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#9aa8b8"/><stop offset="100%" stop-color="#4a5868"/>
    </linearGradient>
    <linearGradient id="rockGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#c0c6cc"/><stop offset="100%" stop-color="#6a7078"/>
    </linearGradient>
    <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#f0d78c"/><stop offset="100%" stop-color="#b8860b"/>
    </linearGradient>
    <radialGradient id="monsterSkin" cx="40%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#e07050"/><stop offset="100%" stop-color="#8b2a1a"/>
    </radialGradient>
    <radialGradient id="vignette" cx="50%" cy="45%" r="75%">
      <stop offset="55%" stop-color="#000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#060a10" stop-opacity="0.28"/>
    </radialGradient>
    <filter id="softShadow" x="-50%" y="-50%" width="200%" height="200%">
      <feDropShadow dx="0" dy="3" stdDeviation="2.8" flood-opacity="0.5"/>
    </filter>
    <pattern id="duneLines" width="64" height="32" patternUnits="userSpaceOnUse">
      <path d="M0 20 Q16 10 32 20 T64 20" fill="none" stroke="rgba(255,230,180,0.08)" stroke-width="1.5"/>
      <path d="M0 28 Q16 18 32 28 T64 28" fill="none" stroke="rgba(90,60,30,0.06)" stroke-width="1"/>
    </pattern>
    <pattern id="grassDots" width="24" height="24" patternUnits="userSpaceOnUse">
      <circle cx="4" cy="8" r="1.2" fill="rgba(80,120,60,0.25)"/>
      <circle cx="16" cy="16" r="1" fill="rgba(60,100,50,0.2)"/>
    </pattern>
    <pattern id="terrainNoise" width="48" height="48" patternUnits="userSpaceOnUse">
      <circle cx="6" cy="10" r="1.4" fill="rgba(40,28,12,0.12)"/>
      <circle cx="22" cy="6" r="1" fill="rgba(255,230,180,0.08)"/>
      <circle cx="38" cy="18" r="1.6" fill="rgba(40,28,12,0.1)"/>
      <circle cx="12" cy="28" r="1.1" fill="rgba(255,230,180,0.07)"/>
      <circle cx="30" cy="36" r="1.3" fill="rgba(40,28,12,0.11)"/>
      <circle cx="44" cy="40" r="0.9" fill="rgba(255,230,180,0.06)"/>
      <path d="M2 40 Q12 34 20 42" fill="none" stroke="rgba(90,60,30,0.08)" stroke-width="1"/>
      <path d="M28 8 Q36 14 46 10" fill="none" stroke="rgba(255,230,180,0.06)" stroke-width="1"/>
    </pattern>
    <pattern id="greenNoise" width="36" height="36" patternUnits="userSpaceOnUse">
      <circle cx="5" cy="8" r="1.2" fill="rgba(30,60,20,0.2)"/>
      <circle cx="18" cy="20" r="1.5" fill="rgba(120,160,80,0.12)"/>
      <circle cx="28" cy="6" r="1" fill="rgba(20,40,15,0.18)"/>
      <circle cx="10" cy="28" r="1.3" fill="rgba(90,140,60,0.14)"/>
    </pattern>
  </defs>`;
}

export function buildWorldSvg(tables, state, selectedId) {
  const w = tables.world.meta.svgView?.width || 1000;
  const h = tables.world.meta.svgView?.height || 900;
  const vb = state.worldViewBox || { x: 80, y: 60, w: 840, h: 720 };
  const scouted = state.scoutedNodes || {};
  const marchLayer = buildMarchPathsSvg(state.marches || []);

  const terrain = `
    ${worldDefs(w, h)}
    <rect width="${w}" height="${h}" fill="url(#seaGrad)"/>
    <!-- distant sea shimmer -->
    <path d="M0 80 Q200 40 400 90 T800 50 T1000 100 L1000 0 L0 0 Z" fill="#1a4a5c" opacity="0.35"/>
    <rect x="0" y="0" width="${w}" height="160" fill="url(#coastShimmer)" opacity="0.35"/>

    <!-- main continent -->
    <path d="M30 140 C160 50, 300 90, 460 55 S760 30, 990 130 L990 860 C840 910, 640 880, 430 850 S140 890, 10 800 Z"
      fill="url(#desertLand)"/>
    <path d="M30 140 C160 50, 300 90, 460 55 S760 30, 990 130 L990 860 C840 910, 640 880, 430 850 S140 890, 10 800 Z"
      fill="url(#duneLines)"/>
    <path d="M30 140 C160 50, 300 90, 460 55 S760 30, 990 130 L990 860 C840 910, 640 880, 430 850 S140 890, 10 800 Z"
      fill="url(#terrainNoise)"/>

    <!-- fertile crescent / green belt -->
    <path d="M80 520 C200 460, 280 580, 400 520 S560 600, 680 540 S820 620, 920 560 L900 720 C760 780, 520 760, 300 720 S100 740, 60 680 Z"
      fill="url(#greenLand)" opacity="0.92"/>
    <path d="M80 520 C200 460, 280 580, 400 520 S560 600, 680 540 S820 620, 920 560 L900 720 C760 780, 520 760, 300 720 S100 740, 60 680 Z"
      fill="url(#grassDots)"/>
    <path d="M80 520 C200 460, 280 580, 400 520 S560 600, 680 540 S820 620, 920 560 L900 720 C760 780, 520 760, 300 720 S100 740, 60 680 Z"
      fill="url(#greenNoise)"/>
    <ellipse cx="320" cy="600" rx="120" ry="70" fill="url(#oasisGreen)"/>

    <!-- river with shimmer -->
    <path id="riverPath" d="M160 200 C220 280, 260 360, 300 450 S360 580, 420 680 S500 780, 560 820"
      fill="none" stroke="#1a4a5c" stroke-width="18" stroke-linecap="round" opacity="0.85"/>
    <path d="M160 200 C220 280, 260 360, 300 450 S360 580, 420 680 S500 780, 560 820"
      fill="none" stroke="#4a9aaa" stroke-width="8" stroke-linecap="round" opacity="0.55">
      <animate attributeName="stroke-opacity" values="0.35;0.7;0.35" dur="3.5s" repeatCount="indefinite"/>
    </path>
    <path d="M700 120 C740 200, 780 260, 820 340 S880 480, 940 560"
      fill="none" stroke="#1a4a5c" stroke-width="12" opacity="0.5"/>

    <!-- mountain silhouettes -->
    <g opacity="0.9">
      <path d="M40 280 L100 160 L150 250 L210 130 L280 240 L340 150 L400 260 L40 300 Z" fill="#3a4555"/>
      <path d="M80 250 L100 180 L130 240" fill="#5a6575" opacity="0.5"/>
      <path d="M720 200 L780 90 L840 190 L900 100 L980 210 L720 230 Z" fill="#3a4555"/>
      <path d="M780 160 L800 110 L830 170" fill="#c8d0d8" opacity="0.25"/>
    </g>

    <!-- coast foam -->
    <path d="M30 140 C160 50, 300 90, 460 55" fill="none" stroke="#8ec4d0" stroke-width="3" opacity="0.25"/>

    <rect width="${w}" height="${h}" fill="url(#vignette)" pointer-events="none"/>
  `;

  const nodes = (tables.world.nodes || []).map((n) => {
    const selected = n.id === selectedId;
    const color = kindColor(n.kind, n.resource);
    const isPlayer = n.owner === 'player';
    const opacity = scouted[n.id] || isPlayer ? 1 : 0.9;
    const label = (isPlayer || selected || scouted[n.id]) ? n.nameAr : '';
    const hitR = n.kind === 'castle' || n.kind === 'monster' ? 38 : 30;
    return `
      <g class="world-node ${selected ? 'is-selected' : ''}" data-node="${n.id}" opacity="${opacity}" filter="url(#softShadow)" style="cursor:pointer">
        ${selected ? `<circle cx="${n.x}" cy="${n.y}" r="${hitR + 2}" fill="none" stroke="${color}" stroke-width="3" stroke-dasharray="6 4">
          <animate attributeName="r" values="${hitR};${hitR + 12};${hitR}" dur="2s" repeatCount="indefinite"/>
          <animate attributeName="stroke-opacity" values="1;0.3;1" dur="2s" repeatCount="indefinite"/>
        </circle>` : ''}
        <circle cx="${n.x}" cy="${n.y}" r="${hitR}" fill="transparent"/>
        ${markerShape(n, color)}
        ${label ? `<text x="${n.x}" y="${n.y + hitR + 4}" text-anchor="middle" font-size="15" fill="#fff8ea" font-family="Cairo,sans-serif" font-weight="700" stroke="#0a1018" stroke-width="4" paint-order="stroke">${escapeXml(label)}</text>` : ''}
      </g>`;
  }).join('');

  return {
    viewBox: `${vb.x} ${vb.y} ${vb.w} ${vb.h}`,
    width: w,
    height: h,
    inner: terrain + marchLayer + nodes,
  };
}

/* Castle interior — Three.js / WebGL (vendored). SVG art remains legacy only. */
export {
  mountCastle3D,
  disposeCastle3D,
  webglAvailable,
} from './castle3d.js';
export { buildCastleInteriorHtml } from './castle-art.js';

export function attachWorldPan(svgEl, state, onChange) {
  const pointers = new Map();
  let dragging = false;
  let last = null;
  let pinchStart = null;

  const getVb = () => {
    const p = (svgEl.getAttribute('viewBox') || '0 0 1000 900').split(/\s+/).map(Number);
    return { x: p[0], y: p[1], w: p[2], h: p[3] };
  };
  const setVb = (vb) => {
    vb.w = Math.min(1000, Math.max(220, vb.w));
    vb.h = Math.min(900, Math.max(200, vb.h));
    state.worldViewBox = vb;
    svgEl.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
  };

  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

  svgEl.addEventListener('pointerdown', (e) => {
    if (e.target.closest?.('.world-node') && pointers.size === 0) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    svgEl.setPointerCapture?.(e.pointerId);
    if (pointers.size === 1) {
      dragging = true;
      last = { x: e.clientX, y: e.clientY };
      pinchStart = null;
    } else if (pointers.size === 2) {
      dragging = false;
      const pts = [...pointers.values()];
      pinchStart = { dist: dist(pts[0], pts[1]), vb: getVb(), mid: mid(pts[0], pts[1]) };
    }
  });

  svgEl.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.size === 2 && pinchStart) {
      const pts = [...pointers.values()];
      const d = dist(pts[0], pts[1]);
      if (d < 1) return;
      const scale = pinchStart.dist / d;
      const vb0 = pinchStart.vb;
      const nw = vb0.w * scale;
      const nh = vb0.h * scale;
      const rect = svgEl.getBoundingClientRect();
      const mx = pinchStart.mid.x;
      const my = pinchStart.mid.y;
      const sx = vb0.x + ((mx - rect.left) / rect.width) * vb0.w;
      const sy = vb0.y + ((my - rect.top) / rect.height) * vb0.h;
      const fx = (mx - rect.left) / rect.width;
      const fy = (my - rect.top) / rect.height;
      setVb({ x: sx - nw * fx, y: sy - nh * fy, w: nw, h: nh });
      return;
    }

    if (!dragging || !last || pointers.size !== 1) return;
    const vb = getVb();
    const rect = svgEl.getBoundingClientRect();
    const dx = ((e.clientX - last.x) / rect.width) * vb.w;
    const dy = ((e.clientY - last.y) / rect.height) * vb.h;
    vb.x -= dx;
    vb.y -= dy;
    last = { x: e.clientX, y: e.clientY };
    setVb(vb);
  });

  const end = (e) => {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinchStart = null;
    if (pointers.size === 0) {
      if (dragging) onChange?.();
      dragging = false;
      last = null;
    } else if (pointers.size === 1) {
      const p = [...pointers.values()][0];
      dragging = true;
      last = { x: p.x, y: p.y };
      onChange?.();
    }
  };
  svgEl.addEventListener('pointerup', end);
  svgEl.addEventListener('pointercancel', end);

  svgEl.addEventListener('wheel', (e) => {
    e.preventDefault();
    const vb = getVb();
    const factor = e.deltaY > 0 ? 1.08 : 0.92;
    const rect = svgEl.getBoundingClientRect();
    const fx = (e.clientX - rect.left) / rect.width;
    const fy = (e.clientY - rect.top) / rect.height;
    const nw = vb.w * factor;
    const nh = vb.h * factor;
    const sx = vb.x + vb.w * fx;
    const sy = vb.y + vb.h * fy;
    setVb({ x: sx - nw * fx, y: sy - nh * fy, w: nw, h: nh });
    onChange?.();
  }, { passive: false });
}

export { KIND_COLOR };
