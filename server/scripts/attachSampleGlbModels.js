#!/usr/bin/env node
/**
 * Attaches a generated offline .glb 3D model to every motorcycle listed in generateMotorcycleGlb.js
 * (shape by motorcycle type) and places the bagian markers (one per category of bolt positions)
 * on it. Models, markers and annotations the admin already has are kept.
 */

const path = require('path');
const prisma = require('../src/db');
const { generateAllModels } = require('./generateMotorcycleGlb');
const { createPartMarkers } = require('../src/utils/partMarkers');

async function attachSampleGlbModels(db = prisma, { overwrite = false } = {}) {
  const modelsDir = path.join(__dirname, '../uploads/models');
  const manifest = generateAllModels(modelsDir);

  let attachedModels = 0;
  let partMarkers = 0;

  for (const entry of manifest) {
    const motor = await db.motorcycleType.findFirst({
      where: { displayName: entry.displayName },
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
    // marker points fit the generated model only, not a model the admin uploaded
    if (modelRecord.modelUrl === entry.modelUrl) {
      partMarkers += await createPartMarkers(db, motor.id, modelRecord.id, entry.anchors);
    }
  }

  return { attachedModels, partMarkers };
}

if (require.main === module) {
  attachSampleGlbModels(prisma)
    .then((res) => {
      console.log(`✅ Attached ${res.attachedModels} .glb models and ${res.partMarkers} bagian markers.`);
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
