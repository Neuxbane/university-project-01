const express = require('express');
const prisma = require('../db');
const { requireAuth, requirePermission } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');
const { CLAIM_INCLUDE } = require('../utils/bundleClaims');

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
    select: { pickSessions: true, claims: true },
  },
};

function sanitizeItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return { error: 'Minimal harus ada 1 barang di dalam bundling.' };
  }

  const parsed = [];
  for (const item of items) {
    const boltSpecId = parseInt(item?.boltSpecId, 10);
    const quantity = parseInt(item?.quantity, 10);
    if (!Number.isInteger(boltSpecId) || boltSpecId <= 0) {
      return { error: 'Barang pada setiap baris bundling wajib dipilih.' };
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return { error: 'Jumlah setiap barang di bundling minimal 1 pcs.' };
    }
    const sourceReqId = item?.sourceRequirementId ? parseInt(item.sourceRequirementId, 10) : null;
    parsed.push({
      boltSpecId,
      quantity,
      sourceRequirementId: Number.isInteger(sourceReqId) ? sourceReqId : null,
      emblemNote: item?.emblemNote ? String(item.emblemNote).trim() : null,
      isBonus: Boolean(item?.isBonus),
    });
  }
  return { items: parsed };
}

// Bundling header: motorcycle is optional (a bundling can be sold for any bike), price in Rupiah is optional
async function parseBundlingHeader(body) {
  const { motorcycleTypeId, packageType, name, description, price } = body;
  const trimmedType = packageType ? String(packageType).trim() : '';
  const trimmedName = name ? String(name).trim() : '';
  if (!trimmedType || !trimmedName) {
    return { error: 'Jenis dan nama bundling wajib diisi.', status: 400 };
  }
  let mId = null;
  if (motorcycleTypeId !== undefined && motorcycleTypeId !== null && motorcycleTypeId !== '') {
    mId = parseInt(motorcycleTypeId, 10);
    if (!Number.isInteger(mId)) return { error: 'ID tipe motor tidak valid.', status: 400 };
    const motor = await prisma.motorcycleType.findUnique({ where: { id: mId }, select: { id: true } });
    if (!motor) return { error: 'Tipe motor tidak ditemukan.', status: 404 };
  }
  let parsedPrice = null;
  if (price !== undefined && price !== null && price !== '') {
    parsedPrice = Math.round(Number(price));
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) return { error: 'Harga bundling harus angka 0 atau lebih.', status: 400 };
  }
  return {
    data: {
      motorcycleTypeId: mId,
      packageType: trimmedType,
      name: trimmedName,
      description: description ? String(description).trim() : null,
      price: parsedPrice,
    },
  };
}

// GET /api/packages
router.get('/', requireAuth, requirePermission('MENU_BUNDLING'), async (req, res) => {
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
router.get('/:id/items', requireAuth, requirePermission('MENU_BUNDLING'), async (req, res) => {
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
router.get('/:id', requireAuth, requirePermission('MENU_BUNDLING'), async (req, res) => {
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
router.post('/', requireAuth, requirePermission('PACKAGES_MANAGE'), async (req, res) => {
  try {
    const header = await parseBundlingHeader(req.body);
    if (header.error) return res.status(header.status).json({ error: header.error });
    const { status, items } = req.body;

    const sanitized = sanitizeItems(items);
    if (sanitized.error) {
      return res.status(400).json({ error: sanitized.error });
    }

    const validStatus = status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';

    const pkg = await prisma.package.create({
      data: {
        ...header.data,
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
      detail: `Membuat bundling: ${pkg.name} (${pkg.items.length} barang)`,
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
router.put('/:id', requireAuth, requirePermission('PACKAGES_MANAGE'), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'ID paket tidak valid.' });
    }

    const existing = await prisma.package.findUnique({ where: { id }, select: { id: true, status: true } });
    if (!existing) {
      return res.status(404).json({ error: 'Paket baut tidak ditemukan.' });
    }

    const header = await parseBundlingHeader(req.body);
    if (header.error) return res.status(header.status).json({ error: header.error });
    const { status, items } = req.body;

    const sanitized = sanitizeItems(items);
    if (sanitized.error) {
      return res.status(400).json({ error: sanitized.error });
    }

    const nextStatus = status === 'ACTIVE' || status === 'INACTIVE' ? status : existing.status;

    const updated = await prisma.$transaction(async (tx) => {
      await tx.packageItem.deleteMany({ where: { packageId: id } });
      return tx.package.update({
        where: { id },
        data: {
          ...header.data,
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
      detail: `Mengubah bundling: ${updated.name} (${updated.items.length} barang)`,
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

router.patch('/:id/status', requireAuth, requirePermission('PACKAGES_MANAGE'), handleTogglePackageStatus);
router.patch('/:id/deactivate', requireAuth, requirePermission('PACKAGES_MANAGE'), handleTogglePackageStatus);

// DELETE /api/packages/:id (Admin only)
router.delete('/:id', requireAuth, requirePermission('PACKAGES_MANAGE'), async (req, res) => {
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

// ---- Buyer claims (started here, ticked off in Riwayat via /api/bundle-claims) ----
// GET /api/packages/:id/claims - open claims first, then the latest completed ones
router.get('/:id/claims', requireAuth, requirePermission('MENU_RIWAYAT'), async (req, res) => {
  try {
    const packageId = parseInt(req.params.id, 10);
    const claims = await prisma.bundleClaim.findMany({
      where: { packageId },
      include: CLAIM_INCLUDE,
      orderBy: [{ completedAt: { sort: 'desc', nulls: 'first' } }, { createdAt: 'desc' }],
      take: 30,
    });
    res.json(claims);
  } catch (error) {
    console.error('Error fetching bundling claims:', error);
    res.status(500).json({ error: 'Gagal memuat daftar klaim bundling.' });
  }
});

// POST /api/packages/:id/claims - { buyerName } starts a claim with a copy of the bundling items
router.post('/:id/claims', requireAuth, requirePermission('SESSION_CHECKLIST'), async (req, res) => {
  try {
    const packageId = parseInt(req.params.id, 10);
    const pkg = await prisma.package.findUnique({ where: { id: packageId }, include: { items: true } });
    if (!pkg) return res.status(404).json({ error: 'Bundling tidak ditemukan.' });
    if (pkg.status !== 'ACTIVE') return res.status(400).json({ error: 'Bundling ini sedang dinonaktifkan.' });
    if (!pkg.items.length) return res.status(400).json({ error: 'Bundling ini belum punya barang.' });

    const buyerName = req.body.buyerName ? String(req.body.buyerName).trim() : '';
    const claim = await prisma.bundleClaim.create({
      data: {
        packageId,
        buyerName: buyerName || null,
        createdBy: req.user.id,
        items: { create: pkg.items.map((i) => ({ boltSpecId: i.boltSpecId, quantity: i.quantity, isBonus: i.isBonus })) },
      },
      include: CLAIM_INCLUDE,
    });
    await logAudit({
      userId: req.user.id,
      action: 'CREATE',
      entity: 'BUNDLE_CLAIM',
      entityId: claim.id,
      detail: `Mulai cek klaim bundling ${pkg.name}${buyerName ? ` untuk ${buyerName}` : ''}`,
    });
    res.status(201).json(claim);
  } catch (error) {
    console.error('Error starting bundling claim:', error);
    res.status(500).json({ error: 'Gagal memulai cek klaim.' });
  }
});

module.exports = router;
