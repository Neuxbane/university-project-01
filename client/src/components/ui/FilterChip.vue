<template>
  <button
    type="button"
    @click="$emit('click')"
    :aria-pressed="active"
    class="min-h-[44px] px-3.5 py-2 rounded-full text-xs sm:text-sm font-semibold border transition-all duration-150 inline-flex items-center gap-2 cursor-pointer whitespace-nowrap active:scale-[0.98]"
    :class="active
      ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100 shadow-sm'
      : 'bg-white text-zinc-800 border-zinc-400 hover:border-zinc-600 dark:bg-[#18181c] dark:text-zinc-200 dark:border-zinc-700 dark:hover:border-zinc-500'"
  >
    <span>{{ label }}</span>
    <span
      v-if="count !== null && count !== undefined"
      class="px-1.5 py-0.5 rounded-full text-[11px] font-mono leading-none"
      :class="active
        ? 'bg-white/20 text-white dark:bg-zinc-900/15 dark:text-zinc-900'
        : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'"
    >
      {{ count }}
    </span>
  </button>
</template>

<script setup>
defineProps({
  label: { type: String, required: true },
  count: { type: [Number, String], default: null },
  active: { type: Boolean, default: false },
});

defineEmits(['click']);
</script>
