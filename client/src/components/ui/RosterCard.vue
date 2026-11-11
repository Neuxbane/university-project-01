<template>
  <button
    type="button"
    @click="$emit('select', motorcycle)"
    :aria-pressed="selected"
    class="group relative w-full text-left bg-white dark:bg-[#121215] rounded-2xl border overflow-hidden transition-all duration-150 ease-out cursor-pointer hover:-translate-y-0.5 active:scale-[0.98] flex flex-col"
    :class="selected
      ? 'border-zinc-900 dark:border-zinc-100 ring-2 ring-zinc-900 dark:ring-zinc-100 shadow-lg dark:shadow-glow-subtle'
      : 'border-zinc-300 dark:border-zinc-800 hover:border-zinc-500 dark:hover:border-zinc-600 shadow-sm'"
  >
    <!-- Top Brand Rarity Band -->
    <div class="h-1.5 w-full shrink-0" :class="brandAccent.band" aria-hidden="true"></div>

    <!-- Visual Art / Photo Area (~80% card height) -->
    <div class="relative aspect-square w-full overflow-hidden bg-zinc-900">
      <img
        v-if="primaryImage"
        :src="primaryImage"
        :alt="motorcycle.displayName"
        loading="lazy"
        class="w-full h-full object-cover transition-transform duration-200 ease-out group-hover:scale-[1.03]"
      />
      <div
        v-else
        class="w-full h-full bg-gradient-to-br flex flex-col items-center justify-center p-3 text-center"
        :class="brandAccent.monogramBg"
      >
        <span class="font-mono font-black text-2xl sm:text-3xl tracking-tight text-white/90 select-none">
          {{ initials }}
        </span>
        <span class="text-[11px] font-mono uppercase tracking-widest text-zinc-300 mt-1">
          {{ motorcycle.brand }}
        </span>
      </div>

      <!-- Subtle bottom gradient for badge legibility -->
      <div class="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/75 via-black/30 to-transparent pointer-events-none" aria-hidden="true"></div>

      <!-- Top-left Brand Pill -->
      <span
        class="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider border backdrop-blur-sm"
        :class="brandAccent.pill"
      >
        {{ motorcycle.brand }}
      </span>

      <!-- Top-right Completeness Pill -->
      <span
        class="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-zinc-950/90 border border-white/15 text-white text-[10px] font-medium inline-flex items-center gap-1 backdrop-blur-sm"
      >
        <span class="w-1.5 h-1.5 rounded-full shrink-0" :class="completeness.dot" aria-hidden="true"></span>
        <span>{{ completeness.label }}</span>
      </span>

      <!-- Bottom-right Bolt Points Badge -->
      <span
        class="absolute bottom-2 right-2 px-2.5 py-1 rounded-lg bg-zinc-950/90 text-white border border-white/20 text-xs font-mono font-bold shadow-sm backdrop-blur-sm"
      >
        {{ reqCount }} titik
      </span>
    </div>

    <!-- ~20% Compact Card Label -->
    <div class="px-3 py-2 w-full bg-white dark:bg-[#121215] border-t border-zinc-200/80 dark:border-zinc-800">
      <h3 class="text-sm font-bold text-zinc-900 dark:text-zinc-100 leading-tight truncate">
        {{ motorcycle.model }} {{ motorcycle.variant }}
      </h3>
      <p class="font-mono text-[11px] text-zinc-600 dark:text-zinc-400 truncate mt-0.5 leading-tight">
        {{ yearRange }}
      </p>
    </div>
  </button>
</template>

<script setup>
import { computed } from 'vue';
import { getBrandAccent, getCompletenessMeta } from '../../utils/boltTokens';

const props = defineProps({
  motorcycle: { type: Object, required: true },
  selected: { type: Boolean, default: false },
});

defineEmits(['select']);

const primaryImage = computed(() => props.motorcycle.images?.[0]?.url || null);
const reqCount = computed(() => props.motorcycle._count?.requirements ?? props.motorcycle.requirements?.length ?? 0);
const brandAccent = computed(() => getBrandAccent(props.motorcycle.brand));
const completeness = computed(() => getCompletenessMeta(reqCount.value));

const initials = computed(() => {
  const words = `${props.motorcycle.model || ''}`.trim().split(/\s+/);
  return words.slice(0, 2).map((w) => w[0] || '').join('').toUpperCase() || 'HX';
});

const yearRange = computed(() => {
  if (!props.motorcycle.yearStart) return '-';
  return props.motorcycle.yearEnd
    ? `${props.motorcycle.yearStart}–${props.motorcycle.yearEnd}`
    : `${props.motorcycle.yearStart}`;
});
</script>
