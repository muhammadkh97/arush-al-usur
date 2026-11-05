/**
 * عروش العصور — isometric 2.5D castle scene (SVG only, no CSS rotateX).
 * Original art inspired by mobile-strategy quality; not competitor IP.
 */

const TW = 58;
const TH = 29;
const OX = 360;
const OY = 72;
const VB_W = 720;
const VB_H = 780;

const GLYPH = {
  palace: 'القصر', farm: 'مزرعة', lumber: 'حطب', quarry: 'محجر', goldmine: 'ذهب',
  warehouse: 'مستودع', barracks: 'ثكنة', archery: 'رماة', wall: 'سور',
  embassy: 'سفارة', hospital: 'مستشفى', academy: 'أكاديمية', shrine: 'ضريح',
};

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function iso(col, row) {
  return { x: OX + (col - row) * (TW / 2), y: OY + (col + row) * (TH / 2) };
}

function isoCenter(b) {
  const c = b.col + b.w / 2;
  const r = b.row + b.h / 2;
  return iso(c, r);
}

function diamond(cx, cy, w, h, fill, stroke = 'none', sw = 0) {
  const hw = w / 2;
  const hh = h / 2;
  return `<path d="M${cx} ${cy - hh} L${cx + hw} ${cy} L${cx} ${cy + hh} L${cx - hw} ${cy} Z" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
}

function shadow(cx, cy, rx = 36, ry = 14) {
  return `<ellipse cx="${cx + 10}" cy="${cy + 8}" rx="${rx}" ry="${ry}" fill="rgba(40,24,8,0.38)"/>`;
}

function palm(cx, cy, scale = 1) {
  const s = scale;
  return `<g transform="translate(${cx},${cy}) scale(${s})" class="iso-palm">
    <ellipse cx="4" cy="10" rx="10" ry="4" fill="rgba(40,24,8,0.28)"/>
    <rect x="-2" y="-18" width="4" height="28" rx="1" fill="#6b4a28"/>
    <path d="M0 -18 Q-18 -28 -22 -14 Q-8 -20 0 -18" fill="#2d6b32"/>
    <path d="M0 -18 Q18 -30 24 -14 Q8 -22 0 -18" fill="#3d8a40"/>
    <path d="M0 -18 Q-6 -36 8 -34 Q4 -26 0 -18" fill="#4a9b48"/>
    <path d="M0 -18 Q12 -34 -4 -36 Q0 -26 0 -18" fill="#357a38"/>
  </g>`;
}

function defs() {
  return `<defs>
    <linearGradient id="sandGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#e8c48a"/><stop offset="45%" stop-color="#d4a86a"/><stop offset="100%" stop-color="#b88850"/>
    </linearGradient>
    <linearGradient id="goldDome" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffe9a8"/><stop offset="55%" stop-color="#e0b04a"/><stop offset="100%" stop-color="#a87820"/>
    </linearGradient>
    <linearGradient id="stoneFace" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#f5e6c8"/><stop offset="100%" stop-color="#c4a882"/>
    </linearGradient>
    <linearGradient id="stoneSide" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#a89070"/><stop offset="100%" stop-color="#7a6248"/>
    </linearGradient>
    <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#5ab0c8"/><stop offset="100%" stop-color="#2a6a88"/>
    </linearGradient>
    <linearGradient id="roofBlue" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#7eb8d8"/><stop offset="100%" stop-color="#3a6a90"/>
    </linearGradient>
    <linearGradient id="hourGlow" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffd090" stop-opacity="0.55"/><stop offset="100%" stop-color="#c4784a" stop-opacity="0"/>
    </linearGradient>
    <pattern id="sandNoise" width="40" height="40" patternUnits="userSpaceOnUse">
      <circle cx="6" cy="10" r="1.2" fill="rgba(120,80,40,0.12)"/>
      <circle cx="22" cy="8" r="0.9" fill="rgba(255,230,180,0.14)"/>
      <circle cx="30" cy="24" r="1.3" fill="rgba(90,60,30,0.1)"/>
      <circle cx="12" cy="30" r="1" fill="rgba(255,230,180,0.1)"/>
    </pattern>
    <pattern id="cropRows" width="10" height="8" patternUnits="userSpaceOnUse">
      <rect width="10" height="8" fill="#4a8a3a"/>
      <path d="M0 2 H10 M0 6 H10" stroke="#2d5a28" stroke-width="1.4"/>
      <path d="M0 0 H10" stroke="#6ab04a" stroke-width="0.8" opacity="0.5"/>
    </pattern>
  </defs>`;
}

function groundLayer() {
  // Large sand diamond board + grass + courtyard ring + paths
  const board = diamond(OX, OY + 220, 620, 340, 'url(#sandGrad)', '#8a6238', 2);
  const noise = diamond(OX, OY + 220, 620, 340, 'url(#sandNoise)');
  const grass = [
    diamond(OX - 160, OY + 160, 90, 48, '#5a9b4a', '#3d6b32', 1),
    diamond(OX + 180, OY + 200, 110, 56, '#4a8a3a', '#2d5a28', 1),
    diamond(OX - 40, OY + 300, 100, 50, '#5a9b4a', '#3d6b32', 1),
    diamond(OX + 120, OY + 120, 70, 36, '#6aab5a', '#3d6b32', 1),
  ].join('');
  // Courtyard water around palace (center ~ col6 row4)
  const pc = iso(6, 4);
  const water = `
    <ellipse cx="${pc.x}" cy="${pc.y + 28}" rx="78" ry="36" fill="url(#waterGrad)" stroke="#1a4a5c" stroke-width="2" opacity="0.92"/>
    <ellipse cx="${pc.x}" cy="${pc.y + 28}" rx="58" ry="26" fill="url(#sandGrad)" stroke="#c4a06a" stroke-width="1.5"/>
    <path d="M${pc.x - 58} ${pc.y + 28} L${pc.x - 20} ${pc.y + 12} L${pc.x - 20} ${pc.y + 44} Z" fill="#b89060"/>
    <path d="M${pc.x + 58} ${pc.y + 28} L${pc.x + 20} ${pc.y + 12} L${pc.x + 20} ${pc.y + 44} Z" fill="#b89060"/>
    <path d="M${pc.x} ${pc.y - 8} L${pc.x - 14} ${pc.y + 28} L${pc.x + 14} ${pc.y + 28} Z" fill="#c4a882"/>
    <path d="M${pc.x} ${pc.y + 64} L${pc.x - 14} ${pc.y + 28} L${pc.x + 14} ${pc.y + 28} Z" fill="#a88860"/>
  `;
  // Radial sand paths
  const paths = `
    <path d="M${pc.x} ${pc.y + 64} L${OX} ${OY + 360}" stroke="#c4a06a" stroke-width="14" stroke-linecap="round" opacity="0.55"/>
    <path d="M${pc.x - 58} ${pc.y + 28} L${OX - 200} ${OY + 280}" stroke="#c4a06a" stroke-width="10" stroke-linecap="round" opacity="0.45"/>
    <path d="M${pc.x + 58} ${pc.y + 28} L${OX + 210} ${OY + 260}" stroke="#c4a06a" stroke-width="10" stroke-linecap="round" opacity="0.45"/>
  `;
  const palms = [
    palm(OX - 150, OY + 150, 0.9), palm(OX - 175, OY + 175, 0.75),
    palm(OX + 190, OY + 170, 0.95), palm(OX + 165, OY + 200, 0.7),
    palm(OX - 90, OY + 310, 0.8), palm(OX + 95, OY + 320, 0.85),
    palm(pc.x - 70, pc.y + 50, 0.65), palm(pc.x + 75, pc.y + 48, 0.7),
  ].join('');
  return `<g class="iso-ground">${board}${noise}${grass}${paths}${water}${palms}</g>`;
}

function wallRing() {
  // Perimeter battlement suggestions at board edge
  const pts = [
    iso(1, 1), iso(9, 1), iso(9, 6), iso(1, 6),
  ];
  return `<g class="iso-walls" opacity="0.95">
    ${pts.map((p, i) => {
      const n = pts[(i + 1) % pts.length];
      return `<line x1="${p.x}" y1="${p.y}" x2="${n.x}" y2="${n.y}" stroke="#8a7048" stroke-width="6" opacity="0.35"/>`;
    }).join('')}
    ${pts.map((p) => `
      <g transform="translate(${p.x},${p.y})">
        ${shadow(0, 6, 16, 7)}
        <path d="M-10 0 L0 -8 L10 0 L10 16 L-10 16 Z" fill="url(#stoneFace)" stroke="#5c4030" stroke-width="1"/>
        <path d="M10 0 L16 4 L16 20 L10 16 Z" fill="url(#stoneSide)"/>
        <path d="M-10 0 L-4 -4 L0 -8 L-10 0" fill="#e8d4a8"/>
        <path d="M-10 0 L-6 -6 L-2 0 L2 -6 L6 0 L10 -6 L10 0" fill="#c4a06a"/>
      </g>`).join('')}
  </g>`;
}

/** Isometric building sprites — original designs */
function sprite(id, theme, built) {
  const ghost = built ? 1 : 0.45;
  const face = theme === 'rome' ? '#d8e4f0' : theme === 'persia' ? '#f0b090' : '#f5e2c0';
  const side = theme === 'rome' ? '#7a90a8' : theme === 'persia' ? '#a86848' : '#a88860';
  const ink = '#3a2a18';

  if (id === 'palace') {
    return `<g opacity="${ghost}" class="spr-palace">
      ${shadow(0, 42, 72, 22)}
      <!-- base platform -->
      <path d="M-58 24 L0 0 L58 24 L0 48 Z" fill="#d4b896" stroke="${ink}" stroke-width="1.2"/>
      <path d="M-58 24 L-58 42 L0 66 L0 48 Z" fill="${side}"/>
      <path d="M58 24 L58 42 L0 66 L0 48 Z" fill="#8a6e48"/>
      <!-- main hall -->
      <path d="M-42 10 L0 -14 L42 10 L0 34 Z" fill="${face}" stroke="${ink}" stroke-width="1.2"/>
      <path d="M-42 10 L-42 34 L0 58 L0 34 Z" fill="${side}"/>
      <path d="M42 10 L42 34 L0 58 L0 34 Z" fill="#8a7048"/>
      <path d="M-20 18 v14 M0 8 v18 M20 18 v14" stroke="#5c4030" stroke-width="4" opacity="0.3"/>
      <!-- golden dome (hero) -->
      <ellipse cx="0" cy="-20" rx="30" ry="20" fill="url(#goldDome)" stroke="#8a6914" stroke-width="1.5"/>
      <ellipse cx="0" cy="-26" rx="18" ry="11" fill="#ffe9a8" opacity="0.65"/>
      <ellipse cx="-8" cy="-28" rx="6" ry="3" fill="#fff8dc" opacity="0.45"/>
      <path d="M0 -40 L4 -52 L0 -48 L-4 -52 Z" fill="#f0d78c" stroke="#8a6914"/>
      <!-- minarets -->
      <g transform="translate(-50,-8)">
        <rect x="-5" y="-36" width="10" height="52" fill="${face}" stroke="${ink}"/>
        <rect x="-4" y="-46" width="8" height="12" fill="url(#goldDome)"/>
        <path d="M-4 -46 L0 -58 L4 -46 Z" fill="#e8c47a"/>
      </g>
      <g transform="translate(50,-8)">
        <rect x="-5" y="-36" width="10" height="52" fill="${face}" stroke="${ink}"/>
        <rect x="-4" y="-46" width="8" height="12" fill="url(#goldDome)"/>
        <path d="M-4 -46 L0 -58 L4 -46 Z" fill="#e8c47a"/>
      </g>
      <g transform="translate(-26,-28)">
        <rect x="-3.5" y="-20" width="7" height="30" fill="${side}" stroke="${ink}"/>
        <ellipse cx="0" cy="-22" rx="6" ry="5" fill="url(#goldDome)"/>
      </g>
      <g transform="translate(26,-28)">
        <rect x="-3.5" y="-20" width="7" height="30" fill="${side}" stroke="${ink}"/>
        <ellipse cx="0" cy="-22" rx="6" ry="5" fill="url(#goldDome)"/>
      </g>
      <rect x="-1.5" y="-58" width="3" height="12" fill="#3a2a18"/>
      <path class="flag-wave" d="M1.5 -58 L18 -52 L1.5 -46 Z" fill="#c45c4a"/>
      <ellipse class="smoke-soft" cx="34" cy="-10" rx="7" ry="5" fill="rgba(230,220,200,0.5)"/>
    </g>`;
  }

  if (id === 'farm') {
    return `<g opacity="${ghost}">
      ${shadow(0, 22, 42, 14)}
      <path d="M-40 10 L0 -8 L40 10 L0 28 Z" fill="url(#cropRows)" stroke="#2d5a28" stroke-width="1.2"/>
      <path d="M-40 10 L-40 18 L0 36 L0 28 Z" fill="#3d6b32"/>
      <path d="M40 10 L40 18 L0 36 L0 28 Z" fill="#2a5020"/>
      <!-- shed -->
      <path d="M12 6 L28 -4 L36 2 L20 12 Z" fill="${face}" stroke="${ink}"/>
      <path d="M12 6 L12 16 L20 22 L20 12 Z" fill="${side}"/>
      <path d="M28 -4 L36 2 L36 12 L28 6 Z" fill="#6b5340"/>
      <path d="M-28 0 L-22 -8 L-16 0" stroke="#c4a35a" stroke-width="1.5" fill="none"/>
      <path d="M-12 2 L-6 -6 L0 2" stroke="#c4a35a" stroke-width="1.5" fill="none"/>
    </g>`;
  }

  if (id === 'barracks') {
    return `<g opacity="${ghost}">
      ${shadow(0, 24, 40, 13)}
      <path d="M-36 12 L0 -6 L36 12 L0 30 Z" fill="${face}" stroke="${ink}" stroke-width="1.1"/>
      <path d="M-36 12 L-36 28 L0 46 L0 30 Z" fill="${side}"/>
      <path d="M36 12 L36 28 L0 46 L0 30 Z" fill="#7a5a38"/>
      <path d="M-36 12 L0 -6 L36 12 L28 4 L0 -12 L-28 4 Z" fill="#6b5340" stroke="${ink}"/>
      <rect x="-18" y="14" width="10" height="14" fill="#1a1410"/><rect x="-4" y="14" width="10" height="14" fill="#1a1410"/><rect x="10" y="14" width="10" height="14" fill="#1a1410"/>
      <path d="M-8 -2 L0 -14 L8 -2" fill="#c4a06a" stroke="${ink}"/>
    </g>`;
  }

  if (id === 'archery') {
    return `<g opacity="${ghost}">
      ${shadow(0, 22, 32, 12)}
      <path d="M-22 14 L0 0 L22 14 L0 28 Z" fill="${face}" stroke="${ink}"/>
      <path d="M-22 14 L-22 28 L0 42 L0 28 Z" fill="${side}"/>
      <path d="M22 14 L22 28 L0 42 L0 28 Z" fill="#7a5a38"/>
      <rect x="-10" y="-22" width="20" height="28" fill="${face}" stroke="${ink}"/>
      <path d="M-10 -22 H10 L0 -34 Z" fill="url(#roofBlue)" stroke="${ink}"/>
      <path d="M-20 8 Q0 -10 20 8" fill="none" stroke="#c4a35a" stroke-width="2"/>
    </g>`;
  }

  if (id === 'warehouse') {
    return `<g opacity="${ghost}">
      ${shadow(0, 22, 40, 13)}
      <path d="M-38 14 L0 -6 L38 14 L0 34 Z" fill="${face}" stroke="${ink}"/>
      <path d="M-38 14 L-38 30 L0 50 L0 34 Z" fill="${side}"/>
      <path d="M38 14 L38 30 L0 50 L0 34 Z" fill="#7a5a38"/>
      <path d="M-38 14 L0 -6 L38 14 L0 2 Z" fill="#6b5340" stroke="${ink}"/>
      <rect x="-8" y="16" width="16" height="16" fill="#1a1410"/>
      <rect x="-28" y="12" width="12" height="8" fill="#e8c47a"/><rect x="16" y="12" width="12" height="8" fill="#e8c47a"/>
    </g>`;
  }

  if (id === 'market' || id === 'embassy') {
    // Market-style awnings for embassy / civic
    return `<g opacity="${ghost}">
      ${shadow(0, 20, 36, 12)}
      <path d="M-32 12 L0 -4 L32 12 L0 28 Z" fill="${face}" stroke="${ink}"/>
      <path d="M-32 12 L-32 24 L0 40 L0 28 Z" fill="${side}"/>
      <path d="M32 12 L32 24 L0 40 L0 28 Z" fill="#7a5a38"/>
      <path d="M-34 6 Q-16 -8 0 2 Q16 -8 34 6 L32 12 L0 0 L-32 12 Z" fill="#c45c4a" stroke="${ink}"/>
      <path d="M-34 6 Q-16 -8 0 2 Q16 -8 34 6" fill="none" stroke="#f3e6d0" stroke-width="2" stroke-dasharray="6 4"/>
      <rect x="-6" y="14" width="12" height="14" fill="#1a1410"/>
      <rect x="-2" y="-18" width="3" height="14" fill="#3a2a18"/>
      <path class="flag-wave" d="M1 -18 L14 -14 L1 -10 Z" fill="#e8c47a"/>
    </g>`;
  }

  if (id === 'hospital') {
    return `<g opacity="${ghost}">
      ${shadow(0, 20, 34, 12)}
      <path d="M-30 12 L0 -4 L30 12 L0 28 Z" fill="${face}" stroke="${ink}"/>
      <path d="M-30 12 L-30 26 L0 42 L0 28 Z" fill="${side}"/>
      <path d="M30 12 L30 26 L0 42 L0 28 Z" fill="#7a5a38"/>
      <path d="M-30 12 L0 -4 L30 12 L20 4 L0 -10 L-20 4 Z" fill="#e8d4a8" stroke="${ink}"/>
      <rect x="-4" y="8" width="8" height="20" fill="#fff8ea"/><rect x="-12" y="14" width="24" height="8" fill="#fff8ea"/>
      <circle cx="0" cy="-14" r="5" fill="#c45c4a" stroke="${ink}"/>
    </g>`;
  }

  if (id === 'academy') {
    return `<g opacity="${ghost}">
      ${shadow(0, 22, 34, 12)}
      <path d="M-28 14 L0 0 L28 14 L0 28 Z" fill="${face}" stroke="${ink}"/>
      <path d="M-28 14 L-28 28 L0 42 L0 28 Z" fill="${side}"/>
      <path d="M28 14 L28 28 L0 42 L0 28 Z" fill="#7a5a38"/>
      <path d="M-32 14 L0 -18 L32 14 Z" fill="#6b5340" stroke="${ink}"/>
      <circle cx="0" cy="-6" r="5" fill="#e8c47a" stroke="${ink}"/>
      <rect x="-6" y="16" width="12" height="14" fill="#1a1410"/>
    </g>`;
  }

  if (id === 'shrine') {
    return `<g opacity="${ghost}">
      ${shadow(0, 20, 28, 10)}
      <path d="M-16 18 L0 -30 L16 18 Z" fill="url(#goldDome)" stroke="${ink}" stroke-width="1.3"/>
      <path d="M-16 18 L-16 28 L16 28 L16 18" fill="${side}"/>
      <ellipse cx="0" cy="-8" rx="10" ry="6" fill="rgba(255,240,180,0.45)"/>
      <circle cx="0" cy="-28" r="4" fill="#fff8ea" stroke="${ink}"/>
    </g>`;
  }

  if (id === 'wall') {
    return `<g opacity="${ghost}">
      ${shadow(0, 16, 48, 10)}
      <path d="M-50 8 L0 -12 L50 8 L0 28 Z" fill="${face}" stroke="${ink}"/>
      <path d="M-50 8 L-50 18 L0 38 L0 28 Z" fill="${side}"/>
      <path d="M50 8 L50 18 L0 38 L0 28 Z" fill="#7a5a38"/>
      <path d="M-50 8 L-40 -2 L-30 8 L-20 -2 L-10 8 L0 -2 L10 8 L20 -2 L30 8 L40 -2 L50 8"
        fill="#c4a06a" stroke="${ink}" stroke-width="0.8"/>
      <rect x="-8" y="10" width="16" height="14" fill="#1a1410"/>
    </g>`;
  }

  if (id === 'lumber') {
    return `<g opacity="${ghost}">
      ${shadow(0, 18, 30, 11)}
      <rect x="-3" y="-8" width="6" height="28" fill="#5c4030" stroke="${ink}"/>
      <ellipse cx="0" cy="-14" rx="20" ry="14" fill="#2d6b32" stroke="${ink}"/>
      <ellipse cx="-10" cy="-22" rx="12" ry="10" fill="#4a8a3a"/>
      <ellipse cx="10" cy="-20" rx="11" ry="9" fill="#3d7040"/>
      <rect x="-22" y="14" width="18" height="6" rx="1" fill="#6b5340" stroke="${ink}" transform="rotate(-12)"/>
    </g>`;
  }

  if (id === 'quarry') {
    return `<g opacity="${ghost}">
      ${shadow(0, 18, 32, 11)}
      <path d="M-28 16 L-16 -8 L4 -18 L24 -4 L30 16 Z" fill="#a8b0b8" stroke="${ink}"/>
      <path d="M-16 -8 L4 -18 L8 4 L-10 12 Z" fill="#d0d6dc" opacity="0.7"/>
      <circle cx="12" cy="6" r="5" fill="#6a7078" stroke="${ink}"/>
    </g>`;
  }

  if (id === 'goldmine') {
    return `<g opacity="${ghost}">
      ${shadow(0, 18, 30, 11)}
      <path d="M-26 18 L-14 -4 L0 -20 L14 -4 L26 18 Z" fill="#5c4030" stroke="${ink}"/>
      <path d="M-10 18 V0 H10 V18" fill="#1a1010"/>
      <circle cx="0" cy="-2" r="8" fill="#f0c040" stroke="#8b6914" stroke-width="1.3"/>
      <circle cx="0" cy="-2" r="12" fill="none" stroke="#e8c47a" stroke-opacity="0.5">
        <animate attributeName="r" values="9;14;9" dur="2.6s" repeatCount="indefinite"/>
      </circle>
    </g>`;
  }

  // default house with blue dome
  return `<g opacity="${ghost}">
    ${shadow(0, 18, 30, 11)}
    <path d="M-28 12 L0 -4 L28 12 L0 28 Z" fill="${face}" stroke="${ink}"/>
    <path d="M-28 12 L-28 24 L0 40 L0 28 Z" fill="${side}"/>
    <path d="M28 12 L28 24 L0 40 L0 28 Z" fill="#7a5a38"/>
    <ellipse cx="0" cy="-8" rx="12" ry="9" fill="url(#roofBlue)" stroke="${ink}"/>
    <rect x="-5" y="14" width="10" height="12" fill="#1a1410"/>
  </g>`;
}

function floatingMarker(kind, x, y) {
  const icon = kind === 'quest'
    ? `<path d="M-5 -6 h10 v12 h-10 z" fill="#f3e6d0"/><path d="M-3 -2 h6 M-3 2 h6 M-3 5 h4" stroke="#3a2a18" stroke-width="1.2"/>`
    : `<path d="M-2 -7 v10 M-6 0 h8" stroke="#f3e6d0" stroke-width="2.2" stroke-linecap="round"/><path d="M2 3 L6 7 L2 7 Z" fill="#f3e6d0"/>`;
  return `<g class="float-marker" transform="translate(${x},${y})">
    <circle cx="0" cy="0" r="14" fill="#2a4058" stroke="#c4a06a" stroke-width="2.5"/>
    <circle cx="0" cy="0" r="11" fill="none" stroke="#e8c47a" stroke-width="1" opacity="0.5"/>
    ${icon}
  </g>`;
}

function cityLifeLayer() {
  const trees = [
    [-250, 165, .9], [-210, 235, .7], [238, 132, .85], [270, 238, .72],
    [-230, 330, .72], [245, 335, .86], [-92, 112, .55], [105, 106, .6],
  ].map(([x, y, s]) => palm(OX + x, OY + y, s)).join('');
  const stalls = [
    `<g transform="translate(${OX - 236},${OY + 292})"><ellipse cx="0" cy="18" rx="32" ry="10" fill="rgba(40,24,8,.22)"/><path d="M-24 2 L0 -10 L24 2 L0 14 Z" fill="#c45c4a" stroke="#3a2a18"/><path d="M-24 2 V15 M24 2 V15" stroke="#5c4030" stroke-width="3"/><path d="M-10 -3 V10 M10 -3 V10" stroke="#e8c47a" stroke-width="2"/></g>`,
    `<g transform="translate(${OX + 230},${OY + 285})"><ellipse cx="0" cy="18" rx="30" ry="9" fill="rgba(40,24,8,.22)"/><path d="M-22 2 L0 -9 L22 2 L0 13 Z" fill="#3d7890" stroke="#3a2a18"/><path d="M-22 2 V14 M22 2 V14" stroke="#5c4030" stroke-width="3"/><circle cx="0" cy="2" r="5" fill="#f0c040"/></g>`,
  ].join('');
  const roads = `<g class="city-roads" opacity=".78"><path d="M${OX - 270} ${OY + 335} Q${OX - 90} ${OY + 285} ${OX} ${OY + 300} T${OX + 270} ${OY + 330}" fill="none" stroke="#b98955" stroke-width="18" stroke-linecap="round"/><path d="M${OX} ${OY + 300} Q${OX - 30} ${OY + 225} ${OX - 15} ${OY + 138}" fill="none" stroke="#c89b64" stroke-width="13" stroke-linecap="round"/><path d="M${OX + 4} ${OY + 302} Q${OX + 90} ${OY + 236} ${OX + 215} ${OY + 188}" fill="none" stroke="#c89b64" stroke-width="12" stroke-linecap="round"/><path d="M${OX - 270} ${OY + 335} Q${OX - 90} ${OY + 285} ${OX} ${OY + 300} T${OX + 270} ${OY + 330}" fill="none" stroke="#e4bd82" stroke-width="2" stroke-dasharray="7 8" opacity=".6"/></g>`;
  const carts = `<g class="city-carts" opacity=".9"><g transform="translate(${OX - 192},${OY + 315})"><circle cx="-7" cy="7" r="5" fill="#5c4030"/><circle cx="10" cy="7" r="5" fill="#5c4030"/><path d="M-13 2 L-2 -8 H15 V4 H-13 Z" fill="#a86848" stroke="#3a2a18"/></g><g transform="translate(${OX + 185},${OY + 315})"><circle cx="-7" cy="7" r="5" fill="#5c4030"/><circle cx="10" cy="7" r="5" fill="#5c4030"/><path d="M-13 2 L-2 -8 H15 V4 H-13 Z" fill="#4a7890" stroke="#3a2a18"/></g></g>`;
  return `<g class="city-life-layer">${roads}${trees}${stalls}${carts}</g>`;
}

function buildingOrnaments(id, built, level) {
  if (!built) return `<g opacity=".45"><path d="M-18 12 H18" stroke="#f0d29a" stroke-width="1" stroke-dasharray="3 3"/></g>`;
  const banner = `<path d="M19 -25 V6" stroke="#3a2a18" stroke-width="2"/><path d="M20 -25 L34 -20 L20 -15 Z" fill="${level >= 4 ? '#d7a95f' : '#c45c4a'}" stroke="#3a2a18" stroke-width=".6"/>`;
  const arches = `<path d="M-18 15 Q-12 4 -6 15 M-3 15 Q3 4 9 15 M12 15 Q18 4 24 15" fill="none" stroke="#f7e5bc" stroke-width="2" opacity=".7"/>`;
  if (id === 'palace') return `<g class="palace-ornaments"><path d="M-48 20 Q-38 1 -28 20 M-22 20 Q-12 1 -2 20 M4 20 Q14 1 24 20 M30 20 Q40 1 50 20" fill="none" stroke="#fff1c6" stroke-width="3" opacity=".8"/><path d="M-54 24 H54" stroke="#e8c47a" stroke-width="2"/><circle cx="0" cy="-8" r="4" fill="#8bd0c5" opacity=".8"/>${level >= 3 ? `<path d="M-62 36 Q0 50 62 36" fill="none" stroke="#4a9aaa" stroke-width="2" opacity=".65"/>` : ''}</g>`;
  if (id === 'farm') return `<g class="farm-ornaments"><path d="M-26 7 L-18 0 M-16 10 L-8 3 M-6 13 L2 6 M4 15 L12 8" stroke="#f0d29a" stroke-width="1.5"/>${banner}</g>`;
  if (id === 'lumber') return `<g class="lumber-ornaments"><path d="M-26 13 L-13 7 L0 13 L13 7 L26 13" fill="none" stroke="#d7a95f" stroke-width="2"/>${banner}</g>`;
  if (id === 'quarry' || id === 'goldmine') return `<g class="mine-ornaments"><path d="M-18 8 L-8 -2 L2 8 L12 -2 L22 8" fill="none" stroke="#e8c47a" stroke-width="2"/>${banner}</g>`;
  return `<g class="building-ornaments">${arches}${banner}</g>`;
}

function richBuildingDetails(id, theme, built, level) {
  const opacity = built ? 1 : 0.38;
  const stone = theme === 'rome' ? '#d9e5ee' : '#f4dfb6';
  const shadowInk = '#4b321e';
  const brass = level >= 4 ? '#f4cc68' : '#c8923e';
  const banner = `<path d="M22 -34 V6" stroke="#332619" stroke-width="2"/><path d="M23 -33 L39 -28 L23 -21 Z" fill="${level >= 4 ? '#e3b64e' : '#a64236'}" stroke="#332619" stroke-width=".7"/>`;
  if (id === 'palace') return `<g class="rich-detail rich-palace" opacity="${opacity}">
    <path d="M-63 28 Q0 52 63 28" fill="none" stroke="#e9c477" stroke-width="4" opacity=".9"/>
    <path d="M-46 26 V43 M-31 31 V49 M31 31 V49 M46 26 V43" stroke="#6c4b2d" stroke-width="3"/>
    <path d="M-39 20 Q-34 6 -29 20 M-18 24 Q-13 9 -8 24 M9 24 Q14 9 19 24 M30 20 Q35 6 40 20" fill="none" stroke="#fff2cf" stroke-width="3"/>
    <circle cx="0" cy="3" r="8" fill="#4d9dab" stroke="#2b5964" stroke-width="2"/><path d="M-4 3 L0 -3 L4 3 L0 7 Z" fill="#d6f0df"/>
    <path d="M-71 41 Q0 62 71 41" fill="none" stroke="#54a5a8" stroke-width="3" opacity=".7"/>
    ${banner}</g>`;
  if (id === 'farm') return `<g class="rich-detail rich-farm" opacity="${opacity}">
    <path d="M-36 3 H-2 M-35 9 H-1 M-34 15 H0" stroke="#d9b46b" stroke-width="2"/>
    <path d="M16 3 L32 -5 L43 1 V15 L27 22 Z" fill="#a9673e" stroke="${shadowInk}" stroke-width="1.5"/><path d="M16 3 L27 10 L43 1" fill="none" stroke="#f1c878" stroke-width="2"/>
    <circle cx="30" cy="16" r="4" fill="#5b3c25"/><path d="M28 10 L31 3" stroke="#4b321e" stroke-width="2"/>${banner}</g>`;
  if (id === 'barracks') return `<g class="rich-detail rich-barracks" opacity="${opacity}">
    <path d="M-35 8 L-27 1 L-19 8 L-11 1 L-3 8 L5 1 L13 8 L21 1 L29 8" fill="none" stroke="#e8c47a" stroke-width="3"/>
    <path d="M-25 18 Q-20 7 -15 18 M-8 21 Q-3 9 2 21 M9 21 Q14 9 19 21" fill="none" stroke="${stone}" stroke-width="3"/>
    <path d="M-29 -2 L-19 -8 M-25 -10 L-15 -16 M25 -2 L15 -8 M29 -10 L19 -16" stroke="#8f6135" stroke-width="3"/>${banner}</g>`;
  if (id === 'archery') return `<g class="rich-detail rich-archery" opacity="${opacity}">
    <circle cx="0" cy="-12" r="8" fill="#c45c4a" stroke="#f0d29a" stroke-width="2"/><circle cx="0" cy="-12" r="3" fill="#f6e3a6"/>
    <path d="M-18 9 Q0 -7 18 9 M-13 12 Q0 0 13 12" fill="none" stroke="#e8c47a" stroke-width="2"/><path d="M-22 -5 L-8 -18 M-18 0 L-4 -13" stroke="#70482b" stroke-width="2"/>${banner}</g>`;
  if (id === 'warehouse') return `<g class="rich-detail rich-warehouse" opacity="${opacity}">
    <rect x="-29" y="8" width="12" height="10" fill="#b9793f" stroke="${shadowInk}"/><rect x="18" y="5" width="13" height="12" fill="#d6a05b" stroke="${shadowInk}"/><path d="M-24 9 V18 M-18 9 V18 M23 6 V17 M29 6 V17" stroke="#754a2a" stroke-width="1"/>
    <path d="M-7 21 H7 M-5 17 V24 M5 17 V24" stroke="#e7c174" stroke-width="2"/>${banner}</g>`;
  if (id === 'embassy' || id === 'market') return `<g class="rich-detail rich-market" opacity="${opacity}">
    <path d="M-39 5 Q-29 -5 -19 5 Q-9 -5 1 5 Q11 -5 21 5 Q31 -5 41 5" fill="#3f8190" stroke="#332619" stroke-width="1.5"/>
    <path d="M-34 6 V18 M-14 6 V18 M7 6 V18 M28 6 V18" stroke="#f1d49a" stroke-width="2"/>
    <circle cx="-20" cy="20" r="3" fill="#e8c47a"/><circle cx="20" cy="20" r="3" fill="#c45c4a"/>${banner}</g>`;
  if (id === 'hospital') return `<g class="rich-detail rich-hospital" opacity="${opacity}">
    <path d="M-5 2 V25 M-16 13 H6" stroke="#b74138" stroke-width="4"/><path d="M-25 -2 Q0 -18 25 -2" fill="none" stroke="#fff6dc" stroke-width="3"/>
    <circle cx="22" cy="-13" r="5" fill="#f2c45d" stroke="#6b4324"/><path d="M22 -8 V2" stroke="#6b4324" stroke-width="2"/>${banner}</g>`;
  if (id === 'academy') return `<g class="rich-detail rich-academy" opacity="${opacity}">
    <path d="M-22 -4 L0 -18 L22 -4 L0 8 Z" fill="#4c7290" stroke="#2f3c4d" stroke-width="2"/><path d="M0 8 V18 M-14 13 H14" stroke="#e6c77b" stroke-width="2"/>
    <circle cx="0" cy="-5" r="4" fill="#fff2b6"/><path d="M-17 17 H-6 M6 17 H17" stroke="#d7a95f" stroke-width="2"/>${banner}</g>`;
  if (id === 'shrine') return `<g class="rich-detail rich-shrine" opacity="${opacity}">
    <path d="M-14 17 H14 M-10 12 H10" stroke="#f6df9b" stroke-width="3"/><circle cx="0" cy="-7" r="7" fill="#5fa8a7" stroke="#f0d29a" stroke-width="2"/><path d="M0 -28 V-18 M-5 -23 H5" stroke="#f5dc91" stroke-width="2"/>${banner}</g>`;
  if (id === 'wall') return `<g class="rich-detail rich-wall" opacity="${opacity}"><path d="M-45 -1 H45 M-37 6 H37" stroke="#d9c394" stroke-width="2" stroke-dasharray="8 4"/><path d="M-6 9 V24 M6 9 V24" stroke="#4a321e" stroke-width="3"/>${banner}</g>`;
  if (id === 'lumber') return `<g class="rich-detail rich-lumber" opacity="${opacity}"><path d="M-28 17 L-5 6 L18 17" fill="none" stroke="#e2b768" stroke-width="3"/><path d="M-17 17 L-5 4 M-2 17 L10 4" stroke="#7a4e2a" stroke-width="3"/><circle cx="25" cy="7" r="6" fill="#d8a060" stroke="#654125"/>${banner}</g>`;
  if (id === 'quarry') return `<g class="rich-detail rich-quarry" opacity="${opacity}"><path d="M-21 11 L-11 -5 L0 9 L9 -12 L23 11" fill="none" stroke="#e1e5e4" stroke-width="3"/><circle cx="-8" cy="13" r="4" fill="#c8d0d3"/><circle cx="12" cy="16" r="3" fill="#87939b"/>${banner}</g>`;
  if (id === 'goldmine') return `<g class="rich-detail rich-goldmine" opacity="${opacity}"><path d="M-15 15 L-8 4 H8 L15 15" fill="none" stroke="#e8c47a" stroke-width="3"/><circle cx="-10" cy="8" r="3" fill="#ffd965"/><circle cx="11" cy="5" r="3" fill="#ffe88e"/><path d="M-1 -14 V-5" stroke="#f3d47c" stroke-width="2"/>${banner}</g>`;
  return `<g class="rich-detail rich-default" opacity="${opacity}"><path d="M-20 12 Q0 -3 20 12" fill="none" stroke="${stone}" stroke-width="2"/>${banner}</g>`;
}

function richSprite(id, theme, built, level = 1) {
  return `<g class="building-art-pack">${sprite(id, theme, built)}${richBuildingDetails(id, theme, built, level)}</g>`;
}

function scaffoldOverlay() {
  // Wooden scaffolding hint for "under upgrade" feel near wall/build plots
  return `<g class="scaffold" opacity="0.85" transform="translate(${OX + 140},${OY + 300})">
    <line x1="-20" y1="0" x2="-20" y2="-40" stroke="#6b5340" stroke-width="3"/>
    <line x1="20" y1="0" x2="20" y2="-40" stroke="#6b5340" stroke-width="3"/>
    <line x1="-24" y1="-20" x2="24" y2="-20" stroke="#8a7048" stroke-width="4"/>
    <line x1="-24" y1="-36" x2="24" y2="-36" stroke="#8a7048" stroke-width="3"/>
    <path d="M24 -36 L48 -50 L52 -46 L28 -32 Z" fill="#6b5340"/>
  </g>`;
}

export function buildCastleInteriorHtml(tables, state, selectedBuildingId, factionLabel = '') {
  const layout = tables.world.castleInteriorLayout;
  const theme = state.factionId;
  const factionAr = factionLabel || state.factionId;
  const buildings = [...layout.buildings].sort((a, b) => (a.col + a.row) - (b.col + b.row));

  const sprites = buildings.map((b) => {
    const lvl = state.buildings[b.id] || 0;
    const built = lvl > 0;
    const selected = selectedBuildingId === b.id;
    const p = isoCenter(b);
    const scale = b.id === 'palace' ? 1.55 : b.id === 'wall' ? 1.15 : b.w > 1 ? 1.2 : 1.12;
    const yOff = b.id === 'palace' ? -18 : 0;
    const marker = b.id === 'palace' || b.id === 'farm' || selected
      ? floatingMarker(b.id === 'palace' ? 'quest' : 'build', 22, -48)
      : '';
    const ring = selected
      ? `<ellipse cx="0" cy="18" rx="42" ry="16" fill="none" stroke="#e8c47a" stroke-width="2.5" stroke-dasharray="5 3" opacity="0.95"/>`
      : '';
    return `<g class="iso-bldg ${selected ? 'is-selected' : ''} ${built ? 'is-built' : 'is-ghost'}"
        data-building="${b.id}" transform="translate(${p.x},${p.y + yOff}) scale(${scale})">
      ${ring}
      ${richSprite(b.id, theme, built, lvl)}
      ${buildingOrnaments(b.id, built, lvl)}
      ${marker}
      <g class="iso-badge" transform="translate(-28,-36)">
        <rect x="-10" y="-8" width="28" height="16" rx="3" fill="#1a2433" stroke="#e8c47a" stroke-width="1.2"/>
        <text x="4" y="4" text-anchor="middle" font-size="11" fill="#e8c47a" font-family="Cairo,sans-serif" font-weight="700">${built ? `م${lvl}` : '—'}</text>
      </g>
    </g>`;
  }).join('');

  // Hit targets — percentage of viewBox for overlay buttons
  const hits = buildings.map((b) => {
    const p = isoCenter(b);
    const name = tables.buildings.buildings[b.id]?.nameAr || b.id;
    const short = GLYPH[b.id] || name;
    const lvl = state.buildings[b.id] || 0;
    const selected = selectedBuildingId === b.id;
    const left = ((p.x - 40) / VB_W) * 100;
    const top = ((p.y - 55) / VB_H) * 100;
    const w = b.id === 'palace' ? 14 : 10;
    const h = b.id === 'palace' ? 12 : 9;
    return `<button type="button" class="castle-plot ${selected ? 'is-selected' : ''} plot-${b.id}"
      data-building="${b.id}" aria-label="${esc(name)}" title="${esc(name)}"
      style="left:${left}%;top:${top}%;width:${w}%;height:${h}%;">
      <span class="plot-label">${esc(short)}</span>
    </button>`;
  }).join('');

  return `
    <div class="castle-stage theme-${theme} castle-iso-mode">
      <div class="castle-hour-sky" aria-hidden="true"></div>
      <div class="castle-brand"><span>عروش العصور</span> · داخل القلعة</div>
      <div class="castle-iso-wrap">
        <svg class="castle-iso-svg" viewBox="0 0 ${VB_W} ${VB_H}" role="img" aria-label="داخل القلعة">
          ${defs()}
          <rect width="${VB_W}" height="${VB_H}" fill="url(#hourGlow)"/>
          ${groundLayer()}
          ${cityLifeLayer()}
          ${wallRing()}
          ${scaffoldOverlay()}
          ${sprites}
          <!-- tiny soldiers for life -->
          <g opacity="0.85" transform="translate(${OX - 30},${OY + 250})">
            <ellipse cx="0" cy="4" rx="8" ry="3" fill="rgba(0,0,0,0.25)"/>
            <rect x="-2" y="-8" width="3" height="10" fill="#4a5a40"/>
            <rect x="4" y="-8" width="3" height="10" fill="#4a5a40"/>
            <line x1="-1" y1="-6" x2="-1" y2="-16" stroke="#c4a06a" stroke-width="1"/>
            <line x1="5" y1="-6" x2="5" y2="-16" stroke="#c4a06a" stroke-width="1"/>
          </g>
        </svg>
        <div class="castle-hit-layer">${hits}</div>
      </div>
      <p class="castle-caption">${esc(state.playerName)} — ${esc(factionAr)} · قصر ${state.buildings.palace || 0}</p>
    </div>`;
}
