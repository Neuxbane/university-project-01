<template>
  <div
    class="pointer-events-auto w-[176px] sm:w-[212px] bg-white/95 dark:bg-[#121215]/95 backdrop-blur-md rounded-2xl border border-zinc-300 dark:border-zinc-700 shadow-2xl overflow-hidden transition-all duration-150 flex flex-col"
    role="region"
    :aria-label="`Detail titik ${positionName}`"
  >
    <!-- Rarity / Size Accent Band -->
    <div class="h-1 w-full shrink-0" :class="tier.band" aria-hidden="true"></div>

    <!-- 80% Image Stage -->
    <div class="relative w-full h-[132px] sm:h-[168px] bg-zinc-950 overflow-hidden flex items-center justify-center shrink-0">
      <img
        v-if="boltImage"
        :src="boltImage"
        :alt="bolt.code"
        class="w-full h-full object-cover"
      />
      <div
        v-else
        class="w-full h-full bg-gradient-to-br flex flex-col items-center justify-center p-3 text-center"
        :class="tier.cardTint"
      >
        <Nut class="w-10 h-10 text-zinc-200 mb-1" aria-hidden="true" />
        <span class="font-mono text-xs font-bold text-zinc-100">
          M{{ Number(bolt.diameterMm) }} &times; {{ Number(bolt.lengthMm) }}
        </span>
      </div>

      <!-- Subtle top & bottom gradient scrims for crisp overlay legibility -->
      <div class="absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-black/70 to-transparent pointer-events-none" aria-hidden="true"></div>
      <div class="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/85 via-black/40 to-transparent pointer-events-none" aria-hidden="true"></div>

      <!-- Top-Left Size Pill -->
      <span
        class="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[11px] font-mono font-bold border backdrop-blur-sm"
        :class="tier.badge"
      >
        M{{ Number(bolt.diameterMm) }} &times; {{ Number(bolt.lengthMm) }}
      </span>

      <!-- Top-Right Close Button (44x44 touch target) -->
      <button
        type="button"
        @click.stop="$emit('close')"
        aria-label="Tutup kartu detail lokasi"
        class="absolute top-0.5 right-0.5 min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-xl text-white/90 hover:text-white hover:bg-black/45 cursor-pointer transition-colors"
      >
        <X class="w-4 h-4 drop-shadow" aria-hidden="true" />
      </button>

      <!-- Bottom-Right Quantity Badge -->
      <div class="absolute bottom-2 right-2 px-2 py-0.5 rounded-lg bg-zinc-950/90 border border-white/20 text-white font-mono text-xs font-bold shadow-md backdrop-blur-sm">
        {{ bolt.totalQuantity }} pcs
      </div>
    </div>

    <!-- ~20% Compact Footer Label -->
    <div class="px-2.5 py-2 bg-white dark:bg-[#121215] border-t border-zinc-200 dark:border-zinc-800">
      <p class="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate leading-tight">
        {{ positionName }}
      </p>
      <p class="font-mono text-[11px] text-zinc-600 dark:text-zinc-400 truncate mt-0.5 leading-tight">
        {{ bolt.code }}
      </p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { Nut, X } from 'lucide-vue-next';
import { getDiameterTier } from '../../utils/boltTokens';

const props = defineProps({
  bolt: { type: Object, required: true },
  positionName: { type: String, default: 'Titik Pasang' },
});

defineEmits(['close']);

const tier = computed(() => getDiameterTier(props.bolt.diameterMm));
const boltImage = computed(() => props.bolt.images?.[0]?.url || props.bolt.boltSpec?.images?.[0]?.url || null);
</script>
