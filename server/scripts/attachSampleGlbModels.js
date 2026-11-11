#!/usr/bin/env node
/**
 * Attaches generated offline .glb 3D models & starter 3D annotations
 * to matching motorcycles (idempotent; does not delete user-created models unless overwrite=true).
 */

const path = require('path');
const prisma = require('../src/db');
const { generateAllModels } = require('./generateMotorcycleGlb');

async function attachSampleGlbModels(db = prisma, { overwrite = false } = {}) {
  const modelsDir = path.join(__dirname, '../uploads/models');
  const manifest = generateAllModels(modelsDir);

  const allPositions = await db.boltPosition.findMany();
  const posByName = new Map(allPositions.map((p) => [p.name, p]));

  let attachedModels = 0;
  let attachedAnnotations = 0;

  for (const entry of manifest) {
    const motor = await db.motorcycleType.findFirst({
      where: {
        displayName: { contains: entry.displayNameMatch, mode: 'insensitive' },
      },
      include: {
        requirements: { select: { boltPositionId: true } },
        models: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    if (!motor) continue;

    let modelRecord = motor.models[0] || null;
    if (modelRecord && overwrite) {
      await db.positionAnnotation.deleteMany({ where: { modelId: modelRecord.id } });
      await db.motorcycleModel.deleteMany({ where: { motorcycleTypeId: motor.id } });
      modelRecord = null;
    }

    if (!modelRecord) {
      modelRecord = await db.motorcycleModel.create({
        data: {
          motorcycleTypeId: motor.id,
          modelUrl: entry.modelUrl,
          scale: 1,
          rotationY: 0,
        },
      });
      attachedModels++;
    }

    const existingAnnos = await db.positionAnnotation.count({
      where: { motorcycleTypeId: motor.id, modelId: modelRecord.id },
    });

    if (existingAnnos === 0) {
      const motorPositionIds = new Set(motor.requirements.map((r) => r.boltPositionId));
      for (const anchor of entry.anchors) {
        const pos = posByName.get(anchor.positionName);
        if (!pos) continue;
        // Only attach starter pins for bolt positions actually used on this motorcycle
        if (motorPositionIds.size > 0 && !motorPositionIds.has(pos.id)) continue;

        await db.positionAnnotation.create({
          data: {
            boltPositionId: pos.id,
            motorcycleTypeId: motor.id,
            modelId: modelRecord.id,
            x: anchor.x,
            y: anchor.y,
            z: anchor.z,
            normalX: anchor.normalX,
            normalY: anchor.normalY,
            normalZ: anchor.normalZ,
            label: anchor.label,
          },
        });
        attachedAnnotations++;
      }
    }
  }

  return { attachedModels, attachedAnnotations };
}

if (require.main === module) {
  attachSampleGlbModels(prisma)
    .then((res) => {
      console.log(`✅ Attached ${res.attachedModels} .glb models and ${res.attachedAnnotations} starter 3D annotations.`);
    })
    .catch((err) => {
      console.error('❌ Failed to attach sample .glb models:', err);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

module.exports = { attachSampleGlbModels };
