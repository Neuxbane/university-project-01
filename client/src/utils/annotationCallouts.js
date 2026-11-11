/**
 * Shared helpers to resolve bolt details & checklist status for 2D/3D annotations
 * and dynamically lay out auto-callout mini-cards hugging visible points / model silhouette.
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
 * Resolves the Area / Close-Up Part card payload for whole-bike 3D/2D markers.
 * Prioritizes the real close-up photo of that area so the motor overview stays minimal
 * (clicking the area opens FocusedPartOverlay showing the bolt-level details).
 */
export function resolvePartCalloutForAnnotation(
  annotation,
  closeUpPhotos = [],
  motorcycle = null,
  bolts = [],
  positionBreakdown = []
) {
  const boltResolved = resolveBoltForAnnotation(annotation, bolts, positionBreakdown);
  if (!boltResolved) return null;

  const posId = annotation.boltPositionId;
  const closeup = (closeUpPhotos || []).find((c) => c.boltPositionId === posId) || null;
  const partImageUrl = closeup?.imageUrl
    || annotation.boltPosition?.photoUrl
    || boltResolved.bolt?.images?.[0]?.url
    || motorcycle?.images?.[0]?.url
    || null;

  return {
    ...boltResolved,
    hasCloseup: Boolean(closeup),
    partImageUrl,
    pinsCount: closeup?.pins?.length || 0,
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

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function pushBoxOutsideObstacle(box, obs, gap) {
  const ox1 = obs.minX - gap;
  const oy1 = obs.minY - gap;
  const ox2 = obs.maxX + gap;
  const oy2 = obs.maxY + gap;

  const bx2 = box.x + box.w;
  const by2 = box.y + box.h;

  if (bx2 <= ox1 || box.x >= ox2 || by2 <= oy1 || box.y >= oy2) {
    return;
  }

  const pushLeft = bx2 - ox1;
  const pushRight = ox2 - box.x;
  const pushUp = by2 - oy1;
  const pushDown = oy2 - box.y;
  const minPush = Math.min(pushLeft, pushRight, pushUp, pushDown);

  if (minPush === pushLeft) box.x -= pushLeft;
  else if (minPush === pushRight) box.x += pushRight;
  else if (minPush === pushUp) box.y -= pushUp;
  else box.y += pushDown;
}

/**
 * Dynamically positions callout cards in a natural halo around the motorcycle / visible points
 * rather than pinning them far away to the extreme corners/edges.
 *
 * @param {Array} visibleEntries - [{ annotation, index, screenX, screenY, resolved }]
 * @param {number} stageW
 * @param {number} stageH
 * @param {Object|null} modelScreenBounds - optional { minX, maxX, minY, maxY } of 3D bike on screen
 */
export function layoutVisibleCallouts(visibleEntries, stageW, stageH, modelScreenBounds = null) {
  if (!visibleEntries?.length || !stageW || !stageH) return [];

  const valid = visibleEntries.filter((entry) => Boolean(entry.resolved?.bolt));
  if (!valid.length) return [];

  const isCompact = stageW < 500;
  const isWide = stageW >= 900;
  const cardW = isCompact ? 90 : isWide ? 124 : 108;
  const cardH = isCompact ? 78 : isWide ? 108 : 96;
  const pad = isCompact ? 8 : 14;
  const gap = isCompact ? 6 : 10;

  // Derive bike bounds from projected 3D box (clamped sensibly) or fallback around points
  let bikeBounds;
  if (modelScreenBounds && Number.isFinite(modelScreenBounds.minX)) {
    bikeBounds = {
      minX: clamp(modelScreenBounds.minX, pad, stageW - pad),
      maxX: clamp(modelScreenBounds.maxX, pad, stageW - pad),
      minY: clamp(modelScreenBounds.minY, pad, stageH - pad),
      maxY: clamp(modelScreenBounds.maxY, pad, stageH - pad),
    };
  } else {
    const xs = valid.map((e) => e.screenX);
    const ys = valid.map((e) => e.screenY);
    const pMinX = Math.min(...xs);
    const pMaxX = Math.max(...xs);
    const pMinY = Math.min(...ys);
    const pMaxY = Math.max(...ys);
    bikeBounds = {
      minX: clamp(pMinX - stageW * 0.06, pad, stageW * 0.45),
      maxX: clamp(pMaxX + stageW * 0.06, stageW * 0.55, stageW - pad),
      minY: clamp(pMinY - stageH * 0.06, pad, stageH * 0.45),
      maxY: clamp(pMaxY + stageH * 0.06, stageH * 0.55, stageH - pad),
    };
  }

  const cx = (bikeBounds.minX + bikeBounds.maxX) / 2;
  const cy = (bikeBounds.minY + bikeBounds.maxY) / 2;
  const haloGap = clamp(Math.round(Math.min(stageW, stageH) * 0.065), 18, 46);

  // If stage is compact or bike fills most of width, limit simultaneous callouts to avoid crowding
  const maxTotal = isCompact ? 4 : isWide ? 8 : 6;
  const chosen = valid.length > maxTotal
    ? [...valid]
        .sort((a, b) => Math.hypot(b.screenX - cx, b.screenY - cy) - Math.hypot(a.screenX - cx, a.screenY - cy))
        .slice(0, maxTotal)
    : valid;

  // Top-right Reset / Fullscreen buttons safe keep-out zone
  const topRightControlObs = {
    minX: Math.max(0, stageW - 156),
    minY: 0,
    maxX: stageW,
    maxY: 62,
  };

  // Bike keep-out center (expanded slightly less when zoomed very far in so cards still fit)
  const bikeW = bikeBounds.maxX - bikeBounds.minX;
  const bikeH = bikeBounds.maxY - bikeBounds.minY;
  const canKeepOutsideBike = bikeW < stageW - cardW * 1.4 && bikeH < stageH - cardH * 1.2;

  // Compute radial anchor around bike bounds for each point
  const boxes = chosen.map((entry, idx) => {
    let dx = entry.screenX - cx;
    let dy = entry.screenY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist < 12) {
      dx = idx % 2 === 0 ? -1 : 1;
      dy = idx % 3 === 0 ? -0.5 : 0.4;
    } else {
      dx /= dist;
      dy /= dist;
    }

    // Ideal center pushed radially outside the bike bounds or nearby point
    const halfBikeX = bikeW * 0.5 + haloGap + cardW * 0.5;
    const halfBikeY = bikeH * 0.5 + haloGap + cardH * 0.5;

    // Intersect ray from (cx, cy) along (dx, dy) with padded bike hull
    const tx = Math.abs(dx) > 0.05 ? halfBikeX / Math.abs(dx) : Infinity;
    const ty = Math.abs(dy) > 0.05 ? halfBikeY / Math.abs(dy) : Infinity;
    const rayLen = Math.min(tx, ty);

    // Blend ray hull point with point's actual axis so lines remain short and direct
    const radialCx = cx + dx * rayLen;
    const radialCy = cy + dy * rayLen;

    const targetCx = canKeepOutsideBike
      ? radialCx * 0.65 + (entry.screenX + dx * (haloGap + cardW * 0.55)) * 0.35
      : entry.screenX + dx * (haloGap + cardW * 0.5);
    const targetCy = canKeepOutsideBike
      ? radialCy * 0.5 + (entry.screenY + dy * (haloGap + cardH * 0.45)) * 0.5
      : entry.screenY + dy * (haloGap + cardH * 0.45);

    return {
      entry,
      x: clamp(targetCx - cardW / 2, pad, stageW - cardW - pad),
      y: clamp(targetCy - cardH / 2, pad, stageH - cardH - pad),
      w: cardW,
      h: cardH,
    };
  });

  // Iterative collision resolution: card-vs-card, top-right controls, and inner bike keep-out
  for (let iter = 0; iter < 8; iter++) {
    // 1. Keep clear of top-right controls
    for (const b of boxes) {
      pushBoxOutsideObstacle(b, topRightControlObs, 6);
    }

    // 2. Card-vs-card overlap repulsion
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i];
        const b = boxes[j];
        const overlapX = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) + gap;
        const overlapY = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) + gap;
        if (overlapX > 0 && overlapY > 0) {
          if (overlapY <= overlapX) {
            const sign = (a.y + a.h / 2) <= (b.y + b.h / 2) ? -1 : 1;
            const shift = overlapY / 2;
            a.y += sign * shift;
            b.y -= sign * shift;
          } else {
            const sign = (a.x + a.w / 2) <= (b.x + b.w / 2) ? -1 : 1;
            const shift = overlapX / 2;
            a.x += sign * shift;
            b.x -= sign * shift;
          }
        }
      }
    }

    // 3. Push softly outside central bike silhouette if stage has plenty of room
    if (canKeepOutsideBike) {
      for (const b of boxes) {
        pushBoxOutsideObstacle(b, bikeBounds, Math.max(10, haloGap * 0.4));
      }
    }

    // 4. Clamp inside viewport bounds
    for (const b of boxes) {
      b.x = clamp(b.x, pad, stageW - b.w - pad);
      b.y = clamp(b.y, pad, stageH - b.h - pad);
    }
  }

  // Final overlap-free pass strictly inside stage bounds so adjacent points never stack
  for (let pass = 0; pass < 6; pass++) {
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i];
        const b = boxes[j];
        const overlapX = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) + gap;
        const overlapY = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) + gap;
        if (overlapX > 0 && overlapY > 0) {
          if (overlapY <= overlapX) {
            const topBox = (a.y + a.h / 2) <= (b.y + b.h / 2) ? a : b;
            const botBox = topBox === a ? b : a;
            topBox.y = clamp(topBox.y - overlapY * 0.5, pad, stageH - topBox.h - pad);
            botBox.y = clamp(topBox.y + topBox.h + gap, pad, stageH - botBox.h - pad);
            if (botBox.y - topBox.y < topBox.h + gap) {
              topBox.y = clamp(botBox.y - topBox.h - gap, pad, stageH - topBox.h - pad);
            }
          } else {
            const leftBox = (a.x + a.w / 2) <= (b.x + b.w / 2) ? a : b;
            const rightBox = leftBox === a ? b : a;
            leftBox.x = clamp(leftBox.x - overlapX * 0.5, pad, stageW - leftBox.w - pad);
            rightBox.x = clamp(leftBox.x + leftBox.w + gap, pad, stageW - rightBox.w - pad);
            if (rightBox.x - leftBox.x < leftBox.w + gap) {
              leftBox.x = clamp(rightBox.x - leftBox.w - gap, pad, stageW - leftBox.w - pad);
            }
          }
        }
      }
    }
  }

  return boxes.map((b) => {
    const px = b.entry.screenX;
    const py = b.entry.screenY;
    const cardX = Math.round(b.x);
    const cardY = Math.round(b.y);
    // Attach leader line to closest point on card perimeter
    const lineX2 = clamp(px, cardX, cardX + b.w);
    const lineY2 = clamp(py, cardY, cardY + b.h);

    return {
      ...b.entry,
      cardX,
      cardY,
      cardW: b.w,
      cardH: b.h,
      lineX1: px,
      lineY1: py,
      lineX2,
      lineY2,
    };
  });
}
