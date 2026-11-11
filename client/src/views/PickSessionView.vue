<template>
  <AppShell>
    <!-- Top Bar -->
    <template #topbar>
      <div class="flex items-center justify-between gap-2">
        <router-link
          to="/pick-list"
          class="min-h-[44px] px-2 -ml-2 inline-flex items-center text-sm font-medium text-zinc-700 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors"
        >
          <ArrowLeft class="w-4 h-4 mr-1.5" aria-hidden="true" />
          Kembali ke Roster
        </router-link>

        <div class="flex items-center gap-2">
          <span
            v-if="session"
            class="hidden sm:inline-flex items-center px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-[11px] font-mono font-bold text-zinc-700 dark:text-zinc-300"
          >
            SESI #{{ session.id }}
          </span>
          <button
            v-if="session"
            @click="handlePrint"
            type="button"
            class="min-h-[44px] px-4 py-2 bg-white dark:bg-[#121215] hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-sm font-medium rounded-xl border border-zinc-400 dark:border-zinc-700 inline-flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Printer class="w-4 h-4 text-zinc-600 dark:text-zinc-400" aria-hidden="true" />
            <span class="hidden sm:inline">Cetak</span>
          </button>
        </div>
      </div>
    </template>

    <!-- Error -->
    <div
      v-if="errorMsg"
      role="alert"
      class="bg-rose-50 border border-rose-300 text-rose-800 dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-300 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm no-print"
    >
      <span>{{ errorMsg }}</span>
      <button
        @click="loadSession"
        type="button"
        class="min-h-[44px] px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold cursor-pointer shrink-0"
      >
        Muat Ulang
      </button>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="space-y-4" role="status" aria-live="polite">
      <div class="h-40 rounded-3xl bg-zinc-200 dark:bg-zinc-800 animate-pulse"></div>
      <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        <SkeletonCard v-for="n in 6" :key="n" />
      </div>
      <span class="sr-only">Memuat daftar checklist baut...</span>
    </div>

    <!-- Quest Tracker -->
    <div v-else-if="session" class="space-y-4">
      <!-- Quest Hero -->
      <section class="relative overflow-hidden rounded-3xl border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-[#121215] shadow-sm">
        <div class="absolute inset-0 bg-gradient-to-br from-zinc-100 via-transparent to-transparent dark:from-zinc-900/60 pointer-events-none" aria-hidden="true"></div>

        <div class="relative p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4">
          <button
            v-if="session.motorcycleType.images && session.motorcycleType.images.length > 0"
            @click="openMotorPhoto(session.motorcycleType)"
            type="button"
            class="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-300 dark:border-zinc-700 shrink-0 cursor-pointer hover:border-zinc-500 transition-all active:scale-[0.98]"
            :aria-label="`Lihat foto motor ${session.motorcycleType.displayName}`"
          >
            <img :src="session.motorcycleType.images[0].url" :alt="session.motorcycleType.displayName" class="w-full h-full object-cover" />
          </button>
          <div
            v-else
            class="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-950 border border-zinc-300 dark:border-zinc-700 shrink-0 flex items-center justify-center"
            aria-hidden="true"
          >
            <Bike class="w-9 h-9 text-zinc-400" />
          </div>

          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2 mb-1.5">
              <span
                class="text-[11px] font-mono px-2.5 py-0.5 rounded-md border font-bold"
                :class="isComplete
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30'
                  : 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30'"
              >
                {{ isComplete ? 'SELESAI' : 'SEDANG DIAMBIL' }}
              </span>
              <span class="text-[11px] font-mono text-zinc-600 dark:text-zinc-400">
                {{ session.creator.name }} &bull; {{ formatDateTime(session.createdAt) }}
              </span>
            </div>

            <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 truncate">
              {{ session.motorcycleType.displayName }}
            </h1>
            <p class="text-sm text-zinc-600 dark:text-zinc-400 font-mono mt-0.5 truncate">
              {{ session.package ? session.package.name : 'Lengkap Satu Motor' }}
            </p>

            <div class="mt-3 flex flex-wrap gap-2">
              <StatPill :icon="ListChecks" label="Item" :value="`${session.checkedItems}/${session.totalItems}`" />
              <StatPill :icon="Nut" label="Total" :value="`${totalPcs} pcs`" />
              <StatPill :icon="CircleCheck" label="Sisa" :value="`${remainingItems} item`" />
            </div>
          </div>

          <div class="shrink-0 self-start sm:self-center">
            <ProgressRing
              :value="session.progressPercent"
              :size="88"
              :stroke-width="8"
              :tone="isComplete ? 'emerald' : 'amber'"
              label="Progres"
              :sublabel="`${session.checkedItems} dari ${session.totalItems}`"
            />
          </div>
        </div>

        <div class="relative px-4 sm:px-6 pb-4 sm:pb-5">
          <ProgressBar
            :value="session.progressPercent"
            :label="isComplete ? 'Semua baut sudah diambil' : 'Terus centang baut yang sudah diambil'"
            :tone="isComplete ? 'emerald' : 'amber'"
          />
        </div>
      </section>

      <!-- Completion Banner -->
      <div
        v-if="isComplete"
        role="status"
        class="p-4 sm:p-5 bg-emerald-50 border border-emerald-300 dark:bg-emerald-500/10 dark:border-emerald-500/30 rounded-2xl flex items-start gap-3"
      >
        <div class="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
          <Check class="w-5 h-5" aria-hidden="true" />
        </div>
        <div class="min-w-0">
          <h2 class="font-bold text-emerald-900 dark:text-emerald-300">Semua Baut Telah Lengkap Diambil</h2>
          <p class="text-sm text-emerald-800 dark:text-emerald-400/90 mt-0.5">
            Daftar baut siap diserahkan kepada teknisi atau pelanggan. Cetak surat kerja bila diperlukan.
          </p>
        </div>
      </div>

      <!-- Mobile Tab Switcher: Checklist vs Model 3D -->
      <div class="lg:hidden no-print">
        <SegmentedControl
          v-model="mobileViewTab"
          :options="[
            { value: 'checklist', label: 'Daftar Baut', count: remainingItems },
            { value: 'model', label: 'Model 3D', count: locationData?.annotations?.length || 0 },
          ]"
        />
      </div>

      <!-- Desktop Split / Mobile Tabbed Workspace -->
      <div class="grid grid-cols-1 lg:grid-cols-[1.05fr_1.15fr] gap-5 items-start">
        <!-- LEFT COLUMN: Checklist Items -->
        <div
          class="space-y-4"
          :class="mobileViewTab === 'checklist' ? 'block' : 'hidden lg:block'"
        >
          <!-- Filters -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
            <SegmentedControl
              v-model="filterMode"
              :options="[
                { value: 'all', label: 'Semua', count: session.items.length },
                { value: 'remaining', label: 'Belum', count: remainingItems },
                { value: 'done', label: 'Sudah', count: session.checkedItems },
              ]"
            />
            <div class="w-full sm:w-56">
              <SearchInput v-model="searchQuery" placeholder="Cari kode atau ukuran..." aria-label="Cari baut dalam checklist" />
            </div>
          </div>

          <!-- Quest Item Grid -->
          <div v-if="filteredItems.length > 0" class="grid grid-cols-2 gap-3">
            <div
              v-for="item in filteredItems"
              :key="item.id"
              class="group relative rounded-2xl border overflow-hidden transition-all duration-150 ease-out print-avoid-break"
              :class="item.checked
                ? 'bg-emerald-50/60 dark:bg-emerald-500/5 border-emerald-400 dark:border-emerald-500/40'
                : 'bg-white dark:bg-[#121215] border-zinc-300 dark:border-zinc-800 hover:border-zinc-500 dark:hover:border-zinc-600 shadow-sm'"
            >
              <button
                type="button"
                role="checkbox"
                :aria-checked="item.checked"
                :disabled="togglingIds.has(item.id)"
                @click="toggleItem(item)"
                class="w-full text-left cursor-pointer disabled:opacity-70 active:scale-[0.99] transition-transform"
              >
                <!-- ~80% Visual Area -->
                <div class="relative aspect-square w-full overflow-hidden bg-zinc-950 flex items-center justify-center">
                  <img
                    v-if="item.boltSpec?.images && item.boltSpec.images.length > 0"
                    :src="item.boltSpec.images[0].url"
                    :alt="item.boltSpec.code"
                    loading="lazy"
                    class="w-full h-full object-cover transition-transform duration-200 ease-out group-hover:scale-[1.03]"
                    :class="item.checked ? 'opacity-65 grayscale-[25%]' : ''"
                  />
                  <div
                    v-else
                    class="w-full h-full bg-gradient-to-br flex flex-col items-center justify-center"
                    :class="tierOf(item).cardTint"
                  >
                    <Nut class="w-9 h-9 text-zinc-300 mb-1" aria-hidden="true" />
                    <span class="font-mono font-bold text-sm text-zinc-200">
                      M{{ Number(item.boltSpec.diameterMm) }} × {{ Number(item.boltSpec.lengthMm) }}
                    </span>
                  </div>

                  <div class="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/85 via-black/40 to-transparent pointer-events-none" aria-hidden="true"></div>

                  <!-- Diameter Tier -->
                  <span
                    class="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[11px] font-mono font-bold border backdrop-blur-sm"
                    :class="tierOf(item).badge"
                  >
                    {{ tierOf(item).label }}
                  </span>

                  <!-- Quantity Badge -->
                  <div class="absolute bottom-2 right-2 px-2.5 py-1 rounded-xl bg-zinc-950/90 border border-white/20 text-white backdrop-blur-sm flex items-baseline gap-1 shadow-md">
                    <span class="text-xl sm:text-2xl font-mono font-bold leading-none">{{ item.quantity }}</span>
                    <span class="text-[11px] font-mono text-zinc-300">pcs</span>
                  </div>

                  <!-- Check State -->
                  <span
                    class="absolute top-2 right-2 w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all duration-200"
                    :class="item.checked
                      ? 'bg-emerald-600 border-emerald-500 text-white scale-100'
                      : 'bg-zinc-950/75 border-white/70 text-transparent backdrop-blur-sm'"
                    aria-hidden="true"
                  >
                    <Check class="w-5 h-5 stroke-[3]" />
                  </span>
                </div>

                <!-- ~20% Compact Short Label -->
                <div class="px-2.5 py-2 space-y-0.5">
                  <p
                    class="font-mono text-xs font-bold truncate leading-tight"
                    :class="item.checked
                      ? 'line-through text-zinc-500 dark:text-zinc-500'
                      : 'text-zinc-900 dark:text-zinc-100'"
                  >
                    M{{ Number(item.boltSpec.diameterMm) }}×{{ Number(item.boltSpec.lengthMm) }} &bull; {{ item.boltSpec.code }}
                  </p>
                  <p class="text-[11px] text-zinc-600 dark:text-zinc-400 truncate leading-tight">
                    {{ item.positionSummary || 'Seluruh motor' }}
                  </p>
                </div>
              </button>

              <!-- Quick Action Overlay Buttons (Photo + Focus 3D Location) -->
              <div class="absolute bottom-[52px] left-2 flex items-center gap-1.5 no-print">
                <button
                  v-if="item.boltSpec?.images && item.boltSpec.images.length > 0"
                  @click.stop="openBoltPhoto(item.boltSpec)"
                  type="button"
                  :aria-label="`Lihat foto baut ${item.boltSpec.code}`"
                  class="min-w-[40px] min-h-[40px] rounded-xl bg-zinc-950/80 border border-white/20 text-white backdrop-blur-sm inline-flex items-center justify-center hover:bg-zinc-900 transition-colors cursor-pointer"
                >
                  <ImageIcon class="w-4 h-4" aria-hidden="true" />
                </button>
                <button
                  v-if="findAnnotationForItem(item)"
                  @click.stop="focusItemOnModel(item)"
                  type="button"
                  :aria-label="`Lihat posisi 3D ${item.boltSpec.code}`"
                  class="min-h-[40px] px-2.5 rounded-xl bg-zinc-950/80 border border-white/20 text-white text-[11px] font-semibold backdrop-blur-sm inline-flex items-center gap-1 hover:bg-zinc-900 transition-colors cursor-pointer"
                >
                  <MapPin class="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
                  <span class="hidden sm:inline">3D</span>
                </button>
              </div>
            </div>
          </div>

          <EmptyState
            v-else
            :icon="PackageOpen"
            :title="searchQuery ? 'Tidak ada baut yang cocok' : 'Semua item pada filter ini selesai'"
            :description="searchQuery ? 'Coba kata kunci lain atau hapus pencarian.' : 'Ubah filter untuk melihat baut lainnya.'"
            :action-label="searchQuery ? 'Hapus Pencarian' : 'Tampilkan Semua'"
            @action="searchQuery ? (searchQuery = '') : (filterMode = 'all')"
          />
        </div>

        <!-- RIGHT COLUMN: Live Interactive 3D / 2D Location Map with Checklist Status -->
        <aside
          v-if="locationData"
          aria-label="Panduan lokasi 3D checklist baut"
          class="lg:sticky lg:top-6 no-print"
          :class="mobileViewTab === 'model' ? 'block' : 'hidden lg:block'"
        >
          <component
            :is="locationData.model?.modelUrl ? AsyncModelViewer : LocationCanvas"
            :motorcycle="locationData.motorcycle"
            :model="locationData.model"
            :positions="locationData.positions"
            :all-positions="locationData.allPositions || []"
            :annotations="locationData.annotations"
            :bolts="locationData.bolts"
            :position-breakdown="locationData.positionBreakdown"
            :session-items="session.items"
            :is-toggling-check="isTogglingPoint"
            :active-annotation="activeAnnotation"
            :selected-bolt="focusedBolt"
            :annotation-mode="false"
            :can-annotate="false"
            @select-annotation="onSelectAnnotation"
            @clear-selection="clearAnnotationSelection"
            @toggle-check="toggleAnnotationItems"
          />
        </aside>
      </div>
    </div>

    <!-- Sticky Action Bar -->
    <template #bottombar>
      <ActionBar v-if="session">
        <template #summary>
          <span class="font-bold text-zinc-900 dark:text-zinc-100">{{ session.checkedItems }}/{{ session.totalItems }}</span>
          <span class="text-zinc-600 dark:text-zinc-400"> diambil &bull; {{ remainingItems }} tersisa</span>
        </template>

        <button
          @click="handlePrint"
          type="button"
          class="min-h-[48px] px-4 py-2.5 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm font-medium rounded-xl border border-zinc-400 dark:border-zinc-700 inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <Printer class="w-4 h-4 text-zinc-600 dark:text-zinc-400" aria-hidden="true" />
          <span class="hidden sm:inline">Cetak</span>
        </button>

        <button
          v-if="!isComplete"
          @click="confirmCompleteOpen = true"
          type="button"
          class="flex-1 sm:flex-initial min-h-[48px] px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 text-sm font-semibold rounded-xl inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <Check class="w-4 h-4" aria-hidden="true" />
          Tandai Semua Diambil
        </button>

        <router-link
          v-else
          to="/pick-list"
          class="flex-1 sm:flex-initial min-h-[48px] px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl inline-flex items-center justify-center gap-2 transition-colors"
        >
          <Check class="w-4 h-4" aria-hidden="true" />
          Ambil Motor Lain
        </router-link>
      </ActionBar>
    </template>
  </AppShell>

  <!-- Confirm Complete -->
  <ConfirmDialog
    :open="confirmCompleteOpen"
    title="Tandai semua baut sudah diambil?"
    :message="`Masih ada ${remainingItems} item yang belum dicentang. Tindakan ini akan menandai semuanya sebagai sudah diambil dan menutup sesi.`"
    confirm-text="Ya, Tandai Semua"
    cancel-text="Batal"
    :loading="isCompleting"
    @cancel="confirmCompleteOpen = false"
    @confirm="markAllTaken"
  />

  <!-- Photo Gallery -->
  <PhotoGalleryModal
    v-if="galleryModal.isOpen"
    :is-open="galleryModal.isOpen"
    :category-title="galleryModal.categoryTitle"
    :item-title="galleryModal.itemTitle"
    :item-subtitle="galleryModal.itemSubtitle"
    :images="galleryModal.images"
    :can-manage="false"
    :upload-endpoint="''"
    :delete-endpoint-base="''"
    :primary-endpoint-base="''"
    :auth-headers="auth.authHeaders"
    @close="galleryModal.isOpen = false"
  />
</template>

<script setup>
import { ref, computed, defineAsyncComponent, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import {
  ArrowLeft,
  Bike,
  Check,
  CircleCheck,
  Image as ImageIcon,
  ListChecks,
  MapPin,
  Nut,
  PackageOpen,
  Printer,
} from 'lucide-vue-next';
import { useAuthStore } from '../stores/auth';
import { useToast } from '../composables/useToast';
import { getDiameterTier } from '../utils/boltTokens';
import { formatDateTime } from '../utils/date';
import { resolveBoltForAnnotation, resolveChecklistStatus } from '../utils/annotationCallouts';
import PhotoGalleryModal from '../components/PhotoGalleryModal.vue';
import LocationCanvas from '../components/location/LocationCanvas.vue';
import AppShell from '../components/ui/AppShell.vue';
import ActionBar from '../components/ui/ActionBar.vue';
import ProgressBar from '../components/ui/ProgressBar.vue';
import ProgressRing from '../components/ui/ProgressRing.vue';
import SegmentedControl from '../components/ui/SegmentedControl.vue';
import SearchInput from '../components/ui/SearchInput.vue';
import EmptyState from '../components/ui/EmptyState.vue';
import SkeletonCard from '../components/ui/SkeletonCard.vue';
import StatPill from '../components/ui/StatPill.vue';
import ConfirmDialog from '../components/ui/ConfirmDialog.vue';

const AsyncModelViewer = defineAsyncComponent(() => import('../components/location/ModelViewer.vue'));

const route = useRoute();
const auth = useAuthStore();
const toast = useToast();

const session = ref(null);
const locationData = ref(null);
const isLoading = ref(false);
const errorMsg = ref('');
const togglingIds = ref(new Set());
const isTogglingPoint = ref(false);
const mobileViewTab = ref('checklist');
const activeAnnotation = ref(null);
const focusedBolt = ref(null);
const filterMode = ref('all');
const searchQuery = ref('');
const confirmCompleteOpen = ref(false);
const isCompleting = ref(false);

const galleryModal = ref({
  isOpen: false,
  categoryTitle: '',
  itemTitle: '',
  itemSubtitle: '',
  images: [],
});

const isComplete = computed(() => {
  if (!session.value) return false;
  return session.value.status === 'COMPLETED'
    || (session.value.totalItems > 0 && session.value.checkedItems === session.value.totalItems);
});

const remainingItems = computed(() => {
  if (!session.value) return 0;
  return Math.max(0, session.value.totalItems - session.value.checkedItems);
});

const totalPcs = computed(() => {
  if (!session.value) return 0;
  return session.value.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
});

const filteredItems = computed(() => {
  if (!session.value) return [];
  const q = searchQuery.value.trim().toLowerCase();
  return session.value.items.filter((item) => {
    if (filterMode.value === 'remaining' && item.checked) return false;
    if (filterMode.value === 'done' && !item.checked) return false;
    if (!q) return true;
    const haystack = [
      item.boltSpec?.code,
      item.boltSpec?.headType,
      item.boltSpec?.finish,
      item.positionSummary,
      `m${Number(item.boltSpec?.diameterMm)}`,
      `m${Number(item.boltSpec?.diameterMm)}x${Number(item.boltSpec?.lengthMm)}`,
    ].filter(Boolean).join(' ').toLowerCase();
    return haystack.includes(q);
  });
});

const tierOf = (item) => getDiameterTier(item.boltSpec?.diameterMm);

const openMotorPhoto = (motor) => {
  galleryModal.value = {
    isOpen: true,
    categoryTitle: 'Foto Tipe Sepeda Motor',
    itemTitle: motor.displayName,
    itemSubtitle: `${motor.brand} ${motor.model}`,
    images: motor.images || [],
  };
};

const openBoltPhoto = (boltSpec) => {
  galleryModal.value = {
    isOpen: true,
    categoryTitle: 'Foto Spesifikasi Baut Titanium',
    itemTitle: boltSpec.code,
    itemSubtitle: `${boltSpec.headType || ''} M${Number(boltSpec.diameterMm)} × ${Number(boltSpec.lengthMm)}mm • ${boltSpec.finish || ''}`,
    images: boltSpec.images || [],
  };
};

const loadLocationData = async (motorcycleTypeId, packageId) => {
  if (!motorcycleTypeId) return;
  try {
    const pkgQuery = packageId ? `?packageId=${encodeURIComponent(packageId)}` : '';
    const res = await auth.apiFetch(`/api/motorcycles/${motorcycleTypeId}/location-map${pkgQuery}`);
    if (!res.ok) return;
    const data = await res.json();
    locationData.value = {
      ...data,
      positions: Array.isArray(data.positions) ? data.positions : [],
      allPositions: Array.isArray(data.allPositions) ? data.allPositions : [],
      annotations: Array.isArray(data.annotations) ? data.annotations : [],
      bolts: Array.isArray(data.bolts) ? data.bolts : [],
      positionBreakdown: Array.isArray(data.positionBreakdown) ? data.positionBreakdown : [],
    };
  } catch {
    // Non-fatal: checklist remains usable even if 3D map fails to load
  }
};

const loadSession = async () => {
  errorMsg.value = '';
  isLoading.value = true;
  try {
    const res = await auth.apiFetch(`/api/pick-lists/sessions/${route.params.sessionId}`);
    if (!res.ok) throw new Error('Data sesi checklist tidak ditemukan.');
    session.value = await res.json();
    await loadLocationData(session.value.motorcycleTypeId, session.value.packageId);
  } catch (err) {
    errorMsg.value = err.message === 'Failed to fetch'
      ? 'Tidak dapat terhubung ke server gerai. Periksa sambungan Wi-Fi lalu ketuk Muat Ulang.'
      : err.message;
  } finally {
    isLoading.value = false;
  }
};

const findAnnotationForItem = (item) => {
  const annotations = locationData.value?.annotations || [];
  if (!annotations.length || !item) return null;
  const modelId = locationData.value?.model?.id;
  const pool = modelId
    ? annotations.filter((a) => a.modelId === modelId || (a.modelId == null && Number(a.z) !== 0))
    : annotations;
  const list = pool.length > 0 ? pool : annotations;

  const bolts = locationData.value?.bolts || [];
  const matchBolt = bolts.find((b) => b.boltSpecId === item.boltSpecId);
  const posIds = Array.isArray(matchBolt?.positionIds) ? matchBolt.positionIds : [];

  return list.find((a) => posIds.includes(a.boltPositionId))
    || list.find((a) => (item.positionSummary || '').toLowerCase().includes((a.boltPosition?.name || '').toLowerCase()))
    || null;
};

const focusItemOnModel = (item) => {
  const ann = findAnnotationForItem(item);
  if (!ann) return;
  onSelectAnnotation(ann);
  if (window.innerWidth < 1024) {
    mobileViewTab.value = 'model';
  }
};

const onSelectAnnotation = (ann) => {
  activeAnnotation.value = ann;
  const resolved = resolveBoltForAnnotation(ann, locationData.value?.bolts, locationData.value?.positionBreakdown);
  if (resolved?.bolt) {
    focusedBolt.value = resolved.bolt;
    return;
  }
  const bolts = locationData.value?.bolts || [];
  focusedBolt.value = bolts.find((b) => Array.isArray(b.positionIds) && b.positionIds.includes(ann.boltPositionId))
    || bolts[0]
    || null;
};

const clearAnnotationSelection = () => {
  activeAnnotation.value = null;
  focusedBolt.value = null;
};

const toggleAnnotationItems = async (ann) => {
  if (!session.value || !ann || isTogglingPoint.value) return;
  const statusInfo = resolveChecklistStatus(
    ann,
    session.value.items,
    locationData.value?.bolts,
    locationData.value?.positionBreakdown
  );
  if (!statusInfo.matchingItems.length) {
    toast.info('Tidak ada item checklist yang terkait dengan titik ini.');
    return;
  }

  const nextChecked = statusInfo.status !== 'done';
  isTogglingPoint.value = true;
  try {
    for (const item of statusInfo.matchingItems) {
      if (item.checked !== nextChecked) {
        await toggleItem(item);
      }
    }
    const label = ann.label || ann.boltPosition?.name || 'Titik baut';
    toast.success(nextChecked ? `Ditandai sudah diambil: ${label}` : `Centang dibatalkan: ${label}`);
  } finally {
    isTogglingPoint.value = false;
  }
};

const toggleItem = async (item) => {
  if (togglingIds.value.has(item.id)) return;
  errorMsg.value = '';
  const newChecked = !item.checked;
  item.checked = newChecked;
  togglingIds.value.add(item.id);

  try {
    const res = await auth.apiFetch(`/api/pick-lists/sessions/${session.value.id}/items/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checked: newChecked }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal memperbarui status item.');

    session.value.status = data.sessionStatus;
    session.value.checkedItems = session.value.items.filter((i) => i.checked).length;
    session.value.progressPercent = session.value.totalItems > 0
      ? Math.round((session.value.checkedItems / session.value.totalItems) * 100)
      : 0;

    if (data.sessionStatus === 'COMPLETED') {
      toast.success('Semua baut sudah diambil. Sesi selesai.');
    }
  } catch (err) {
    item.checked = !newChecked;
    errorMsg.value = err.message === 'Failed to fetch'
      ? 'Gagal menyimpan centang karena sambungan Wi-Fi terputus. Coba ketuk lagi.'
      : err.message;
    toast.error(errorMsg.value);
  } finally {
    togglingIds.value.delete(item.id);
  }
};

const markAllTaken = async () => {
  if (!session.value || isCompleting.value) return;
  isCompleting.value = true;
  errorMsg.value = '';

  const unchecked = session.value.items.filter((item) => !item.checked);
  try {
    for (const item of unchecked) {
      const res = await auth.apiFetch(`/api/pick-lists/sessions/${session.value.id}/items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checked: true }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Gagal menandai semua item.');
      }
      item.checked = true;
    }

    session.value.checkedItems = session.value.items.length;
    session.value.progressPercent = 100;
    session.value.status = 'COMPLETED';
    confirmCompleteOpen.value = false;
    toast.success('Semua baut ditandai sudah diambil.');
  } catch (err) {
    errorMsg.value = err.message === 'Failed to fetch'
      ? 'Sambungan terputus saat menandai semua item. Periksa Wi-Fi lalu coba lagi.'
      : err.message;
    toast.error(errorMsg.value);
    await loadSession();
  } finally {
    isCompleting.value = false;
  }
};

const handlePrint = () => {
  window.print();
};

onMounted(loadSession);
</script>
