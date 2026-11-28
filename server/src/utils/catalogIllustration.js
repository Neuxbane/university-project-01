/**
 * Generated picture for a Master Barang product that has no photo in the shop catalog and no size
 * illustration to reuse (emblems, rings, nuts without a diameter, spare parts, oils, services).
 * Same 640×400 canvas and card-safe centre square as sizeIllustration.js; the drawing only says what
 * kind of product it is, the product name comes from the catalog.
 * Written to uploads/bolts/katalog/<code>.svg.
 */
const fs = require('fs');
const path = require('path');
const { UPLOADS_DIR } = require('./uploadPaths');

const CATALOG_PREFIX = '/uploads/bolts/katalog/';
const CATALOG_DIR = path.join(UPLOADS_DIR, 'bolts/katalog');

const W = 640;
const H = 400;
const CX = 320;
const CY = 112;
const INK = '#18181B';
const FILL = '#E4E4E7';
const SHADE = '#A1A1AA';
const MUTED = '#52525B';

const TYPE_LABELS = {
  BAUT: 'Baut',
  MUR: 'Mur',
  RING: 'Ring',
  EMBLEM: 'Emblem',
  PART: 'Sparepart & aksesoris',
  PERAWATAN: 'Oli & perawatan',
  JASA: 'Jasa',
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const stroke = `stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"`;

function hexagon(cx, cy, r, extra = '') {
  const pts = [0, 60, 120, 180, 240, 300]
    .map((a) => `${(cx + r * Math.cos((a * Math.PI) / 180)).toFixed(1)},${(cy + r * Math.sin((a * Math.PI) / 180)).toFixed(1)}`)
    .join(' ');
  return `<polygon points="${pts}" fill="${FILL}" ${stroke} ${extra}/>`;
}

// --- drawings, each centred on (CX, CY) inside roughly 260×150 ---
const DRAW = {
  bolt: () => [
    `<rect x="${CX - 120}" y="${CY - 44}" width="52" height="88" rx="4" fill="${FILL}" ${stroke}/>`,
    `<line x1="${CX - 120}" y1="${CY - 18}" x2="${CX - 68}" y2="${CY - 18}" stroke="${INK}" stroke-width="1.6"/>`,
    `<line x1="${CX - 120}" y1="${CY + 18}" x2="${CX - 68}" y2="${CY + 18}" stroke="${INK}" stroke-width="1.6"/>`,
    `<path d="M${CX - 68},${CY - 22} H${CX + 112} L${CX + 124},${CY - 10} V${CY + 10} L${CX + 112},${CY + 22} H${CX - 68} Z" fill="${FILL}" ${stroke}/>`,
    ...Array.from({ length: 13 }, (_, i) => `<line x1="${CX - 10 + i * 10}" y1="${CY - 20}" x2="${CX - 4 + i * 10}" y2="${CY + 20}" stroke="${SHADE}" stroke-width="1.4"/>`),
  ],
  nut: () => [hexagon(CX, CY, 68), `<circle cx="${CX}" cy="${CY}" r="30" fill="#FFFFFF" ${stroke}/>`, `<circle cx="${CX}" cy="${CY}" r="24" fill="none" stroke="${SHADE}" stroke-width="1.4" stroke-dasharray="4 3"/>`],
  capNut: () => [
    `<path d="M${CX - 60},${CY + 10} V${CY - 6} A60,58 0 0 1 ${CX + 60},${CY - 6} V${CY + 10} Z" fill="${FILL}" ${stroke}/>`,
    `<rect x="${CX - 72}" y="${CY + 10}" width="144" height="46" rx="3" fill="${FILL}" ${stroke}/>`,
    `<line x1="${CX - 24}" y1="${CY + 10}" x2="${CX - 24}" y2="${CY + 56}" stroke="${INK}" stroke-width="1.6"/>`,
    `<line x1="${CX + 24}" y1="${CY + 10}" x2="${CX + 24}" y2="${CY + 56}" stroke="${INK}" stroke-width="1.6"/>`,
  ],
  washer: () => [`<circle cx="${CX}" cy="${CY}" r="70" fill="${FILL}" ${stroke}/>`, `<circle cx="${CX}" cy="${CY}" r="30" fill="#FFFFFF" ${stroke}/>`, `<circle cx="${CX}" cy="${CY}" r="52" fill="none" stroke="${SHADE}" stroke-width="1.4"/>`],
  rod: () => [
    `<rect x="${CX - 130}" y="${CY - 12}" width="250" height="24" rx="6" fill="${FILL}" ${stroke}/>`,
    hexagon(CX + 132, CY, 22),
    `<rect x="${CX - 142}" y="${CY - 22}" width="16" height="44" rx="3" fill="${FILL}" ${stroke}/>`,
  ],
  spring: () => {
    const coils = Array.from({ length: 9 }, (_, i) => `<ellipse cx="${CX - 104 + i * 26}" cy="${CY}" rx="13" ry="50" fill="none" ${stroke}/>`);
    return [`<line x1="${CX - 150}" y1="${CY}" x2="${CX - 117}" y2="${CY}" ${stroke}/>`, ...coils, `<line x1="${CX + 117}" y1="${CY}" x2="${CX + 150}" y2="${CY}" ${stroke}/>`];
  },
  plate: () => [
    `<rect x="${CX - 110}" y="${CY - 62}" width="220" height="124" rx="16" fill="${FILL}" ${stroke}/>`,
    ...[[-84, -38], [84, -38], [-84, 38], [84, 38]].map(([x, y]) => `<circle cx="${CX + x}" cy="${CY + y}" r="8" fill="#FFFFFF" ${stroke}/>`),
    ...Array.from({ length: 5 }, (_, i) => `<line x1="${CX - 60}" y1="${CY - 32 + i * 16}" x2="${CX + 60}" y2="${CY - 32 + i * 16}" stroke="${SHADE}" stroke-width="2"/>`),
  ],
  disc: () => [
    `<circle cx="${CX}" cy="${CY}" r="68" fill="${FILL}" ${stroke}/>`,
    `<circle cx="${CX}" cy="${CY}" r="50" fill="none" stroke="${SHADE}" stroke-width="2"/>`,
    ...[0, 90, 180, 270].map((a) => `<circle cx="${(CX + 58 * Math.cos((a * Math.PI) / 180)).toFixed(1)}" cy="${(CY + 58 * Math.sin((a * Math.PI) / 180)).toFixed(1)}" r="5" fill="#FFFFFF" ${stroke}/>`),
  ],
  banjo: () => [
    `<circle cx="${CX - 50}" cy="${CY}" r="46" fill="${FILL}" ${stroke}/>`,
    `<circle cx="${CX - 50}" cy="${CY}" r="18" fill="#FFFFFF" ${stroke}/>`,
    `<rect x="${CX - 6}" y="${CY - 14}" width="130" height="28" rx="4" fill="${FILL}" ${stroke}/>`,
  ],
  grip: () => [
    `<rect x="${CX - 120}" y="${CY - 32}" width="240" height="64" rx="28" fill="${FILL}" ${stroke}/>`,
    ...Array.from({ length: 10 }, (_, i) => `<line x1="${CX - 90 + i * 20}" y1="${CY - 28}" x2="${CX - 90 + i * 20}" y2="${CY + 28}" stroke="${SHADE}" stroke-width="2.2"/>`),
  ],
  clamp: () => [
    `<path d="M${CX + 40},${CY - 58} A70,64 0 1 0 ${CX + 40},${CY + 58}" fill="none" stroke="${INK}" stroke-width="16" stroke-linecap="round"/>`,
    `<path d="M${CX + 40},${CY - 58} A70,64 0 1 0 ${CX + 40},${CY + 58}" fill="none" stroke="${FILL}" stroke-width="10" stroke-linecap="round"/>`,
    `<rect x="${CX + 34}" y="${CY - 72}" width="26" height="144" rx="5" fill="${FILL}" ${stroke}/>`,
  ],
  cylinder: () => [
    `<rect x="${CX - 52}" y="${CY - 60}" width="104" height="124" rx="10" fill="${FILL}" ${stroke}/>`,
    `<ellipse cx="${CX}" cy="${CY - 60}" rx="52" ry="12" fill="${FILL}" ${stroke}/>`,
    `<line x1="${CX - 30}" y1="${CY - 34}" x2="${CX - 30}" y2="${CY + 44}" stroke="${SHADE}" stroke-width="2.4"/>`,
  ],
  hook: () => [
    `<path d="M${CX - 20},${CY - 66} V${CY + 20} A40,40 0 0 0 ${CX + 60},${CY + 20} V${CY - 4}" fill="none" stroke="${INK}" stroke-width="18" stroke-linecap="round"/>`,
    `<path d="M${CX - 20},${CY - 66} V${CY + 20} A40,40 0 0 0 ${CX + 60},${CY + 20} V${CY - 4}" fill="none" stroke="${FILL}" stroke-width="11" stroke-linecap="round"/>`,
    `<rect x="${CX - 44}" y="${CY - 80}" width="48" height="22" rx="5" fill="${FILL}" ${stroke}/>`,
  ],
  bottle: () => [
    `<rect x="${CX - 16}" y="${CY - 78}" width="32" height="22" rx="3" fill="${SHADE}" ${stroke}/>`,
    `<path d="M${CX - 22},${CY - 56} H${CX + 22} L${CX + 50},${CY - 24} V${CY + 66} H${CX - 50} V${CY - 24} Z" fill="${FILL}" ${stroke}/>`,
    `<rect x="${CX - 36}" y="${CY - 4}" width="72" height="44" rx="4" fill="#FFFFFF" stroke="${INK}" stroke-width="1.8"/>`,
  ],
  cloth: () => [0, 1, 2].map((i) => `<rect x="${CX - 92 + i * 12}" y="${CY - 54 + i * 18}" width="160" height="70" rx="10" fill="${i === 2 ? FILL : '#F4F4F5'}" ${stroke}/>`),
  flame: () => [
    `<path d="M${CX},${CY - 78} C${CX + 34},${CY - 36} ${CX + 62},${CY - 6} ${CX + 56},${CY + 30} C${CX + 50},${CY + 66} ${CX - 50},${CY + 66} ${CX - 56},${CY + 30} C${CX - 62},${CY - 4} ${CX - 30},${CY - 24} ${CX},${CY - 78} Z" fill="${FILL}" ${stroke}/>`,
    `<path d="M${CX},${CY - 20} C${CX + 22},${CY + 6} ${CX + 28},${CY + 26} ${CX + 20},${CY + 44} C${CX + 12},${CY + 60} ${CX - 12},${CY + 60} ${CX - 20},${CY + 44} C${CX - 26},${CY + 24} ${CX - 14},${CY + 8} ${CX},${CY - 20} Z" fill="#FFFFFF" stroke="${INK}" stroke-width="2"/>`,
  ],
  drops: () => [-70, 0, 70].map((dx, i) => `<path d="M${CX + dx},${CY - 56 + i * 8} C${CX + dx + 30},${CY - 8} ${CX + dx + 34},${CY + 34} ${CX + dx},${CY + 44} C${CX + dx - 34},${CY + 34} ${CX + dx - 30},${CY - 8} ${CX + dx},${CY - 56 + i * 8} Z" fill="${['#93C5FD', '#C4B5FD', '#FCD34D'][i]}" ${stroke}/>`),
  machine: () => [
    `<rect x="${CX - 100}" y="${CY - 50}" width="200" height="110" rx="10" fill="${FILL}" ${stroke}/>`,
    `<rect x="${CX - 78}" y="${CY - 30}" width="80" height="46" rx="4" fill="#FFFFFF" stroke="${INK}" stroke-width="1.8"/>`,
    `<circle cx="${CX + 48}" cy="${CY - 6}" r="18" fill="#FFFFFF" ${stroke}/>`,
    `<line x1="${CX + 48}" y1="${CY - 6}" x2="${CX + 58}" y2="${CY - 16}" ${stroke}/>`,
  ],
  wrench: () => [
    `<path d="M${CX - 96},${CY + 48} L${CX + 34},${CY - 34}" stroke="${INK}" stroke-width="30" stroke-linecap="round"/>`,
    `<path d="M${CX - 96},${CY + 48} L${CX + 34},${CY - 34}" stroke="${FILL}" stroke-width="22" stroke-linecap="round"/>`,
    `<circle cx="${CX + 60}" cy="${CY - 50}" r="40" fill="${FILL}" ${stroke}/>`,
    `<path d="M${CX + 52},${CY - 98} L${CX + 82},${CY - 70} L${CX + 62},${CY - 46} L${CX + 34},${CY - 72} Z" fill="#FFFFFF" ${stroke}/>`,
  ],
};

// Emblem: a titanium badge carrying the emblem text
function badge(name) {
  const text = String(name).replace(/^(emblem|logo)\s+/i, '').trim().toUpperCase() || 'EMBLEM';
  const shown = text.length > 16 ? `${text.slice(0, 15)}…` : text;
  // keep the text inside the 276 px badge (Arial Black is about 0.78 em per capital)
  const size = Math.max(18, Math.min(46, Math.floor(264 / (0.78 * shown.length))));
  return [
    `<defs><linearGradient id="ti" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#60A5FA"/><stop offset="0.5" stop-color="#A78BFA"/><stop offset="1" stop-color="#FBBF24"/></linearGradient></defs>`,
    `<rect x="${CX - 150}" y="${CY - 54}" width="300" height="108" rx="22" fill="url(#ti)" ${stroke}/>`,
    `<rect x="${CX - 138}" y="${CY - 42}" width="276" height="84" rx="14" fill="none" stroke="#FFFFFF" stroke-opacity="0.7" stroke-width="2"/>`,
    `<text x="${CX}" y="${CY + size * 0.36}" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-size="${size}" font-weight="900" fill="#18181B">${esc(shown)}</text>`,
  ];
}

const PART_SHAPES = [
  [/^(as |as$|pangkon|mounting|paha|jalu|monel|l gas)/, 'rod'],
  [/^per /, 'spring'],
  [/^(cover radiator|cover cvt|dudukan|garnish|paket bak|bak )/, 'plate'],
  [/^(cover|koin|tutup|cvt)/, 'disc'],
  [/^banjo/, 'banjo'],
  [/^handgrip/, 'grip'],
  [/^(klem|klip|breket|kawat)/, 'clamp'],
  [/^(tabung|boshing)/, 'cylinder'],
  [/^gantungan/, 'hook'],
  [/^alat/, 'machine'],
  [/^(adjuster|tojosan)/, 'bolt'],
];

function shapeFor({ itemType, name }) {
  const low = String(name).toLowerCase();
  switch (itemType) {
    case 'BAUT': return 'bolt';
    case 'MUR': return /topi|close|tutup/.test(low) ? 'capNut' : 'nut';
    case 'RING': return 'washer';
    case 'PERAWATAN': return low.startsWith('lap') ? 'cloth' : 'bottle';
    case 'JASA': return low.includes('bakar') ? 'flame' : low.includes('bongkar') ? 'wrench' : 'drops';
    case 'PART': return (PART_SHAPES.find(([re]) => re.test(low)) || [null, 'wrench'])[1];
    default: return 'wrench';
  }
}

// product name on up to two centred lines, above the dark gradient that cards draw over the bottom ~30%
function nameLines(name) {
  const words = String(name).split(/\s+/);
  const lines = [''];
  for (const w of words) {
    const cur = lines[lines.length - 1];
    if ((cur + ' ' + w).trim().length <= 24 || !cur) lines[lines.length - 1] = (cur + ' ' + w).trim();
    else if (lines.length < 2) lines.push(w);
    else { lines[1] = `${lines[1].replace(/…$/, '')}…`; break; }
  }
  return lines;
}

function buildCatalogSvg(item) {
  const label = TYPE_LABELS[item.itemType] || 'Barang';
  const body = item.itemType === 'EMBLEM' ? badge(item.name) : DRAW[shapeFor(item)]();
  const lines = nameLines(item.name);
  const text = lines
    .map((line, i) => `<text x="${CX}" y="${222 + i * 28}" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="${INK}">${esc(line)}</text>`)
    .join('\n');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Ilustrasi ${esc(label)}: ${esc(item.name)}">
<rect width="${W}" height="${H}" fill="#FFFFFF"/>
<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" fill="none" stroke="#E4E4E7"/>
${body.join('\n')}
${text}
<text x="${W - 28}" y="364" text-anchor="end" font-family="Arial, sans-serif" font-size="12" font-weight="700" fill="${MUTED}">Ilustrasi barang</text>
<text x="${W - 28}" y="380" text-anchor="end" font-family="Arial, sans-serif" font-size="12" fill="${MUTED}">belum ada foto produk</text>
</svg>
`;
}

/** Writes uploads/bolts/katalog/<code>.svg and returns its public URL. */
function writeCatalogIllustration(item) {
  fs.mkdirSync(CATALOG_DIR, { recursive: true });
  fs.writeFileSync(path.join(CATALOG_DIR, `${item.code}.svg`), buildCatalogSvg(item), 'utf8');
  return `${CATALOG_PREFIX}${item.code}.svg`;
}

module.exports = { CATALOG_PREFIX, CATALOG_DIR, TYPE_LABELS, buildCatalogSvg, writeCatalogIllustration };
