<template>
  <div class="space-y-6">
    <!-- Top Welcome Card -->
    <div class="bg-white dark:bg-[#121215] rounded-2xl p-5 sm:p-6 border border-zinc-300 dark:border-zinc-800 shadow-sm transition-colors">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span
              class="w-2 h-2 rounded-full shrink-0"
              :class="isBackendOnline ? 'bg-emerald-600 dark:bg-emerald-500' : 'bg-rose-600 dark:bg-rose-500'"
              aria-hidden="true"
            ></span>
            <span class="text-xs font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
              Operasional Hex Titanium &bull; Server {{ isBackendOnline ? 'Terhubung' : 'Terputus' }} (Port <strong class="text-zinc-900 dark:text-zinc-100">{{ backendPort }}</strong>)
            </span>
          </div>
          <h1 class="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Selamat Datang, {{ auth.user?.name }}
          </h1>
          <p class="text-sm text-zinc-600 dark:text-zinc-400 mt-1 max-w-2xl leading-relaxed">
            Sistem data ukuran baut motor lokal untuk mempercepat penyiapan baut dari ±2 jam menjadi 5–10 menit.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2.5 shrink-0">
          <router-link
            to="/pick-list"
            class="min-h-[44px] px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-semibold text-sm rounded-xl shadow-sm inline-flex items-center transition-all"
          >
            Buka Daftar Ambil
          </router-link>
          <router-link
            to="/help/manual"
            class="min-h-[44px] px-4 py-2.5 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-medium text-sm rounded-xl border border-zinc-400 dark:border-zinc-700 inline-flex items-center transition-all"
          >
            Buku Panduan
          </router-link>
        </div>
      </div>
    </div>

    <!-- Inline Error Banner -->
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

    <!-- Loading Indicator -->
    <div
      v-if="isLoading"
      role="status"
      aria-live="polite"
      class="bg-white dark:bg-[#121215] rounded-2xl border border-zinc-300 dark:border-zinc-800 p-8 text-center text-sm text-zinc-600 dark:text-zinc-400"
    >
      Memuat ringkasan data bengkel...
    </div>

    <template v-else>
      <!-- Metrics Row -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div class="bg-white dark:bg-[#121215] p-4 rounded-2xl border border-zinc-300 dark:border-zinc-800 shadow-sm">
          <span class="text-xs font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400 block mb-1">Tipe Motor</span>
          <p class="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100">{{ motorcycles.length }}</p>
          <span class="text-xs text-emerald-700 dark:text-emerald-400 font-medium block mt-0.5">Target min. 20 terpenuhi</span>
        </div>

        <div class="bg-white dark:bg-[#121215] p-4 rounded-2xl border border-zinc-300 dark:border-zinc-800 shadow-sm">
          <span class="text-xs font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400 block mb-1">Ukuran Baut</span>
          <p class="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100">{{ boltSpecsCount }}</p>
          <span class="text-xs text-zinc-600 dark:text-zinc-400 block mt-0.5">M5, M6, M8, M10 Gr5</span>
        </div>

        <div class="bg-white dark:bg-[#121215] p-4 rounded-2xl border border-zinc-300 dark:border-zinc-800 shadow-sm">
          <span class="text-xs font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400 block mb-1">Titik Baut Terpetakan</span>
          <p class="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100">{{ totalRequirementsCount }}</p>
          <span class="text-xs text-zinc-600 dark:text-zinc-400 block mt-0.5">Total titik terdata</span>
        </div>

        <div class="bg-white dark:bg-[#121215] p-4 rounded-2xl border border-zinc-300 dark:border-zinc-800 shadow-sm">
          <span class="text-xs font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400 block mb-1">Sesi Terlaksana</span>
          <p class="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100">{{ recentSessions.length }}</p>
          <span class="text-xs text-zinc-600 dark:text-zinc-400 block mt-0.5">Aktivitas penyiapan</span>
        </div>
      </div>

      <!-- 20 Popular Motorcycles Completeness Grid -->
      <div class="bg-white dark:bg-[#121215] rounded-2xl border border-zinc-300 dark:border-zinc-800 p-5 sm:p-6 shadow-sm transition-colors">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 class="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Status Kelengkapan Data Motor Populer
            </h2>
            <p class="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
              Kesiapan data ukuran baut per model motor di gerai
            </p>
          </div>

          <div class="w-full sm:w-64">
            <label for="dashboard-motor-search" class="sr-only">Cari motor</label>
            <input
              id="dashboard-motor-search"
              v-model="searchQuery"
              type="text"
              placeholder="Cari merek atau nama motor..."
              class="w-full min-h-[44px] px-3.5 py-2 text-base sm:text-sm bg-zinc-50 dark:bg-[#18181c] border border-zinc-500 rounded-xl text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 dark:placeholder:text-zinc-400"
            />
          </div>
        </div>

        <div v-if="filteredMotors.length === 0" class="text-center py-8 text-sm text-zinc-600 dark:text-zinc-400">
          Motor "{{ searchQuery }}" tidak ditemukan.
        </div>

        <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div
            v-for="motor in filteredMotors"
            :key="motor.id"
            class="p-3.5 rounded-xl border transition-all"
            :class="[
              (motor._count?.requirements || 0) >= 5
                ? 'bg-zinc-50 dark:bg-[#18181c]/70 border-zinc-300 dark:border-zinc-700'
                : 'bg-zinc-50/50 dark:bg-[#18181c]/30 border-dashed border-zinc-400 dark:border-zinc-700'
            ]"
          >
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-xs font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                {{ motor.brand }}
              </span>
              <span
                class="text-[10px] font-mono font-semibold px-2 py-0.5 rounded border"
                :class="[
                  (motor._count?.requirements || 0) >= 5
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                    : (motor._count?.requirements || 0) > 0
                    ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20'
                    : 'bg-zinc-200 text-zinc-800 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700'
                ]"
              >
                {{ (motor._count?.requirements || 0) >= 5 ? 'LENGKAP' : (motor._count?.requirements || 0) > 0 ? 'SEBAGIAN' : 'KOSONG' }}
              </span>
            </div>

            <h3 class="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate">
              {{ motor.model }} {{ motor.variant }}
            </h3>
            <p class="text-xs text-zinc-600 dark:text-zinc-400 font-mono">
              {{ motor.yearStart }}{{ motor.yearEnd ? `-${motor.yearEnd}` : '' }}
            </p>

            <div class="mt-2.5 pt-2 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs">
              <span class="text-xs font-mono text-zinc-600 dark:text-zinc-400">
                {{ motor._count?.requirements || 0 }} Titik Baut
              </span>
              <router-link
                to="/motorcycles"
                class="min-h-[44px] px-2 -mr-2 inline-flex items-center text-xs font-semibold text-zinc-800 hover:text-zinc-950 dark:text-zinc-200 dark:hover:text-white underline-offset-2 hover:underline"
              >
                Kelola &rarr;
              </router-link>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Pick Sessions Table -->
      <div class="bg-white dark:bg-[#121215] rounded-2xl border border-zinc-300 dark:border-zinc-800 p-5 sm:p-6 shadow-sm transition-colors">
        <div class="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div>
            <h2 class="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Riwayat Sesi Pengambilan Baut
            </h2>
            <p class="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
              Daftar aktivitas penyiapan baut terbaru
            </p>
          </div>
          <router-link
            to="/pick-list"
            class="min-h-[44px] px-3 inline-flex items-center text-xs font-semibold text-zinc-800 hover:text-zinc-950 dark:text-zinc-200 dark:hover:text-white rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition-colors"
          >
            + Sesi Baru
          </router-link>
        </div>

        <div v-if="recentSessions.length === 0" class="text-center py-8 text-sm text-zinc-600 dark:text-zinc-400 font-mono">
          Belum ada riwayat sesi pengambilan.
        </div>

        <div v-else class="divide-y divide-zinc-200 dark:divide-zinc-800 text-sm">
          <div
            v-for="s in recentSessions"
            :key="s.id"
            class="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <span class="font-mono text-xs text-zinc-600 dark:text-zinc-400">#{{ s.id }}</span>
                <span class="font-semibold text-zinc-900 dark:text-zinc-100">
                  {{ s.motorcycleType.displayName }}
                </span>
                <span
                  class="text-[10px] font-mono font-semibold px-2 py-0.5 rounded border"
                  :class="[s.status === 'COMPLETED'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                    : 'bg-zinc-100 text-zinc-800 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700']"
                >
                  {{ s.status === 'COMPLETED' ? 'Selesai' : 'Sedang Diambil' }}
                </span>
              </div>
              <p class="text-xs text-zinc-600 dark:text-zinc-400 font-mono mt-0.5">
                Petugas: {{ s.creator.name }} &bull; {{ formatDateTime(s.createdAt) }}
              </p>
            </div>

            <div class="flex items-center justify-between sm:justify-end gap-3 shrink-0">
              <div class="text-left sm:text-right">
                <span class="text-xs font-mono text-zinc-700 dark:text-zinc-300">
                  {{ s.checkedItems }}/{{ s.totalItems }}
                </span>
                <div class="w-20 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden mt-1">
                  <div class="h-full bg-zinc-900 dark:bg-zinc-100 rounded-full" :style="{ width: `${s.progressPercent}%` }"></div>
                </div>
              </div>

              <router-link
                :to="`/pick-list/${s.id}`"
                class="min-h-[44px] px-4 py-2 text-xs font-semibold rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700 inline-flex items-center transition-colors"
              >
                Lanjutkan / Lihat
              </router-link>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '../stores/auth';
import { useSystemInfo } from '../composables/useSystemInfo';
import { formatDateTime } from '../utils/date';

const auth = useAuthStore();
const { backendPort, isBackendOnline } = useSystemInfo();
const motorcycles = ref([]);
const recentSessions = ref([]);
const boltSpecsCount = ref(0);
const searchQuery = ref('');
const isLoading = ref(false);
const errorMsg = ref('');

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

const totalRequirementsCount = computed(() => {
  return motorcycles.value.reduce((acc, m) => acc + (m._count?.requirements || 0), 0);
});

const loadDashboardData = async () => {
  errorMsg.value = '';
  isLoading.value = true;
  try {
    const [resMotors, resSessions, resSpecs] = await Promise.all([
      auth.apiFetch('/api/motorcycles'),
      auth.apiFetch('/api/pick-lists/sessions?limit=5'),
      auth.apiFetch('/api/bolt-specs'),
    ]);

    if (!resMotors.ok || !resSessions.ok || !resSpecs.ok) {
      throw new Error('Gagal memuat data ringkasan dari server.');
    }

    const motorsData = await resMotors.json();
    const sessionsData = await resSessions.json();
    const specs = await resSpecs.json();

    motorcycles.value = Array.isArray(motorsData) ? motorsData : [];
    recentSessions.value = Array.isArray(sessionsData) ? sessionsData : [];
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
