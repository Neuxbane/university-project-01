const express = require('express');
const prisma = require('../db');
const { requireAuth, requirePermission } = require('../middleware/auth');
const { CLAIM_INCLUDE } = require('../utils/bundleClaims');

const router = express.Router();

// GET /api/bundle-claims — every buyer claim (Riwayat), open ones first
router.get('/', requireAuth, requirePermission('MENU_RIWAYAT'), async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 200);
    const claims = await prisma.bundleClaim.findMany({
      include: { ...CLAIM_INCLUDE, package: { select: { id: true, name: true, packageType: true, price: true } } },
      orderBy: [{ completedAt: { sort: 'desc', nulls: 'first' } }, { createdAt: 'desc' }],
      take: limit,
    });
    res.json(claims);
  } catch (error) {
    console.error('Error fetching bundle claims:', error);
    res.status(500).json({ error: 'Gagal memuat riwayat klaim.' });
  }
});

// GET /api/bundle-claims/:id
router.get('/:id', requireAuth, requirePermission('MENU_RIWAYAT'), async (req, res) => {
  try {
    const claim = await prisma.bundleClaim.findUnique({
      where: { id: parseInt(req.params.id, 10) },
      include: { ...CLAIM_INCLUDE, package: { select: { id: true, name: true, packageType: true, price: true, motorcycleType: { select: { displayName: true } } } } },
    });
    if (!claim) return res.status(404).json({ error: 'Klaim tidak ditemukan.' });
    res.json(claim);
  } catch (error) {
    console.error('Error fetching bundle claim:', error);
    res.status(500).json({ error: 'Gagal memuat klaim.' });
  }
});

// PATCH /api/bundle-claims/:id — { buyerName }
router.patch('/:id', requireAuth, requirePermission('SESSION_CHECKLIST'), async (req, res) => {
  try {
    const buyerName = req.body.buyerName ? String(req.body.buyerName).trim() : '';
    const claim = await prisma.bundleClaim.update({
      where: { id: parseInt(req.params.id, 10) },
      data: { buyerName: buyerName || null },
      include: CLAIM_INCLUDE,
    });
    res.json(claim);
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Klaim tidak ditemukan.' });
    console.error('Error updating bundle claim:', error);
    res.status(500).json({ error: 'Gagal menyimpan nama pembeli.' });
  }
});

// PATCH /api/bundle-claims/:id/items/:itemId — { claimed }; partial claims stay open in Riwayat
router.patch('/:id/items/:itemId', requireAuth, requirePermission('SESSION_CHECKLIST'), async (req, res) => {
  try {
    const claimId = parseInt(req.params.id, 10);
    const itemId = parseInt(req.params.itemId, 10);
    const item = await prisma.bundleClaimItem.findFirst({ where: { id: itemId, claimId } });
    if (!item) return res.status(404).json({ error: 'Barang klaim tidak ditemukan.' });

    const claimed = Boolean(req.body.claimed);
    await prisma.bundleClaimItem.update({ where: { id: itemId }, data: { claimed, claimedAt: claimed ? new Date() : null } });
    const remaining = await prisma.bundleClaimItem.count({ where: { claimId, claimed: false } });
    const claim = await prisma.bundleClaim.update({
      where: { id: claimId },
      data: { completedAt: remaining === 0 ? new Date() : null },
      include: CLAIM_INCLUDE,
    });
    res.json(claim);
  } catch (error) {
    console.error('Error updating bundle claim item:', error);
    res.status(500).json({ error: 'Gagal menyimpan status klaim.' });
  }
});

module.exports = router;
