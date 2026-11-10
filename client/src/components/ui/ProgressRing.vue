<template>
  <div class="inline-flex items-center gap-3">
    <div class="relative shrink-0" :style="{ width: `${size}px`, height: `${size}px` }">
      <svg :width="size" :height="size" :viewBox="`0 0 ${size} ${size}`" class="-rotate-90" aria-hidden="true">
        <circle
          :cx="center"
          :cy="center"
          :r="radius"
          fill="none"
          class="stroke-zinc-200 dark:stroke-zinc-800"
          :stroke-width="strokeWidth"
        />
        <circle
          :cx="center"
          :cy="center"
          :r="radius"
          fill="none"
          :class="strokeClass"
          :stroke-width="strokeWidth"
          stroke-linecap="round"
          :stroke-dasharray="circumference"
          :stroke-dashoffset="dashOffset"
          class="transition-all duration-300 ease-out"
        />
      </svg>
      <span class="absolute inset-0 flex items-center justify-center font-mono font-bold text-xs text-zinc-900 dark:text-zinc-100">
        {{ animatedPercent }}%
      </span>
    </div>
    <div v-if="label || sublabel" class="min-w-0">
      <p v-if="label" class="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">{{ label }}</p>
      <p v-if="sublabel" class="text-xs text-zinc-600 dark:text-zinc-400 truncate">{{ sublabel }}</p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useCountUp } from '../../composables/useCountUp';

const props = defineProps({
  value: { type: Number, default: 0 },
  size: { type: Number, default: 56 },
  strokeWidth: { type: Number, default: 6 },
  label: { type: String, default: '' },
  sublabel: { type: String, default: '' },
  tone: { type: String, default: 'emerald' },
});

const clamped = computed(() => Math.max(0, Math.min(100, Math.round(props.value || 0))));
const animatedPercent = useCountUp(() => clamped.value, 400);

const center = computed(() => props.size / 2);
const radius = computed(() => (props.size - props.strokeWidth) / 2);
const circumference = computed(() => 2 * Math.PI * radius.value);
const dashOffset = computed(() => circumference.value * (1 - clamped.value / 100));

const strokeClass = computed(() => {
  if (props.tone === 'amber') return 'stroke-amber-600 dark:stroke-amber-400';
  if (props.tone === 'sky') return 'stroke-sky-600 dark:stroke-sky-400';
  return 'stroke-emerald-600 dark:stroke-emerald-400';
});
</script>
