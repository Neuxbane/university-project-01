<template>
  <div class="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#18181c] space-y-4">
    <!-- Draft Creation Form (after clicking 3D model surface) -->
    <div
      v-if="draftPoint"
      class="p-3.5 rounded-xl bg-white dark:bg-[#121215] border border-sky-400 dark:border-sky-500/50 space-y-3"
    >
      <div class="flex items-center justify-between gap-2">
        <p class="text-xs font-bold text-zinc-900 dark:text-zinc-100">
          Titik 3D Baru ({{ draftPoint.x.toFixed(2) }}, {{ draftPoint.y.toFixed(2) }}, {{ draftPoint.z.toFixed(2) }})
        </p>
        <button
          type="button"
          @click="$emit('clear-draft')"
          class="min-h-[44px] px-3 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white cursor-pointer"
        >
          Batal
        </button>
      </div>

      <form @submit.prevent="submitCreate" class="space-y-3">
        <div class="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
          <div class="sm:col-span-7">
            <AreaLabelInput
              input-id="anno3d-pos-select"
              label="Area / Posisi Motor"
              v-model:position-id="draftPositionId"
              v-model:custom-name="draftCustomName"
              v-model:custom-category="draftCustomCategory"
              :motor-positions="positions"
              :all-positions="allPositions"
              :required="true"
            />
          </div>

          <div class="sm:col-span-5">
            <label for="anno3d-label-input" class="block text-[11px] font-mono uppercase text-zinc-600 dark:text-zinc-400 mb-1">
              Label Pin Singkat (Opsional)
            </label>
            <input
              id="anno3d-label-input"
              v-model="draftLabel"
              type="text"
              placeholder="Misal: Cover CVT Kiri"
              class="w-full min-h-[44px] px-3 py-2 rounded-xl bg-zinc-50 dark:bg-[#18181c] border border-zinc-400 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100"
            />
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
          <template v-if="allSpecs.length > 0 && !selectedAreaHasBolts">
            <div :class="draftBoltSpecId ? 'sm:col-span-6' : 'sm:col-span-9'">
              <BoltSpecPicker
                v-model="draftBoltSpecId"
                :specs="allSpecs"
                input-id="anno3d-spec-picker"
                label="Sekaligus Tambah Baut Baru (Opsional)"
                placeholder="-- Pilih Baut jika area ini belum punya baut --"
              />
            </div>

            <div v-if="draftBoltSpecId" class="sm:col-span-3">
              <label for="anno3d-qty-input" class="block text-[11px] font-mono uppercase text-zinc-600 dark:text-zinc-400 mb-1">
                Jumlah Pcs
              </label>
              <div class="flex items-center rounded-xl bg-zinc-50 dark:bg-[#18181c] border border-zinc-400 dark:border-zinc-700 overflow-hidden min-h-[44px]">
                <button
                  type="button"
                  :disabled="draftQty <= 1"
                  @click="draftQty = Math.max(1, draftQty - 1)"
                  class="w-9 h-[42px] inline-flex items-center justify-center text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 disabled:opacity-40 cursor-pointer"
                  aria-label="Kurangi jumlah"
                >
                  -
                </button>
                <input
                  id="anno3d-qty-input"
                  v-model.number="draftQty"
                  type="number"
                  min="1"
                  max="100"
                  class="w-full text-center bg-transparent text-sm font-mono font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none"
                />
                <button
                  type="button"
                  @click="draftQty = Math.min(100, draftQty + 1)"
                  class="w-9 h-[42px] inline-flex items-center justify-center text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer"
                  aria-label="Tambah jumlah"
                >
                  +
                </button>
              </div>
            </div>
          </template>

          <div :class="allSpecs.length > 0 && !selectedAreaHasBolts ? 'sm:col-span-3' : 'sm:col-span-12 flex justify-end'">
            <button
              type="submit"
              :disabled="isSaving || (!draftPositionId && !draftCustomName.trim())"
              class="w-full sm:w-auto min-w-[120px] min-h-[44px] px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 text-xs font-bold cursor-pointer disabled:opacity-40"
            >
              {{ isSaving ? '...' : (draftBoltSpecId && !selectedAreaHasBolts ? 'Simpan Titik & Baut' : 'Simpan Titik') }}
            </button>
          </div>
        </div>
      </form>
    </div>

    <!-- Guidance prompt when no draft point active -->
    <div v-else class="flex flex-wrap items-center justify-between gap-2">
      <p class="text-xs text-zinc-600 dark:text-zinc-400">
        Ketuk permukaan model 3D di atas (jangan digeser) untuk menempatkan penanda baut baru.
      </p>
      <button
        type="button"
        @click="$emit('close-editor')"
        class="min-h-[36px] px-3 py-1.5 rounded-lg border border-zinc-400 dark:border-zinc-700 bg-white dark:bg-[#121215] hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-800 dark:text-zinc-200 cursor-pointer shrink-0"
      >
        Selesai Tandai
      </button>
    </div>

    <!-- Existing 3D Annotations List with inline edit & delete -->
    <div v-if="annotations.length > 0" class="space-y-2">
      <p class="text-xs font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
        Titik Terpasang di Model 3D ({{ annotations.length }})
      </p>

      <div class="space-y-2">
        <div
          v-for="(ann, idx) in annotations"
          :key="ann.id"
          class="p-2.5 rounded-xl bg-white dark:bg-[#121215] border transition-colors"
          :class="activeAnnotationId === ann.id
            ? 'border-amber-500 ring-1 ring-amber-500/40'
            : 'border-zinc-300 dark:border-zinc-700'"
        >
          <!-- Normal Row -->
          <div v-if="editingId !== ann.id" class="flex items-center justify-between gap-2">
            <button
              type="button"
              @click="$emit('select-annotation', ann)"
              class="min-h-[44px] flex items-center gap-2.5 min-w-0 text-left flex-1 cursor-pointer"
            >
              <span class="w-6 h-6 rounded-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-mono text-xs font-bold flex items-center justify-center shrink-0">
                {{ idx + 1 }}
              </span>
              <div class="min-w-0">
                <p class="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                  {{ ann.label || ann.boltPosition?.name }}
                </p>
                <p class="text-[11px] font-mono text-zinc-600 dark:text-zinc-400 truncate">
                  {{ ann.boltPosition?.name }} &bull; ({{ ann.x.toFixed(2) }}, {{ ann.y.toFixed(2) }}, {{ ann.z.toFixed(2) }})
                </p>
              </div>
            </button>

            <div class="flex items-center gap-1 shrink-0">
              <button
                type="button"
                @click="startEdit(ann)"
                :aria-label="`Ubah titik ${ann.label || ann.boltPosition?.name}`"
                class="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-xl text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 cursor-pointer"
              >
                <Pencil class="w-4 h-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                @click="confirmDeleteTarget = ann"
                :aria-label="`Hapus titik ${ann.label || ann.boltPosition?.name}`"
                class="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-xl text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10 cursor-pointer"
              >
                <Trash2 class="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          <!-- Inline Edit Form (not a modal!) -->
          <form v-else @submit.prevent="submitEdit(ann.id)" class="space-y-2.5 pt-1">
            <div class="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <div class="sm:col-span-6">
                <AreaLabelInput
                  :input-id="`edit-pos-${ann.id}`"
                  label="Area / Posisi Baut"
                  v-model:position-id="editForm.boltPositionId"
                  v-model:custom-name="editForm.customName"
                  v-model:custom-category="editForm.customCategory"
                  :motor-positions="positions"
                  :required="true"
                />
              </div>
              <div class="sm:col-span-6">
                <label :for="`edit-lbl-${ann.id}`" class="sr-only">Label</label>
                <input
                  :id="`edit-lbl-${ann.id}`"
                  v-model="editForm.label"
                  type="text"
                  placeholder="Label opsional..."
                  class="w-full min-h-[44px] px-3 py-2 rounded-xl bg-zinc-50 dark:bg-[#18181c] border border-zinc-500 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100"
                />
              </div>
            </div>
            <div class="flex justify-end gap-2">
              <button
                type="button"
                @click="editingId = null"
                class="min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                :disabled="isSaving"
                class="min-h-[44px] px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 text-xs font-bold cursor-pointer disabled:opacity-40"
              >
                {{ isSaving ? 'Menyimpan...' : 'Simpan Perubahan' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Confirm Delete Dialog -->
    <ConfirmDialog
      :open="Boolean(confirmDeleteTarget)"
      title="Hapus Penanda 3D?"
      :message="`Penanda &quot;${confirmDeleteTarget?.label || confirmDeleteTarget?.boltPosition?.name || 'Titik'}&quot; akan dihapus dari model 3D.`"
      confirm-text="Ya, Hapus"
      :danger="true"
      :loading="isDeleting"
      @confirm="executeDelete"
      @cancel="confirmDeleteTarget = null"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { Pencil, Trash2 } from 'lucide-vue-next';
import ConfirmDialog from '../ui/ConfirmDialog.vue';
import AreaLabelInput from '../ui/AreaLabelInput.vue';
import BoltSpecPicker from '../ui/BoltSpecPicker.vue';

const props = defineProps({
  positions: { type: Array, default: () => [] },
  allPositions: { type: Array, default: () => [] },
  allSpecs: { type: Array, default: () => [] },
  positionBreakdown: { type: Array, default: () => [] },
  annotations: { type: Array, default: () => [] },
  activeAnnotationId: { type: Number, default: null },
  draftPoint: { type: Object, default: null },
  initialPositionId: { type: [String, Number], default: null },
  isSaving: { type: Boolean, default: false },
  isDeleting: { type: Boolean, default: false },
});

const emit = defineEmits([
  'select-annotation',
  'clear-draft',
  'create-annotation',
  'update-annotation',
  'delete-annotation',
  'close-editor',
]);

const draftPositionId = ref('');
const draftCustomName = ref('');
const draftCustomCategory = ref('');
const draftLabel = ref('');
const draftBoltSpecId = ref('');
const draftQty = ref(1);
const editingId = ref(null);
const editForm = ref({ boltPositionId: '', customName: '', customCategory: '', label: '' });
const confirmDeleteTarget = ref(null);

const selectedAreaHasBolts = computed(() => {
  if (!draftPositionId.value) return false;
  return (props.positionBreakdown || []).some(
    (row) => Number(row.positionId) === Number(draftPositionId.value)
  );
});

watch(
  () => props.initialPositionId,
  (initPosId) => {
    if (initPosId) {
      draftPositionId.value = initPosId;
      draftCustomName.value = '';
      draftBoltSpecId.value = '';
    }
  },
  { immediate: true }
);

watch(
  () => props.draftPoint,
  (val) => {
    if (val && props.initialPositionId) {
      draftPositionId.value = props.initialPositionId;
      draftCustomName.value = '';
    }
  }
);

watch(selectedAreaHasBolts, (hasBolts) => {
  if (hasBolts) {
    draftBoltSpecId.value = '';
    draftQty.value = 1;
  }
});

const submitCreate = () => {
  if (!props.draftPoint || (!draftPositionId.value && !draftCustomName.value.trim())) return;
  const attachBolt = Boolean(draftBoltSpecId.value && !selectedAreaHasBolts.value);
  emit('create-annotation', {
    boltPositionId: draftPositionId.value || null,
    customAreaName: draftCustomName.value.trim() || null,
    customAreaCategory: draftCustomCategory.value.trim() || null,
    x: props.draftPoint.x,
    y: props.draftPoint.y,
    z: props.draftPoint.z,
    normalX: props.draftPoint.normalX,
    normalY: props.draftPoint.normalY,
    normalZ: props.draftPoint.normalZ,
    label: draftLabel.value.trim() || null,
    ...(attachBolt ? { boltSpecId: draftBoltSpecId.value, quantity: draftQty.value || 1 } : {}),
  });
  draftPositionId.value = '';
  draftCustomName.value = '';
  draftCustomCategory.value = '';
  draftLabel.value = '';
  draftBoltSpecId.value = '';
  draftQty.value = 1;
};

const startEdit = (ann) => {
  editingId.value = ann.id;
  editForm.value = {
    boltPositionId: ann.boltPositionId,
    customName: '',
    customCategory: ann.boltPosition?.category || '',
    label: ann.label || '',
  };
};

const submitEdit = (id) => {
  emit('update-annotation', {
    id,
    boltPositionId: editForm.value.boltPositionId || null,
    customAreaName: editForm.value.customName.trim() || null,
    customAreaCategory: editForm.value.customCategory.trim() || null,
    label: editForm.value.label.trim() || null,
  });
  editingId.value = null;
};

const executeDelete = () => {
  if (!confirmDeleteTarget.value) return;
  const id = confirmDeleteTarget.value.id;
  confirmDeleteTarget.value = null;
  emit('delete-annotation', id);
};
</script>
