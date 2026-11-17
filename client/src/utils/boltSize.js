/**
 * Display helpers for bolt specs whose catalog data is incomplete.
 * Nuts have no length in the catalog, so they are stored with lengthMm = 0;
 * material/finish are left empty until the owner fills them in.
 */

export function formatLength(lengthMm, unit = '') {
  const n = Number(lengthMm);
  return Number.isFinite(n) && n > 0 ? `${n}${unit}` : '–';
}

export function formatOptional(value) {
  const text = String(value ?? '').trim();
  return text || '–';
}

export function formatMaterialFinish(spec) {
  const material = String(spec?.material ?? '').trim();
  const finish = String(spec?.finish ?? '').trim();
  if (material && finish) return `${material} (${finish})`;
  return material || finish || '–';
}
