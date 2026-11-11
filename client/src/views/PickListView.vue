<template>
  <AppShell>
    <template #topbar>
      <div class="bg-white dark:bg-[#121215] rounded-2xl border border-zinc-300 dark:border-zinc-800 p-4 sm:p-5 shadow-sm space-y-4">
        <!-- Top Row: Title + Counters + History Link -->
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex flex-wrap items-center gap-2.5 min-w-0">
            <h1 class="text-lg sm:text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Pilih Motor
            </h1>
            <StatPill :icon="Bike" label="Tersedia" :value="`${motorcycles.length} motor`" />
          </div>

          <div class="flex items-center gap-2 shrink-0">
            <router-link
              to="/dashboard"
              class="min-h-[44px] px-3.5 py-2 rounded-xl border border-zinc-400 dark:border-zinc-700 bg-zinc-50 hover:bg-zinc-100 dark:bg-[#18181c] dark:hover:bg-zinc-800 text-xs sm:text-sm font-semibold text-zinc-800 dark:text-zinc-200 inline-flex items-center gap-1.5 transition-colors"
            >
              <History class="w-4 h-4" aria-hidden="true" />
              <span>Riwayat</span>
            </router-link>
          </div>
        </div>

        <!-- Search + Brand Faction Filter Chips -->
        <div class="space-y-3">
          <SearchInput
            v-model="rosterSearch"
            placeholder="Cari motor, merek, atau tahun (misal: NMAX, Vario)..."
            aria-label="Cari model sepeda motor"
          />

          <div class="flex items-center gap-2 overflow-x-auto pb-1">
            <FilterChip
              v-for="chip in brandChips"
              :key="chip.value"
              :label="chip.label"
              :count="chip.count"
              :active="selectedBrand === chip.value"
              @click="selectedBrand = chip.value"
            />
          </div>
        </div>
      </div>
    </template>

    <!-- Error Banner -->
    <div
      v-if="rosterError"
      role="alert"
      class="mb-4 bg-rose-50 border border-rose-300 text-rose-800 dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-300 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm"
    >
      <span>{{ rosterError }}</span>
      <button
        type="button"
        @click="loadRoster"
        class="min-h-[44px] px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold cursor-pointer shrink-0"
      >
        Coba Lagi
      </button>
    </div>

    <!-- Loading Skeletons -->
    <div
      v-if="isLoadingRoster"
      role="status"
      aria-label="Memuat daftar motor"
      class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4"
    >
      <SkeletonCard v-for="n in 8" :key="n" />
    </div>

    <!-- Empty State -->
    <EmptyState
      v-else-if="filteredMotors.length === 0"
      :icon="Bike"
      title="Motor Tidak Ditemukan"
      :description="rosterSearch ? `Tidak ada motor yang cocok dengan &quot;${rosterSearch}&quot;.` : 'Belum ada tipe motor aktif di sistem.'"
      action-label="Tampilkan Semua Motor"
      @action="resetRosterFilters"
    />

    <!-- Full-Width Motorcycle Roster Grid (clicking a card opens its dedicated detail & location page) -->
    <div
      v-else
      ref="rosterGridRef"
      @keydown="onRosterKeyDown"
      class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4"
    >
      <RosterCard
        v-for="m in filteredMotors"
        :key="m.id"
        :data-motor-id="m.id"
        :motorcycle="m"
        @select="openMotorPage"
      />
    </div>
  </AppShell>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { Bike, History } from 'lucide-vue-next';
import { useAuthStore } from '../stores/auth';
import AppShell from '../components/ui/AppShell.vue';
import RosterCard from '../components/ui/RosterCard.vue';
import StatPill from '../components/ui/StatPill.vue';
import SearchInput from '../components/ui/SearchInput.vue';
import FilterChip from '../components/ui/FilterChip.vue';
import EmptyState from '../components/ui/EmptyState.vue';
import SkeletonCard from '../components/ui/SkeletonCard.vue';

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();

const motorcycles = ref([]);
const rosterSearch = ref('');
const selectedBrand = ref('Semua');
const isLoadingRoster = ref(false);
const rosterError = ref('');
const rosterGridRef = ref(null);

const brandChips = computed(() => {
  const list = motorcycles.value.filter((m) => m.isActive !== false);
  const brandMap = new Map();
  for (const m of list) {
    const raw = (m.brand || '').trim();
    if (!raw) continue;
    const key = raw.toLowerCase();
    const entry = brandMap.get(key) || { value: raw, label: raw, count: 0 };
    entry.count++;
    brandMap.set(key, entry);
  }

  const dynamicBrands = Array.from(brandMap.values()).sort((a, b) => a.label.localeCompare(b.label));
  return [
    { value: 'Semua', label: 'Semua', count: list.length },
    ...dynamicBrands,
  ];
});

const filteredMotors = computed(() => {
  const q = rosterSearch.value.trim().toLowerCase();
  return motorcycles.value.filter((m) => {
    if (m.isActive === false) return false;
    const brandLower = (m.brand || '').toLowerCase();
    const matchBrand =
      selectedBrand.value === 'Semua' ||
      brandLower === selectedBrand.value.toLowerCase();
    if (!matchBrand) return false;
    if (!q) return true;
    return (
      (m.displayName || '').toLowerCase().includes(q) ||
      (m.brand || '').toLowerCase().includes(q) ||
      (m.model || '').toLowerCase().includes(q) ||
      (m.variant || '').toLowerCase().includes(q) ||
      String(m.yearStart || '').includes(q)
    );
  });
});

const loadRoster = async () => {
  rosterError.value = '';
  isLoadingRoster.value = true;
  try {
    const res = await auth.apiFetch('/api/motorcycles');
    if (!res.ok) {
      throw new Error('Gagal memuat daftar motor dari server.');
    }
    const data = await res.json();
    motorcycles.value = Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('Error loading roster:', err);
    rosterError.value = err.message === 'Failed to fetch'
      ? 'Tidak dapat terhubung ke server gerai. Periksa sambungan Wi-Fi lalu ketuk Coba Lagi.'
      : err.message;
  } finally {
    isLoadingRoster.value = false;
  }
};

const openMotorPage = (motor) => {
  router.push({
    name: 'bolt-location',
    params: { motorId: motor.id },
  });
};

const resetRosterFilters = () => {
  rosterSearch.value = '';
  selectedBrand.value = 'Semua';
};

const onRosterKeyDown = (e) => {
  const keys = ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'];
  if (!keys.includes(e.key)) return;
  const cards = Array.from(rosterGridRef.value?.querySelectorAll('button[data-motor-id]') || []);
  const currentIdx = cards.indexOf(document.activeElement);
  if (currentIdx === -1) return;

  e.preventDefault();
  const cols = window.innerWidth >= 1024 ? 4 : window.innerWidth >= 640 ? 3 : 2;
  let nextIdx = currentIdx;
  if (e.key === 'ArrowRight') nextIdx = Math.min(cards.length - 1, currentIdx + 1);
  if (e.key === 'ArrowLeft') nextIdx = Math.max(0, currentIdx - 1);
  if (e.key === 'ArrowDown') nextIdx = Math.min(cards.length - 1, currentIdx + cols);
  if (e.key === 'ArrowUp') nextIdx = Math.max(0, currentIdx - cols);
  cards[nextIdx]?.focus();
};

onMounted(() => {
  const queryMotorId = route.query.motorId ? parseInt(route.query.motorId, 10) : null;
  const queryPkgId = route.query.pkgId ? parseInt(route.query.pkgId, 10) : null;
  if (queryMotorId) {
    router.replace({
      name: 'bolt-location',
      params: { motorId: queryMotorId },
      query: queryPkgId ? { packageId: queryPkgId } : undefined,
    });
    return;
  }
  loadRoster();
});
</script>
