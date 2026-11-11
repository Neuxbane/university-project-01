const express = require('express');
const prisma = require('../db');
const { requireAuth } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');
const { buildPickListData } = require('../utils/pickListAggregator');

const router = express.Router();

// POST /api/pick-lists/generate
router.post('/generate', requireAuth, async (req, res) => {
  try {
    const { motorcycleTypeId, packageId } = req.body;
    if (!motorcycleTypeId) {
      return res.status(400).json({ error: 'ID tipe motor wajib dipilih.' });
    }

    const data = await buildPickListData({ motorcycleTypeId, packageId });
    res.json({
      motorcycle: data.motorcycle,
      package: data.package,
      summary: data.summary,
      consolidatedTotals: data.consolidatedTotals,
      positionBreakdown: data.positionBreakdown,
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('Error generating pick list:', error);
    res.status(500).json({ error: 'Gagal membuat daftar ambil baut otomatis.' });
  }
});

// POST /api/pick-lists/sessions
router.post('/sessions', requireAuth, async (req, res) => {
  try {
    const { motorcycleTypeId, packageId, notes, items } = req.body;
    if (!motorcycleTypeId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Data motor dan item pick session wajib diisi.' });
    }

    const session = await prisma.pickSession.create({
      data: {
        motorcycleTypeId: parseInt(motorcycleTypeId, 10),
        packageId: packageId ? parseInt(packageId, 10) : null,
        createdBy: req.user.id,
        status: 'IN_PROGRESS',
        notes: notes ? notes.trim() : null,
        items: {
          create: items.map((item) => ({
            boltSpecId: parseInt(item.boltSpecId, 10),
            quantity: parseInt(item.quantity, 10),
            positionSummary: item.positionsSummary || item.positionSummary || '',
            checked: Boolean(item.checked),
          })),
        },
      },
      include: {
        motorcycleType: true,
        package: true,
        creator: {
          select: { id: true, username: true, name: true },
        },
        items: {
          include: { boltSpec: true },
        },
      },
    });

    await logAudit({
      userId: req.user.id,
      action: 'PICK_LIST',
      entity: 'PICK_SESSION',
      entityId: session.id,
      detail: `Membuat sesi pengambilan baut untuk: ${session.motorcycleType.displayName}`,
    });

    res.status(201).json(session);
  } catch (error) {
    console.error('Error creating pick session:', error);
    res.status(500).json({ error: 'Gagal menyimpan sesi pick-list.' });
  }
});

// GET /api/pick-lists/sessions
router.get('/sessions', requireAuth, async (req, res) => {
  try {
    const { status, limit = 20 } = req.query;
    const where = {};
    if (status) where.status = status;

    const sessions = await prisma.pickSession.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit, 10),
      include: {
        motorcycleType: true,
        package: true,
        creator: {
          select: { id: true, username: true, name: true },
        },
        _count: {
          select: { items: true },
        },
        items: {
          select: { id: true, checked: true },
        },
      },
    });

    const mapped = sessions.map((s) => {
      const totalItems = s.items.length;
      const checkedItems = s.items.filter((i) => i.checked).length;
      return {
        ...s,
        totalItems,
        checkedItems,
        progressPercent: totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0,
      };
    });

    res.json(mapped);
  } catch (error) {
    console.error('Error fetching pick sessions:', error);
    res.status(500).json({ error: 'Gagal mengambil riwayat sesi pick-list.' });
  }
});

// GET /api/pick-lists/sessions/:id
router.get('/sessions/:id', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const session = await prisma.pickSession.findUnique({
      where: { id },
      include: {
        motorcycleType: {
          include: {
            images: {
              orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
            },
          },
        },
        package: true,
        creator: {
          select: { id: true, username: true, name: true },
        },
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
          orderBy: { id: 'asc' },
        },
      },
    });

    if (!session) {
      return res.status(404).json({ error: 'Sesi pick-list tidak ditemukan.' });
    }

    const totalItems = session.items.length;
    const checkedItems = session.items.filter((i) => i.checked).length;

    res.json({
      ...session,
      totalItems,
      checkedItems,
      progressPercent: totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0,
    });
  } catch (error) {
    console.error('Error fetching session detail:', error);
    res.status(500).json({ error: 'Gagal mengambil detail sesi pick-list.' });
  }
});

// PATCH /api/pick-lists/sessions/:id/items/:itemId
router.patch('/sessions/:id/items/:itemId', requireAuth, async (req, res) => {
  try {
    const sessionId = parseInt(req.params.id, 10);
    const itemId = parseInt(req.params.itemId, 10);
    const { checked } = req.body;

    const updatedItem = await prisma.pickSessionItem.update({
      where: { id: itemId },
      data: { checked: Boolean(checked) },
    });

    // Check if all items in session are checked
    const allItems = await prisma.pickSessionItem.findMany({
      where: { pickSessionId: sessionId },
    });

    const isAllChecked = allItems.every((item) => item.checked);
    const newStatus = isAllChecked ? 'COMPLETED' : 'IN_PROGRESS';

    await prisma.pickSession.update({
      where: { id: sessionId },
      data: { status: newStatus },
    });

    res.json({ updatedItem, sessionStatus: newStatus, isAllChecked });
  } catch (error) {
    console.error('Error updating session item:', error);
    res.status(500).json({ error: 'Gagal memperbarui status checklist item.' });
  }
});

module.exports = router;

