<template>
  <div class="space-y-5">
    <!-- Header Card -->
    <div class="bg-white dark:bg-[#121215] p-5 sm:p-6 rounded-2xl border border-zinc-300 dark:border-zinc-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
      <div>
        <div class="flex items-center gap-2 mb-1">
          <span class="w-2 h-2 rounded-full bg-zinc-500" aria-hidden="true"></span>
          <span class="text-xs font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400">Data Induk</span>
        </div>
        <h1 class="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Tipe Motor &amp; Matriks Ukuran Baut
        </h1>
        <p class="text-sm text-zinc-600 dark:text-zinc-400 mt-0.5">
          Pilih motor untuk mengelola matriks baut, titik lokasi 3D/2D, dan foto close-up di halaman penuh
        </p>
      </div>

      <button
        v-if="auth.isAdmin"
        @click="toggleAddForm"
        type="button"
        class="min-h-[44px] px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-semibold text-sm rounded-xl shadow-sm transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
      >
        <span aria-hidden="true">{{ showAddForm ? '−' : '+' }}</span>
        <span>{{ showAddForm ? 'Tutup Form' : 'Tambah Tipe Motor' }}</span>
      </button>
    </div>

    <!-- Inline Add Motor Panel (No Data Modal) -->
    <section
      v-if="auth.isAdmin && showAddForm"
      class="bg-white dark:bg-[#121215] p-5 rounded-2xl border border-zinc-300 dark:border-zinc-800 shadow-sm space-y-4"
    >
      <div class="flex items-center justify-between gap-2">
        <h2 class="text-sm font-bold text-zinc-900 dark:text-zinc-100">Tambah Tipe Motor Baru</h2>
        <button
          type="button"
          @click="showAddForm = false"
          class="min-h-[36px] px-2.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white cursor-pointer"
        >
          Batal
        </button>
      </div>

      <div
        v-if="addMotorErrorMsg"
        role="alert"
        class="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-300 dark:border-rose-500/30 text-xs font-medium text-rose-700 dark:text-rose-400"
      >
        {{ addMotorErrorMsg }}
      </div>

      <form @submit.prevent="handleCreateMotor" class="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
        <div class="sm:col-span-2">
          <label for="motor-brand" class="block text-[11px] font-mono uppercase text-zinc-600 dark:text-zinc-400 mb-1">
            Merek
          </label>
          <input
            id="motor-brand"
            v-model="newMotor.brand"
            type="text"
            list="motor-brands-list"
            required
            placeholder="Ketik merek (mis: Vespa, Honda)"
            class="w-full min-h-[44px] px-3 py-2 rounded-xl bg-zinc-50 dark:bg-[#18181c] border border-zinc-400 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100"
          />
          <datalist id="motor-brands-list">
            <option v-for="b in availableBrands" :key="b" :value="b" />
          </datalist>
        </div>

        <div class="sm:col-span-3">
          <label for="motor-model" class="block text-[11px] font-mono uppercase text-zinc-600 dark:text-zinc-400 mb-1">
            Model
          </label>
          <input
            id="motor-model"
            v-model="newMotor.model"
            type="text"
            required
            placeholder="Misal: Stylo / XMAX"
            class="w-full min-h-[44px] px-3 py-2 rounded-xl bg-zinc-50 dark:bg-[#18181c] border border-zinc-400 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100"
          />
        </div>

        <div class="sm:col-span-3">
          <label for="motor-variant" class="block text-[11px] font-mono uppercase text-zinc-600 dark:text-zinc-400 mb-1">
            Varian / Tipe
          </label>
          <input
            id="motor-variant"
            v-model="newMotor.variant"
            type="text"
            required
            placeholder="Misal: 160 ABS"
            class="w-full min-h-[44px] px-3 py-2 rounded-xl bg-zinc-50 dark:bg-[#18181c] border border-zinc-400 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100"
          />
        </div>

        <div class="sm:col-span-2">
          <label for="motor-year-start" class="block text-[11px] font-mono uppercase text-zinc-600 dark:text-zinc-400 mb-1">
            Tahun Mulai
          </label>
          <input
            id="motor-year-start"
            v-model.number="newMotor.yearStart"
            type="number"
            min="1990"
            max="2035"
            required
            class="w-full min-h-[44px] px-3 py-2 rounded-xl bg-zinc-50 dark:bg-[#18181c] border border-zinc-400 dark:border-zinc-700 text-sm font-mono text-zinc-900 dark:text-zinc-100"
          />
        </div>

        <div class="sm:col-span-2">
          <button
            type="submit"
            :disabled="isSubmittingMotor"
            class="w-full min-h-[44px] px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 text-sm font-bold cursor-pointer disabled:opacity-40"
          >
            {{ isSubmittingMotor ? 'Menyimpan...' : 'Simpan Motor' }}
          </button>
        </div>
      </form>
    </section>

    <!-- Filters & Search -->
    <div class="space-y-2.5">
      <div class="flex flex-col md:flex-row gap-3">
        <div class="flex-1">
          <label for="motor-search-input" class="sr-only">Cari merek, model, atau varian motor</label>
          <input
            id="motor-search-input"
            v-model="search"
            type="text"
            placeholder="Cari merek, model, atau varian motor..."
            class="w-full min-h-[44px] px-3.5 py-2.5 bg-white dark:bg-[#121215] border border-zinc-500 rounded-xl text-base sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 dark:placeholder:text-zinc-400 shadow-sm"
          />
        </div>
        <div class="flex flex-wrap sm:flex-nowrap items-center gap-1 bg-zinc-100 dark:bg-[#18181c] p-1 rounded-xl border border-zinc-300 dark:border-zinc-700 overflow-x-auto max-w-full">
          <button
            v-for="b in brandFilterOptions"
            :key="b"
            @click="selectedBrand = b"
            type="button"
            class="min-h-[44px] px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all cursor-pointer whitespace-nowrap"
            :class="[selectedBrand === b ? 'bg-white dark:bg-[#121215] text-zinc-900 dark:text-zinc-100 font-semibold shadow-sm' : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100']"
          >
            {{ b }}
          </button>
        </div>
      </div>

      <!-- Status Filter Chips (Aktif / Nonaktif) -->
      <div class="flex flex-wrap items-center gap-1.5">
        <button
          v-for="opt in statusFilterOptions"
          :key="opt.value"
          type="button"
          @click="selectedStatus = opt.value"
          class="min-h-[38px] px-3 py-1.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
          :class="selectedStatus === opt.value
            ? opt.value === 'inactive'
              ? 'bg-rose-600 text-white border-rose-600'
              : 'bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100'
            : 'bg-white dark:bg-[#121215] text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800'"
        >
          <span>{{ opt.label }}</span>
          <span class="font-mono text-[11px] opacity-80">({{ opt.count }})</span>
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
        @click="loadMotors"
        type="button"
        class="min-h-[44px] px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold cursor-pointer shrink-0"
      >
        Muat Ulang
      </button>
    </div>

    <!-- Roster Grid (Click card -> Full page /motorcycles/:motorId, ZERO data popups!) -->
    <div v-if="isLoading" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3" role="status" aria-live="polite">
      <SkeletonCard v-for="n in 8" :key="n" />
      <span class="sr-only">Memuat daftar tipe motor...</span>
    </div>

    <EmptyState
      v-else-if="filteredMotors.length === 0"
      :icon="Bike"
      title="Motor tidak ditemukan"
      description="Tidak ada motor yang cocok dengan filter atau pencarian."
      action-label="Tampilkan Semua"
      @action="search = ''; selectedBrand = 'Semua'; selectedStatus = 'all'"
    />

    <div v-else class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      <RosterCard
        v-for="m in filteredMotors"
        :key="m.id"
        :motorcycle="m"
        @select="goToManageMotor"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Bike } from 'lucide-vue-next';
import { useAuthStore } from '../stores/auth';
import { useToast } from '../composables/useToast';
import RosterCard from '../components/ui/RosterCard.vue';
import EmptyState from '../components/ui/EmptyState.vue';
import SkeletonCard from '../components/ui/SkeletonCard.vue';

const router = useRouter();
const auth = useAuthStore();
const toast = useToast();

const motorcycles = ref([]);
const search = ref('');
const selectedBrand = ref('Semua');
const selectedStatus = ref('all');
const isLoading = ref(false);
const errorMsg = ref('');

const showAddForm = ref(false);
const isSubmittingMotor = ref(false);
const addMotorErrorMsg = ref('');
const newMotor = ref({ brand: '', model: '', variant: '', yearStart: 2024, yearEnd: 2026 });

const availableBrands = computed(() => {
  const seen = new Map();
  for (const m of motorcycles.value) {
    const raw = (m.brand || '').trim();
    if (!raw) continue;
    const key = raw.toLowerCase();
    if (!seen.has(key)) seen.set(key, raw);
  }
  return Array.from(seen.values()).sort((a, b) => a.localeCompare(b));
});

const brandFilterOptions = computed(() => ['Semua', ...availableBrands.value]);

const statusFilterOptions = computed(() => {
  const activeCount = motorcycles.value.filter((m) => m.isActive !== false).length;
  const inactiveCount = motorcycles.value.length - activeCount;
  return [
    { value: 'all', label: 'Semua Status', count: motorcycles.value.length },
    { value: 'active', label: 'Aktif', count: activeCount },
    { value: 'inactive', label: 'Nonaktif', count: inactiveCount },
  ];
});

const filteredMotors = computed(() => {
  return motorcycles.value.filter((m) => {
    const matchStatus =
      selectedStatus.value === 'all'
      || (selectedStatus.value === 'active' && m.isActive !== false)
      || (selectedStatus.value === 'inactive' && m.isActive === false);
    const matchBrand = selectedBrand.value === 'Semua' || m.brand.toLowerCase() === selectedBrand.value.toLowerCase();
    const q = search.value.toLowerCase();
    const matchSearch = !q || m.displayName.toLowerCase().includes(q) || m.brand.toLowerCase().includes(q) || m.model.toLowerCase().includes(q);
    return matchStatus && matchBrand && matchSearch;
  });
});

const goToManageMotor = (motor) => {
  router.push(`/motorcycles/${motor.id}`);
};

const toggleAddForm = () => {
  addMotorErrorMsg.value = '';
  if (!showAddForm.value) {
    newMotor.value = { brand: '', model: '', variant: '', yearStart: 2024, yearEnd: 2026 };
  }
  showAddForm.value = !showAddForm.value;
};

const loadMotors = async () => {
  errorMsg.value = '';
  isLoading.value = true;
  try {
    const res = await auth.apiFetch('/api/motorcycles');
    if (!res.ok) throw new Error('Gagal memuat data tipe motor.');
    const data = await res.json();
    motorcycles.value = Array.isArray(data) ? data : [];
  } catch (err) {
    console.error(err);
    errorMsg.value = err.message === 'Failed to fetch'
      ? 'Tidak dapat terhubung ke server gerai. Periksa sambungan Wi-Fi lalu ketuk Muat Ulang.'
      : err.message;
  } finally {
    isLoading.value = false;
  }
};

const handleCreateMotor = async () => {
  if (isSubmittingMotor.value) return;
  addMotorErrorMsg.value = '';
  isSubmittingMotor.value = true;
  try {
    const res = await auth.apiFetch('/api/motorcycles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newMotor.value),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal menyimpan tipe motor.');

    showAddForm.value = false;
    toast.success(`Motor ${data.displayName} berhasil ditambahkan`);
    router.push(`/motorcycles/${data.id}`);
  } catch (err) {
    addMotorErrorMsg.value = err.message === 'Failed to fetch'
      ? 'Sambungan terputus saat menyimpan motor. Coba lagi.'
      : err.message;
  } finally {
    isSubmittingMotor.value = false;
  }
};

onMounted(loadMotors);
</script>
