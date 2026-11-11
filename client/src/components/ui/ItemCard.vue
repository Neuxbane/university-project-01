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
        :alt="code"
        loading="lazy"
        class="w-full h-full object-cover transition-transform duration-200 ease-out group-hover:scale-[1.04]"
      />
      <div
        v-else
        class="w-full h-full bg-gradient-to-br flex flex-col items-center justify-center p-3 text-center"
        :class="tier.cardTint"
      >
        <Nut class="w-10 h-10 text-zinc-300 mb-1" aria-hidden="true" />
        <span class="font-mono font-bold text-sm text-zinc-200">
          {{ dimensionText }}
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

      <!-- Bottom-right Dominant Quantity Badge -->
      <div class="absolute bottom-2 right-2 px-2.5 py-1 rounded-xl bg-zinc-950/90 border border-white/20 text-white backdrop-blur-sm flex items-baseline gap-1 shadow-md">
        <span class="text-2xl font-mono font-bold leading-none">{{ quantity }}</span>
        <span class="text-[11px] font-mono text-zinc-300">{{ quantityLabel }}</span>
      </div>
    </div>

    <!-- Short Info Footer (~20% card height) -->
    <div class="px-2.5 py-2 w-full bg-white dark:bg-[#121215] border-t border-zinc-200/80 dark:border-zinc-800">
      <div class="flex items-center justify-between gap-1.5">
        <span class="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate leading-tight">
          {{ dimensionText }} &bull; {{ code }}
        </span>
      </div>
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

const props = defineProps({
  item: { type: Object, required: true },
  selected: { type: Boolean, default: false },
  quantityLabel: { type: String, default: 'pcs' },
});

defineEmits(['select']);

const spec = computed(() => props.item.boltSpec || props.item);
const code = computed(() => spec.value.code || props.item.code || '-');
const diameter = computed(() => Number(spec.value.diameterMm ?? props.item.diameterMm ?? 0));
const length = computed(() => Number(spec.value.lengthMm ?? props.item.lengthMm ?? 0));
const headType = computed(() => spec.value.headType || props.item.headType || '');
const quantity = computed(() => props.item.totalQuantity ?? props.item.quantity ?? 0);
const primaryImage = computed(() => props.item.images?.[0]?.url || spec.value.images?.[0]?.url || null);
const positionLabel = computed(() => props.item.positionsSummary || props.item.positionName || 'Semua posisi');
const dimensionText = computed(() => `M${diameter.value} × ${length.value}`);
const tier = computed(() => getDiameterTier(diameter.value));
</script>
