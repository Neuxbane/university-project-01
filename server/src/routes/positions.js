const express = require('express');
const prisma = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

const router = express.Router();

// GET /api/positions
router.get('/', requireAuth, async (req, res) => {
  try {
    const positions = await prisma.boltPosition.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        _count: {
          select: { requirements: true, annotations: true, closeUpPhotos: true },
        },
      },
    });
    res.json(positions);
  } catch (error) {
    console.error('Error fetching positions:', error);
    res.status(500).json({ error: 'Gagal mengambil data posisi baut.' });
  }
});

// POST /api/positions (Admin only)
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, category, sortOrder, notes } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'Nama area / posisi baut wajib diisi.' });
    }

    const position = await prisma.boltPosition.create({
      data: {
        name: String(name).trim(),
        category: category && String(category).trim() ? String(category).trim() : 'Area Kustom',
        sortOrder: sortOrder ? parseInt(sortOrder, 10) : 0,
        notes: notes ? String(notes).trim() : null,
      },
    });

    await logAudit({
      userId: req.user.id,
      action: 'CREATE',
      entity: 'POSITION',
      entityId: position.id,
      detail: `Menambahkan posisi baut: ${position.name} (${position.category})`,
    });

    res.status(201).json(position);
  } catch (error) {
    console.error('Error creating position:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Nama posisi baut sudah terdaftar.' });
    }
    res.status(500).json({ error: 'Gagal menambahkan posisi baut.' });
  }
});

// PUT /api/positions/:id (Admin only)
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { name, category, sortOrder, notes } = req.body;

    const position = await prisma.boltPosition.update({
      where: { id },
      data: {
        name: name.trim(),
        category: category.trim(),
        sortOrder: sortOrder ? parseInt(sortOrder, 10) : 0,
        notes: notes ? notes.trim() : null,
      },
    });

    await logAudit({
      userId: req.user.id,
      action: 'UPDATE',
      entity: 'POSITION',
      entityId: position.id,
      detail: `Mengubah posisi baut: ${position.name}`,
    });

    res.json(position);
  } catch (error) {
    console.error('Error updating position:', error);
    res.status(500).json({ error: 'Gagal memperbarui posisi baut.' });
  }
});

// DELETE /api/positions/:id (Admin only)
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await prisma.boltPosition.findUnique({
      where: { id },
      include: {
        _count: {
          select: { requirements: true, annotations: true, closeUpPhotos: true },
        },
      },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Area / posisi baut tidak ditemukan.' });
    }
    const usedCount = (existing._count.requirements || 0)
      + (existing._count.annotations || 0)
      + (existing._count.closeUpPhotos || 0);
    if (usedCount > 0) {
      return res.status(400).json({
        error: `Area "${existing.name}" masih dipakai pada ${usedCount} data motor/peta/close-up.`,
      });
    }

    await prisma.boltPosition.delete({ where: { id } });

    await logAudit({
      userId: req.user.id,
      action: 'DELETE',
      entity: 'POSITION',
      entityId: id,
      detail: `Menghapus area posisi baut: ${existing.name}`,
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting position:', error);
    res.status(500).json({ error: 'Gagal menghapus area posisi baut.' });
  }
});

module.exports = router;

