<template>
  <button
    type="button"
    @click="$emit('select', slotData)"
    class="w-full min-h-[56px] p-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-[#18181c] hover:border-zinc-500 dark:hover:border-zinc-500 text-left flex items-center justify-between gap-2.5 transition-all duration-150 cursor-pointer active:scale-[0.98]"
  >
    <div class="flex items-center gap-2.5 min-w-0">
      <div class="w-9 h-9 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 flex items-center justify-center text-zinc-700 dark:text-zinc-300 shrink-0">
        <Wrench class="w-4 h-4" aria-hidden="true" />
      </div>
      <div class="min-w-0">
        <p class="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
          {{ name }}
        </p>
        <p class="text-xs text-zinc-600 dark:text-zinc-400 truncate">
          {{ sideText }}<span v-if="category"> &bull; {{ category }}</span>
        </p>
      </div>
    </div>

    <span class="px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100 shrink-0">
      {{ quantity }} baut
    </span>
  </button>
</template>

<script setup>
import { computed } from 'vue';
import { Wrench } from 'lucide-vue-next';
import { formatSideLabel } from '../../utils/boltTokens';

const props = defineProps({
  slotData: { type: Object, required: true },
});

defineEmits(['select']);

const name = computed(() => props.slotData.boltPosition?.name || props.slotData.positionName || '-');
const category = computed(() => props.slotData.boltPosition?.category || props.slotData.category || '');
const sideText = computed(() => formatSideLabel(props.slotData.side));
const quantity = computed(() => props.slotData.quantity || 0);
</script>
