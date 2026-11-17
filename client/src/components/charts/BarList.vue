<template>
  <p v-if="!rows.length" class="text-sm text-zinc-500 dark:text-zinc-400">{{ emptyText }}</p>
  <ol v-else class="space-y-3" :aria-label="ariaLabel">
    <li v-for="row in rows" :key="row.label" class="space-y-1">
      <div class="flex items-baseline justify-between gap-3 text-sm">
        <span class="min-w-0 truncate text-zinc-800 dark:text-zinc-200" :title="row.label">{{ row.label }}</span>
        <span class="shrink-0 font-mono font-bold text-zinc-900 dark:text-zinc-100">
          {{ formatNumber(row.value) }}<span v-if="unit" class="text-xs font-semibold text-zinc-500 dark:text-zinc-400"> {{ unit }}</span>
        </span>
      </div>
      <div class="h-2.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden" aria-hidden="true">
        <div class="h-full rounded-full transition-[width] duration-500 ease-out" :class="row.barClass || barClass" :style="{ width: row.width }"></div>
      </div>
      <p v-if="row.hint" class="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">{{ row.hint }}</p>
    </li>
  </ol>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  // [{ label, value, hint?, barClass? }]
  items: { type: Array, default: () => [] },
  unit: { type: String, default: '' },
  barClass: { type: String, default: 'bg-zinc-800 dark:bg-zinc-200' },
  ariaLabel: { type: String, default: '' },
  emptyText: { type: String, default: 'Belum ada data.' },
});

const formatNumber = (n) => Number(n || 0).toLocaleString('id-ID');

const rows = computed(() => {
  const max = Math.max(1, ...props.items.map((i) => Number(i.value) || 0));
  return props.items.map((i) => ({ ...i, width: `${Math.max(2, ((Number(i.value) || 0) / max) * 100)}%` }));
});
</script>
