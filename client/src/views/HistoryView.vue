<template>
  <div class="max-w-5xl mx-auto space-y-5">
    <!-- Header -->
    <section class="bg-white dark:bg-[#121215] p-5 sm:p-6 rounded-2xl border border-zinc-300 dark:border-zinc-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <router-link
          to="/dashboard"
          class="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition-colors"
        >
          <ArrowLeft class="w-3.5 h-3.5" aria-hidden="true" />
          Dashboard
        </router-link>
        <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mt-1">
          Riwayat
        </h1>
        <p class="text-sm text-zinc-600 dark:text-zinc-400 mt-0.5">
          Checklist Paket Full Bike dan Bundling pelanggan. Yang belum selesai (misalnya baru dipasang sebagian) bisa dilanjutkan kapan saja.
        </p>
      </div>

      <div class="flex flex-wrap gap-2 shrink-0">
        <router-link
          to="/pick-list"
          class="min-h-[44px] px-4 py-2 rounded-xl border border-zinc-400 dark:border-zinc-700 bg-zinc-50 hover:bg-zinc-100 dark:bg-[#18181c] dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-semibold text-sm inline-flex items-center gap-1.5"
        >
          <Plus class="w-4 h-4" aria-hidden="true" />
          Checklist Paket Full Bike
        </router-link>
        <router-link
          to="/bundling"
          class="min-h-[44px] px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-semibold text-sm inline-flex items-center gap-1.5"
        >
          <Plus class="w-4 h-4" aria-hidden="true" />
          Checklist Bundling
        </router-link>
      </div>
    </section>

    <!-- Filters -->
    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
      <div class="flex flex-col sm:flex-row gap-2">
        <SegmentedControl
          v-model="kindFilter"
          :options="[
            { value: 'all', label: 'Semua', count: records.length },
            { value: 'session', label: 'Paket Full Bike', count: records.filter((r) => r.kind === 'session').length },
            { value: 'claim', label: 'Bundling', count: records.filter((r) => r.kind === 'claim').length },
          ]"
        />
        <SegmentedControl
          v-model="statusFilter"
          :options="[
            { value: 'all', label: 'Semua status' },
            { value: 'open', label: 'Berjalan', count: records.filter((r) => !r.done).length },
            { value: 'done', label: 'Selesai', count: records.filter((r) => r.done).length },
          ]"
        />
      </div>
      <div class="w-full lg:w-72">
        <SearchInput v-model="searchQuery" placeholder="Cari motor, bundling, pembeli..." aria-label="Cari riwayat" />
      </div>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3" role="status" aria-live="polite">
      <SkeletonCard v-for="n in 6" :key="n" />
      <span class="sr-only">Memuat riwayat...</span>
    </div>

    <!-- Empty -->
    <EmptyState
      v-else-if="filteredRecords.length === 0"
      :icon="History"
      :title="records.length === 0 ? 'Belum ada riwayat' : 'Tidak ada yang cocok'"
      :description="records.length === 0 ? 'Riwayat muncul setelah tombol Mulai Checklist ditekan di Paket Full Bike atau Bundling.' : 'Coba kata kunci atau filter lain.'"
      :action-label="records.length === 0 ? 'Buka Bundling' : 'Tampilkan Semua'"
      @action="records.length === 0 ? $router.push('/bundling') : resetFilters()"
    />

    <!-- Records -->
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
      <router-link
        v-for="r in filteredRecords"
        :key="r.key"
        :to="r.to"
        class="group bg-white dark:bg-[#121215] rounded-2xl border border-zinc-300 dark:border-zinc-800 hover:border-zinc-500 dark:hover:border-zinc-600 shadow-sm p-4 flex items-center gap-3.5 transition-all duration-150 hover:-translate-y-0.5 active:scale-[0.99]"
      >
        <ProgressRing :value="r.progress" :size="56" :stroke-width="6" :tone="r.done ? 'emerald' : 'amber'" />
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-1.5">
            <span
              class="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border"
              :class="r.kind === 'claim'
                ? 'bg-violet-50 text-violet-800 border-violet-300 dark:bg-violet-500/15 dark:text-violet-300 dark:border-violet-500/30'
                : 'bg-sky-50 text-sky-800 border-sky-300 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/30'"
            >
              {{ r.kind === 'claim' ? 'BUNDLING' : 'PAKET FULL BIKE' }}
            </span>
            <span
              class="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border"
              :class="r.done
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30'
                : 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30'"
            >
              {{ r.done ? 'SELESAI' : 'BERJALAN' }}
            </span>
          </div>
          <p class="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate mt-0.5">{{ r.title }}</p>
          <p class="text-xs text-zinc-600 dark:text-zinc-400 font-mono truncate">{{ r.detail }}</p>
          <p class="text-[11px] text-zinc-500 dark:text-zinc-500 font-mono truncate mt-0.5">{{ formatDateTime(r.date) }}</p>
        </div>
        <ArrowRight class="w-4 h-4 text-zinc-500 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 shrink-0 transition-colors" aria-hidden="true" />
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { ArrowLeft, ArrowRight, History, Plus } from 'lucide-vue-next';
import { useAuthStore } from '../stores/auth';
import { formatDateTime } from '../utils/date';
import SegmentedControl from '../components/ui/SegmentedControl.vue';
import SearchInput from '../components/ui/SearchInput.vue';
import EmptyState from '../components/ui/EmptyState.vue';
import SkeletonCard from '../components/ui/SkeletonCard.vue';
import ProgressRing from '../components/ui/ProgressRing.vue';

const auth = useAuthStore();
const sessions = ref([]);
const claims = ref([]);
const isLoading = ref(false);
const kindFilter = ref('all');
const statusFilter = ref('all');
const searchQuery = ref('');

// One list for both kinds of usage: Paket Full Bike checklists and Bundling buyer claims
const records = computed(() => {
  const fromSessions = sessions.value.map((s) => ({
    kind: 'session',
    key: `s${s.id}`,
    to: `/history/paket/${s.id}`,
    title: s.package?.name ? `${s.motorcycleType.displayName} · ${s.package.name}` : s.motorcycleType.displayName,
    detail: `${s.checkedItems}/${s.totalItems} barang dicentang • ${s.buyerName || 'Pembeli belum diisi'}`,
    search: `${s.motorcycleType?.displayName} ${s.package?.name || ''} ${s.buyerName || ''} ${s.creator?.name || ''} ${s.id}`,
    done: s.status === 'COMPLETED',
    progress: s.progressPercent,
    date: s.createdAt,
  }));
  const fromClaims = claims.value.map((c) => {
    const claimed = c.items.filter((i) => i.claimed).length;
    return {
      kind: 'claim',
      key: `c${c.id}`,
      to: `/history/klaim/${c.id}`,
      title: c.package?.name || `Checklist #${c.id}`,
      detail: `${claimed}/${c.items.length} barang dicentang • ${c.buyerName || 'Pembeli belum diisi'}`,
      search: `${c.package?.name || ''} ${c.buyerName || ''} ${c.creator?.name || ''} ${c.id}`,
      done: Boolean(c.completedAt),
      progress: c.items.length ? Math.round((claimed / c.items.length) * 100) : 0,
      date: c.createdAt,
    };
  });
  return [...fromSessions, ...fromClaims].sort((a, b) => Number(a.done) - Number(b.done) || new Date(b.date) - new Date(a.date));
});

const filteredRecords = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  return records.value.filter((r) => {
    if (kindFilter.value !== 'all' && r.kind !== kindFilter.value) return false;
    if (statusFilter.value === 'open' && r.done) return false;
    if (statusFilter.value === 'done' && !r.done) return false;
    return !q || r.search.toLowerCase().includes(q);
  });
});

const resetFilters = () => {
  kindFilter.value = 'all';
  statusFilter.value = 'all';
  searchQuery.value = '';
};

const loadHistory = async () => {
  isLoading.value = true;
  try {
    const [sRes, cRes] = await Promise.all([
      auth.apiFetch('/api/pick-lists/sessions?limit=100'),
      auth.apiFetch('/api/bundle-claims?limit=100'),
    ]);
    sessions.value = sRes.ok ? await sRes.json() : [];
    claims.value = cRes.ok ? await cRes.json() : [];
  } catch (err) {
    console.error('Error loading history:', err);
    sessions.value = [];
    claims.value = [];
  } finally {
    isLoading.value = false;
  }
};

onMounted(loadHistory);
</script>
