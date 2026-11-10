<template>
  <div class="space-y-6">
    <div class="bg-white dark:bg-[#121215] p-5 sm:p-6 rounded-2xl border border-zinc-300 dark:border-zinc-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
      <div>
        <div class="flex items-center gap-2 mb-1">
          <span class="w-2 h-2 rounded-full bg-zinc-500" aria-hidden="true"></span>
          <span class="text-xs font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400">Paket Siap Pakai</span>
        </div>
        <h1 class="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Paket Bundling Baut Motor
        </h1>
        <p class="text-sm text-zinc-600 dark:text-zinc-400 mt-0.5">
          Pilihan paket baut motor (Mesin, Pengereman, Lengkap Satu Motor) untuk penyiapan cepat di gerai
        </p>
      </div>

      <router-link
        to="/pick-list"
        class="min-h-[44px] px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-semibold text-sm rounded-xl shadow-sm transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
      >
        <span>Buka Daftar Ambil</span>
      </router-link>
    </div>

    <!-- Error & Loading States -->
    <div
      v-if="errorMsg"
      role="alert"
      class="bg-rose-50 border border-rose-300 text-rose-800 dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-300 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm"
    >
      <span>{{ errorMsg }}</span>
      <button
        @click="loadPackages"
        type="button"
        class="min-h-[44px] px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold cursor-pointer shrink-0"
      >
        Muat Ulang
      </button>
    </div>

    <div
      v-if="isLoading"
      role="status"
      aria-live="polite"
      class="bg-white dark:bg-[#121215] rounded-2xl border border-zinc-300 dark:border-zinc-800 p-8 text-center text-sm text-zinc-600 dark:text-zinc-400"
    >
      Memuat daftar paket bundling...
    </div>

    <div
      v-else-if="packages.length === 0 && !errorMsg"
      class="bg-white dark:bg-[#121215] rounded-2xl border border-dashed border-zinc-400 dark:border-zinc-700 p-8 text-center text-sm text-zinc-600 dark:text-zinc-400"
    >
      Belum ada paket bundling yang tersedia.
    </div>

    <!-- Package Cards Grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div
        v-for="pkg in packages"
        :key="pkg.id"
        class="bg-white dark:bg-[#121215] rounded-2xl border border-zinc-300 dark:border-zinc-800 p-5 shadow-sm flex flex-col justify-between transition-all"
      >
        <div>
          <div class="flex items-center justify-between mb-2">
            <span class="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700">
              {{ pkg.packageType }}
            </span>
            <span class="text-xs font-mono text-zinc-600 dark:text-zinc-400">
              {{ pkg.items?.length || 0 }} Jenis Baut
            </span>
          </div>

          <h2 class="text-base font-bold text-zinc-900 dark:text-zinc-100 mt-1">
            {{ pkg.name }}
          </h2>
          <p class="text-xs text-zinc-600 dark:text-zinc-400 font-mono mt-0.5 mb-2">
            {{ pkg.motorcycleType?.displayName }}
          </p>
          <p class="text-sm text-zinc-600 dark:text-zinc-400 mb-4 line-clamp-2">
            {{ pkg.description }}
          </p>

          <div class="border-t border-zinc-200 dark:border-zinc-800 pt-3 space-y-1.5">
            <p class="text-[11px] font-mono uppercase text-zinc-600 dark:text-zinc-400 mb-1.5">Rincian Isi Paket:</p>
            <div
              v-for="item in pkg.items"
              :key="item.id"
              class="flex items-center justify-between text-xs py-1 gap-2"
            >
              <span class="font-mono text-zinc-800 dark:text-zinc-200">
                {{ item.boltSpec.code }} (M{{ Number(item.boltSpec.diameterMm) }}×{{ Number(item.boltSpec.lengthMm) }})
              </span>
              <span class="font-mono font-bold text-zinc-900 dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded border border-zinc-300 dark:border-zinc-700 shrink-0">
                {{ item.quantity }} pcs
              </span>
            </div>
          </div>
        </div>

        <div class="mt-5 pt-3 border-t border-zinc-200 dark:border-zinc-800">
          <button
            @click="pickThisPackage(pkg)"
            type="button"
            class="w-full min-h-[44px] py-2.5 px-4 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-950 font-semibold text-sm rounded-xl shadow-sm transition-all duration-150 cursor-pointer"
          >
            Pilih Paket Ini &rarr;
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const auth = useAuthStore();
const packages = ref([]);
const isLoading = ref(false);
const errorMsg = ref('');

const loadPackages = async () => {
  errorMsg.value = '';
  isLoading.value = true;
  try {
    const res = await auth.apiFetch('/api/packages');
    if (!res.ok) throw new Error('Gagal memuat daftar paket bundling.');
    const data = await res.json();
    packages.value = Array.isArray(data) ? data : [];
  } catch (err) {
    console.error(err);
    errorMsg.value = err.message === 'Failed to fetch'
      ? 'Tidak dapat terhubung ke server gerai. Periksa sambungan Wi-Fi lalu ketuk Muat Ulang.'
      : err.message;
  } finally {
    isLoading.value = false;
  }
};

const pickThisPackage = (pkg) => {
  router.push({
    path: '/pick-list',
    query: {
      motorId: pkg.motorcycleTypeId,
      pkgId: pkg.id,
    },
  });
};

onMounted(loadPackages);
</script>
