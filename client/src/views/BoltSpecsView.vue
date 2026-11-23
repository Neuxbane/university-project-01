<template>
  <div class="space-y-5">
    <!-- Header -->
    <section class="bg-white dark:bg-[#121215] p-5 sm:p-6 rounded-2xl border border-zinc-300 dark:border-zinc-800 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      <div>
        <div class="flex items-center gap-2 mb-1">
          <span class="w-2 h-2 rounded-full bg-zinc-500" aria-hidden="true"></span>
          <span class="text-xs font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400">Basis Data</span>
        </div>
        <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Master Barang
        </h1>
        <p class="text-sm text-zinc-600 dark:text-zinc-400 mt-0.5">
          Semua barang toko sesuai katalog: baut, mur, ring, emblem, sparepart, oli, dan jasa. Ketuk kartu untuk melihat foto{{ auth.can('BOLTS_MANAGE') ? ' atau mengubah nama dan ukurannya' : '' }}.
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2 shrink-0">
        <StatPill :icon="Ruler" label="Barang" :value="String(specs.length)" />
        <button
          v-if="auth.can('BOLTS_MANAGE')"
          type="button"
          @click="toggleAddForm"
          class="min-h-[44px] px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-semibold text-sm rounded-xl shadow-sm inline-flex items-center gap-1.5 cursor-pointer"
        >
          <X v-if="showAddForm" class="w-4 h-4" aria-hidden="true" />
          <Plus v-else class="w-4 h-4" aria-hidden="true" />
          {{ showAddForm ? 'Tutup Form' : 'Tambah Barang' }}
        </button>
      </div>
    </section>

    <!-- Tambah Barang: the name is checked against Master Barang before saving -->
    <section
      v-if="auth.can('BOLTS_MANAGE') && showAddForm"
      aria-labelledby="add-item-title"
      class="bg-white dark:bg-[#121215] p-5 rounded-2xl border border-zinc-300 dark:border-zinc-800 shadow-sm space-y-4"
    >
      <div>
        <h2 id="add-item-title" class="text-sm font-bold text-zinc-900 dark:text-zinc-100">Tambah Barang</h2>
        <p class="text-xs text-zinc-600 dark:text-zinc-400">Untuk barang yang belum ada di katalog. Sistem mengecek dulu apakah namanya sudah tersedia. Barang tanpa foto mendapat gambar ilustrasi; foto bisa ditambah setelah disimpan.</p>
      </div>
      <div class="flex flex-wrap gap-2" role="radiogroup" aria-label="Jenis barang">
        <FilterChip v-for="k in ITEM_TYPES" :key="k.value" :label="k.label" :active="addForm.itemType === k.value" @click="addForm.itemType = k.value" />
      </div>
      <form @submit.prevent="submitAddItem" class="flex flex-wrap items-end gap-3">
        <div class="flex-1 min-w-[240px]">
          <label for="add-name" class="block text-[11px] font-mono uppercase text-zinc-600 dark:text-zinc-400 mb-1">Nama barang</label>
          <input id="add-name" v-model="addForm.name" type="text" required :placeholder="NAME_HINTS[addForm.itemType]" class="w-full min-h-[44px] px-3 py-2 rounded-xl bg-zinc-50 dark:bg-[#18181c] border border-zinc-400 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100" />
        </div>
        <template v-if="isSizedType(addForm.itemType)">
          <div>
            <label for="add-diameter" class="block text-[11px] font-mono uppercase text-zinc-600 dark:text-zinc-400 mb-1">Diameter Ø (mm)</label>
            <input id="add-diameter" v-model.number="addForm.diameterMm" type="number" min="1" max="30" step="0.5" placeholder="opsional" class="w-28 min-h-[44px] px-3 py-2 rounded-xl bg-zinc-50 dark:bg-[#18181c] border border-zinc-400 dark:border-zinc-700 text-sm font-mono text-zinc-900 dark:text-zinc-100" />
          </div>
          <div v-if="addForm.itemType === 'BAUT'">
            <label for="add-length" class="block text-[11px] font-mono uppercase text-zinc-600 dark:text-zinc-400 mb-1">Panjang (mm)</label>
            <input id="add-length" v-model.number="addForm.lengthMm" type="number" min="1" max="300" step="0.5" placeholder="opsional" class="w-28 min-h-[44px] px-3 py-2 rounded-xl bg-zinc-50 dark:bg-[#18181c] border border-zinc-400 dark:border-zinc-700 text-sm font-mono text-zinc-900 dark:text-zinc-100" />
          </div>
        </template>
        <button
          type="submit"
          :disabled="!addForm.name.trim() || Boolean(existingItem) || isAdding"
          class="min-h-[44px] px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 text-sm font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-default"
        >
          {{ isAdding ? 'Menyimpan...' : 'Simpan barang' }}
        </button>
        <p v-if="existingItem" role="status" class="basis-full text-sm text-amber-800 dark:text-amber-300">
          <strong>{{ existingItem.name }}</strong> sudah ada di Master Barang ({{ existingItem.code }}).
          <button type="button" @click="openGallery(existingItem)" class="underline font-semibold cursor-pointer">Buka barangnya</button>
        </p>
        <p v-else-if="addForm.name.trim()" class="basis-full text-xs text-emerald-700 dark:text-emerald-400">Nama ini belum ada, bisa ditambahkan.</p>
        <p v-if="addError" role="alert" class="basis-full text-xs font-medium text-rose-700 dark:text-rose-400">{{ addError }}</p>
      </form>
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
      <span class="sr-only">Memuat Master Barang...</span>
    </div>

    <!-- Items Grid -->
    <div v-else class="space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div class="w-full sm:max-w-sm">
          <SearchInput v-model="specSearch" placeholder="Cari nama barang atau ukuran (M6x20)..." aria-label="Cari barang" />
        </div>
        <p class="text-xs font-mono text-zinc-600 dark:text-zinc-400">
          {{ filteredSpecs.length }} dari {{ specs.length }} barang
        </p>
      </div>
      <div class="flex flex-wrap gap-2" aria-label="Jenis barang">
        <FilterChip v-for="c in typeChips" :key="c.value" :label="c.label" :count="c.count" :active="typeFilter === c.value" @click="typeFilter = c.value" />
      </div>

      <EmptyState
        v-if="filteredSpecs.length === 0"
        :icon="Nut"
        title="Barang tidak ditemukan"
        :description="specSearch ? `Tidak ada barang yang cocok dengan “${specSearch}”.` : 'Belum ada barang di jenis ini.'"
        action-label="Tampilkan semua"
        @action="specSearch = ''; typeFilter = 'all'"
      />

      <div v-else class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        <ItemCard
          v-for="s in visibleSpecs"
          :key="s.id"
          :item="{ ...s, positionName: [s.code, itemSize(s)].filter(Boolean).join(' • '), quantity: isInstallable(s) ? s._count?.requirements || 0 : s._count?.packageItems || 0 }"
          :quantity-label="isInstallable(s) ? 'posisi' : 'bundling'"
          @select="openGallery"
        />
      </div>
      <div v-if="visibleSpecs.length < filteredSpecs.length" class="flex justify-center">
        <button
          type="button"
          @click="pageSize += PAGE_STEP"
          class="min-h-[44px] px-5 py-2 rounded-xl border border-zinc-400 dark:border-zinc-700 text-sm font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
        >
          Tampilkan {{ Math.min(PAGE_STEP, filteredSpecs.length - visibleSpecs.length) }} barang lagi
        </button>
      </div>
    </div>

    <PhotoGalleryModal
      v-if="selectedSpecForGallery"
      :is-open="Boolean(selectedSpecForGallery)"
      category-title="Foto Barang"
      :item-title="itemName(selectedSpecForGallery)"
      :item-subtitle="[selectedSpecForGallery.code, itemTypeLabel(selectedSpecForGallery.itemType), itemSize(selectedSpecForGallery), selectedSpecForGallery.notes].filter(Boolean).join(' • ')"
      :images="selectedSpecForGallery.images || []"
      :can-manage="auth.can('BOLTS_MANAGE')"
      :upload-endpoint="`/api/bolt-specs/${selectedSpecForGallery.id}/images`"
      :delete-endpoint-base="`/api/bolt-specs/${selectedSpecForGallery.id}/images`"
      :primary-endpoint-base="`/api/bolt-specs/${selectedSpecForGallery.id}/images`"
      :auth-headers="auth.authHeaders"
      @close="selectedSpecForGallery = null"
      @updated="onGalleryUpdated"
    >
      <!-- Ubah Barang: name, and the size of a bolt/nut/ring; a generated picture follows the change -->
      <template v-if="auth.can('BOLTS_MANAGE')" #details>
        <form
          @submit.prevent="saveItem"
          class="p-3 sm:p-4 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-[#18181c] flex flex-wrap items-end gap-3"
        >
          <p class="basis-full flex items-center gap-2 text-sm font-bold text-zinc-900 dark:text-zinc-100">
            <Pencil class="w-4 h-4" aria-hidden="true" />
            Ubah barang
          </p>
          <div class="flex-1 min-w-[220px]">
            <label for="edit-name" class="block text-[11px] font-mono uppercase text-zinc-600 dark:text-zinc-400 mb-1">Nama barang</label>
            <input
              id="edit-name"
              v-model="editForm.name"
              type="text"
              required
              class="w-full min-h-[44px] px-3 py-2 rounded-xl bg-white dark:bg-[#121215] border border-zinc-400 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100"
            />
          </div>
          <template v-if="isSizedType(selectedSpecForGallery.itemType)">
            <div>
              <label for="edit-diameter" class="block text-[11px] font-mono uppercase text-zinc-600 dark:text-zinc-400 mb-1">Diameter Ø (mm)</label>
              <input
                id="edit-diameter"
                v-model.number="editForm.diameterMm"
                type="number"
                min="1"
                max="30"
                step="0.5"
                placeholder="–"
                class="w-28 min-h-[44px] px-3 py-2 rounded-xl bg-white dark:bg-[#121215] border border-zinc-400 dark:border-zinc-700 text-sm font-mono text-zinc-900 dark:text-zinc-100"
              />
            </div>
            <div v-if="selectedSpecForGallery.itemType === 'BAUT'">
              <label for="edit-length" class="block text-[11px] font-mono uppercase text-zinc-600 dark:text-zinc-400 mb-1">Panjang (mm)</label>
              <input
                id="edit-length"
                v-model.number="editForm.lengthMm"
                type="number"
                min="1"
                max="300"
                step="0.5"
                placeholder="–"
                class="w-28 min-h-[44px] px-3 py-2 rounded-xl bg-white dark:bg-[#121215] border border-zinc-400 dark:border-zinc-700 text-sm font-mono text-zinc-900 dark:text-zinc-100"
              />
            </div>
          </template>
          <button
            type="submit"
            :disabled="!itemChanged || isSavingItem"
            class="min-h-[44px] px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 text-sm font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-default"
          >
            {{ isSavingItem ? 'Menyimpan...' : 'Simpan perubahan' }}
          </button>
          <p v-if="editError" role="alert" class="basis-full text-xs font-medium text-rose-700 dark:text-rose-400">{{ editError }}</p>
          <p v-else class="basis-full text-[11px] text-zinc-500 dark:text-zinc-400">
            Dipakai di {{ selectedSpecForGallery._count?.requirements || 0 }} posisi motor dan {{ selectedSpecForGallery._count?.packageItems || 0 }} isi bundling.
          </p>
        </form>
      </template>
    </PhotoGalleryModal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue';
import { Nut, Pencil, Plus, Ruler, X } from 'lucide-vue-next';
import { useAuthStore } from '../stores/auth';
import { useToast } from '../composables/useToast';
import { ITEM_TYPES, itemName, itemSize, itemTypeLabel } from '../utils/itemLabel';
import PhotoGalleryModal from '../components/PhotoGalleryModal.vue';
import SearchInput from '../components/ui/SearchInput.vue';
import StatPill from '../components/ui/StatPill.vue';
import FilterChip from '../components/ui/FilterChip.vue';
import ItemCard from '../components/ui/ItemCard.vue';
import EmptyState from '../components/ui/EmptyState.vue';
import SkeletonCard from '../components/ui/SkeletonCard.vue';

const auth = useAuthStore();
const toast = useToast();

const specs = ref([]);
const specSearch = ref('');
const selectedSpecForGallery = ref(null);
const isLoading = ref(false);
const errorMsg = ref('');

// sized goods carry Ø (and a bolt its length); bolts, nuts and rings are the ones fitted on a motor position
const isSizedType = (type) => ['BAUT', 'MUR', 'RING'].includes(type);
const isInstallable = (spec) => isSizedType(spec.itemType);
const normName = (name) => String(name || '').replace(/\s+/g, ' ').trim().toLowerCase();

const typeFilter = ref('all');
const typeChips = computed(() => [
  { value: 'all', label: 'Semua', count: specs.value.length },
  ...ITEM_TYPES
    .map((t) => ({ ...t, count: specs.value.filter((s) => s.itemType === t.value).length }))
    .filter((t) => t.count > 0),
]);

// Tambah Barang
const NAME_HINTS = {
  BAUT: 'Misal: M6x20 Bighead',
  MUR: 'Misal: Mur 10 M6 Hexagon',
  RING: 'Misal: Ring Titanium M6 Drat 10',
  EMBLEM: 'Misal: Emblem Vario 160',
  PART: 'Misal: Cover Kunci Kontak Vario 160',
  PERAWATAN: 'Misal: Cairan Peluntur Baut A',
  JASA: 'Misal: Jasa Bakar Emblem',
};
const showAddForm = ref(false);
const isAdding = ref(false);
const addError = ref('');
const addForm = reactive({ itemType: 'BAUT', name: '', diameterMm: null, lengthMm: null });
const existingItem = computed(() => {
  const name = normName(addForm.name);
  return name ? specs.value.find((s) => normName(s.name) === name) || null : null;
});

const toggleAddForm = () => {
  showAddForm.value = !showAddForm.value;
  addError.value = '';
};

const sortSpecs = () => specs.value.sort((a, b) => (a.catalogNo ?? 1e9) - (b.catalogNo ?? 1e9) || String(a.code).localeCompare(String(b.code)));

const submitAddItem = async () => {
  if (!addForm.name.trim() || existingItem.value) return;
  isAdding.value = true;
  addError.value = '';
  try {
    const res = await auth.apiFetch('/api/bolt-specs/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...addForm }),
    });
    const data = await res.json();
    if (res.status === 409) {
      addError.value = data.error;
      const existing = specs.value.find((s) => s.id === data.existingId);
      if (existing) openGallery(existing);
      return;
    }
    if (!res.ok) throw new Error(data.error || 'Gagal menambah barang.');
    specs.value.push(data);
    sortSpecs();
    toast.success(`${data.name} ditambahkan ke Master Barang`);
    Object.assign(addForm, { name: '', diameterMm: null, lengthMm: null });
    openGallery(specs.value.find((s) => s.id === data.id));
  } catch (err) {
    addError.value = err.message;
  } finally {
    isAdding.value = false;
  }
};

const filteredSpecs = computed(() => {
  // "M6x20", "m6 x 20" and "6x20" all find the same size
  const q = specSearch.value.trim().toLowerCase().replace(/\s+/g, '').replace('×', 'x');
  const byType = typeFilter.value === 'all' ? specs.value : specs.value.filter((s) => s.itemType === typeFilter.value);
  if (!q) return byType;
  return byType.filter((s) =>
    s.code?.toLowerCase().includes(q) ||
    s.name?.toLowerCase().replace(/\s+/g, '').includes(q) ||
    itemSize(s).toLowerCase().replace(/\s+/g, '').replace('×', 'x').includes(q) ||
    s.notes?.toLowerCase().includes(q)
  );
});

// 400+ catalog items: render in pages so the grid stays quick on the shop's phones
const PAGE_STEP = 60;
const pageSize = ref(PAGE_STEP);
const visibleSpecs = computed(() => filteredSpecs.value.slice(0, pageSize.value));
watch([specSearch, typeFilter], () => { pageSize.value = PAGE_STEP; });

const loadData = async () => {
  errorMsg.value = '';
  isLoading.value = true;
  try {
    const res = await auth.apiFetch('/api/bolt-specs');
    if (!res.ok) throw new Error('Gagal memuat Master Barang.');
    const data = await res.json();
    specs.value = Array.isArray(data) ? data : [];
  } catch (err) {
    console.error(err);
    errorMsg.value = err.message === 'Failed to fetch'
      ? 'Tidak dapat terhubung ke server gerai. Periksa sambungan Wi-Fi lalu ketuk Muat Ulang.'
      : err.message;
  } finally {
    isLoading.value = false;
  }
};

// Ubah Barang
const editForm = reactive({ name: '', diameterMm: null, lengthMm: null });
const isSavingItem = ref(false);
const editError = ref('');
const sizeOrNull = (v) => (Number(v) > 0 ? Number(v) : null);
const itemChanged = computed(() => {
  const spec = selectedSpecForGallery.value;
  if (!spec) return false;
  return normName(editForm.name) !== normName(spec.name)
    || sizeOrNull(editForm.diameterMm) !== sizeOrNull(spec.diameterMm)
    || sizeOrNull(editForm.lengthMm) !== sizeOrNull(spec.lengthMm);
});

const openGallery = (spec) => {
  const found = specs.value.find((s) => s.id === spec.id) || spec;
  selectedSpecForGallery.value = found;
  Object.assign(editForm, { name: found.name || '', diameterMm: sizeOrNull(found.diameterMm), lengthMm: sizeOrNull(found.lengthMm) });
  editError.value = '';
};

const onGalleryUpdated = (updatedImages) => {
  if (selectedSpecForGallery.value) {
    selectedSpecForGallery.value.images = updatedImages;
  }
};

const saveItem = async () => {
  const spec = selectedSpecForGallery.value;
  if (!spec || !itemChanged.value) return;
  isSavingItem.value = true;
  editError.value = '';
  try {
    const res = await auth.apiFetch(`/api/bolt-specs/${spec.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editForm.name, diameterMm: editForm.diameterMm || 0, lengthMm: editForm.lengthMm || 0 }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal mengubah barang.');
    Object.assign(spec, data);
    toast.success(`${data.name} disimpan`);
  } catch (err) {
    editError.value = err.message;
  } finally {
    isSavingItem.value = false;
  }
};

onMounted(loadData);
</script>
