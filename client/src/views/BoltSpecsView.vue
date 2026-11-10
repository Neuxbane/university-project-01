<template>
  <div class="space-y-5">
    <!-- Header -->
    <section class="bg-white dark:bg-[#121215] p-5 sm:p-6 rounded-2xl border border-zinc-300 dark:border-zinc-800 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      <div>
        <div class="flex items-center gap-2 mb-1">
          <span class="w-2 h-2 rounded-full bg-zinc-500" aria-hidden="true"></span>
          <span class="text-xs font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400">Master Baut</span>
        </div>
        <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Koleksi Baut Titanium
        </h1>
        <p class="text-sm text-zinc-600 dark:text-zinc-400 mt-0.5">
          Kenali baut dari foto dan warna ukuran. Ketuk kartu untuk melihat detail dan mengelola foto.
        </p>
      </div>

      <SegmentedControl
        v-model="activeTab"
        :options="[
          { value: 'specs', label: 'Baut', count: specs.length },
          { value: 'positions', label: 'Posisi', count: positions.length },
        ]"
        class="shrink-0"
      />
    </section>

    <!-- Error -->
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

    <!-- Loading -->
    <div v-if="isLoading" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3" role="status" aria-live="polite">
      <SkeletonCard v-for="n in 10" :key="n" />
      <span class="sr-only">Memuat koleksi baut...</span>
    </div>

    <template v-else>
      <!-- Specs Grid -->
      <div v-if="activeTab === 'specs'" class="space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="w-full sm:max-w-sm">
            <SearchInput v-model="specSearch" placeholder="Cari kode, kepala, atau warna..." aria-label="Cari spesifikasi baut" />
          </div>
          <p class="text-xs font-mono text-zinc-600 dark:text-zinc-400">
            {{ filteredSpecs.length }} dari {{ specs.length }} ukuran baut
          </p>
        </div>

        <EmptyState
          v-if="filteredSpecs.length === 0"
          :icon="Nut"
          title="Baut tidak ditemukan"
          :description="`Tidak ada baut yang cocok dengan “${specSearch}”.`"
          action-label="Hapus Pencarian"
          @action="specSearch = ''"
        />

        <div v-else class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          <ItemCard
            v-for="s in filteredSpecs"
            :key="s.id"
            :item="{ ...s, quantity: s._count?.requirements || 0 }"
            quantity-label="titik"
            @select="openGallery"
          />
        </div>
      </div>

      <!-- Positions Grid -->
      <div v-else-if="activeTab === 'positions'" class="space-y-4">
        <div class="flex items-center justify-between gap-3">
          <p class="text-xs font-mono text-zinc-600 dark:text-zinc-400">
            {{ positions.length }} titik pasang terdaftar
          </p>
        </div>

        <EmptyState
          v-if="positions.length === 0"
          :icon="Wrench"
          title="Belum ada titik pasang"
          description="Tambahkan posisi baut melalui menu admin."
        />

        <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          <SlotCard
            v-for="p in positions"
            :key="p.id"
            :slot-data="{ positionName: p.name, category: p.category, side: 'NONE', quantity: p._count?.requirements || 0 }"
            @select="selectedPosition = p"
          />
        </div>
      </div>
    </template>

    <!-- Position Detail -->
    <DetailSheet
      :open="Boolean(selectedPosition)"
      :is-modal="true"
      eyebrow="Titik Pasang"
      :title="selectedPosition?.name || ''"
      @close="selectedPosition = null"
    >
      <div v-if="selectedPosition" class="space-y-4">
        <div class="flex flex-wrap gap-2">
          <StatPill :icon="Wrench" label="Area" :value="selectedPosition.category" />
          <StatPill :icon="Bike" label="Dipakai" :value="`${selectedPosition._count?.requirements || 0} motor`" />
          <StatPill :icon="ListOrdered" label="Urutan" :value="selectedPosition.sortOrder" />
        </div>
        <div class="p-4 rounded-xl bg-zinc-50 dark:bg-[#18181c] border border-zinc-300 dark:border-zinc-700">
          <p class="text-xs font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1">Catatan Peruntukan</p>
          <p class="text-sm text-zinc-800 dark:text-zinc-200">{{ selectedPosition.notes || 'Belum ada catatan untuk titik pasang ini.' }}</p>
        </div>
      </div>
    </DetailSheet>

    <!-- Photo Gallery -->
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
import { Bike, ListOrdered, Nut, Wrench } from 'lucide-vue-next';
import { useAuthStore } from '../stores/auth';
import PhotoGalleryModal from '../components/PhotoGalleryModal.vue';
import SegmentedControl from '../components/ui/SegmentedControl.vue';
import SearchInput from '../components/ui/SearchInput.vue';
import ItemCard from '../components/ui/ItemCard.vue';
import SlotCard from '../components/ui/SlotCard.vue';
import EmptyState from '../components/ui/EmptyState.vue';
import SkeletonCard from '../components/ui/SkeletonCard.vue';
import StatPill from '../components/ui/StatPill.vue';
import DetailSheet from '../components/ui/DetailSheet.vue';

const auth = useAuthStore();
const activeTab = ref('specs');
const specs = ref([]);
const positions = ref([]);
const specSearch = ref('');
const selectedSpecForGallery = ref(null);
const selectedPosition = ref(null);
const isLoading = ref(false);
const errorMsg = ref('');

const filteredSpecs = computed(() => {
  if (!specSearch.value.trim()) return specs.value;
  const q = specSearch.value.toLowerCase();
  return specs.value.filter((s) =>
    s.code?.toLowerCase().includes(q) ||
    s.headType?.toLowerCase().includes(q) ||
    s.notes?.toLowerCase().includes(q) ||
    s.finish?.toLowerCase().includes(q) ||
    s.material?.toLowerCase().includes(q)
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
