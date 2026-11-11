const express = require('express');
const prisma = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

const router = express.Router();

const PACKAGE_INCLUDE = {
  motorcycleType: {
    select: {
      id: true,
      displayName: true,
      brand: true,
      model: true,
      variant: true,
      isActive: true,
    },
  },
  items: {
    orderBy: { id: 'asc' },
    include: {
      boltSpec: {
        include: {
          images: {
            orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
          },
        },
      },
      sourceRequirement: {
        include: { boltPosition: true },
      },
    },
  },
  _count: {
    select: { pickSessions: true },
  },
};

function sanitizeItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return { error: 'Minimal harus ada 1 item baut di dalam paket.' };
  }

  const parsed = [];
  for (const item of items) {
    const boltSpecId = parseInt(item?.boltSpecId, 10);
    const quantity = parseInt(item?.quantity, 10);
    if (!Number.isInteger(boltSpecId) || boltSpecId <= 0) {
      return { error: 'Spesifikasi baut pada setiap baris item wajib dipilih.' };
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return { error: 'Jumlah baut pada setiap item paket minimal 1 pcs.' };
    }
    const sourceReqId = item?.sourceRequirementId ? parseInt(item.sourceRequirementId, 10) : null;
    parsed.push({
      boltSpecId,
      quantity,
      sourceRequirementId: Number.isInteger(sourceReqId) ? sourceReqId : null,
      emblemNote: item?.emblemNote ? String(item.emblemNote).trim() : null,
    });
  }
  return { items: parsed };
}

// GET /api/packages
router.get('/', requireAuth, async (req, res) => {
  try {
    const { motorcycle_id, status } = req.query;
    const where = {};
    if (motorcycle_id) {
      const mId = parseInt(motorcycle_id, 10);
      if (Number.isNaN(mId)) {
        return res.status(400).json({ error: 'ID tipe motor tidak valid.' });
      }
      where.motorcycleTypeId = mId;
    }
    if (status === 'ACTIVE' || status === 'INACTIVE') {
      where.status = status;
    }

    const packages = await prisma.package.findMany({
      where,
      include: PACKAGE_INCLUDE,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });

    res.json(packages);
  } catch (error) {
    console.error('Error fetching packages:', error);
    res.status(500).json({ error: 'Gagal mengambil data paket baut.' });
  }
});

// GET /api/packages/:id/items
router.get('/:id/items', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'ID paket tidak valid.' });
    }
    const pkg = await prisma.package.findUnique({
      where: { id },
      include: PACKAGE_INCLUDE,
    });

    if (!pkg) {
      return res.status(404).json({ error: 'Paket baut tidak ditemukan.' });
    }

    res.json(pkg);
  } catch (error) {
    console.error('Error fetching package items:', error);
    res.status(500).json({ error: 'Gagal mengambil rincian paket.' });
  }
});

// GET /api/packages/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'ID paket tidak valid.' });
    }
    const pkg = await prisma.package.findUnique({
      where: { id },
      include: PACKAGE_INCLUDE,
    });

    if (!pkg) {
      return res.status(404).json({ error: 'Paket baut tidak ditemukan.' });
    }

    res.json(pkg);
  } catch (error) {
    console.error('Error fetching package detail:', error);
    res.status(500).json({ error: 'Gagal mengambil detail paket baut.' });
  }
});

// POST /api/packages (Admin only)
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { motorcycleTypeId, packageType, name, description, status, items } = req.body;
    const mId = parseInt(motorcycleTypeId, 10);
    const trimmedType = packageType ? String(packageType).trim() : '';
    const trimmedName = name ? String(name).trim() : '';

    if (!Number.isInteger(mId) || !trimmedType || !trimmedName) {
      return res.status(400).json({ error: 'Tipe motor, jenis paket, dan nama paket wajib diisi.' });
    }

    const sanitized = sanitizeItems(items);
    if (sanitized.error) {
      return res.status(400).json({ error: sanitized.error });
    }

    const motor = await prisma.motorcycleType.findUnique({ where: { id: mId }, select: { id: true } });
    if (!motor) {
      return res.status(404).json({ error: 'Tipe motor tidak ditemukan.' });
    }

    const validStatus = status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';

    const pkg = await prisma.package.create({
      data: {
        motorcycleTypeId: mId,
        packageType: trimmedType,
        name: trimmedName,
        description: description ? String(description).trim() : null,
        status: validStatus,
        items: {
          create: sanitized.items,
        },
      },
      include: PACKAGE_INCLUDE,
    });

    await logAudit({
      userId: req.user.id,
      action: 'CREATE',
      entity: 'PACKAGE',
      entityId: pkg.id,
      detail: `Membuat paket baut: ${pkg.name} (${pkg.items.length} item)`,
    });

    res.status(201).json(pkg);
  } catch (error) {
    console.error('Error creating package:', error);
    if (error.code === 'P2003') {
      return res.status(400).json({ error: 'Spesifikasi baut atau tipe motor tidak ditemukan.' });
    }
    res.status(500).json({ error: 'Gagal membuat paket baut baru.' });
  }
});

// PUT /api/packages/:id (Admin only)
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'ID paket tidak valid.' });
    }

    const existing = await prisma.package.findUnique({ where: { id }, select: { id: true, status: true } });
    if (!existing) {
      return res.status(404).json({ error: 'Paket baut tidak ditemukan.' });
    }

    const { motorcycleTypeId, packageType, name, description, status, items } = req.body;
    const mId = parseInt(motorcycleTypeId, 10);
    const trimmedType = packageType ? String(packageType).trim() : '';
    const trimmedName = name ? String(name).trim() : '';

    if (!Number.isInteger(mId) || !trimmedType || !trimmedName) {
      return res.status(400).json({ error: 'Tipe motor, jenis paket, dan nama paket wajib diisi.' });
    }

    const sanitized = sanitizeItems(items);
    if (sanitized.error) {
      return res.status(400).json({ error: sanitized.error });
    }

    const motor = await prisma.motorcycleType.findUnique({ where: { id: mId }, select: { id: true } });
    if (!motor) {
      return res.status(404).json({ error: 'Tipe motor tidak ditemukan.' });
    }

    const nextStatus = status === 'ACTIVE' || status === 'INACTIVE' ? status : existing.status;

    const updated = await prisma.$transaction(async (tx) => {
      await tx.packageItem.deleteMany({ where: { packageId: id } });
      return tx.package.update({
        where: { id },
        data: {
          motorcycleTypeId: mId,
          packageType: trimmedType,
          name: trimmedName,
          description: description ? String(description).trim() : null,
          status: nextStatus,
          items: {
            create: sanitized.items,
          },
        },
        include: PACKAGE_INCLUDE,
      });
    });

    await logAudit({
      userId: req.user.id,
      action: 'UPDATE',
      entity: 'PACKAGE',
      entityId: updated.id,
      detail: `Mengubah paket baut: ${updated.name} (${updated.items.length} item)`,
    });

    res.json(updated);
  } catch (error) {
    console.error('Error updating package:', error);
    if (error.code === 'P2003') {
      return res.status(400).json({ error: 'Spesifikasi baut atau tipe motor tidak ditemukan.' });
    }
    res.status(500).json({ error: 'Gagal memperbarui paket baut.' });
  }
});

// Shared status toggle handler
async function handleTogglePackageStatus(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'ID paket tidak valid.' });
    }

    const existing = await prisma.package.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Paket baut tidak ditemukan.' });
    }

    const requested = req.body?.status;
    const nextStatus = requested === 'ACTIVE' || requested === 'INACTIVE'
      ? requested
      : (existing.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE');

    const updated = await prisma.package.update({
      where: { id },
      data: { status: nextStatus },
      include: PACKAGE_INCLUDE,
    });

    await logAudit({
      userId: req.user.id,
      action: nextStatus === 'ACTIVE' ? 'ACTIVATE' : 'DEACTIVATE',
      entity: 'PACKAGE',
      entityId: updated.id,
      detail: `${nextStatus === 'ACTIVE' ? 'Mengaktifkan' : 'Menonaktifkan'} paket baut: ${updated.name}`,
    });

    res.json(updated);
  } catch (error) {
    console.error('Error toggling package status:', error);
    res.status(500).json({ error: 'Gagal mengubah status paket baut.' });
  }
}

router.patch('/:id/status', requireAuth, requireAdmin, handleTogglePackageStatus);
router.patch('/:id/deactivate', requireAuth, requireAdmin, handleTogglePackageStatus);

// DELETE /api/packages/:id (Admin only)
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'ID paket tidak valid.' });
    }

    const existing = await prisma.package.findUnique({ where: { id }, select: { id: true, name: true } });
    if (!existing) {
      return res.status(404).json({ error: 'Paket baut tidak ditemukan.' });
    }

    await prisma.package.delete({ where: { id } });

    await logAudit({
      userId: req.user.id,
      action: 'DELETE',
      entity: 'PACKAGE',
      entityId: id,
      detail: `Menghapus paket baut: ${existing.name}`,
    });

    res.json({ success: true, id });
  } catch (error) {
    console.error('Error deleting package:', error);
    res.status(500).json({ error: 'Gagal menghapus paket baut.' });
  }
});

module.exports = router;
