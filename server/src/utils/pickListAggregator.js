const prisma = require('../db');

/**
 * Generates consolidated bolt totals, position breakdown, and completeness summary
 * for a given motorcycle (and optional package).
 */
async function buildPickListData({ motorcycleTypeId, packageId, allowInactive = false }) {
  const mId = parseInt(motorcycleTypeId, 10);
  const motorcycle = await prisma.motorcycleType.findUnique({
    where: { id: mId },
    include: {
      images: {
        orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
      },
    },
  });

  if (!motorcycle || (!allowInactive && !motorcycle.isActive)) {
    const err = new Error('Tipe motor tidak ditemukan atau dinonaktifkan.');
    err.status = 404;
    throw err;
  }

  let selectedPackage = null;
  let isPackageMode = false;

  if (packageId) {
    const pId = parseInt(packageId, 10);
    selectedPackage = await prisma.package.findUnique({
      where: { id: pId },
      include: {
        items: {
          include: {
            boltSpec: {
              include: {
                images: {
                  orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
                },
              },
            },
            sourceRequirement: {
              include: {
                boltPosition: true,
              },
            },
          },
        },
      },
    });

    if (!selectedPackage || selectedPackage.motorcycleTypeId !== mId) {
      const err = new Error('Paket yang dipilih tidak sesuai dengan tipe motor ini.');
      err.status = 400;
      throw err;
    }

    isPackageMode = true;
  }

  const requirements = await prisma.motorBoltRequirement.findMany({
    where: { motorcycleTypeId: mId },
    include: {
      boltPosition: true,
      boltSpec: {
        include: {
          images: {
            orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
          },
        },
      },
    },
    orderBy: [
      { boltPosition: { sortOrder: 'asc' } },
      { sortOrder: 'asc' },
    ],
  });

  const consolidatedMap = new Map();
  const positionBreakdown = [];

  if (isPackageMode && selectedPackage) {
    for (const item of selectedPackage.items) {
      const specId = item.boltSpecId;
      const current = consolidatedMap.get(specId) || {
        boltSpec: item.boltSpec,
        quantity: 0,
        notes: [],
        positionIds: new Set(),
      };
      current.quantity += item.quantity;
      if (item.emblemNote) {
        current.notes.push(item.emblemNote);
      }
      const linkedPosId = item.sourceRequirement?.boltPositionId;
      if (linkedPosId) {
        current.positionIds.add(linkedPosId);
      }
      consolidatedMap.set(specId, current);

      positionBreakdown.push({
        positionId: linkedPosId || null,
        positionName: item.emblemNote || item.sourceRequirement?.boltPosition?.name || 'Paket Komponen',
        category: selectedPackage.packageType,
        side: item.sourceRequirement?.side || 'NONE',
        boltSpec: item.boltSpec,
        quantity: item.quantity,
        isOptional: false,
      });
    }
  } else {
    for (const reqRow of requirements) {
      const specId = reqRow.boltSpecId;
      const current = consolidatedMap.get(specId) || {
        boltSpec: reqRow.boltSpec,
        quantity: 0,
        positions: [],
        positionIds: new Set(),
      };
      current.quantity += reqRow.quantity;
      current.positions.push(
        `${reqRow.boltPosition.name} (${reqRow.quantity}${reqRow.side !== 'NONE' ? ` ${reqRow.side}` : ''})`
      );
      current.positionIds.add(reqRow.boltPosition.id);
      consolidatedMap.set(specId, current);

      positionBreakdown.push({
        positionId: reqRow.boltPosition.id,
        positionName: reqRow.boltPosition.name,
        category: reqRow.boltPosition.category,
        side: reqRow.side,
        boltSpec: reqRow.boltSpec,
        quantity: reqRow.quantity,
        isOptional: reqRow.isOptional,
      });
    }
  }

  const consolidatedTotals = Array.from(consolidatedMap.values()).map((entry) => ({
    boltSpecId: entry.boltSpec.id,
    code: entry.boltSpec.code,
    diameterMm: entry.boltSpec.diameterMm,
    lengthMm: entry.boltSpec.lengthMm,
    headType: entry.boltSpec.headType,
    material: entry.boltSpec.material,
    finish: entry.boltSpec.finish,
    totalQuantity: entry.quantity,
    positionsSummary: entry.positions
      ? entry.positions.join(', ')
      : entry.notes
      ? entry.notes.join(', ')
      : '',
    positionIds: Array.from(entry.positionIds),
    images: entry.boltSpec.images || [],
    boltSpec: entry.boltSpec,
  }));

  consolidatedTotals.sort((a, b) => {
    if (a.diameterMm !== b.diameterMm) return Number(a.diameterMm) - Number(b.diameterMm);
    if (a.lengthMm !== b.lengthMm) return Number(a.lengthMm) - Number(b.lengthMm);
    return a.code.localeCompare(b.code);
  });

  const totalQuantity = consolidatedTotals.reduce((sum, item) => sum + item.totalQuantity, 0);
  const distinctBoltSpecsCount = consolidatedTotals.length;

  const warnings = [];
  if (requirements.length === 0 && !isPackageMode) {
    warnings.push('Data spesifikasi baut untuk tipe motor ini belum diisi (masih kosong).');
  } else if (requirements.length < 5 && !isPackageMode) {
    warnings.push('Data spesifikasi baut untuk motor ini belum lengkap (baru terdata sebagian).');
  }

  return {
    motorcycle: {
      id: motorcycle.id,
      displayName: motorcycle.displayName,
      brand: motorcycle.brand,
      model: motorcycle.model,
      variant: motorcycle.variant,
      yearStart: motorcycle.yearStart,
      yearEnd: motorcycle.yearEnd,
      isActive: motorcycle.isActive,
      images: motorcycle.images || [],
    },
    package: selectedPackage
      ? {
          id: selectedPackage.id,
          name: selectedPackage.name,
          packageType: selectedPackage.packageType,
        }
      : null,
    summary: {
      totalQuantity,
      distinctBoltSpecsCount,
      hasWarnings: warnings.length > 0,
      warnings,
    },
    consolidatedTotals,
    positionBreakdown,
    requirements,
  };
}

module.exports = { buildPickListData };
