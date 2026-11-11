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
        models: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        _count: {
          select: {
            requirements: true,
            packages: true,
            models: true,
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

    const isManager = req.user?.role === 'ADMIN'
      || req.user?.roleRel?.name === 'ADMIN'
      || (req.user?.permissionCodes || []).includes('*')
      || (req.user?.permissionCodes || []).includes('MOTORCYCLES_MANAGE');

    const pickData = await buildPickListData({
      motorcycleTypeId,
      packageId,
      allowInactive: isManager,
    });

    const [latestModel, annotations, allPositions, motorPackages, closeUpPhotos] = await Promise.all([
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
        where: {
          OR: [
            { motorcycleTypeId },
            { id: { in: pickData.requirements.map((r) => r.boltPositionId) } },
          ],
        },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      }),
      prisma.package.findMany({
        where: { motorcycleTypeId, status: 'ACTIVE' },
        select: {
          id: true,
          name: true,
          packageType: true,
          description: true,
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.closeUpPhoto.findMany({
        where: { motorcycleTypeId },
        include: {
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
        },
        orderBy: [{ boltPosition: { sortOrder: 'asc' } }, { createdAt: 'desc' }],
      }),
    ]);

    // Derive distinct positions belonging to or used on this motorcycle
    const posMap = new Map();
    const ensurePosEntry = (p, side = 'NONE') => {
      if (!p) return null;
      if (!posMap.has(p.id)) {
        posMap.set(p.id, {
          id: p.id,
          name: p.name,
          category: p.category,
          photoUrl: p.photoUrl,
          motorcycleTypeId: p.motorcycleTypeId ?? null,
          quantity: 0,
          side,
          boltSpecIds: [],
        });
      }
      return posMap.get(p.id);
    };

    for (const reqRow of pickData.requirements) {
      const existing = ensurePosEntry(reqRow.boltPosition, reqRow.side);
      if (!existing) continue;
      existing.quantity += reqRow.quantity;
      if (!existing.boltSpecIds.includes(reqRow.boltSpecId)) {
        existing.boltSpecIds.push(reqRow.boltSpecId);
      }
    }

    for (const ann of annotations) {
      ensurePosEntry(ann.boltPosition);
    }

    for (const cu of closeUpPhotos) {
      ensurePosEntry(cu.boltPosition);
    }

    for (const p of allPositions) {
      if (p.motorcycleTypeId === motorcycleTypeId) {
        ensurePosEntry(p);
      }
    }

    res.json({
      motorcycle: pickData.motorcycle,
      package: pickData.package,
      packages: motorPackages,
      summary: pickData.summary,
      model: latestModel || null,
      positions: Array.from(posMap.values()),
      allPositions,
      annotations,
      closeUpPhotos,
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

function safeUnlinkFile(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return;
  try {
    fs.unlinkSync(filePath);
  } catch (err) {
    console.warn('Failed to unlink file:', err.message);
  }
}

async function unlinkModelFileIfUnused(modelUrl) {
  if (!modelUrl || !modelUrl.startsWith('/uploads/models/')) return;
  const refs = await prisma.motorcycleModel.count({ where: { modelUrl } });
  if (refs === 0) {
    safeUnlinkFile(path.join(__dirname, '../..', modelUrl));
  }
}

function validateOffText(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    return { valid: false, error: 'Teks format OFF wajib diisi.' };
  }
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.replace(/#.*$/, '').trim())
    .filter((line) => line.length > 0);

  if (lines.length < 2) {
    return { valid: false, error: 'Format OFF tidak lengkap.' };
  }

  const headerTokens = lines[0].split(/\s+/);
  const headerTag = headerTokens[0].toUpperCase();
  if (!/^(ST)?(C?N?)OFF$/.test(headerTag)) {
    return { valid: false, error: 'Header OFF harus diawali kata OFF (atau COFF/NOFF).' };
  }

  let cursor = 1;
  let counts = headerTokens.slice(1);
  if (counts.length < 2) {
    counts = lines[cursor].split(/\s+/);
    cursor++;
  }

  const numVerts = parseInt(counts[0], 10);
  const numFaces = parseInt(counts[1], 10);
  if (!Number.isInteger(numVerts) || numVerts < 3 || !Number.isInteger(numFaces) || numFaces < 1) {
    return { valid: false, error: 'Jumlah vertex (>= 3) dan face (>= 1) pada format OFF tidak valid.' };
  }
  if (cursor + numVerts + numFaces > lines.length) {
    return { valid: false, error: 'Jumlah baris vertex/face tidak sesuai header OFF.' };
  }

  for (let i = 0; i < numVerts; i++) {
    const coords = lines[cursor++].split(/\s+/).slice(0, 3).map(Number);
    if (coords.length < 3 || coords.some((n) => !Number.isFinite(n))) {
      return { valid: false, error: `Koordinat vertex ke-${i + 1} pada format OFF tidak valid.` };
    }
  }

  for (let f = 0; f < numFaces; f++) {
    const parts = lines[cursor++].split(/\s+/);
    const nSides = parseInt(parts[0], 10);
    if (!Number.isInteger(nSides) || nSides < 3 || parts.length < 1 + nSides) {
      return { valid: false, error: `Definisi face ke-${f + 1} pada format OFF tidak valid.` };
    }
    for (let k = 0; k < nSides; k++) {
      const vi = parseInt(parts[1 + k], 10);
      if (!Number.isInteger(vi) || vi < 0 || vi >= numVerts) {
        return { valid: false, error: `Indeks vertex pada face ke-${f + 1} di luar jangkauan.` };
      }
    }
  }

  return { valid: true, numVerts, numFaces };
}

function validateUploadedModelFile(file) {
  if (!file || !file.path) return false;
  const ext = path.extname(file.originalname || file.filename || '').toLowerCase();
  try {
    if (ext === '.glb') {
      const fd = fs.openSync(file.path, 'r');
      const hdr = Buffer.alloc(12);
      const bytesRead = fs.readSync(fd, hdr, 0, 12, 0);
      fs.closeSync(fd);
      if (bytesRead < 12) return false;
      // Magic header must be 'glTF' (0x46546c67 LE)
      return hdr.readUInt32LE(0) === 0x46546c67 && hdr.readUInt32LE(4) === 2;
    }
    if (ext === '.gltf') {
      const raw = fs.readFileSync(file.path, 'utf8');
      const parsed = JSON.parse(raw);
      return Boolean(parsed && typeof parsed === 'object' && parsed.asset);
    }
    if (ext === '.off') {
      const raw = fs.readFileSync(file.path, 'utf8');
      return validateOffText(raw).valid;
    }
    return false;
  } catch {
    return false;
  }
}

// POST /api/motorcycles/:id/model (Admin only, multipart .glb/.gltf/.off OR JSON { offText })
router.post('/:id/model', requireAuth, requireAdmin, (req, res, next) => {
  uploadModel.single('model')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Gagal mengunggah model 3D.' });
    }
    next();
  });
}, async (req, res) => {
  let savedPastedPath = null;
  try {
    const motorcycleTypeId = parseInt(req.params.id, 10);
    const motorcycle = await prisma.motorcycleType.findUnique({ where: { id: motorcycleTypeId } });
    if (!motorcycle) {
      safeUnlinkFile(req.file?.path);
      return res.status(404).json({ error: 'Tipe motor tidak ditemukan.' });
    }

    let modelUrl = null;
    if (req.file) {
      if (!validateUploadedModelFile(req.file)) {
        safeUnlinkFile(req.file.path);
        return res.status(400).json({ error: 'File model 3D (.glb/.gltf/.off) tidak valid atau rusak.' });
      }
      modelUrl = `/uploads/models/${req.file.filename}`;
    } else if (req.body?.offText !== undefined) {
      const check = validateOffText(req.body.offText);
      if (!check.valid) {
        return res.status(400).json({ error: check.error });
      }
      const modelsDir = path.join(__dirname, '../../uploads/models');
      fs.mkdirSync(modelsDir, { recursive: true });
      const filename = `${Date.now()}_pasted_motor_${motorcycleTypeId}.off`;
      savedPastedPath = path.join(modelsDir, filename);
      fs.writeFileSync(savedPastedPath, String(req.body.offText), 'utf8');
      modelUrl = `/uploads/models/${filename}`;
    } else {
      return res.status(400).json({ error: 'File model 3D (.glb/.gltf/.off) atau teks format OFF wajib diisi.' });
    }

    const rawScale = req.body.scale !== undefined ? Number(req.body.scale) : 1;
    const rawRotY = req.body.rotationY !== undefined ? Number(req.body.rotationY) : 0;
    const scale = Number.isFinite(rawScale) && rawScale >= 0.05 && rawScale <= 20 ? rawScale : 1;
    const rotationY = Number.isFinite(rawRotY) ? rawRotY : 0;

    const created = await prisma.motorcycleModel.create({
      data: {
        motorcycleTypeId,
        modelUrl,
        thumbnailUrl: req.body.thumbnailUrl || null,
        scale,
        rotationY,
      },
    });

    await logAudit({
      userId: req.user.id,
      action: 'CREATE',
      entity: 'MOTORCYCLE_MODEL',
      entityId: created.id,
      detail: `Memasang model 3D untuk motor ${motorcycle.displayName}: ${modelUrl}`,
    });

    res.status(201).json({
      id: created.id,
      motorcycleTypeId: created.motorcycleTypeId,
      modelUrl: created.modelUrl,
      thumbnailUrl: created.thumbnailUrl,
      scale: created.scale,
      rotationY: created.rotationY,
      createdAt: created.createdAt,
    });
  } catch (error) {
    safeUnlinkFile(req.file?.path);
    safeUnlinkFile(savedPastedPath);
    console.error('Error uploading motorcycle 3D model:', error);
    res.status(500).json({ error: 'Gagal menyimpan model 3D motor.' });
  }
});

// PATCH /api/motorcycles/:id/model (Admin only, adjust scale / rotationY)
router.patch('/:id/model', requireAuth, requireAdmin, async (req, res) => {
  try {
    const motorcycleTypeId = parseInt(req.params.id, 10);
    if (Number.isNaN(motorcycleTypeId)) {
      return res.status(400).json({ error: 'ID motor tidak valid.' });
    }

    const activeModel = await prisma.motorcycleModel.findFirst({
      where: { motorcycleTypeId },
      orderBy: { createdAt: 'desc' },
    });
    if (!activeModel) {
      return res.status(404).json({ error: 'Belum ada model 3D pada motor ini.' });
    }

    const data = {};
    if (req.body.scale !== undefined) {
      const s = Number(req.body.scale);
      if (!Number.isFinite(s) || s < 0.05 || s > 20) {
        return res.status(400).json({ error: 'Skala model harus di antara 0.05 hingga 20.' });
      }
      data.scale = s;
    }
    if (req.body.rotationY !== undefined) {
      const r = Number(req.body.rotationY);
      if (!Number.isFinite(r)) {
        return res.status(400).json({ error: 'Nilai rotasi Y tidak valid.' });
      }
      data.rotationY = r;
    }

    const updated = await prisma.motorcycleModel.update({
      where: { id: activeModel.id },
      data,
    });

    await logAudit({
      userId: req.user.id,
      action: 'UPDATE',
      entity: 'MOTORCYCLE_MODEL',
      entityId: updated.id,
      detail: `Mengubah skala/rotasi model 3D #${updated.id} (scale=${updated.scale}, rotY=${updated.rotationY})`,
    });

    res.json(updated);
  } catch (error) {
    console.error('Error updating motorcycle 3D model:', error);
    res.status(500).json({ error: 'Gagal memperbarui pengaturan model 3D.' });
  }
});

// DELETE /api/motorcycles/:id/model (Admin only, remove active 3D model(s) & revert to 2D)
router.delete('/:id/model', requireAuth, requireAdmin, async (req, res) => {
  try {
    const motorcycleTypeId = parseInt(req.params.id, 10);
    if (Number.isNaN(motorcycleTypeId)) {
      return res.status(400).json({ error: 'ID motor tidak valid.' });
    }

    const existingModels = await prisma.motorcycleModel.findMany({
      where: { motorcycleTypeId },
    });
    if (existingModels.length === 0) {
      return res.status(404).json({ error: 'Belum ada model 3D pada motor ini.' });
    }

    const modelIds = existingModels.map((m) => m.id);
    const urls = [...new Set(existingModels.map((m) => m.modelUrl).filter(Boolean))];

    await prisma.$transaction([
      prisma.positionAnnotation.deleteMany({
        where: { modelId: { in: modelIds } },
      }),
      prisma.motorcycleModel.deleteMany({
        where: { motorcycleTypeId },
      }),
    ]);

    for (const url of urls) {
      await unlinkModelFileIfUnused(url);
    }

    await logAudit({
      userId: req.user.id,
      action: 'DELETE',
      entity: 'MOTORCYCLE_MODEL',
      entityId: motorcycleTypeId,
      detail: `Menghapus ${existingModels.length} model 3D dari motor ID ${motorcycleTypeId}`,
    });

    res.json({ success: true, deletedCount: existingModels.length });
  } catch (error) {
    console.error('Error deleting motorcycle 3D model:', error);
    res.status(500).json({ error: 'Gagal menghapus model 3D motor.' });
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
        models: {
          orderBy: { createdAt: 'desc' },
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

// DELETE /api/motorcycles/:id/positions/:positionId (Admin only)
// Removes all requirements, annotations, and close-up photos for this area on this motorcycle,
// and deletes the BoltPosition row too if it is owned by this motorcycle or now completely unused.
router.delete('/:id/positions/:positionId', requireAuth, requireAdmin, async (req, res) => {
  try {
    const motorcycleTypeId = parseInt(req.params.id, 10);
    const boltPositionId = parseInt(req.params.positionId, 10);
    if (!Number.isInteger(motorcycleTypeId) || !Number.isInteger(boltPositionId)) {
      return res.status(400).json({ error: 'ID motor atau area posisi tidak valid.' });
    }

    const position = await prisma.boltPosition.findUnique({ where: { id: boltPositionId } });
    if (!position) {
      return res.status(404).json({ error: 'Area / posisi baut tidak ditemukan.' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const [delReqs, delAnnos, delCus] = await Promise.all([
        tx.motorBoltRequirement.deleteMany({ where: { motorcycleTypeId, boltPositionId } }),
        tx.positionAnnotation.deleteMany({ where: { motorcycleTypeId, boltPositionId } }),
        tx.closeUpPhoto.deleteMany({ where: { motorcycleTypeId, boltPositionId } }),
      ]);

      let removedPositionRecord = false;
      if (position.motorcycleTypeId === motorcycleTypeId) {
        await tx.boltPosition.delete({ where: { id: boltPositionId } });
        removedPositionRecord = true;
      } else if (position.motorcycleTypeId !== null) {
        const remainingRefs = await Promise.all([
          tx.motorBoltRequirement.count({ where: { boltPositionId } }),
          tx.positionAnnotation.count({ where: { boltPositionId } }),
          tx.closeUpPhoto.count({ where: { boltPositionId } }),
        ]);
        if (remainingRefs.every((c) => c === 0)) {
          await tx.boltPosition.delete({ where: { id: boltPositionId } });
          removedPositionRecord = true;
        }
      }

      return {
        removedPositionRecord,
        deletedCounts: {
          requirements: delReqs.count,
          annotations: delAnnos.count,
          closeUpPhotos: delCus.count,
        },
      };
    });

    await logAudit({
      userId: req.user.id,
      action: 'DELETE',
      entity: 'MOTOR_AREA',
      entityId: boltPositionId,
      detail: `Menghapus area "${position.name}" dari motor ID ${motorcycleTypeId} (removedPos=${result.removedPositionRecord})`,
    });

    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error removing motorcycle area:', error);
    res.status(500).json({ error: 'Gagal menghapus area dari motor.' });
  }
});

module.exports = router;
