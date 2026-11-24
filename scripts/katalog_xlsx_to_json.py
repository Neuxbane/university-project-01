"""Convert seeder/Katalog_HexTi_Baut_Titanium.xlsx (the shop's product catalog) into the Master Barang
JSON read by server/prisma/seed.js and server/scripts/migrateToCatalog.js.

    python scripts/katalog_xlsx_to_json.py              # JSON only (keeps photos already downloaded)
    python scripts/katalog_xlsx_to_json.py --download   # also fetch missing product photos

Every catalog row becomes one item, coded HX-<No> so the code stays stable. Names are kept exactly as in
the catalog. Bolts get their diameter, length and head variant from the name (M6x20 Bighead); price and
stock are not imported (the cashier app keeps those). Product photos are saved, resized to at most 640 px,
to server/uploads/bolts/katalog/HX-<No>.jpg; products without a photo get a generated illustration at seed time.
"""
import io
import json
import os
import re
import sys
import urllib.request

import openpyxl
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
XLSX = os.path.join(ROOT, 'seeder', 'Katalog_HexTi_Baut_Titanium.xlsx')
OUT = os.path.join(ROOT, 'server', 'prisma', 'data', 'hexti-katalog-produk.json')
PHOTO_DIR = os.path.join(ROOT, 'server', 'uploads', 'bolts', 'katalog')
PHOTO_URL = '/uploads/bolts/katalog/'
MAX_SIDE = 640

CARE_PREFIXES = ('cairan', 'oli', 'motul', 'lem', 'sodium', 'hafez', 'lap ')
BOLT_SIZE = re.compile(r'^(?:spesial price\s+)?m(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*(?:mm\b)?\s*(.*)$', re.I)
DIAMETER = re.compile(r'\bm(\d+(?:\.\d+)?)\b', re.I)


def item_type(name):
    low = name.lower()
    if low.startswith(('jasa', 'recolour')):
        return 'JASA'
    # "Body Honda Starhead" etc. are body bolts sold by head type
    if BOLT_SIZE.match(low) or re.match(r'^m\d+\s', low) or low.startswith(('baut', 'body ')):
        return 'BAUT'
    if low.startswith('mur'):
        return 'MUR'
    if low.startswith(('ring', 'rinng')):
        return 'RING'
    if low.startswith(('emblem', 'logo')):
        return 'EMBLEM'
    if low.startswith(CARE_PREFIXES):
        return 'PERAWATAN'
    return 'PART'


def title_words(text):
    return ' '.join(w[:1].upper() + w[1:].lower() if not re.search(r'\d', w) else w.upper() for w in text.split())


def parse(no, name, category, price):
    kind = item_type(name)
    diameter, length, head = 0, 0, ''
    m = BOLT_SIZE.match(name)
    if kind == 'BAUT' and m:
        diameter, length = float(m.group(1)), float(m.group(2))
        head = title_words(m.group(3)) or 'Baut'
    else:
        d = DIAMETER.search(name)
        if d and kind in ('BAUT', 'MUR', 'RING'):
            diameter = float(d.group(1))
        if kind == 'BAUT' and re.match(r'^m\d+\s', name, re.I):
            head = title_words(re.sub(r'^m\d+\s+', '', name, flags=re.I))
        else:
            head = {'BAUT': 'Baut', 'MUR': 'Mur', 'RING': 'Ring', 'EMBLEM': 'Emblem', 'PERAWATAN': 'Perawatan',
                    'JASA': 'Jasa', 'PART': 'Sparepart'}[kind]
    parsed_price = None
    if isinstance(price, (int, float)) and price >= 0:
        parsed_price = int(price)
    return {
        'no': no,
        'code': f'HX-{no:03d}',
        'name': name,
        'itemType': kind,
        'diameterMm': diameter,
        'lengthMm': length,
        'headType': head,
        'price': parsed_price,
        'notes': f'Kategori: {category}' if category and category != 'Tanpa kategori' else None,
    }


def download(url, dest):
    full = url.replace('-thumbnail.', '.')
    for candidate in (full, url):
        try:
            req = urllib.request.Request(candidate, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=30) as res:
                data = res.read()
            img = Image.open(io.BytesIO(data)).convert('RGB')
            img.thumbnail((MAX_SIDE, MAX_SIDE))
            img.save(dest, 'JPEG', quality=80, optimize=True, progressive=True)
            return True
        except Exception as err:  # try the thumbnail next
            print(f'  ! {candidate}: {err}')
    return False


def main():
    fetch = '--download' in sys.argv
    os.makedirs(PHOTO_DIR, exist_ok=True)
    ws = openpyxl.load_workbook(XLSX)['Produk']
    items, missing = [], []
    for r in range(2, ws.max_row + 1):
        no, name = ws.cell(r, 1).value, ws.cell(r, 2).value
        if not name:
            continue
        item = parse(int(no), ' '.join(str(name).split()), ws.cell(r, 3).value, ws.cell(r, 4).value)
        link = ws.cell(r, 6).hyperlink.target if ws.cell(r, 6).hyperlink else None
        item['photo'] = None
        if link:
            dest = os.path.join(PHOTO_DIR, f"{item['code']}.jpg")
            if not os.path.exists(dest) and fetch:
                print('download', item['code'], item['name'])
                download(link, dest)
            if os.path.exists(dest):
                item['photo'] = PHOTO_URL + f"{item['code']}.jpg"
            else:
                missing.append(item['code'])
        items.append(item)

    with open(OUT, 'w', encoding='utf-8', newline='\n') as f:
        json.dump({
            'meta': {
                'source': 'seeder/Katalog_HexTi_Baut_Titanium.xlsx',
                'generatedBy': 'scripts/katalog_xlsx_to_json.py',
                'note': 'Nama, foto, dan harga produk dari katalog toko; stok tidak diimpor.',
            },
            'items': items,
        }, f, ensure_ascii=False, indent=2)
        f.write('\n')

    by_type = {}
    for it in items:
        by_type[it['itemType']] = by_type.get(it['itemType'], 0) + 1
    print(f'{len(items)} barang -> {os.path.relpath(OUT, ROOT)}; per jenis: {by_type}')
    print(f"foto katalog: {sum(1 for it in items if it['photo'])}; belum terunduh: {missing or '-'}")


if __name__ == '__main__':
    main()
