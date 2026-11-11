<template>
  <div>
    <!-- PRINT-ONLY TABLE -->
    <div v-if="locationData" class="print-only space-y-4">
      <div class="border-b-2 border-black pb-3 flex items-start justify-between">
        <div>
          <p class="text-xs font-mono uppercase">Hex Titanium &bull; Peta Lokasi &amp; Daftar Baut</p>
          <h1 class="text-lg font-bold">{{ locationData.motorcycle.displayName }}</h1>
          <p class="text-xs">
            Paket: {{ locationData.package ? locationData.package.name : 'Lengkap Satu Motor' }}
          </p>
        </div>
        <div class="text-right text-xs font-mono">
          <p>Total: <strong>{{ locationData.summary.totalQuantity }} pcs</strong> ({{ locationData.summary.distinctBoltSpecsCount }} ukuran)</p>
          <p>Dicetak: {{ new Date().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) }}</p>
        </div>
      </div>

      <table class="w-full text-left text-xs border-collapse">
        <thead>
          <tr class="border-b border-black font-mono uppercase text-[11px]">
            <th class="py-2 pr-2">#</th>
            <th class="py-2 pr-2">Kode Baut</th>
            <th class="py-2 pr-2">Ukuran</th>
            <th class="py-2 pr-2">Kepala &amp; Warna</th>
            <th class="py-2 pr-2 text-center">Jumlah</th>
            <th class="py-2">Posisi Pada Motor</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(item, idx) in locationData.bolts"
            :key="item.boltSpecId"
            class="border-b border-zinc-300"
          >
            <td class="py-2 pr-2 font-mono">{{ idx + 1 }}</td>
            <td class="py-2 pr-2 font-mono font-bold">{{ item.code }}</td>
            <td class="py-2 pr-2 font-mono">M{{ Number(item.diameterMm) }} × {{ Number(item.lengthMm) }} mm</td>
            <td class="py-2 pr-2">{{ item.headType }} &bull; {{ item.finish }}</td>
            <td class="py-2 pr-2 text-center font-mono font-bold">{{ item.totalQuantity }} pcs</td>
            <td class="py-2">{{ item.positionsSummary }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- SCREEN UI -->
    <div class="no-print">
      <AppShell>
        <template #topbar>
          <div class="bg-white dark:bg-[#121215] rounded-2xl border border-zinc-300 dark:border-zinc-800 p-4 sm:p-5 shadow-sm space-y-3">
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div class="flex items-center gap-3 min-w-0">
                <router-link
                  to="/pick-list"
                  class="min-h-[44px] px-3 py-2 rounded-xl border border-zinc-400 dark:border-zinc-700 bg-zinc-50 hover:bg-zinc-100 dark:bg-[#18181c] dark:hover:bg-zinc-800 text-xs sm:text-sm font-semibold text-zinc-800 dark:text-zinc-200 inline-flex items-center gap-1.5 shrink-0 transition-colors"
                >
                  <ArrowLeft class="w-4 h-4" aria-hidden="true" />
                  <span>Roster</span>
                </router-link>

                <div
                  v-if="locationData?.motorcycle?.images?.length"
                  class="w-11 h-11 rounded-xl overflow-hidden bg-zinc-900 border border-zinc-300 dark:border-zinc-700 shrink-0 hidden sm:block"
                >
                  <img
                    :src="locationData.motorcycle.images[0].url"
                    :alt="locationData.motorcycle.displayName"
                    class="w-full h-full object-cover"
                  />
                </div>

                <div class="min-w-0 flex-1">
                  <div class="flex flex-wrap items-center gap-2">
                    <h1 class="text-base sm:text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                      {{ locationData?.motorcycle?.displayName || 'Detail Motor' }}
                    </h1>
                    <span
                      v-if="locationData"
                      class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-xs font-medium shrink-0"
                      :class="completeness.text"
                    >
                      <span class="w-2 h-2 rounded-full" :class="completeness.dot" aria-hidden="true"></span>
                      <span>{{ completeness.label }}</span>
                    </span>
                  </div>
                  <p class="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 font-mono mt-0.5">
                    {{ locationData?.package ? locationData.package.name : 'Lengkap Satu Motor' }}
                    <span v-if="locationData">
                      &bull; {{ locationData.summary.totalQuantity }} pcs &bull; {{ locationData.summary.distinctBoltSpecsCount }} ukuran
                    </span>
                  </p>
                </div>
              </div>

              <!-- Header Controls -->
              <div class="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  v-if="auth.isAdmin && locationData"
                  type="button"
                  @click="toggleModelPanel"
                  :aria-pressed="showModelPanel"
                  class="min-h-[44px] px-3.5 py-2 rounded-xl border text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                  :class="showModelPanel
                    ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100'
                    : 'bg-zinc-50 dark:bg-[#18181c] text-zinc-800 dark:text-zinc-200 border-zinc-400 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800'"
                >
                  <Box class="w-4 h-4" aria-hidden="true" />
                  <span>Model 3D</span>
                </button>

                <button
                  v-if="auth.isAdmin && locationData"
                  type="button"
                  @click="annotationMode = !annotationMode"
                  :aria-pressed="annotationMode"
                  class="min-h-[44px] px-3.5 py-2 rounded-xl border text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                  :class="annotationMode
                    ? 'bg-sky-600 text-white border-sky-600 hover:bg-sky-700'
                    : 'bg-zinc-50 dark:bg-[#18181c] text-zinc-800 dark:text-zinc-200 border-zinc-400 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800'"
                >
                  <Crosshair class="w-4 h-4" aria-hidden="true" />
                  <span>{{ annotationMode ? 'Selesai Anotasi' : 'Mode Anotasi' }}</span>
                </button>

                <button
                  v-if="locationData"
                  type="button"
                  @click="handlePrint"
                  class="hidden lg:inline-flex min-h-[44px] px-4 py-2 rounded-xl border border-zinc-400 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-sm font-semibold items-center gap-2 cursor-pointer"
                >
                  <Printer class="w-4 h-4" aria-hidden="true" />
                  <span>Cetak</span>
                </button>

                <button
                  v-if="locationData"
                  type="button"
                  @click="startSession"
                  :disabled="isCreatingSession || locationData.bolts.length === 0"
                  class="hidden lg:inline-flex min-h-[44px] px-5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 text-sm font-bold items-center gap-2 cursor-pointer disabled:opacity-40"
                >
                  <span>{{ isCreatingSession ? 'Menyiapkan...' : 'Mulai Checklist' }}</span>
                  <ArrowRight class="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            <!-- Mobile Tab Switcher: Baut vs Lokasi (only one visible at a time on mobile) -->
            <div v-if="locationData" class="lg:hidden pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <SegmentedControl
                v-model="mobileTab"
                :options="[
                  { value: 'baut', label: 'Baut', count: locationData.bolts.length },
                  { value: 'lokasi', label: 'Lokasi', count: locationData.annotations.length },
                ]"
              />
            </div>
          </div>
        </template>

        <!-- Error State -->
        <div
          v-if="errorMsg"
          role="alert"
          class="bg-rose-50 border border-rose-300 text-rose-800 dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-300 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm"
        >
          <span>{{ errorMsg }}</span>
          <button
            type="button"
            @click="loadLocationMap"
            class="min-h-[44px] px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold cursor-pointer shrink-0"
          >
            Coba Lagi
          </button>
        </div>

        <!-- Loading Skeletons -->
        <div
          v-else-if="isLoading"
          role="status"
          aria-label="Memuat detail dan lokasi baut motor"
          class="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-5"
        >
          <div class="grid grid-cols-2 gap-3">
            <SkeletonCard v-for="n in 4" :key="n" />
          </div>
          <div class="aspect-[4/3] rounded-2xl bg-zinc-200 dark:bg-zinc-800 animate-pulse"></div>
        </div>

        <!-- Main Side-by-Side Workspace (Desktop) / Tabbed Workspace (Mobile) -->
        <div
          v-else-if="locationData"
          class="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-5 items-start"
        >
          <!-- LEFT COLUMN: BOLT CARDS / POSITION SLOTS / PACKAGES -->
          <section
            aria-label="Daftar baut dan paket motor"
            class="space-y-3"
            :class="mobileTab === 'baut' ? 'block' : 'hidden lg:block'"
          >
            <SegmentedControl
              v-model="leftMode"
              :options="leftTabOptions"
            />

            <!-- Sub-view C: Package Preset Cards -->
            <template v-if="leftMode === 'packages'">
              <div class="grid grid-cols-1 gap-2.5">
                <PresetCard
                  :pkg="null"
                  title="Lengkap Satu Motor"
                  :subtitle="`${locationData.positions.length} titik pasang`"
                  :active="!selectedPackageId"
                  @select="selectPackage(null, 'Lengkap Satu Motor')"
                />
                <PresetCard
                  v-for="pkg in locationData.packages"
                  :key="pkg.id"
                  :pkg="pkg"
                  :active="selectedPackageId === pkg.id"
                  @select="selectPackage(pkg.id, pkg.name)"
                />
              </div>
            </template>

            <!-- Sub-views A & B: Bolt Cards & Position Slots -->
            <template v-else>
              <!-- Active Package Indicator Card (1-tap to switch to Paket cards) -->
              <button
                v-if="(locationData.packages?.length || 0) > 0"
                type="button"
                @click="leftMode = 'packages'"
                class="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#121215] border border-zinc-300 dark:border-zinc-700 hover:border-zinc-500 flex items-center justify-between gap-2 text-left transition-colors cursor-pointer"
              >
                <div class="flex items-center gap-2 min-w-0">
                  <Layers class="w-4 h-4 text-zinc-600 dark:text-zinc-400 shrink-0" aria-hidden="true" />
                  <span class="text-xs font-medium text-zinc-600 dark:text-zinc-400 shrink-0">Paket:</span>
                  <span class="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                    {{ locationData.package ? locationData.package.name : 'Lengkap Satu Motor' }}
                  </span>
                </div>
                <span class="text-xs font-semibold text-zinc-700 dark:text-zinc-300 underline shrink-0">
                  Ganti
                </span>
              </button>

              <SearchInput
                v-model="boltSearch"
                placeholder="Cari kode baut, ukuran, atau posisi..."
                aria-label="Cari baut"
              />

              <div v-if="leftMode === 'rack' && sizeTierChips.length > 2" class="flex items-center gap-2 overflow-x-auto pb-1">
                <FilterChip
                  v-for="chip in sizeTierChips"
                  :key="chip.value"
                  :label="chip.label"
                  :count="chip.count"
                  :active="selectedSizeTier === chip.value"
                  @click="selectedSizeTier = chip.value"
                />
              </div>

              <!-- Sub-view A: Bolt Cards (Per Rak) -->
              <template v-if="leftMode === 'rack'">
                <EmptyState
                  v-if="filteredBolts.length === 0"
                  :icon="Nut"
                  title="Baut Tidak Ditemukan"
                  description="Coba ubah kata kunci pencarian atau pilih semua ukuran."
                  action-label="Reset Filter"
                  @action="resetBoltFilter"
                />

                <div v-else class="grid grid-cols-2 gap-3">
                  <ItemCard
                    v-for="bolt in filteredBolts"
                    :key="bolt.boltSpecId"
                    :item="bolt"
                    :selected="selectedBolt?.boltSpecId === bolt.boltSpecId"
                    @select="onSelectBolt(bolt)"
                  />
                </div>
              </template>

              <!-- Sub-view B: Position Slots (Per Titik) -->
              <template v-else>
                <EmptyState
                  v-if="filteredBreakdown.length === 0"
                  :icon="Wrench"
                  title="Titik Tidak Ditemukan"
                  description="Belum ada titik pemasangan yang cocok."
                  action-label="Reset Pencarian"
                  @action="boltSearch = ''"
                />

                <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <SlotCard
                    v-for="(row, idx) in filteredBreakdown"
                    :key="idx"
                    :slot-data="row"
                    @select="onSelectSlot(row)"
                  />
                </div>
              </template>
            </template>
          </section>

          <!-- RIGHT COLUMN: 3D MODEL VIEWER (lazy-loaded) or 2D LocationCanvas fallback -->
          <section
            aria-label="Tampilan lokasi baut pada motor"
            class="lg:sticky lg:top-6 space-y-4"
            :class="mobileTab === 'lokasi' ? 'block' : 'hidden lg:block'"
          >
            <ModelManagerPanel
              v-if="auth.isAdmin && showModelPanel && locationData?.motorcycle?.id"
              :motorcycle-id="locationData.motorcycle.id"
              :motorcycle-name="locationData.motorcycle.displayName"
              :model="locationData.model"
              @uploaded="onModelUploaded"
              @updated="onModelUpdated"
              @deleted="onModelDeleted"
              @close="showModelPanel = false"
            />

            <component
              :is="locationData.model?.modelUrl ? AsyncModelViewer : LocationCanvas"
              :motorcycle="locationData.motorcycle"
              :model="locationData.model"
              :positions="locationData.positions"
              :all-positions="locationData.allPositions || []"
              :annotations="locationData.annotations"
              :bolts="locationData.bolts"
              :position-breakdown="locationData.positionBreakdown"
              :active-annotation="activeAnnotation"
              :selected-bolt="selectedBolt"
              :annotation-mode="annotationMode"
              :can-annotate="auth.isAdmin"
              :is-saving-annotation="isSavingAnnotation"
              :is-deleting-annotation="isDeletingAnnotation"
              @select-annotation="onSelectAnnotation"
              @clear-selection="clearSelection"
              @create-annotation="handleCreateAnnotation"
              @update-annotation="handleUpdateAnnotation"
              @delete-annotation="handleDeleteAnnotation"
              @enable-annotation="annotationMode = true"
            />
          </section>
        </div>

        <!-- Mobile Sticky Bottom Action Bar -->
        <template v-if="locationData" #bottombar>
          <div class="lg:hidden">
            <ActionBar>
              <template #summary>
                <strong class="text-zinc-900 dark:text-zinc-100">{{ locationData.summary.distinctBoltSpecsCount }} ukuran</strong>
                <span aria-hidden="true"> &bull; </span>
                <strong class="text-zinc-900 dark:text-zinc-100">{{ locationData.summary.totalQuantity }} pcs</strong>
              </template>

              <button
                type="button"
                @click="handlePrint"
                class="min-h-[48px] px-4 py-2.5 rounded-xl border border-zinc-400 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <Printer class="w-4 h-4" aria-hidden="true" />
                <span>Cetak</span>
              </button>

              <button
                type="button"
                @click="startSession"
                :disabled="isCreatingSession || locationData.bolts.length === 0"
                class="flex-1 min-h-[48px] px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 text-sm font-bold inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
              >
                <span>{{ isCreatingSession ? 'Menyiapkan...' : 'Mulai Checklist' }}</span>
                <ArrowRight class="w-4 h-4" aria-hidden="true" />
              </button>
            </ActionBar>
          </div>
        </template>
      </AppShell>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, defineAsyncComponent, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ArrowLeft, ArrowRight, Box, Crosshair, Layers, Nut, Printer, Wrench } from 'lucide-vue-next';
import { useAuthStore } from '../stores/auth';
import { useToast } from '../composables/useToast';
import { formatSideLabel, getDiameterTier, getCompletenessMeta } from '../utils/boltTokens';
import AppShell from '../components/ui/AppShell.vue';
import ItemCard from '../components/ui/ItemCard.vue';
import SlotCard from '../components/ui/SlotCard.vue';
import PresetCard from '../components/ui/PresetCard.vue';
import SearchInput from '../components/ui/SearchInput.vue';
import FilterChip from '../components/ui/FilterChip.vue';
import SegmentedControl from '../components/ui/SegmentedControl.vue';
import EmptyState from '../components/ui/EmptyState.vue';
import SkeletonCard from '../components/ui/SkeletonCard.vue';
import ActionBar from '../components/ui/ActionBar.vue';
import LocationCanvas from '../components/location/LocationCanvas.vue';
import ModelManagerPanel from '../components/location/ModelManagerPanel.vue';

const AsyncModelViewer = defineAsyncComponent(() => import('../components/location/ModelViewer.vue'));

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const toast = useToast();

const locationData = ref(null);
const isLoading = ref(false);
const errorMsg = ref('');
const mobileTab = ref('baut');
const leftMode = ref('rack');
const boltSearch = ref('');
const selectedSizeTier = ref('ALL');
const selectedPackageId = ref(route.query.packageId ? parseInt(route.query.packageId, 10) : null);
const selectedBolt = ref(null);
const activeAnnotation = ref(null);
const annotationMode = ref(false);
const showModelPanel = ref(route.query.modelPanel === '1');
const isSavingAnnotation = ref(false);
const isDeletingAnnotation = ref(false);
const isCreatingSession = ref(false);

const completeness = computed(() => {
  return getCompletenessMeta(locationData.value?.positions?.length || 0);
});

const leftTabOptions = computed(() => {
  const opts = [
    { value: 'rack', label: 'Per Rak', count: locationData.value?.bolts?.length || 0 },
    { value: 'slots', label: 'Per Titik', count: locationData.value?.positionBreakdown?.length || 0 },
  ];
  const pkgCount = locationData.value?.packages?.length || 0;
  if (pkgCount > 0) {
    opts.push({ value: 'packages', label: 'Paket', count: pkgCount + 1 });
  }
  return opts;
});

const sizeTierChips = computed(() => {
  const items = locationData.value?.bolts || [];
  const counts = { ALL: items.length, M6: 0, M8: 0, M10: 0, M12: 0 };
  for (const item of items) {
    const key = getDiameterTier(item.diameterMm).key;
    if (counts[key] !== undefined) counts[key]++;
    else counts.M6++;
  }
  const chips = [{ value: 'ALL', label: 'Semua', count: counts.ALL }];
  if (counts.M6) chips.push({ value: 'M6', label: 'M5/M6', count: counts.M6 });
  if (counts.M8) chips.push({ value: 'M8', label: 'M8', count: counts.M8 });
  if (counts.M10) chips.push({ value: 'M10', label: 'M10', count: counts.M10 });
  if (counts.M12) chips.push({ value: 'M12', label: 'M12+', count: counts.M12 });
  return chips;
});

const filteredBolts = computed(() => {
  const items = locationData.value?.bolts || [];
  const q = boltSearch.value.trim().toLowerCase();
  return items.filter((item) => {
    if (selectedSizeTier.value !== 'ALL') {
      const tierKey = getDiameterTier(item.diameterMm).key;
      const normalized = tierKey === 'M5' ? 'M6' : tierKey;
      if (normalized !== selectedSizeTier.value) return false;
    }
    if (!q) return true;
    return (
      (item.code || '').toLowerCase().includes(q) ||
      (item.positionsSummary || '').toLowerCase().includes(q) ||
      `m${Number(item.diameterMm)}`.includes(q)
    );
  });
});

const filteredBreakdown = computed(() => {
  const rows = locationData.value?.positionBreakdown || [];
  const q = boltSearch.value.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((row) =>
    (row.positionName || '').toLowerCase().includes(q) ||
    (row.category || '').toLowerCase().includes(q) ||
    (row.boltSpec?.code || '').toLowerCase().includes(q) ||
    formatSideLabel(row.side).toLowerCase().includes(q)
  );
});

const loadLocationMap = async () => {
  errorMsg.value = '';
  isLoading.value = true;
  try {
    const pkgQuery = selectedPackageId.value ? `?packageId=${encodeURIComponent(selectedPackageId.value)}` : '';
    const res = await auth.apiFetch(`/api/motorcycles/${route.params.motorId}/location-map${pkgQuery}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal memuat detail motor.');

    locationData.value = {
      ...data,
      packages: Array.isArray(data.packages) ? data.packages : [],
      positions: Array.isArray(data.positions) ? data.positions : [],
      allPositions: Array.isArray(data.allPositions) ? data.allPositions : [],
      annotations: Array.isArray(data.annotations) ? data.annotations : [],
      bolts: Array.isArray(data.bolts) ? data.bolts : [],
      positionBreakdown: Array.isArray(data.positionBreakdown) ? data.positionBreakdown : [],
    };

    // Keep activeAnnotation null on load so all visible points auto-show bolt callouts without clicking
    activeAnnotation.value = null;
    selectedBolt.value = null;
  } catch (err) {
    errorMsg.value = err.message === 'Failed to fetch'
      ? 'Tidak dapat terhubung ke server gerai. Periksa sambungan Wi-Fi lalu ketuk Coba Lagi.'
      : err.message;
  } finally {
    isLoading.value = false;
  }
};

const selectPackage = async (pkgId, pkgLabel) => {
  selectedPackageId.value = pkgId;
  await loadLocationMap();
  leftMode.value = 'rack';
  if (pkgLabel) {
    toast.success(`Paket dipilih: ${pkgLabel}`);
  }
};

const findAnnotationForPositions = (posIds, summaryText) => {
  const annotations = locationData.value?.annotations || [];
  const modelId = locationData.value?.model?.id;
  const pool = modelId
    ? annotations.filter((a) => a.modelId === modelId || (a.modelId == null && Number(a.z) !== 0))
    : annotations;
  const searchList = pool.length > 0 ? pool : annotations;

  return searchList.find((a) => posIds.includes(a.boltPositionId))
    || searchList.find((a) => summaryText.toLowerCase().includes((a.boltPosition?.name || '').toLowerCase()))
    || null;
};

const onSelectBolt = (bolt) => {
  selectedBolt.value = bolt;
  const posIds = Array.isArray(bolt.positionIds) ? bolt.positionIds : [];
  const match = findAnnotationForPositions(posIds, bolt.positionsSummary || '');
  activeAnnotation.value = match;

  if (window.innerWidth < 1024) {
    mobileTab.value = 'lokasi';
    if (!match && (locationData.value?.annotations?.length || 0) > 0) {
      toast.info(`Baut ${bolt.code} belum ditandai di peta lokasi.`);
    }
  }
};

const onSelectSlot = (slotRow) => {
  const matchingBolt = (locationData.value?.bolts || []).find((b) => b.boltSpecId === slotRow.boltSpec?.id);
  if (matchingBolt) {
    selectedBolt.value = matchingBolt;
  } else if (slotRow.boltSpec) {
    selectedBolt.value = {
      ...slotRow.boltSpec,
      boltSpecId: slotRow.boltSpec.id,
      totalQuantity: slotRow.quantity,
      positionsSummary: slotRow.positionName,
    };
  }

  const posIds = slotRow.positionId ? [slotRow.positionId] : [];
  const match = findAnnotationForPositions(posIds, slotRow.positionName || '');
  activeAnnotation.value = match;

  if (window.innerWidth < 1024) {
    mobileTab.value = 'lokasi';
  }
};

const onSelectAnnotation = (ann) => {
  activeAnnotation.value = ann;
  const bolts = locationData.value?.bolts || [];
  const matchBolt = bolts.find((b) => Array.isArray(b.positionIds) && b.positionIds.includes(ann.boltPositionId))
    || bolts.find((b) => (b.positionsSummary || '').toLowerCase().includes((ann.boltPosition?.name || '').toLowerCase()));
  selectedBolt.value = matchBolt || bolts[0] || null;
};

const clearSelection = () => {
  activeAnnotation.value = null;
  selectedBolt.value = null;
};

const handleCreateAnnotation = async ({
  boltPositionId,
  x,
  y,
  z = 0,
  normalX = 0,
  normalY = 0,
  normalZ = 1,
  label,
}) => {
  if (!locationData.value || isSavingAnnotation.value) return;
  isSavingAnnotation.value = true;
  try {
    const res = await auth.apiFetch('/api/position-annotations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        boltPositionId,
        motorcycleTypeId: locationData.value.motorcycle.id,
        modelId: locationData.value.model?.id || null,
        x,
        y,
        z,
        normalX,
        normalY,
        normalZ,
        label,
      }),
    });
    const created = await res.json();
    if (!res.ok) throw new Error(created.error || 'Gagal menyimpan penanda lokasi.');

    locationData.value.annotations.push(created);
    onSelectAnnotation(created);
    toast.success('Titik lokasi baut berhasil disimpan');
  } catch (err) {
    toast.error(err.message || 'Gagal menyimpan titik lokasi.');
  } finally {
    isSavingAnnotation.value = false;
  }
};

const handleUpdateAnnotation = async ({ id, boltPositionId, label }) => {
  if (!locationData.value || isSavingAnnotation.value) return;
  isSavingAnnotation.value = true;
  try {
    const res = await auth.apiFetch(`/api/position-annotations/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ boltPositionId, label }),
    });
    const updated = await res.json();
    if (!res.ok) throw new Error(updated.error || 'Gagal memperbarui penanda lokasi.');

    const idx = locationData.value.annotations.findIndex((a) => a.id === id);
    if (idx !== -1) {
      locationData.value.annotations[idx] = updated;
    }
    if (activeAnnotation.value?.id === id) {
      activeAnnotation.value = updated;
    }
    toast.success('Titik lokasi diperbarui');
  } catch (err) {
    toast.error(err.message || 'Gagal memperbarui titik lokasi.');
  } finally {
    isSavingAnnotation.value = false;
  }
};

const handleDeleteAnnotation = async (annotationId) => {
  if (!locationData.value || isDeletingAnnotation.value) return;
  isDeletingAnnotation.value = true;
  try {
    const res = await auth.apiFetch(`/api/position-annotations/${annotationId}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal menghapus penanda lokasi.');

    locationData.value.annotations = locationData.value.annotations.filter((a) => a.id !== annotationId);
    if (activeAnnotation.value?.id === annotationId) {
      activeAnnotation.value = null;
    }
    toast.success('Penanda lokasi dihapus');
  } catch (err) {
    toast.error(err.message || 'Gagal menghapus penanda lokasi.');
  } finally {
    isDeletingAnnotation.value = false;
  }
};

const startSession = async () => {
  if (!locationData.value || isCreatingSession.value) return;
  isCreatingSession.value = true;
  try {
    const res = await auth.apiFetch('/api/pick-lists/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        motorcycleTypeId: locationData.value.motorcycle.id,
        packageId: locationData.value.package?.id || null,
        notes: `Pengambilan baut ${locationData.value.motorcycle.displayName}${locationData.value.package ? ` - ${locationData.value.package.name}` : ''}`,
        items: (locationData.value.bolts || []).map((item) => ({
          boltSpecId: item.boltSpecId,
          quantity: item.totalQuantity,
          positionSummary: item.positionsSummary,
          checked: false,
        })),
      }),
    });
    const session = await res.json();
    if (!res.ok) throw new Error(session.error || 'Gagal memulai sesi checklist.');
    toast.success('Sesi pengambilan baut dimulai');
    router.push(`/pick-list/${session.id}`);
  } catch (err) {
    toast.error(err.message || 'Gagal memulai sesi checklist.');
  } finally {
    isCreatingSession.value = false;
  }
};

const resetBoltFilter = () => {
  boltSearch.value = '';
  selectedSizeTier.value = 'ALL';
};

const toggleModelPanel = () => {
  showModelPanel.value = !showModelPanel.value;
  if (showModelPanel.value) {
    mobileTab.value = 'lokasi';
  }
};

const onModelUploaded = async () => {
  toast.success('Model 3D berhasil diunggah dan dipasang');
  activeAnnotation.value = null;
  await loadLocationMap();
};

const onModelUpdated = (updatedModel) => {
  if (locationData.value) {
    locationData.value.model = updatedModel;
  }
  toast.success('Posisi model 3D disimpan');
};

const onModelDeleted = async () => {
  toast.success('Model 3D dihapus. Tampilan kembali ke foto 2D.');
  activeAnnotation.value = null;
  await loadLocationMap();
};

const handlePrint = () => {
  window.print();
};

onMounted(loadLocationMap);
</script>
