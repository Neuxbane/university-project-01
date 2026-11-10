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
          Ringkasan
        </router-link>
        <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mt-1">
          Riwayat Sesi
        </h1>
        <p class="text-sm text-zinc-600 dark:text-zinc-400 mt-0.5">
          Semua sesi pengambilan baut yang pernah dibuat di gerai.
        </p>
      </div>

      <router-link
        to="/pick-list"
        class="min-h-[48px] px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-semibold text-sm rounded-xl shadow-sm inline-flex items-center justify-center gap-2 transition-all active:scale-[0.98] shrink-0"
      >
        <Plus class="w-4 h-4" aria-hidden="true" />
        Sesi Baru
      </router-link>
    </section>

    <!-- Filters -->
    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
      <SegmentedControl
        v-model="filterMode"
        :options="[
          { value: 'all', label: 'Semua', count: sessions.length },
          { value: 'in_progress', label: 'Berjalan', count: inProgressCount },
          { value: 'completed', label: 'Selesai', count: completedCount },
        ]"
      />
      <div class="w-full lg:w-72">
        <SearchInput v-model="searchQuery" placeholder="Cari motor atau petugas..." aria-label="Cari riwayat sesi" />
      </div>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3" role="status" aria-live="polite">
      <SkeletonCard v-for="n in 6" :key="n" />
      <span class="sr-only">Memuat riwayat sesi...</span>
    </div>

    <!-- Empty -->
    <EmptyState
      v-else-if="filteredSessions.length === 0"
      :icon="History"
      :title="sessions.length === 0 ? 'Belum ada sesi' : 'Tidak ada sesi yang cocok'"
      :description="sessions.length === 0 ? 'Sesi akan muncul di sini setelah kamu mulai ambil baut.' : 'Coba kata kunci atau filter lain.'"
      :action-label="sessions.length === 0 ? 'Pilih Motor' : 'Tampilkan Semua'"
      @action="sessions.length === 0 ? $router.push('/pick-list') : resetFilters()"
    />

    <!-- Session Grid -->
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
      <router-link
        v-for="s in filteredSessions"
        :key="s.id"
        :to="`/pick-list/${s.id}`"
        class="group bg-white dark:bg-[#121215] rounded-2xl border border-zinc-300 dark:border-zinc-800 hover:border-zinc-500 dark:hover:border-zinc-600 shadow-sm p-4 flex items-center gap-3.5 transition-all duration-150 hover:-translate-y-0.5 active:scale-[0.99]"
      >
        <ProgressRing
          :value="s.progressPercent"
          :size="56"
          :stroke-width="6"
          :tone="s.status === 'COMPLETED' ? 'emerald' : 'amber'"
        />
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <span class="font-mono text-[11px] text-zinc-600 dark:text-zinc-400">#{{ s.id }}</span>
            <span
              class="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border"
              :class="s.status === 'COMPLETED'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30'
                : 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30'"
            >
              {{ s.status === 'COMPLETED' ? 'SELESAI' : 'BERJALAN' }}
            </span>
          </div>
          <p class="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate mt-0.5">
            {{ s.motorcycleType.displayName }}
          </p>
          <p class="text-xs text-zinc-600 dark:text-zinc-400 font-mono truncate">
            {{ s.checkedItems }}/{{ s.totalItems }} item &bull; {{ s.creator.name }}
          </p>
          <p class="text-[11px] text-zinc-500 dark:text-zinc-500 font-mono truncate mt-0.5">
            {{ formatDateTime(s.createdAt) }}
          </p>
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
const isLoading = ref(false);
const filterMode = ref('all');
const searchQuery = ref('');

const inProgressCount = computed(() => sessions.value.filter((s) => s.status === 'IN_PROGRESS').length);
const completedCount = computed(() => sessions.value.filter((s) => s.status === 'COMPLETED').length);

const filteredSessions = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  return sessions.value.filter((s) => {
    if (filterMode.value === 'in_progress' && s.status !== 'IN_PROGRESS') return false;
    if (filterMode.value === 'completed' && s.status !== 'COMPLETED') return false;
    if (!q) return true;
    return (
      s.motorcycleType?.displayName?.toLowerCase().includes(q) ||
      s.creator?.name?.toLowerCase().includes(q) ||
      String(s.id).includes(q)
    );
  });
});

const resetFilters = () => {
  filterMode.value = 'all';
  searchQuery.value = '';
};

const loadSessions = async () => {
  isLoading.value = true;
  try {
    const res = await auth.apiFetch('/api/pick-lists/sessions?limit=100');
    if (!res.ok) throw new Error('Gagal memuat riwayat sesi.');
    const data = await res.json();
    sessions.value = Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('Error loading history:', err);
    sessions.value = [];
  } finally {
    isLoading.value = false;
  }
};

onMounted(loadSessions);
</script>
