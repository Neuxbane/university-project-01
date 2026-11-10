<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="bg-white dark:bg-[#121215] p-5 sm:p-6 rounded-2xl border border-zinc-300 dark:border-zinc-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
      <div>
        <div class="flex items-center gap-2 mb-1">
          <span class="w-2 h-2 rounded-full bg-zinc-500" aria-hidden="true"></span>
          <span class="text-xs font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400">Master Baut</span>
        </div>
        <h1 class="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Spesifikasi &amp; Posisi Baut Titanium
        </h1>
        <p class="text-sm text-zinc-600 dark:text-zinc-400 mt-0.5">
          Standar ukuran diameter (M5, M6, M8, M10), foto warna, dan titik posisi pasang
        </p>
      </div>

      <!-- Segmented Tab Switcher (Responsive width) -->
      <div class="grid grid-cols-2 sm:inline-flex w-full sm:w-auto p-1 bg-zinc-100 dark:bg-[#18181c] rounded-xl border border-zinc-300 dark:border-zinc-700 gap-1 shrink-0">
        <button
          @click="activeTab = 'specs'"
          type="button"
          class="min-h-[44px] px-3.5 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all cursor-pointer text-center"
          :class="[activeTab === 'specs' ? 'bg-white dark:bg-[#121215] text-zinc-900 dark:text-zinc-100 font-semibold shadow-sm' : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100']"
        >
          Spesifikasi ({{ specs.length }})
        </button>
        <button
          @click="activeTab = 'positions'"
          type="button"
          class="min-h-[44px] px-3.5 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all cursor-pointer text-center"
          :class="[activeTab === 'positions' ? 'bg-white dark:bg-[#121215] text-zinc-900 dark:text-zinc-100 font-semibold shadow-sm' : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100']"
        >
          Posisi Pasang ({{ positions.length }})
        </button>
      </div>
    </div>

    <!-- Error & Loading States -->
    <div
      v-if="errorMsg"
      role="alert"
      class="bg-rose-50 border border-rose-300 text-rose-800 dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-300 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm"
    >
      <span>{{ errorMsg }}</span>
      <button
        @click="loadData"
        type="button"
        class="min-h-[44px] px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold cursor-pointer shrink-0"
      >
        Muat Ulang
      </button>
    </div>

    <div
      v-if="isLoading"
      role="status"
      aria-live="polite"
      class="bg-white dark:bg-[#121215] rounded-2xl border border-zinc-300 dark:border-zinc-800 p-8 text-center text-sm text-zinc-600 dark:text-zinc-400"
    >
      Memuat daftar ukuran dan posisi baut...
    </div>

    <!-- TAB 1: BOLT SPECS -->
    <div v-else-if="activeTab === 'specs'" class="space-y-4">
      <!-- Search filter -->
      <div class="flex items-center">
        <label for="spec-search-input" class="sr-only">Cari spesifikasi baut</label>
        <input
          id="spec-search-input"
          v-model="specSearch"
          type="text"
          placeholder="Cari kode baut, tipe kepala, warna, atau catatan..."
          class="w-full sm:max-w-sm min-h-[44px] px-3.5 py-2.5 bg-white dark:bg-[#121215] border border-zinc-500 rounded-xl text-base sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 dark:placeholder:text-zinc-400 shadow-sm"
        />
      </div>

      <div class="bg-white dark:bg-[#121215] rounded-2xl border border-zinc-300 dark:border-zinc-800 shadow-sm overflow-hidden transition-colors">
        <div v-if="filteredSpecs.length === 0" class="p-8 text-center text-sm text-zinc-600 dark:text-zinc-400">
          Tidak ada spesifikasi baut yang cocok dengan pencarian "{{ specSearch }}".
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr class="border-b border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono text-[11px] uppercase tracking-wider">
                <th class="py-3 px-4 font-medium">Foto</th>
                <th class="py-3 px-4 font-medium">Kode Baut</th>
                <th class="py-3 px-4 font-medium">Diameter</th>
                <th class="py-3 px-4 font-medium">Panjang</th>
                <th class="py-3 px-4 font-medium">Tipe Kepala</th>
                <th class="py-3 px-4 font-medium">Drat</th>
                <th class="py-3 px-4 font-medium">Bahan &amp; Warna</th>
                <th class="py-3 px-4 font-medium">Catatan Area</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-zinc-200 dark:divide-zinc-800/80 text-zinc-800 dark:text-zinc-200">
              <tr v-for="s in filteredSpecs" :key="s.id" class="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                <!-- Photo Thumbnail & Gallery Trigger -->
                <td class="py-2.5 px-4">
                  <button
                    @click="openGallery(s)"
                    type="button"
                    class="min-h-[44px] flex items-center gap-2 cursor-pointer group text-left"
                    :aria-label="`Kelola foto baut ${s.code}`"
                  >
                    <span
                      class="w-10 h-10 rounded-lg overflow-hidden bg-zinc-900 border border-zinc-300 dark:border-zinc-700 group-hover:border-zinc-500 transition-all shrink-0 flex items-center justify-center relative"
                    >
                      <img
                        v-if="s.images && s.images.length > 0"
                        :src="s.images[0].url"
                        :alt="s.code"
                        class="w-full h-full object-cover"
                      />
                      <svg v-else class="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                      </svg>
                      <span
                        v-if="s.images && s.images.length > 1"
                        class="absolute bottom-0.5 right-0.5 bg-black/85 text-[9px] font-mono px-1 rounded text-zinc-100"
                      >
                        {{ s.images.length }}
                      </span>
                    </span>
                    <span class="text-xs font-mono text-zinc-700 group-hover:text-zinc-950 dark:text-zinc-300 dark:group-hover:text-white underline underline-offset-2 whitespace-nowrap">
                      {{ s.images && s.images.length > 0 ? `${s.images.length} foto` : '+ Foto' }}
                    </span>
                  </button>
                </td>

                <td class="py-3 px-4 font-mono font-bold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                  <span class="bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded text-xs border border-zinc-300 dark:border-zinc-700">
                    {{ s.code }}
                  </span>
                </td>
                <td class="py-3 px-4 font-bold font-mono text-zinc-900 dark:text-zinc-100 whitespace-nowrap">M{{ Number(s.diameterMm) }}</td>
                <td class="py-3 px-4 font-bold font-mono text-zinc-900 dark:text-zinc-100 whitespace-nowrap">{{ Number(s.lengthMm) }} mm</td>
                <td class="py-3 px-4 text-zinc-700 dark:text-zinc-300">{{ s.headType }}</td>
                <td class="py-3 px-4 font-mono text-zinc-600 dark:text-zinc-400 text-xs">{{ s.threadPitch || '-' }}</td>
                <td class="py-3 px-4">
                  <span class="text-xs text-zinc-700 dark:text-zinc-300">
                    {{ s.material }} &bull; {{ s.finish }}
                  </span>
                </td>
                <td class="py-3 px-4 text-zinc-600 dark:text-zinc-400 text-xs">{{ s.notes || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- TAB 2: BOLT POSITIONS -->
    <div v-else-if="activeTab === 'positions'" class="bg-white dark:bg-[#121215] rounded-2xl border border-zinc-300 dark:border-zinc-800 shadow-sm overflow-hidden transition-colors">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs sm:text-sm">
          <thead>
            <tr class="border-b border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono text-[11px] uppercase tracking-wider">
              <th class="py-3 px-4 font-medium">#</th>
              <th class="py-3 px-4 font-medium">Area</th>
              <th class="py-3 px-4 font-medium">Nama Titik Posisi</th>
              <th class="py-3 px-4 font-medium">Catatan Peruntukan</th>
              <th class="py-3 px-4 font-medium text-center">Dipakai di Motor</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-zinc-200 dark:divide-zinc-800/80 text-zinc-800 dark:text-zinc-200">
            <tr v-for="p in positions" :key="p.id" class="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
              <td class="py-3 px-4 font-mono text-zinc-600 dark:text-zinc-400 text-xs">{{ p.sortOrder }}</td>
              <td class="py-3 px-4">
                <span class="px-2 py-0.5 rounded text-[11px] font-mono text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700">
                  {{ p.category }}
                </span>
              </td>
              <td class="py-3 px-4 font-medium text-zinc-900 dark:text-zinc-100">{{ p.name }}</td>
              <td class="py-3 px-4 text-zinc-600 dark:text-zinc-400 text-xs">{{ p.notes || '-' }}</td>
              <td class="py-3 px-4 text-center font-mono font-bold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                <span class="bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded text-xs border border-zinc-300 dark:border-zinc-700">
                  {{ p._count?.requirements || 0 }} Titik
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- PHOTO GALLERY MODAL -->
    <PhotoGalleryModal
      v-if="selectedSpecForGallery"
      :is-open="Boolean(selectedSpecForGallery)"
      category-title="Foto Spesifikasi Baut Titanium"
      :item-title="selectedSpecForGallery.code"
      :item-subtitle="`${selectedSpecForGallery.headType} M${Number(selectedSpecForGallery.diameterMm)} × ${Number(selectedSpecForGallery.lengthMm)}mm • ${selectedSpecForGallery.material} (${selectedSpecForGallery.finish})`"
      :images="selectedSpecForGallery.images || []"
      :can-manage="auth.isAdmin"
      :upload-endpoint="`/api/bolt-specs/${selectedSpecForGallery.id}/images`"
      :delete-endpoint-base="`/api/bolt-specs/${selectedSpecForGallery.id}/images`"
      :primary-endpoint-base="`/api/bolt-specs/${selectedSpecForGallery.id}/images`"
      :auth-headers="auth.authHeaders"
      @close="selectedSpecForGallery = null"
      @updated="onGalleryUpdated"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '../stores/auth';
import PhotoGalleryModal from '../components/PhotoGalleryModal.vue';

const auth = useAuthStore();
const activeTab = ref('specs');
const specs = ref([]);
const positions = ref([]);
const specSearch = ref('');
const selectedSpecForGallery = ref(null);
const isLoading = ref(false);
const errorMsg = ref('');

const filteredSpecs = computed(() => {
  if (!specSearch.value.trim()) return specs.value;
  const q = specSearch.value.toLowerCase();
  return specs.value.filter((s) =>
    s.code?.toLowerCase().includes(q) ||
    s.headType?.toLowerCase().includes(q) ||
    s.notes?.toLowerCase().includes(q) ||
    s.finish?.toLowerCase().includes(q)
  );
});

const loadData = async () => {
  errorMsg.value = '';
  isLoading.value = true;
  try {
    const [resSpecs, resPos] = await Promise.all([
      auth.apiFetch('/api/bolt-specs'),
      auth.apiFetch('/api/positions'),
    ]);
    if (!resSpecs.ok || !resPos.ok) {
      throw new Error('Gagal memuat daftar spesifikasi baut.');
    }
    const specsData = await resSpecs.json();
    const posData = await resPos.json();
    specs.value = Array.isArray(specsData) ? specsData : [];
    positions.value = Array.isArray(posData) ? posData : [];
  } catch (err) {
    console.error(err);
    errorMsg.value = err.message === 'Failed to fetch'
      ? 'Tidak dapat terhubung ke server gerai. Periksa sambungan Wi-Fi lalu ketuk Muat Ulang.'
      : err.message;
  } finally {
    isLoading.value = false;
  }
};

const openGallery = (spec) => {
  selectedSpecForGallery.value = spec;
};

const onGalleryUpdated = (updatedImages) => {
  if (selectedSpecForGallery.value) {
    selectedSpecForGallery.value.images = updatedImages;
    const target = specs.value.find((s) => s.id === selectedSpecForGallery.value.id);
    if (target) {
      target.images = updatedImages;
    }
  }
};

onMounted(loadData);
</script>
