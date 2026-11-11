/**
 * Shared helpers to resolve bolt details & checklist status for 2D/3D annotations
 * and lay out non-overlapping auto-callout mini-cards around visible points.
 */

export function resolveBoltForAnnotation(annotation, bolts = [], positionBreakdown = []) {
  if (!annotation) return null;

  const posId = annotation.boltPositionId;
  const posName = (annotation.boltPosition?.name || '').toLowerCase();

  const matchingRows = (positionBreakdown || []).filter((row) => {
    if (posId && row.positionId === posId) return true;
    return posName && (row.positionName || '').toLowerCase() === posName;
  });

  if (matchingRows.length > 0) {
    const sorted = [...matchingRows].sort((a, b) => (b.quantity || 0) - (a.quantity || 0));
    const primaryRow = sorted[0];
    const specId = primaryRow.boltSpec?.id;
    const consolidated = (bolts || []).find((b) => b.boltSpecId === specId);
    const totalPosQty = sorted.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);
    const distinctSpecs = new Set(sorted.map((r) => r.boltSpec?.id).filter(Boolean));

    const bolt = consolidated
      ? {
          ...consolidated,
          totalQuantity: totalPosQty,
        }
      : primaryRow.boltSpec
        ? {
            ...primaryRow.boltSpec,
            boltSpecId: primaryRow.boltSpec.id,
            totalQuantity: totalPosQty,
            positionsSummary: primaryRow.positionName,
          }
        : null;

    if (bolt) {
      return {
        bolt,
        specIds: Array.from(distinctSpecs),
        quantity: totalPosQty,
        extraSpecsCount: Math.max(0, distinctSpecs.size - 1),
        positionName: annotation.label || annotation.boltPosition?.name || primaryRow.positionName || 'Titik Pasang',
      };
    }
  }

  const matchingBolts = (bolts || []).filter(
    (b) => Array.isArray(b.positionIds) && posId && b.positionIds.includes(posId)
  );
  const matchBolt = matchingBolts[0] || (bolts || []).find(
    (b) => posName && (b.positionsSummary || '').toLowerCase().includes(posName)
  );

  if (!matchBolt) return null;

  const specIds = matchingBolts.length > 0
    ? matchingBolts.map((b) => b.boltSpecId).filter(Boolean)
    : [matchBolt.boltSpecId].filter(Boolean);

  return {
    bolt: matchBolt,
    specIds,
    quantity: matchBolt.totalQuantity ?? matchBolt.quantity ?? 0,
    extraSpecsCount: Math.max(0, specIds.length - 1),
    positionName: annotation.label || annotation.boltPosition?.name || 'Titik Pasang',
  };
}

/**
 * Resolves live checklist completion status ('done' | 'partial' | 'pending' | null)
 * for a given annotation based on PickSession items.
 */
export function resolveChecklistStatus(annotation, sessionItems = null, bolts = [], positionBreakdown = []) {
  if (!Array.isArray(sessionItems) || sessionItems.length === 0 || !annotation) {
    return { status: null, matchingItems: [], checkedCount: 0, totalCount: 0 };
  }

  const resolved = resolveBoltForAnnotation(annotation, bolts, positionBreakdown);
  let matchingItems = [];

  if (resolved?.specIds?.length > 0) {
    const specSet = new Set(resolved.specIds);
    matchingItems = sessionItems.filter((it) => specSet.has(it.boltSpecId));
  }

  if (matchingItems.length === 0) {
    const posName = (annotation.boltPosition?.name || '').toLowerCase();
    if (posName) {
      matchingItems = sessionItems.filter((it) =>
        (it.positionSummary || '').toLowerCase().includes(posName)
      );
    }
  }

  if (matchingItems.length === 0) {
    return { status: null, matchingItems: [], checkedCount: 0, totalCount: 0 };
  }

  const checkedCount = matchingItems.filter((it) => it.checked).length;
  const totalCount = matchingItems.length;
  const status = checkedCount === totalCount
    ? 'done'
    : checkedCount > 0
      ? 'partial'
      : 'pending';

  return { status, matchingItems, checkedCount, totalCount };
}

function solveVerticalColumn(items, cardH, gap, minY, maxY) {
  if (!items.length) return [];
  const available = Math.max(cardH, maxY - minY);
  const maxFit = Math.max(1, Math.floor((available + gap) / (cardH + gap)));

  let chosen = [...items].sort((a, b) => a.screenY - b.screenY);
  if (chosen.length > maxFit) {
    const picked = [];
    for (let i = 0; i < maxFit; i++) {
      const idx = Math.min(chosen.length - 1, Math.round((i * (chosen.length - 1)) / Math.max(1, maxFit - 1)));
      if (!picked.includes(chosen[idx])) picked.push(chosen[idx]);
    }
    chosen = picked;
  }

  const placed = chosen.map((item) => {
    const ideal = item.screenY - cardH / 2;
    return {
      ...item,
      y: Math.max(minY, Math.min(maxY - cardH, ideal)),
    };
  });

  for (let i = 1; i < placed.length; i++) {
    const minTop = placed[i - 1].y + cardH + gap;
    if (placed[i].y < minTop) {
      placed[i].y = minTop;
    }
  }

  const lastIdx = placed.length - 1;
  if (placed[lastIdx].y + cardH > maxY) {
    placed[lastIdx].y = Math.max(minY, maxY - cardH);
    for (let i = lastIdx - 1; i >= 0; i--) {
      const maxTop = placed[i + 1].y - cardH - gap;
      if (placed[i].y > maxTop) {
        placed[i].y = Math.max(minY, maxTop);
      }
    }
  }

  return placed;
}

/**
 * Computes non-overlapping left/right perimeter callout slots + SVG leader line coordinates.
 */
export function layoutVisibleCallouts(visibleEntries, stageW, stageH) {
  if (!visibleEntries?.length || !stageW || !stageH) return [];

  const isCompact = stageW < 500;
  const isWide = stageW >= 900;
  const cardW = isCompact ? 92 : isWide ? 132 : 112;
  const cardH = isCompact ? 80 : isWide ? 114 : 100;
  const padX = isCompact ? 8 : isWide ? 18 : 12;
  const gap = isCompact ? 6 : 8;

  const midX = stageW * 0.5;
  const leftItems = [];
  const rightItems = [];

  for (const entry of visibleEntries) {
    if (!entry.resolved?.bolt) continue;
    if (entry.screenX < midX) leftItems.push(entry);
    else rightItems.push(entry);
  }

  const leftMinY = 12;
  const leftMaxY = Math.max(leftMinY + cardH, stageH - 12);
  const rightMinY = 62; // keep clear of top-right Reset & Fullscreen buttons
  const rightMaxY = Math.max(rightMinY + cardH, stageH - 12);

  const placedLeft = solveVerticalColumn(leftItems, cardH, gap, leftMinY, leftMaxY).map((item) => ({
    ...item,
    side: 'left',
    cardX: padX,
    cardY: item.y,
    cardW,
    cardH,
    lineX1: item.screenX,
    lineY1: item.screenY,
    lineX2: padX + cardW,
    lineY2: item.y + cardH / 2,
  }));

  const rightX = Math.max(padX, stageW - cardW - padX);
  const placedRight = solveVerticalColumn(rightItems, cardH, gap, rightMinY, rightMaxY).map((item) => ({
    ...item,
    side: 'right',
    cardX: rightX,
    cardY: item.y,
    cardW,
    cardH,
    lineX1: item.screenX,
    lineY1: item.screenY,
    lineX2: rightX,
    lineY2: item.y + cardH / 2,
  }));

  return [...placedLeft, ...placedRight];
}
