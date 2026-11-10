<template>
  <div class="space-y-5">
    <!-- Hero / Welcome -->
    <section class="relative overflow-hidden rounded-3xl border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-[#121215] shadow-sm">
      <div class="absolute inset-0 bg-gradient-to-br from-zinc-100 via-transparent to-transparent dark:from-zinc-900/60 pointer-events-none" aria-hidden="true"></div>
      <div class="relative p-5 sm:p-7 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div class="min-w-0">
          <div class="flex items-center gap-2 mb-1.5">
            <span
              class="w-2 h-2 rounded-full shrink-0"
              :class="isBackendOnline ? 'bg-emerald-600 dark:bg-emerald-500' : 'bg-rose-600 dark:bg-rose-500'"
              aria-hidden="true"
            ></span>
            <span class="text-xs font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
              Server {{ isBackendOnline ? 'Terhubung' : 'Terputus' }} &bull; Port {{ backendPort }}
            </span>
          </div>
          <h1 class="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Selamat Datang, {{ auth.user?.name }}
          </h1>
          <p class="text-sm text-zinc-600 dark:text-zinc-400 mt-1.5 max-w-2xl leading-relaxed">
            Buku catatan operasional gerai. Pantau kelengkapan data, lanjutkan sesi yang tertunda, dan siapkan baut dalam hitungan menit.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2.5 shrink-0">
          <router-link
            to="/pick-list"
            class="min-h-[48px] px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-semibold text-sm rounded-xl shadow-sm inline-flex items-center gap-2 transition-all active:scale-[0.98]"
          >
            <Play class="w-4 h-4" aria-hidden="true" />
            Mulai Ambil Baut
          </router-link>
          <router-link
            to="/help/manual"
            class="min-h-[48px] px-4 py-2.5 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-medium text-sm rounded-xl border border-zinc-400 dark:border-zinc-700 inline-flex items-center gap-2 transition-all"
          >
            <BookOpen class="w-4 h-4" aria-hidden="true" />
            Buku Panduan
          </router-link>
        </div>
      </div>
    </section>

    <!-- Error -->
    <div
      v-if="errorMsg"
      role="alert"
      class="bg-rose-50 border border-rose-300 text-rose-800 dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-300 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm"
    >
      <span>{{ errorMsg }}</span>
      <button
        @click="loadDashboardData"
        type="button"
        class="min-h-[44px] px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold cursor-pointer shrink-0"
      >
        Muat Ulang
      </button>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="space-y-4" role="status" aria-live="polite">
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div v-for="n in 3" :key="n" class="h-28 rounded-2xl bg-zinc-200 dark:bg-zinc-800 animate-pulse"></div>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <SkeletonCard v-for="n in 4" :key="n" />
      </div>
      <span class="sr-only">Memuat ringkasan data bengkel...</span>
    </div>

    <template v-else>
      <!-- Progress Rings -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div class="bg-white dark:bg-[#121215] p-4 sm:p-5 rounded-2xl border border-zinc-300 dark:border-zinc-800 shadow-sm flex items-center gap-4">
          <ProgressRing :value="completenessPercent" :size="72" :stroke-width="7" tone="emerald" />
          <div class="min-w-0">
            <p class="text-xs font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400">Kelengkapan Data</p>
            <p class="text-lg font-bold text-zinc-900 dark:text-zinc-100">{{ completeMotors }} / {{ motorcycles.length }} motor</p>
            <p class="text-xs text-zinc-600 dark:text-zinc-400">Siap dipakai untuk ambil baut</p>
          </div>
        </div>

        <div class="bg-white dark:bg-[#121215] p-4 sm:p-5 rounded-2xl border border-zinc-300 dark:border-zinc-800 shadow-sm flex items-center gap-4">
          <ProgressRing :value="todayProgressPercent" :size="72" :stroke-width="7" tone="sky" />
          <div class="min-w-0">
            <p class="text-xs font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400">Sesi Hari Ini</p>
            <p class="text-lg font-bold text-zinc-900 dark:text-zinc-100">{{ todayCompleted }} / {{ todaySessions }} sesi</p>
            <p class="text-xs text-zinc-600 dark:text-zinc-400">Selesai lengkap hari ini</p>
          </div>
        </div>

        <div class="bg-white dark:bg-[#121215] p-4 sm:p-5 rounded-2xl border border-zinc-300 dark:border-zinc-800 shadow-sm flex items-center gap-4">
          <ProgressRing :value="activePercent" :size="72" :stroke-width="7" tone="amber" />
          <div class="min-w-0">
            <p class="text-xs font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400">Motor Aktif</p>
            <p class="text-lg font-bold text-zinc-900 dark:text-zinc-100">{{ activeMotors }} / {{ motorcycles.length }} motor</p>
            <p class="text-xs text-zinc-600 dark:text-zinc-400">Tampil di roster ambil baut</p>
          </div>
        </div>
      </div>

      <!-- Continue Last Session -->
      <section
        v-if="inProgressSession"
        class="relative overflow-hidden rounded-2xl border border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-4 sm:p-5"
      >
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div class="flex items-center gap-3.5 min-w-0">
            <div class="w-12 h-12 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0">
              <Play class="w-5 h-5" aria-hidden="true" />
            </div>
            <div class="min-w-0">
              <p class="text-[11px] font-mono uppercase tracking-wider text-amber-800 dark:text-amber-300 font-bold">Lanjutkan Sesi Terakhir</p>
              <h2 class="text-base font-bold text-zinc-900 dark:text-zinc-100 truncate">
                {{ inProgressSession.motorcycleType.displayName }}
              </h2>
              <p class="text-xs text-zinc-700 dark:text-zinc-300 font-mono">
                {{ inProgressSession.checkedItems }}/{{ inProgressSession.totalItems }} item &bull; {{ inProgressSession.progressPercent }}%
              </p>
            </div>
          </div>

          <div class="flex items-center gap-3 shrink-0">
            <div class="w-28 hidden sm:block">
              <ProgressBar :value="inProgressSession.progressPercent" :show-percent="false" tone="amber" />
            </div>
            <router-link
              :to="`/pick-list/${inProgressSession.id}`"
              class="min-h-[44px] px-4 py-2.5 bg-amber-700 hover:bg-amber-800 text-white text-sm font-semibold rounded-xl inline-flex items-center gap-2 transition-colors"
            >
              Lanjutkan
              <ArrowRight class="w-4 h-4" aria-hidden="true" />
            </router-link>
          </div>
        </div>
      </section>

      <!-- Completeness Warnings -->
      <section v-if="incompleteMotors.length > 0" class="bg-white dark:bg-[#121215] rounded-2xl border border-zinc-300 dark:border-zinc-800 p-4 sm:p-5 shadow-sm">
        <div class="flex items-center justify-between gap-3 mb-3">
          <div>
            <h2 class="text-base font-bold text-zinc-900 dark:text-zinc-100">Perlu Dilengkapi</h2>
            <p class="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">Motor berikut belum punya data baut yang cukup</p>
          </div>
          <router-link
            to="/motorcycles"
            class="min-h-[44px] px-3 inline-flex items-center text-xs font-semibold text-zinc-800 dark:text-zinc-200 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition-colors shrink-0"
          >
            Kelola Data
          </router-link>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          <router-link
            v-for="motor in incompleteMotors"
            :key="motor.id"
            to="/motorcycles"
            class="flex items-center gap-3 p-3 rounded-xl border border-dashed border-zinc-400 dark:border-zinc-700 hover:border-zinc-600 dark:hover:border-zinc-500 transition-colors"
          >
            <div class="w-9 h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
              <Bike class="w-4 h-4 text-zinc-600 dark:text-zinc-400" aria-hidden="true" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">{{ motor.model }} {{ motor.variant }}</p>
              <p class="text-xs text-zinc-600 dark:text-zinc-400 font-mono">{{ motor._count?.requirements || 0 }} titik baut</p>
            </div>
            <ArrowRight class="w-4 h-4 text-zinc-500 shrink-0" aria-hidden="true" />
          </router-link>
        </div>
      </section>

      <!-- Recent Sessions as Quest Cards -->
      <section>
        <div class="flex items-center justify-between gap-3 mb-3">
          <div>
            <h2 class="text-base font-bold text-zinc-900 dark:text-zinc-100">Riwayat Sesi</h2>
            <p class="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">Aktivitas penyiapan baut terbaru</p>
          </div>
          <router-link
            to="/pick-list"
            class="min-h-[44px] px-3 inline-flex items-center text-xs font-semibold text-zinc-800 dark:text-zinc-200 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition-colors"
          >
            + Sesi Baru
          </router-link>
        </div>

        <EmptyState
          v-if="recentSessions.length === 0"
          :icon="History"
          title="Belum ada riwayat sesi"
          description="Mulai ambil baut untuk membuat sesi pertama."
          action-label="Mulai Ambil Baut"
          @action="$router.push('/pick-list')"
        />

        <div v-else class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          <router-link
            v-for="s in recentSessions"
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
            </div>
            <ArrowRight class="w-4 h-4 text-zinc-500 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 shrink-0 transition-colors" aria-hidden="true" />
          </router-link>
        </div>
      </section>

      <!-- Motor Roster Completeness -->
      <section>
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div>
            <h2 class="text-base font-bold text-zinc-900 dark:text-zinc-100">Roster Motor</h2>
            <p class="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">Kesiapan data ukuran baut per model</p>
          </div>
          <div class="w-full sm:w-72">
            <SearchInput v-model="searchQuery" placeholder="Cari merek atau model..." aria-label="Cari motor di dashboard" />
          </div>
        </div>

        <EmptyState
          v-if="filteredMotors.length === 0"
          :icon="Bike"
          title="Motor tidak ditemukan"
          :description="`Tidak ada motor yang cocok dengan “${searchQuery}”.`"
          action-label="Hapus Pencarian"
          @action="searchQuery = ''"
        />

        <div v-else class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <RosterCard
            v-for="motor in filteredMotors"
            :key="motor.id"
            :motorcycle="motor"
            @select="$router.push('/motorcycles')"
          />
        </div>
      </section>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import {
  ArrowRight,
  Bike,
  BookOpen,
  History,
  Play,
} from 'lucide-vue-next';
import { useAuthStore } from '../stores/auth';
import { useSystemInfo } from '../composables/useSystemInfo';
import ProgressRing from '../components/ui/ProgressRing.vue';
import ProgressBar from '../components/ui/ProgressBar.vue';
import SearchInput from '../components/ui/SearchInput.vue';
import EmptyState from '../components/ui/EmptyState.vue';
import SkeletonCard from '../components/ui/SkeletonCard.vue';
import RosterCard from '../components/ui/RosterCard.vue';

const auth = useAuthStore();
const { backendPort, isBackendOnline } = useSystemInfo();

const motorcycles = ref([]);
const recentSessions = ref([]);
const boltSpecsCount = ref(0);
const searchQuery = ref('');
const isLoading = ref(false);
const errorMsg = ref('');

const completeMotors = computed(
  () => motorcycles.value.filter((m) => (m._count?.requirements || 0) >= 5).length
);

const completenessPercent = computed(() => {
  if (motorcycles.value.length === 0) return 0;
  return Math.round((completeMotors.value / motorcycles.value.length) * 100);
});

const activeMotors = computed(() => motorcycles.value.filter((m) => m.isActive).length);

const activePercent = computed(() => {
  if (motorcycles.value.length === 0) return 0;
  return Math.round((activeMotors.value / motorcycles.value.length) * 100);
});

const todaySessions = computed(() => {
  const today = new Date().toDateString();
  return recentSessions.value.filter((s) => new Date(s.createdAt).toDateString() === today).length;
});

const todayCompleted = computed(() => {
  const today = new Date().toDateString();
  return recentSessions.value.filter(
    (s) => s.status === 'COMPLETED' && new Date(s.createdAt).toDateString() === today
  ).length;
});

const todayProgressPercent = computed(() => {
  if (todaySessions.value === 0) return 0;
  return Math.round((todayCompleted.value / todaySessions.value) * 100);
});

const inProgressSession = computed(
  () => recentSessions.value.find((s) => s.status === 'IN_PROGRESS') || null
);

const incompleteMotors = computed(() =>
  motorcycles.value
    .filter((m) => (m._count?.requirements || 0) < 5)
    .slice(0, 6)
);

const filteredMotors = computed(() => {
  if (!searchQuery.value) return motorcycles.value;
  const q = searchQuery.value.toLowerCase();
  return motorcycles.value.filter(
    (m) =>
      m.displayName.toLowerCase().includes(q) ||
      m.brand.toLowerCase().includes(q) ||
      m.model.toLowerCase().includes(q)
  );
});

const loadDashboardData = async () => {
  errorMsg.value = '';
  isLoading.value = true;
  try {
    const [resMotors, resSessions, resSpecs] = await Promise.all([
      auth.apiFetch('/api/motorcycles'),
      auth.apiFetch('/api/pick-lists/sessions?limit=50'),
      auth.apiFetch('/api/bolt-specs'),
    ]);

    if (!resMotors.ok || !resSessions.ok || !resSpecs.ok) {
      throw new Error('Gagal memuat data ringkasan dari server.');
    }

    const motorsData = await resMotors.json();
    const sessionsData = await resSessions.json();
    const specs = await resSpecs.json();

    motorcycles.value = Array.isArray(motorsData) ? motorsData : [];
    recentSessions.value = Array.isArray(sessionsData) ? sessionsData.slice(0, 6) : [];
    boltSpecsCount.value = Array.isArray(specs) ? specs.length : 0;
  } catch (err) {
    console.error('Error loading dashboard:', err);
    errorMsg.value = err.message === 'Failed to fetch'
      ? 'Tidak dapat terhubung ke server gerai. Periksa sambungan Wi-Fi lalu ketuk Muat Ulang.'
      : err.message;
  } finally {
    isLoading.value = false;
  }
};

onMounted(loadDashboardData);
</script>
