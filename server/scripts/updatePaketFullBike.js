/**
 * One-off for the shop database (owner's requests, 24 Nov 2026), without reseeding:
 *   node scripts/updatePaketFullBike.js           # dry run
 *   node scripts/updatePaketFullBike.js --apply   # applies everything in one transaction
 *
 * 1. Paket Full Bike rows of the measured motorcycles: sizes the shop does not sell come back with the
 *    nearest catalog length (CEK FISIK); their Bundling Full Bike / Bodi Halus / Bodi Kasar are rebuilt.
 * 2. Unmeasured motorcycles get the rows of the closest measured model as an estimate (utils/motorData.js).
 * 3. Real photo as the main picture of every motorcycle (prisma/data/motor-photos.json).
 * 4. A generated 3D model for every motorcycle plus one marker per bagian (utils/partMarkers.js).
 */
const prisma = require('../src/db');
const { loadCatalogItems } = require('../src/utils/catalog');
const { SIBLINGS, planMotorRows, applyMotorRows, rebuildMotorBundlings, copySiblingRows } = require('../src/utils/motorData');
const { attachMotorPhotos } = require('./attachMotorPhotos');
const { attachSampleGlbModels } = require('./attachSampleGlbModels');

const APPLY = process.argv.includes('--apply');

async function run(db) {
  const katalog = require('../prisma/data/hexti-katalog-baut.json');
  const sizeSpecs = Object.fromEntries(katalog.specs.map((sp) => [sp.code, sp]));
  const catalogItems = loadCatalogItems();
  const specByCode = Object.fromEntries((await db.boltSpec.findMany({ where: { catalogNo: { not: null } } })).map((s) => [s.code, s]));

  const summary = { motors: [], bundlings: 0 };
  for (const m of katalog.motorcycles) {
    const moto = await db.motorcycleType.findFirst({ where: { displayName: m.displayName } });
    if (!moto) continue;
    const before = await db.motorBoltRequirement.aggregate({ where: { motorcycleTypeId: moto.id }, _count: true, _sum: { quantity: true } });
    const planned = planMotorRows(catalogItems, sizeSpecs, m);
    if (APPLY) {
      const rows = await applyMotorRows(db, moto, m, planned, specByCode);
      summary.bundlings += await rebuildMotorBundlings(db, moto, m, rows);
    }
    summary.motors.push({
      motor: m.displayName,
      rows: `${before._count} -> ${planned.length}`,
      pcs: `${before._sum.quantity || 0} -> ${planned.reduce((a, r) => a + r.quantity, 0)}`,
    });
  }

  if (!APPLY) {
    summary.siblings = SIBLINGS.map(([t, s]) => `${t} <- ${s}`);
    return summary;
  }
  summary.siblings = await copySiblingRows(db);
  summary.photos = await attachMotorPhotos(db);
  summary.models = await attachSampleGlbModels(db);
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
