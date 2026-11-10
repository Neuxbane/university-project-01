<template>
  <Teleport to="body">
    <div
      v-if="open && (isModal || !isDesktop)"
      class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end lg:items-center justify-center lg:p-4 transition-opacity duration-150"
      @click.self="$emit('close')"
    >
      <div
        ref="dialogRef"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        class="bg-white dark:bg-[#121215] w-full lg:max-w-lg max-h-[92dvh] rounded-t-3xl lg:rounded-2xl border border-zinc-300 dark:border-zinc-700 shadow-2xl flex flex-col overflow-hidden transition-transform duration-200 ease-out"
      >
        <!-- Mobile Drag Handle -->
        <div class="lg:hidden flex justify-center pt-2.5 pb-1 shrink-0" aria-hidden="true">
          <div class="w-10 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700"></div>
        </div>

        <!-- Header -->
        <div class="px-4 sm:px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3 shrink-0">
          <div class="min-w-0">
            <p v-if="eyebrow" class="text-[11px] font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400 truncate">
              {{ eyebrow }}
            </p>
            <h2 :id="titleId" class="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 truncate">
              {{ title }}
            </h2>
          </div>
          <button
            ref="closeBtnRef"
            type="button"
            @click="$emit('close')"
            aria-label="Tutup panel detail"
            class="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-xl text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer shrink-0"
          >
            <X class="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <!-- Scrollable Content -->
        <div class="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          <slot />
        </div>

        <!-- Sticky Footer -->
        <div
          v-if="$slots.footer"
          class="p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] border-t border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-[#121215]/95 backdrop-blur-sm shrink-0"
        >
          <slot name="footer" />
        </div>
      </div>
    </div>
  </Teleport>

  <!-- Desktop Persistent Right Panel (inline when !isModal and desktop) -->
  <aside
    v-if="open && !isModal && isDesktop"
    aria-label="Panel detail item"
    class="hidden lg:flex flex-col w-[420px] xl:w-[460px] shrink-0 bg-white dark:bg-[#121215] rounded-2xl border border-zinc-300 dark:border-zinc-800 shadow-lg overflow-hidden sticky top-6 max-h-[calc(100dvh-3rem)]"
  >
    <div class="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3 shrink-0">
      <div class="min-w-0">
        <p v-if="eyebrow" class="text-[11px] font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400 truncate">
          {{ eyebrow }}
        </p>
        <h2 class="text-base font-bold text-zinc-900 dark:text-zinc-100 truncate">
          {{ title }}
        </h2>
      </div>
      <button
        type="button"
        @click="$emit('close')"
        aria-label="Tutup panel detail"
        class="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-xl text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer shrink-0"
      >
        <X class="w-5 h-5" aria-hidden="true" />
      </button>
    </div>

    <div class="flex-1 overflow-y-auto p-5 space-y-4">
      <slot />
    </div>

    <div
      v-if="$slots.footer"
      class="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#0e0e11] shrink-0"
    >
      <slot name="footer" />
    </div>
  </aside>
</template>

<script setup>
import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { X } from 'lucide-vue-next';

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, required: true },
  eyebrow: { type: String, default: '' },
  isModal: { type: Boolean, default: false },
});

const emit = defineEmits(['close']);

const titleId = `sheet-title-${Math.random().toString(36).slice(2, 8)}`;
const isDesktop = ref(typeof window !== 'undefined' ? window.innerWidth >= 1024 : true);
const closeBtnRef = ref(null);
const dialogRef = ref(null);
let previouslyFocused = null;

const updateViewport = () => {
  isDesktop.value = window.innerWidth >= 1024;
};

watch(
  () => props.open && (props.isModal || !isDesktop.value),
  async (activeOverlay) => {
    if (typeof document !== 'undefined') {
      document.body.style.overflow = activeOverlay ? 'hidden' : '';
    }
    if (activeOverlay) {
      previouslyFocused = document.activeElement;
      await nextTick();
      closeBtnRef.value?.focus();
    } else if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
      previouslyFocused.focus();
      previouslyFocused = null;
    }
  }
);

const onKeyDown = (e) => {
  if (!props.open) return;
  if (e.key === 'Escape') {
    emit('close');
    return;
  }
  // Focus trap inside modal/bottom-sheet
  if (e.key === 'Tab' && (props.isModal || !isDesktop.value) && dialogRef.value) {
    const focusables = dialogRef.value.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
};

onMounted(() => {
  updateViewport();
  window.addEventListener('resize', updateViewport);
  window.addEventListener('keydown', onKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('resize', updateViewport);
  window.removeEventListener('keydown', onKeyDown);
  if (typeof document !== 'undefined') {
    document.body.style.overflow = '';
  }
});
</script>
