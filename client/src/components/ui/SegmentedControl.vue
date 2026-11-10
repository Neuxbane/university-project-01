<template>
  <div
    role="tablist"
    class="grid sm:inline-flex w-full sm:w-auto p-1 bg-zinc-100 dark:bg-[#18181c] rounded-xl border border-zinc-300 dark:border-zinc-700 gap-1"
    :style="{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }"
  >
    <button
      v-for="opt in options"
      :key="opt.value"
      type="button"
      role="tab"
      :aria-selected="modelValue === opt.value"
      @click="$emit('update:modelValue', opt.value)"
      class="min-h-[44px] px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-150 ease-out cursor-pointer inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
      :class="modelValue === opt.value
        ? 'bg-white dark:bg-[#121215] text-zinc-900 dark:text-zinc-100 shadow-sm'
        : 'text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white'"
    >
      <span class="truncate">{{ opt.label }}</span>
      <span
        v-if="opt.count !== undefined && opt.count !== null"
        class="px-1.5 py-0.5 rounded-md text-[11px] font-mono leading-none"
        :class="modelValue === opt.value
          ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
          : 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'"
      >
        {{ opt.count }}
      </span>
    </button>
  </div>
</template>

<script setup>
defineProps({
  modelValue: { type: [String, Number], required: true },
  options: { type: Array, required: true }, // [{ value, label, count? }]
});

defineEmits(['update:modelValue']);
</script>
