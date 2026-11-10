<template>
  <div class="bg-white dark:bg-[#121215] rounded-2xl border border-dashed border-zinc-400 dark:border-zinc-700 py-12 px-5 text-center space-y-3">
    <div class="w-12 h-12 mx-auto rounded-2xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 flex items-center justify-center text-zinc-600 dark:text-zinc-300">
      <component :is="icon" class="w-6 h-6" aria-hidden="true" />
    </div>
    <div class="max-w-sm mx-auto space-y-1">
      <h2 class="text-base font-bold text-zinc-900 dark:text-zinc-100">{{ title }}</h2>
      <p v-if="description" class="text-sm text-zinc-600 dark:text-zinc-400">{{ description }}</p>
    </div>
    <div v-if="actionLabel" class="pt-1">
      <button
        type="button"
        @click="$emit('action')"
        class="min-h-[44px] px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 text-sm font-semibold cursor-pointer active:scale-[0.98] transition-all"
      >
        {{ actionLabel }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { PackageOpen } from 'lucide-vue-next';

defineProps({
  icon: { type: [Object, Function], default: () => PackageOpen },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  actionLabel: { type: String, default: '' },
});

defineEmits(['action']);
</script>
