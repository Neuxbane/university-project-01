/**
 * Resolves an existing BoltPosition by ID or creates a custom-labeled BoltPosition
 * on demand so admins are never locked to a hardcoded list of motorcycle areas.
 */
async function resolveOrCreatePosition(db, { boltPositionId, customAreaName, customAreaCategory }) {
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
    return existing;
  }

  const trimmedName = customAreaName ? String(customAreaName).trim() : '';
  if (!trimmedName) {
    const err = new Error('Pilih area yang ada atau ketik nama label area baru.');
    err.status = 400;
    throw err;
  }

  const byName = await db.boltPosition.findFirst({
    where: { name: { equals: trimmedName, mode: 'insensitive' } },
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
    },
  });
}

module.exports = { resolveOrCreatePosition };
