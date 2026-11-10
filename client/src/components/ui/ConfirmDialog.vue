<template>
  <div
    v-if="open"
    class="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 sm:p-4"
    @click.self="$emit('cancel')"
  >
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-desc"
      class="bg-white dark:bg-[#121215] rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-zinc-300 dark:border-zinc-700 space-y-4 transition-all duration-200"
    >
      <div class="flex items-start gap-3">
        <div
          class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          :class="danger
            ? 'bg-rose-50 text-rose-700 border border-rose-300 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30'
            : 'bg-amber-50 text-amber-800 border border-amber-300 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30'"
        >
          <AlertTriangle class="w-5 h-5" aria-hidden="true" />
        </div>
        <div class="min-w-0 flex-1">
          <h2 id="confirm-dialog-title" class="text-base font-bold text-zinc-900 dark:text-zinc-100">
            {{ title }}
          </h2>
          <p id="confirm-dialog-desc" class="text-sm text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed">
            {{ message }}
          </p>
          <slot />
        </div>
      </div>

      <div class="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
        <button
          ref="cancelBtnRef"
          type="button"
          @click="$emit('cancel')"
          class="min-h-[44px] px-4 py-2.5 rounded-xl text-sm font-medium text-zinc-700 hover:text-zinc-950 bg-zinc-100 hover:bg-zinc-200 dark:text-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 cursor-pointer"
        >
          {{ cancelText }}
        </button>
        <button
          type="button"
          :disabled="loading"
          @click="$emit('confirm')"
          class="min-h-[44px] px-5 py-2.5 rounded-xl text-sm font-semibold text-white cursor-pointer disabled:opacity-50"
          :class="danger
            ? 'bg-rose-600 hover:bg-rose-700'
            : 'bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900'"
        >
          {{ loading ? 'Memproses...' : confirmText }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { AlertTriangle } from 'lucide-vue-next';

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, required: true },
  message: { type: String, default: '' },
  confirmText: { type: String, default: 'Ya, Lanjutkan' },
  cancelText: { type: String, default: 'Batal' },
  danger: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
});

const emit = defineEmits(['confirm', 'cancel']);
const cancelBtnRef = ref(null);

watch(
  () => props.open,
  async (val) => {
    if (val) {
      await nextTick();
      cancelBtnRef.value?.focus();
    }
  }
);

const onKeyDown = (e) => {
  if (props.open && e.key === 'Escape') {
    emit('cancel');
  }
};

onMounted(() => window.addEventListener('keydown', onKeyDown));
onUnmounted(() => window.removeEventListener('keydown', onKeyDown));
</script>
