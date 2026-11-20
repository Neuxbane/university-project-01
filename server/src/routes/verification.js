const express = require('express');
const prisma = require('../db');
const { requireAuth, requirePermission } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

const router = express.Router();

const SIZE_STATUSES = ['VERIFIED', 'CEK_FISIK'];

// GET /api/verification — requirement rows whose size still needs a physical check, per motorcycle,
// plus active motorcycles that have no bolt data yet
router.get('/', requireAuth, requirePermission('VERIFICATION_MANAGE'), async (req, res) => {
  try {
    const [rows, motorsWithoutData] = await Promise.all([
      prisma.motorBoltRequirement.findMany({
        where: { sizeStatus: 'CEK_FISIK' },
        include: {
          motorcycleType: { select: { id: true, displayName: true, isActive: true } },
          boltPosition: { select: { id: true, name: true, category: true } },
          boltSpec: {
            select: {
              id: true, code: true, diameterMm: true, lengthMm: true, headType: true,
              images: { orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }], take: 1 },
            },
          },
        },
        orderBy: [{ motorcycleType: { displayName: 'asc' } }, { boltPosition: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
      }),
      prisma.motorcycleType.findMany({
        where: { isActive: true, requirements: { none: {} } },
        select: { id: true, displayName: true, brand: true },
        orderBy: { displayName: 'asc' },
      }),
    ]);

    const groups = new Map();
    for (const r of rows) {
      const group = groups.get(r.motorcycleTypeId) || { motorcycle: r.motorcycleType, rows: [] };
      group.rows.push({
        id: r.id,
        quantity: r.quantity,
        side: r.side,
        isCritical: r.isCritical,
        notes: r.notes,
        position: r.boltPosition,
        boltSpec: r.boltSpec,
      });
      groups.set(r.motorcycleTypeId, group);
    }

    res.json({ totalToCheck: rows.length, groups: [...groups.values()], motorsWithoutData });
  } catch (error) {
    console.error('Error loading verification list:', error);
    res.status(500).json({ error: 'Gagal memuat daftar verifikasi data.' });
  }
});

// PATCH /api/verification — { ids: [requirementId], sizeStatus: 'VERIFIED' | 'CEK_FISIK' }
router.patch('/', requireAuth, requirePermission('VERIFICATION_MANAGE'), async (req, res) => {
  try {
    const ids = (Array.isArray(req.body.ids) ? req.body.ids : []).map((id) => parseInt(id, 10)).filter(Number.isInteger);
    const sizeStatus = req.body.sizeStatus || 'VERIFIED';
    if (ids.length === 0) return res.status(400).json({ error: 'Pilih minimal satu baris kebutuhan baut.' });
    if (!SIZE_STATUSES.includes(sizeStatus)) return res.status(400).json({ error: 'Status ukuran tidak dikenal.' });

    const { count } = await prisma.motorBoltRequirement.updateMany({ where: { id: { in: ids } }, data: { sizeStatus } });

    await logAudit({
      userId: req.user.id,
      action: 'UPDATE',
      entity: 'REQUIREMENT',
      entityId: ids.length === 1 ? ids[0] : null,
      detail: sizeStatus === 'VERIFIED'
        ? `Verifikasi ukuran: ${count} baris kebutuhan baut ditandai sudah dicek fisik`
        : `Verifikasi ukuran: ${count} baris kebutuhan baut dikembalikan ke perlu cek fisik`,
    });

    res.json({ updated: count, sizeStatus });
  } catch (error) {
    console.error('Error updating verification status:', error);
    res.status(500).json({ error: 'Gagal menyimpan hasil verifikasi.' });
  }
});

module.exports = router;
