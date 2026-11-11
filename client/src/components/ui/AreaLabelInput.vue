<template>
  <div class="space-y-1.5">
    <div class="flex items-center justify-between gap-2">
      <label
        :for="inputId"
        class="block text-[11px] font-mono uppercase text-zinc-600 dark:text-zinc-400"
      >
        {{ label }}
      </label>
      <button
        type="button"
        @click="toggleCustomMode"
        class="text-[11px] font-semibold text-zinc-800 dark:text-zinc-200 underline underline-offset-2 hover:text-zinc-950 dark:hover:text-white cursor-pointer"
      >
        {{ isCustom ? 'Pilih dari daftar' : '+ Label Baru' }}
      </button>
    </div>

    <select
      v-if="!isCustom"
      :id="inputId"
      :value="positionId"
      :required="required && !isCustom"
      @change="onSelectChange"
      class="w-full min-h-[44px] px-3 py-2 rounded-xl bg-zinc-50 dark:bg-[#18181c] border border-zinc-400 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100"
    >
      <option value="">-- Pilih atau Ketik Label Baru --</option>
      <optgroup v-if="motorPositions.length" label="Area pada Motor Ini">
        <option v-for="p in motorPositions" :key="`m-${p.id}`" :value="p.id">
          {{ p.name }} ({{ p.category }})
        </option>
      </optgroup>
      <optgroup v-if="remainingPositions.length" label="Daftar Area Tersimpan">
        <option v-for="p in remainingPositions" :key="`o-${p.id}`" :value="p.id">
          {{ p.name }} ({{ p.category }})
        </option>
      </optgroup>
      <option value="__custom__">+ Buat Label Area Baru Sendiri...</option>
    </select>

    <div v-else class="grid grid-cols-1 sm:grid-cols-12 gap-2">
      <div class="sm:col-span-7">
        <input
          :id="inputId"
          :value="customName"
          type="text"
          :required="required && isCustom"
          placeholder="Ketik nama area motor (mis: Cover Aki Kanan)"
          @input="$emit('update:customName', $event.target.value)"
          class="w-full min-h-[44px] px-3 py-2 rounded-xl bg-zinc-50 dark:bg-[#18181c] border border-zinc-400 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100"
        />
      </div>
      <div class="sm:col-span-5">
        <input
          :value="customCategory"
          type="text"
          :list="`${inputId}-cats`"
          placeholder="Kategori (opsional)"
          @input="$emit('update:customCategory', $event.target.value)"
          class="w-full min-h-[44px] px-3 py-2 rounded-xl bg-zinc-50 dark:bg-[#18181c] border border-zinc-400 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100"
        />
        <datalist :id="`${inputId}-cats`">
          <option v-for="c in categorySuggestions" :key="c" :value="c" />
        </datalist>
      </div>
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

const isCustom = ref(Boolean(props.customName && !props.positionId));

watch(
  () => [props.positionId, props.customName],
  ([pid, cname]) => {
    if (cname && !pid) isCustom.value = true;
    else if (pid && pid !== '__custom__') isCustom.value = false;
  }
);

const remainingPositions = computed(() => {
  const motorIds = new Set((props.motorPositions || []).map((p) => p.id));
  return (props.allPositions || []).filter((p) => !motorIds.has(p.id));
});

const categorySuggestions = computed(() => {
  const set = new Set();
  for (const p of props.allPositions || []) {
    if (p.category) set.add(p.category);
  }
  return Array.from(set).sort();
});

const toggleCustomMode = () => {
  if (isCustom.value) {
    isCustom.value = false;
    emit('update:customName', '');
    emit('update:customCategory', '');
  } else {
    isCustom.value = true;
    emit('update:positionId', '');
  }
};

const onSelectChange = (e) => {
  const val = e.target.value;
  if (val === '__custom__') {
    isCustom.value = true;
    emit('update:positionId', '');
    return;
  }
  emit('update:positionId', val ? Number(val) || val : '');
  emit('update:customName', '');
  emit('update:customCategory', '');
};
</script>
