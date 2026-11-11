<template>
  <div class="space-y-1.5">
    <label :for="inputId" class="block text-[11px] font-mono uppercase text-zinc-600 dark:text-zinc-400">
      {{ label }}
    </label>

    <!-- Existing positions on THIS motorcycle, one tap to reuse -->
    <div v-if="motorPositions.length" class="flex flex-wrap gap-1.5">
      <button
        v-for="p in motorPositions"
        :key="`chip-${p.id}`"
        type="button"
        @click="selectExisting(p)"
        class="min-h-[32px] px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-colors cursor-pointer"
        :class="String(positionId) === String(p.id)
          ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100'
          : 'bg-white dark:bg-[#18181c] text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700 hover:border-zinc-500'"
      >
        {{ p.name }}
      </button>
    </div>

    <input
      :id="inputId"
      :value="textValue"
      type="text"
      :required="required"
      :list="`${inputId}-suggestions`"
      placeholder="Atau ketik area baru (mis: Cover CVT Kiri)"
      autocomplete="off"
      @input="onTextInput"
      class="w-full min-h-[44px] px-3 py-2 rounded-xl bg-zinc-50 dark:bg-[#18181c] border border-zinc-400 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 dark:placeholder:text-zinc-400"
    />
    <datalist :id="`${inputId}-suggestions`">
      <option v-for="p in motorPositions" :key="`s-${p.id}`" :value="p.name" />
    </datalist>

    <p class="text-[11px] text-zinc-500 dark:text-zinc-500">
      Area baru otomatis jadi milik motor ini saja.
    </p>
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

const selectExisting = (p) => {
  emit('update:positionId', p.id);
  emit('update:customName', '');
  emit('update:customCategory', p.category || '');
  textValue.value = p.name;
};

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
    emit('update:customCategory', match.category || '');
  } else {
    emit('update:positionId', '');
    emit('update:customName', value);
  }
};
</script>
