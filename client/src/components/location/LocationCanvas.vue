<template>
  <div class="bg-white dark:bg-[#121215] rounded-2xl border border-zinc-300 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col">
    <!-- Canvas Header Bar -->
    <div class="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2">
      <div class="flex items-center gap-2 min-w-0">
        <MapPin class="w-4 h-4 text-zinc-600 dark:text-zinc-400 shrink-0" aria-hidden="true" />
        <span class="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
          {{ annotationMode ? 'Mode Anotasi Admin — Ketuk foto untuk menandai' : 'Peta Lokasi Baut' }}
        </span>
      </div>

      <div class="flex items-center gap-2">
        <button
          v-if="annotations2D.length > 0 && !annotationMode"
          type="button"
          @click="autoShowCallouts = !autoShowCallouts"
          :aria-pressed="autoShowCallouts"
          class="min-h-[36px] px-2.5 py-1 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
          :class="autoShowCallouts
            ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100'
            : 'bg-zinc-50 dark:bg-[#18181c] text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800'"
        >
          <Eye class="w-3.5 h-3.5" aria-hidden="true" />
          <span>Label Otomatis</span>
        </button>

        <span class="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 font-mono text-xs font-semibold text-zinc-800 dark:text-zinc-200">
          {{ annotations2D.length }} titik
        </span>
      </div>
    </div>

    <!-- Interactive Photo + Hotspot Stage -->
    <div
      ref="stageRef"
      @click="onStageClick"
      class="relative w-full aspect-[4/3] sm:aspect-[16/11] bg-zinc-950 overflow-hidden select-none"
      :class="annotationMode ? 'cursor-crosshair' : ''"
    >
      <img
        v-if="displayPhotoUrl"
        :src="displayPhotoUrl"
        :alt="motorcycle?.displayName || 'Foto Motor'"
        @load="recomputeLine"
        class="w-full h-full object-contain pointer-events-none"
      />
      <div
        v-else
        class="w-full h-full flex flex-col items-center justify-center text-zinc-400 p-6 text-center bg-gradient-to-br from-zinc-900 to-zinc-950"
      >
        <Bike class="w-16 h-16 text-zinc-600 mb-2" aria-hidden="true" />
        <p class="text-sm font-semibold text-zinc-200">
          {{ motorcycle?.displayName }}
        </p>
        <p class="text-xs text-zinc-400 mt-1">
          Belum ada foto motor. Unggah foto motor terlebih dahulu atau tandai titik referensi.
        </p>
      </div>

      <!-- Auto-Show Leader Lines + Compact Bolt Callouts for all 2D visible points -->
      <template v-if="autoCallouts2D.length > 0">
        <LeaderLine
          v-for="c in autoCallouts2D"
          :key="`auto2d-line-${c.annotation.id}`"
          :x1="c.lineX1"
          :y1="c.lineY1"
          :x2="c.lineX2"
          :y2="c.lineY2"
          :subtle="true"
        />

        <div
          v-for="c in autoCallouts2D"
          :key="`auto2d-card-${c.annotation.id}`"
          class="absolute z-20 pointer-events-none"
          :style="{
            left: `${c.cardX}px`,
            top: `${c.cardY}px`,
            width: `${c.cardW}px`,
            height: `${c.cardH}px`,
          }"
        >
          <AutoCalloutCard
            :index="c.index"
            :bolt="c.resolved.bolt"
            :image-url="c.resolved.partImageUrl"
            :minimal-mode="true"
            :quantity="c.resolved.quantity"
            :extra-specs-count="c.resolved.extraSpecsCount"
            :position-name="c.resolved.positionName"
            :check-status="getCheckStatus(c.annotation)"
            @select="onSelectAnnotation(c.annotation)"
          />
        </div>
      </template>

      <!-- Saved Hotspots -->
      <template v-if="!(activeAnnotation && !annotationMode)">
        <HotspotMarker
          v-for="(ann, idx) in annotations2D"
          :key="ann.id"
          :x="ann.x"
          :y="ann.y"
          :index-number="idx + 1"
          :label="ann.label || ann.boltPosition?.name || 'Titik Baut'"
          :active="activeAnnotation?.id === ann.id"
          :check-status="getCheckStatus(ann)"
          @select="onSelectAnnotation(ann)"
        />
      </template>

      <!-- Draft Hotspot (when Admin clicks to place a new point) -->
      <HotspotMarker
        v-if="annotationMode && draftPoint"
        :x="draftPoint.x"
        :y="draftPoint.y"
        index-number="+"
        label="Titik Baru"
        :draft="true"
        @select="() => {}"
      />

      <!-- Focused Part Overlay: Softly blurs 2D motor background, focuses chosen area image + bolt AutoCalloutCards -->
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0 scale-[0.98]"
        enter-to-class="opacity-100 scale-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-[0.98]"
      >
        <FocusedPartOverlay
          v-if="activeAnnotation && !annotationMode"
          :annotation="activeAnnotation"
          :close-up-photos="closeUpPhotos"
          :motorcycle="motorcycle"
          :bolts="bolts"
          :position-breakdown="positionBreakdown"
          :session-items="sessionItems"
          :is-toggling-check="isTogglingCheck"
          @close="$emit('clear-selection')"
          @toggle-spec-check="$emit('toggle-spec-check', $event)"
        />
      </Transition>
    </div>

    <!-- Compact Empty Annotations Bar (below photo so motor image stays unobstructed) -->
    <div
      v-if="annotations2D.length === 0 && !annotationMode"
      class="px-4 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#18181c] flex flex-wrap items-center justify-between gap-2"
    >
      <p class="text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Lokasi belum ditandai. Hubungi admin.
      </p>
      <button
        v-if="canAnnotate"
        type="button"
        @click.stop="$emit('enable-annotation')"
        class="min-h-[44px] px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 text-xs font-bold cursor-pointer transition-colors shrink-0"
      >
        Tandai Lokasi Sekarang
      </button>
    </div>

    <!-- Inline Note when bolt is selected on left list but has no annotation yet -->
    <div
      v-if="selectedBolt && !activeAnnotation && !annotationMode && annotations2D.length > 0"
      class="px-4 py-2.5 bg-amber-50 dark:bg-amber-500/10 border-t border-amber-300 dark:border-amber-500/30 text-xs text-amber-900 dark:text-amber-300 flex items-center justify-between gap-2"
    >
      <span>
        Baut <strong>{{ selectedBolt.code }}</strong> belum memiliki titik lokasi yang ditandai pada gambar ini.
      </span>
      <button
        v-if="canAnnotate"
        type="button"
        @click="$emit('enable-annotation')"
        class="min-h-[36px] px-3 py-1 rounded-lg bg-amber-800 text-white font-semibold cursor-pointer shrink-0"
      >
        Tandai
      </button>
    </div>

    <!-- ADMIN INLINE ANNOTATION PANEL (No Modals!) -->
    <div
      v-if="annotationMode && canAnnotate"
      class="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#18181c] space-y-4"
    >
      <!-- Draft Creation Form -->
      <div v-if="draftPoint" class="p-3.5 rounded-xl bg-white dark:bg-[#121215] border border-sky-400 dark:border-sky-500/50 space-y-3">
        <div class="flex items-center justify-between gap-2">
          <p class="text-xs font-bold text-zinc-900 dark:text-zinc-100">
            Titik Baru ({{ draftPoint.x.toFixed(1) }}%, {{ draftPoint.y.toFixed(1) }}%)
          </p>
          <button
            type="button"
            @click="draftPoint = null"
            class="min-h-[36px] px-2.5 text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
          >
            Batal
          </button>
        </div>

        <form @submit.prevent="submitDraft" class="space-y-3">
          <div class="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
            <div class="sm:col-span-7">
              <AreaLabelInput
                input-id="annotation-position-select"
                label="Area / Posisi Motor"
                v-model:position-id="draftPositionId"
                v-model:custom-name="draftCustomName"
                v-model:custom-category="draftCustomCategory"
                :motor-positions="positions"
                :all-positions="allPositions"
                :required="true"
              />
            </div>

            <div class="sm:col-span-5">
              <label for="annotation-label-input" class="block text-[11px] font-mono uppercase text-zinc-600 dark:text-zinc-400 mb-1">
                Label Singkat (Opsional)
              </label>
              <input
                id="annotation-label-input"
                v-model="draftLabel"
                type="text"
                placeholder="Misal: Bak CVT Kiri"
                class="w-full min-h-[44px] px-3 py-2 rounded-xl bg-zinc-50 dark:bg-[#18181c] border border-zinc-400 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
            <div v-if="allSpecs.length > 0" class="sm:col-span-7">
              <BoltSpecPicker
                v-model="draftBoltSpecId"
                :specs="allSpecs"
                input-id="anno2d-spec-picker"
                label="Sekaligus Tambah Baut di Titik Ini (Opsional)"
                placeholder="-- Pilih Baut jika sekalian tambah --"
              />
            </div>

            <div v-if="allSpecs.length > 0" class="sm:col-span-3">
              <label for="anno2d-qty-input" class="block text-[11px] font-mono uppercase text-zinc-600 dark:text-zinc-400 mb-1">
                Jumlah
              </label>
              <div class="flex items-center rounded-xl bg-zinc-50 dark:bg-[#18181c] border border-zinc-400 dark:border-zinc-700 overflow-hidden min-h-[44px]" :class="!draftBoltSpecId ? 'opacity-50' : ''">
                <button
                  type="button"
                  :disabled="!draftBoltSpecId || draftQty <= 1"
                  @click="draftQty = Math.max(1, draftQty - 1)"
                  class="w-9 h-[42px] inline-flex items-center justify-center text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 disabled:opacity-40 cursor-pointer"
                  aria-label="Kurangi jumlah"
                >
                  -
                </button>
                <input
                  id="anno2d-qty-input"
                  v-model.number="draftQty"
                  :disabled="!draftBoltSpecId"
                  type="number"
                  min="1"
                  max="100"
                  class="w-full text-center bg-transparent text-sm font-mono font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none"
                />
                <button
                  type="button"
                  :disabled="!draftBoltSpecId"
                  @click="draftQty = Math.min(100, draftQty + 1)"
                  class="w-9 h-[42px] inline-flex items-center justify-center text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 disabled:opacity-40 cursor-pointer"
                  aria-label="Tambah jumlah"
                >
                  +
                </button>
              </div>
            </div>

            <div :class="allSpecs.length > 0 ? 'sm:col-span-2' : 'sm:col-span-12 flex justify-end'">
              <button
                type="submit"
                :disabled="isSavingAnnotation || (!draftPositionId && !draftCustomName.trim())"
                class="w-full min-h-[44px] px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 text-xs font-bold cursor-pointer disabled:opacity-40"
              >
                {{ isSavingAnnotation ? '...' : (draftBoltSpecId ? 'Simpan Titik & Baut' : 'Simpan Titik') }}
              </button>
            </div>
          </div>
        </form>
      </div>

      <div v-else class="flex flex-wrap items-center justify-between gap-2">
        <p class="text-xs text-zinc-600 dark:text-zinc-400">
          Ketuk titik mana saja pada foto motor di atas untuk menempatkan penanda lokasi baru.
        </p>
        <button
          type="button"
          @click="$emit('disable-annotation')"
          class="min-h-[36px] px-3 py-1.5 rounded-lg border border-zinc-400 dark:border-zinc-700 bg-white dark:bg-[#121215] hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-800 dark:text-zinc-200 cursor-pointer shrink-0"
        >
          Selesai Tandai
        </button>
      </div>

      <!-- Existing Annotations List (with delete) -->
      <div v-if="annotations2D.length > 0" class="space-y-2">
        <p class="text-xs font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
          Daftar Titik Terpasang ({{ annotations2D.length }})
        </p>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div
            v-for="(ann, idx) in annotations2D"
            :key="ann.id"
            class="p-2.5 rounded-xl bg-white dark:bg-[#121215] border border-zinc-300 dark:border-zinc-700 flex items-center justify-between gap-2"
          >
            <button
              type="button"
              @click="onSelectAnnotation(ann)"
              class="min-h-[44px] flex items-center gap-2 min-w-0 text-left flex-1 cursor-pointer"
            >
              <span class="w-6 h-6 rounded-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-mono text-xs font-bold flex items-center justify-center shrink-0">
                {{ idx + 1 }}
              </span>
              <div class="min-w-0">
                <p class="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                  {{ ann.label || ann.boltPosition?.name }}
                </p>
                <p class="text-[11px] font-mono text-zinc-600 dark:text-zinc-400">
                  {{ ann.x.toFixed(0) }}%, {{ ann.y.toFixed(0) }}%
                </p>
              </div>
            </button>

            <button
              type="button"
              @click="confirmDeleteTarget = ann"
              :aria-label="`Hapus titik ${ann.label || ann.boltPosition?.name}`"
              class="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-xl text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10 cursor-pointer shrink-0"
            >
              <Trash2 class="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Confirm Delete Annotation (only destructive modal) -->
    <ConfirmDialog
      :open="Boolean(confirmDeleteTarget)"
      title="Hapus Penanda Lokasi?"
      :message="`Penanda &quot;${confirmDeleteTarget?.label || confirmDeleteTarget?.boltPosition?.name || 'Titik'}&quot; akan dihapus dari peta lokasi motor ini.`"
      confirm-text="Ya, Hapus"
      :danger="true"
      :loading="isDeletingAnnotation"
      @confirm="executeDelete"
      @cancel="confirmDeleteTarget = null"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { Bike, Eye, MapPin, Trash2 } from 'lucide-vue-next';
import { resolvePartCalloutForAnnotation, resolveChecklistStatus, layoutVisibleCallouts } from '../../utils/annotationCallouts';
import HotspotMarker from './HotspotMarker.vue';
import FocusedPartOverlay from './FocusedPartOverlay.vue';
import AutoCalloutCard from './AutoCalloutCard.vue';
import LeaderLine from './LeaderLine.vue';
import ConfirmDialog from '../ui/ConfirmDialog.vue';
import AreaLabelInput from '../ui/AreaLabelInput.vue';
import BoltSpecPicker from '../ui/BoltSpecPicker.vue';

const props = defineProps({
  motorcycle: { type: Object, default: null },
  positions: { type: Array, default: () => [] },
  allPositions: { type: Array, default: () => [] },
  allSpecs: { type: Array, default: () => [] },
  annotations: { type: Array, default: () => [] },
  closeUpPhotos: { type: Array, default: () => [] },
  bolts: { type: Array, default: () => [] },
  positionBreakdown: { type: Array, default: () => [] },
  sessionItems: { type: Array, default: null },
  isTogglingCheck: { type: Boolean, default: false },
  activeAnnotation: { type: Object, default: null },
  selectedBolt: { type: Object, default: null },
  annotationMode: { type: Boolean, default: false },
  canAnnotate: { type: Boolean, default: false },
  isSavingAnnotation: { type: Boolean, default: false },
  isDeletingAnnotation: { type: Boolean, default: false },
});

const emit = defineEmits([
  'select-annotation',
  'clear-selection',
  'toggle-check',
  'toggle-spec-check',
  'create-annotation',
  'delete-annotation',
  'enable-annotation',
  'disable-annotation',
]);

function getCheckStatus(ann) {
  if (!Array.isArray(props.sessionItems) || !ann) return null;
  return resolveChecklistStatus(ann, props.sessionItems, props.bolts, props.positionBreakdown).status;
}

const stageRef = ref(null);
const cardWrapRef = ref(null);
const draftPoint = ref(null);
const draftPositionId = ref('');
const draftCustomName = ref('');
const draftCustomCategory = ref('');
const draftLabel = ref('');
const draftBoltSpecId = ref('');
const draftQty = ref(1);
const confirmDeleteTarget = ref(null);
const autoShowCallouts = ref(true);
const stageSize = ref({ width: 600, height: 400 });
const lineCoords = ref(null);

const activePositionPhoto = computed(() => {
  if (!props.activeAnnotation) return null;
  const fromMotorPos = props.positions.find((p) => p.id === props.activeAnnotation.boltPositionId);
  return props.activeAnnotation.boltPosition?.photoUrl || fromMotorPos?.photoUrl || null;
});

const displayPhotoUrl = computed(() => {
  return activePositionPhoto.value || props.motorcycle?.images?.[0]?.url || null;
});

const annotations2D = computed(() => {
  return (props.annotations || []).filter((a) => a.modelId == null && Number(a.z) === 0);
});

const autoCallouts2D = computed(() => {
  if (!autoShowCallouts.value || props.annotationMode || props.activeAnnotation) return [];
  const w = stageSize.value.width;
  const h = stageSize.value.height;
  if (!w || !h) return [];
  const entries = annotations2D.value
    .map((ann, idx) => ({
      annotation: ann,
      index: idx + 1,
      screenX: (Number(ann.x) / 100) * w,
      screenY: (Number(ann.y) / 100) * h,
      resolved: resolvePartCalloutForAnnotation(
        ann,
        props.closeUpPhotos,
        props.motorcycle,
        props.bolts,
        props.positionBreakdown
      ),
    }))
    .filter((entry) => Boolean(entry.resolved?.bolt));
  return layoutVisibleCallouts(entries, w, h);
});

const otherPositions = computed(() => {
  const motorIds = new Set(props.positions.map((p) => p.id));
  return props.allPositions.filter((p) => !motorIds.has(p.id));
});

// Place FloatingBoltCard in opposite quadrant of active hotspot so it never obscures the point
const cardPositionClass = computed(() => {
  if (!props.activeAnnotation) return 'right-3 bottom-3';
  const horizontal = props.activeAnnotation.x > 52 ? 'left-3' : 'right-3';
  const vertical = props.activeAnnotation.y > 55 ? 'top-3' : 'bottom-3';
  return `${horizontal} ${vertical}`;
});

const recomputeLine = () => {
  if (stageRef.value) {
    const sRect = stageRef.value.getBoundingClientRect();
    if (sRect.width && sRect.height) {
      stageSize.value = { width: sRect.width, height: sRect.height };
    }
  }
  if (!props.activeAnnotation || !props.selectedBolt || !stageRef.value || !cardWrapRef.value) {
    lineCoords.value = null;
    return;
  }
  const stageRect = stageRef.value.getBoundingClientRect();
  const cardRect = cardWrapRef.value.getBoundingClientRect();
  if (!stageRect.width || !stageRect.height) return;

  const x1 = (props.activeAnnotation.x / 100) * stageRect.width;
  const y1 = (props.activeAnnotation.y / 100) * stageRect.height;

  // Connect to nearest center-edge of FloatingBoltCard relative to stage
  const cardLeft = cardRect.left - stageRect.left;
  const cardRight = cardRect.right - stageRect.left;
  const cardTop = cardRect.top - stageRect.top;
  const cardBottom = cardRect.bottom - stageRect.top;

  const x2 = x1 < cardLeft ? cardLeft : x1 > cardRight ? cardRight : (cardLeft + cardRight) / 2;
  const y2 = y1 < cardTop ? cardTop : y1 > cardBottom ? cardBottom : (cardTop + cardBottom) / 2;

  lineCoords.value = { x1, y1, x2, y2 };
};

watch(
  [() => props.activeAnnotation, () => props.selectedBolt, () => props.annotationMode],
  async () => {
    await nextTick();
    recomputeLine();
  },
  { flush: 'post' }
);

watch(
  () => props.annotationMode,
  (active) => {
    if (!active) {
      draftPoint.value = null;
    }
  }
);

let resizeObs = null;
onMounted(() => {
  recomputeLine();
  window.addEventListener('resize', recomputeLine);
  window.addEventListener('scroll', recomputeLine, true);
  if (typeof ResizeObserver !== 'undefined' && stageRef.value) {
    resizeObs = new ResizeObserver(recomputeLine);
    resizeObs.observe(stageRef.value);
  }
});

onUnmounted(() => {
  window.removeEventListener('resize', recomputeLine);
  window.removeEventListener('scroll', recomputeLine, true);
  if (resizeObs) resizeObs.disconnect();
});

const onStageClick = (e) => {
  if (!props.annotationMode || !props.canAnnotate || !stageRef.value) return;
  const rect = stageRef.value.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const rawX = ((e.clientX - rect.left) / rect.width) * 100;
  const rawY = ((e.clientY - rect.top) / rect.height) * 100;
  draftPoint.value = {
    x: Math.max(4, Math.min(96, Number(rawX.toFixed(2)))),
    y: Math.max(4, Math.min(96, Number(rawY.toFixed(2)))),
  };
  if (!draftPositionId.value && props.positions.length > 0) {
    draftPositionId.value = props.positions[0].id;
  }
};

const onSelectAnnotation = (ann) => {
  emit('select-annotation', ann);
};

const submitDraft = () => {
  if (!draftPoint.value || (!draftPositionId.value && !draftCustomName.value.trim())) return;
  emit('create-annotation', {
    boltPositionId: draftPositionId.value || null,
    customAreaName: draftCustomName.value.trim() || null,
    customAreaCategory: draftCustomCategory.value.trim() || null,
    x: draftPoint.value.x,
    y: draftPoint.value.y,
    label: draftLabel.value.trim() || null,
    ...(draftBoltSpecId.value ? { boltSpecId: draftBoltSpecId.value, quantity: draftQty.value || 1 } : {}),
  });
  draftPoint.value = null;
  draftPositionId.value = '';
  draftCustomName.value = '';
  draftCustomCategory.value = '';
  draftLabel.value = '';
  draftBoltSpecId.value = '';
  draftQty.value = 1;
};

const executeDelete = () => {
  if (!confirmDeleteTarget.value) return;
  const id = confirmDeleteTarget.value.id;
  confirmDeleteTarget.value = null;
  emit('delete-annotation', id);
};
</script>
