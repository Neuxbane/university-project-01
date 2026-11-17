<template>
  <section
    :aria-labelledby="titleId"
    class="bg-white dark:bg-[#121215] border border-zinc-300 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col gap-4 min-w-0"
  >
    <header class="space-y-0.5">
      <h2 :id="titleId" class="text-base font-bold text-zinc-900 dark:text-zinc-100">{{ title }}</h2>
      <p v-if="description" class="text-xs text-zinc-600 dark:text-zinc-400">{{ description }}</p>
    </header>
    <div class="flex-1 min-w-0">
      <slot />
    </div>
    <footer v-if="$slots.footer" class="pt-3 border-t border-zinc-200 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-400">
      <slot name="footer" />
    </footer>
  </section>
</template>

<script setup>
import { useId } from 'vue';

defineProps({
  title: { type: String, required: true },
  description: { type: String, default: '' },
});

const titleId = useId();
</script>
