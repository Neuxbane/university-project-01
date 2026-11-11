#!/usr/bin/env node
/**
 * Attaches generated offline .glb 3D models to matching motorcycles
 * (geometry only — zero pre-seeded 3D annotations; admin marks 3D points via editor).
 */

const path = require('path');
const prisma = require('../src/db');
const { generateAllModels } = require('./generateMotorcycleGlb');

async function attachSampleGlbModels(db = prisma, { overwrite = false } = {}) {
  const modelsDir = path.join(__dirname, '../uploads/models');
  const manifest = generateAllModels(modelsDir);

  let attachedModels = 0;

  for (const entry of manifest) {
    const motor = await db.motorcycleType.findFirst({
      where: {
        displayName: { contains: entry.displayNameMatch, mode: 'insensitive' },
      },
      include: {
        models: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    if (!motor) continue;

    let modelRecord = motor.models[0] || null;
    if (modelRecord && overwrite) {
      await db.positionAnnotation.deleteMany({ where: { motorcycleTypeId: motor.id } });
      await db.motorcycleModel.deleteMany({ where: { motorcycleTypeId: motor.id } });
      modelRecord = null;
    }

    if (!modelRecord) {
      await db.motorcycleModel.create({
        data: {
          motorcycleTypeId: motor.id,
          modelUrl: entry.modelUrl,
          scale: 1,
          rotationY: 0,
        },
      });
      attachedModels++;
    }
  }

  return { attachedModels };
}

if (require.main === module) {
  attachSampleGlbModels(prisma)
    .then((res) => {
      console.log(`✅ Attached ${res.attachedModels} .glb models (0 pre-seeded annotations).`);
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
