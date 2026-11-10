<template>
  <div class="max-w-4xl mx-auto space-y-5 pb-4">
    <!-- Back & Print Navigation -->
    <div class="flex items-center justify-between gap-2 no-print">
      <router-link
        to="/pick-list"
        class="min-h-[44px] px-2 -ml-2 inline-flex items-center text-sm font-medium text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors"
      >
        <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
        </svg>
        Kembali ke Pemilihan
      </router-link>

      <button
        @click="handlePrint"
        type="button"
        class="hidden sm:inline-flex min-h-[44px] px-4 py-2 bg-white dark:bg-[#121215] hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-sm font-medium rounded-xl border border-zinc-400 dark:border-zinc-700 items-center gap-2 transition-colors cursor-pointer"
      >
        <svg class="w-4 h-4 text-zinc-600 dark:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path>
        </svg>
        <span>Cetak</span>
      </button>
    </div>

    <!-- Inline Error Alert -->
    <div
      v-if="errorMsg"
      role="alert"
      class="bg-rose-50 border border-rose-300 text-rose-800 dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-300 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm no-print"
    >
      <span>{{ errorMsg }}</span>
      <button
        @click="loadSession"
        type="button"
        class="min-h-[44px] px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold cursor-pointer shrink-0"
      >
        Muat Ulang
      </button>
    </div>

    <!-- Loading State -->
    <div
      v-if="isLoading"
      role="status"
      aria-live="polite"
      class="bg-white dark:bg-[#121215] rounded-2xl border border-zinc-300 dark:border-zinc-800 p-8 text-center text-sm text-zinc-600 dark:text-zinc-400"
    >
      Memuat daftar checklist baut...
    </div>

    <!-- Main Card -->
    <div v-else-if="session" class="bg-white dark:bg-[#121215] rounded-2xl border border-zinc-300 dark:border-zinc-800 p-4 sm:p-7 shadow-sm transition-colors">
      <!-- Session Header -->
      <div class="border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div class="flex items-center gap-3.5">
            <button
              v-if="session.motorcycleType.images && session.motorcycleType.images.length > 0"
              @click="openMotorPhoto(session.motorcycleType)"
              type="button"
              class="w-12 h-12 rounded-xl overflow-hidden bg-zinc-900 border border-zinc-300 dark:border-zinc-700 shrink-0 cursor-pointer hover:border-zinc-500 transition-all"
              title="Lihat foto motor"
              :aria-label="`Lihat foto motor ${session.motorcycleType.displayName}`"
            >
              <img :src="session.motorcycleType.images[0].url" :alt="session.motorcycleType.displayName" class="w-full h-full object-cover" />
            </button>
            <div>
              <div class="flex flex-wrap items-center gap-2 mb-1.5">
                <span class="font-mono text-[11px] px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700">
                  SESI #{{ session.id }}
                </span>
                <span
                  class="text-[11px] font-mono px-2.5 py-0.5 rounded border font-semibold"
                  :class="[session.status === 'COMPLETED'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                    : 'bg-zinc-100 text-zinc-800 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700']"
                >
                  {{ session.status === 'COMPLETED' ? 'SELESAI LENGKAP' : 'SEDANG DIAMBIL' }}
                </span>
              </div>

              <h1 class="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                {{ session.motorcycleType.displayName }}
              </h1>
              <p v-if="session.package" class="text-xs text-zinc-600 dark:text-zinc-400 font-mono mt-0.5">
                {{ session.package.name }}
              </p>
            </div>
          </div>

          <div class="text-left sm:text-right text-xs text-zinc-600 dark:text-zinc-400 font-mono">
            <p>Petugas: <span class="text-zinc-900 dark:text-zinc-100 font-semibold">{{ session.creator.name }}</span></p>
            <p class="mt-0.5">{{ formatDateTime(session.createdAt) }}</p>
          </div>
        </div>

        <!-- Minimalist Progress Bar -->
        <div class="mt-5 space-y-1.5">
          <div class="flex justify-between text-xs font-mono">
            <span class="text-zinc-600 dark:text-zinc-400">
              Progres: {{ session.checkedItems }} / {{ session.totalItems }} Terambil
            </span>
            <span class="text-zinc-900 dark:text-zinc-100 font-bold">{{ session.progressPercent }}%</span>
          </div>
          <div
            class="w-full h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden"
            role="progressbar"
            :aria-valuenow="session.progressPercent"
            aria-valuemin="0"
            aria-valuemax="100"
          >
            <div
              class="h-full rounded-full transition-all duration-300"
              :class="session.status === 'COMPLETED' ? 'bg-emerald-600 dark:bg-emerald-500' : 'bg-zinc-900 dark:bg-zinc-100'"
              :style="{ width: `${session.progressPercent}%` }"
            ></div>
          </div>
        </div>
      </div>

      <!-- Checklist Items -->
      <div class="mt-5 space-y-2.5">
        <div
          v-for="item in session.items"
          :key="item.id"
          class="rounded-xl border transition-all flex items-stretch gap-2 print-avoid-break"
          :class="[
            item.checked
              ? 'bg-emerald-50/50 dark:bg-[#18181c]/50 border-emerald-300/80 dark:border-emerald-500/30'
              : 'bg-white dark:bg-[#18181c] border-zinc-300 dark:border-zinc-700 hover:border-zinc-500 dark:hover:border-zinc-500'
          ]"
        >
          <!-- Primary Toggle Button (occupies main left+center area, >= 56px height) -->
          <button
            type="button"
            role="checkbox"
            :aria-checked="item.checked"
            :disabled="togglingIds.has(item.id)"
            @click="toggleItem(item)"
            class="flex-1 min-w-0 min-h-[56px] p-3.5 text-left flex items-center justify-between gap-3 cursor-pointer disabled:opacity-70 rounded-xl"
          >
            <div class="flex items-center gap-3 min-w-0">
              <!-- Circular Checkbox -->
              <span
                class="w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all shrink-0"
                :class="[
                  item.checked
                    ? 'bg-emerald-600 border-emerald-600 text-white dark:bg-emerald-500 dark:border-emerald-500 dark:text-black'
                    : 'border-zinc-500 dark:border-zinc-500 bg-transparent'
                ]"
                aria-hidden="true"
              >
                <svg v-if="item.checked" class="w-3.5 h-3.5 stroke-[3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path>
                </svg>
              </span>

              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span
                    class="font-mono text-sm font-bold text-zinc-900 dark:text-zinc-100"
                    :class="{ 'line-through text-zinc-600 dark:text-zinc-400': item.checked }"
                  >
                    {{ item.boltSpec.code }}
                  </span>
                  <span class="text-xs font-mono font-semibold text-zinc-700 dark:text-zinc-300">
                    M{{ Number(item.boltSpec.diameterMm) }} × {{ Number(item.boltSpec.lengthMm) }} mm
                  </span>
                  <span class="text-xs text-zinc-600 dark:text-zinc-400">
                    {{ item.boltSpec.headType }} &bull; {{ item.boltSpec.finish }}
                  </span>
                </div>
                <p class="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5 truncate max-w-md">
                  {{ item.positionSummary || 'Seluruh motor' }}
                </p>
              </div>
            </div>

            <span
              class="shrink-0 px-2.5 py-1 rounded-lg text-xs font-mono font-bold"
              :class="[
                item.checked
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30'
                  : 'bg-zinc-900 text-white dark:bg-zinc-800 dark:text-zinc-100 border border-zinc-700'
              ]"
            >
              {{ item.quantity }} pcs
            </span>
          </button>

          <!-- Separated Bolt Photo Button on the Right (>= 44x44 px, prevents accidental mis-tap) -->
          <button
            v-if="item.boltSpec?.images && item.boltSpec.images.length > 0"
            @click="openBoltPhoto(item.boltSpec)"
            type="button"
            :aria-label="`Lihat foto baut ${item.boltSpec.code}`"
            title="Ketuk untuk melihat foto baut"
            class="min-w-[48px] min-h-[48px] m-1.5 rounded-lg overflow-hidden bg-zinc-900 border border-zinc-400 dark:border-zinc-700 hover:border-zinc-500 transition-all cursor-pointer shrink-0 self-center no-print"
          >
            <img :src="item.boltSpec.images[0].url" :alt="item.boltSpec.code" class="w-12 h-12 object-cover" />
          </button>
        </div>
      </div>

      <!-- Completion Banner -->
      <div
        v-if="session.status === 'COMPLETED'"
        role="status"
        class="mt-6 p-4 bg-emerald-50 border border-emerald-300 dark:bg-emerald-500/10 dark:border-emerald-500/30 rounded-xl flex items-center gap-3 text-sm"
      >
        <span class="text-emerald-700 dark:text-emerald-400 font-bold text-base" aria-hidden="true">&check;</span>
        <div>
          <h2 class="font-semibold text-emerald-900 dark:text-emerald-300">Semua Baut Telah Lengkap Diambil</h2>
          <p class="text-xs text-emerald-800 dark:text-emerald-400/90 mt-0.5">
            Daftar baut siap diserahkan kepada teknisi atau pelanggan di gerai Hex Titanium.
          </p>
        </div>
      </div>
    </div>

    <!-- Mobile Sticky Bottom Action Bar (Thumb Zone) -->
    <div v-if="session" class="sm:hidden sticky bottom-0 z-30 -mx-4 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] bg-white/95 dark:bg-[#09090b]/95 backdrop-blur-md border-t border-zinc-300 dark:border-zinc-800 flex items-center gap-2.5 no-print">
      <button
        @click="handlePrint"
        type="button"
        class="flex-1 min-h-[48px] px-4 py-2.5 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm font-medium rounded-xl border border-zinc-400 dark:border-zinc-700 inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
      >
        <svg class="w-4 h-4 text-zinc-600 dark:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path>
        </svg>
        <span>Cetak</span>
      </button>

      <router-link
        to="/pick-list"
        class="flex-1 min-h-[48px] px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 text-sm font-semibold rounded-xl inline-flex items-center justify-center transition-colors"
      >
        Ambil Motor Lain
      </router-link>
    </div>

    <!-- PHOTO GALLERY MODAL -->
    <PhotoGalleryModal
      v-if="galleryModal.isOpen"
      :is-open="galleryModal.isOpen"
      :category-title="galleryModal.categoryTitle"
      :item-title="galleryModal.itemTitle"
      :item-subtitle="galleryModal.itemSubtitle"
      :images="galleryModal.images"
      :can-manage="false"
      :upload-endpoint="''"
      :delete-endpoint-base="''"
      :primary-endpoint-base="''"
      :auth-headers="auth.authHeaders"
      @close="galleryModal.isOpen = false"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import PhotoGalleryModal from '../components/PhotoGalleryModal.vue';
import { formatDateTime } from '../utils/date';

const route = useRoute();
const auth = useAuthStore();
const session = ref(null);
const isLoading = ref(false);
const errorMsg = ref('');
const togglingIds = ref(new Set());

const galleryModal = ref({
  isOpen: false,
  categoryTitle: '',
  itemTitle: '',
  itemSubtitle: '',
  images: [],
});

const openMotorPhoto = (motor) => {
  galleryModal.value = {
    isOpen: true,
    categoryTitle: 'Foto Tipe Sepeda Motor',
    itemTitle: motor.displayName,
    itemSubtitle: `${motor.brand} ${motor.model}`,
    images: motor.images || [],
  };
};

const openBoltPhoto = (boltSpec) => {
  galleryModal.value = {
    isOpen: true,
    categoryTitle: 'Foto Spesifikasi Baut Titanium',
    itemTitle: boltSpec.code,
    itemSubtitle: `${boltSpec.headType || ''} M${Number(boltSpec.diameterMm)} × ${Number(boltSpec.lengthMm)}mm • ${boltSpec.finish || ''}`,
    images: boltSpec.images || [],
  };
};

const loadSession = async () => {
  errorMsg.value = '';
  isLoading.value = true;
  try {
    const res = await auth.apiFetch(`/api/pick-lists/sessions/${route.params.sessionId}`);
    if (!res.ok) throw new Error('Data sesi checklist tidak ditemukan.');
    session.value = await res.json();
  } catch (err) {
    errorMsg.value = err.message === 'Failed to fetch'
      ? 'Tidak dapat terhubung ke server gerai. Periksa sambungan Wi-Fi lalu ketuk Muat Ulang.'
      : err.message;
  } finally {
    isLoading.value = false;
  }
};

const toggleItem = async (item) => {
  if (togglingIds.value.has(item.id)) return;
  errorMsg.value = '';
  const newChecked = !item.checked;
  item.checked = newChecked;
  togglingIds.value.add(item.id);

  try {
    const res = await auth.apiFetch(`/api/pick-lists/sessions/${session.value.id}/items/${item.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ checked: newChecked }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal memperbarui status item.');

    session.value.status = data.sessionStatus;
    session.value.checkedItems = session.value.items.filter((i) => i.checked).length;
    session.value.progressPercent = session.value.totalItems > 0
      ? Math.round((session.value.checkedItems / session.value.totalItems) * 100)
      : 0;
  } catch (err) {
    item.checked = !newChecked;
    errorMsg.value = err.message === 'Failed to fetch'
      ? 'Gagal menyimpan centang karena sambungan Wi-Fi terputus. Coba ketuk lagi.'
      : err.message;
  } finally {
    togglingIds.value.delete(item.id);
  }
};

const handlePrint = () => {
  window.print();
};

onMounted(loadSession);
</script>
