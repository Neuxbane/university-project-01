const express = require('express');
const path = require('path');
const fs = require('fs');
const prisma = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');
const { createUploader, createModelUploader } = require('../middleware/upload');
const { buildPickListData } = require('../utils/pickListAggregator');

const router = express.Router();
const upload = createUploader('motorcycles');
const uploadModel = createModelUploader();

// GET /api/motorcycles
router.get('/', requireAuth, async (req, res) => {
  try {
    const { q, brand, status } = req.query;

    const where = {};
    if (status === 'active') where.isActive = true;
    if (status === 'inactive') where.isActive = false;
    if (brand) where.brand = { equals: brand, mode: 'insensitive' };

    if (q) {
      where.OR = [
        { displayName: { contains: q, mode: 'insensitive' } },
        { brand: { contains: q, mode: 'insensitive' } },
        { model: { contains: q, mode: 'insensitive' } },
        { variant: { contains: q, mode: 'insensitive' } },
      ];
    }

    const motorcycles = await prisma.motorcycleType.findMany({
      where,
      orderBy: [{ brand: 'asc' }, { model: 'asc' }, { yearStart: 'desc' }],
      include: {
        images: {
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
        },
        _count: {
          select: {
            requirements: true,
            packages: true,
          },
        },
      },
    });

    res.json(motorcycles);
  } catch (error) {
    console.error('Error fetching motorcycles:', error);
    res.status(500).json({ error: 'Gagal mengambil data tipe motor.' });
  }
});

// GET /api/motorcycles/:id/location-map
router.get('/:id/location-map', requireAuth, async (req, res) => {
  try {
    const motorcycleTypeId = parseInt(req.params.id, 10);
    const packageId = req.query.packageId ? parseInt(req.query.packageId, 10) : undefined;

    const pickData = await buildPickListData({ motorcycleTypeId, packageId });

    const [latestModel, annotations, allPositions] = await Promise.all([
      prisma.motorcycleModel.findFirst({
        where: { motorcycleTypeId },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.positionAnnotation.findMany({
        where: { motorcycleTypeId },
        include: {
          boltPosition: true,
        },
        orderBy: { id: 'asc' },
      }),
      prisma.boltPosition.findMany({
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      }),
    ]);

    // Derive distinct positions used on this motorcycle (with bolt count & boltSpecIds)
    const posMap = new Map();
    for (const reqRow of pickData.requirements) {
      const p = reqRow.boltPosition;
      if (!p) continue;
      const existing = posMap.get(p.id) || {
        id: p.id,
        name: p.name,
        category: p.category,
        photoUrl: p.photoUrl,
        quantity: 0,
        side: reqRow.side,
        boltSpecIds: [],
      };
      existing.quantity += reqRow.quantity;
      if (!existing.boltSpecIds.includes(reqRow.boltSpecId)) {
        existing.boltSpecIds.push(reqRow.boltSpecId);
      }
      posMap.set(p.id, existing);
    }

    res.json({
      motorcycle: pickData.motorcycle,
      package: pickData.package,
      summary: pickData.summary,
      model: latestModel || null,
      positions: Array.from(posMap.values()),
      allPositions,
      annotations,
      bolts: pickData.consolidatedTotals,
      positionBreakdown: pickData.positionBreakdown,
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('Error fetching motorcycle location map:', error);
    res.status(500).json({ error: 'Gagal memuat peta lokasi baut motor.' });
  }
});

// POST /api/motorcycles/:id/model (Admin only, multipart .glb/.gltf)
router.post('/:id/model', requireAuth, requireAdmin, (req, res, next) => {
  uploadModel.single('model')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Gagal mengunggah model 3D.' });
    }
    next();
  });
}, async (req, res) => {
  try {
    const motorcycleTypeId = parseInt(req.params.id, 10);
    const motorcycle = await prisma.motorcycleType.findUnique({ where: { id: motorcycleTypeId } });
    if (!motorcycle) {
      return res.status(404).json({ error: 'Tipe motor tidak ditemukan.' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'File model 3D (.glb/.gltf) wajib diunggah.' });
    }

    const modelUrl = `/uploads/models/${req.file.filename}`;
    const scale = req.body.scale !== undefined ? Number(req.body.scale) : 1;
    const rotationY = req.body.rotationY !== undefined ? Number(req.body.rotationY) : 0;

    const created = await prisma.motorcycleModel.create({
      data: {
        motorcycleTypeId,
        modelUrl,
        thumbnailUrl: req.body.thumbnailUrl || null,
        scale: Number.isFinite(scale) ? scale : 1,
        rotationY: Number.isFinite(rotationY) ? rotationY : 0,
      },
    });

    await logAudit({
      userId: req.user.id,
      action: 'CREATE',
      entity: 'MOTORCYCLE_MODEL',
      entityId: created.id,
      detail: `Mengunggah model 3D untuk motor ${motorcycle.displayName}: ${modelUrl}`,
    });

    res.status(201).json({
      id: created.id,
      modelUrl: created.modelUrl,
      scale: created.scale,
      rotationY: created.rotationY,
    });
  } catch (error) {
    console.error('Error uploading motorcycle 3D model:', error);
    res.status(500).json({ error: 'Gagal menyimpan model 3D motor.' });
  }
});

// GET /api/motorcycles/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const motorcycle = await prisma.motorcycleType.findUnique({
      where: { id },
      include: {
        images: {
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
        },
        requirements: {
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
          ],
        },
        packages: {
          include: {
            items: {
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
          },
        },
      },
    });

    if (!motorcycle) {
      return res.status(404).json({ error: 'Tipe motor tidak ditemukan.' });
    }

    res.json(motorcycle);
  } catch (error) {
    console.error('Error fetching motorcycle details:', error);
    res.status(500).json({ error: 'Gagal mengambil detail motor.' });
  }
});

// POST /api/motorcycles (Admin only)
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { brand, model, variant, yearStart, yearEnd, notes } = req.body;
    if (!brand || !model || !variant || !yearStart) {
      return res.status(400).json({ error: 'Merek, model, varian, dan tahun awal wajib diisi.' });
    }

    const yStart = parseInt(yearStart, 10);
    const yEnd = yearEnd ? parseInt(yearEnd, 10) : null;
    const displayName = `${brand.trim()} ${model.trim()} ${variant.trim()} (${yStart}${yEnd ? `-${yEnd}` : ''})`;

    const existing = await prisma.motorcycleType.findFirst({
      where: {
        brand: { equals: brand.trim(), mode: 'insensitive' },
        model: { equals: model.trim(), mode: 'insensitive' },
        variant: { equals: variant.trim(), mode: 'insensitive' },
        yearStart: yStart,
        yearEnd: yEnd,
      },
    });

    if (existing) {
      return res.status(400).json({ error: 'Tipe motor dengan data ini sudah terdaftar.' });
    }

    const motorcycle = await prisma.motorcycleType.create({
      data: {
        brand: brand.trim(),
        model: model.trim(),
        variant: variant.trim(),
        yearStart: yStart,
        yearEnd: yEnd,
        displayName,
        notes: notes ? notes.trim() : null,
        isActive: true,
      },
      include: {
        images: true,
      },
    });

    await logAudit({
      userId: req.user.id,
      action: 'CREATE',
      entity: 'MOTORCYCLE',
      entityId: motorcycle.id,
      detail: `Menambahkan motor: ${motorcycle.displayName}`,
    });

    res.status(201).json(motorcycle);
  } catch (error) {
    console.error('Error creating motorcycle:', error);
    res.status(500).json({ error: 'Gagal menambahkan motor baru.' });
  }
});

// PUT /api/motorcycles/:id (Admin only)
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { brand, model, variant, yearStart, yearEnd, notes, isActive } = req.body;

    const yStart = parseInt(yearStart, 10);
    const yEnd = yearEnd ? parseInt(yearEnd, 10) : null;
    const displayName = `${brand.trim()} ${model.trim()} ${variant.trim()} (${yStart}${yEnd ? `-${yEnd}` : ''})`;

    const updated = await prisma.motorcycleType.update({
      where: { id },
      data: {
        brand: brand.trim(),
        model: model.trim(),
        variant: variant.trim(),
        yearStart: yStart,
        yearEnd: yEnd,
        displayName,
        notes: notes ? notes.trim() : null,
        ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
      },
      include: {
        images: {
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
        },
      },
    });

    await logAudit({
      userId: req.user.id,
      action: 'UPDATE',
      entity: 'MOTORCYCLE',
      entityId: updated.id,
      detail: `Mengubah data motor: ${updated.displayName}`,
    });

    res.json(updated);
  } catch (error) {
    console.error('Error updating motorcycle:', error);
    res.status(500).json({ error: 'Gagal memperbarui data motor.' });
  }
});

// PATCH /api/motorcycles/:id/deactivate (Admin only)
router.patch('/:id/deactivate', requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const motorcycle = await prisma.motorcycleType.findUnique({ where: { id } });
    if (!motorcycle) {
      return res.status(404).json({ error: 'Tipe motor tidak ditemukan.' });
    }

    const updated = await prisma.motorcycleType.update({
      where: { id },
      data: { isActive: !motorcycle.isActive },
    });

    await logAudit({
      userId: req.user.id,
      action: updated.isActive ? 'ACTIVATE' : 'DEACTIVATE',
      entity: 'MOTORCYCLE',
      entityId: id,
      detail: `${updated.isActive ? 'Mengaktifkan' : 'Menonaktifkan'} motor: ${updated.displayName}`,
    });

    res.json(updated);
  } catch (error) {
    console.error('Error toggling motorcycle active status:', error);
    res.status(500).json({ error: 'Gagal mengubah status aktif motor.' });
  }
});

// POST /api/motorcycles/:id/images (Admin only)
// Supports multi-file upload via multipart/form-data or JSON with { url, caption, isPrimary }
router.post('/:id/images', requireAuth, requireAdmin, (req, res, next) => {
  upload.array('images', 10)(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Gagal mengunggah foto.' });
    }
    next();
  });
}, async (req, res) => {
  try {
    const motorcycleTypeId = parseInt(req.params.id, 10);
    const motorcycle = await prisma.motorcycleType.findUnique({
      where: { id: motorcycleTypeId },
      include: { images: true },
    });

    if (!motorcycle) {
      return res.status(404).json({ error: 'Tipe motor tidak ditemukan.' });
    }

    const createdImages = [];
    const hasExistingImages = motorcycle.images.length > 0;

    // 1. If files were uploaded via multipart/form-data
    if (req.files && req.files.length > 0) {
      const caption = req.body.caption || null;
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        const url = `/uploads/motorcycles/${file.filename}`;
        const isPrimary = !hasExistingImages && i === 0;

        const img = await prisma.motorcycleImage.create({
          data: {
            motorcycleTypeId,
            url,
            caption: Array.isArray(caption) ? caption[i] : caption,
            isPrimary,
          },
        });
        createdImages.push(img);
      }
    } else if (req.body.url) {
      // 2. Direct URL provided in JSON or form-data
      const { url, caption, isPrimary } = req.body;
      const shouldBePrimary = Boolean(isPrimary) || !hasExistingImages;

      if (shouldBePrimary && hasExistingImages) {
        await prisma.motorcycleImage.updateMany({
          where: { motorcycleTypeId },
          data: { isPrimary: false },
        });
      }

      const img = await prisma.motorcycleImage.create({
        data: {
          motorcycleTypeId,
          url: url.trim(),
          caption: caption ? caption.trim() : null,
          isPrimary: shouldBePrimary,
        },
      });
      createdImages.push(img);
    } else {
      return res.status(400).json({ error: 'Tidak ada file gambar atau URL yang dikirim.' });
    }

    await logAudit({
      userId: req.user.id,
      action: 'CREATE',
      entity: 'MOTORCYCLE',
      entityId: motorcycleTypeId,
      detail: `Menambahkan ${createdImages.length} foto untuk motor ${motorcycle.displayName}`,
    });

    const allImages = await prisma.motorcycleImage.findMany({
      where: { motorcycleTypeId },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
    });

    res.status(201).json(allImages);
  } catch (error) {
    console.error('Error adding motorcycle images:', error);
    res.status(500).json({ error: 'Gagal menambahkan foto motor.' });
  }
});

// DELETE /api/motorcycles/:id/images/:imageId (Admin only)
router.delete('/:id/images/:imageId', requireAuth, requireAdmin, async (req, res) => {
  try {
    const motorcycleTypeId = parseInt(req.params.id, 10);
    const imageId = parseInt(req.params.imageId, 10);

    const image = await prisma.motorcycleImage.findFirst({
      where: { id: imageId, motorcycleTypeId },
    });

    if (!image) {
      return res.status(404).json({ error: 'Foto motor tidak ditemukan.' });
    }

    await prisma.motorcycleImage.delete({ where: { id: imageId } });

    // If local file in uploads, unlink it
    if (image.url.startsWith('/uploads/')) {
      const localFilePath = path.join(__dirname, '../..', image.url);
      if (fs.existsSync(localFilePath)) {
        try {
          fs.unlinkSync(localFilePath);
        } catch (unlinkErr) {
          console.warn('Failed to delete physical image file:', unlinkErr.message);
        }
      }
    }

    // If deleted image was primary, set another image as primary if exists
    if (image.isPrimary) {
      const remaining = await prisma.motorcycleImage.findFirst({
        where: { motorcycleTypeId },
        orderBy: { createdAt: 'desc' },
      });
      if (remaining) {
        await prisma.motorcycleImage.update({
          where: { id: remaining.id },
          data: { isPrimary: true },
        });
      }
    }

    await logAudit({
      userId: req.user.id,
      action: 'DELETE',
      entity: 'MOTORCYCLE',
      entityId: motorcycleTypeId,
      detail: `Menghapus foto #${imageId} dari motor ID ${motorcycleTypeId}`,
    });

    const allImages = await prisma.motorcycleImage.findMany({
      where: { motorcycleTypeId },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
    });

    res.json(allImages);
  } catch (error) {
    console.error('Error deleting motorcycle image:', error);
    res.status(500).json({ error: 'Gagal menghapus foto motor.' });
  }
});

// PATCH /api/motorcycles/:id/images/:imageId/primary (Admin only)
router.patch('/:id/images/:imageId/primary', requireAuth, requireAdmin, async (req, res) => {
  try {
    const motorcycleTypeId = parseInt(req.params.id, 10);
    const imageId = parseInt(req.params.imageId, 10);

    await prisma.$transaction([
      prisma.motorcycleImage.updateMany({
        where: { motorcycleTypeId },
        data: { isPrimary: false },
      }),
      prisma.motorcycleImage.update({
        where: { id: imageId },
        data: { isPrimary: true },
      }),
    ]);

    const allImages = await prisma.motorcycleImage.findMany({
      where: { motorcycleTypeId },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
    });

    res.json(allImages);
  } catch (error) {
    console.error('Error setting primary image:', error);
    res.status(500).json({ error: 'Gagal mengatur foto utama motor.' });
  }
});

module.exports = router;
