<template>
  <p v-if="!columns.length" class="text-sm text-zinc-500 dark:text-zinc-400">{{ emptyText }}</p>
  <ol v-else class="flex items-end gap-2 sm:gap-3" :aria-label="ariaLabel">
    <li v-for="col in columns" :key="col.label" class="flex-1 min-w-0 flex flex-col items-center gap-1.5">
      <span class="font-mono text-sm font-bold text-zinc-900 dark:text-zinc-100">
        {{ col.value }}<span class="sr-only"> {{ unit }}</span>
      </span>
      <div class="w-full flex items-end justify-center" :style="{ height: `${height}px` }" aria-hidden="true">
        <div class="w-full max-w-[56px] rounded-t-lg transition-[height] duration-500 ease-out" :class="col.barClass || barClass" :style="{ height: col.heightPct }"></div>
      </div>
      <span class="w-full pt-1.5 border-t border-zinc-300 dark:border-zinc-700 text-center font-mono text-xs font-bold text-zinc-800 dark:text-zinc-200">{{ col.label }}</span>
      <span v-if="col.hint" class="text-center text-[11px] leading-tight text-zinc-500 dark:text-zinc-400">{{ col.hint }}</span>
    </li>
  </ol>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  // [{ label, value, hint?, barClass? }]
  items: { type: Array, default: () => [] },
  unit: { type: String, default: '' },
  height: { type: Number, default: 150 },
  barClass: { type: String, default: 'bg-zinc-800 dark:bg-zinc-200' },
  ariaLabel: { type: String, default: '' },
  emptyText: { type: String, default: 'Belum ada data.' },
});

const columns = computed(() => {
  const max = Math.max(1, ...props.items.map((i) => Number(i.value) || 0));
  return props.items.map((i) => ({ ...i, heightPct: `${Math.max(3, ((Number(i.value) || 0) / max) * 100)}%` }));
});
</script>
