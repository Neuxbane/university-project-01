const express = require('express');
const prisma = require('../db');
const { requireAuth, requirePermission } = require('../middleware/auth');

const router = express.Router();

// GET /api/audit-logs
router.get('/', requireAuth, requirePermission('AUDIT_LOG_VIEW'), async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const logs = await prisma.auditLog.findMany({
      orderBy: { timestamp: 'desc' },
      take: parseInt(limit, 10),
      include: {
        user: {
          select: { id: true, username: true, name: true, role: true },
        },
      },
    });

    res.json(logs);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Gagal mengambil riwayat audit.' });
  }
});

module.exports = router;

