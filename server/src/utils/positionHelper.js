/**
 * Resolves a BoltPosition for a specific motorcycle.
 *
 * Positions are owned by a motorcycle (motorcycleTypeId). A NULL owner means
 * a shared library / legacy global position. When a custom name is typed, the
 * position is created for that motorcycle only, so dropdowns never fill up
 * with labels from other bikes.
 */
async function resolveOrCreatePosition(db, {
  boltPositionId,
  customAreaName,
  customAreaCategory,
  motorcycleTypeId,
} = {}) {
  const motorId = motorcycleTypeId !== undefined && motorcycleTypeId !== null && motorcycleTypeId !== ''
    ? parseInt(motorcycleTypeId, 10)
    : null;

  if (motorId !== null && !Number.isInteger(motorId)) {
    const err = new Error('ID tipe motor tidak valid.');
    err.status = 400;
    throw err;
  }

  if (boltPositionId !== undefined && boltPositionId !== null && boltPositionId !== '' && boltPositionId !== '__custom__') {
    const posId = parseInt(boltPositionId, 10);
    if (!Number.isInteger(posId)) {
      const err = new Error('ID posisi baut tidak valid.');
      err.status = 400;
      throw err;
    }
    const existing = await db.boltPosition.findUnique({ where: { id: posId } });
    if (!existing) {
      const err = new Error('Area / posisi baut yang dipilih tidak ditemukan.');
      err.status = 400;
      throw err;
    }
    if (motorId !== null && existing.motorcycleTypeId !== null && existing.motorcycleTypeId !== motorId) {
      const err = new Error('Area / posisi baut itu milik motor lain. Ketik nama area baru untuk motor ini.');
      err.status = 400;
      throw err;
    }
    return existing;
  }

  const trimmedName = customAreaName ? String(customAreaName).trim() : '';
  if (!trimmedName) {
    const err = new Error('Ketik nama area / posisi baut untuk motor ini.');
    err.status = 400;
    throw err;
  }

  // Look only inside this motorcycle's own positions (or the shared library
  // when no motorcycle is given). Never reuse another bike's label.
  const byName = await db.boltPosition.findFirst({
    where: {
      name: { equals: trimmedName, mode: 'insensitive' },
      motorcycleTypeId: motorId,
    },
  });
  if (byName) return byName;

  const category = customAreaCategory && String(customAreaCategory).trim()
    ? String(customAreaCategory).trim()
    : 'Area Kustom';

  return db.boltPosition.create({
    data: {
      name: trimmedName,
      category,
      sortOrder: 50,
      motorcycleTypeId: motorId,
    },
  });
}

module.exports = { resolveOrCreatePosition };
