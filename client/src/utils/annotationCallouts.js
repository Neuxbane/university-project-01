/**
 * Shared helpers to resolve bolt details for 2D/3D annotations and lay out
 * non-overlapping auto-callout mini-cards around visible motorcycle points.
 */

export function resolveBoltForAnnotation(annotation, bolts = [], positionBreakdown = []) {
  if (!annotation) return null;

  const posId = annotation.boltPositionId;
  const posName = (annotation.boltPosition?.name || '').toLowerCase();

  // Prefer position-specific breakdown rows so quantity reflects this exact location
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
        quantity: totalPosQty,
        extraSpecsCount: Math.max(0, distinctSpecs.size - 1),
        positionName: annotation.label || annotation.boltPosition?.name || primaryRow.positionName || 'Titik Pasang',
      };
    }
  }

  // Fallback to consolidated bolts matched by positionIds or position name
  const matchBolt = (bolts || []).find(
    (b) => Array.isArray(b.positionIds) && posId && b.positionIds.includes(posId)
  ) || (bolts || []).find(
    (b) => posName && (b.positionsSummary || '').toLowerCase().includes(posName)
  );

  if (!matchBolt) return null;

  return {
    bolt: matchBolt,
    quantity: matchBolt.totalQuantity ?? matchBolt.quantity ?? 0,
    extraSpecsCount: 0,
    positionName: annotation.label || annotation.boltPosition?.name || 'Titik Pasang',
  };
}

function solveVerticalColumn(items, cardH, gap, minY, maxY) {
  if (!items.length) return [];
  const available = Math.max(cardH, maxY - minY);
  const maxFit = Math.max(1, Math.floor((available + gap) / (cardH + gap)));

  // If more points than fit cleanly vertically on this side, pick evenly spaced points by Y
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

  // Forward pass: push overlapping cards down
  for (let i = 1; i < placed.length; i++) {
    const minTop = placed[i - 1].y + cardH + gap;
    if (placed[i].y < minTop) {
      placed[i].y = minTop;
    }
  }

  // Backward pass: clamp bottom and push upward if needed
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
 * @param {Array} visibleEntries - [{ annotation, index, screenX, screenY, resolved }]
 * @param {number} stageW
 * @param {number} stageH
 */
export function layoutVisibleCallouts(visibleEntries, stageW, stageH) {
  if (!visibleEntries?.length || !stageW || !stageH) return [];

  const isCompact = stageW < 520;
  const cardW = isCompact ? 92 : 114;
  const cardH = isCompact ? 80 : 102;
  const padX = isCompact ? 8 : 12;
  const gap = isCompact ? 6 : 8;

  const midX = stageW * 0.5;
  const leftItems = [];
  const rightItems = [];

  for (const entry of visibleEntries) {
    if (!entry.resolved?.bolt) continue;
    if (entry.screenX < midX) leftItems.push(entry);
    else rightItems.push(entry);
  }

  const leftMinY = 10;
  const leftMaxY = Math.max(leftMinY + cardH, stageH - (stageW >= 640 ? 40 : 10));
  const rightMinY = 62; // keep clear of top-right Reset & Fullscreen buttons
  const rightMaxY = Math.max(rightMinY + cardH, stageH - 10);

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
