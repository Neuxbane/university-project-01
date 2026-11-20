const express = require('express');
const prisma = require('../db');
const { requireAuth, requirePermission } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

const router = express.Router();

const BASELINE_KEY = 'baselineMinutes';
const round1 = (n) => Math.round(n * 10) / 10;
const median = (values) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

const readBaseline = async () => {
  const row = await prisma.appSetting.findUnique({ where: { key: BASELINE_KEY } });
  const value = row ? Number(row.value) : NaN;
  return Number.isFinite(value) && value > 0 ? value : null;
};

// GET /api/service-time — bolt preparation time per completed checklist session (createdAt -> completedAt),
// compared with the manual baseline measured before the system (acceptance criterion: at least 50% faster)
router.get('/', requireAuth, requirePermission('REPORT_SERVICE_TIME'), async (req, res) => {
  try {
    const [sessions, baselineMinutes] = await Promise.all([
      prisma.pickSession.findMany({
        where: { status: 'COMPLETED', completedAt: { not: null } },
        include: {
          motorcycleType: { select: { id: true, displayName: true } },
          package: { select: { name: true } },
          creator: { select: { name: true, username: true } },
          items: { select: { quantity: true } },
        },
        orderBy: { completedAt: 'desc' },
      }),
      readBaseline(),
    ]);

    const rows = sessions.map((s) => ({
      id: s.id,
      motorcycle: s.motorcycleType,
      packageName: s.package?.name || null,
      staff: s.creator?.name || s.creator?.username || '–',
      startedAt: s.createdAt,
      completedAt: s.completedAt,
      minutes: round1((new Date(s.completedAt) - new Date(s.createdAt)) / 60000),
      items: s.items.length,
      pcs: s.items.reduce((sum, i) => sum + i.quantity, 0),
    }));

    const minutes = rows.map((r) => r.minutes);
    const average = minutes.length ? minutes.reduce((a, b) => a + b, 0) / minutes.length : null;

    const byMotor = new Map();
    for (const r of rows) {
      const entry = byMotor.get(r.motorcycle.id) || { id: r.motorcycle.id, label: r.motorcycle.displayName, minutes: [] };
      entry.minutes.push(r.minutes);
      byMotor.set(r.motorcycle.id, entry);
    }

    res.json({
      baselineMinutes,
      summary: {
        sessions: rows.length,
        averageMinutes: average === null ? null : round1(average),
        medianMinutes: minutes.length ? round1(median(minutes)) : null,
        fastestMinutes: minutes.length ? Math.min(...minutes) : null,
        // positive = faster than the manual baseline
        improvementPercent: baselineMinutes && average !== null ? Math.round(((baselineMinutes - average) / baselineMinutes) * 100) : null,
        targetPercent: 50,
      },
      byMotorcycle: [...byMotor.values()]
        .map((e) => ({ id: e.id, label: e.label, sessions: e.minutes.length, averageMinutes: round1(e.minutes.reduce((a, b) => a + b, 0) / e.minutes.length) }))
        .sort((a, b) => b.sessions - a.sessions),
      recent: rows.slice(0, 20),
    });
  } catch (error) {
    console.error('Error building service-time report:', error);
    res.status(500).json({ error: 'Gagal memuat laporan waktu layanan.' });
  }
});

// PUT /api/service-time/baseline — { minutes } average manual preparation time before the system
router.put('/baseline', requireAuth, requirePermission('REPORT_SERVICE_TIME'), async (req, res) => {
  try {
    const minutes = Number(req.body.minutes);
    if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 600) {
      return res.status(400).json({ error: 'Baseline harus berupa menit antara 1 dan 600.' });
    }
    await prisma.appSetting.upsert({
      where: { key: BASELINE_KEY },
      update: { value: String(minutes) },
      create: { key: BASELINE_KEY, value: String(minutes) },
    });
    await logAudit({ userId: req.user.id, action: 'UPDATE', entity: 'SETTING', entityId: null, detail: `Baseline waktu persiapan baut diatur ke ${minutes} menit` });
    res.json({ baselineMinutes: minutes });
  } catch (error) {
    console.error('Error saving baseline:', error);
    res.status(500).json({ error: 'Gagal menyimpan baseline.' });
  }
});

module.exports = router;
