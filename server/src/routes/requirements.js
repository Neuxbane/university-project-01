const express = require('express');
const prisma = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');
const { resolveOrCreatePosition } = require('../utils/positionHelper');

const router = express.Router();

// GET /api/motorcycles/:id/requirements
router.get('/motorcycles/:id/requirements', requireAuth, async (req, res) => {
  try {
    const motorcycleTypeId = parseInt(req.params.id, 10);
    const requirements = await prisma.motorBoltRequirement.findMany({
      where: { motorcycleTypeId },
      include: {
        boltPosition: true,
        boltSpec: {
          include: {
            images: {
              orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
            },
          },
        },
      },
      orderBy: [
        { boltPosition: { sortOrder: 'asc' } },
        { sortOrder: 'asc' },
        { boltSpec: { diameterMm: 'asc' } },
      ],
    });

    res.json(requirements);
  } catch (error) {
    console.error('Error fetching requirements:', error);
    res.status(500).json({ error: 'Gagal mengambil matriks kebutuhan baut.' });
  }
});

// POST /api/motorcycles/:id/requirements (Admin only)
router.post('/motorcycles/:id/requirements', requireAuth, requireAdmin, async (req, res) => {
  try {
    const motorcycleTypeId = parseInt(req.params.id, 10);
    const {
      boltPositionId,
      customAreaName,
      customAreaCategory,
      boltSpecId,
      quantity,
      side,
      isOptional,
      sortOrder,
      notes,
    } = req.body;

    if ((!boltPositionId && !customAreaName) || !boltSpecId || !quantity || quantity <= 0) {
      return res.status(400).json({ error: 'Area/posisi, spesifikasi baut, dan jumlah (> 0) wajib diisi.' });
    }

    let resolvedPos;
    try {
      resolvedPos = await resolveOrCreatePosition(prisma, {
        boltPositionId,
        customAreaName,
        customAreaCategory,
      });
    } catch (posErr) {
      return res.status(posErr.status || 400).json({ error: posErr.message });
    }

    const bSide = side ? side.toUpperCase() : 'NONE';

    // Check unique constraint
    const existing = await prisma.motorBoltRequirement.findFirst({
      where: {
        motorcycleTypeId,
        boltPositionId: resolvedPos.id,
        boltSpecId: parseInt(boltSpecId, 10),
        side: bSide,
      },
    });

    if (existing) {
      return res.status(400).json({ error: 'Kombinasi posisi, spesifikasi baut, dan sisi sudah terdaftar untuk motor ini.' });
    }

    const requirement = await prisma.motorBoltRequirement.create({
      data: {
        motorcycleTypeId,
        boltPositionId: resolvedPos.id,
        boltSpecId: parseInt(boltSpecId, 10),
        quantity: parseInt(quantity, 10),
        side: bSide,
        isOptional: Boolean(isOptional),
        sortOrder: sortOrder ? parseInt(sortOrder, 10) : 0,
        notes: notes ? notes.trim() : null,
      },
      include: {
        boltPosition: true,
        boltSpec: {
          include: {
            images: {
              orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
            },
          },
        },
      },
    });

    await logAudit({
      userId: req.user.id,
      action: 'CREATE',
      entity: 'REQUIREMENT',
      entityId: requirement.id,
      detail: `Menambahkan requirement untuk motor ID ${motorcycleTypeId}: ${requirement.boltPosition.name} - ${requirement.boltSpec.code} (${requirement.quantity} pcs)`,
    });

    res.status(201).json(requirement);
  } catch (error) {
    console.error('Error creating requirement:', error);
    res.status(500).json({ error: 'Gagal menambahkan kebutuhan baut.' });
  }
});

// PUT /api/requirements/:id (Admin only)
router.put('/requirements/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { boltPositionId, boltSpecId, quantity, side, isOptional, sortOrder, notes } = req.body;

    const requirement = await prisma.motorBoltRequirement.update({
      where: { id },
      data: {
        boltPositionId: boltPositionId ? parseInt(boltPositionId, 10) : undefined,
        boltSpecId: boltSpecId ? parseInt(boltSpecId, 10) : undefined,
        quantity: quantity !== undefined ? parseInt(quantity, 10) : undefined,
        side: side ? side.toUpperCase() : undefined,
        isOptional: isOptional !== undefined ? Boolean(isOptional) : undefined,
        sortOrder: sortOrder !== undefined ? parseInt(sortOrder, 10) : undefined,
        notes: notes !== undefined ? (notes ? notes.trim() : null) : undefined,
      },
      include: {
        boltPosition: true,
        boltSpec: {
          include: {
            images: {
              orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
            },
          },
        },
      },
    });

    await logAudit({
      userId: req.user.id,
      action: 'UPDATE',
      entity: 'REQUIREMENT',
      entityId: requirement.id,
      detail: `Mengubah requirement ID ${id}`,
    });

    res.json(requirement);
  } catch (error) {
    console.error('Error updating requirement:', error);
    res.status(500).json({ error: 'Gagal memperbarui kebutuhan baut.' });
  }
});

// DELETE /api/requirements/:id (Admin only)
router.delete('/requirements/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await prisma.motorBoltRequirement.delete({ where: { id } });

    await logAudit({
      userId: req.user.id,
      action: 'DELETE',
      entity: 'REQUIREMENT',
      entityId: id,
      detail: `Menghapus requirement ID ${id}`,
    });

    res.json({ message: 'Kebutuhan baut berhasil dihapus.' });
  } catch (error) {
    console.error('Error deleting requirement:', error);
    res.status(500).json({ error: 'Gagal menghapus kebutuhan baut.' });
  }
});

module.exports = router;

