#!/usr/bin/env node
/**
 * Optional standalone DEMO script to populate starter 3D annotations for sample models.
 * Requires the explicit `--with-demo-annotations` CLI flag; never run automatically
 * during default `prisma:seed`.
 */

const fs = require('fs');
const path = require('path');
const prisma = require('../src/db');
const { MODEL_SPECS } = require('./generateMotorcycleGlb');

function resolvePoint(template, spec) {
  const fx = (spec.wheelbase || 1.32) / 2;
  const rx = -fx;
  const ft = spec.frontTireR || 0.255;
  const rt = spec.rearTireR || 0.255;

  let x = template.x ?? 0;
  if (template.xMode === 'fx') x = Number((fx + (template.xOff || 0)).toFixed(4));
  else if (template.xMode === 'rx') x = Number((rx + (template.xOff || 0)).toFixed(4));

  let y = template.y ?? 0;
  if (template.yMode === 'ft') y = Number((ft + (template.yOff || 0)).toFixed(4));
  else if (template.yMode === 'rt') y = Number((rt + (template.yOff || 0)).toFixed(4));
  else if (template.yMode === 'visor') y = spec.tallVisor ? 0.98 : 0.91;

  return {
    x,
    y,
    z: template.z ?? 0,
    normalX: template.nx ?? 0,
    normalY: template.ny ?? 0,
    normalZ: template.nz ?? 1,
    label: template.label,
    area: template.area,
    requiresRearDisc: Boolean(template.requiresRearDisc),
  };
}

async function seedDemoAnnotations(db = prisma, { overwrite = false } = {}) {
  const raw = fs.readFileSync(path.join(__dirname, '../prisma/demoAnnotations.json'), 'utf8');
  const templates = JSON.parse(raw);

  const allPositions = await db.boltPosition.findMany();
  const posByName = new Map(allPositions.map((p) => [p.name.toLowerCase(), p]));

  let createdCount = 0;

  for (const spec of MODEL_SPECS) {
    const motor = await db.motorcycleType.findFirst({
      where: { displayName: { contains: spec.displayNameMatch, mode: 'insensitive' } },
      include: {
        requirements: { select: { boltPositionId: true } },
        models: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    if (!motor || !motor.models[0]) continue;

    const modelRecord = motor.models[0];
    if (overwrite) {
      await db.positionAnnotation.deleteMany({
        where: { motorcycleTypeId: motor.id, modelId: modelRecord.id },
      });
    }

    const existingCount = await db.positionAnnotation.count({
      where: { motorcycleTypeId: motor.id, modelId: modelRecord.id },
    });
    if (existingCount > 0) continue;

    const motorPosIds = new Set(motor.requirements.map((r) => r.boltPositionId));
    for (const tpl of templates) {
      const pt = resolvePoint(tpl, spec);
      if (pt.requiresRearDisc && spec.rearDisc === false) continue;

      const pos = posByName.get(pt.area.toLowerCase());
      if (!pos) continue;
      if (motorPosIds.size > 0 && !motorPosIds.has(pos.id)) continue;

      await db.positionAnnotation.create({
        data: {
          boltPositionId: pos.id,
          motorcycleTypeId: motor.id,
          modelId: modelRecord.id,
          x: pt.x,
          y: pt.y,
          z: pt.z,
          normalX: pt.normalX,
          normalY: pt.normalY,
          normalZ: pt.normalZ,
          label: pt.label,
        },
      });
      createdCount++;
    }
  }

  return { createdCount };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  if (!args.includes('--with-demo-annotations')) {
    console.log('Skipped: pass `--with-demo-annotations` to seed demo 3D annotations.');
    process.exit(0);
  }
  const overwrite = args.includes('--overwrite');
  seedDemoAnnotations(prisma, { overwrite })
    .then((res) => {
      console.log(`✅ [DEMO] Seeded ${res.createdCount} demo 3D annotations.`);
    })
    .catch((err) => {
      console.error('❌ Failed to seed demo 3D annotations:', err);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

module.exports = { seedDemoAnnotations };
