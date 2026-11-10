<template>
  <div class="relative w-full">
    <label :for="inputId" class="sr-only">{{ ariaLabel || placeholder }}</label>
    <Search
      class="w-4 h-4 text-zinc-500 dark:text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
      aria-hidden="true"
    />
    <input
      :id="inputId"
      :value="localValue"
      @input="onInput"
      type="search"
      :placeholder="placeholder"
      autocomplete="off"
      class="w-full min-h-[44px] pl-10 pr-11 py-2.5 bg-white dark:bg-[#18181c] border border-zinc-500 rounded-xl text-base sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 dark:placeholder:text-zinc-400 transition-colors"
    />
    <button
      v-if="localValue"
      type="button"
      @click="clearInput"
      aria-label="Hapus pencarian"
      class="absolute right-0.5 top-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-xl text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white cursor-pointer"
    >
      <X class="w-4 h-4" aria-hidden="true" />
    </button>
  </div>
</template>

<script setup>
import { ref, watch, onUnmounted } from 'vue';
import { Search, X } from 'lucide-vue-next';

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: 'Cari...' },
  ariaLabel: { type: String, default: '' },
  debounceMs: { type: Number, default: 150 },
  inputId: { type: String, default: () => `search-${Math.random().toString(36).slice(2, 8)}` },
});

const emit = defineEmits(['update:modelValue']);
const localValue = ref(props.modelValue);
let timer = null;

watch(
  () => props.modelValue,
  (val) => {
    if (val !== localValue.value) {
      localValue.value = val;
    }
  }
);

const onInput = (e) => {
  localValue.value = e.target.value;
  if (timer) clearTimeout(timer);
  if (props.debounceMs <= 0) {
    emit('update:modelValue', localValue.value);
    return;
  }
  timer = setTimeout(() => {
    emit('update:modelValue', localValue.value);
  }, props.debounceMs);
};

const clearInput = () => {
  if (timer) clearTimeout(timer);
  localValue.value = '';
  emit('update:modelValue', '');
};

onUnmounted(() => {
  if (timer) clearTimeout(timer);
});
</script>
