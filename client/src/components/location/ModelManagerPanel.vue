<template>
  <div class="bg-white dark:bg-[#121215] rounded-2xl border border-zinc-300 dark:border-zinc-800 shadow-sm p-4 space-y-4">
    <!-- Header -->
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <div class="flex items-center gap-2">
          <Box class="w-4 h-4 text-zinc-700 dark:text-zinc-300 shrink-0" aria-hidden="true" />
          <h2 class="text-sm font-bold text-zinc-900 dark:text-zinc-100">Kelola Model 3D Motor</h2>
          <span
            class="px-2 py-0.5 rounded-full text-[11px] font-semibold"
            :class="model?.modelUrl
              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
              : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700'"
          >
            {{ model?.modelUrl ? 'Model 3D Aktif' : 'Belum Ada 3D' }}
          </span>
        </div>
        <p class="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
          Unggah file <span class="font-mono">.glb</span> atau <span class="font-mono">.gltf</span> (maks. 20 MB) agar staf dapat memutar motor 360&deg;.
        </p>
      </div>

      <button
        type="button"
        @click="$emit('close')"
        aria-label="Tutup panel model 3D"
        class="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-xl text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer shrink-0"
      >
        <X class="w-4 h-4" aria-hidden="true" />
      </button>
    </div>

    <!-- Error banner -->
    <div
      v-if="errorMsg"
      role="alert"
      class="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-300 dark:border-rose-500/30 text-xs font-medium text-rose-700 dark:text-rose-400 flex items-center justify-between gap-2"
    >
      <span>{{ errorMsg }}</span>
      <button
        type="button"
        @click="errorMsg = ''"
        aria-label="Tutup pesan kesalahan"
        class="min-w-[36px] min-h-[36px] inline-flex items-center justify-center rounded-lg hover:bg-rose-100 dark:hover:bg-rose-500/20 cursor-pointer"
      >
        <X class="w-3.5 h-3.5" aria-hidden="true" />
      </button>
    </div>

    <!-- Active Model Summary -->
    <div
      v-if="model?.modelUrl"
      class="p-3 rounded-xl bg-zinc-50 dark:bg-[#18181c] border border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
    >
      <div class="min-w-0">
        <p class="text-xs font-mono font-bold text-zinc-900 dark:text-zinc-100 truncate">
          {{ fileNameFromUrl(model.modelUrl) }}
        </p>
        <p class="text-[11px] font-mono text-zinc-600 dark:text-zinc-400 truncate">
          {{ model.modelUrl }}
        </p>
      </div>
      <button
        type="button"
        @click="askDeleteModel"
        :disabled="isDeleting"
        class="min-h-[44px] px-3.5 py-2 rounded-xl border border-rose-300 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-700 dark:text-rose-400 text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 shrink-0"
      >
        <Trash2 class="w-4 h-4" aria-hidden="true" />
        <span>{{ isDeleting ? 'Menghapus...' : 'Hapus Model 3D' }}</span>
      </button>
    </div>

    <!-- Upload / Replace .glb Dropzone -->
    <div
      class="rounded-xl border-2 border-dashed p-4 transition-colors"
      :class="isDragging
        ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-100 dark:bg-zinc-800/70'
        : 'border-zinc-300 dark:border-zinc-700 bg-zinc-50/70 dark:bg-[#18181c]/70'"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="onDropFile"
    >
      <input
        ref="fileInputRef"
        type="file"
        accept=".glb,.gltf"
        class="sr-only"
        @change="onFileSelected"
      />

      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 flex items-center justify-center shrink-0">
            <Upload class="w-4 h-4 text-zinc-700 dark:text-zinc-300" aria-hidden="true" />
          </div>
          <div class="min-w-0">
            <p class="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
              {{ selectedFile ? selectedFile.name : (model?.modelUrl ? 'Ganti dengan file .glb / .gltf baru' : 'Pilih atau seret file .glb / .gltf ke sini') }}
            </p>
            <p class="text-[11px] font-mono text-zinc-600 dark:text-zinc-400">
              {{ selectedFile ? formatFileSize(selectedFile.size) : 'Format offline GLB/GLTF • Maks. 20 MB' }}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2 shrink-0">
          <button
            type="button"
            @click="fileInputRef?.click()"
            :disabled="isUploading"
            class="min-h-[44px] px-3.5 py-2 rounded-xl border border-zinc-400 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-900 dark:text-zinc-100 cursor-pointer disabled:opacity-40"
          >
            Pilih File
          </button>
          <button
            v-if="selectedFile"
            type="button"
            @click="uploadSelectedFile"
            :disabled="isUploading"
            class="min-h-[44px] px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 text-xs font-bold cursor-pointer disabled:opacity-40"
          >
            {{ isUploading ? 'Mengunggah...' : 'Unggah & Pasang' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Scale & Rotation Y Adjustment (when 3D model exists) -->
    <div v-if="model?.modelUrl" class="pt-2 border-t border-zinc-200 dark:border-zinc-800 space-y-3">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <div class="flex items-center justify-between mb-1">
            <label for="model-scale-range" class="text-[11px] font-mono uppercase text-zinc-600 dark:text-zinc-400">
              Skala Model
            </label>
            <span class="text-xs font-mono font-bold text-zinc-900 dark:text-zinc-100">
              {{ Number(scaleDraft).toFixed(2) }}&times;
            </span>
          </div>
          <input
            id="model-scale-range"
            v-model.number="scaleDraft"
            type="range"
            min="0.25"
            max="2.5"
            step="0.05"
            class="w-full accent-zinc-900 dark:accent-zinc-100 cursor-pointer"
          />
        </div>

        <div>
          <div class="flex items-center justify-between mb-1">
            <label for="model-roty-range" class="text-[11px] font-mono uppercase text-zinc-600 dark:text-zinc-400">
              Putaran Awal (Y)
            </label>
            <span class="text-xs font-mono font-bold text-zinc-900 dark:text-zinc-100">
              {{ rotDegDraft }}&deg;
            </span>
          </div>
          <input
            id="model-roty-range"
            v-model.number="rotDegDraft"
            type="range"
            min="-180"
            max="180"
            step="15"
            class="w-full accent-zinc-900 dark:accent-zinc-100 cursor-pointer"
          />
        </div>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="flex flex-wrap items-center gap-1.5">
          <button
            v-for="deg in [0, 90, 180, -90]"
            :key="deg"
            type="button"
            @click="rotDegDraft = deg"
            class="min-h-[36px] px-2.5 py-1 rounded-lg border text-xs font-mono font-semibold cursor-pointer transition-colors"
            :class="rotDegDraft === deg
              ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100'
              : 'bg-zinc-50 dark:bg-[#18181c] text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800'"
          >
            {{ deg }}&deg;
          </button>
          <button
            type="button"
            @click="scaleDraft = 1; rotDegDraft = 0"
            class="min-h-[36px] px-2.5 py-1 rounded-lg border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
          >
            Reset
          </button>
        </div>

        <button
          type="button"
          @click="saveTransform"
          :disabled="isSavingTransform || !transformDirty"
          class="min-h-[44px] px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 text-xs font-bold cursor-pointer disabled:opacity-40"
        >
          {{ isSavingTransform ? 'Menyimpan...' : 'Simpan Posisi Model' }}
        </button>
      </div>
    </div>

    <!-- Confirmation Dialog for deleting 3D model -->
    <ConfirmDialog
      :open="confirmDeleteOpen"
      title="Hapus model 3D ini?"
      :message="`Model 3D untuk ${motorcycleName || 'motor ini'} beserta titik anotasi 3D-nya akan dihapus dan tampilan kembali ke foto 2D.`"
      confirm-text="Ya, Hapus Model"
      :danger="true"
      @confirm="confirmDeleteModel"
      @cancel="confirmDeleteOpen = false"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { Box, Trash2, Upload, X } from 'lucide-vue-next';
import { useAuthStore } from '../../stores/auth';
import ConfirmDialog from '../ui/ConfirmDialog.vue';

const props = defineProps({
  motorcycleId: { type: Number, required: true },
  motorcycleName: { type: String, default: '' },
  model: { type: Object, default: null },
});

const emit = defineEmits(['uploaded', 'updated', 'deleted', 'close']);

const auth = useAuthStore();
const fileInputRef = ref(null);
const selectedFile = ref(null);
const isDragging = ref(false);
const isUploading = ref(false);
const isSavingTransform = ref(false);
const isDeleting = ref(false);
const confirmDeleteOpen = ref(false);
const errorMsg = ref('');

const scaleDraft = ref(1);
const rotDegDraft = ref(0);

watch(
  () => props.model,
  (m) => {
    scaleDraft.value = Number(m?.scale) || 1;
    const deg = Math.round(((Number(m?.rotationY) || 0) * 180) / Math.PI);
    rotDegDraft.value = deg;
  },
  { immediate: true, deep: true }
);

const transformDirty = computed(() => {
  if (!props.model) return false;
  const origScale = Number(props.model.scale) || 1;
  const origDeg = Math.round(((Number(props.model.rotationY) || 0) * 180) / Math.PI);
  return Math.abs(scaleDraft.value - origScale) > 0.005 || rotDegDraft.value !== origDeg;
});

function fileNameFromUrl(url) {
  if (!url) return '';
  const parts = url.split('/');
  return parts[parts.length - 1] || url;
}

function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function validateAndStageFile(file) {
  errorMsg.value = '';
  if (!file) return;
  const name = file.name.toLowerCase();
  if (!name.endsWith('.glb') && !name.endsWith('.gltf')) {
    errorMsg.value = 'Format tidak didukung. Pilih file .glb atau .gltf.';
    return;
  }
  if (file.size > 20 * 1024 * 1024) {
    errorMsg.value = 'Ukuran file melebihi batas maksimal 20 MB.';
    return;
  }
  selectedFile.value = file;
}

const onFileSelected = (e) => {
  const file = e.target.files?.[0];
  validateAndStageFile(file);
  e.target.value = '';
};

const onDropFile = (e) => {
  isDragging.value = false;
  const file = e.dataTransfer?.files?.[0];
  validateAndStageFile(file);
};

const uploadSelectedFile = async () => {
  if (!selectedFile.value || isUploading.value) return;
  errorMsg.value = '';
  isUploading.value = true;
  try {
    const formData = new FormData();
    formData.append('model', selectedFile.value);
    formData.append('scale', String(scaleDraft.value || 1));
    formData.append('rotationY', String(((rotDegDraft.value || 0) * Math.PI) / 180));

    const res = await auth.apiFetch(`/api/motorcycles/${props.motorcycleId}/model`, {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal mengunggah model 3D.');

    selectedFile.value = null;
    emit('uploaded', data);
  } catch (err) {
    errorMsg.value = err.message === 'Failed to fetch'
      ? 'Sambungan ke server terputus saat mengunggah model 3D.'
      : err.message;
  } finally {
    isUploading.value = false;
  }
};

const saveTransform = async () => {
  if (!props.model || isSavingTransform.value) return;
  errorMsg.value = '';
  isSavingTransform.value = true;
  try {
    const rotationY = (rotDegDraft.value * Math.PI) / 180;
    const res = await auth.apiFetch(`/api/motorcycles/${props.motorcycleId}/model`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scale: scaleDraft.value,
        rotationY,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal menyimpan posisi model 3D.');
    emit('updated', data);
  } catch (err) {
    errorMsg.value = err.message === 'Failed to fetch'
      ? 'Sambungan terputus saat menyimpan pengaturan model.'
      : err.message;
  } finally {
    isSavingTransform.value = false;
  }
};

const askDeleteModel = () => {
  confirmDeleteOpen.value = true;
};

const confirmDeleteModel = async () => {
  confirmDeleteOpen.value = false;
  if (isDeleting.value) return;
  errorMsg.value = '';
  isDeleting.value = true;
  try {
    const res = await auth.apiFetch(`/api/motorcycles/${props.motorcycleId}/model`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal menghapus model 3D.');
    emit('deleted');
  } catch (err) {
    errorMsg.value = err.message === 'Failed to fetch'
      ? 'Sambungan terputus saat menghapus model 3D.'
      : err.message;
  } finally {
    isDeleting.value = false;
  }
};
</script>
