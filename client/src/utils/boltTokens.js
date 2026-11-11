/**
 * Centralized visual tokens and Indonesian labels for workshop domain objects.
 * Colors are always paired with text labels (never color alone).
 */

export const SIDE_LABELS = {
  NONE: 'Netral',
  LEFT: 'Kiri',
  RIGHT: 'Kanan',
  FRONT: 'Depan',
  REAR: 'Belakang',
};

export const PACKAGE_TYPE_LABELS = {
  FULL_BIKE: 'Full Bike',
  ENGINE: 'Mesin',
  BRAKE: 'Pengereman',
  BODY: 'Bodi',
  CVT: 'CVT',
  CUSTOM: 'Kustom',
};

const PACKAGE_TYPE_META_MAP = {
  FULL_BIKE: {
    key: 'FULL_BIKE',
    label: 'Full Bike',
    band: 'bg-amber-500 dark:bg-amber-400',
    badge: 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30',
  },
  ENGINE: {
    key: 'ENGINE',
    label: 'Mesin',
    band: 'bg-sky-600 dark:bg-sky-400',
    badge: 'bg-sky-50 text-sky-800 border-sky-300 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/30',
  },
  BRAKE: {
    key: 'BRAKE',
    label: 'Pengereman',
    band: 'bg-rose-600 dark:bg-rose-500',
    badge: 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30',
  },
  BODY: {
    key: 'BODY',
    label: 'Bodi',
    band: 'bg-violet-600 dark:bg-violet-500',
    badge: 'bg-violet-50 text-violet-800 border-violet-300 dark:bg-violet-500/15 dark:text-violet-300 dark:border-violet-500/30',
  },
  CVT: {
    key: 'CVT',
    label: 'CVT',
    band: 'bg-emerald-600 dark:bg-emerald-500',
    badge: 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30',
  },
};

export function getPackageTypeMeta(type) {
  const raw = String(type || '').trim();
  if (!raw) {
    return {
      key: 'OTHER',
      label: 'Paket',
      band: 'bg-zinc-600 dark:bg-zinc-400',
      badge: 'bg-zinc-100 text-zinc-800 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700',
    };
  }
  const normalized = raw.toLowerCase().replace(/[\s_-]+/g, '');
  if (normalized === 'fullbike' || normalized === 'lengkapsatumotor') return PACKAGE_TYPE_META_MAP.FULL_BIKE;
  if (normalized === 'engine' || normalized === 'mesin') return PACKAGE_TYPE_META_MAP.ENGINE;
  if (normalized === 'brake' || normalized === 'pengereman' || normalized === 'rem') return PACKAGE_TYPE_META_MAP.BRAKE;
  if (normalized === 'body' || normalized === 'bodi') return PACKAGE_TYPE_META_MAP.BODY;
  if (normalized === 'cvt') return PACKAGE_TYPE_META_MAP.CVT;

  return {
    key: raw,
    label: PACKAGE_TYPE_LABELS[raw] || raw,
    band: 'bg-zinc-600 dark:bg-zinc-400',
    badge: 'bg-zinc-100 text-zinc-800 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700',
  };
}

export function formatSideLabel(side) {
  if (!side) return 'Netral';
  return SIDE_LABELS[side] || side;
}

export function formatPackageType(type) {
  return getPackageTypeMeta(type).label;
}

/**
 * Rarity-style diameter color tokens:
 * M5/M6 = zinc, M8 = sky, M10 = amber, M12+ = violet
 */
export function getDiameterTier(diameterMm) {
  const d = Number(diameterMm) || 0;
  if (d >= 12) {
    return {
      key: 'M12',
      label: `M${d}`,
      band: 'bg-violet-600 dark:bg-violet-500',
      badge: 'bg-violet-50 text-violet-800 border-violet-300 dark:bg-violet-500/15 dark:text-violet-300 dark:border-violet-500/30',
      cardTint: 'from-violet-500/10 to-transparent',
      ring: 'ring-violet-500',
    };
  }
  if (d >= 10) {
    return {
      key: 'M10',
      label: `M${d}`,
      band: 'bg-amber-500 dark:bg-amber-400',
      badge: 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30',
      cardTint: 'from-amber-500/10 to-transparent',
      ring: 'ring-amber-500',
    };
  }
  if (d >= 8) {
    return {
      key: 'M8',
      label: `M${d}`,
      band: 'bg-sky-600 dark:bg-sky-400',
      badge: 'bg-sky-50 text-sky-800 border-sky-300 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/30',
      cardTint: 'from-sky-500/10 to-transparent',
      ring: 'ring-sky-500',
    };
  }
  return {
    key: d > 0 ? `M${d}` : 'M6',
    label: d > 0 ? `M${d}` : '-',
    band: 'bg-zinc-600 dark:bg-zinc-400',
    badge: 'bg-zinc-100 text-zinc-800 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700',
    cardTint: 'from-zinc-500/10 to-transparent',
    ring: 'ring-zinc-500',
  };
}

/**
 * Brand accent band for motorcycle RosterCards.
 */
export function getBrandAccent(brand) {
  const b = (brand || '').toLowerCase();
  if (b === 'honda') {
    return {
      band: 'bg-rose-600 dark:bg-rose-500',
      pill: 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30',
      monogramBg: 'from-rose-950/80 to-zinc-900',
    };
  }
  if (b === 'yamaha') {
    return {
      band: 'bg-sky-600 dark:bg-sky-500',
      pill: 'bg-sky-50 text-sky-800 border-sky-300 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/30',
      monogramBg: 'from-sky-950/80 to-zinc-900',
    };
  }
  if (b === 'suzuki') {
    return {
      band: 'bg-indigo-600 dark:bg-indigo-500',
      pill: 'bg-indigo-50 text-indigo-800 border-indigo-300 dark:bg-indigo-500/15 dark:text-indigo-300 dark:border-indigo-500/30',
      monogramBg: 'from-indigo-950/80 to-zinc-900',
    };
  }
  if (b === 'kawasaki') {
    return {
      band: 'bg-emerald-600 dark:bg-emerald-500',
      pill: 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30',
      monogramBg: 'from-emerald-950/80 to-zinc-900',
    };
  }
  return {
    band: 'bg-zinc-600 dark:bg-zinc-400',
    pill: 'bg-zinc-100 text-zinc-800 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700',
    monogramBg: 'from-zinc-800 to-zinc-950',
  };
}

export function getCompletenessMeta(requirementsCount) {
  const count = Number(requirementsCount) || 0;
  if (count >= 5) {
    return {
      status: 'complete',
      label: 'Siap',
      dot: 'bg-emerald-600 dark:bg-emerald-400',
      text: 'text-emerald-700 dark:text-emerald-400',
      percent: 100,
    };
  }
  if (count > 0) {
    return {
      status: 'partial',
      label: 'Sebagian',
      dot: 'bg-amber-600 dark:bg-amber-400',
      text: 'text-amber-700 dark:text-amber-300',
      percent: Math.min(90, count * 18),
    };
  }
  return {
    status: 'empty',
    label: 'Kosong',
    dot: 'bg-zinc-500 dark:bg-zinc-400',
    text: 'text-zinc-600 dark:text-zinc-400',
    percent: 0,
  };
}
