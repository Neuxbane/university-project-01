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

      <!-- Positions Grid (Dynamic Custom Areas & Inline CRUD) -->
      <div v-else-if="activeTab === 'positions'" class="space-y-4">
        <!-- Inline Add Custom Area Form (Admin only) -->
        <form
          v-if="auth.isAdmin"
          @submit.prevent="handleCreatePosition"
          class="bg-white dark:bg-[#121215] border border-zinc-300 dark:border-zinc-700 rounded-xl p-4 space-y-3"
        >
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 class="text-sm font-bold text-zinc-900 dark:text-zinc-100">Buat Label Area / Titik Pasang Baru</h2>
              <p class="text-xs text-zinc-600 dark:text-zinc-400">Bebas memberi nama dan kelompok area motor sendiri tanpa daftar kaku.</p>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
            <div class="sm:col-span-5">
              <label for="new-pos-name" class="block text-[11px] font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1">
                Nama Area / Titik Pasang
              </label>
              <input
                id="new-pos-name"
                v-model="newPosition.name"
                type="text"
                required
                placeholder="Misal: Cover Kipas Bawah / Dudukan Plat"
                class="w-full min-h-[44px] px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
              />
            </div>

            <div class="sm:col-span-3">
              <label for="new-pos-cat" class="block text-[11px] font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1">
                Kelompok Area
              </label>
              <input
                id="new-pos-cat"
                v-model="newPosition.category"
                type="text"
                list="position-categories-list"
                placeholder="Misal: Mesin / Area Kustom"
                class="w-full min-h-[44px] px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
              />
            </div>

            <div class="sm:col-span-2">
              <label for="new-pos-notes" class="block text-[11px] font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1">
                Catatan (Opsional)
              </label>
              <input
                id="new-pos-notes"
                v-model="newPosition.notes"
                type="text"
                placeholder="Keterangan singkat"
                class="w-full min-h-[44px] px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
              />
            </div>

            <div class="sm:col-span-2">
              <button
                type="submit"
                :disabled="isSubmittingPosition || !newPosition.name.trim()"
                class="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 text-sm font-semibold inline-flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer transition-colors"
              >
                <Plus class="w-4 h-4" />
                {{ isSubmittingPosition ? 'Menyimpan...' : 'Tambah Area' }}
              </button>
            </div>
          </div>

          <datalist id="position-categories-list">
            <option v-for="cat in availableCategories" :key="cat" :value="cat" />
          </datalist>
        </form>

        <!-- Inline status feedback -->
        <div
          v-if="positionFeedback"
          class="p-3 rounded-xl text-xs font-medium flex items-center justify-between gap-2 border"
          :class="positionFeedbackType === 'error'
            ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-300 dark:border-rose-500/30 text-rose-800 dark:text-rose-300'
            : 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300'"
        >
          <span>{{ positionFeedback }}</span>
          <button type="button" @click="positionFeedback = ''" class="min-w-[36px] min-h-[36px] px-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer">
            Tutup
          </button>
        </div>

        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <SearchInput
            v-model="positionSearch"
            placeholder="Cari label area atau kelompok..."
            class="w-full sm:w-80"
          />
          <p class="text-xs font-mono text-zinc-600 dark:text-zinc-400">
            {{ filteredPositions.length }} dari {{ positions.length }} area terdaftar
          </p>
        </div>

        <EmptyState
          v-if="filteredPositions.length === 0"
          :icon="Wrench"
          :title="positionSearch ? 'Area tidak ditemukan' : 'Belum ada label area'"
          :description="positionSearch ? 'Coba kata kunci lain atau hapus pencarian.' : 'Tambahkan label area motor baru menggunakan formulir di atas.'"
        />

        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <div
            v-for="p in filteredPositions"
            :key="p.id"
            class="bg-white dark:bg-[#121215] border border-zinc-300 dark:border-zinc-700 rounded-xl p-4 flex flex-col justify-between gap-3"
          >
            <!-- Inline Edit Mode -->
            <form
              v-if="editingPositionId === p.id"
              @submit.prevent="saveEditPosition(p.id)"
              class="space-y-2.5"
            >
              <div>
                <label class="block text-[10px] font-mono uppercase text-zinc-500 mb-1">Nama Area</label>
                <input
                  v-model="editForm.name"
                  type="text"
                  required
                  class="w-full min-h-[44px] px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100"
                />
              </div>
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="block text-[10px] font-mono uppercase text-zinc-500 mb-1">Kelompok</label>
                  <input
                    v-model="editForm.category"
                    type="text"
                    list="position-categories-list"
                    class="w-full min-h-[44px] px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs text-zinc-900 dark:text-zinc-100"
                  />
                </div>
                <div>
                  <label class="block text-[10px] font-mono uppercase text-zinc-500 mb-1">Urutan</label>
                  <input
                    v-model.number="editForm.sortOrder"
                    type="number"
                    class="w-full min-h-[44px] px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs text-zinc-900 dark:text-zinc-100"
                  />
                </div>
              </div>
              <div>
                <label class="block text-[10px] font-mono uppercase text-zinc-500 mb-1">Catatan</label>
                <input
                  v-model="editForm.notes"
                  type="text"
                  placeholder="Catatan area (opsional)"
                  class="w-full min-h-[44px] px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs text-zinc-900 dark:text-zinc-100"
                />
              </div>
              <div class="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  @click="cancelEditPosition"
                  class="min-h-[44px] px-3 py-2 rounded-lg text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  :disabled="isSubmittingPosition"
                  class="min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-semibold bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Check class="w-3.5 h-3.5" />
                  Simpan
                </button>
              </div>
            </form>

            <!-- Read Mode (Inline — No Modal Popup) -->
            <template v-else>
              <div class="space-y-2">
                <div class="flex items-start justify-between gap-2">
                  <div class="min-w-0">
                    <span class="inline-block text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 mb-1">
                      {{ p.category || 'Area Kustom' }}
                    </span>
                    <h3 class="text-sm font-bold text-zinc-900 dark:text-zinc-100 leading-snug break-words">
                      {{ p.name }}
                    </h3>
                  </div>
                  <span class="text-[11px] font-mono text-zinc-500 shrink-0">#{{ p.sortOrder }}</span>
                </div>

                <p v-if="p.notes" class="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  {{ p.notes }}
                </p>
              </div>

              <div class="pt-2 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
                <div class="flex flex-wrap gap-1.5 text-[11px] font-mono text-zinc-600 dark:text-zinc-400">
                  <span class="px-2 py-0.5 rounded bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                    {{ p._count?.requirements || 0 }} matriks
                  </span>
                  <span class="px-2 py-0.5 rounded bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                    {{ p._count?.annotations || 0 }} titik 2D/3D
                  </span>
                  <span class="px-2 py-0.5 rounded bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                    {{ p._count?.closeUpPhotos || 0 }} foto
                  </span>
                </div>

                <div v-if="auth.isAdmin" class="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    @click="startEditPosition(p)"
                    class="min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Pencil class="w-3.5 h-3.5" />
                    Ubah
                  </button>
                  <button
                    type="button"
                    @click="requestDeletePosition(p)"
                    class="min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 class="w-3.5 h-3.5" />
                    Hapus
                  </button>
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>
    </template>

    <!-- Delete Position Confirmation (Popup hanya untuk konfirmasi) -->
    <ConfirmDialog
      :open="Boolean(positionToDelete)"
      title="Hapus Label Area?"
      :message="positionToDelete ? `Area '${positionToDelete.name}' (${positionToDelete.category}) akan dihapus permanen jika belum dipakai di motor mana pun.` : ''"
      confirm-text="Ya, Hapus Area"
      :danger="true"
      :loading="isSubmittingPosition"
      @confirm="confirmDeletePosition"
      @cancel="positionToDelete = null"
    />

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
import { ref, reactive, computed, watch, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { Check, Nut, Pencil, Plus, Trash2, Wrench } from 'lucide-vue-next';
import { useAuthStore } from '../stores/auth';
import PhotoGalleryModal from '../components/PhotoGalleryModal.vue';
import SegmentedControl from '../components/ui/SegmentedControl.vue';
import SearchInput from '../components/ui/SearchInput.vue';
import ItemCard from '../components/ui/ItemCard.vue';
import EmptyState from '../components/ui/EmptyState.vue';
import SkeletonCard from '../components/ui/SkeletonCard.vue';
import ConfirmDialog from '../components/ui/ConfirmDialog.vue';

const route = useRoute();
const auth = useAuthStore();
const activeTab = ref(route.query.tab === 'positions' ? 'positions' : 'specs');

watch(
  () => route.query.tab,
  (tab) => {
    if (tab === 'positions' || tab === 'specs') {
      activeTab.value = tab;
    }
  }
);
const specs = ref([]);
const positions = ref([]);
const specSearch = ref('');
const positionSearch = ref('');
const selectedSpecForGallery = ref(null);
const isLoading = ref(false);
const errorMsg = ref('');

// Inline Position CRUD State
const newPosition = reactive({ name: '', category: '', notes: '' });
const editingPositionId = ref(null);
const editForm = reactive({ name: '', category: '', notes: '', sortOrder: 0 });
const positionToDelete = ref(null);
const isSubmittingPosition = ref(false);
const positionFeedback = ref('');
const positionFeedbackType = ref('success');

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

const availableCategories = computed(() => {
  const set = new Set();
  for (const p of positions.value) {
    if (p.category?.trim()) set.add(p.category.trim());
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'id'));
});

const filteredPositions = computed(() => {
  if (!positionSearch.value.trim()) return positions.value;
  const q = positionSearch.value.trim().toLowerCase();
  return positions.value.filter((p) =>
    p.name?.toLowerCase().includes(q) ||
    p.category?.toLowerCase().includes(q) ||
    p.notes?.toLowerCase().includes(q)
  );
});

const setFeedback = (msg, type = 'success') => {
  positionFeedback.value = msg;
  positionFeedbackType.value = type;
};

const refreshPositions = async () => {
  const res = await auth.apiFetch('/api/positions');
  if (res.ok) {
    const data = await res.json();
    positions.value = Array.isArray(data) ? data : [];
  }
};

const handleCreatePosition = async () => {
  const name = newPosition.name.trim();
  if (!name) return;
  isSubmittingPosition.value = true;
  positionFeedback.value = '';
  try {
    const res = await auth.apiFetch('/api/positions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        category: newPosition.category.trim() || 'Area Kustom',
        notes: newPosition.notes.trim() || null,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Gagal menambahkan area baru.');
    }
    newPosition.name = '';
    newPosition.category = '';
    newPosition.notes = '';
    await refreshPositions();
    setFeedback(`Area "${data.name}" berhasil ditambahkan.`, 'success');
  } catch (err) {
    setFeedback(err.message, 'error');
  } finally {
    isSubmittingPosition.value = false;
  }
};

const startEditPosition = (pos) => {
  editingPositionId.value = pos.id;
  editForm.name = pos.name || '';
  editForm.category = pos.category || '';
  editForm.notes = pos.notes || '';
  editForm.sortOrder = pos.sortOrder ?? 0;
  positionFeedback.value = '';
};

const cancelEditPosition = () => {
  editingPositionId.value = null;
};

const saveEditPosition = async (posId) => {
  if (!editForm.name.trim()) return;
  isSubmittingPosition.value = true;
  positionFeedback.value = '';
  try {
    const res = await auth.apiFetch(`/api/positions/${posId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: editForm.name.trim(),
        category: editForm.category.trim() || 'Area Kustom',
        notes: editForm.notes.trim() || null,
        sortOrder: Number.isFinite(Number(editForm.sortOrder)) ? Number(editForm.sortOrder) : 0,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Gagal memperbarui area.');
    }
    editingPositionId.value = null;
    await refreshPositions();
    setFeedback(`Area "${data.name}" berhasil diperbarui.`, 'success');
  } catch (err) {
    setFeedback(err.message, 'error');
  } finally {
    isSubmittingPosition.value = false;
  }
};

const requestDeletePosition = (pos) => {
  positionFeedback.value = '';
  positionToDelete.value = pos;
};

const confirmDeletePosition = async () => {
  if (!positionToDelete.value) return;
  const target = positionToDelete.value;
  isSubmittingPosition.value = true;
  try {
    const res = await auth.apiFetch(`/api/positions/${target.id}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Gagal menghapus area.');
    }
    positionToDelete.value = null;
    await refreshPositions();
    setFeedback(`Area "${target.name}" berhasil dihapus.`, 'success');
  } catch (err) {
    positionToDelete.value = null;
    setFeedback(err.message, 'error');
  } finally {
    isSubmittingPosition.value = false;
  }
};

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
