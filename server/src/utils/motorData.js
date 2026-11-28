/**
 * Paket Full Bike data per motorcycle, built from the measured workbook rows (prisma/data/hexti-katalog-baut.json)
 * and fitted with Master Barang items. Shared by prisma/seed.js and scripts/completeMotorData.js so a fresh
 * database and the shop database get the same rows.
 *
 * Owner's decisions: exact catalog size first, else the nearest catalog length (utils/catalog.js); every row is
 * CEK FISIK until checked in Verifikasi Full Bike. Motorcycles without measurements copy the rows of the
 * closest measured model (SIBLINGS), marked as an estimate in the notes.
 */
const { pickNearestCatalogItem } = require('./catalog');

const PACKAGE_DEFS = [
  { name: 'Bundling Full Bike', packageType: 'Bundling Full Bike', zona: null, description: 'Semua baut bagian terlihat / body luar.' },
  { name: 'Bodi Halus', packageType: 'Bodi Halus', zona: 'HALUS', description: 'Baut zona halus: panel, cover, lampu, jok, spakbor.' },
  { name: 'Bodi Kasar', packageType: 'Bodi Kasar', zona: 'KASAR', description: 'Baut zona kasar: cover mesin & CVT, rem, rangka, knalpot, stang.' },
];

// unmeasured motorcycle -> measured motorcycle it is estimated from (display names)
const SIBLINGS = [
  ['Honda Vario 125 eSP (2022-2026)', 'Honda Vario 125 eSP CBS / CBS-ISS'],
  ['Honda Vario 160 CBS/ABS (2022-2026)', 'Honda Vario 125 eSP CBS / CBS-ISS'],
  ['Honda Beat Deluxe (2020-2026)', 'Honda Genio CBS / CBS-ISS'],
  ['Honda Beat Street (2020-2026)', 'Honda Genio CBS / CBS-ISS'],
  ['Honda Scoopy Prestige / Stylish (2021-2026)', 'Honda Scoopy eSP CBS-ISS'],
  ['Honda PCX 160 ABS (2021-2026)', 'Honda PCX 150 ABS'],
  ['Honda ADV 160 (2022-2026)', 'Honda PCX 150 ABS'],
  ['Yamaha NMAX 155 Connected (2020-2024)', 'Yamaha N-MAX 155 GPD155-A (BTP2)'],
  ['Yamaha NMAX Turbo (2024-2026)', 'Yamaha N-MAX 155 GPD155-A (BTP2)'],
  ['Yamaha Aerox 155 Connected (2021-2026)', 'Yamaha N-MAX 155 GPD155-A (BTP2)'],
  ['Suzuki Satria F150 Fi (2018-2026)', 'Suzuki FU150SCD Belang R'],
];

/**
 * Jasa (Master Barang, itemType JASA) that every bundling carries, plus an emblem matched to the motorcycle.
 * Owner's pick (24 Nov 2026): the titanium bakaran service and one bongkar-pasang labour line per bundling.
 */
const JASA_BAKAR = 'Jasa Bakar Per Titanium';
const JASA_BONGKAR_PASANG = 'Jasa Bongkar Pasang Baut Recolour';

// Emblem matched by model keyword (most specific first), falling back to a brand emblem.
const EMBLEM_BY_MODEL = [
  ['genio', 'Emblem Genio'],
  ['scoopy', 'Emblem Scoopy'],
  ['vario 125', 'Emblem Vario 125'],
  ['vario 160', 'Emblem Vario 160'],
  ['vario 150', 'EMBLEM VARIO 150'],
  ['vario', 'Emblem Vario'],
  ['pcx 160', 'Emblem PCX 160'],
  ['pcx 150', 'Emblem PCX 150'],
  ['pcx', 'emblem pcx'],
  ['nmax', 'Emblem Nmax'],
  ['n-max', 'Emblem Nmax'],
  ['aerox 155', 'Emblem Aerox 155'],
  ['aerox', 'Emblem AEROX'],
  ['xmax', 'Emblem Xmax'],
  ['beat', 'Emblem BEAT'],
  ['mio', 'Emblem MIO'],
  ['lexi', 'Emblem Lexi'],
  ['stylo', 'Emblem Stylo'],
  ['wave', 'Emblem Wave'],
  ['ninja', 'Emblem Ninja'],
  ['zx-25r', 'Emblem Ninja'],
  ['mx king', 'emblem mx king'],
  ['klx', 'Emblem Kawasaki'],
];

const BRAND_EMBLEM_FALLBACK = {
  honda: 'Emblem Logo Honda Kotak',
  yamaha: 'Emblem Logo Yamaha Kotak',
  kawasaki: 'Emblem Kawasaki',
  suzuki: 'Emblem Logo OK', // no Suzuki emblem in the catalog; neutral fallback
};

const norm = (s) => String(s || '').trim().toLowerCase();

/** Catalog emblem name for a motorcycle (model keyword first, then brand). */
function emblemNameFor(motor) {
  const haystack = norm(`${motor.brand} ${motor.model} ${motor.variant}`);
  for (const [keyword, emblemName] of EMBLEM_BY_MODEL) {
    if (haystack.includes(keyword)) return emblemName;
  }
  return BRAND_EMBLEM_FALLBACK[norm(motor.brand)] || null;
}

/**
 * Workbook rows of one motorcycle fitted with catalog items. Two OEM sizes that end up on the same item in the
 * same position are merged (quantities and Zona quantities added). Rows without a fitting item are dropped.
 */
function planMotorRows(catalogItems, specsByCode, motor) {
  const merged = new Map();
  for (const r of motor.requirements) {
    const hit = pickNearestCatalogItem(catalogItems, specsByCode[r.specCode]);
    if (!hit) continue;
    const notes = hit.exact ? r.notes : `${r.notes || ''} · Ukuran asli ${r.specCode} → katalog ${hit.item.name}`.replace(/^ · /, '');
    const key = `${r.position}|${hit.item.code}|${r.side}`;
    const prev = merged.get(key);
    if (!prev) {
      merged.set(key, { ...r, itemCode: hit.item.code, notes, defaultQtyByZona: { ...(r.defaultQtyByZona || {}) } });
      continue;
    }
    prev.quantity += r.quantity;
    prev.isCritical ||= r.isCritical;
    prev.isOptional &&= r.isOptional;
    prev.sortOrder = Math.min(prev.sortOrder, r.sortOrder);
    prev.notes = [prev.notes, notes].filter(Boolean).join(' | ');
    for (const [zona, qty] of Object.entries(r.defaultQtyByZona || {})) {
      prev.defaultQtyByZona[zona] = (prev.defaultQtyByZona[zona] || 0) + qty;
    }
  }
  return [...merged.values()];
}

/** Positions (by name, created when missing) and requirement rows of one measured motorcycle. */
async function applyMotorRows(db, moto, motor, rows, specByCode) {
  const positions = await db.boltPosition.findMany({ where: { motorcycleTypeId: moto.id } });
  const positionsByName = Object.fromEntries(positions.map((p) => [p.name, p]));
  for (const p of motor.positions) {
    if (!positionsByName[p.name]) {
      positionsByName[p.name] = await db.boltPosition.create({
        data: { motorcycleTypeId: moto.id, name: p.name, category: p.category, sortOrder: p.sortOrder, notes: p.notes },
      });
    }
  }
  const out = [];
  for (const r of rows) {
    const key = { motorcycleTypeId: moto.id, boltPositionId: positionsByName[r.position].id, boltSpecId: specByCode[r.itemCode].id, side: r.side };
    const data = { quantity: r.quantity, isOptional: r.isOptional, isCritical: r.isCritical, sortOrder: r.sortOrder, notes: r.notes };
    // CEK FISIK on create; a row the owner already verified keeps its status
    const row = await db.motorBoltRequirement.upsert({
      where: { motorcycleTypeId_boltPositionId_boltSpecId_side: key },
      update: data,
      create: { ...key, ...data, sizeStatus: 'CEK_FISIK' },
    });
    out.push({ row, source: r });
  }
  return out;
}

/**
 * Bundling Full Bike / Bodi Halus / Bodi Kasar of a measured motorcycle from the Zona quantities of its rows.
 * Every bundling now carries, beside its bolts, a matching emblem and two jasa lines (bakaran + bongkar pasang).
 * The sell price is the sum of the Master Barang item prices, rounded to the nearest thousand and set by the shop.
 * Items are rebuilt; name and status the owner set are kept (price is recomputed from the current catalog).
 */
async function rebuildMotorBundlings(db, moto, motor, requirementRows) {
  // Extra line items (emblem + jasa) from Master Barang.
  const extras = await db.boltSpec.findMany({
    where: { itemType: { in: ['EMBLEM', 'JASA'] }, isArchived: false },
    select: { id: true, name: true, itemType: true, price: true },
  });
  const extraByName = new Map(extras.map((e) => [norm(e.name), e]));
  const emblem = extraByName.get(norm(emblemNameFor(motor))) || null;
  const jasaBakar = extraByName.get(norm(JASA_BAKAR)) || null;
  const jasaBongkarPasang = extraByName.get(norm(JASA_BONGKAR_PASANG)) || null;

  // Master Barang price of each bolt, used to compute the bundling price.
  const boltIds = [...new Set(requirementRows.map(({ row }) => row.boltSpecId))];
  const bolts = await db.boltSpec.findMany({
    where: { id: { in: boltIds } },
    select: { id: true, price: true },
  });
  const priceById = new Map(bolts.map((b) => [b.id, b.price ?? 0]));

  let count = 0;
  for (const def of PACKAGE_DEFS) {
    const items = [];
    let totalPrice = 0;
    for (const { row, source } of requirementRows) {
      const byZona = source.defaultQtyByZona || {};
      const quantity = def.zona ? (byZona[def.zona] || 0) : Object.values(byZona).reduce((a, b) => a + b, 0);
      if (quantity <= 0) continue;
      items.push({ boltSpecId: row.boltSpecId, sourceRequirementId: row.id, quantity, emblemNote: source.position });
      totalPrice += (priceById.get(row.boltSpecId) || 0) * quantity;
    }
    if (items.length === 0) continue;

    if (emblem) {
      items.push({ boltSpecId: emblem.id, sourceRequirementId: null, quantity: 1, emblemNote: null });
      totalPrice += emblem.price ?? 0;
    }
    if (jasaBakar) {
      items.push({ boltSpecId: jasaBakar.id, sourceRequirementId: null, quantity: 1, emblemNote: null });
      totalPrice += jasaBakar.price ?? 0;
    }
    if (jasaBongkarPasang) {
      items.push({ boltSpecId: jasaBongkarPasang.id, sourceRequirementId: null, quantity: 1, emblemNote: null });
      totalPrice += jasaBongkarPasang.price ?? 0;
    }

    const price = Math.round(totalPrice / 1000) * 1000;

    const name = `${def.name} ${motor.model} ${motor.variant}`;
    const existing = await db.package.findFirst({ where: { motorcycleTypeId: moto.id, name } });
    if (existing) {
      await db.packageItem.deleteMany({ where: { packageId: existing.id } });
      await db.packageItem.createMany({ data: items.map((item) => ({ ...item, packageId: existing.id })) });
      await db.package.update({ where: { id: existing.id }, data: { price } });
    } else {
      await db.package.create({
        data: { packageType: def.packageType, name, description: def.description, status: 'ACTIVE', motorcycleTypeId: moto.id, price, items: { create: items } },
      });
    }
    count += 1;
  }
  return count;
}

/**
 * Estimated rows for unmeasured motorcycles: positions and rows of the closest measured model, marked CEK FISIK
 * and "Perkiraan dari ...". A motorcycle that already has rows (admin data) is left alone.
 */
async function copySiblingRows(db) {
  const copied = [];
  for (const [targetName, sourceName] of SIBLINGS) {
    const target = await db.motorcycleType.findFirst({ where: { displayName: targetName }, include: { _count: { select: { requirements: true } } } });
    const source = await db.motorcycleType.findFirst({
      where: { displayName: sourceName },
      include: { boltPositions: true, requirements: { include: { boltPosition: true } } },
    });
    if (!target || !source || target._count.requirements > 0 || source.requirements.length === 0) continue;

    const existing = await db.boltPosition.findMany({ where: { motorcycleTypeId: target.id } });
    const posByName = Object.fromEntries(existing.map((p) => [p.name, p]));
    for (const p of source.boltPositions) {
      if (!posByName[p.name]) {
        posByName[p.name] = await db.boltPosition.create({
          data: { motorcycleTypeId: target.id, name: p.name, category: p.category, sortOrder: p.sortOrder, notes: p.notes },
        });
      }
    }
    await db.motorBoltRequirement.createMany({
      data: source.requirements.map((r) => ({
        motorcycleTypeId: target.id,
        boltPositionId: posByName[r.boltPosition.name].id,
        boltSpecId: r.boltSpecId,
        quantity: r.quantity,
        side: r.side,
        isOptional: r.isOptional,
        isCritical: r.isCritical,
        sizeStatus: 'CEK_FISIK',
        sortOrder: r.sortOrder,
        notes: `Perkiraan dari ${source.displayName}${r.notes ? ` · ${r.notes}` : ''}`,
      })),
      skipDuplicates: true,
    });
    copied.push({ target: targetName, source: sourceName, rows: source.requirements.length });
  }
  return copied;
}

module.exports = { PACKAGE_DEFS, SIBLINGS, planMotorRows, applyMotorRows, rebuildMotorBundlings, copySiblingRows };
