<template>
  <div
    class="fixed top-4 right-4 left-4 sm:left-auto sm:w-96 z-[80] flex flex-col gap-2 pointer-events-none no-print"
    aria-live="polite"
    aria-atomic="true"
  >
    <TransitionGroup
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <div
        v-for="t in toasts"
        :key="t.id"
        role="status"
        class="pointer-events-auto rounded-2xl border px-4 py-3 shadow-xl backdrop-blur-md flex items-center justify-between gap-3 text-sm font-medium"
        :class="toastClasses(t.type)"
      >
        <div class="flex items-center gap-2.5 min-w-0">
          <CheckCircle2 v-if="t.type === 'success'" class="w-5 h-5 shrink-0" aria-hidden="true" />
          <AlertTriangle v-else-if="t.type === 'error'" class="w-5 h-5 shrink-0" aria-hidden="true" />
          <Info v-else class="w-5 h-5 shrink-0" aria-hidden="true" />
          <span class="leading-snug">{{ t.message }}</span>
        </div>
        <button
          type="button"
          @click="dismissToast(t.id)"
          aria-label="Tutup pemberitahuan"
          class="min-w-[44px] min-h-[44px] -mr-2 inline-flex items-center justify-center rounded-xl hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer shrink-0"
        >
          <X class="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup>
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-vue-next';
import { useToast } from '../../composables/useToast';

const { toasts, dismissToast } = useToast();

const toastClasses = (type) => {
  if (type === 'success') {
    return 'bg-emerald-50/95 text-emerald-900 border-emerald-300 dark:bg-emerald-950/95 dark:text-emerald-100 dark:border-emerald-700';
  }
  if (type === 'error') {
    return 'bg-rose-50/95 text-rose-900 border-rose-300 dark:bg-rose-950/95 dark:text-rose-100 dark:border-rose-700';
  }
  return 'bg-white/95 text-zinc-900 border-zinc-300 dark:bg-zinc-900/95 dark:text-zinc-100 dark:border-zinc-700';
};
</script>
