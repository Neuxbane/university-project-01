<template>
  <button
    type="button"
    @click.stop="$emit('select')"
    :aria-label="`Titik ${index}: ${positionName} - ${bolt.code}, ${quantity} pcs${statusAriaSuffix}`"
    class="group pointer-events-auto w-full h-full bg-white/95 dark:bg-[#121215]/95 backdrop-blur-sm rounded-xl border shadow-lg overflow-hidden flex flex-col text-left cursor-pointer transition-all duration-150 hover:scale-[1.03] focus-visible:ring-2 focus-visible:ring-amber-400"
    :class="cardBorderClass"
  >
    <!-- ~80% Image Stage -->
    <div class="relative flex-1 min-h-0 w-full bg-zinc-950 overflow-hidden flex items-center justify-center">
      <img
        v-if="boltImage"
        :src="boltImage"
        :alt="bolt.code"
        class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-150"
        :class="checkStatus === 'done' ? 'opacity-65 grayscale-[25%]' : ''"
      />
      <div
        v-else
        class="w-full h-full bg-gradient-to-br flex flex-col items-center justify-center p-1"
        :class="[tier.cardTint, checkStatus === 'done' ? 'opacity-65' : '']"
      >
        <Nut class="w-5 h-5 sm:w-6 sm:h-6 text-zinc-200" aria-hidden="true" />
      </div>

      <!-- Subtle bottom gradient scrim -->
      <div class="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-black/85 to-transparent pointer-events-none" aria-hidden="true"></div>

      <!-- Top-left Index (plus compact size tag when inspecting bolt-level pin) -->
      <span
        class="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-zinc-950/90 border border-white/20 text-white font-mono text-[9px] sm:text-[10px] font-bold leading-none"
      >
        #{{ index }}<template v-if="!minimalMode"> M{{ Number(bolt.diameterMm) }}&times;{{ Number(bolt.lengthMm) }}</template>
      </span>

      <!-- Top-right Checklist Status Badge (only in checklist mode) -->
      <span
        v-if="checkStatus === 'done'"
        class="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-emerald-600 text-white font-mono text-[9px] font-bold leading-none inline-flex items-center gap-0.5 shadow"
      >
        <Check class="w-2.5 h-2.5 stroke-[3]" aria-hidden="true" />
        <span>Sudah</span>
      </span>
      <span
        v-else-if="checkStatus === 'partial'"
        class="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-amber-500 text-zinc-950 font-mono text-[9px] font-bold leading-none shadow"
      >
        Sebagian
      </span>
      <span
        v-else-if="checkStatus === 'pending'"
        class="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-rose-600 text-white font-mono text-[9px] font-bold leading-none shadow"
      >
        Belum
      </span>

      <!-- Bottom-right Quantity -->
      <span
        class="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-zinc-950/90 border border-white/20 text-white font-mono text-[9px] sm:text-[10px] font-bold leading-none"
      >
        {{ quantity }} pcs<template v-if="extraSpecsCount > 0"> +{{ extraSpecsCount }}</template>
      </span>
    </div>

    <!-- ~20% Single-line Location Label -->
    <div class="px-1.5 py-1 w-full bg-white dark:bg-[#121215] border-t border-zinc-200 dark:border-zinc-800 shrink-0">
      <p
        class="text-[10px] sm:text-[11px] font-bold truncate leading-tight"
        :class="checkStatus === 'done'
          ? 'text-emerald-700 dark:text-emerald-400 line-through'
          : 'text-zinc-900 dark:text-zinc-100'"
      >
        {{ positionName }}
      </p>
    </div>
  </button>
</template>

<script setup>
import { computed } from 'vue';
import { Check, Nut } from 'lucide-vue-next';
import { getDiameterTier } from '../../utils/boltTokens';

const props = defineProps({
  index: { type: [Number, String], required: true },
  bolt: { type: Object, required: true },
  imageUrl: { type: String, default: null },
  minimalMode: { type: Boolean, default: false },
  quantity: { type: Number, default: 0 },
  extraSpecsCount: { type: Number, default: 0 },
  positionName: { type: String, default: 'Titik Pasang' },
  checkStatus: { type: String, default: null }, // 'done' | 'partial' | 'pending' | null
});

defineEmits(['select']);

const tier = computed(() => getDiameterTier(props.bolt.diameterMm));
const boltImage = computed(() => props.imageUrl || props.bolt.images?.[0]?.url || props.bolt.boltSpec?.images?.[0]?.url || null);

const cardBorderClass = computed(() => {
  if (props.checkStatus === 'done') return 'border-emerald-500/80 dark:border-emerald-500/70';
  if (props.checkStatus === 'partial') return 'border-amber-500 dark:border-amber-400';
  if (props.checkStatus === 'pending') return 'border-rose-400 dark:border-rose-500/70 hover:border-amber-500';
  return 'border-zinc-300 dark:border-zinc-700 hover:border-amber-500 dark:hover:border-amber-400';
});

const statusAriaSuffix = computed(() => {
  if (props.checkStatus === 'done') return ' (Sudah diambil)';
  if (props.checkStatus === 'partial') return ' (Sebagian diambil)';
  if (props.checkStatus === 'pending') return ' (Belum diambil)';
  return '';
});
</script>
