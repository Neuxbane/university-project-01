<template>
  <div
    class="absolute inset-0 z-30 bg-zinc-100/75 dark:bg-[#09090b]/80 backdrop-blur-md p-3 sm:p-4 flex flex-col gap-2.5 overflow-hidden transition-opacity duration-200 ease-out"
    role="region"
    :aria-label="`Detail area ${areaTitle}`"
    @click.self="$emit('close')"
  >
    <!-- Floating Pill Header matching ModelViewer controls (non-jarring studio tone) -->
    <div class="flex items-center justify-between gap-2 shrink-0">
      <div class="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/95 dark:bg-zinc-900/95 border border-zinc-300 dark:border-zinc-700 shadow-md backdrop-blur-sm min-w-0">
        <MapPin class="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" aria-hidden="true" />
        <span class="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
          {{ areaTitle }}
        </span>
        <span class="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 shrink-0">
          &bull; {{ totalQty }} pcs
        </span>
      </div>

      <button
        type="button"
        @click.stop="$emit('close')"
        class="min-w-[44px] min-h-[44px] px-3 py-2 rounded-xl bg-white/95 dark:bg-zinc-900/95 hover:bg-white dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700 shadow-md backdrop-blur-sm inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer shrink-0 transition-colors"
      >
        <ArrowLeft class="w-4 h-4" aria-hidden="true" />
        <span>Kembali</span>
      </button>
    </div>

    <!-- Main Stage: Left = Focused Chosen Area Image, Right = Compact AutoCalloutCard Bolts + LeaderLines -->
    <div
      ref="overlayGridRef"
      class="relative flex-1 min-h-0 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-8"
      @click.self="$emit('close')"
    >
      <!-- SVG Leader Lines identical in visual style to LeaderLine.vue (z-30 so lines exit visibly from pin rims) -->
      <svg
        v-if="connectorLines.length > 0"
        class="hidden sm:block absolute inset-0 w-full h-full pointer-events-none z-30 overflow-visible"
        aria-hidden="true"
      >
        <g v-for="line in connectorLines" :key="line.key" :class="line.active ? 'opacity-100' : 'opacity-80'">
          <line
            :x1="line.x1"
            :y1="line.y1"
            :x2="line.x2"
            :y2="line.y2"
            :stroke="line.active ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.38)'"
            :stroke-width="line.active ? 4 : 3"
            stroke-linecap="round"
          />
          <line
            :x1="line.x1"
            :y1="line.y1"
            :x2="line.x2"
            :y2="line.y2"
            :stroke="line.active ? '#fbbf24' : '#e4e4e7'"
            :stroke-width="line.active ? 2 : 1.5"
            stroke-linecap="round"
          />
          <circle
            :cx="line.x2"
            :cy="line.y2"
            :r="line.active ? 4 : 3"
            :fill="line.active ? '#fbbf24' : '#e4e4e7'"
            stroke="#18181b"
            stroke-width="1.5"
          />
        </g>
      </svg>

      <!-- LEFT SIDE: Chosen Area Image (expanded in same AutoCalloutCard-like framed aesthetic) -->
      <div class="w-full sm:w-[56%] h-[48%] sm:h-full flex items-center justify-center min-w-0 z-20">
        <div
          ref="partCardRef"
          class="relative w-full max-w-[360px] sm:max-w-[440px] max-h-full bg-white dark:bg-[#121215] rounded-2xl border border-zinc-300 dark:border-zinc-700 shadow-xl overflow-hidden flex flex-col"
        >
          <div
            class="relative w-full min-h-[140px] sm:min-h-[180px] max-h-[calc(100%-36px)] bg-zinc-950 flex items-center justify-center overflow-hidden"
            :style="{ aspectRatio: partPhotoUrl ? photoAspectRatio : '16 / 10' }"
          >
            <img
              v-if="partPhotoUrl"
              :src="partPhotoUrl"
              :alt="areaTitle"
              @load="onImageLoad"
              class="w-full h-full object-cover select-none"
            />
            <div
              v-else
              class="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-gradient-to-br from-zinc-800 to-zinc-950"
            >
              <MapPin class="w-9 h-9 text-zinc-400 mb-2" aria-hidden="true" />
              <p class="text-xs font-semibold text-zinc-200">{{ areaTitle }}</p>
              <p class="text-[11px] text-zinc-400 mt-0.5">Belum ada foto close-up</p>
            </div>

            <!-- Numbered Bolt Pins on the Focused Close-Up Photo -->
            <template v-for="(entry, idx) in boltItems" :key="entry.key">
              <button
                v-if="entry.hasPin"
                :ref="(el) => setPinRef(entry.key, el)"
                type="button"
                @click.stop="onSelectEntry(entry)"
                :aria-label="`Baut ${idx + 1}: ${entry.label || entry.code}`"
                class="absolute -translate-x-1/2 -translate-y-1/2 min-w-[38px] min-h-[38px] flex items-center justify-center rounded-full cursor-pointer transition-transform z-30"
                :class="activeEntryKey === entry.key ? 'scale-115' : 'hover:scale-110'"
                :style="{ left: `${entry.x}%`, top: `${entry.y}%` }"
              >
                <span
                  class="w-6 h-6 rounded-full border-2 shadow-lg flex items-center justify-center font-mono text-[10px] font-bold"
                  :class="pinCircleClass(entry)"
                >
                  <Check v-if="entry.checkStatus === 'done'" class="w-3.5 h-3.5 stroke-[3]" aria-hidden="true" />
                  <template v-else>{{ idx + 1 }}</template>
                </span>
              </button>
            </template>
          </div>

          <!-- Compact bottom label strip matching AutoCalloutCard -->
          <div class="px-3 py-1.5 bg-white dark:bg-[#121215] border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-2 shrink-0">
            <p class="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
              {{ areaTitle }}
            </p>
            <span class="px-1.5 py-0.5 rounded bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-mono text-[10px] font-bold shrink-0">
              {{ boltItems.length }} jenis
            </span>
          </div>
        </div>
      </div>

      <!-- RIGHT SIDE: Compact AutoCalloutCard Bolt Cards (same UI language as main 3D callouts) -->
      <div
        ref="cardsColRef"
        @scroll="measureLines"
        class="w-full sm:w-auto sm:max-w-[38%] max-h-[48%] sm:max-h-full overflow-y-auto flex sm:flex-col items-center sm:items-end justify-start sm:justify-center gap-2.5 p-1 z-20"
      >
        <div
          v-for="(entry, idx) in boltItems"
          :key="`card-${entry.key}`"
          class="flex flex-col items-stretch shrink-0"
        >
          <div
            :ref="(el) => setCardRef(entry.key, el)"
            class="w-[118px] sm:w-[132px] h-[104px] sm:h-[112px] rounded-xl transition-shadow"
            :class="[
              activeEntryKey === entry.key ? 'ring-2 ring-amber-400 shadow-lg' : '',
              isTogglingCheck && entry.checkStatus ? 'opacity-65 pointer-events-none' : '',
            ]"
          >
            <AutoCalloutCard
              :index="idx + 1"
              :bolt="entry.bolt"
              :minimal-mode="false"
              :quantity="entry.quantity"
              :extra-specs-count="0"
              :position-name="entry.label || entry.code"
              :check-status="entry.checkStatus"
              @select="onSelectEntry(entry)"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { ArrowLeft, Check, MapPin } from 'lucide-vue-next';
import AutoCalloutCard from './AutoCalloutCard.vue';

const props = defineProps({
  annotation: { type: Object, required: true },
  closeUpPhotos: { type: Array, default: () => [] },
  motorcycle: { type: Object, default: null },
  bolts: { type: Array, default: () => [] },
  positionBreakdown: { type: Array, default: () => [] },
  sessionItems: { type: Array, default: null },
  isTogglingCheck: { type: Boolean, default: false },
});

const emit = defineEmits(['close', 'toggle-spec-check']);

const overlayGridRef = ref(null);
const partCardRef = ref(null);
const cardsColRef = ref(null);
const pinEls = new Map();
const cardEls = new Map();
const connectorLines = ref([]);
const activeEntryKey = ref(null);
const photoAspectRatio = ref('16 / 10');

const setPinRef = (key, el) => {
  if (el) pinEls.set(key, el);
  else pinEls.delete(key);
};

const setCardRef = (key, el) => {
  if (el) cardEls.set(key, el);
  else cardEls.delete(key);
};

const matchingCloseup = computed(() => {
  const posId = props.annotation?.boltPositionId;
  if (!posId || !props.closeUpPhotos?.length) return null;
  return props.closeUpPhotos.find((c) => c.boltPositionId === posId) || null;
});

const areaTitle = computed(() => {
  return props.annotation?.label
    || props.annotation?.boltPosition?.name
    || matchingCloseup.value?.boltPosition?.name
    || 'Detail Posisi Baut';
});

const partPhotoUrl = computed(() => {
  return matchingCloseup.value?.imageUrl
    || props.annotation?.boltPosition?.photoUrl
    || null;
});

function getSpecCheckStatus(boltSpecId) {
  if (!Array.isArray(props.sessionItems) || !boltSpecId) return null;
  const item = props.sessionItems.find((it) => it.boltSpecId === boltSpecId);
  if (!item) return null;
  return item.checked ? 'done' : 'pending';
}

function buildBoltObject(spec, fallbackImages = null) {
  return {
    id: spec.id || spec.boltSpecId,
    code: spec.code || '-',
    diameterMm: Number(spec.diameterMm || 0),
    lengthMm: Number(spec.lengthMm || 0),
    images: fallbackImages || spec.images || [],
  };
}

const boltItems = computed(() => {
  const cu = matchingCloseup.value;
  if (cu?.pins?.length > 0) {
    // Sort pins top-to-bottom (pin.y) so leader lines from left photo to right cards never cross
    return [...cu.pins]
      .sort((a, b) => Number(a.y) - Number(b.y))
      .map((pin) => {
        const spec = pin.boltSpec || {};
        const consolidated = (props.bolts || []).find((b) => b.boltSpecId === pin.boltSpecId);
        return {
          key: `pin-${pin.id}`,
          hasPin: true,
          x: Number(pin.x),
          y: Number(pin.y),
          boltSpecId: pin.boltSpecId,
          code: spec.code || '-',
          quantity: pin.quantity || 1,
          label: pin.label || spec.code || '',
          bolt: buildBoltObject(spec, spec.images?.length ? spec.images : consolidated?.images),
          checkStatus: getSpecCheckStatus(pin.boltSpecId),
        };
      });
  }

  // Fallback to bolts mapped to this boltPositionId in positionBreakdown / bolts
  const posId = props.annotation?.boltPositionId;
  const rows = (props.positionBreakdown || []).filter((r) => r.positionId === posId && r.boltSpec);
  if (rows.length > 0) {
    return rows.map((row, idx) => {
      const consolidated = (props.bolts || []).find((b) => b.boltSpecId === row.boltSpec.id);
      return {
        key: `row-${row.boltSpec.id}-${idx}`,
        hasPin: false,
        boltSpecId: row.boltSpec.id,
        code: row.boltSpec.code,
        quantity: row.quantity,
        label: row.boltSpec.code || row.positionName,
        bolt: buildBoltObject(row.boltSpec, consolidated?.images?.length ? consolidated.images : row.boltSpec.images),
        checkStatus: getSpecCheckStatus(row.boltSpec.id),
      };
    });
  }

  return (props.bolts || [])
    .filter((b) => Array.isArray(b.positionIds) && b.positionIds.includes(posId))
    .map((b) => ({
      key: `bolt-${b.boltSpecId}`,
      hasPin: false,
      boltSpecId: b.boltSpecId,
      code: b.code,
      quantity: b.totalQuantity,
      label: b.code || areaTitle.value,
      bolt: buildBoltObject(b, b.images),
      checkStatus: getSpecCheckStatus(b.boltSpecId),
    }));
});

const totalQty = computed(() => boltItems.value.reduce((s, item) => s + Number(item.quantity || 0), 0));

function onSelectEntry(entry) {
  if (entry.checkStatus && entry.boltSpecId) {
    if (props.isTogglingCheck) return;
    activeEntryKey.value = entry.key;
    emit('toggle-spec-check', entry.boltSpecId);
    return;
  }
  activeEntryKey.value = activeEntryKey.value === entry.key ? null : entry.key;
}

function pinCircleClass(entry) {
  if (activeEntryKey.value === entry.key) {
    return 'bg-amber-500 border-white text-zinc-950 ring-2 ring-amber-300';
  }
  if (entry.checkStatus === 'done') return 'bg-emerald-600 border-white text-white';
  return 'bg-zinc-900/95 border-white text-white';
}

const onImageLoad = (e) => {
  const img = e.target;
  if (img.naturalWidth && img.naturalHeight) {
    photoAspectRatio.value = `${img.naturalWidth} / ${img.naturalHeight}`;
  }
  nextTick(measureLines);
};

const measureLines = () => {
  const container = overlayGridRef.value;
  if (!container) {
    connectorLines.value = [];
    return;
  }
  const cRect = container.getBoundingClientRect();
  if (!cRect.width || !cRect.height) return;

  const pBoxRect = partCardRef.value?.getBoundingClientRect() || null;
  const totalCount = boltItems.value.length;
  const lines = [];

  boltItems.value.forEach((entry, idx) => {
    const cardEl = cardEls.get(entry.key);
    if (!cardEl) return;
    const kRect = cardEl.getBoundingClientRect();
    const x2 = kRect.left - cRect.left;
    const y2 = kRect.top + kRect.height / 2 - cRect.top;

    let x1;
    let y1;
    if (entry.hasPin) {
      const pinEl = pinEls.get(entry.key);
      if (!pinEl) return;
      const pRect = pinEl.getBoundingClientRect();
      const cx = pRect.left + pRect.width / 2 - cRect.left;
      const cy = pRect.top + pRect.height / 2 - cRect.top;
      const dx = x2 - cx;
      const dy = y2 - cy;
      const dist = Math.hypot(dx, dy) || 1;
      // Start just outside the 12px pin circle border so line exits cleanly from the pin rim
      const rimOffset = Math.min(14, dist * 0.4);
      x1 = cx + (dx / dist) * rimOffset;
      y1 = cy + (dy / dist) * rimOffset;
    } else if (pBoxRect) {
      // Connect cleanly from the right edge of the focused area frame when close-up pin coordinates aren't set yet
      const frac = totalCount <= 1 ? 0.5 : 0.25 + (idx / (totalCount - 1)) * 0.5;
      x1 = pBoxRect.right - cRect.left;
      y1 = pBoxRect.top + pBoxRect.height * frac - cRect.top;
    } else {
      return;
    }

    lines.push({
      key: entry.key,
      active: activeEntryKey.value === entry.key,
      x1,
      y1,
      x2,
      y2,
    });
  });

  connectorLines.value = lines;
};

watch([() => props.annotation, boltItems, activeEntryKey], async () => {
  await nextTick();
  measureLines();
}, { flush: 'post', deep: true });

let resizeObs = null;
onMounted(() => {
  nextTick(measureLines);
  window.addEventListener('resize', measureLines);
  if (typeof ResizeObserver !== 'undefined' && overlayGridRef.value) {
    resizeObs = new ResizeObserver(measureLines);
    resizeObs.observe(overlayGridRef.value);
  }
});

onUnmounted(() => {
  window.removeEventListener('resize', measureLines);
  if (resizeObs) resizeObs.disconnect();
});
</script>
