/**
 * Master Barang naming: items are the shop catalog's products (named as in the catalog), sorted into
 * the types below. Former size-only specs survive only in old Riwayat checklists and have no name.
 */
import { formatLength } from './boltSize';

export const ITEM_TYPES = [
  { value: 'BAUT', label: 'Baut' },
  { value: 'MUR', label: 'Mur' },
  { value: 'RING', label: 'Ring' },
  { value: 'EMBLEM', label: 'Emblem' },
  { value: 'PART', label: 'Sparepart & aksesoris' },
  { value: 'PERAWATAN', label: 'Oli & perawatan' },
  { value: 'JASA', label: 'Jasa' },
];

const TYPE_LABEL = Object.fromEntries(ITEM_TYPES.map((t) => [t.value, t.label]));

export const itemTypeLabel = (type) => TYPE_LABEL[type] || 'Barang';

/** Size text for sized goods: "M6 × 20" for a bolt, "M6" for a nut or ring; '' when the catalog gives none. */
export function itemSize(spec) {
  const d = Number(spec?.diameterMm);
  const l = Number(spec?.lengthMm);
  if (!(d > 0)) return '';
  return l > 0 ? `M${d} × ${formatLength(l)}` : `M${d}`;
}

/** Name shown everywhere: the catalog product name; old size specs in Riwayat by their size. */
export function itemName(spec) {
  if (!spec) return '–';
  if (spec.name) return spec.name;
  const d = Number(spec.diameterMm);
  if (Number(spec.lengthMm) > 0) return `Baut ${itemSize(spec)}`;
  if (d > 0) return `${spec.headType || 'Mur'} M${d}`;
  return spec.code || '–';
}
