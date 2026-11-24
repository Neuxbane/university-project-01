<template>
  <div class="space-y-5">
    <!-- Header -->
    <section class="bg-white dark:bg-[#121215] border border-zinc-300 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-sm">
      <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div class="min-w-0">
          <p class="text-xs font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400">Dashboard &bull; {{ auth.user?.name }}</p>
          <h1 class="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mt-1">Gambaran Inventory Baut</h1>
          <p class="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            Isi sistem saat ini: motor, spesifikasi baut, posisi pasang, paket, dan sesi checklist. Angka diambil langsung dari database.
          </p>
        </div>
        <router-link
          v-if="auth.can('MENU_PAKET_FULL_BIKE')"
          to="/pick-list"
          class="min-h-[48px] px-5 py-3 bg-brand-500 hover:bg-brand-600 text-ink font-semibold text-sm rounded-xl shadow-sm inline-flex items-center justify-center gap-2 shrink-0 transition-all active:scale-[0.98]"
        >
          <Bike class="w-5 h-5" aria-hidden="true" />
          Paket Full Bike
          <ArrowRight class="w-4 h-4" aria-hidden="true" />
        </router-link>
      </div>
    </section>

    <!-- Continue only when there is something to continue -->
    <router-link
      v-if="inProgressSession && auth.can('MENU_RIWAYAT')"
      :to="`/history/paket/${inProgressSession.id}`"
      class="group flex items-center gap-4 p-4 sm:p-5 rounded-2xl border border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 hover:border-amber-500 transition-all active:scale-[0.99]"
    >
      <div class="w-12 h-12 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0">
        <Play class="w-5 h-5" aria-hidden="true" />
      </div>
      <div class="min-w-0 flex-1">
        <p class="text-[11px] font-mono uppercase tracking-wider text-amber-800 dark:text-amber-300 font-bold">Checklist Paket Full Bike belum selesai</p>
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

    <!-- Error -->
    <div
      v-if="errorMsg"
      role="alert"
      class="bg-rose-50 border border-rose-300 text-rose-800 dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-300 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm"
    >
      <span>{{ errorMsg }}</span>
      <button
        type="button"
        @click="loadOverview"
        class="min-h-[44px] px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold cursor-pointer shrink-0"
      >
        Coba Lagi
      </button>
    </div>

    <!-- Loading -->
    <div v-else-if="isLoading" role="status" aria-label="Memuat dashboard" class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
      <div v-for="n in 6" :key="n" class="h-28 rounded-2xl bg-zinc-200/70 dark:bg-zinc-800/60 animate-pulse"></div>
    </div>

    <template v-else-if="overview">
      <!-- Key numbers -->
      <section aria-label="Angka utama" class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <component
          v-for="kpi in kpis"
          :is="canOpenKpi(kpi.to) ? 'router-link' : 'div'"
          :key="kpi.label"
          :to="kpi.to"
          class="group p-4 rounded-2xl border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-[#121215] hover:border-zinc-500 dark:hover:border-zinc-600 shadow-sm transition-all hover:-translate-y-0.5 flex flex-col gap-1.5 min-w-0"
        >
          <span class="flex items-center gap-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
            <component :is="kpi.icon" class="w-4 h-4 shrink-0" aria-hidden="true" />
            <span class="truncate">{{ kpi.label }}</span>
          </span>
          <span class="font-mono text-2xl font-bold text-zinc-900 dark:text-zinc-100">{{ kpi.value }}</span>
          <span class="text-[11px] leading-snug text-zinc-600 dark:text-zinc-400">{{ kpi.hint }}</span>
        </component>
      </section>

      <!-- Data completeness (brief: warn about incomplete motorcycle data) -->
      <section
        v-if="overview.completeness.motorsWithoutData.length || overview.completeness.rowsToCheck"
        aria-label="Kelengkapan data"
        class="p-4 rounded-2xl border border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 flex flex-col md:flex-row md:items-center gap-3"
      >
        <div class="min-w-0 flex-1 space-y-1">
          <h2 class="text-sm font-bold text-amber-900 dark:text-amber-300">Kelengkapan data</h2>
          <p class="text-sm text-amber-900 dark:text-amber-200/90">
            <strong>{{ overview.completeness.motorsWithoutData.length }} motor</strong> belum punya data baut dan
            <strong>{{ overview.completeness.rowsToCheck }} baris</strong> ukurannya masih perlu cek fisik.
          </p>
          <p class="text-xs text-amber-800 dark:text-amber-300/80 truncate" :title="motorsWithoutDataText">Belum ada data: {{ motorsWithoutDataText }}</p>
        </div>
        <router-link
          v-if="auth.can('VERIFICATION_MANAGE')"
          to="/verifikasi"
          class="min-h-[44px] px-4 py-2 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-sm font-semibold inline-flex items-center gap-1.5 shrink-0"
        >
          Buka Verifikasi Full Bike
          <ArrowRight class="w-4 h-4" aria-hidden="true" />
        </router-link>
      </section>

      <!-- Charts -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Jumlah baut per motor" description="Total pcs baut satu motor penuh, dari tabel kebutuhan baut tiap motor.">
          <BarList :items="motorBars" unit="pcs" aria-label="Jumlah baut per motor" empty-text="Belum ada motor yang punya data baut." />
          <template #footer>{{ overview.totals.motorcyclesWithData }} dari {{ overview.totals.motorcycles }} motor sudah punya data baut.</template>
        </ChartCard>

        <ChartCard title="Baut per area motor" description="Sebaran pcs baut menurut kelompok area pasang, semua motor digabung.">
          <BarList :items="categoryBars" unit="pcs" bar-class="bg-sky-600 dark:bg-sky-400" aria-label="Baut per area motor" />
        </ChartCard>

        <ChartCard
          class="lg:col-span-2"
          title="10 baut paling banyak dipakai"
          description="Barang yang paling banyak dipasang di semua motor. Prioritaskan stok untuk barang ini."
        >
          <BarList :items="topSpecBars" unit="pcs" bar-class="bg-emerald-600 dark:bg-emerald-500" aria-label="10 baut paling banyak dipakai" />
        </ChartCard>

        <ChartCard title="Baut per diameter" description="Jumlah produk baut di Master Barang untuk tiap diameter; di bawahnya total pcs terpakai di motor.">
          <ColumnChart :items="diameterColumns" unit="produk" aria-label="Baut per diameter" />
        </ChartCard>

        <ChartCard title="Barang dipakai per merek" description="Berapa barang Master Barang yang dipasang di motor tiap merek. Satu barang bisa dipakai beberapa merek.">
          <BarList :items="brandBars" unit="barang" aria-label="Barang dipakai per merek" />
        </ChartCard>

        <ChartCard title="Master Barang per jenis" description="Isi katalog toko: baut, mur, ring, emblem, sparepart, oli, dan jasa.">
          <BarList :items="typeBars" unit="barang" bar-class="bg-violet-600 dark:bg-violet-400" aria-label="Master Barang per jenis" />
        </ChartCard>

        <ChartCard title="Foto Master Barang" description="Barang yang sudah punya foto produk, atau masih memakai gambar ilustrasi.">
          <DonutChart :segments="imageSegments" center-label="barang" aria-label="Foto Master Barang" />
        </ChartCard>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { ArrowRight, Bike, Boxes, ClipboardCheck, MapPin, Package, Play, Ruler } from 'lucide-vue-next';
import { useAuthStore } from '../stores/auth';
import { getDiameterTier } from '../utils/boltTokens';
import ChartCard from '../components/charts/ChartCard.vue';
import BarList from '../components/charts/BarList.vue';
import ColumnChart from '../components/charts/ColumnChart.vue';
import DonutChart from '../components/charts/DonutChart.vue';

const auth = useAuthStore();

const overview = ref(null);
const isLoading = ref(true);
const errorMsg = ref('');
const recentSessions = ref([]);

const num = (n) => Number(n || 0).toLocaleString('id-ID');
const canOpenKpi = (to) => auth.can({
  '/pick-list': 'MENU_PAKET_FULL_BIKE', '/bolt-specs': 'MENU_MASTER_BARANG',
  '/bundling': 'MENU_BUNDLING', '/history': 'MENU_RIWAYAT',
}[to]);

const inProgressSession = computed(
  () => recentSessions.value.find((s) => s.status === 'IN_PROGRESS') || null
);

const kpis = computed(() => {
  const t = overview.value.totals;
  const sessionStatus = Object.fromEntries(overview.value.sessionsByStatus.map((s) => [s.label, s.count]));
  return [
    { label: 'Motor', icon: Bike, to: '/pick-list', value: num(t.motorcyclesWithData), hint: `dari ${num(t.motorcycles)} motor sudah punya data baut` },
    { label: 'Master Barang', icon: Ruler, to: '/bolt-specs', value: num(t.specs), hint: `${num(t.bolts)} baut · ${num(t.specsInUse)} dipasang di motor` },
    { label: 'Posisi pasang', icon: MapPin, to: '/pick-list', value: num(t.positions), hint: 'langkah pasang di semua motor' },
    { label: 'Total baut', icon: Boxes, to: '/pick-list', value: num(t.totalPcs), hint: `pcs, dari ${num(t.requirementRows)} baris kebutuhan` },
    { label: 'Bundling', icon: Package, to: '/bundling', value: num(t.packages), hint: `${num(t.activePackages)} aktif` },
    {
      label: 'Sesi checklist',
      icon: ClipboardCheck,
      to: '/history',
      value: num(t.sessions),
      hint: t.sessions ? `${num(sessionStatus.COMPLETED || 0)} selesai · ${num(sessionStatus.IN_PROGRESS || 0)} berjalan` : 'belum ada sesi',
    },
  ];
});

const motorsWithoutDataText = computed(() => overview.value.completeness.motorsWithoutData.map((m) => m.label).join(', ') || '–');

const motorBars = computed(() =>
  overview.value.pcsByMotorcycle.map((m) => ({ label: m.label, value: m.pcs, hint: `${m.rows} baris · ${m.sizes} jenis barang` }))
);

const categoryBars = computed(() =>
  overview.value.pcsByCategory.map((c) => ({ label: c.label, value: c.pcs, hint: `${c.rows} baris kebutuhan` }))
);

const topSpecBars = computed(() =>
  overview.value.topSpecs.map((s) => ({
    label: s.name,
    value: s.pcs,
    hint: `${s.code} · dipakai di ${s.motorcycles} motor, ${s.brands} merek`,
  }))
);

const diameterColumns = computed(() =>
  overview.value.specsByDiameter.map((d) => ({
    label: d.label,
    value: d.count,
    hint: `${num(d.pcs)} pcs`,
    barClass: getDiameterTier(Number(d.label.slice(1))).band,
  }))
);

const BRAND_BARS = { Honda: 'bg-red-600 dark:bg-red-500', Yamaha: 'bg-blue-600 dark:bg-blue-500', Suzuki: 'bg-cyan-600 dark:bg-cyan-500', Kawasaki: 'bg-green-600 dark:bg-green-500' };
const brandBars = computed(() =>
  overview.value.sizesByBrand.map((b) => ({ label: b.label, value: b.count, barClass: BRAND_BARS[b.label] }))
);

const typeBars = computed(() =>
  (overview.value.itemsByType || []).map((t) => ({ label: t.label, value: t.count }))
);

const imageSegments = computed(() => {
  const c = overview.value.imageCoverage;
  return [
    { label: 'Foto produk', value: c.productPhoto, color: '#16A34A' },
    { label: 'Ilustrasi', value: c.illustrationOnly, color: '#2563EB' },
    { label: 'Belum ada gambar', value: c.none, color: '#A1A1AA' },
  ];
});

const loadOverview = async () => {
  isLoading.value = true;
  errorMsg.value = '';
  try {
    const res = await auth.apiFetch('/api/dashboard/overview');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal memuat dashboard.');
    overview.value = data;
  } catch (err) {
    errorMsg.value = err.message || 'Gagal memuat dashboard.';
  } finally {
    isLoading.value = false;
  }
};

const loadSessions = async () => {
  if (!auth.can('MENU_RIWAYAT')) return;
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

onMounted(() => {
  loadOverview();
  loadSessions();
});
</script>
