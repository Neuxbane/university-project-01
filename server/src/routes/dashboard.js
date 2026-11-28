const express = require('express');
const prisma = require('../db');
const { requireAuth, requirePermission } = require('../middleware/auth');

const router = express.Router();

const { TYPE_LABELS } = require('../utils/catalogIllustration');

const fmt = (value) => String(Number(value));
// generated pictures: size drawings (ukuran/*.svg) and product illustrations (katalog/*.svg); catalog photos are .jpg
const isGenerated = (url) => url.startsWith('/uploads/bolts/ukuran/') || url.endsWith('.svg');

// GET /api/dashboard/overview — read-only aggregates for the dashboard charts
router.get('/overview', requireAuth, requirePermission('MENU_DASHBOARD'), async (req, res) => {
  try {
    const [motorcycles, specs, requirements, positions, packages, sessions] = await Promise.all([
      prisma.motorcycleType.findMany({ select: { id: true, brand: true, displayName: true, isActive: true } }),
      prisma.boltSpec.findMany({
        where: { isArchived: false },
        select: { id: true, code: true, name: true, itemType: true, diameterMm: true, images: { select: { url: true } } },
      }),
      prisma.motorBoltRequirement.findMany({
        select: { motorcycleTypeId: true, boltSpecId: true, quantity: true, isCritical: true, sizeStatus: true, boltPosition: { select: { category: true } } },
      }),
      prisma.boltPosition.count(),
      prisma.package.findMany({ select: { status: true, packageType: true } }),
      prisma.pickSession.findMany({ select: { status: true } }),
    ]);

    const specById = new Map(specs.map((s) => [s.id, s]));
    const tally = (map, key, add = {}) => {
      const entry = map.get(key) || { label: key, count: 0, pcs: 0, rows: 0, specs: new Set(), motors: new Set() };
      entry.count += add.count || 0;
      entry.pcs += add.pcs || 0;
      entry.rows += add.rows || 0;
      if (add.spec !== undefined) entry.specs.add(add.spec);
      if (add.motor !== undefined) entry.motors.add(add.motor);
      map.set(key, entry);
      return entry;
    };

    const byMotor = new Map();
    const byCategory = new Map();
    const bySpecUsage = new Map();
    const pcsByDiameter = new Map();
    for (const r of requirements) {
      const spec = specById.get(r.boltSpecId);
      tally(byMotor, r.motorcycleTypeId, { pcs: r.quantity, rows: 1, spec: r.boltSpecId });
      tally(byCategory, r.boltPosition?.category || 'Lainnya', { pcs: r.quantity, rows: 1 });
      tally(bySpecUsage, r.boltSpecId, { pcs: r.quantity, motor: r.motorcycleTypeId });
      if (spec) pcsByDiameter.set(fmt(spec.diameterMm), (pcsByDiameter.get(fmt(spec.diameterMm)) || 0) + r.quantity);
    }

    const motorName = new Map(motorcycles.map((m) => [m.id, m.displayName]));
    // Master Baut is brand-independent: a size's brands are the brands of the motorcycles that use it.
    const motorBrand = new Map(motorcycles.map((m) => [m.id, m.brand]));
    const brandsOf = (specId) => new Set([...(bySpecUsage.get(specId)?.motors || [])].map((id) => motorBrand.get(id)));
    const pcsByMotorcycle = [...byMotor.entries()]
      .map(([id, e]) => ({ id, label: motorName.get(id) || `Motor #${id}`, pcs: e.pcs, rows: e.rows, sizes: e.specs.size }))
      .sort((a, b) => b.pcs - a.pcs);

    const pcsByCategory = [...byCategory.values()]
      .map((e) => ({ label: e.label, pcs: e.pcs, rows: e.rows }))
      .sort((a, b) => b.pcs - a.pcs);

    const countBy = (items, keyFn) => {
      const map = new Map();
      for (const item of items) map.set(keyFn(item), (map.get(keyFn(item)) || 0) + 1);
      return [...map.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
    };

    const bolts = specs.filter((s) => s.itemType === 'BAUT' && Number(s.diameterMm) > 0);
    const specsByDiameter = countBy(bolts, (s) => fmt(s.diameterMm))
      .map((e) => ({ label: `M${e.label}`, count: e.count, pcs: pcsByDiameter.get(e.label) || 0, d: Number(e.label) }))
      .sort((a, b) => a.d - b.d)
      .map(({ d, ...rest }) => rest);

    const topSpecs = [...bySpecUsage.entries()]
      .map(([id, e]) => {
        const spec = specById.get(id);
        return { id, code: spec?.code || '', name: spec?.name || spec?.code || '–', pcs: e.pcs, motorcycles: e.motors.size, brands: brandsOf(id).size };
      })
      .sort((a, b) => b.pcs - a.pcs || a.code.localeCompare(b.code))
      .slice(0, 10);

    const imageCoverage = { productPhoto: 0, illustrationOnly: 0, none: 0 };
    for (const s of specs) {
      if (s.images.some((img) => !isGenerated(img.url))) imageCoverage.productPhoto += 1;
      else if (s.images.length) imageCoverage.illustrationOnly += 1;
      else imageCoverage.none += 1;
    }

    const usedSpecIds = new Set(requirements.map((r) => r.boltSpecId));
    const sizesByBrand = new Map();
    for (const id of usedSpecIds) for (const brand of brandsOf(id)) sizesByBrand.set(brand, (sizesByBrand.get(brand) || 0) + 1);
    const itemsByType = countBy(specs, (s) => s.itemType).map((e) => ({ ...e, type: e.label, label: TYPE_LABELS[e.label] || e.label }));
    res.json({
      totals: {
        motorcycles: motorcycles.length,
        activeMotorcycles: motorcycles.filter((m) => m.isActive).length,
        motorcyclesWithData: byMotor.size,
        specs: specs.length,
        bolts: specs.filter((s) => s.itemType === 'BAUT').length,
        specsInUse: usedSpecIds.size,
        positions,
        requirementRows: requirements.length,
        totalPcs: requirements.reduce((sum, r) => sum + r.quantity, 0),
        packages: packages.length,
        activePackages: packages.filter((p) => p.status === 'ACTIVE').length,
        sessions: sessions.length,
      },
      sizesByBrand: [...sizesByBrand.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count),
      itemsByType,
      specsByDiameter,
      pcsByMotorcycle,
      pcsByCategory,
      topSpecs,
      imageCoverage,
      packagesByType: countBy(packages, (p) => p.packageType),
      sessionsByStatus: countBy(sessions, (s) => s.status),
      // brief: data completeness warning on the dashboard
      completeness: {
        motorsWithoutData: motorcycles.filter((m) => m.isActive && !byMotor.has(m.id)).map((m) => ({ id: m.id, label: m.displayName })),
        rowsToCheck: requirements.filter((r) => r.sizeStatus === 'CEK_FISIK').length,
        criticalRows: requirements.filter((r) => r.isCritical).length,
      },
    });
  } catch (error) {
    console.error('Error building dashboard overview:', error);
    res.status(500).json({ error: 'Gagal memuat ringkasan dashboard.' });
  }
});

module.exports = router;
