const express = require('express');
const multer = require('multer');
const { Readable } = require('stream');
const csvParser = require('csv-parser');
const prisma = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');
const { resolveOrCreatePosition } = require('../utils/positionHelper');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// POST /api/import/requirements
router.post('/requirements', requireAuth, requireAdmin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'File CSV wajib diunggah.' });
    }

    const rows = [];
    const stream = Readable.from(req.file.buffer.toString('utf-8'));

    await new Promise((resolve, reject) => {
      stream
        .pipe(csvParser())
        .on('data', (data) => rows.push(data))
        .on('end', resolve)
        .on('error', reject);
    });

    if (rows.length === 0) {
      return res.status(400).json({ error: 'File CSV kosong atau tidak memiliki baris data.' });
    }

    // Preload reference data for validation
    const motorcycles = await prisma.motorcycleType.findMany();
    const positions = await prisma.boltPosition.findMany();
    const specs = await prisma.boltSpec.findMany();

    const motorMap = new Map();
    for (const m of motorcycles) {
      const key = `${m.brand.toLowerCase()}|${m.model.toLowerCase()}|${m.variant.toLowerCase()}|${m.yearStart}`;
      motorMap.set(key, m);
    }

    const specMap = new Map();
    for (const s of specs) {
      specMap.set(s.code.toLowerCase(), s);
    }

    const errors = [];
    const validRows = [];

    rows.forEach((row, index) => {
      const lineNum = index + 2; // +1 for 0-index, +1 for header
      const brand = (row.brand || '').trim();
      const model = (row.model || '').trim();
      const variant = (row.variant || '').trim();
      const yearStart = parseInt((row.year_start || row.yearStart || '').trim(), 10);
      const positionName = (row.position || row.position_name || '').trim();
      const boltCode = (row.bolt_code || row.boltCode || '').trim();
      const quantity = parseInt((row.quantity || '').trim(), 10);
      const side = ((row.side || 'NONE').trim()).toUpperCase();
      const isOptional = String(row.is_optional || '').toLowerCase() === 'true' || String(row.is_optional || '') === '1';
      const notes = (row.notes || '').trim();

      if (!brand || !model || !variant || isNaN(yearStart)) {
        errors.push({ row: lineNum, message: 'Data motor (brand, model, variant, year_start) tidak lengkap.' });
        return;
      }

      const motorKey = `${brand.toLowerCase()}|${model.toLowerCase()}|${variant.toLowerCase()}|${yearStart}`;
      const motor = motorMap.get(motorKey);
      if (!motor) {
        errors.push({ row: lineNum, message: `Motor '${brand} ${model} ${variant} (${yearStart})' tidak ditemukan dalam master data.` });
        return;
      }

      const spec = specMap.get(boltCode.toLowerCase());
      if (!spec) {
        errors.push({ row: lineNum, message: `Kode spesifikasi baut '${boltCode}' tidak ditemukan dalam master spesifikasi.` });
        return;
      }

      if (isNaN(quantity) || quantity <= 0) {
        errors.push({ row: lineNum, message: `Jumlah baut (${quantity}) harus angka lebih besar dari 0.` });
        return;
      }

      validRows.push({
        motorcycleTypeId: motor.id,
        positionName,
        boltSpecId: spec.id,
        quantity,
        side,
        isOptional,
        notes: notes || null,
      });
    });

    if (errors.length > 0) {
      return res.status(422).json({
        error: 'Validasi gagal. Terdapat data tidak valid pada file CSV.',
        errorCount: errors.length,
        errors,
      });
    }

    // Execute within transaction
    let importedCount = 0;
    await prisma.$transaction(async (tx) => {
      for (const item of validRows) {
        const position = await resolveOrCreatePosition(tx, {
          customAreaName: item.positionName,
          motorcycleTypeId: item.motorcycleTypeId,
        });
        await tx.motorBoltRequirement.upsert({
          where: {
            motorcycleTypeId_boltPositionId_boltSpecId_side: {
              motorcycleTypeId: item.motorcycleTypeId,
              boltPositionId: position.id,
              boltSpecId: item.boltSpecId,
              side: item.side,
            },
          },
          update: {
            quantity: item.quantity,
            isOptional: item.isOptional,
            notes: item.notes,
          },
          create: {
            motorcycleTypeId: item.motorcycleTypeId,
            boltPositionId: position.id,
            boltSpecId: item.boltSpecId,
            quantity: item.quantity,
            side: item.side,
            isOptional: item.isOptional,
            notes: item.notes,
          },
        });
        importedCount++;
      }
    });

    await logAudit({
      userId: req.user.id,
      action: 'IMPORT',
      entity: 'REQUIREMENT',
      detail: `Import CSV berhasil: ${importedCount} baris kebutuhan baut diproses.`,
    });

    res.json({
      message: `Berhasil mengimpor ${importedCount} data kebutuhan baut ke dalam sistem.`,
      importedCount,
    });
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ error: 'Terjadi kegagalan saat proses impor CSV.' });
  }
});

// GET /api/admin/backup
router.get('/backup', requireAuth, requireAdmin, async (req, res) => {
  try {
    const backupData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      exportedBy: req.user.username,
      motorcycles: await prisma.motorcycleType.findMany(),
      positions: await prisma.boltPosition.findMany(),
      boltSpecs: await prisma.boltSpec.findMany(),
      requirements: await prisma.motorBoltRequirement.findMany(),
      packages: await prisma.package.findMany({ include: { items: true } }),
      sessions: await prisma.pickSession.findMany({ include: { items: true } }),
    };

    await logAudit({
      userId: req.user.id,
      action: 'BACKUP',
      entity: 'SYSTEM',
      detail: 'Mengekspor cadangan basis data lengkap (backup snapshot).',
    });

    res.setHeader('Content-Disposition', `attachment; filename="hextitanium_backup_${Date.now()}.json"`);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(backupData, null, 2));
  } catch (error) {
    console.error('Backup error:', error);
    res.status(500).json({ error: 'Gagal membuat cadangan database.' });
  }
});

// POST /api/admin/restore
router.post('/restore', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { backupData, confirmation } = req.body;
    if (confirmation !== 'RESTORE_HEXTITANIUM') {
      return res.status(400).json({ error: 'Konfirmasi pemulihan tidak valid. Harap ketik RESTORE_HEXTITANIUM.' });
    }

    if (!backupData || !backupData.motorcycles || !backupData.positions || !backupData.boltSpecs) {
      return res.status(400).json({ error: 'Format berkas cadangan (backup) tidak valid.' });
    }

    // Execute atomic restore
    await prisma.$transaction(async (tx) => {
      // 1. Upsert positions
      for (const pos of backupData.positions) {
        await tx.boltPosition.upsert({
          where: { id: pos.id },
          update: {
            name: pos.name,
            category: pos.category,
            sortOrder: pos.sortOrder,
            notes: pos.notes,
            motorcycleTypeId: pos.motorcycleTypeId ?? null,
          },
          create: {
            id: pos.id,
            name: pos.name,
            category: pos.category,
            sortOrder: pos.sortOrder,
            notes: pos.notes,
            motorcycleTypeId: pos.motorcycleTypeId ?? null,
          },
        });
      }

      // 2. Upsert boltSpecs
      for (const s of backupData.boltSpecs) {
        await tx.boltSpec.upsert({
          where: { id: s.id },
          update: {
            code: s.code,
            diameterMm: s.diameterMm,
            lengthMm: s.lengthMm,
            headType: s.headType,
            threadPitch: s.threadPitch,
            material: s.material,
            finish: s.finish,
            notes: s.notes,
          },
          create: {
            id: s.id,
            code: s.code,
            diameterMm: s.diameterMm,
            lengthMm: s.lengthMm,
            headType: s.headType,
            threadPitch: s.threadPitch,
            material: s.material,
            finish: s.finish,
            notes: s.notes,
          },
        });
      }

      // 3. Upsert motorcycles
      for (const m of backupData.motorcycles) {
        await tx.motorcycleType.upsert({
          where: { id: m.id },
          update: {
            brand: m.brand,
            model: m.model,
            variant: m.variant,
            yearStart: m.yearStart,
            yearEnd: m.yearEnd,
            displayName: m.displayName,
            notes: m.notes,
            isActive: m.isActive,
          },
          create: {
            id: m.id,
            brand: m.brand,
            model: m.model,
            variant: m.variant,
            yearStart: m.yearStart,
            yearEnd: m.yearEnd,
            displayName: m.displayName,
            notes: m.notes,
            isActive: m.isActive,
          },
        });
      }

      // 4. Upsert requirements
      if (backupData.requirements) {
        for (const reqRow of backupData.requirements) {
          await tx.motorBoltRequirement.upsert({
            where: { id: reqRow.id },
            update: {
              motorcycleTypeId: reqRow.motorcycleTypeId,
              boltPositionId: reqRow.boltPositionId,
              boltSpecId: reqRow.boltSpecId,
              quantity: reqRow.quantity,
              side: reqRow.side,
              isOptional: reqRow.isOptional,
              sortOrder: reqRow.sortOrder,
              notes: reqRow.notes,
            },
            create: {
              id: reqRow.id,
              motorcycleTypeId: reqRow.motorcycleTypeId,
              boltPositionId: reqRow.boltPositionId,
              boltSpecId: reqRow.boltSpecId,
              quantity: reqRow.quantity,
              side: reqRow.side,
              isOptional: reqRow.isOptional,
              sortOrder: reqRow.sortOrder,
              notes: reqRow.notes,
            },
          });
        }
      }
    });

    await logAudit({
      userId: req.user.id,
      action: 'RESTORE',
      entity: 'SYSTEM',
      detail: 'Berhasil memulihkan basis data dari berkas cadangan.',
    });

    res.json({ message: 'Basis data berhasil dipulihkan dengan sukses.' });
  } catch (error) {
    console.error('Restore error:', error);
    res.status(500).json({ error: 'Gagal melakukan pemulihan basis data.' });
  }
});

module.exports = router;

