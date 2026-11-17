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
          Semua barang toko: baut dan mur (satu kartu satu ukuran, dipakai semua merek motor) serta emblem. Ketuk kartu untuk melihat foto{{ auth.can('BOLTS_MANAGE') ? ' atau mengubah ukurannya' : '' }}.
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

    <!-- Tambah Barang (admin): checks the size/name against Master Barang before saving -->
    <section
      v-if="auth.can('BOLTS_MANAGE') && showAddForm"
      aria-labelledby="add-item-title"
      class="bg-white dark:bg-[#121215] p-5 rounded-2xl border border-zinc-300 dark:border-zinc-800 shadow-sm space-y-4"
    >
      <div>
        <h2 id="add-item-title" class="text-sm font-bold text-zinc-900 dark:text-zinc-100">Tambah Barang</h2>
        <p class="text-xs text-zinc-600 dark:text-zinc-400">Untuk melengkapi ukuran baut yang belum ada, atau menambah emblem. Sistem mengecek dulu apakah barangnya sudah tersedia.</p>
      </div>
      <div class="flex flex-wrap gap-2" role="radiogroup" aria-label="Jenis barang">
        <FilterChip v-for="k in ITEM_KINDS" :key="k.value" :label="k.label" :active="addForm.kind === k.value" @click="addForm.kind = k.value" />
      </div>
      <form @submit.prevent="submitAddItem" class="flex flex-wrap items-end gap-3">
        <template v-if="addForm.kind === 'EMBLEM'">
          <div class="flex-1 min-w-[220px]">
            <label for="add-name" class="block text-[11px] font-mono uppercase text-zinc-600 dark:text-zinc-400 mb-1">Nama emblem</label>
            <input id="add-name" v-model="addForm.name" type="text" required placeholder="Misal: Emblem Honda Wing Titanium" class="w-full min-h-[44px] px-3 py-2 rounded-xl bg-zinc-50 dark:bg-[#18181c] border border-zinc-400 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100" />
          </div>
          <div class="flex-1 min-w-[220px]">
            <label for="add-notes" class="block text-[11px] font-mono uppercase text-zinc-600 dark:text-zinc-400 mb-1">Catatan (opsional)</label>
            <input id="add-notes" v-model="addForm.notes" type="text" placeholder="Misal: warna biru, ukuran 6 cm" class="w-full min-h-[44px] px-3 py-2 rounded-xl bg-zinc-50 dark:bg-[#18181c] border border-zinc-400 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100" />
          </div>
        </template>
        <template v-else>
          <div>
            <label for="add-diameter" class="block text-[11px] font-mono uppercase text-zinc-600 dark:text-zinc-400 mb-1">Diameter Ø (mm)</label>
            <input id="add-diameter" v-model.number="addForm.diameterMm" type="number" min="1" max="30" step="0.5" required class="w-28 min-h-[44px] px-3 py-2 rounded-xl bg-zinc-50 dark:bg-[#18181c] border border-zinc-400 dark:border-zinc-700 text-sm font-mono text-zinc-900 dark:text-zinc-100" />
          </div>
          <div v-if="addForm.kind === 'BAUT'">
            <label for="add-length" class="block text-[11px] font-mono uppercase text-zinc-600 dark:text-zinc-400 mb-1">Panjang (mm)</label>
            <input id="add-length" v-model.number="addForm.lengthMm" type="number" min="1" max="300" step="0.5" required class="w-28 min-h-[44px] px-3 py-2 rounded-xl bg-zinc-50 dark:bg-[#18181c] border border-zinc-400 dark:border-zinc-700 text-sm font-mono text-zinc-900 dark:text-zinc-100" />
          </div>
        </template>
        <button
          type="submit"
          :disabled="!addCode || Boolean(existingItem) || isAdding"
          class="min-h-[44px] px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 text-sm font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-default"
        >
          {{ isAdding ? 'Menyimpan...' : addCode ? `Simpan ${addCode}` : 'Simpan' }}
        </button>
        <p v-if="existingItem" role="status" class="basis-full text-sm text-amber-800 dark:text-amber-300">
          <strong>{{ existingItem.code }}</strong> sudah ada di Master Barang.
          <button type="button" @click="openGallery(existingItem)" class="underline font-semibold cursor-pointer">Buka barangnya</button>
        </p>
        <p v-else-if="addCode" class="basis-full text-xs text-emerald-700 dark:text-emerald-400">{{ addCode }} belum ada, bisa ditambahkan.</p>
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
      <span class="sr-only">Memuat koleksi baut...</span>
    </div>

    <!-- Specs Grid -->
    <div v-else class="space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div class="w-full sm:max-w-sm">
          <SearchInput v-model="specSearch" placeholder="Cari ukuran (M6x16) atau nama emblem..." aria-label="Cari barang" />
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
          v-for="s in filteredSpecs"
          :key="s.id"
          :item="{ ...s, quantity: s.itemType === 'EMBLEM' ? s._count?.packageItems || 0 : s._count?.requirements || 0 }"
          :quantity-label="s.itemType === 'EMBLEM' ? 'bundling' : 'posisi'"
          @select="openGallery"
        />
      </div>
    </div>

    <PhotoGalleryModal
      v-if="selectedSpecForGallery"
      :is-open="Boolean(selectedSpecForGallery)"
      category-title="Foto Barang"
      :item-title="selectedSpecForGallery.itemType === 'EMBLEM' ? selectedSpecForGallery.name || selectedSpecForGallery.code : selectedSpecForGallery.code"
      :item-subtitle="selectedSpecForGallery.itemType === 'EMBLEM'
        ? `Emblem • ${selectedSpecForGallery.notes || selectedSpecForGallery.code}`
        : `${selectedSpecForGallery.headType} M${Number(selectedSpecForGallery.diameterMm)} × ${formatLength(selectedSpecForGallery.lengthMm, 'mm')} • ${formatMaterialFinish(selectedSpecForGallery)}`"
      :images="selectedSpecForGallery.images || []"
      :can-manage="auth.can('BOLTS_MANAGE')"
      :upload-endpoint="`/api/bolt-specs/${selectedSpecForGallery.id}/images`"
      :delete-endpoint-base="`/api/bolt-specs/${selectedSpecForGallery.id}/images`"
      :primary-endpoint-base="`/api/bolt-specs/${selectedSpecForGallery.id}/images`"
      :auth-headers="auth.authHeaders"
      @close="selectedSpecForGallery = null"
      @updated="onGalleryUpdated"
    >
      <!-- Admin: edit the size right here; the code and the size illustration follow it -->
      <template v-if="auth.can('BOLTS_MANAGE') && selectedSpecForGallery.itemType !== 'EMBLEM'" #details>
        <form
          @submit.prevent="saveSize"
          class="p-3 sm:p-4 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-[#18181c] flex flex-wrap items-end gap-3"
        >
          <p class="basis-full flex items-center gap-2 text-sm font-bold text-zinc-900 dark:text-zinc-100">
            <Ruler class="w-4 h-4" aria-hidden="true" />
            Ubah ukuran
          </p>
          <div>
            <label for="size-diameter" class="block text-[11px] font-mono uppercase text-zinc-600 dark:text-zinc-400 mb-1">Diameter Ø (mm)</label>
            <input
              id="size-diameter"
              v-model.number="sizeForm.diameterMm"
              type="number"
              min="1"
              max="30"
              step="0.5"
              required
              class="w-28 min-h-[44px] px-3 py-2 rounded-xl bg-white dark:bg-[#121215] border border-zinc-400 dark:border-zinc-700 text-sm font-mono text-zinc-900 dark:text-zinc-100"
            />
          </div>
          <div v-if="!isNut">
            <label for="size-length" class="block text-[11px] font-mono uppercase text-zinc-600 dark:text-zinc-400 mb-1">Panjang (mm)</label>
            <input
              id="size-length"
              v-model.number="sizeForm.lengthMm"
              type="number"
              min="1"
              max="300"
              step="0.5"
              required
              class="w-28 min-h-[44px] px-3 py-2 rounded-xl bg-white dark:bg-[#121215] border border-zinc-400 dark:border-zinc-700 text-sm font-mono text-zinc-900 dark:text-zinc-100"
            />
          </div>
          <p v-else class="text-xs text-zinc-600 dark:text-zinc-400 pb-3">Mur tidak punya panjang.</p>
          <button
            type="submit"
            :disabled="!sizeChanged || isSavingSize"
            class="min-h-[44px] px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 text-sm font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-default"
          >
            {{ isSavingSize ? 'Menyimpan...' : sizeChanged ? `Simpan jadi ${previewCode}` : 'Simpan ukuran' }}
          </button>
          <p v-if="sizeError" role="alert" class="basis-full text-xs font-medium text-rose-700 dark:text-rose-400">{{ sizeError }}</p>
          <p v-else class="basis-full text-[11px] text-zinc-500 dark:text-zinc-400">
            Dipakai di {{ selectedSpecForGallery._count?.requirements || 0 }} posisi motor; kode dan gambar ilustrasi ikut berubah.
          </p>
        </form>
      </template>
    </PhotoGalleryModal>
  </div>
</template>

<script setup>
import { formatLength, formatMaterialFinish } from '../utils/boltSize';
import { ref, reactive, computed, onMounted } from 'vue';
import { Nut, Plus, Ruler, X } from 'lucide-vue-next';
import { useAuthStore } from '../stores/auth';
import { useToast } from '../composables/useToast';
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

const typeFilter = ref('all');
const typeChips = computed(() => [
  { value: 'all', label: 'Semua', count: specs.value.length },
  { value: 'BAUT', label: 'Baut & mur', count: specs.value.filter((s) => s.itemType !== 'EMBLEM').length },
  { value: 'EMBLEM', label: 'Emblem', count: specs.value.filter((s) => s.itemType === 'EMBLEM').length },
]);

// Tambah Barang: the code is derived the same way as on the server, so duplicates show up while typing
const ITEM_KINDS = [
  { value: 'BAUT', label: 'Baut' },
  { value: 'MUR', label: 'Mur' },
  { value: 'MUR_PEGAS', label: 'Mur pegas (klip)' },
  { value: 'EMBLEM', label: 'Emblem' },
];
const showAddForm = ref(false);
const isAdding = ref(false);
const addError = ref('');
const addForm = reactive({ kind: 'BAUT', diameterMm: null, lengthMm: null, name: '', notes: '' });
const addCode = computed(() => {
  if (addForm.kind === 'EMBLEM') {
    const slug = addForm.name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return slug ? `EMB-${slug}` : '';
  }
  const d = Number(addForm.diameterMm);
  if (!d) return '';
  if (addForm.kind === 'BAUT') return Number(addForm.lengthMm) ? `M${d}x${Number(addForm.lengthMm)}` : '';
  return `${addForm.kind === 'MUR_PEGAS' ? 'MUR-PEGAS' : 'MUR'}-M${d}`;
});
const existingItem = computed(() => (addCode.value ? specs.value.find((s) => s.code === addCode.value) || null : null));

const toggleAddForm = () => {
  showAddForm.value = !showAddForm.value;
  addError.value = '';
};

const sortSpecs = () => specs.value.sort((a, b) =>
  Number(a.itemType === 'EMBLEM') - Number(b.itemType === 'EMBLEM')
  || Number(a.diameterMm) - Number(b.diameterMm)
  || Number(a.lengthMm) - Number(b.lengthMm)
  || String(a.code).localeCompare(String(b.code)));

const submitAddItem = async () => {
  if (!addCode.value || existingItem.value) return;
  isAdding.value = true;
  addError.value = '';
  try {
    const res = await auth.apiFetch('/api/bolt-specs/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemType: addForm.kind, diameterMm: addForm.diameterMm, lengthMm: addForm.lengthMm, name: addForm.name, notes: addForm.notes }),
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
    toast.success(`${data.code} ditambahkan ke Master Barang`);
    Object.assign(addForm, { diameterMm: null, lengthMm: null, name: '', notes: '' });
    openGallery(specs.value.find((s) => s.id === data.id));
  } catch (err) {
    addError.value = err.message;
  } finally {
    isAdding.value = false;
  }
};

const sizeForm = reactive({ diameterMm: null, lengthMm: null });
const isSavingSize = ref(false);
const sizeError = ref('');

const filteredSpecs = computed(() => {
  // "M6x16", "m6 x 16" and "6x16" all find the same size
  const q = specSearch.value.trim().toLowerCase().replace(/\s+/g, '').replace('×', 'x');
  const byType = typeFilter.value === 'all'
    ? specs.value
    : specs.value.filter((s) => (typeFilter.value === 'EMBLEM' ? s.itemType === 'EMBLEM' : s.itemType !== 'EMBLEM'));
  if (!q) return byType;
  return byType.filter((s) =>
    s.code?.toLowerCase().includes(q) ||
    s.name?.toLowerCase().replace(/\s+/g, '').includes(q) ||
    s.headType?.toLowerCase().includes(q) ||
    s.notes?.toLowerCase().includes(q) ||
    s.finish?.toLowerCase().includes(q)
  );
});

const isNut = computed(() => Number(selectedSpecForGallery.value?.lengthMm) <= 0);
const sizeChanged = computed(() => {
  const spec = selectedSpecForGallery.value;
  if (!spec) return false;
  return Number(sizeForm.diameterMm) !== Number(spec.diameterMm)
    || (!isNut.value && Number(sizeForm.lengthMm) !== Number(spec.lengthMm));
});
// mirrors sizeCode() on the server (M6x16, MUR-M8, MUR-PEGAS-M5)
const previewCode = computed(() => {
  const spec = selectedSpecForGallery.value;
  if (!spec) return '';
  if (!isNut.value) return `M${Number(sizeForm.diameterMm)}x${Number(sizeForm.lengthMm)}`;
  return `${String(spec.headType).toLowerCase().includes('pegas') ? 'MUR-PEGAS' : 'MUR'}-M${Number(sizeForm.diameterMm)}`;
});

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

const openGallery = (spec) => {
  selectedSpecForGallery.value = specs.value.find((s) => s.id === spec.id) || spec;
  sizeForm.diameterMm = Number(spec.diameterMm);
  sizeForm.lengthMm = Number(spec.lengthMm);
  sizeError.value = '';
};

const onGalleryUpdated = (updatedImages) => {
  if (selectedSpecForGallery.value) {
    selectedSpecForGallery.value.images = updatedImages;
  }
};

const saveSize = async () => {
  const spec = selectedSpecForGallery.value;
  if (!spec || !sizeChanged.value) return;
  isSavingSize.value = true;
  sizeError.value = '';
  try {
    const res = await auth.apiFetch(`/api/bolt-specs/${spec.id}/size`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ diameterMm: sizeForm.diameterMm, lengthMm: sizeForm.lengthMm }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal mengubah ukuran baut.');
    const oldCode = spec.code;
    Object.assign(spec, data);
    sortSpecs();
    toast.success(oldCode === data.code ? `Ukuran ${data.code} disimpan` : `${oldCode} diubah menjadi ${data.code}`);
  } catch (err) {
    sizeError.value = err.message;
  } finally {
    isSavingSize.value = false;
  }
};

onMounted(loadData);
</script>
