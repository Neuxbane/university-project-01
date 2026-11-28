const express = require('express');
const path = require('path');
const fs = require('fs');
const { UPLOADS_DIR, uploadPath } = require('../utils/uploadPaths');
const prisma = require('../db');
const { requireAuth, requirePermission } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');
const { createUploader } = require('../middleware/upload');
const { ILLUSTRATION_PREFIX } = require('../utils/sizeIllustration');
const { CATALOG_PREFIX, TYPE_LABELS } = require('../utils/catalogIllustration');
const { catalogImage } = require('../utils/catalog');

const router = express.Router();
const upload = createUploader('bolts');

// GET /api/bolt-specs
router.get('/', requireAuth, requirePermission('MENU_MASTER_BARANG', 'MOTORCYCLES_MANAGE', 'PACKAGES_MANAGE'), async (req, res) => {
  try {
    const { q, finish, headType, itemType } = req.query;

    // archived = former size specs only kept so old Riwayat checklists still show their items
    const where = { isArchived: false };
    if (itemType) where.itemType = { in: String(itemType).toUpperCase().split(',').map((t) => t.trim()).filter(Boolean) };
    if (finish) where.finish = { equals: finish, mode: 'insensitive' };
    if (headType) where.headType = { equals: headType, mode: 'insensitive' };
    if (q) {
      where.OR = [
        { code: { contains: q, mode: 'insensitive' } },
        { name: { contains: q, mode: 'insensitive' } },
        { headType: { contains: q, mode: 'insensitive' } },
        { notes: { contains: q, mode: 'insensitive' } },
      ];
    }

    const specs = await prisma.boltSpec.findMany({
      where,
      orderBy: [{ catalogNo: 'asc' }, { code: 'asc' }],
      include: {
        images: {
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
        },
        _count: {
          select: { requirements: true, packageItems: true },
        },
      },
    });

    res.json(specs);
  } catch (error) {
    console.error('Error fetching bolt specs:', error);
    res.status(500).json({ error: 'Gagal mengambil spesifikasi baut.' });
  }
});

// GET /api/bolt-specs/:id
router.get('/:id', requireAuth, requirePermission('MENU_MASTER_BARANG', 'MOTORCYCLES_MANAGE', 'PACKAGES_MANAGE'), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const spec = await prisma.boltSpec.findUnique({
      where: { id },
      include: {
        images: {
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
        },
        requirements: {
          include: {
            motorcycleType: true,
            boltPosition: true,
          },
        },
      },
    });

    if (!spec) {
      return res.status(404).json({ error: 'Spesifikasi baut tidak ditemukan.' });
    }

    res.json(spec);
  } catch (error) {
    console.error('Error fetching bolt spec detail:', error);
    res.status(500).json({ error: 'Gagal mengambil detail spesifikasi baut.' });
  }
});

// POST /api/bolt-specs (Admin only)
router.post('/', requireAuth, requirePermission('BOLTS_MANAGE'), async (req, res) => {
  try {
    const { code, diameterMm, lengthMm, headType, threadPitch, material, finish, notes } = req.body;
    if (!code || diameterMm === undefined || lengthMm === undefined || !headType) {
      return res.status(400).json({ error: 'Kode, diameter, panjang, dan tipe kepala baut wajib diisi.' });
    }

    const spec = await prisma.boltSpec.create({
      data: {
        code: code.trim().toUpperCase(),
        diameterMm: parseFloat(diameterMm),
        lengthMm: parseFloat(lengthMm),
        headType: headType.trim(),
        threadPitch: threadPitch ? threadPitch.trim() : null,
        material: material ? material.trim() : 'Titanium Gr5',
        finish: finish ? finish.trim() : 'Glossy',
        notes: notes ? notes.trim() : null,
      },
      include: {
        images: true,
      },
    });

    await logAudit({
      userId: req.user.id,
      action: 'CREATE',
      entity: 'BOLT_SPEC',
      entityId: spec.id,
      detail: `Menambahkan spesifikasi baut: ${spec.code}`,
    });

    res.status(201).json(spec);
  } catch (error) {
    console.error('Error creating bolt spec:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Kode spesifikasi baut sudah terdaftar.' });
    }
    res.status(500).json({ error: 'Gagal menambahkan spesifikasi baut.' });
  }
});

// PUT /api/bolt-specs/:id (Admin only)
router.put('/:id', requireAuth, requirePermission('BOLTS_MANAGE'), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { code, diameterMm, lengthMm, headType, threadPitch, material, finish, notes } = req.body;

    const spec = await prisma.boltSpec.update({
      where: { id },
      data: {
        code: code ? code.trim().toUpperCase() : undefined,
        diameterMm: diameterMm !== undefined ? parseFloat(diameterMm) : undefined,
        lengthMm: lengthMm !== undefined ? parseFloat(lengthMm) : undefined,
        headType: headType ? headType.trim() : undefined,
        threadPitch: threadPitch !== undefined ? (threadPitch ? threadPitch.trim() : null) : undefined,
        material: material ? material.trim() : undefined,
        finish: finish ? finish.trim() : undefined,
        notes: notes !== undefined ? (notes ? notes.trim() : null) : undefined,
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
      entity: 'BOLT_SPEC',
      entityId: spec.id,
      detail: `Mengubah spesifikasi baut: ${spec.code}`,
    });

    res.json(spec);
  } catch (error) {
    console.error('Error updating bolt spec:', error);
    res.status(500).json({ error: 'Gagal memperbarui spesifikasi baut.' });
  }
});

const ITEM_INCLUDE = {
  images: { orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }] },
  _count: { select: { requirements: true, packageItems: true } },
};
const sameName = (name) => ({ name: { equals: name, mode: 'insensitive' }, isArchived: false });

// Validates { itemType, name, diameterMm, lengthMm, headType } of Tambah/Ubah Barang.
// Every item is named like the shop catalog; bolts may carry Ø × length (needed to fit them on a motor position).
function readItemBody(body) {
  const itemType = String(body.itemType || '').toUpperCase();
  if (!TYPE_LABELS[itemType]) return { error: 'Jenis barang tidak dikenal.' };
  const name = String(body.name || '').replace(/\s+/g, ' ').trim();
  if (!name) return { error: 'Nama barang wajib diisi.' };
  const sized = itemType === 'BAUT' || itemType === 'MUR' || itemType === 'RING';
  const diameterMm = sized && body.diameterMm !== '' && body.diameterMm != null ? Number(body.diameterMm) : 0;
  const lengthMm = itemType === 'BAUT' && body.lengthMm !== '' && body.lengthMm != null ? Number(body.lengthMm) : 0;
  if (!Number.isFinite(diameterMm) || diameterMm < 0 || diameterMm > 30) return { error: 'Diameter harus antara 1 dan 30 mm.' };
  if (!Number.isFinite(lengthMm) || lengthMm < 0 || lengthMm > 300) return { error: 'Panjang harus antara 1 dan 300 mm.' };
  if (lengthMm > 0 && !(diameterMm > 0)) return { error: 'Isi diameter baut bila panjangnya diisi.' };
  const headType = String(body.headType || '').trim() || (itemType === 'BAUT' ? 'Baut' : TYPE_LABELS[itemType]);
  return { data: { itemType, name, diameterMm, lengthMm, headType } };
}

// POST /api/bolt-specs/items — Tambah Barang. The name is checked against Master Barang first (409 + the existing item).
router.post('/items', requireAuth, requirePermission('BOLTS_MANAGE'), async (req, res) => {
  try {
    const { data, error } = readItemBody(req.body);
    if (error) return res.status(400).json({ error });

    const existing = await prisma.boltSpec.findFirst({ where: sameName(data.name), select: { id: true, code: true, name: true } });
    if (existing) {
      return res.status(409).json({ error: `${existing.name} sudah ada di Master Barang.`, existingId: existing.id, code: existing.code });
    }

    // new items continue the catalog numbering (HX-417, ...)
    const last = await prisma.boltSpec.aggregate({ _max: { catalogNo: true } });
    const catalogNo = (last._max.catalogNo || 0) + 1;
    const code = `HX-${String(catalogNo).padStart(3, '0')}`;
    const notes = req.body.notes ? String(req.body.notes).trim() : null;
    const spec = await prisma.boltSpec.create({ data: { ...data, code, catalogNo, notes, material: '', finish: '' } });
    const { url, caption } = catalogImage({ ...data, code });
    await prisma.boltImage.create({ data: { boltSpecId: spec.id, url, caption, isPrimary: true } });
    const created = await prisma.boltSpec.findUnique({ where: { id: spec.id }, include: ITEM_INCLUDE });

    await logAudit({ userId: req.user.id, action: 'CREATE', entity: 'BOLT_SPEC', entityId: spec.id, detail: `Menambah barang ${spec.name} (${spec.code}) ke Master Barang` });
    res.status(201).json(created);
  } catch (error) {
    console.error('Error adding Master Barang item:', error);
    res.status(500).json({ error: 'Gagal menambah barang.' });
  }
});

// PATCH /api/bolt-specs/:id — Ubah Barang: { itemType, name, diameterMm, lengthMm, headType }.
// A generated picture (size drawing or product illustration) is redrawn; product photos are left alone.
router.patch('/:id', requireAuth, requirePermission('BOLTS_MANAGE'), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const spec = await prisma.boltSpec.findUnique({ where: { id }, include: { images: true } });
    if (!spec || spec.isArchived) return res.status(404).json({ error: 'Barang tidak ditemukan.' });

    const { data, error } = readItemBody({ itemType: spec.itemType, headType: spec.headType, ...req.body });
    if (error) return res.status(400).json({ error });
    const clash = await prisma.boltSpec.findFirst({ where: { ...sameName(data.name), id: { not: id } }, select: { id: true, name: true } });
    if (clash) return res.status(409).json({ error: `${clash.name} sudah ada di Master Barang.`, existingId: clash.id });

    const isGenerated = (url) => url.startsWith(ILLUSTRATION_PREFIX) || (url.startsWith(CATALOG_PREFIX) && url.endsWith('.svg'));
    const generated = spec.images.find((img) => isGenerated(img.url));
    const updated = await prisma.$transaction(async (tx) => {
      await tx.boltSpec.update({ where: { id }, data });
      if (generated) {
        const { url, caption } = catalogImage({ ...data, code: spec.code });
        await tx.boltImage.update({ where: { id: generated.id }, data: { url, caption } });
      }
      return tx.boltSpec.findUnique({ where: { id }, include: ITEM_INCLUDE });
    });

    // drop an old product illustration unless something else still points at it (size drawings are shared)
    const oldUrl = generated?.url;
    if (oldUrl && oldUrl.startsWith(CATALOG_PREFIX) && !updated.images.some((img) => img.url === oldUrl)
      && (await prisma.boltImage.count({ where: { url: oldUrl } })) === 0) {
      const oldFile = uploadPath(oldUrl);
      if (fs.existsSync(oldFile)) fs.unlinkSync(oldFile);
    }

    await logAudit({
      userId: req.user.id,
      action: 'UPDATE',
      entity: 'BOLT_SPEC',
      entityId: id,
      detail: spec.name === data.name ? `Mengubah barang ${data.name}` : `Mengubah barang ${spec.name || spec.code} menjadi ${data.name}`,
    });
    res.json(updated);
  } catch (error) {
    console.error('Error updating Master Barang item:', error);
    res.status(500).json({ error: 'Gagal mengubah barang.' });
  }
});

// POST /api/bolt-specs/:id/images (Admin only)
// Supports multi-file upload via multipart/form-data or JSON with { url, caption, isPrimary }
router.post('/:id/images', requireAuth, requirePermission('BOLTS_MANAGE'), (req, res, next) => {
  upload.array('images', 10)(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Gagal mengunggah foto.' });
    }
    next();
  });
}, async (req, res) => {
  try {
    const boltSpecId = parseInt(req.params.id, 10);
    const spec = await prisma.boltSpec.findUnique({
      where: { id: boltSpecId },
      include: { images: true },
    });

    if (!spec) {
      return res.status(404).json({ error: 'Spesifikasi baut tidak ditemukan.' });
    }

    const createdImages = [];
    const hasExistingImages = spec.images.length > 0;

    // 1. If files were uploaded via multipart/form-data
    if (req.files && req.files.length > 0) {
      const caption = req.body.caption || null;
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        const url = `/uploads/bolts/${file.filename}`;
        const isPrimary = !hasExistingImages && i === 0;

        const img = await prisma.boltImage.create({
          data: {
            boltSpecId,
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
        await prisma.boltImage.updateMany({
          where: { boltSpecId },
          data: { isPrimary: false },
        });
      }

      const img = await prisma.boltImage.create({
        data: {
          boltSpecId,
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
      entity: 'BOLT_SPEC',
      entityId: boltSpecId,
      detail: `Menambahkan ${createdImages.length} foto untuk baut ${spec.code}`,
    });

    const allImages = await prisma.boltImage.findMany({
      where: { boltSpecId },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
    });

    res.status(201).json(allImages);
  } catch (error) {
    console.error('Error adding bolt images:', error);
    res.status(500).json({ error: 'Gagal menambahkan foto baut.' });
  }
});

// DELETE /api/bolt-specs/:id/images/:imageId (Admin only)
router.delete('/:id/images/:imageId', requireAuth, requirePermission('BOLTS_MANAGE'), async (req, res) => {
  try {
    const boltSpecId = parseInt(req.params.id, 10);
    const imageId = parseInt(req.params.imageId, 10);

    const image = await prisma.boltImage.findFirst({
      where: { id: imageId, boltSpecId },
    });

    if (!image) {
      return res.status(404).json({ error: 'Foto baut tidak ditemukan.' });
    }

    await prisma.boltImage.delete({ where: { id: imageId } });

    // If local file in uploads, unlink it
    if (image.url.startsWith('/uploads/')) {
      const localFilePath = uploadPath(image.url);
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
      const remaining = await prisma.boltImage.findFirst({
        where: { boltSpecId },
        orderBy: { createdAt: 'desc' },
      });
      if (remaining) {
        await prisma.boltImage.update({
          where: { id: remaining.id },
          data: { isPrimary: true },
        });
      }
    }

    await logAudit({
      userId: req.user.id,
      action: 'DELETE',
      entity: 'BOLT_SPEC',
      entityId: boltSpecId,
      detail: `Menghapus foto #${imageId} dari baut ID ${boltSpecId}`,
    });

    const allImages = await prisma.boltImage.findMany({
      where: { boltSpecId },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
    });

    res.json(allImages);
  } catch (error) {
    console.error('Error deleting bolt image:', error);
    res.status(500).json({ error: 'Gagal menghapus foto baut.' });
  }
});

// PATCH /api/bolt-specs/:id/images/:imageId/primary (Admin only)
router.patch('/:id/images/:imageId/primary', requireAuth, requirePermission('BOLTS_MANAGE'), async (req, res) => {
  try {
    const boltSpecId = parseInt(req.params.id, 10);
    const imageId = parseInt(req.params.imageId, 10);

    await prisma.$transaction([
      prisma.boltImage.updateMany({
        where: { boltSpecId },
        data: { isPrimary: false },
      }),
      prisma.boltImage.update({
        where: { id: imageId },
        data: { isPrimary: true },
      }),
    ]);

    const allImages = await prisma.boltImage.findMany({
      where: { boltSpecId },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
    });

    res.json(allImages);
  } catch (error) {
    console.error('Error setting primary image:', error);
    res.status(500).json({ error: 'Gagal mengatur foto utama.' });
  }
});

module.exports = router;
