<template>
  <button
    type="button"
    @click="$emit('select', pkg)"
    :aria-pressed="active"
    class="w-full min-h-[56px] p-3.5 rounded-xl border text-left transition-all duration-150 cursor-pointer active:scale-[0.98] flex items-center justify-between gap-3"
    :class="active
      ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100 shadow-sm'
      : 'bg-white dark:bg-[#18181c] text-zinc-900 dark:text-zinc-100 border-zinc-300 dark:border-zinc-700 hover:border-zinc-500'"
  >
    <div class="flex items-center gap-3 min-w-0">
      <div
        class="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border"
        :class="active
          ? 'bg-white/15 border-white/20 text-white dark:bg-zinc-900/10 dark:border-zinc-900/20 dark:text-zinc-900'
          : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300'"
      >
        <Layers class="w-4 h-4" aria-hidden="true" />
      </div>
      <div class="min-w-0">
        <p class="text-sm font-bold truncate">{{ title }}</p>
        <p
          class="text-xs font-mono truncate"
          :class="active ? 'text-zinc-200 dark:text-zinc-700' : 'text-zinc-600 dark:text-zinc-400'"
        >
          {{ subtitle }}
        </p>
      </div>
    </div>

    <div class="flex items-center gap-2 shrink-0">
      <span
        v-if="badgeText"
        class="px-2 py-0.5 rounded-md text-xs font-mono font-bold"
        :class="active
          ? 'bg-white/20 text-white dark:bg-zinc-900/15 dark:text-zinc-900'
          : 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200'"
      >
        {{ badgeText }}
      </span>
      <Check v-if="active" class="w-4 h-4 shrink-0" aria-hidden="true" />
    </div>
  </button>
</template>

<script setup>
import { computed } from 'vue';
import { Layers, Check } from 'lucide-vue-next';
import { formatPackageType } from '../../utils/boltTokens';

const props = defineProps({
  pkg: { type: Object, default: null }, // null = full bike preset
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  badgeText: { type: String, default: '' },
  active: { type: Boolean, default: false },
});

defineEmits(['select']);

const title = computed(() => props.title || props.pkg?.name || 'Lengkap Satu Motor');
const subtitle = computed(() => {
  if (props.subtitle) return props.subtitle;
  if (!props.pkg) return 'Semua titik pasang motor';
  return formatPackageType(props.pkg.packageType);
});
const badgeText = computed(() => {
  if (props.badgeText) return props.badgeText;
  if (!props.pkg) return '';
  return `${props.pkg.items?.length || 0} jenis`;
});
</script>
