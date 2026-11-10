<template>
  <div
    class="sticky bottom-0 z-30 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] bg-white/95 dark:bg-[#09090b]/95 backdrop-blur-md border-t border-zinc-300 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2.5 no-print"
  >
    <div v-if="$slots.summary" class="text-xs sm:text-sm font-mono text-zinc-700 dark:text-zinc-300 min-w-0">
      <slot name="summary" />
    </div>
    <div class="flex items-center gap-2.5 flex-1 sm:flex-initial justify-end">
      <slot />
    </div>
  </div>
</template>
