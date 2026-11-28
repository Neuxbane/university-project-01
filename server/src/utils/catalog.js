/**
 * Master Barang = the shop's product catalog (prisma/data/hexti-katalog-produk.json, converted from
 * seeder/Katalog_HexTi_Baut_Titanium.xlsx by scripts/katalog_xlsx_to_json.py). Shared by prisma/seed.js
 * and scripts/migrateToCatalog.js so a fresh database and the shop database end up the same.
 */
const { writeSizeIllustration, sizeCaption } = require('./sizeIllustration');
const { writeCatalogIllustration } = require('./catalogIllustration');

const CATALOG_FILE = '../../prisma/data/hexti-katalog-produk.json';

// goods that are fitted on a motor position (Paket Full Bike rows, checklists); emblems, oils and services are sold only
const INSTALLABLE_TYPES = ['BAUT', 'MUR', 'RING'];

const loadCatalogItems = () => require(CATALOG_FILE).items;

/**
 * Picture for a catalog item: the product photo when the catalog has one; otherwise an illustration we
 * already generate (size drawing for a sized bolt or a nut with a diameter), or a new product illustration.
 */
function catalogImage(item) {
  if (item.photo) return { url: item.photo, caption: 'Foto produk' };
  const d = Number(item.diameterMm);
  const l = Number(item.lengthMm);
  if (item.itemType === 'BAUT' && d > 0 && l > 0) {
    const size = { diameterMm: d, lengthMm: l, headType: 'Baut' };
    return { url: writeSizeIllustration(size), caption: sizeCaption(size) };
  }
  if (item.itemType === 'MUR' && d > 0) {
    const size = { diameterMm: d, lengthMm: 0, headType: 'Mur' };
    return { url: writeSizeIllustration(size), caption: sizeCaption(size) };
  }
  return { url: writeCatalogIllustration(item), caption: 'Ilustrasi barang' };
}

const norm = (s) => String(s || '').trim().toLowerCase();

/**
 * Catalog item for a Paket Full Bike row of the former size master (owner's rule, 23 Nov 2026):
 * same Ø × length with the Bighead variant, else Smallhead; plain M6/M8 nuts become the hexagon nut of
 * that size. Sizes the shop does not sell (and spring clip nuts) return null. Rows mapped this way are
 * marked CEK FISIK so the variant is confirmed in Verifikasi Full Bike.
 */
// "Bighead BUKAN DISK" is the plain Bighead of a size that also comes as a disc bolt (M8x25)
const HEAD_PREFERENCE = [['bighead', 'big', 'bighead bukan disk'], ['smallhead', 'small']];
const NUT_BY_SIZE_CODE = { 'MUR-M6': 'mur 10 m6 hexagon', 'MUR-M8': 'mur 12 hexagon' };

const variantOf = (bolts) => {
  for (const heads of HEAD_PREFERENCE) {
    const hit = bolts.find((it) => heads.includes(norm(it.headType)));
    if (hit) return hit;
  }
  return null;
};

function pickCatalogItem(items, sizeSpec) {
  const nutName = NUT_BY_SIZE_CODE[sizeSpec.code];
  if (nutName) return items.find((it) => norm(it.name) === nutName) || null;
  const d = Number(sizeSpec.diameterMm);
  const l = Number(sizeSpec.lengthMm);
  if (!(d > 0 && l > 0)) return null;
  return variantOf(items.filter((it) => it.itemType === 'BAUT' && Number(it.diameterMm) === d && Number(it.lengthMm) === l));
}

/**
 * Owner's follow-up (24 Nov 2026): a size the shop does not sell is fitted with the nearest catalog
 * length of the same Ø (Bighead, else Smallhead), at most 5 mm off; on a tie the shorter bolt wins.
 * Returns { item, exact } or null (e.g. spring clip nuts, M3x14 has nothing within 5 mm).
 */
const NEAREST_MAX_MM = 5;
function pickNearestCatalogItem(items, sizeSpec) {
  const exact = pickCatalogItem(items, sizeSpec);
  if (exact) return { item: exact, exact: true };
  const d = Number(sizeSpec.diameterMm);
  const l = Number(sizeSpec.lengthMm);
  if (!(d > 0 && l > 0)) return null;
  const byLength = new Map();
  for (const it of items) {
    if (it.itemType !== 'BAUT' || Number(it.diameterMm) !== d || !(Number(it.lengthMm) > 0)) continue;
    const len = Number(it.lengthMm);
    byLength.set(len, [...(byLength.get(len) || []), it]);
  }
  const lengths = [...byLength.keys()]
    .filter((len) => Math.abs(len - l) <= NEAREST_MAX_MM && variantOf(byLength.get(len)))
    .sort((a, b) => Math.abs(a - l) - Math.abs(b - l) || a - b);
  return lengths.length ? { item: variantOf(byLength.get(lengths[0])), exact: false } : null;
}

/**
 * Creates or refreshes every catalog item (matched on its HX code) and gives it a picture when it has none.
 * Photos the admin uploaded later stay; returns { [code]: boltSpec }.
 */
async function upsertCatalog(prisma, items = loadCatalogItems()) {
  const byCode = {};
  for (const item of items) {
    const data = {
      catalogNo: item.no,
      itemType: item.itemType,
      name: item.name,
      diameterMm: item.diameterMm,
      lengthMm: item.lengthMm,
      headType: item.headType,
      price: item.price ?? null,
      notes: item.notes,
      isArchived: false,
    };
    const spec = await prisma.boltSpec.upsert({
      where: { code: item.code },
      update: data,
      create: { code: item.code, ...data, material: '', finish: '' },
    });
    const { url, caption } = catalogImage(item);
    const existing = await prisma.boltImage.findFirst({ where: { boltSpecId: spec.id, url } });
    if (!existing) {
      const hasPrimary = await prisma.boltImage.count({ where: { boltSpecId: spec.id, isPrimary: true } });
      await prisma.boltImage.create({ data: { boltSpecId: spec.id, url, caption, isPrimary: hasPrimary === 0 } });
    }
    byCode[item.code] = spec;
  }
  return byCode;
}

module.exports = { INSTALLABLE_TYPES, loadCatalogItems, catalogImage, pickCatalogItem, pickNearestCatalogItem, upsertCatalog };
