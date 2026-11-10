<template>
  <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-[#18181c] border border-zinc-300 dark:border-zinc-700 text-xs">
    <component v-if="icon" :is="icon" class="w-4 h-4 text-zinc-600 dark:text-zinc-400 shrink-0" aria-hidden="true" />
    <span class="text-zinc-600 dark:text-zinc-400">{{ label }}</span>
    <strong class="font-mono font-bold text-zinc-900 dark:text-zinc-100">{{ value }}</strong>
  </div>
</template>

<script setup>
defineProps({
  icon: { type: [Object, Function], default: null },
  label: { type: String, required: true },
  value: { type: [String, Number], required: true },
});
</script>
