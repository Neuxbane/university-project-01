<template>
  <div class="flex flex-col sm:flex-row items-center gap-5">
    <div class="relative w-36 h-36 shrink-0">
      <svg viewBox="0 0 120 120" class="w-full h-full -rotate-90" aria-hidden="true">
        <circle cx="60" cy="60" :r="R" fill="none" class="stroke-zinc-100 dark:stroke-zinc-800" :stroke-width="STROKE" />
        <circle
          v-for="seg in arcs"
          :key="seg.label"
          cx="60"
          cy="60"
          :r="R"
          fill="none"
          :stroke="seg.color"
          :stroke-width="STROKE"
          :stroke-dasharray="`${seg.length} ${CIRC - seg.length}`"
          :stroke-dashoffset="-seg.offset"
        />
      </svg>
      <div class="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span class="font-mono text-2xl font-bold text-zinc-900 dark:text-zinc-100">{{ formatNumber(total) }}</span>
        <span class="text-[11px] text-zinc-600 dark:text-zinc-400">{{ centerLabel }}</span>
      </div>
    </div>

    <ul class="w-full space-y-2" :aria-label="ariaLabel">
      <li v-for="seg in legend" :key="seg.label" class="flex items-center gap-2.5 text-sm">
        <span class="w-3 h-3 rounded-sm shrink-0" :style="{ backgroundColor: seg.color }" aria-hidden="true"></span>
        <span class="min-w-0 flex-1 truncate text-zinc-800 dark:text-zinc-200" :title="seg.label">{{ seg.label }}</span>
        <span class="shrink-0 font-mono font-bold text-zinc-900 dark:text-zinc-100">{{ formatNumber(seg.value) }}</span>
        <span class="shrink-0 w-11 text-right font-mono text-xs text-zinc-500 dark:text-zinc-400">{{ seg.percent }}</span>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  // [{ label, value, color }]
  segments: { type: Array, default: () => [] },
  centerLabel: { type: String, default: 'total' },
  ariaLabel: { type: String, default: '' },
});

const R = 48;
const STROKE = 16;
const CIRC = 2 * Math.PI * R;
const GAP = 1.5;

const formatNumber = (n) => Number(n || 0).toLocaleString('id-ID');
const total = computed(() => props.segments.reduce((sum, s) => sum + (Number(s.value) || 0), 0));

const legend = computed(() =>
  props.segments.map((s) => ({
    ...s,
    percent: total.value ? `${Math.round(((Number(s.value) || 0) / total.value) * 100)}%` : '0%',
  }))
);

const arcs = computed(() => {
  const visible = props.segments.filter((s) => Number(s.value) > 0);
  const gap = visible.length > 1 ? GAP : 0;
  let offset = 0;
  return visible.map((s) => {
    const full = (Number(s.value) / total.value) * CIRC;
    const arc = { label: s.label, color: s.color, length: Math.max(0.5, full - gap), offset };
    offset += full;
    return arc;
  });
});
</script>
