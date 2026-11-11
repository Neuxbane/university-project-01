<template>
  <div class="space-y-1.5">
    <div class="flex items-center justify-between gap-2">
      <label :for="inputId" class="block text-[11px] font-mono uppercase text-zinc-600 dark:text-zinc-400">
        {{ label }}
      </label>
      <router-link
        to="/bolt-specs?tab=positions"
        class="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 underline underline-offset-2 hover:text-zinc-950 dark:hover:text-white"
      >
        Kelola Master Posisi
      </router-link>
    </div>

    <!-- Free-text area name. Suggestions come only from this motorcycle. -->
    <input
      :id="inputId"
      :value="textValue"
      type="text"
      :required="required"
      :list="`${inputId}-suggestions`"
      placeholder="Ketik nama area bebas (mis: Cover CVT Kiri)"
      autocomplete="off"
      @input="onTextInput"
      class="w-full min-h-[44px] px-3 py-2 rounded-xl bg-zinc-50 dark:bg-[#18181c] border border-zinc-400 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 dark:placeholder:text-zinc-400"
    />
    <datalist :id="`${inputId}-suggestions`">
      <option v-for="p in motorPositions" :key="`s-${p.id}`" :value="p.name">
        {{ p.category }}
      </option>
    </datalist>

    <div class="grid grid-cols-1 sm:grid-cols-12 gap-2">
      <div class="sm:col-span-7">
        <input
          :value="customCategory"
          type="text"
          :list="`${inputId}-cats`"
          placeholder="Kategori (opsional, mis: Mesin)"
          @input="$emit('update:customCategory', $event.target.value)"
          class="w-full min-h-[44px] px-3 py-2 rounded-xl bg-zinc-50 dark:bg-[#18181c] border border-zinc-400 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 dark:placeholder:text-zinc-400"
        />
        <datalist :id="`${inputId}-cats`">
          <option v-for="c in categorySuggestions" :key="c" :value="c" />
        </datalist>
      </div>
      <p class="sm:col-span-5 text-[11px] text-zinc-500 dark:text-zinc-500 self-center">
        Saran hanya dari area motor ini. Nama baru otomatis jadi milik motor ini.
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';

const props = defineProps({
  inputId: { type: String, default: 'area-label-input' },
  label: { type: String, default: 'Area / Posisi Motor' },
  positionId: { type: [String, Number], default: '' },
  customName: { type: String, default: '' },
  customCategory: { type: String, default: '' },
  motorPositions: { type: Array, default: () => [] },
  allPositions: { type: Array, default: () => [] },
  required: { type: Boolean, default: false },
});

const emit = defineEmits([
  'update:positionId',
  'update:customName',
  'update:customCategory',
]);

const textValue = ref('');

const selectedPosition = computed(() =>
  (props.motorPositions || []).find((p) => String(p.id) === String(props.positionId))
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

const onTextInput = (e) => {
  const value = e.target.value;
  textValue.value = value;
  const trimmed = value.trim();
  const match = (props.motorPositions || []).find(
    (p) => p.name.toLowerCase() === trimmed.toLowerCase()
  );

  if (match) {
    emit('update:positionId', match.id);
    emit('update:customName', '');
  } else {
    emit('update:positionId', '');
    emit('update:customName', value);
  }
};

const categorySuggestions = computed(() => {
  const set = new Set();
  for (const p of props.motorPositions || []) {
    if (p.category) set.add(p.category);
  }
  return Array.from(set).sort();
});
</script>
