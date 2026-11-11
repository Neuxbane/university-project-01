<template>
  <div ref="rootRef" class="relative space-y-1">
    <label
      v-if="label"
      :for="inputId"
      class="block text-[11px] font-mono uppercase text-zinc-600 dark:text-zinc-400"
    >
      {{ label }}
    </label>

    <!-- Visual Trigger Button (shows selected bolt image + M size + code) -->
    <div class="relative flex items-center">
      <button
        :id="inputId"
        type="button"
        @click="isOpen = !isOpen"
        class="w-full min-h-[44px] px-2.5 py-1.5 rounded-xl bg-zinc-50 dark:bg-[#18181c] border border-zinc-400 dark:border-zinc-700 text-left flex items-center justify-between gap-2 cursor-pointer hover:border-zinc-600 dark:hover:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
      >
        <div v-if="selectedSpec" class="flex items-center gap-2 min-w-0 flex-1">
          <div class="w-7 h-7 rounded-lg bg-zinc-950 border border-zinc-300 dark:border-zinc-700 overflow-hidden shrink-0 flex items-center justify-center">
            <img
              v-if="selectedSpec.images?.length"
              :src="selectedSpec.images[0].url"
              :alt="selectedSpec.code"
              class="w-full h-full object-cover"
            />
            <Nut v-else class="w-4 h-4 text-zinc-300" aria-hidden="true" />
          </div>
          <div class="min-w-0 flex-1">
            <span class="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100">
              M{{ Number(selectedSpec.diameterMm) }}&times;{{ Number(selectedSpec.lengthMm) }}
            </span>
            <span class="text-[11px] font-mono text-zinc-500 ml-1.5 truncate">
              {{ selectedSpec.code }}
            </span>
          </div>
        </div>
        <span v-else class="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 truncate">
          {{ placeholder }}
        </span>

        <div class="flex items-center gap-0.5 shrink-0">
          <span
            v-if="selectedSpec && allowClear"
            role="button"
            tabindex="0"
            @click.stop="clearSelection"
            @keydown.enter.stop="clearSelection"
            aria-label="Hapus pilihan baut"
            class="w-7 h-7 rounded-lg inline-flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/70 dark:hover:bg-zinc-800"
          >
            <X class="w-3.5 h-3.5" aria-hidden="true" />
          </span>
          <ChevronDown
            class="w-4 h-4 text-zinc-500 transition-transform duration-150"
            :class="isOpen ? 'rotate-180' : ''"
            aria-hidden="true"
          />
        </div>
      </button>
    </div>

    <!-- Searchable Visual Dropdown Popover -->
    <div
      v-if="isOpen"
      class="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl bg-white dark:bg-[#121215] border border-zinc-300 dark:border-zinc-700 shadow-2xl p-2 space-y-2 min-w-[260px]"
    >
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Cari kode atau ukuran (mis: M6, 25, BTN)..."
        class="w-full min-h-[38px] px-2.5 py-1.5 rounded-lg bg-zinc-50 dark:bg-[#18181c] border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
      />

      <!-- Dynamic Diameter Filter Chips -->
      <div v-if="diameterChips.length > 2" class="flex flex-wrap gap-1">
        <button
          v-for="chip in diameterChips"
          :key="chip.value"
          type="button"
          @click="selectedDiameter = chip.value"
          class="px-2 py-1 rounded-md text-[10px] font-mono font-bold cursor-pointer transition-colors"
          :class="selectedDiameter === chip.value
            ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
            : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'"
        >
          {{ chip.label }}
        </button>
      </div>

      <div class="max-h-56 overflow-y-auto space-y-1">
        <button
          v-for="spec in filteredSpecs"
          :key="spec.id"
          type="button"
          @click="selectSpec(spec)"
          class="w-full min-h-[44px] px-2 py-1.5 rounded-lg text-left flex items-center gap-2.5 cursor-pointer transition-colors"
          :class="String(modelValue) === String(spec.id)
            ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
            : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100'"
        >
          <div class="w-8 h-8 rounded-lg bg-zinc-950 border border-zinc-300 dark:border-zinc-700 overflow-hidden shrink-0 flex items-center justify-center">
            <img
              v-if="spec.images?.length"
              :src="spec.images[0].url"
              :alt="spec.code"
              class="w-full h-full object-cover"
            />
            <Nut v-else class="w-4 h-4 text-zinc-300" aria-hidden="true" />
          </div>
          <div class="min-w-0 flex-1">
            <p class="font-mono text-xs font-bold leading-tight">
              M{{ Number(spec.diameterMm) }}&times;{{ Number(spec.lengthMm) }}
              <span class="font-normal opacity-75 ml-1">{{ spec.headType }}</span>
            </p>
            <p class="font-mono text-[10px] opacity-75 truncate">{{ spec.code }}</p>
          </div>
        </button>

        <p v-if="filteredSpecs.length === 0" class="py-3 text-center text-xs text-zinc-500">
          Ukuran baut tidak ditemukan.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { ChevronDown, Nut, X } from 'lucide-vue-next';

const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  specs: { type: Array, default: () => [] },
  inputId: { type: String, default: 'bolt-spec-picker' },
  label: { type: String, default: '' },
  placeholder: { type: String, default: '-- Pilih Baut (Foto & Ukuran) --' },
  allowClear: { type: Boolean, default: true },
});

const emit = defineEmits(['update:modelValue']);

const rootRef = ref(null);
const isOpen = ref(false);
const searchQuery = ref('');
const selectedDiameter = ref('all');

const selectedSpec = computed(() =>
  (props.specs || []).find((s) => String(s.id) === String(props.modelValue)) || null
);

const diameterChips = computed(() => {
  const set = new Set();
  for (const s of props.specs || []) {
    const d = Number(s.diameterMm);
    if (d > 0) set.add(d);
  }
  const sorted = Array.from(set).sort((a, b) => a - b);
  return [
    { value: 'all', label: 'Semua' },
    ...sorted.map((d) => ({ value: `M${d}`, label: `M${d}` })),
  ];
});

const filteredSpecs = computed(() => {
  let list = props.specs || [];
  if (selectedDiameter.value !== 'all') {
    list = list.filter((s) => `M${Number(s.diameterMm)}` === selectedDiameter.value);
  }
  const q = searchQuery.value.trim().toLowerCase();
  if (q) {
    list = list.filter((s) =>
      s.code?.toLowerCase().includes(q)
      || s.headType?.toLowerCase().includes(q)
      || `m${Number(s.diameterMm)}x${Number(s.lengthMm)}`.includes(q)
      || `m${Number(s.diameterMm)}×${Number(s.lengthMm)}`.includes(q)
    );
  }
  return list;
});

const selectSpec = (spec) => {
  emit('update:modelValue', spec.id);
  isOpen.value = false;
};

const clearSelection = () => {
  emit('update:modelValue', '');
};

const onClickOutside = (e) => {
  if (rootRef.value && !rootRef.value.contains(e.target)) {
    isOpen.value = false;
  }
};

onMounted(() => document.addEventListener('mousedown', onClickOutside));
onUnmounted(() => document.removeEventListener('mousedown', onClickOutside));
</script>
