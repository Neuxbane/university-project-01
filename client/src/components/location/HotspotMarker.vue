<template>
  <button
    type="button"
    @click.stop="$emit('select')"
    :aria-label="ariaLabel"
    :aria-pressed="active"
    class="absolute -translate-x-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full cursor-pointer transition-transform duration-150 focus-visible:ring-2 focus-visible:ring-white z-20"
    :class="active ? 'scale-110 z-30' : 'hover:scale-110'"
    :style="{ left: `${x}%`, top: `${y}%` }"
  >
    <!-- Pulse Ring -->
    <span
      class="absolute w-7 h-7 rounded-full pointer-events-none"
      :class="[
        active ? 'bg-amber-400/50 motion-safe:animate-ping' : 'bg-white/35 motion-safe:animate-pulse'
      ]"
      aria-hidden="true"
    ></span>

    <!-- Visible Dot -->
    <span
      class="relative w-6 h-6 rounded-full border-2 shadow-lg flex items-center justify-center font-mono text-[10px] font-bold transition-colors"
      :class="dotClasses"
    >
      <Check v-if="checkStatus === 'done'" class="w-3.5 h-3.5 stroke-[3]" aria-hidden="true" />
      <template v-else>{{ indexNumber }}</template>
    </span>
  </button>
</template>

<script setup>
import { computed } from 'vue';
import { Check } from 'lucide-vue-next';

const props = defineProps({
  x: { type: Number, required: true },
  y: { type: Number, required: true },
  indexNumber: { type: [Number, String], default: '' },
  label: { type: String, default: 'Titik Baut' },
  active: { type: Boolean, default: false },
  draft: { type: Boolean, default: false },
  checkStatus: { type: String, default: null },
});

defineEmits(['select']);

const ariaLabel = computed(() => `Titik ${props.indexNumber}: ${props.label}`);

const dotClasses = computed(() => {
  if (props.draft) {
    return 'bg-sky-500 border-white text-white';
  }
  if (props.active) {
    return 'bg-amber-500 border-white text-zinc-950 ring-2 ring-amber-300';
  }
  if (props.checkStatus === 'done') {
    return 'bg-emerald-600 border-white text-white';
  }
  if (props.checkStatus === 'partial') {
    return 'bg-amber-500 border-white text-zinc-950';
  }
  return 'bg-zinc-900/95 border-white text-white hover:bg-zinc-800';
});
</script>
