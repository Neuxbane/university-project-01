<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
    @click.self="close"
  >
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="gallery-modal-title"
      class="bg-white dark:bg-[#121215] rounded-2xl w-full max-w-3xl max-h-[92dvh] flex flex-col shadow-2xl border border-zinc-300 dark:border-zinc-700 overflow-hidden transition-all"
    >
      <!-- Modal Header -->
      <div class="p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-2">
        <div class="min-w-0 pr-2">
          <div class="flex items-center space-x-2 mb-0.5">
            <span class="w-1.5 h-1.5 rounded-full bg-zinc-500" aria-hidden="true"></span>
            <span class="text-xs font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
              {{ categoryTitle || 'Galeri Foto' }}
            </span>
            <span v-if="images && images.length" class="text-xs font-mono text-zinc-600 dark:text-zinc-400">
              ({{ activeIndex + 1 }} / {{ images.length }})
            </span>
          </div>
          <h2 id="gallery-modal-title" class="text-base font-bold text-zinc-900 dark:text-zinc-100 truncate">
            {{ itemTitle }}
          </h2>
          <p v-if="itemSubtitle" class="text-xs text-zinc-600 dark:text-zinc-400 truncate">
            {{ itemSubtitle }}
          </p>
        </div>

        <button
          ref="closeBtnRef"
          @click="close"
          type="button"
          aria-label="Tutup galeri foto"
          class="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-xl text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors cursor-pointer shrink-0"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>

      <!-- Modal Body (Scrollable) -->
      <div class="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
        <!-- Inline Error Banner -->
        <div
          v-if="errorMsg"
          role="alert"
          class="p-3 rounded-xl bg-rose-50 text-rose-700 border border-rose-300 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20 text-xs font-medium flex items-center justify-between gap-2"
        >
          <span>{{ errorMsg }}</span>
          <button
            @click="errorMsg = ''"
            type="button"
            aria-label="Tutup pesan kesalahan"
            class="min-w-[36px] min-h-[36px] inline-flex items-center justify-center rounded-lg hover:bg-rose-100 dark:hover:bg-rose-500/20"
          >
            ✕
          </button>
        </div>

        <!-- Main Image Viewer -->
        <div v-if="images && images.length > 0" class="space-y-3">
          <div class="relative bg-zinc-950 rounded-xl overflow-hidden border border-zinc-700 flex items-center justify-center min-h-[220px] max-h-[380px]">
            <img
              :src="currentImage?.url"
              :alt="currentImage?.caption || itemTitle"
              class="w-full h-full max-h-[380px] object-contain select-none"
            />

            <!-- Primary Badge -->
            <div
              v-if="currentImage?.isPrimary"
              class="absolute top-3 left-3 bg-zinc-900/95 text-emerald-400 border border-emerald-500/40 text-xs font-mono px-2.5 py-1 rounded-md backdrop-blur-sm"
            >
              Foto Utama
            </div>

            <!-- Navigation Arrows (when multiple images) -->
            <div v-if="images.length > 1" class="absolute inset-y-0 inset-x-2 flex items-center justify-between pointer-events-none">
              <button
                @click="prevImage"
                type="button"
                aria-label="Foto sebelumnya"
                class="pointer-events-auto min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-full bg-zinc-900/85 hover:bg-zinc-900 text-zinc-200 hover:text-white border border-zinc-600 shadow-lg backdrop-blur-sm transition-all cursor-pointer"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                </svg>
              </button>
              <button
                @click="nextImage"
                type="button"
                aria-label="Foto berikutnya"
                class="pointer-events-auto min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-full bg-zinc-900/85 hover:bg-zinc-900 text-zinc-200 hover:text-white border border-zinc-600 shadow-lg backdrop-blur-sm transition-all cursor-pointer"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                </svg>
              </button>
            </div>
          </div>

          <!-- Current Image Info & Actions -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-50 dark:bg-[#18181c] p-3.5 rounded-xl border border-zinc-300 dark:border-zinc-700">
            <div class="min-w-0">
              <p class="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {{ currentImage?.caption || 'Tanpa keterangan' }}
              </p>
              <p class="text-xs font-mono text-zinc-600 dark:text-zinc-400 mt-0.5 truncate">
                {{ currentImage?.url }}
              </p>
            </div>

            <div v-if="canManage" class="flex flex-wrap items-center gap-2 shrink-0">
              <button
                v-if="!currentImage?.isPrimary"
                @click="setPrimaryImage(currentImage.id)"
                :disabled="isProcessing"
                type="button"
                class="min-h-[44px] px-3.5 py-2 text-xs font-semibold rounded-xl bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 border border-zinc-400 dark:border-zinc-600 transition-colors cursor-pointer disabled:opacity-50"
              >
                Jadikan Utama
              </button>

              <template v-if="pendingDeleteId !== currentImage?.id">
                <button
                  @click="pendingDeleteId = currentImage.id"
                  :disabled="isProcessing"
                  type="button"
                  class="min-h-[44px] px-3.5 py-2 text-xs font-semibold rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/30 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Hapus Foto
                </button>
              </template>
              <template v-else>
                <button
                  @click="deleteImage(currentImage.id)"
                  :disabled="isProcessing"
                  type="button"
                  class="min-h-[44px] px-3.5 py-2 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer disabled:opacity-50"
                >
                  Ya, Hapus Permanen
                </button>
                <button
                  @click="pendingDeleteId = null"
                  type="button"
                  class="min-h-[44px] px-3 py-2 text-xs font-medium rounded-xl bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 cursor-pointer"
                >
                  Batal
                </button>
              </template>
            </div>
          </div>

          <!-- Thumbnails Strip -->
          <div v-if="images.length > 1" class="flex items-center gap-2 overflow-x-auto pb-1 pt-1">
            <button
              v-for="(img, idx) in images"
              :key="img.id"
              @click="selectImage(idx)"
              type="button"
              :aria-label="`Pilih foto ${idx + 1}`"
              class="relative w-16 h-16 rounded-lg overflow-hidden border-2 shrink-0 transition-all cursor-pointer bg-zinc-900"
              :class="[
                activeIndex === idx
                  ? 'border-zinc-900 dark:border-zinc-100 ring-2 ring-zinc-500/40'
                  : 'border-zinc-300 dark:border-zinc-700 opacity-70 hover:opacity-100'
              ]"
            >
              <img :src="img.url" :alt="img.caption || `Foto ${idx + 1}`" class="w-full h-full object-cover" />
              <div v-if="img.isPrimary" class="absolute bottom-0 inset-x-0 bg-emerald-500 h-1.5"></div>
            </button>
          </div>
        </div>

        <!-- Empty State -->
        <div
          v-else
          class="p-8 text-center bg-zinc-50 dark:bg-[#18181c] rounded-xl border border-dashed border-zinc-400 dark:border-zinc-700"
        >
          <svg class="w-10 h-10 mx-auto text-zinc-500 dark:text-zinc-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
          </svg>
          <p class="text-sm font-medium text-zinc-800 dark:text-zinc-200">Belum ada foto yang diunggah</p>
          <p class="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
            {{ canManage ? 'Unggah foto spesifikasi baut atau tipe motor di bawah ini' : 'Admin belum menambahkan foto untuk item ini' }}
          </p>
        </div>

        <!-- Admin Photo Upload Form -->
        <div v-if="canManage" class="pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-3">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <span class="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Unggah Foto Baru (Bisa Banyak)
            </span>
            <div class="inline-flex p-1 bg-zinc-100 dark:bg-[#18181c] rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs font-mono">
              <button
                @click="uploadMode = 'file'"
                type="button"
                class="min-h-[40px] px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                :class="[uploadMode === 'file' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold shadow-sm' : 'text-zinc-600 dark:text-zinc-400']"
              >
                Pilih File
              </button>
              <button
                @click="uploadMode = 'url'"
                type="button"
                class="min-h-[40px] px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                :class="[uploadMode === 'url' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold shadow-sm' : 'text-zinc-600 dark:text-zinc-400']"
              >
                Tautan Foto
              </button>
            </div>
          </div>

          <!-- Mode 1: File Upload (Multi-file support) -->
          <div v-if="uploadMode === 'file'" class="space-y-3">
            <label
              class="flex flex-col items-center justify-center p-5 min-h-[96px] border-2 border-dashed border-zinc-400 dark:border-zinc-600 hover:border-zinc-600 dark:hover:border-zinc-400 rounded-xl cursor-pointer bg-zinc-50 dark:bg-[#18181c]/70 transition-all"
            >
              <svg class="w-7 h-7 text-zinc-500 dark:text-zinc-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
              </svg>
              <span class="text-sm font-medium text-zinc-800 dark:text-zinc-200 text-center">
                {{ selectedFiles.length ? `${selectedFiles.length} file dipilih` : 'Ketuk untuk memilih satu atau beberapa foto' }}
              </span>
              <span class="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5 text-center">
                Format PNG, JPEG, WebP, GIF (Maks. 8MB per file)
              </span>
              <input
                type="file"
                multiple
                accept="image/*"
                @change="onFileChange"
                class="sr-only"
              />
            </label>

            <!-- File list pills -->
            <div v-if="selectedFiles.length > 0" class="flex flex-wrap gap-1.5">
              <span
                v-for="(f, i) in selectedFiles"
                :key="i"
                class="inline-flex items-center text-xs font-mono px-2.5 py-1 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700"
              >
                {{ f.name }} ({{ Math.round(f.size / 1024) }} KB)
              </span>
            </div>
          </div>

          <!-- Mode 2: Direct URL -->
          <div v-else class="space-y-1.5">
            <label for="gallery-url-input" class="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Alamat Foto
            </label>
            <input
              id="gallery-url-input"
              v-model="inputUrl"
              type="text"
              placeholder="Contoh: /uploads/bolts/..."
              class="w-full min-h-[44px] px-3.5 py-2.5 bg-zinc-50 dark:bg-[#18181c] border border-zinc-500 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 dark:placeholder:text-zinc-400"
            />
          </div>

          <!-- Caption Input -->
          <div class="flex flex-col sm:flex-row gap-2.5">
            <div class="flex-1">
              <label for="gallery-caption-input" class="sr-only">Keterangan foto</label>
              <input
                id="gallery-caption-input"
                v-model="inputCaption"
                type="text"
                placeholder="Keterangan foto (opsional, misal: Tampak Sisi Kiri)..."
                class="w-full min-h-[44px] px-3.5 py-2.5 bg-zinc-50 dark:bg-[#18181c] border border-zinc-500 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 dark:placeholder:text-zinc-400"
              />
            </div>
            <button
              @click="submitUpload"
              :disabled="isProcessing || (uploadMode === 'file' ? selectedFiles.length === 0 : !inputUrl.trim())"
              type="button"
              class="min-h-[44px] px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-semibold text-sm rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-40 shrink-0"
            >
              <span v-if="isProcessing">Mengunggah...</span>
              <span v-else>Unggah Foto</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();

const props = defineProps({
  isOpen: { type: Boolean, default: false },
  categoryTitle: { type: String, default: '' },
  itemTitle: { type: String, default: '' },
  itemSubtitle: { type: String, default: '' },
  images: { type: Array, default: () => [] },
  canManage: { type: Boolean, default: false },
  uploadEndpoint: { type: String, required: true },
  deleteEndpointBase: { type: String, required: true },
  primaryEndpointBase: { type: String, required: true },
  authHeaders: { type: Function, required: true },
});

const emit = defineEmits(['close', 'updated']);

const activeIndex = ref(0);
const uploadMode = ref('file');
const selectedFiles = ref([]);
const inputUrl = ref('');
const inputCaption = ref('');
const isProcessing = ref(false);
const errorMsg = ref('');
const pendingDeleteId = ref(null);
const closeBtnRef = ref(null);

const currentImage = computed(() => {
  if (!props.images || props.images.length === 0) return null;
  return props.images[activeIndex.value] || props.images[0];
});

watch(
  () => props.images,
  (newImgs) => {
    if (activeIndex.value >= (newImgs?.length || 0)) {
      activeIndex.value = 0;
    }
  },
  { immediate: true }
);

watch(
  () => props.isOpen,
  async (open) => {
    if (typeof document !== 'undefined') {
      document.body.style.overflow = open ? 'hidden' : '';
    }
    if (open) {
      errorMsg.value = '';
      pendingDeleteId.value = null;
      await nextTick();
      closeBtnRef.value?.focus();
    }
  },
  { immediate: true }
);

const onKeyDown = (e) => {
  if (!props.isOpen) return;
  if (e.key === 'Escape') {
    close();
  } else if (e.key === 'ArrowRight' && props.images?.length > 1) {
    nextImage();
  } else if (e.key === 'ArrowLeft' && props.images?.length > 1) {
    prevImage();
  }
};

onMounted(() => window.addEventListener('keydown', onKeyDown));
onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown);
  if (typeof document !== 'undefined') {
    document.body.style.overflow = '';
  }
});

const close = () => {
  selectedFiles.value = [];
  inputUrl.value = '';
  inputCaption.value = '';
  errorMsg.value = '';
  pendingDeleteId.value = null;
  emit('close');
};

const selectImage = (idx) => {
  activeIndex.value = idx;
  pendingDeleteId.value = null;
};

const nextImage = () => {
  if (props.images && props.images.length > 0) {
    activeIndex.value = (activeIndex.value + 1) % props.images.length;
    pendingDeleteId.value = null;
  }
};

const prevImage = () => {
  if (props.images && props.images.length > 0) {
    activeIndex.value = (activeIndex.value - 1 + props.images.length) % props.images.length;
    pendingDeleteId.value = null;
  }
};

const onFileChange = (e) => {
  selectedFiles.value = Array.from(e.target.files || []);
};

const submitUpload = async () => {
  if (isProcessing.value) return;
  errorMsg.value = '';
  isProcessing.value = true;
  try {
    let res;
    if (uploadMode.value === 'file') {
      const formData = new FormData();
      for (const file of selectedFiles.value) {
        formData.append('images', file);
      }
      if (inputCaption.value.trim()) {
        formData.append('caption', inputCaption.value.trim());
      }

      res = await fetch(props.uploadEndpoint, {
        method: 'POST',
        headers: {
          Authorization: props.authHeaders().Authorization,
        },
        body: formData,
      });
    } else {
      res = await fetch(props.uploadEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...props.authHeaders(),
        },
        body: JSON.stringify({
          url: inputUrl.value.trim(),
          caption: inputCaption.value.trim() || null,
        }),
      });
    }

    if (res.status === 401) {
      await auth.handleUnauthorized();
      return;
    }
    if (!res.ok) {
      const data = await res.json();
      errorMsg.value = data.error || 'Gagal mengunggah foto. Periksa ukuran atau format gambar.';
      return;
    }

    const updatedImages = await res.json();
    selectedFiles.value = [];
    inputUrl.value = '';
    inputCaption.value = '';
    emit('updated', updatedImages);
  } catch (err) {
    console.error('Upload error:', err);
    errorMsg.value = 'Tidak dapat terhubung ke server gerai. Periksa sambungan Wi-Fi lalu coba lagi.';
  } finally {
    isProcessing.value = false;
  }
};

const setPrimaryImage = async (imageId) => {
  if (isProcessing.value) return;
  errorMsg.value = '';
  isProcessing.value = true;
  try {
    const res = await fetch(`${props.primaryEndpointBase}/${imageId}/primary`, {
      method: 'PATCH',
      headers: props.authHeaders(),
    });
    if (res.status === 401) {
      await auth.handleUnauthorized();
      return;
    }
    if (res.ok) {
      const updated = await res.json();
      emit('updated', updated);
    } else {
      const data = await res.json();
      errorMsg.value = data.error || 'Gagal mengatur foto utama.';
    }
  } catch (err) {
    console.error(err);
    errorMsg.value = 'Sambungan ke server terputus. Coba lagi.';
  } finally {
    isProcessing.value = false;
  }
};

const deleteImage = async (imageId) => {
  if (isProcessing.value) return;
  errorMsg.value = '';
  isProcessing.value = true;
  try {
    const res = await fetch(`${props.deleteEndpointBase}/${imageId}`, {
      method: 'DELETE',
      headers: props.authHeaders(),
    });
    if (res.status === 401) {
      await auth.handleUnauthorized();
      return;
    }
    if (res.ok) {
      const updated = await res.json();
      pendingDeleteId.value = null;
      if (activeIndex.value >= updated.length) {
        activeIndex.value = Math.max(0, updated.length - 1);
      }
      emit('updated', updated);
    } else {
      const data = await res.json();
      errorMsg.value = data.error || 'Gagal menghapus foto.';
    }
  } catch (err) {
    console.error(err);
    errorMsg.value = 'Sambungan ke server terputus. Coba lagi.';
  } finally {
    isProcessing.value = false;
  }
};
</script>
