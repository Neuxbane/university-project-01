const express = require('express');
const prisma = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');
const { resolveOrCreatePosition } = require('../utils/positionHelper');

const router = express.Router();

// POST /api/position-annotations (Admin only)
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const {
      boltPositionId,
      customAreaName,
      customAreaCategory,
      motorcycleTypeId,
      modelId,
      x,
      y,
      z = 0,
      normalX = 0,
      normalY = 0,
      normalZ = 1,
      label,
    } = req.body;

    if ((!boltPositionId && !customAreaName) || !motorcycleTypeId || x === undefined || y === undefined) {
      return res.status(400).json({ error: 'Area/posisi baut, tipe motor, dan koordinat (x, y) wajib diisi.' });
    }

    const motorId = parseInt(motorcycleTypeId, 10);
    const parsedModelId = modelId ? parseInt(modelId, 10) : null;

    if (!Number.isInteger(motorId)) {
      return res.status(400).json({ error: 'ID tipe motor harus berupa angka.' });
    }

    const [motorExists, modelExists] = await Promise.all([
      prisma.motorcycleType.findUnique({ where: { id: motorId }, select: { id: true } }),
      parsedModelId
        ? prisma.motorcycleModel.findUnique({ where: { id: parsedModelId }, select: { id: true } })
        : Promise.resolve(true),
    ]);

    if (!motorExists) {
      return res.status(400).json({ error: 'Tipe motor yang dipilih tidak ditemukan.' });
    }
    if (parsedModelId && !modelExists) {
      return res.status(400).json({ error: 'Model 3D yang dipilih tidak ditemukan.' });
    }

    let positionExists;
    try {
      positionExists = await resolveOrCreatePosition(prisma, {
        boltPositionId,
        customAreaName,
        customAreaCategory,
        motorcycleTypeId: motorId,
      });
    } catch (posErr) {
      return res.status(posErr.status || 400).json({ error: posErr.message });
    }

    const created = await prisma.positionAnnotation.create({
      data: {
        boltPositionId: positionExists.id,
        motorcycleTypeId: motorId,
        modelId: parsedModelId,
        x: Number(x),
        y: Number(y),
        z: Number(z),
        normalX: Number(normalX),
        normalY: Number(normalY),
        normalZ: Number(normalZ),
        label: label ? String(label).trim() : null,
      },
      include: {
        boltPosition: true,
      },
    });

    await logAudit({
      userId: req.user.id,
      action: 'CREATE',
      entity: 'POSITION_ANNOTATION',
      entityId: created.id,
      detail: `Menandai lokasi ${created.boltPosition?.name || created.boltPositionId} pada motor ID ${created.motorcycleTypeId}`,
    });

    res.status(201).json(created);
  } catch (error) {
    console.error('Error creating position annotation:', error);
    res.status(500).json({ error: 'Gagal menyimpan titik lokasi baut.' });
  }
});

// PUT /api/position-annotations/:id (Admin only)
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await prisma.positionAnnotation.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Titik lokasi tidak ditemukan.' });
    }

    const {
      boltPositionId,
      customAreaName,
      customAreaCategory,
      x,
      y,
      z,
      normalX,
      normalY,
      normalZ,
      label,
    } = req.body;

    let resolvedPositionId;
    if (boltPositionId !== undefined || customAreaName !== undefined) {
      try {
        const pos = await resolveOrCreatePosition(prisma, {
          boltPositionId,
          customAreaName,
          customAreaCategory,
          motorcycleTypeId: existing.motorcycleTypeId,
        });
        resolvedPositionId = pos.id;
      } catch (posErr) {
        return res.status(posErr.status || 400).json({ error: posErr.message });
      }
    }

    const updated = await prisma.positionAnnotation.update({
      where: { id },
      data: {
        ...(resolvedPositionId !== undefined ? { boltPositionId: resolvedPositionId } : {}),
        ...(x !== undefined ? { x: Number(x) } : {}),
        ...(y !== undefined ? { y: Number(y) } : {}),
        ...(z !== undefined ? { z: Number(z) } : {}),
        ...(normalX !== undefined ? { normalX: Number(normalX) } : {}),
        ...(normalY !== undefined ? { normalY: Number(normalY) } : {}),
        ...(normalZ !== undefined ? { normalZ: Number(normalZ) } : {}),
        ...(label !== undefined ? { label: label ? String(label).trim() : null } : {}),
      },
      include: {
        boltPosition: true,
      },
    });

    await logAudit({
      userId: req.user.id,
      action: 'UPDATE',
      entity: 'POSITION_ANNOTATION',
      entityId: updated.id,
      detail: `Memperbarui titik lokasi #${updated.id}`,
    });

    res.json(updated);
  } catch (error) {
    console.error('Error updating position annotation:', error);
    res.status(500).json({ error: 'Gagal memperbarui titik lokasi.' });
  }
});

// DELETE /api/position-annotations/:id (Admin only)
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await prisma.positionAnnotation.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Titik lokasi tidak ditemukan.' });
    }

    await prisma.positionAnnotation.delete({ where: { id } });

    await logAudit({
      userId: req.user.id,
      action: 'DELETE',
      entity: 'POSITION_ANNOTATION',
      entityId: id,
      detail: `Menghapus titik lokasi #${id} dari motor ID ${existing.motorcycleTypeId}`,
    });

    res.json({ success: true, id });
  } catch (error) {
    console.error('Error deleting position annotation:', error);
    res.status(500).json({ error: 'Gagal menghapus titik lokasi.' });
  }
});

module.exports = router;
