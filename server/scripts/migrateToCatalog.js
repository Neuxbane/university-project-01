/**
 * One-off: turn the shop database's size-based Master Barang into the product catalog (owner's decision,
 * 23 Nov 2026) without reseeding, so admin edits, checklists and annotations stay.
 *
 *   node scripts/migrateToCatalog.js           # dry run: shows what would change
 *   node scripts/migrateToCatalog.js --apply   # applies everything in one transaction
 *
 * - adds the 416 catalog items (photo or generated picture);
 * - Paket Full Bike rows and bundling items of a size the shop sells move to that catalog bolt
 *   (Bighead, else Smallhead; M6/M8 nut -> hexagon nut) and are marked CEK FISIK; other rows are removed;
 * - bundlings left empty are removed (or set inactive when Riwayat still refers to them);
 * - former size specs still referenced by Riwayat are archived (hidden from Master Barang), the rest deleted.
 */
const prisma = require('../src/db');
const { loadCatalogItems, pickCatalogItem, upsertCatalog } = require('../src/utils/catalog');

const APPLY = process.argv.includes('--apply');

async function plan(tx, catalogSpecs, catalogItems) {
  const oldSpecs = await tx.boltSpec.findMany({
    where: { catalogNo: null, isArchived: false },
    include: { _count: { select: { sessionItems: true, bundleClaimItems: true } } },
  });
  // old spec id -> catalog spec id (dry run: catalog code), null when the shop does not sell that size
  const target = new Map(oldSpecs.map((s) => {
    const item = pickCatalogItem(catalogItems, { code: s.code, diameterMm: s.diameterMm, lengthMm: s.lengthMm });
    if (!item) return [s.id, null];
    return [s.id, catalogSpecs ? catalogSpecs[item.code].id : `${item.code} ${item.name}`];
  }));
  return { oldSpecs, target };
}

async function migrate(tx, catalogSpecs, catalogItems) {
  const { oldSpecs, target } = await plan(tx, catalogSpecs, catalogItems);
  const oldIds = oldSpecs.map((s) => s.id);
  const summary = { requirementsMoved: 0, requirementsRemoved: 0, packageItemsMoved: 0, packageItemsRemoved: 0, pinsMoved: 0, pinsRemoved: 0 };

  const requirements = await tx.motorBoltRequirement.findMany({ where: { boltSpecId: { in: oldIds } } });
  for (const r of requirements) {
    const to = target.get(r.boltSpecId);
    if (to) {
      await tx.motorBoltRequirement.update({ where: { id: r.id }, data: { boltSpecId: to, sizeStatus: 'CEK_FISIK' } });
      summary.requirementsMoved += 1;
    } else {
      await tx.motorBoltRequirement.delete({ where: { id: r.id } });
      summary.requirementsRemoved += 1;
    }
  }

  const packageItems = await tx.packageItem.findMany({ where: { boltSpecId: { in: oldIds } } });
  for (const item of packageItems) {
    const to = target.get(item.boltSpecId);
    if (to) {
      await tx.packageItem.update({ where: { id: item.id }, data: { boltSpecId: to } });
      summary.packageItemsMoved += 1;
    } else {
      await tx.packageItem.delete({ where: { id: item.id } });
      summary.packageItemsRemoved += 1;
    }
  }

  const pins = await tx.closeUpBoltPin.findMany({ where: { boltSpecId: { in: oldIds } } });
  for (const pin of pins) {
    const to = target.get(pin.boltSpecId);
    if (to) {
      await tx.closeUpBoltPin.update({ where: { id: pin.id }, data: { boltSpecId: to } });
      summary.pinsMoved += 1;
    } else {
      await tx.closeUpBoltPin.delete({ where: { id: pin.id } });
      summary.pinsRemoved += 1;
    }
  }

  const emptyPackages = await tx.package.findMany({
    where: { items: { none: {} } },
    include: { _count: { select: { claims: true, pickSessions: true } } },
  });
  summary.packagesRemoved = [];
  summary.packagesDeactivated = [];
  for (const pkg of emptyPackages) {
    if (pkg._count.claims || pkg._count.pickSessions) {
      await tx.package.update({ where: { id: pkg.id }, data: { status: 'INACTIVE' } });
      summary.packagesDeactivated.push(pkg.name);
    } else {
      await tx.package.delete({ where: { id: pkg.id } });
      summary.packagesRemoved.push(pkg.name);
    }
  }

  const inHistory = oldSpecs.filter((s) => s._count.sessionItems || s._count.bundleClaimItems).map((s) => s.id);
  await tx.boltSpec.updateMany({ where: { id: { in: inHistory } }, data: { isArchived: true } });
  const removed = await tx.boltSpec.deleteMany({ where: { id: { in: oldIds.filter((id) => !inHistory.includes(id)) } } });
  summary.oldSpecsArchived = inHistory.length;
  summary.oldSpecsDeleted = removed.count;
  return summary;
}

async function main() {
  const catalogItems = loadCatalogItems();
  if (!APPLY) {
    const { oldSpecs, target } = await plan(prisma, null, catalogItems);
    const ids = oldSpecs.map((s) => s.id);
    const reqs = await prisma.motorBoltRequirement.findMany({ where: { boltSpecId: { in: ids } }, select: { boltSpecId: true, quantity: true } });
    const kept = reqs.filter((r) => target.get(r.boltSpecId));
    console.log(`Dry run. Catalog items to add/refresh: ${catalogItems.length}; former size specs: ${oldSpecs.length}`);
    console.log(`Paket Full Bike rows: ${reqs.length} -> keep ${kept.length} (${kept.reduce((a, r) => a + r.quantity, 0)} pcs), remove ${reqs.length - kept.length}`);
    for (const s of oldSpecs) console.log(`  ${s.code.padEnd(14)} -> ${target.get(s.id) || '(tidak dijual)'}`);
    console.log('Run with --apply to change the database.');
    return;
  }
  const summary = await prisma.$transaction(async (tx) => {
    const catalogSpecs = await upsertCatalog(tx, catalogItems);
    return migrate(tx, catalogSpecs, catalogItems);
  }, { timeout: 300000, maxWait: 20000 });
  console.log('Selesai:', JSON.stringify(summary, null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
