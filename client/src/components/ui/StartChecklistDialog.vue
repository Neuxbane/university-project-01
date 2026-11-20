<template>
  <div
    v-if="open"
    class="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 sm:p-4"
    @click.self="$emit('cancel')"
  >
    <form
      role="dialog"
      aria-modal="true"
      aria-labelledby="start-checklist-title"
      aria-describedby="start-checklist-desc"
      @submit.prevent="$emit('confirm', buyerName.trim())"
      class="bg-white dark:bg-[#121215] rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-zinc-300 dark:border-zinc-700 space-y-4"
    >
      <div class="flex items-start gap-3">
        <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-emerald-50 text-emerald-700 border border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30">
          <ClipboardList class="w-5 h-5" aria-hidden="true" />
        </div>
        <div class="min-w-0 flex-1">
          <h2 id="start-checklist-title" class="text-base font-bold text-zinc-900 dark:text-zinc-100">Buat Riwayat Checklist</h2>
          <p id="start-checklist-desc" class="text-sm text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed">
            Slot baru akan dibuat di menu <strong>Riwayat</strong>. Centang barang satu per satu; kalau baru sebagian, sisanya tersimpan dan bisa dilanjutkan nanti.
          </p>
        </div>
      </div>

      <div class="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#18181c] space-y-1">
        <span
          class="inline-block text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border"
          :class="kind === 'bundling'
            ? 'bg-violet-50 text-violet-800 border-violet-300 dark:bg-violet-500/15 dark:text-violet-300 dark:border-violet-500/30'
            : 'bg-sky-50 text-sky-800 border-sky-300 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/30'"
        >
          {{ kind === 'bundling' ? 'BUNDLING' : 'PAKET FULL BIKE' }}
        </span>
        <p class="text-sm font-bold text-zinc-900 dark:text-zinc-100">{{ name }}</p>
        <p v-if="summary" class="text-xs font-mono text-zinc-600 dark:text-zinc-400">{{ summary }}</p>
      </div>

      <div>
        <label for="start-checklist-buyer" class="block text-[11px] font-mono uppercase text-zinc-600 dark:text-zinc-400 mb-1">Nama pembeli / no. nota (opsional)</label>
        <input
          id="start-checklist-buyer"
          ref="inputRef"
          v-model="buyerName"
          type="text"
          placeholder="Misal: Andi / INV-0231"
          class="w-full min-h-[44px] px-3 py-2 rounded-xl bg-zinc-50 dark:bg-[#18181c] border border-zinc-400 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100"
        />
      </div>

      <div class="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
        <button
          type="button"
          @click="$emit('cancel')"
          class="min-h-[44px] px-4 py-2.5 rounded-xl text-sm font-medium text-zinc-700 hover:text-zinc-950 bg-zinc-100 hover:bg-zinc-200 dark:text-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 cursor-pointer"
        >
          Batal
        </button>
        <button
          type="submit"
          :disabled="loading"
          class="min-h-[44px] px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 cursor-pointer disabled:opacity-50"
        >
          {{ loading ? 'Membuat...' : 'Buat Riwayat & Mulai Checklist' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { ClipboardList } from 'lucide-vue-next';

/** Popup shown by "Mulai Checklist" (Paket Full Bike and Bundling): creates the Riwayat slot, then the page opens it. */
const props = defineProps({
  open: { type: Boolean, default: false },
  kind: { type: String, default: 'paket' }, // 'paket' | 'bundling'
  name: { type: String, default: '' },
  summary: { type: String, default: '' },
  loading: { type: Boolean, default: false },
});
const emit = defineEmits(['confirm', 'cancel']);

const buyerName = ref('');
const inputRef = ref(null);

watch(
  () => props.open,
  async (val) => {
    if (!val) return;
    buyerName.value = '';
    await nextTick();
    inputRef.value?.focus();
  }
);

const onKeyDown = (e) => {
  if (props.open && e.key === 'Escape') emit('cancel');
};
onMounted(() => window.addEventListener('keydown', onKeyDown));
onUnmounted(() => window.removeEventListener('keydown', onKeyDown));
</script>
