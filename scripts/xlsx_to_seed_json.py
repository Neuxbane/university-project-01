"""Convert docs/Hex_Ti_Spesifikasi_Baut.xlsx into the JSON file read by server/prisma/seed.js.

Run once whenever the workbook changes (needs Python 3 + openpyxl, dev only):
    python scripts/xlsx_to_seed_json.py

Rules (agreed with the owner, 16 Nov 2026):
- Only catalog data from the workbook is used; nothing is guessed.
- Honda & Yamaha rows become positions + bolt specs + requirements.
- Suzuki (sizes not printed, "UKUR FISIK") becomes a motorcycle with positions only.
- Kawasaki (survey template) and motors without a catalog are not included.
- Year = catalog edition year (not a production range).
- Master Baut is brand-independent (owner, 17 Nov 2026): one spec per size, code M{diameter}x{length},
  shared by every motorcycle brand. Nuts have no length and keep their kind: MUR-M{d} / MUR-PEGAS-M{d}.
- Head type, OEM part number and size certainty stay per motorcycle position, in the requirement notes.
- Rows with the same position and same size are merged (quantities summed, OEM part numbers kept in notes).
- The catalog source (document, edition, diagram block/ref) is not shown in the app (owner, 17 Nov 2026).
- Material & finish are left empty (not in the workbook). Pitch is not printed -> null.
"""
import json
import os
import re
from collections import OrderedDict, defaultdict
from datetime import date

import openpyxl

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
XLSX = os.path.join(ROOT, 'docs', 'Hex_Ti_Spesifikasi_Baut.xlsx')
OUT = os.path.join(ROOT, 'server', 'prisma', 'data', 'hexti-katalog-baut.json')

# Catalog code prefix (as written in the workbook) -> how the motorcycle is named in the app.
# Names follow the workbook ("Model" column + catalog variant); the year is read from the Sumber sheet.
CATALOGS = OrderedDict([
    ('ACJ110', {'brand': 'Honda', 'model': 'Genio', 'variant': 'CBS / CBS-ISS', 'sumber': 'GENIO'}),
    ('ACF110', {'brand': 'Honda', 'model': 'Scoopy', 'variant': 'eSP CBS-ISS', 'sumber': 'SCOOPY'}),
    ('ACB125', {'brand': 'Honda', 'model': 'Vario', 'variant': '125 eSP CBS / CBS-ISS', 'sumber': 'VARIO125'}),
    ('WW150A', {'brand': 'Honda', 'model': 'PCX', 'variant': '150 ABS', 'sumber': 'PCX150'}),
    ('WW150', {'brand': 'Honda', 'model': 'PCX', 'variant': '150 CBS', 'sumber': 'PCX150'}),
    ('BC11', {'brand': 'Yamaha', 'model': 'NMAX', 'variant': '155 GPD150 (BC11)', 'sumber': 'BC11'}),
    ('BBM1', {'brand': 'Yamaha', 'model': 'NMAX', 'variant': '155 GPD155 (BBM1)', 'sumber': 'BBM1'}),
    ('BTP2', {'brand': 'Yamaha', 'model': 'N-MAX', 'variant': '155 GPD155-A (BTP2)', 'sumber': 'BTP2'}),
    ('FU150SCD', {'brand': 'Suzuki', 'model': 'FU150SCD', 'variant': 'Belang R', 'sumber': 'FU150SCD'}),
])

# Nut kind (Jenis) -> code prefix; a spring clip nut cannot replace a hex nut, so they stay separate specs
NUT_CODE = {'Mur': 'MUR', 'Mur pegas (klip)': 'MUR-PEGAS'}
BOLT_TYPE = 'Baut'  # headType of every size spec; the catalog head shape is kept per requirement

SIZE_CERTAINTY = {
    'A': 'pasti',
    'E': 'perlu cek fisik',
}

BOLT_PHOTOS = [
    # source file in docs/WhatsApp Unknown 2026-11-16 at 9.45.50 PM -> published name, colour named by the owner
    ('WhatsApp Image 2026-11-16 at 6.10.52 PM (1).jpeg', 'hexti-flange-blue-relaxa.jpeg', 'Blue Relaxa'),
    ('WhatsApp Image 2026-11-16 at 6.10.52 PM.jpeg', 'hexti-flange-pink.jpeg', 'Pink'),
    ('WhatsApp Image 2026-11-16 at 6.10.53 PM.jpeg', 'hexti-flange-rosegold.jpeg', 'Rosegold'),
    ('WhatsApp Image 2026-11-16 at 6.10.53 PM (1).jpeg', 'hexti-flange-green.jpeg', 'Green'),
]


def sheet_rows(wb, name, header_row=4):
    rows = list(wb[name].iter_rows(values_only=True))
    hdr = [str(h).strip() if h is not None else f'c{i}' for i, h in enumerate(rows[header_row - 1])]
    out = []
    for r in rows[header_row:]:
        if not r or all(v in (None, '') for v in r):
            continue
        d = dict(zip(hdr, r))
        if 'Model | Kode katalog' in d:
            model, _, code = str(d.pop('Model | Kode katalog')).partition(' | ')
            d['Model'], d['Kode katalog'] = model.strip(), code.strip()
        out.append(d)
    return out


def norm(v):
    """Brand sheets and Detail_Audit spell 'unknown' differently ('-', 'TDK DITEMUKAN', 'Tidak tercetak', 'UKUR FISIK')."""
    s = str(v).strip() if v is not None else ''
    unknown = ('-', 'TDK DITEMUKAN', 'TIDAK TERCETAK', 'UKUR FISIK', 'CEK FISIK', 'HITUNG FISIK')
    return '-' if s.upper() in unknown or s.upper().startswith('TIDAK DITULIS') else s


def catalog_key(code):
    for key in CATALOGS:
        if code.startswith(key) and not (key == 'WW150' and code.startswith('WW150A')):
            return key
    raise ValueError(f'Unknown catalog code: {code}')


def num(v):
    if isinstance(v, (int, float)):
        return int(v) if float(v).is_integer() else float(v)
    return None


def fmt_num(v):
    return str(int(v)) if float(v).is_integer() else str(v)


def main():
    wb = openpyxl.load_workbook(XLSX, data_only=True)

    sumber = {d['Kode']: d for d in sheet_rows(wb, 'Sumber', 3)}
    audit = sheet_rows(wb, 'Detail_Audit', 4)

    # Detail_Audit rows matched to brand-sheet rows by their shared columns (in order)
    audit_q = defaultdict(list)
    for a in audit:
        key = tuple(norm(v) for v in (a['Merek'], a['Kode Katalog'], a['Subbagian'], a['Lokasi'], a['Jenis'],
               a['Diameter (mm)'], a['Panjang (mm)'], a['Kepala'], a['Jumlah'], a['Zona']))
        audit_q[key].append(a)

    motorcycles = OrderedDict()
    for key, meta in CATALOGS.items():
        src = sumber[meta['sumber']]
        year = int(re.findall(r'\b((?:19|20)\d{2})\b', src['Dokumen'])[-1])  # catalog edition year
        motorcycles[key] = {
            'catalogKey': key,
            'brand': meta['brand'], 'model': meta['model'], 'variant': meta['variant'],
            'yearStart': year, 'yearEnd': None,
            'displayName': f"{meta['brand']} {meta['model']} {meta['variant']}",
            'hasSizeData': False, 'hasUnsized': False, 'positions': OrderedDict(), 'requirements': OrderedDict(),
        }

    specs = OrderedDict()
    unmatched = 0

    for brand in ['Honda', 'Yamaha', 'Suzuki']:
        for row in sheet_rows(wb, brand):
            key = catalog_key(row['Kode katalog'])
            moto = motorcycles[key]

            # position = Subbagian, category = Bagian
            pos_name = str(row['Subbagian']).strip()
            pos = moto['positions'].setdefault(pos_name, {
                'name': pos_name, 'category': str(row['Bagian']).strip(),
                'sortOrder': len(moto['positions']) + 1, 'unsizedQty': 0, 'unsizedKinds': set(),
            })
            if pos['category'] != str(row['Bagian']).strip():
                raise ValueError(f'Subbagian {pos_name} has two categories in {key}')
            dia = num(row['Diameter (mm)'])
            if dia is None:
                # Suzuki "UKUR FISIK": keep the catalog count on the position, no spec/requirement
                pos['unsizedQty'] += int(row['Jumlah']) if num(row['Jumlah']) is not None else 0
                pos['unsizedKinds'].add(str(row['Jenis']))
                moto['hasUnsized'] = True
                continue
            moto['hasSizeData'] = True

            akey = tuple(norm(v) for v in (brand, row['Kode katalog'], row['Subbagian'], row['Lokasi'], row['Jenis'],
                    row['Diameter (mm)'], row['Panjang (mm)'], row['Kepala'], row['Jumlah'], row['Zona']))
            a = audit_q[akey].pop(0) if audit_q.get(akey) else None
            if a is None:
                unmatched += 1
                a = {}

            jenis = str(row['Jenis']).strip()
            kepala = str(row['Kepala']).strip()
            length = num(row['Panjang (mm)'])
            if jenis in NUT_CODE:
                head_type, length = jenis, 0
                code = f'{NUT_CODE[jenis]}-M{fmt_num(dia)}'
            else:
                head_type = BOLT_TYPE
                code = f'M{fmt_num(dia)}x{fmt_num(length)}'

            size_level = str(a.get('Kepastian Ukuran') or '').strip()
            spec = specs.setdefault(code, {
                'code': code, 'diameterMm': dia, 'lengthMm': length or 0, 'headType': head_type,
                'threadPitch': None, 'material': '', 'finish': '',
                '_jenis': set(), '_heads': set(), '_levels': set(), '_pns': set(), '_brands': set(),
            })
            spec['_jenis'].add(jenis)
            spec['_heads'].add(kepala)
            spec['_brands'].add(brand)
            if size_level:
                spec['_levels'].add(size_level)
            if a.get('OEM Part'):
                spec['_pns'].add(str(a['OEM Part']))

            # requirement = (position, size); duplicates merged with quantities summed
            qty = int(row['Jumlah'])
            scope = str(a.get('Scope Paket (default, bisa diubah)') or 'DEFAULT').strip()
            zona = str(row['Zona']).strip()
            req = moto['requirements'].setdefault((pos_name, code), {
                'position': pos_name, 'specCode': code, 'quantity': 0, 'side': 'NONE',
                'sortOrder': len(moto['requirements']) + 1,
                'qtyByScopeZona': defaultdict(int), '_lines': [], '_zona': set(), '_ti': set(),
            })
            req['quantity'] += qty
            req['qtyByScopeZona'][f'{scope}|{zona}'] += qty
            req['_zona'].add(zona)
            if a.get('Rekomendasi Ti (penilaian, bukan data OEM)'):
                req['_ti'].add(str(a['Rekomendasi Ti (penilaian, bukan data OEM)']))
            if jenis in ('Baut', 'Sekrup'):
                kind = kepala
            elif jenis in NUT_CODE or norm(kepala) == '-':
                kind = jenis
            else:
                kind = f'{jenis}, kepala {kepala}'
            req['_lines'].append(f"{a.get('OEM Part', '?')} {kind} x{qty}"
                                 + (' [cek fisik]' if size_level == 'E' else '') + (f' [{scope}]' if scope != 'DEFAULT' else ''))

    out_specs = []
    for s in sorted(specs.values(), key=lambda s: (s['lengthMm'] == 0, s['diameterMm'], s['lengthMm'], s['code'])):
        levels = ', '.join(SIZE_CERTAINTY.get(l, l) for l in sorted(s['_levels']))
        out_specs.append({
            'code': s['code'], 'diameterMm': s['diameterMm'], 'lengthMm': s['lengthMm'],
            'headType': s['headType'], 'threadPitch': None, 'material': '', 'finish': '',
            'notes': (f"Dipakai: {', '.join(sorted(s['_brands']))}. "
                      + f"Jenis: {', '.join(sorted(s['_jenis']))}. "
                      + f"Kepala: {', '.join(sorted(s['_heads']))}. "
                      + (f'Kepastian ukuran: {levels}. ' if levels else '')
                      + (f"Nomor part OEM: {', '.join(sorted(s['_pns']))}." if s['_pns'] else '')).strip(),
        })
    flange_codes = sorted(s['code'] for s in specs.values() if any('flange' in h.lower() for h in s['_heads']))

    out_motos = []
    for key, m in motorcycles.items():
        notes = None
        if m['hasUnsized']:
            notes = 'Sebagian besar ukuran baut belum diukur: titik/posisi tetap dicatat, ukurannya dikosongkan sampai diukur.'
        positions = []
        for p in m['positions'].values():
            pn = []
            if p['unsizedQty']:
                pn.append(f"{p['unsizedQty']} pcs ({', '.join(sorted(p['unsizedKinds']))}), ukuran belum diukur")
            positions.append({'name': p['name'], 'category': p['category'], 'sortOrder': p['sortOrder'],
                              'notes': '. '.join(pn) or None})
        reqs = []
        for r in m['requirements'].values():
            default_qty = {z: q for sz, q in r['qtyByScopeZona'].items() for s_, z in [sz.split('|')] if s_ == 'DEFAULT'}
            reqs.append({
                'position': r['position'], 'specCode': r['specCode'], 'quantity': r['quantity'], 'side': 'NONE',
                'isOptional': sum(default_qty.values()) == 0, 'sortOrder': r['sortOrder'],
                'defaultQtyByZona': default_qty,
                'notes': ('OEM: ' + '; '.join(r['_lines'])
                          + f" · Zona: {'/'.join(sorted(r['_zona']))}"
                          + (f" · Rekomendasi Ti: {'/'.join(sorted(r['_ti']))}" if r['_ti'] else '')),
            })
        out_motos.append({
            'catalogKey': key, 'brand': m['brand'], 'model': m['model'], 'variant': m['variant'],
            'yearStart': m['yearStart'], 'yearEnd': None, 'displayName': m['displayName'],
            'notes': notes, 'hasSizeData': m['hasSizeData'], 'positions': positions, 'requirements': reqs,
        })

    result = {
        'meta': {
            'source': 'docs/Hex_Ti_Spesifikasi_Baut.xlsx',
            'generatedBy': 'scripts/xlsx_to_seed_json.py',
            'generatedAt': date.today().isoformat(),
            'packages': 'Paket Default = baris Scope DEFAULT (README xlsx); Body (Halus) / Mekanis (Kasar) = baris DEFAULT per Zona.',
        },
        'boltPhotos': {
            'appliesTo': 'Ukuran baut yang di katalog dipakai dengan kepala flange',
            'specCodes': flange_codes,
            'images': [{'url': f'/uploads/bolts/{dst}', 'caption': cap, 'isPrimary': i == 0, 'sourceFile': src}
                       for i, (src, dst, cap) in enumerate(BOLT_PHOTOS)],
        },
        'specs': out_specs,
        'motorcycles': out_motos,
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    print(f'wrote {OUT}')
    print(f'specs: {len(out_specs)} | unmatched audit rows: {unmatched}')
    for m in out_motos:
        print(f"  {m['displayName']}: {len(m['positions'])} posisi, {len(m['requirements'])} kebutuhan, "
              f"{sum(r['quantity'] for r in m['requirements'])} pcs")


if __name__ == '__main__':
    main()
