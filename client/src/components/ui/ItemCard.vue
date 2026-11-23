<template>
  <button
    type="button"
    @click="$emit('select', item)"
    :aria-pressed="selected"
    class="group relative w-full text-left bg-white dark:bg-[#121215] rounded-2xl border overflow-hidden transition-all duration-150 ease-out cursor-pointer hover:-translate-y-0.5 active:scale-[0.98] flex flex-col"
    :class="selected
      ? 'border-zinc-900 dark:border-zinc-100 ring-2 ring-zinc-900 dark:ring-zinc-100 shadow-lg'
      : 'border-zinc-300 dark:border-zinc-800 hover:border-zinc-500 dark:hover:border-zinc-600 shadow-sm'"
  >
    <!-- Rarity / Size Color Band -->
    <div class="h-1.5 w-full shrink-0" :class="tier.band" aria-hidden="true"></div>

    <!-- Photo / Icon Area -->
    <div class="relative aspect-square w-full overflow-hidden bg-zinc-950 flex items-center justify-center">
      <img
        v-if="primaryImage"
        :src="primaryImage"
        :alt="name"
        loading="lazy"
        class="w-full h-full object-cover transition-transform duration-200 ease-out group-hover:scale-[1.04]"
      />
      <div
        v-else
        class="w-full h-full bg-gradient-to-br flex flex-col items-center justify-center p-3 text-center"
        :class="tier.cardTint"
      >
        <Nut class="w-10 h-10 text-zinc-300 mb-1" aria-hidden="true" />
        <span class="font-bold text-sm text-zinc-200 line-clamp-3">
          {{ name }}
        </span>
      </div>

      <!-- Bottom dark gradient for quantity badge legibility -->
      <div class="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/85 via-black/40 to-transparent pointer-events-none" aria-hidden="true"></div>

      <!-- Top-left Diameter Tier Pill (color + text) -->
      <span
        class="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[11px] font-mono font-bold border backdrop-blur-sm"
        :class="tier.badge"
      >
        {{ tier.label }}
      </span>

      <!-- Top-right safety flags (pick list only) -->
      <BoltFlags class="absolute top-2 right-2 justify-end" :critical="Boolean(item.isCritical)" :check="Boolean(item.needsCheck)" />

      <!-- Bottom-right Dominant Quantity Badge -->
      <div class="absolute bottom-2 right-2 px-2.5 py-1 rounded-xl bg-zinc-950/90 border border-white/20 text-white backdrop-blur-sm flex items-baseline gap-1 shadow-md">
        <span class="text-2xl font-mono font-bold leading-none">{{ quantity }}</span>
        <span class="text-[11px] font-mono text-zinc-300">{{ quantityLabel }}</span>
      </div>
    </div>

    <!-- Short Info Footer (~20% card height) -->
    <div class="px-2.5 py-2 w-full bg-white dark:bg-[#121215] border-t border-zinc-200/80 dark:border-zinc-800">
      <p class="text-xs font-bold text-zinc-900 dark:text-zinc-100 line-clamp-2 leading-tight min-h-[2.5em]" :title="`${name} (${code})`">
        {{ name }}
      </p>
      <p class="text-[11px] text-zinc-600 dark:text-zinc-400 truncate mt-0.5 leading-tight">
        {{ positionLabel }}
      </p>
    </div>
  </button>
</template>

<script setup>
import { computed } from 'vue';
import { Nut } from 'lucide-vue-next';
import { getDiameterTier } from '../../utils/boltTokens';
import { itemName } from '../../utils/itemLabel';
import BoltFlags from './BoltFlags.vue';

const props = defineProps({
  item: { type: Object, required: true },
  selected: { type: Boolean, default: false },
  quantityLabel: { type: String, default: 'pcs' },
});

defineEmits(['select']);

const spec = computed(() => props.item.boltSpec || props.item);
const code = computed(() => spec.value.code || props.item.code || '-');
const diameter = computed(() => Number(spec.value.diameterMm ?? props.item.diameterMm ?? 0));
const quantity = computed(() => props.item.totalQuantity ?? props.item.quantity ?? 0);
const primaryImage = computed(() => props.item.images?.[0]?.url || spec.value.images?.[0]?.url || null);
const positionLabel = computed(() => props.item.positionsSummary || props.item.positionName || 'Semua posisi');
// Master Barang = the shop catalog: every card is named like the catalog. Sized goods (bolt, nut, ring)
// keep the diameter colour; other goods get a colour per type.
const name = computed(() => itemName({ ...props.item, ...spec.value, name: spec.value.name || props.item.name }));
const itemType = computed(() => spec.value.itemType || props.item.itemType || 'BAUT');
const TYPE_TIERS = {
  EMBLEM: ['Emblem', 'emerald'],
  PART: ['Sparepart', 'zinc'],
  PERAWATAN: ['Perawatan', 'teal'],
  JASA: ['Jasa', 'rose'],
  BAUT: ['Baut', 'zinc'],
  MUR: ['Mur', 'zinc'],
  RING: ['Ring', 'zinc'],
};
const TIER_COLORS = {
  emerald: { band: 'bg-emerald-600 dark:bg-emerald-500', badge: 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30', cardTint: 'from-emerald-500/10 to-transparent', ring: 'ring-emerald-500' },
  teal: { band: 'bg-teal-600 dark:bg-teal-500', badge: 'bg-teal-50 text-teal-800 border-teal-300 dark:bg-teal-500/15 dark:text-teal-300 dark:border-teal-500/30', cardTint: 'from-teal-500/10 to-transparent', ring: 'ring-teal-500' },
  rose: { band: 'bg-rose-600 dark:bg-rose-500', badge: 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30', cardTint: 'from-rose-500/10 to-transparent', ring: 'ring-rose-500' },
  zinc: { band: 'bg-zinc-500 dark:bg-zinc-400', badge: 'bg-zinc-100 text-zinc-800 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-600', cardTint: 'from-zinc-500/10 to-transparent', ring: 'ring-zinc-500' },
};
const tier = computed(() => {
  const sized = diameter.value > 0 && ['BAUT', 'MUR', 'RING'].includes(itemType.value);
  if (sized) return getDiameterTier(diameter.value);
  const [label, color] = TYPE_TIERS[itemType.value] || ['Barang', 'zinc'];
  return { key: itemType.value, label, ...TIER_COLORS[color] };
});
</script>
