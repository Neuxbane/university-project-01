<template>
  <div class="max-w-3xl mx-auto space-y-5">
    <!-- One question, one primary action -->
    <section class="relative overflow-hidden rounded-3xl border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-[#121215] shadow-sm">
      <div class="absolute inset-0 bg-gradient-to-br from-zinc-100 via-transparent to-transparent dark:from-zinc-900/60 pointer-events-none" aria-hidden="true"></div>
      <div class="relative p-6 sm:p-8">
        <p class="text-xs font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
          Hex Titanium &bull; {{ auth.user?.name }}
        </p>
        <h1 class="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mt-1.5">
          Mau ambil baut untuk motor apa?
        </h1>
        <p class="text-sm text-zinc-600 dark:text-zinc-400 mt-1.5">
          Pilih motor, lihat daftar bautnya, lalu mulai checklist.
        </p>

        <router-link
          to="/pick-list"
          class="mt-5 min-h-[56px] w-full sm:w-auto px-6 py-3.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-semibold text-base rounded-2xl shadow-sm inline-flex items-center justify-center gap-2.5 transition-all active:scale-[0.98]"
        >
          <Bike class="w-5 h-5" aria-hidden="true" />
          Pilih Motor
          <ArrowRight class="w-5 h-5" aria-hidden="true" />
        </router-link>
      </div>
    </section>

    <!-- Continue only when there is something to continue -->
    <router-link
      v-if="inProgressSession"
      :to="`/pick-list/${inProgressSession.id}`"
      class="group flex items-center gap-4 p-4 sm:p-5 rounded-2xl border border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 hover:border-amber-500 transition-all active:scale-[0.99]"
    >
      <div class="w-12 h-12 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0">
        <Play class="w-5 h-5" aria-hidden="true" />
      </div>
      <div class="min-w-0 flex-1">
        <p class="text-[11px] font-mono uppercase tracking-wider text-amber-800 dark:text-amber-300 font-bold">Sesi Belum Selesai</p>
        <p class="text-base font-bold text-zinc-900 dark:text-zinc-100 truncate">{{ inProgressSession.motorcycleType.displayName }}</p>
        <p class="text-xs font-mono text-zinc-700 dark:text-zinc-300">
          {{ inProgressSession.checkedItems }}/{{ inProgressSession.totalItems }} item &bull; {{ inProgressSession.progressPercent }}%
        </p>
      </div>
      <span class="min-h-[44px] px-4 py-2.5 bg-amber-700 group-hover:bg-amber-800 text-white text-sm font-semibold rounded-xl inline-flex items-center gap-1.5 shrink-0">
        Lanjutkan
        <ArrowRight class="w-4 h-4" aria-hidden="true" />
      </span>
    </router-link>

    <!-- Action menu -->
    <section class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <router-link
        to="/history"
        class="group text-left p-5 rounded-2xl border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-[#121215] hover:border-zinc-500 dark:hover:border-zinc-600 shadow-sm transition-all hover:-translate-y-0.5 active:scale-[0.99]"
      >
        <div class="w-11 h-11 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 flex items-center justify-center text-zinc-700 dark:text-zinc-300">
          <History class="w-5 h-5" aria-hidden="true" />
        </div>
        <h2 class="text-base font-bold text-zinc-900 dark:text-zinc-100 mt-3">Riwayat Sesi</h2>
        <p class="text-sm text-zinc-600 dark:text-zinc-400 mt-0.5">Buka sesi yang pernah dibuat.</p>
      </router-link>

      <router-link
        to="/help/manual"
        class="group text-left p-5 rounded-2xl border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-[#121215] hover:border-zinc-500 dark:hover:border-zinc-600 shadow-sm transition-all hover:-translate-y-0.5 active:scale-[0.99]"
      >
        <div class="w-11 h-11 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 flex items-center justify-center text-zinc-700 dark:text-zinc-300">
          <BookOpen class="w-5 h-5" aria-hidden="true" />
        </div>
        <h2 class="text-base font-bold text-zinc-900 dark:text-zinc-100 mt-3">Buku Panduan</h2>
        <p class="text-sm text-zinc-600 dark:text-zinc-400 mt-0.5">Cara pakai sistem langkah demi langkah.</p>
      </router-link>

      <router-link
        v-if="auth.isAdmin"
        to="/motorcycles"
        class="group text-left p-5 rounded-2xl border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-[#121215] hover:border-zinc-500 dark:hover:border-zinc-600 shadow-sm transition-all hover:-translate-y-0.5 active:scale-[0.99] sm:col-span-2"
      >
        <div class="flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 flex items-center justify-center text-zinc-700 dark:text-zinc-300 shrink-0">
            <Settings class="w-5 h-5" aria-hidden="true" />
          </div>
          <div class="min-w-0 flex-1">
            <h2 class="text-base font-bold text-zinc-900 dark:text-zinc-100">Kelola Data</h2>
            <p class="text-sm text-zinc-600 dark:text-zinc-400 mt-0.5">Tipe motor, master baut, paket baut, dan akun staf.</p>
          </div>
          <ArrowRight class="w-5 h-5 text-zinc-500 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 shrink-0 transition-colors" aria-hidden="true" />
        </div>
      </router-link>
    </section>

    <!-- Server status, one line -->
    <p class="text-center text-xs font-mono text-zinc-500 dark:text-zinc-500">
      <span
        class="inline-block w-2 h-2 rounded-full mr-1.5 align-middle"
        :class="isBackendOnline ? 'bg-emerald-600 dark:bg-emerald-500' : 'bg-rose-600 dark:bg-rose-500'"
        aria-hidden="true"
      ></span>
      Server {{ isBackendOnline ? 'terhubung' : 'terputus' }} &bull; Port {{ backendPort }}
    </p>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { ArrowRight, Bike, BookOpen, History, Play, Settings } from 'lucide-vue-next';
import { useAuthStore } from '../stores/auth';
import { useSystemInfo } from '../composables/useSystemInfo';

const auth = useAuthStore();
const { backendPort, isBackendOnline } = useSystemInfo();

const recentSessions = ref([]);

const inProgressSession = computed(
  () => recentSessions.value.find((s) => s.status === 'IN_PROGRESS') || null
);

const loadSessions = async () => {
  try {
    const res = await auth.apiFetch('/api/pick-lists/sessions?limit=20');
    if (!res.ok) throw new Error('Gagal memuat riwayat sesi.');
    const data = await res.json();
    recentSessions.value = Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('Error loading sessions:', err);
    recentSessions.value = [];
  }
};

onMounted(loadSessions);
</script>
