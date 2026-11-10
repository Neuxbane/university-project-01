<template>
  <div class="space-y-5">
    <!-- Header -->
    <section class="bg-white dark:bg-[#121215] p-5 sm:p-6 rounded-2xl border border-zinc-300 dark:border-zinc-800 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      <div>
        <div class="flex items-center gap-2 mb-1">
          <span class="w-2 h-2 rounded-full bg-zinc-500" aria-hidden="true"></span>
          <span class="text-xs font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400">Paket Siap Pakai</span>
        </div>
        <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Preset Paket Baut
        </h1>
        <p class="text-sm text-zinc-600 dark:text-zinc-400 mt-0.5">
          Pilih preset seperti memilih loadout. Ketuk kartu untuk melihat isi paket sebelum dipakai.
        </p>
      </div>

      <router-link
        to="/pick-list"
        class="min-h-[48px] px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-semibold text-sm rounded-xl shadow-sm transition-all inline-flex items-center justify-center gap-2 cursor-pointer shrink-0 active:scale-[0.98]"
      >
        <Play class="w-4 h-4" aria-hidden="true" />
        Buka Roster Motor
      </router-link>
    </section>

    <!-- Error -->
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

    <!-- Loading -->
    <div v-if="isLoading" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3" role="status" aria-live="polite">
      <SkeletonCard v-for="n in 6" :key="n" />
      <span class="sr-only">Memuat daftar paket bundling...</span>
    </div>

    <template v-else>
      <!-- Filter Chips -->
      <div v-if="packages.length > 0" class="flex flex-wrap items-center gap-2">
        <FilterChip
          v-for="chip in typeChips"
          :key="chip.value"
          :label="chip.label"
          :count="chip.count"
          :active="selectedType === chip.value"
          @click="selectedType = chip.value"
        />
      </div>

      <EmptyState
        v-if="filteredPackages.length === 0"
        :icon="PackageOpen"
        title="Belum ada paket yang cocok"
        :description="packages.length === 0 ? 'Belum ada paket bundling yang tersedia di gerai.' : 'Coba pilih jenis paket lain.'"
        :action-label="packages.length === 0 ? '' : 'Tampilkan Semua'"
        @action="selectedType = 'all'"
      />

      <!-- Preset Grid -->
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        <button
          v-for="pkg in filteredPackages"
          :key="pkg.id"
          @click="selectedPackage = pkg"
          type="button"
          class="group text-left bg-white dark:bg-[#121215] rounded-2xl border border-zinc-300 dark:border-zinc-800 hover:border-zinc-500 dark:hover:border-zinc-600 shadow-sm overflow-hidden transition-all duration-150 hover:-translate-y-0.5 active:scale-[0.99] cursor-pointer flex flex-col"
        >
          <!-- Visual Header -->
          <div class="relative h-28 w-full overflow-hidden bg-gradient-to-br from-zinc-800 to-zinc-950">
            <div class="absolute inset-0 flex items-center justify-center gap-2 p-3">
              <template v-for="(item, idx) in pkg.items.slice(0, 4)" :key="item.id">
                <div
                  v-if="item.boltSpec?.images?.length"
                  class="w-14 h-14 rounded-xl overflow-hidden border border-white/20 bg-zinc-900 shrink-0"
                  :class="idx > 1 ? 'hidden sm:block' : ''"
                >
                  <img :src="item.boltSpec.images[0].url" :alt="item.boltSpec.code" class="w-full h-full object-cover" loading="lazy" />
                </div>
                <div
                  v-else
                  class="w-14 h-14 rounded-xl border border-white/20 bg-white/5 flex items-center justify-center shrink-0"
                  :class="idx > 1 ? 'hidden sm:block' : ''"
                >
                  <Nut class="w-6 h-6 text-zinc-400" aria-hidden="true" />
                </div>
              </template>
            </div>
            <div class="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" aria-hidden="true"></div>
            <span
              class="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[11px] font-mono font-bold border backdrop-blur-sm"
              :class="typeTone(pkg.packageType).badge"
            >
              {{ formatPackageType(pkg.packageType) }}
            </span>
            <span class="absolute bottom-2 right-2 px-2.5 py-1 rounded-lg bg-zinc-950/90 border border-white/20 text-white text-xs font-mono font-bold backdrop-blur-sm">
              {{ totalPcs(pkg) }} pcs
            </span>
          </div>

          <!-- Short Label -->
          <div class="p-4 flex-1 flex flex-col gap-2">
            <div>
              <h2 class="text-base font-bold text-zinc-900 dark:text-zinc-100 truncate">{{ pkg.name }}</h2>
              <p class="text-xs font-mono text-zinc-600 dark:text-zinc-400 truncate mt-0.5">
                {{ pkg.motorcycleType?.displayName }}
              </p>
            </div>

            <div class="flex flex-wrap items-center gap-1.5">
              <span class="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-[11px] font-mono text-zinc-700 dark:text-zinc-300">
                {{ pkg.items?.length || 0 }} jenis baut
              </span>
              <span class="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-[11px] font-mono text-zinc-700 dark:text-zinc-300">
                {{ pkg.items?.length || 0 }} titik
              </span>
            </div>

            <p class="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2">{{ pkg.description || 'Paket baut siap ambil untuk motor ini.' }}</p>

            <div class="mt-auto pt-2.5 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <span class="text-xs font-semibold text-zinc-800 dark:text-zinc-200 group-hover:underline">Lihat Isi Paket</span>
              <ArrowRight class="w-4 h-4 text-zinc-500 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors" aria-hidden="true" />
            </div>
          </div>
        </button>
      </div>
    </template>

    <!-- Package Detail Sheet -->
    <DetailSheet
      :open="Boolean(selectedPackage)"
      :is-modal="true"
      eyebrow="Preset Paket"
      :title="selectedPackage?.name || ''"
      @close="selectedPackage = null"
    >
      <div v-if="selectedPackage" class="space-y-4">
        <div class="flex flex-wrap gap-2">
          <StatPill :icon="Layers" label="Jenis" :value="formatPackageType(selectedPackage.packageType)" />
          <StatPill :icon="Nut" label="Total" :value="`${totalPcs(selectedPackage)} pcs`" />
          <StatPill :icon="Bike" label="Motor" :value="selectedPackage.motorcycleType?.displayName || '-'" />
        </div>

        <p class="text-sm text-zinc-600 dark:text-zinc-400">{{ selectedPackage.description || 'Paket baut siap ambil untuk motor ini.' }}</p>

        <div class="space-y-2">
          <p class="text-xs font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400">Isi Paket</p>
          <div
            v-for="item in selectedPackage.items"
            :key="item.id"
            class="flex items-center gap-3 p-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-[#18181c]"
          >
            <div class="w-12 h-12 rounded-lg overflow-hidden bg-zinc-900 border border-zinc-300 dark:border-zinc-700 shrink-0 flex items-center justify-center">
              <img
                v-if="item.boltSpec?.images?.length"
                :src="item.boltSpec.images[0].url"
                :alt="item.boltSpec.code"
                class="w-full h-full object-cover"
              />
              <Nut v-else class="w-5 h-5 text-zinc-400" aria-hidden="true" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="font-mono text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">{{ item.boltSpec.code }}</p>
              <p class="text-xs text-zinc-600 dark:text-zinc-400 truncate">
                M{{ Number(item.boltSpec.diameterMm) }} × {{ Number(item.boltSpec.lengthMm) }} mm &bull; {{ item.boltSpec.headType }}
              </p>
            </div>
            <span class="px-2.5 py-1 rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs font-mono font-bold shrink-0">
              {{ item.quantity }} pcs
            </span>
          </div>
        </div>
      </div>

      <template #footer>
        <button
          @click="pickThisPackage(selectedPackage)"
          type="button"
          class="w-full min-h-[52px] px-5 py-3 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-semibold text-sm rounded-xl inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <Play class="w-4 h-4" aria-hidden="true" />
          Pakai Paket Ini
        </button>
      </template>
    </DetailSheet>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ArrowRight, Bike, Layers, Nut, PackageOpen, Play } from 'lucide-vue-next';
import { useAuthStore } from '../stores/auth';
import { formatPackageType } from '../utils/boltTokens';
import FilterChip from '../components/ui/FilterChip.vue';
import EmptyState from '../components/ui/EmptyState.vue';
import SkeletonCard from '../components/ui/SkeletonCard.vue';
import StatPill from '../components/ui/StatPill.vue';
import DetailSheet from '../components/ui/DetailSheet.vue';

const router = useRouter();
const auth = useAuthStore();
const packages = ref([]);
const isLoading = ref(false);
const errorMsg = ref('');
const selectedType = ref('all');
const selectedPackage = ref(null);

const typeChips = computed(() => {
  const counts = new Map();
  for (const pkg of packages.value) {
    counts.set(pkg.packageType, (counts.get(pkg.packageType) || 0) + 1);
  }
  return [
    { value: 'all', label: 'Semua', count: packages.value.length },
    ...Array.from(counts.entries()).map(([value, count]) => ({
      value,
      label: formatPackageType(value),
      count,
    })),
  ];
});

const filteredPackages = computed(() => {
  if (selectedType.value === 'all') return packages.value;
  return packages.value.filter((p) => p.packageType === selectedType.value);
});

const totalPcs = (pkg) => (pkg.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);

const typeTone = (type) => {
  if (type === 'FULL_BIKE') return { badge: 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30' };
  if (type === 'BRAKE') return { badge: 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30' };
  if (type === 'ENGINE') return { badge: 'bg-sky-50 text-sky-800 border-sky-300 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/30' };
  return { badge: 'bg-zinc-100 text-zinc-800 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700' };
};

const loadPackages = async () => {
  errorMsg.value = '';
  isLoading.value = true;
  try {
    const res = await auth.apiFetch('/api/packages');
    if (!res.ok) throw new Error('Gagal memuat daftar paket bundling.');
    packages.value = await res.json();
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
