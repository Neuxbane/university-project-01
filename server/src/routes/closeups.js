const express = require('express');
const fs = require('fs');
const path = require('path');
const prisma = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');
const { createUploader } = require('../middleware/upload');
const { resolveOrCreatePosition } = require('../utils/positionHelper');

const router = express.Router();
const uploadCloseup = createUploader('closeups');

const CLOSEUP_INCLUDE = {
  boltPosition: true,
  pins: {
    orderBy: { id: 'asc' },
    include: {
      boltSpec: {
        include: {
          images: {
            orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
          },
        },
      },
    },
  },
};

function safeUnlink(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return;
  try {
    fs.unlinkSync(filePath);
  } catch (err) {
    console.warn('Failed to unlink file:', err.message);
  }
}

// GET /api/motorcycles/:motorId/closeups
router.get('/motorcycles/:motorId/closeups', requireAuth, async (req, res) => {
  try {
    const motorcycleTypeId = parseInt(req.params.motorId, 10);
    if (!Number.isInteger(motorcycleTypeId)) {
      return res.status(400).json({ error: 'ID motor tidak valid.' });
    }

    const where = { motorcycleTypeId };
    if (req.query.boltPositionId) {
      const posId = parseInt(req.query.boltPositionId, 10);
      if (Number.isInteger(posId)) where.boltPositionId = posId;
    }

    const closeups = await prisma.closeUpPhoto.findMany({
      where,
      include: CLOSEUP_INCLUDE,
      orderBy: [{ boltPosition: { sortOrder: 'asc' } }, { createdAt: 'desc' }],
    });

    res.json(closeups);
  } catch (error) {
    console.error('Error fetching close-up photos:', error);
    res.status(500).json({ error: 'Gagal memuat foto close-up area motor.' });
  }
});

// POST /api/motorcycles/:motorId/closeups (Admin only, multipart photo or JSON imageUrl)
router.post('/motorcycles/:motorId/closeups', requireAuth, requireAdmin, (req, res, next) => {
  uploadCloseup.single('photo')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Gagal mengunggah foto close-up.' });
    }
    next();
  });
}, async (req, res) => {
  try {
    const motorcycleTypeId = parseInt(req.params.motorId, 10);
    if (!Number.isInteger(motorcycleTypeId)) {
      safeUnlink(req.file?.path);
      return res.status(400).json({ error: 'ID motor tidak valid.' });
    }

    const motorExists = await prisma.motorcycleType.findUnique({
      where: { id: motorcycleTypeId },
      select: { id: true, displayName: true },
    });
    if (!motorExists) {
      safeUnlink(req.file?.path);
      return res.status(404).json({ error: 'Tipe motor tidak ditemukan.' });
    }

    let posExists;
    try {
      posExists = await resolveOrCreatePosition(prisma, {
        boltPositionId: req.body.boltPositionId,
        customAreaName: req.body.customAreaName,
        customAreaCategory: req.body.customAreaCategory,
      });
    } catch (posErr) {
      safeUnlink(req.file?.path);
      return res.status(posErr.status || 400).json({ error: posErr.message });
    }

    let imageUrl = null;
    if (req.file) {
      imageUrl = `/uploads/closeups/${req.file.filename}`;
    } else if (req.body.imageUrl && String(req.body.imageUrl).trim()) {
      imageUrl = String(req.body.imageUrl).trim();
    } else {
      return res.status(400).json({ error: 'File foto close-up atau URL gambar wajib dikirim.' });
    }

    const created = await prisma.closeUpPhoto.create({
      data: {
        motorcycleTypeId,
        boltPositionId: posExists.id,
        imageUrl,
        caption: req.body.caption ? String(req.body.caption).trim() : null,
      },
      include: CLOSEUP_INCLUDE,
    });

    await logAudit({
      userId: req.user.id,
      action: 'CREATE',
      entity: 'CLOSEUP_PHOTO',
      entityId: created.id,
      detail: `Mengunggah foto close-up area "${posExists.name}" untuk ${motorExists.displayName}`,
    });

    res.status(201).json(created);
  } catch (error) {
    safeUnlink(req.file?.path);
    console.error('Error creating close-up photo:', error);
    res.status(500).json({ error: 'Gagal menyimpan foto close-up.' });
  }
});

// DELETE /api/closeups/:photoId (Admin only)
router.delete('/closeups/:photoId', requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.photoId, 10);
    const existing = await prisma.closeUpPhoto.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Foto close-up tidak ditemukan.' });
    }

    await prisma.closeUpPhoto.delete({ where: { id } });

    if (existing.imageUrl.startsWith('/uploads/closeups/')) {
      const refs = await prisma.closeUpPhoto.count({ where: { imageUrl: existing.imageUrl } });
      if (refs === 0) {
        safeUnlink(path.join(__dirname, '../..', existing.imageUrl));
      }
    }

    await logAudit({
      userId: req.user.id,
      action: 'DELETE',
      entity: 'CLOSEUP_PHOTO',
      entityId: id,
      detail: `Menghapus foto close-up #${id}`,
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting close-up photo:', error);
    res.status(500).json({ error: 'Gagal menghapus foto close-up.' });
  }
});

// POST /api/closeups/:photoId/pins (Admin only)
router.post('/closeups/:photoId/pins', requireAuth, requireAdmin, async (req, res) => {
  try {
    const closeUpPhotoId = parseInt(req.params.photoId, 10);
    const boltSpecId = parseInt(req.body.boltSpecId, 10);
    const x = Number(req.body.x);
    const y = Number(req.body.y);
    const quantity = req.body.quantity !== undefined ? parseInt(req.body.quantity, 10) : 1;
    const label = req.body.label ? String(req.body.label).trim() : null;

    if (!Number.isInteger(closeUpPhotoId) || !Number.isInteger(boltSpecId)) {
      return res.status(400).json({ error: 'Foto close-up dan spesifikasi baut wajib dipilih.' });
    }
    if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > 100 || y < 0 || y > 100) {
      return res.status(400).json({ error: 'Koordinat titik (x, y) harus di antara 0 hingga 100.' });
    }
    if (!Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({ error: 'Jumlah baut minimal 1 pcs.' });
    }

    const [photoExists, specExists] = await Promise.all([
      prisma.closeUpPhoto.findUnique({ where: { id: closeUpPhotoId }, select: { id: true } }),
      prisma.boltSpec.findUnique({ where: { id: boltSpecId }, select: { id: true, code: true } }),
    ]);

    if (!photoExists) {
      return res.status(404).json({ error: 'Foto close-up tidak ditemukan.' });
    }
    if (!specExists) {
      return res.status(400).json({ error: 'Spesifikasi baut tidak ditemukan.' });
    }

    const created = await prisma.closeUpBoltPin.create({
      data: {
        closeUpPhotoId,
        boltSpecId,
        x,
        y,
        quantity,
        label,
      },
      include: {
        boltSpec: {
          include: {
            images: { orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }] },
          },
        },
      },
    });

    await logAudit({
      userId: req.user.id,
      action: 'CREATE',
      entity: 'CLOSEUP_PIN',
      entityId: created.id,
      detail: `Menandai baut ${specExists.code} (${quantity} pcs) pada foto close-up #${closeUpPhotoId}`,
    });

    res.status(201).json(created);
  } catch (error) {
    console.error('Error creating close-up pin:', error);
    res.status(500).json({ error: 'Gagal menyimpan titik baut pada foto close-up.' });
  }
});

// PUT /api/closeup-pins/:pinId (Admin only)
router.put('/closeup-pins/:pinId', requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.pinId, 10);
    const existing = await prisma.closeUpBoltPin.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Titik baut tidak ditemukan.' });
    }

    const data = {};
    if (req.body.boltSpecId !== undefined) {
      const specId = parseInt(req.body.boltSpecId, 10);
      const specExists = await prisma.boltSpec.findUnique({ where: { id: specId }, select: { id: true } });
      if (!specExists) return res.status(400).json({ error: 'Spesifikasi baut tidak ditemukan.' });
      data.boltSpecId = specId;
    }
    if (req.body.x !== undefined) {
      const x = Number(req.body.x);
      if (!Number.isFinite(x) || x < 0 || x > 100) return res.status(400).json({ error: 'Koordinat X tidak valid.' });
      data.x = x;
    }
    if (req.body.y !== undefined) {
      const y = Number(req.body.y);
      if (!Number.isFinite(y) || y < 0 || y > 100) return res.status(400).json({ error: 'Koordinat Y tidak valid.' });
      data.y = y;
    }
    if (req.body.quantity !== undefined) {
      const qty = parseInt(req.body.quantity, 10);
      if (!Number.isInteger(qty) || qty < 1) return res.status(400).json({ error: 'Jumlah baut minimal 1 pcs.' });
      data.quantity = qty;
    }
    if (req.body.label !== undefined) {
      data.label = req.body.label ? String(req.body.label).trim() : null;
    }

    const updated = await prisma.closeUpBoltPin.update({
      where: { id },
      data,
      include: {
        boltSpec: {
          include: {
            images: { orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }] },
          },
        },
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Error updating close-up pin:', error);
    res.status(500).json({ error: 'Gagal memperbarui titik baut.' });
  }
});

// DELETE /api/closeup-pins/:pinId (Admin only)
router.delete('/closeup-pins/:pinId', requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.pinId, 10);
    const existing = await prisma.closeUpBoltPin.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Titik baut tidak ditemukan.' });
    }

    await prisma.closeUpBoltPin.delete({ where: { id } });

    await logAudit({
      userId: req.user.id,
      action: 'DELETE',
      entity: 'CLOSEUP_PIN',
      entityId: id,
      detail: `Menghapus titik baut #${id} dari foto close-up #${existing.closeUpPhotoId}`,
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting close-up pin:', error);
    res.status(500).json({ error: 'Gagal menghapus titik baut.' });
  }
});

module.exports = router;
