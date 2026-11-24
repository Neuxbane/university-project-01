/**
 * Bagian markers on the 3D model: one marker per category of bolt positions (Lampu & Meter, Body, Rem, ...)
 * instead of one per position (owner's request, 24 Nov 2026). Tapping one lists the bolts of every position
 * in that category. Points come from the generated model (scripts/generateMotorcycleGlb.js anchors).
 */
const PART_CATEGORIES = ['Lampu & Meter', 'Steering/Stang', 'Body', 'Cover Mesin & CVT', 'Rem', 'Rangka', 'Knalpot', 'Jok/Bracket'];

/**
 * Creates the missing bagian markers of one motorcycle model for the categories that have bolt rows.
 * Markers the admin already placed or moved stay as they are. Returns the number created.
 */
async function createPartMarkers(db, motorcycleTypeId, modelId, anchors) {
  const rows = await db.motorBoltRequirement.findMany({
    where: { motorcycleTypeId },
    select: { boltPosition: { select: { category: true } } },
  });
  const used = new Set(rows.map((r) => r.boltPosition.category));
  const existing = new Set((await db.positionAnnotation.findMany({
    where: { motorcycleTypeId, modelId, category: { not: null } },
    select: { category: true },
  })).map((a) => a.category));

  let created = 0;
  for (const category of PART_CATEGORIES) {
    const a = anchors?.[category];
    if (!a || !used.has(category) || existing.has(category)) continue;
    await db.positionAnnotation.create({
      data: { motorcycleTypeId, modelId, category, x: a.x, y: a.y, z: a.z, normalX: a.nx, normalY: a.ny, normalZ: a.nz },
    });
    created += 1;
  }
  return created;
}

module.exports = { PART_CATEGORIES, createPartMarkers };
