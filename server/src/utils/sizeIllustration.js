/**
 * Generic size illustration for a Master Baut spec (one spec = one size, shared by every brand).
 * Only the diameter and length come from the data and are drawn to true proportion; every bolt gets
 * the same generic hex head. Nuts have no length, spring clip nuts get a clip drawing.
 * Written to uploads/bolts/ukuran/<code>.svg by seed.js and when the admin edits a size.
 */
const fs = require('fs');
const path = require('path');

const ILLUSTRATION_PREFIX = '/uploads/bolts/ukuran/';
const { UPLOADS_DIR } = require('./uploadPaths');
const ILLUSTRATION_DIR = path.join(UPLOADS_DIR, 'bolts/ukuran');

const W = 640;
const H = 400;
// Card thumbnails crop this 16:10 image to its centre square (x 120-520), with a size pill top-left,
// a qty badge bottom-right and a dark gradient over the bottom ~30%. Bolt, Ø and length stay inside that window.
const YC = 185;
const X_LEFT = 136;
const X_RIGHT = 504;
const INK = '#18181B';
const FILL = '#E4E4E7';
const THREAD = '#71717A';
const DIM = '#1D4ED8';
const MUTED = '#52525B';
const HEAD_LEN = 0.7; // generic hex head, in multiples of the diameter
const HEAD_H = 1.75;

const fmt = (v) => String(Number(v));
const f1 = (v) => v.toFixed(1);

const isClipNut = (headType) => String(headType || '').toLowerCase().includes('pegas');

/** Code of a size spec: M{d}x{l} for bolts, MUR-M{d} / MUR-PEGAS-M{d} for nuts (length 0). */
function sizeCode({ diameterMm, lengthMm, headType }) {
  if (Number(lengthMm) > 0) return `M${fmt(diameterMm)}x${fmt(lengthMm)}`;
  return `${isClipNut(headType) ? 'MUR-PEGAS' : 'MUR'}-M${fmt(diameterMm)}`;
}

function sizeCaption({ diameterMm, lengthMm, headType }) {
  return Number(lengthMm) > 0
    ? `Ilustrasi ukuran M${fmt(diameterMm)} × ${fmt(lengthMm)} mm`
    : `Ilustrasi ukuran ${headType} M${fmt(diameterMm)}`;
}

function dimH(x0, x1, y, label, extFromY) {
  return [
    `<line x1="${f1(x0)}" y1="${f1(extFromY)}" x2="${f1(x0)}" y2="${f1(y + 8)}" stroke="${DIM}" stroke-width="1.2"/>`,
    `<line x1="${f1(x1)}" y1="${f1(extFromY)}" x2="${f1(x1)}" y2="${f1(y + 8)}" stroke="${DIM}" stroke-width="1.2"/>`,
    `<line x1="${f1(x0)}" y1="${f1(y)}" x2="${f1(x1)}" y2="${f1(y)}" stroke="${DIM}" stroke-width="1.8" marker-start="url(#a)" marker-end="url(#a)"/>`,
    `<text x="${f1((x0 + x1) / 2)}" y="${f1(y + 26)}" text-anchor="middle" font-family="Arial, sans-serif" font-size="19" font-weight="700" fill="${DIM}">${label}</text>`,
  ].join('\n');
}

function dimV(x, y0, y1, label) {
  return [
    `<line x1="${f1(x)}" y1="${f1(y0)}" x2="${f1(x)}" y2="${f1(y1)}" stroke="${DIM}" stroke-width="1.8" marker-start="url(#a)" marker-end="url(#a)"/>`,
    `<text x="${f1(x - 34)}" y="${f1(y0 - 10)}" font-family="Arial, sans-serif" font-size="19" font-weight="700" fill="${DIM}">${label}</text>`,
  ].join('\n');
}

function scaleBar(s) {
  const mm = [10, 5, 2, 1].find((m) => m * s <= 76) || 1;
  const x0 = 534;
  const x1 = x0 + mm * s;
  const y = 96;
  return [
    `<line x1="${f1(x0)}" y1="${y}" x2="${f1(x1)}" y2="${y}" stroke="${MUTED}" stroke-width="3"/>`,
    `<line x1="${f1(x0)}" y1="${y - 6}" x2="${f1(x0)}" y2="${y + 6}" stroke="${MUTED}" stroke-width="2"/>`,
    `<line x1="${f1(x1)}" y1="${y - 6}" x2="${f1(x1)}" y2="${y + 6}" stroke="${MUTED}" stroke-width="2"/>`,
    `<text x="${f1((x0 + x1) / 2)}" y="${y - 10}" text-anchor="middle" font-family="Arial, sans-serif" font-size="13" fill="${MUTED}">skala ${mm} mm</text>`,
  ].join('\n');
}

function drawingBolt(d, length) {
  const s = Math.min((X_RIGHT - X_LEFT) / (HEAD_LEN * d + length), 140 / (HEAD_H * d));
  const x0 = X_LEFT + ((X_RIGHT - X_LEFT) - (HEAD_LEN * d + length) * s) / 2;
  const hl = HEAD_LEN * d * s;
  const hh = HEAD_H * d * s;
  const sh = d * s;
  const xShank = x0 + hl;
  const xTip = x0 + hl + length * s;
  const chamfer = 0.12 * sh;
  const out = [
    `<rect x="${f1(x0)}" y="${f1(YC - hh / 2)}" width="${f1(hl)}" height="${f1(hh)}" fill="${FILL}" stroke="${INK}" stroke-width="2.4"/>`,
    ...[-0.29, 0.29].map((k) => `<line x1="${f1(x0)}" y1="${f1(YC + k * hh)}" x2="${f1(xShank)}" y2="${f1(YC + k * hh)}" stroke="${INK}" stroke-width="1.6"/>`),
    `<path d="M${f1(xShank)},${f1(YC - sh / 2)} H${f1(xTip - chamfer)} L${f1(xTip)},${f1(YC - sh / 2 + chamfer)} `
      + `V${f1(YC + sh / 2 - chamfer)} L${f1(xTip - chamfer)},${f1(YC + sh / 2)} H${f1(xShank)} Z" fill="${FILL}" stroke="${INK}" stroke-width="2.4"/>`,
  ];
  const step = Math.max(6, sh * 0.2);
  for (let x = xShank + length * s * 0.35; x < xTip - chamfer - 2; x += step) {
    out.push(`<line x1="${f1(x)}" y1="${f1(YC - sh / 2 + 1.5)}" x2="${f1(x + step * 0.55)}" y2="${f1(YC + sh / 2 - 1.5)}" stroke="${THREAD}" stroke-width="1.3"/>`);
  }
  out.push(dimH(xShank, xTip, YC + hh / 2 + 26, `${fmt(length)} mm`, YC + sh / 2 + 4));
  const xd = xShank + length * s * 0.62;
  out.push(dimV(xd, YC - sh / 2, YC + sh / 2, `Ø ${fmt(d)} mm`));
  out.push(scaleBar(s));
  return out.join('\n');
}

function drawingNut(d, clip) {
  const s = 150 / (2.4 * d);
  const xs = 196;
  let w;
  let out;
  if (clip) { // spring clip (U-nut): folded plate seen from the side
    w = 0.9 * d * s;
    const hh = 2.2 * d * s;
    out = [
      `<path d="M${f1(xs)},${f1(YC - hh / 2)} H${f1(xs + w)} A${f1(w / 2)},${f1(w / 2)} 0 0 1 ${f1(xs + w)},${f1(YC - hh / 2 + w)} `
        + `H${f1(xs + w * 0.25)} V${f1(YC + hh / 2)} H${f1(xs)} Z" fill="${FILL}" stroke="${INK}" stroke-width="2.4"/>`,
      `<line x1="${f1(xs + w * 0.62)}" y1="${f1(YC - hh / 2 + w)}" x2="${f1(xs + w * 0.62)}" y2="${f1(YC + hh / 2 - 6)}" stroke="${INK}" stroke-width="2.4"/>`,
    ];
  } else {
    w = 0.8 * d * s;
    const hh = HEAD_H * d * s;
    out = [`<rect x="${f1(xs)}" y="${f1(YC - hh / 2)}" width="${f1(w)}" height="${f1(hh)}" fill="${FILL}" stroke="${INK}" stroke-width="2.4"/>`];
    for (const k of [-0.29, 0.29]) {
      out.push(`<line x1="${f1(xs)}" y1="${f1(YC + k * hh)}" x2="${f1(xs + w)}" y2="${f1(YC + k * hh)}" stroke="${INK}" stroke-width="1.6"/>`);
    }
  }
  for (const y of [YC - (d * s) / 2, YC + (d * s) / 2]) {
    out.push(`<line x1="${f1(xs - 10)}" y1="${f1(y)}" x2="${f1(xs + w + 10)}" y2="${f1(y)}" stroke="${MUTED}" stroke-width="1.5" stroke-dasharray="5 4"/>`);
  }
  out.push(`<text x="${f1(xs + w / 2)}" y="${f1(YC + 1.25 * d * s + 22)}" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="${MUTED}">tampak samping</text>`);
  const cx = 400;
  const r = clip ? 1.1 * d * s : d * s;
  if (clip) {
    out.push(`<rect x="${f1(cx - r)}" y="${f1(YC - r)}" width="${f1(2 * r)}" height="${f1(2 * r)}" rx="6" fill="${FILL}" stroke="${INK}" stroke-width="2.4"/>`);
  } else {
    const pts = [[1, 0], [0.5, 0.866], [-0.5, 0.866], [-1, 0], [-0.5, -0.866], [0.5, -0.866]]
      .map(([c, v]) => `${f1(cx + r * c)},${f1(YC + r * v)}`).join(' ');
    out.push(`<polygon points="${pts}" fill="${FILL}" stroke="${INK}" stroke-width="2.4"/>`);
  }
  out.push(
    `<circle cx="${cx}" cy="${YC}" r="${f1((d * s) / 2)}" fill="#FFFFFF" stroke="${INK}" stroke-width="2.4"/>`,
    `<circle cx="${cx}" cy="${YC}" r="${f1(((d * s) / 2) * 0.82)}" fill="none" stroke="${THREAD}" stroke-width="1.3" stroke-dasharray="3 3"/>`,
    `<line x1="${f1(cx - (d * s) / 2)}" y1="${f1(YC)}" x2="${f1(cx + (d * s) / 2)}" y2="${f1(YC)}" stroke="${DIM}" stroke-width="1.8" marker-start="url(#a)" marker-end="url(#a)"/>`,
    `<text x="${cx}" y="${f1(YC - r - 14)}" text-anchor="middle" font-family="Arial, sans-serif" font-size="19" font-weight="700" fill="${DIM}">Ø ${fmt(d)} mm</text>`,
    `<text x="${cx}" y="${f1(YC + 1.25 * d * s + 22)}" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="${MUTED}">tampak depan</text>`,
    `<text x="${W / 2}" y="312" text-anchor="middle" font-family="Arial, sans-serif" font-size="17" font-weight="700" fill="${DIM}">Panjang: – (mur)</text>`,
  );
  return out.join('\n');
}

function buildSizeSvg({ diameterMm, lengthMm, headType }) {
  const d = Number(diameterMm);
  const length = Number(lengthMm);
  const isNut = length <= 0;
  const clip = isClipNut(headType);
  const title = isNut ? `${clip ? 'Mur pegas' : 'Mur'} M${fmt(d)}` : `M${fmt(d)} × ${fmt(length)} mm`;
  const subtitle = isNut ? 'Ilustrasi ukuran mur' : 'Ilustrasi ukuran baut';
  const body = isNut ? drawingNut(d, clip) : drawingBolt(d, length);
  const note = isNut ? 'Ø sesuai data; panjang mur tidak ada di katalog' : 'Ø &amp; panjang sesuai data; bentuk kepala umum';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${subtitle} ${title}">
<defs><marker id="a" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,1 L9,5 L0,9 z" fill="${DIM}"/></marker></defs>
<rect width="${W}" height="${H}" fill="#FFFFFF"/>
<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" fill="none" stroke="#E4E4E7"/>
<text x="${W / 2}" y="40" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="${INK}">${title}</text>
<text x="${W / 2}" y="66" text-anchor="middle" font-family="Arial, sans-serif" font-size="15" fill="${MUTED}">${subtitle}</text>
<line x1="${X_LEFT - 30}" y1="${YC}" x2="${X_RIGHT + 30}" y2="${YC}" stroke="#D4D4D8" stroke-width="1" stroke-dasharray="14 4 3 4"/>
${body}
<text x="${W - 28}" y="364" text-anchor="end" font-family="Arial, sans-serif" font-size="12" font-weight="700" fill="${MUTED}">Ilustrasi ukuran</text>
<text x="${W - 28}" y="380" text-anchor="end" font-family="Arial, sans-serif" font-size="12" fill="${MUTED}">${note}</text>
</svg>
`;
}

/** Writes uploads/bolts/ukuran/<code>.svg and returns its public URL. */
function writeSizeIllustration(spec) {
  fs.mkdirSync(ILLUSTRATION_DIR, { recursive: true });
  const code = spec.code || sizeCode(spec);
  fs.writeFileSync(path.join(ILLUSTRATION_DIR, `${code}.svg`), buildSizeSvg(spec), 'utf8');
  return `${ILLUSTRATION_PREFIX}${code}.svg`;
}

module.exports = { ILLUSTRATION_PREFIX, ILLUSTRATION_DIR, sizeCode, sizeCaption, buildSizeSvg, writeSizeIllustration };
