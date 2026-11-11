<template>
  <div ref="rootRef" class="relative space-y-1">
    <div v-if="label || showManageLink" class="flex items-center justify-between gap-2">
      <label
        :for="inputId"
        class="block text-[11px] font-mono uppercase text-zinc-600 dark:text-zinc-400"
      >
        {{ label }}
      </label>
      <router-link
        v-if="showManageLink && auth.isAdmin"
        to="/bolt-specs?tab=positions"
        class="text-[11px] font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white underline underline-offset-2 shrink-0"
      >
        Kelola Master Posisi
      </router-link>
    </div>

    <!-- Single-line Searchable Combobox Input (zero multi-row chip wall) -->
    <div class="relative flex items-center">
      <input
        :id="inputId"
        :value="textValue"
        type="text"
        :required="required"
        :placeholder="placeholder"
        autocomplete="off"
        role="combobox"
        :aria-expanded="isOpen"
        aria-autocomplete="list"
        @focus="openDropdown"
        @input="onTextInput"
        @keydown.escape="isOpen = false"
        class="w-full min-h-[44px] pl-3 pr-16 py-2 rounded-xl bg-zinc-50 dark:bg-[#18181c] border border-zinc-400 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 dark:placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
      />

      <div class="absolute right-1.5 flex items-center gap-0.5">
        <button
          v-if="textValue"
          type="button"
          @click="clearSelection"
          aria-label="Hapus pilihan area"
          class="w-8 h-8 rounded-lg inline-flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/70 dark:hover:bg-zinc-800 cursor-pointer"
        >
          <X class="w-3.5 h-3.5" aria-hidden="true" />
        </button>
        <button
          type="button"
          @click="toggleDropdown"
          :aria-label="isOpen ? 'Tutup daftar area' : 'Buka daftar area'"
          class="w-8 h-8 rounded-lg inline-flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 cursor-pointer"
        >
          <ChevronDown
            class="w-4 h-4 transition-transform duration-150"
            :class="isOpen ? 'rotate-180' : ''"
            aria-hidden="true"
          />
        </button>
      </div>
    </div>

    <!-- Floating Dropdown Popover -->
    <div
      v-if="isOpen"
      class="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl bg-white dark:bg-[#121215] border border-zinc-300 dark:border-zinc-700 shadow-xl max-h-60 overflow-y-auto p-1.5 space-y-1"
    >
      <template v-if="filteredMotorPositions.length > 0">
        <p class="px-2 pt-1 pb-0.5 text-[10px] font-mono uppercase tracking-wider text-zinc-500">
          Area pada Motor Ini
        </p>
        <button
          v-for="p in filteredMotorPositions"
          :key="`opt-${p.id}`"
          type="button"
          @click="selectExisting(p)"
          class="w-full min-h-[40px] px-2.5 py-1.5 rounded-lg text-left text-xs font-semibold flex items-center justify-between gap-2 cursor-pointer transition-colors"
          :class="String(positionId) === String(p.id)
            ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
            : 'text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'"
        >
          <span class="truncate">{{ p.name }}</span>
          <span v-if="p.category" class="text-[10px] font-mono opacity-75 shrink-0">{{ p.category }}</span>
        </button>
      </template>

      <button
        v-if="canCreateCustomFromQuery"
        type="button"
        @click="chooseCustomName"
        class="w-full min-h-[40px] px-2.5 py-1.5 rounded-lg text-left text-xs font-semibold flex items-center gap-2 bg-amber-50 hover:bg-amber-100 dark:bg-amber-500/15 dark:hover:bg-amber-500/25 text-amber-900 dark:text-amber-200 cursor-pointer"
      >
        <Plus class="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span class="truncate">Buat area baru: "{{ textValue.trim() }}"</span>
      </button>

      <p
        v-if="filteredMotorPositions.length === 0 && !canCreateCustomFromQuery"
        class="px-2.5 py-2 text-xs text-zinc-500 text-center"
      >
        Ketik nama area motor (misal: Cover CVT Kiri).
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { ChevronDown, Plus, X } from 'lucide-vue-next';
import { useAuthStore } from '../../stores/auth';

const auth = useAuthStore();

const props = defineProps({
  inputId: { type: String, default: 'area-label-input' },
  label: { type: String, default: 'Area / Posisi Motor' },
  placeholder: { type: String, default: 'Pilih atau ketik area motor (mis: Cover CVT Kiri)' },
  positionId: { type: [String, Number], default: '' },
  customName: { type: String, default: '' },
  customCategory: { type: String, default: '' },
  motorPositions: { type: Array, default: () => [] },
  allPositions: { type: Array, default: () => [] },
  required: { type: Boolean, default: false },
  showManageLink: { type: Boolean, default: false },
});

const emit = defineEmits([
  'update:positionId',
  'update:customName',
  'update:customCategory',
]);

const rootRef = ref(null);
const textValue = ref('');
const isOpen = ref(false);
const isFilteringByInput = ref(false);

const selectedPosition = computed(() =>
  (props.motorPositions || []).find((p) => String(p.id) === String(props.positionId))
  || (props.allPositions || []).find((p) => String(p.id) === String(props.positionId))
);

const syncText = () => {
  if (selectedPosition.value) {
    textValue.value = selectedPosition.value.name;
  } else {
    textValue.value = props.customName || '';
  }
};

watch(
  () => [props.positionId, props.customName, props.motorPositions],
  syncText,
  { immediate: true, deep: true }
);

const filteredMotorPositions = computed(() => {
  const list = props.motorPositions || [];
  if (!isFilteringByInput.value) return list;
  const q = textValue.value.trim().toLowerCase();
  if (!q) return list;
  return list.filter((p) =>
    p.name?.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q)
  );
});

const canCreateCustomFromQuery = computed(() => {
  const trimmed = textValue.value.trim();
  if (!trimmed) return false;
  return !(props.motorPositions || []).some(
    (p) => p.name.toLowerCase() === trimmed.toLowerCase()
  );
});

const openDropdown = () => {
  isFilteringByInput.value = false;
  isOpen.value = true;
};

const toggleDropdown = () => {
  isFilteringByInput.value = false;
  isOpen.value = !isOpen.value;
};

const selectExisting = (p) => {
  emit('update:positionId', p.id);
  emit('update:customName', '');
  emit('update:customCategory', p.category || '');
  textValue.value = p.name;
  isFilteringByInput.value = false;
  isOpen.value = false;
};

const chooseCustomName = () => {
  const trimmed = textValue.value.trim();
  emit('update:positionId', '');
  emit('update:customName', trimmed);
  isFilteringByInput.value = false;
  isOpen.value = false;
};

const clearSelection = () => {
  textValue.value = '';
  emit('update:positionId', '');
  emit('update:customName', '');
  emit('update:customCategory', '');
  isFilteringByInput.value = false;
  isOpen.value = true;
};

const onTextInput = (e) => {
  const value = e.target.value;
  textValue.value = value;
  isFilteringByInput.value = true;
  isOpen.value = true;

  const trimmed = value.trim();
  const match = (props.motorPositions || []).find(
    (p) => p.name.toLowerCase() === trimmed.toLowerCase()
  );

  if (match) {
    emit('update:positionId', match.id);
    emit('update:customName', '');
    emit('update:customCategory', match.category || '');
  } else {
    emit('update:positionId', '');
    emit('update:customName', value);
  }
};

const onClickOutside = (e) => {
  if (rootRef.value && !rootRef.value.contains(e.target)) {
    isOpen.value = false;
  }
};

onMounted(() => document.addEventListener('mousedown', onClickOutside));
onUnmounted(() => document.removeEventListener('mousedown', onClickOutside));
</script>
