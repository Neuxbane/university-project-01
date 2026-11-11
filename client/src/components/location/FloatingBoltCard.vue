<template>
  <div
    class="pointer-events-auto w-[210px] sm:w-[220px] max-w-[220px] bg-white/95 dark:bg-[#121215]/95 backdrop-blur-md rounded-2xl border border-zinc-300 dark:border-zinc-700 shadow-2xl overflow-hidden transition-all duration-150"
    role="region"
    :aria-label="`Detail titik ${positionName}`"
  >
    <div class="h-1 w-full" :class="tier.band" aria-hidden="true"></div>

    <div class="p-3 space-y-2">
      <div class="flex items-start justify-between gap-2">
        <div class="flex items-center gap-2 min-w-0">
          <div class="w-9 h-9 rounded-lg overflow-hidden bg-zinc-900 border border-zinc-300 dark:border-zinc-700 shrink-0 flex items-center justify-center">
            <img
              v-if="boltImage"
              :src="boltImage"
              :alt="bolt.code"
              class="w-full h-full object-cover"
            />
            <Nut v-else class="w-4 h-4 text-zinc-300" aria-hidden="true" />
          </div>
          <div class="min-w-0">
            <p class="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
              {{ bolt.code }}
            </p>
            <p class="font-mono text-[11px] text-zinc-600 dark:text-zinc-400">
              M{{ Number(bolt.diameterMm) }} × {{ Number(bolt.lengthMm) }} mm
            </p>
          </div>
        </div>

        <button
          type="button"
          @click.stop="$emit('close')"
          aria-label="Tutup kartu detail lokasi"
          class="min-w-[44px] min-h-[44px] -mt-2 -mr-2 inline-flex items-center justify-center rounded-xl text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer shrink-0"
        >
          <X class="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      <div class="flex items-center justify-between gap-2 pt-1.5 border-t border-zinc-200 dark:border-zinc-800">
        <span class="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">
          {{ positionName }}
        </span>
        <span class="px-2 py-0.5 rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-mono text-xs font-bold shrink-0">
          {{ bolt.totalQuantity }} pcs
        </span>
      </div>
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
