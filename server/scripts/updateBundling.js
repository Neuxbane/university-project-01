/**
 * One-off for the shop database (owner's request, 24 Nov 2026), without reseeding:
 *   node scripts/updateBundling.js           # dry run
 *   node scripts/updateBundling.js --apply   # applies everything in one transaction
 *
 * 1. Imports Master Barang prices from prisma/data/hexti-katalog-produk.json into BoltSpec.price.
 * 2. Rebuilds every bundling (Bundling Full Bike / Bodi Halus / Bodi Kasar) so each one carries:
 *    - its bolts (from the requirement matrix),
 *    - a matching emblem (model keyword, then brand fallback),
 *    - two jasa lines (Jasa Bakar Per Titanium + Jasa Bongkar Pasang Baut Recolour),
 *    and sets the bundling price to the sum of the Master Barang item prices, rounded to Rp 1.000.
 */
const prisma = require('../src/db');
const { loadCatalogItems, upsertCatalog } = require('../src/utils/catalog');
const { planMotorRows, applyMotorRows, rebuildMotorBundlings } = require('../src/utils/motorData');

const APPLY = process.argv.includes('--apply');

async function run(db) {
  const katalog = require('../prisma/data/hexti-katalog-baut.json');
  const sizeSpecs = Object.fromEntries(katalog.specs.map((sp) => [sp.code, sp]));
  const catalogItems = loadCatalogItems();

  // 1. Master Barang prices (BoltSpec.price).
  let imported = 0;
  if (APPLY) {
    await upsertCatalog(db, catalogItems);
    imported = catalogItems.filter((it) => it.price != null).length;
  }

  // 2. Rebuild bundlings from the measured motorcycles.
  const specByCode = Object.fromEntries(
    (await db.boltSpec.findMany({ where: { catalogNo: { not: null } } })).map((s) => [s.code, s])
  );

  const summary = { motors: [], bundlings: 0 };
  for (const m of katalog.motorcycles) {
    const moto = await db.motorcycleType.findFirst({ where: { displayName: m.displayName } });
    if (!moto) continue;
    const planned = planMotorRows(catalogItems, sizeSpecs, m);
    if (APPLY) {
      const rows = await applyMotorRows(db, moto, m, planned, specByCode);
      summary.bundlings += await rebuildMotorBundlings(db, moto, m, rows);
    }
    summary.motors.push({ motor: m.displayName, rows: planned.length });
  }

  summary.importedPrices = imported;
  if (APPLY) {
    summary.pricedBundlings = (await db.package.findMany({ where: { price: { not: null } } })).length;
  }
  return summary;
}

async function main() {
  const summary = APPLY
    ? await prisma.$transaction((tx) => run(tx), { timeout: 300000, maxWait: 20000 })
    : await run(prisma);
  console.log(APPLY ? 'Selesai:' : 'Dry run (tanpa perubahan):', JSON.stringify(summary, null, 2));
  if (!APPLY) console.log('Jalankan dengan --apply untuk mengubah database.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
