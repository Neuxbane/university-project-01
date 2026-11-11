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

      <!-- Leader Line SVG between selected hotspot and FloatingBoltCard -->
      <LeaderLine
        v-if="lineCoords && activeAnnotation && selectedBolt && !annotationMode"
        :x1="lineCoords.x1"
        :y1="lineCoords.y1"
        :x2="lineCoords.x2"
        :y2="lineCoords.y2"
      />

      <!-- Saved Hotspots -->
      <HotspotMarker
        v-for="(ann, idx) in annotations2D"
        :key="ann.id"
        :x="ann.x"
        :y="ann.y"
        :index-number="idx + 1"
        :label="ann.label || ann.boltPosition?.name || 'Titik Baut'"
        :active="activeAnnotation?.id === ann.id"
        @select="onSelectAnnotation(ann)"
      />

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

      <!-- Floating Bolt Card anchored in opposite quadrant -->
      <div
        v-if="activeAnnotation && selectedBolt && !annotationMode"
        ref="cardWrapRef"
        class="absolute z-30 pointer-events-none"
        :class="cardPositionClass"
      >
        <FloatingBoltCard
          :bolt="selectedBolt"
          :position-name="activeAnnotation.label || activeAnnotation.boltPosition?.name || 'Titik Pasang'"
          @close="$emit('clear-selection')"
        />
      </div>
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

        <form @submit.prevent="submitDraft" class="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
          <div class="sm:col-span-6">
            <label for="annotation-position-select" class="block text-[11px] font-mono uppercase text-zinc-600 dark:text-zinc-400 mb-1">
              Titik Posisi Baut
            </label>
            <select
              id="annotation-position-select"
              v-model="draftPositionId"
              required
              class="w-full min-h-[44px] px-3 py-2 rounded-xl bg-zinc-50 dark:bg-[#18181c] border border-zinc-500 text-sm text-zinc-900 dark:text-zinc-100"
            >
              <option value="">-- Pilih Posisi Baut --</option>
              <optgroup v-if="positions.length" label="Posisi di Motor Ini">
                <option v-for="p in positions" :key="`motor-${p.id}`" :value="p.id">
                  {{ p.name }} ({{ p.quantity }} baut)
                </option>
              </optgroup>
              <optgroup v-if="otherPositions.length" label="Semua Posisi Lainnya">
                <option v-for="p in otherPositions" :key="`all-${p.id}`" :value="p.id">
                  {{ p.name }} ({{ p.category }})
                </option>
              </optgroup>
            </select>
          </div>

          <div class="sm:col-span-4">
            <label for="annotation-label-input" class="block text-[11px] font-mono uppercase text-zinc-600 dark:text-zinc-400 mb-1">
              Label Singkat (Opsional)
            </label>
            <input
              id="annotation-label-input"
              v-model="draftLabel"
              type="text"
              placeholder="Misal: Bak CVT Kiri"
              class="w-full min-h-[44px] px-3 py-2 rounded-xl bg-zinc-50 dark:bg-[#18181c] border border-zinc-500 text-sm text-zinc-900 dark:text-zinc-100"
            />
          </div>

          <div class="sm:col-span-2 flex items-end">
            <button
              type="submit"
              :disabled="isSavingAnnotation || !draftPositionId"
              class="w-full min-h-[44px] px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 text-xs font-bold cursor-pointer disabled:opacity-40"
            >
              {{ isSavingAnnotation ? '...' : 'Simpan' }}
            </button>
          </div>
        </form>
      </div>

      <p v-else class="text-xs text-zinc-600 dark:text-zinc-400">
        Ketuk titik mana saja pada foto motor di atas untuk menempatkan penanda lokasi baru.
      </p>

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
import { Bike, MapPin, Trash2 } from 'lucide-vue-next';
import HotspotMarker from './HotspotMarker.vue';
import FloatingBoltCard from './FloatingBoltCard.vue';
import LeaderLine from './LeaderLine.vue';
import ConfirmDialog from '../ui/ConfirmDialog.vue';

const props = defineProps({
  motorcycle: { type: Object, default: null },
  positions: { type: Array, default: () => [] },
  allPositions: { type: Array, default: () => [] },
  annotations: { type: Array, default: () => [] },
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
  'create-annotation',
  'delete-annotation',
  'enable-annotation',
]);

const stageRef = ref(null);
const cardWrapRef = ref(null);
const draftPoint = ref(null);
const draftPositionId = ref('');
const draftLabel = ref('');
const confirmDeleteTarget = ref(null);
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
  if (!draftPoint.value || !draftPositionId.value) return;
  emit('create-annotation', {
    boltPositionId: draftPositionId.value,
    x: draftPoint.value.x,
    y: draftPoint.value.y,
    label: draftLabel.value.trim() || null,
  });
  draftPoint.value = null;
  draftLabel.value = '';
};

const executeDelete = () => {
  if (!confirmDeleteTarget.value) return;
  const id = confirmDeleteTarget.value.id;
  confirmDeleteTarget.value = null;
  emit('delete-annotation', id);
};
</script>
