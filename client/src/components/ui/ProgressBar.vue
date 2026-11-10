<template>
  <div class="space-y-1.5">
    <div v-if="label || showPercent" class="flex items-center justify-between text-xs font-mono">
      <span class="text-zinc-600 dark:text-zinc-400">{{ label }}</span>
      <span v-if="showPercent" class="font-bold text-zinc-900 dark:text-zinc-100">{{ clamped }}%</span>
    </div>
    <div
      class="w-full h-2.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden"
      role="progressbar"
      :aria-valuenow="clamped"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-label="label || 'Progres'"
    >
      <div
        class="h-full rounded-full transition-all duration-300 ease-out"
        :class="toneClass"
        :style="{ width: `${clamped}%` }"
      ></div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  value: { type: Number, default: 0 },
  label: { type: String, default: '' },
  showPercent: { type: Boolean, default: true },
  tone: { type: String, default: 'neutral' }, // neutral | emerald | amber
});

const clamped = computed(() => Math.max(0, Math.min(100, Math.round(props.value || 0))));

const toneClass = computed(() => {
  if (props.tone === 'emerald' || clamped.value === 100) return 'bg-emerald-600 dark:bg-emerald-500';
  if (props.tone === 'amber') return 'bg-amber-600 dark:bg-amber-400';
  return 'bg-zinc-900 dark:bg-zinc-100';
});
</script>
