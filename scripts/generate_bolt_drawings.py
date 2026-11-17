"""Generate one size illustration per Master Baut spec (one spec = one size, shared by every brand).

    python scripts/generate_bolt_drawings.py

Reads server/prisma/data/hexti-katalog-baut.json and writes server/uploads/bolts/ukuran/<code>.svg
(M6x16.svg, MUR-M8.svg, MUR-PEGAS-M5.svg; served at /uploads/bolts/ukuran/...). seed.js attaches
each file to the spec with the same code.

Only the diameter and length come from the catalog and are drawn to true proportion.
The head is one generic hex shape for every bolt: it illustrates the size, not the head type.
Nuts have no length in the catalog, so their length is shown as "–"; spring clip nuts get a clip drawing.
"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'server', 'prisma', 'data', 'hexti-katalog-baut.json')
OUT_DIR = os.path.join(ROOT, 'server', 'uploads', 'bolts', 'ukuran')

W, H = 640, 400
# Card thumbnails crop this 16:10 image to its centre square (x 120-520), with a size pill top-left,
# a qty badge bottom-right and a dark gradient over the bottom ~30%. Bolt, Ø and length stay inside that window.
YC = 185                      # centre line of the drawing
X_LEFT, X_RIGHT = 136, 504    # the bolt spans this range
INK, FILL, THREAD, DIM, MUTED = '#18181B', '#E4E4E7', '#71717A', '#1D4ED8', '#52525B'
HEAD_LEN, HEAD_H = 0.7, 1.75  # generic hex head, in multiples of the diameter


def fmt(v):
    return str(int(v)) if float(v).is_integer() else str(v)


def dim_h(x0, x1, y, label, ext_from_y):
    return '\n'.join([
        f'<line x1="{x0:.1f}" y1="{ext_from_y:.1f}" x2="{x0:.1f}" y2="{y + 8:.1f}" stroke="{DIM}" stroke-width="1.2"/>',
        f'<line x1="{x1:.1f}" y1="{ext_from_y:.1f}" x2="{x1:.1f}" y2="{y + 8:.1f}" stroke="{DIM}" stroke-width="1.2"/>',
        f'<line x1="{x0:.1f}" y1="{y:.1f}" x2="{x1:.1f}" y2="{y:.1f}" stroke="{DIM}" stroke-width="1.8" marker-start="url(#a)" marker-end="url(#a)"/>',
        f'<text x="{(x0 + x1) / 2:.1f}" y="{y + 26:.1f}" text-anchor="middle" font-family="Arial, sans-serif" font-size="19" font-weight="700" fill="{DIM}">{label}</text>',
    ])


def dim_v(x, y0, y1, label):
    return '\n'.join([
        f'<line x1="{x:.1f}" y1="{y0:.1f}" x2="{x:.1f}" y2="{y1:.1f}" stroke="{DIM}" stroke-width="1.8" marker-start="url(#a)" marker-end="url(#a)"/>',
        f'<text x="{x - 34:.1f}" y="{y0 - 10:.1f}" font-family="Arial, sans-serif" font-size="19" font-weight="700" fill="{DIM}">{label}</text>',
    ])


def scale_bar(s):
    mm = next(m for m in (10, 5, 2, 1) if m * s <= 76)
    x0, x1, y = 534, 534 + mm * s, 96
    return '\n'.join([
        f'<line x1="{x0:.1f}" y1="{y}" x2="{x1:.1f}" y2="{y}" stroke="{MUTED}" stroke-width="3"/>',
        f'<line x1="{x0:.1f}" y1="{y - 6}" x2="{x0:.1f}" y2="{y + 6}" stroke="{MUTED}" stroke-width="2"/>',
        f'<line x1="{x1:.1f}" y1="{y - 6}" x2="{x1:.1f}" y2="{y + 6}" stroke="{MUTED}" stroke-width="2"/>',
        f'<text x="{(x0 + x1) / 2:.1f}" y="{y - 10}" text-anchor="middle" font-family="Arial, sans-serif" font-size="13" fill="{MUTED}">skala {mm} mm</text>',
    ])


def drawing_bolt(d, length):
    s = min((X_RIGHT - X_LEFT) / (HEAD_LEN * d + length), 140 / (HEAD_H * d))
    x0 = X_LEFT + ((X_RIGHT - X_LEFT) - (HEAD_LEN * d + length) * s) / 2
    hl, hh, sh = HEAD_LEN * d * s, HEAD_H * d * s, d * s
    x_shank, x_tip = x0 + hl, x0 + hl + length * s
    chamfer = 0.12 * sh
    out = [
        f'<rect x="{x0:.1f}" y="{YC - hh / 2:.1f}" width="{hl:.1f}" height="{hh:.1f}" fill="{FILL}" stroke="{INK}" stroke-width="2.4"/>',
        *(f'<line x1="{x0:.1f}" y1="{YC + k * hh:.1f}" x2="{x_shank:.1f}" y2="{YC + k * hh:.1f}" stroke="{INK}" stroke-width="1.6"/>' for k in (-0.29, 0.29)),
        f'<path d="M{x_shank:.1f},{YC - sh / 2:.1f} H{x_tip - chamfer:.1f} L{x_tip:.1f},{YC - sh / 2 + chamfer:.1f} '
        f'V{YC + sh / 2 - chamfer:.1f} L{x_tip - chamfer:.1f},{YC + sh / 2:.1f} H{x_shank:.1f} Z" fill="{FILL}" stroke="{INK}" stroke-width="2.4"/>',
    ]
    step = max(6.0, sh * 0.2)
    x = x_shank + length * s * 0.35
    while x < x_tip - chamfer - 2:
        out.append(f'<line x1="{x:.1f}" y1="{YC - sh / 2 + 1.5:.1f}" x2="{x + step * 0.55:.1f}" y2="{YC + sh / 2 - 1.5:.1f}" stroke="{THREAD}" stroke-width="1.3"/>')
        x += step
    out.append(dim_h(x_shank, x_tip, YC + hh / 2 + 26, f'{fmt(length)} mm', YC + sh / 2 + 4))
    xd = x_shank + length * s * 0.62
    out.append(dim_v(xd, YC - sh / 2, YC + sh / 2, f'Ø {fmt(d)} mm'))
    out.append(scale_bar(s))
    return '\n'.join(out)


def drawing_nut(d, clip):
    s = 150 / (2.4 * d)
    xs = 196
    if clip:  # spring clip (U-nut): folded plate seen from the side
        w, hh = 0.9 * d * s, 2.2 * d * s
        out = [f'<path d="M{xs:.1f},{YC - hh / 2:.1f} H{xs + w:.1f} A{w / 2:.1f},{w / 2:.1f} 0 0 1 {xs + w:.1f},{YC - hh / 2 + w:.1f} '
               f'H{xs + w * 0.25:.1f} V{YC + hh / 2:.1f} H{xs:.1f} Z" fill="{FILL}" stroke="{INK}" stroke-width="2.4"/>',
               f'<line x1="{xs + w * 0.62:.1f}" y1="{YC - hh / 2 + w:.1f}" x2="{xs + w * 0.62:.1f}" y2="{YC + hh / 2 - 6:.1f}" stroke="{INK}" stroke-width="2.4"/>']
    else:
        w, hh = 0.8 * d * s, HEAD_H * d * s
        out = [f'<rect x="{xs:.1f}" y="{YC - hh / 2:.1f}" width="{w:.1f}" height="{hh:.1f}" fill="{FILL}" stroke="{INK}" stroke-width="2.4"/>']
        for k in (-0.29, 0.29):
            out.append(f'<line x1="{xs:.1f}" y1="{YC + k * hh:.1f}" x2="{xs + w:.1f}" y2="{YC + k * hh:.1f}" stroke="{INK}" stroke-width="1.6"/>')
    for y in (YC - d * s / 2, YC + d * s / 2):
        out.append(f'<line x1="{xs - 10:.1f}" y1="{y:.1f}" x2="{xs + w + 10:.1f}" y2="{y:.1f}" stroke="{MUTED}" stroke-width="1.5" stroke-dasharray="5 4"/>')
    out.append(f'<text x="{xs + w / 2:.1f}" y="{YC + 1.25 * d * s + 22:.1f}" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="{MUTED}">tampak samping</text>')
    cx = 400
    r = 1.1 * d * s if clip else d * s
    if clip:
        out.append(f'<rect x="{cx - r:.1f}" y="{YC - r:.1f}" width="{2 * r:.1f}" height="{2 * r:.1f}" rx="6" fill="{FILL}" stroke="{INK}" stroke-width="2.4"/>')
    else:
        pts = ' '.join(f'{cx + r * c:.1f},{YC + r * v:.1f}' for c, v in [(1, 0), (0.5, 0.866), (-0.5, 0.866), (-1, 0), (-0.5, -0.866), (0.5, -0.866)])
        out.append(f'<polygon points="{pts}" fill="{FILL}" stroke="{INK}" stroke-width="2.4"/>')
    out += [
        f'<circle cx="{cx}" cy="{YC}" r="{d * s / 2:.1f}" fill="#FFFFFF" stroke="{INK}" stroke-width="2.4"/>',
        f'<circle cx="{cx}" cy="{YC}" r="{d * s / 2 * 0.82:.1f}" fill="none" stroke="{THREAD}" stroke-width="1.3" stroke-dasharray="3 3"/>',
        f'<line x1="{cx - d * s / 2:.1f}" y1="{YC:.1f}" x2="{cx + d * s / 2:.1f}" y2="{YC:.1f}" stroke="{DIM}" stroke-width="1.8" marker-start="url(#a)" marker-end="url(#a)"/>',
        f'<text x="{cx}" y="{YC - r - 14:.1f}" text-anchor="middle" font-family="Arial, sans-serif" font-size="19" font-weight="700" fill="{DIM}">Ø {fmt(d)} mm</text>',
        f'<text x="{cx}" y="{YC + 1.25 * d * s + 22:.1f}" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="{MUTED}">tampak depan</text>',
        f'<text x="{W / 2:.0f}" y="312" text-anchor="middle" font-family="Arial, sans-serif" font-size="17" font-weight="700" fill="{DIM}">Panjang: – (mur)</text>',
    ]
    return '\n'.join(out)


def build_svg(spec):
    d, length = float(spec['diameterMm']), float(spec['lengthMm'])
    is_nut = length <= 0
    clip = 'pegas' in spec['headType'].lower()
    title = f"{'Mur pegas' if clip else 'Mur'} M{fmt(d)}" if is_nut else f'M{fmt(d)} × {fmt(length)} mm'
    subtitle = 'Ilustrasi ukuran mur' if is_nut else 'Ilustrasi ukuran baut'
    body = drawing_nut(d, clip) if is_nut else drawing_bolt(d, length)
    note = 'Ø sesuai data; panjang mur tidak ada di katalog' if is_nut else 'Ø &amp; panjang sesuai data; bentuk kepala umum'
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img" aria-label="{subtitle} {title}">
<defs><marker id="a" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,1 L9,5 L0,9 z" fill="{DIM}"/></marker></defs>
<rect width="{W}" height="{H}" fill="#FFFFFF"/>
<rect x="0.5" y="0.5" width="{W - 1}" height="{H - 1}" fill="none" stroke="#E4E4E7"/>
<text x="{W / 2:.0f}" y="40" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="{INK}">{title}</text>
<text x="{W / 2:.0f}" y="66" text-anchor="middle" font-family="Arial, sans-serif" font-size="15" fill="{MUTED}">{subtitle}</text>
<line x1="{X_LEFT - 30}" y1="{YC}" x2="{X_RIGHT + 30}" y2="{YC}" stroke="#D4D4D8" stroke-width="1" stroke-dasharray="14 4 3 4"/>
{body}
<text x="{W - 28}" y="364" text-anchor="end" font-family="Arial, sans-serif" font-size="12" font-weight="700" fill="{MUTED}">Ilustrasi ukuran</text>
<text x="{W - 28}" y="380" text-anchor="end" font-family="Arial, sans-serif" font-size="12" fill="{MUTED}">{note}</text>
</svg>
'''


def main():
    data = json.load(open(DATA, encoding='utf-8'))
    os.makedirs(OUT_DIR, exist_ok=True)
    for spec in data['specs']:
        with open(os.path.join(OUT_DIR, f"{spec['code']}.svg"), 'w', encoding='utf-8', newline='\n') as f:
            f.write(build_svg(spec))
    print(f"wrote {len(data['specs'])} size illustrations to {OUT_DIR}")


if __name__ == '__main__':
    main()
