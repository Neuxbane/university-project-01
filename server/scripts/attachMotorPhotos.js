#!/usr/bin/env node
/**
 * Main photo per motorcycle for the Paket Full Bike cards: real photos listed in
 * prisma/data/motor-photos.json (files in uploads/motorcycles, credit in the caption).
 * A motorcycle that already has the photo is left alone, so a main photo the admin picked later stays.
 * The old drawn side views (uploads/motorcycles/*.svg) are removed from the gallery.
 */
const prisma = require('../src/db');

const OLD_DRAWINGS = ['/uploads/motorcycles/yamaha-nmax-155.svg', '/uploads/motorcycles/honda-vario-160.svg', '/uploads/motorcycles/yamaha-aerox-155.svg'];

async function attachMotorPhotos(db = prisma) {
  const { photos } = require('../prisma/data/motor-photos.json');
  const removed = await db.motorcycleImage.deleteMany({ where: { url: { in: OLD_DRAWINGS } } });
  let attached = 0;
  for (const photo of photos) {
    const motor = await db.motorcycleType.findFirst({ where: { displayName: photo.displayName }, select: { id: true } });
    if (!motor) continue;
    if (await db.motorcycleImage.findFirst({ where: { motorcycleTypeId: motor.id, url: photo.url } })) continue;
    await db.motorcycleImage.updateMany({ where: { motorcycleTypeId: motor.id }, data: { isPrimary: false } });
    await db.motorcycleImage.create({ data: { motorcycleTypeId: motor.id, url: photo.url, caption: photo.caption, isPrimary: true } });
    attached += 1;
  }
  return { attached, removedDrawings: removed.count };
}

if (require.main === module) {
  attachMotorPhotos()
    .then((res) => console.log(`✅ ${res.attached} foto motor dipasang, ${res.removedDrawings} gambar lama dilepas.`))
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}

module.exports = { attachMotorPhotos };
