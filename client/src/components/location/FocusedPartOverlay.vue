<template>
  <div
    class="absolute inset-0 z-30 bg-zinc-950/60 backdrop-blur-md p-2.5 sm:p-4 flex flex-col gap-2.5 overflow-hidden animate-fadeIn"
    role="region"
    :aria-label="`Detail area ${areaTitle}`"
    @click.self="$emit('close')"
  >
    <!-- Top Focus Header -->
    <div class="flex items-center justify-between gap-2 shrink-0">
      <div class="min-w-0">
        <div class="flex flex-wrap items-center gap-2">
          <span class="px-2 py-0.5 rounded-md bg-white/15 border border-white/25 text-white text-[10px] font-mono uppercase tracking-wider">
            Fokus Area
          </span>
          <h3 class="text-xs sm:text-sm font-bold text-white truncate">
            {{ areaTitle }}
          </h3>
        </div>
        <p class="text-[11px] font-mono text-zinc-200/85 truncate mt-0.5">
          {{ boltItems.length }} titik/ukuran baut &bull; {{ totalQty }} pcs
        </p>
      </div>

      <button
        type="button"
        @click.stop="$emit('close')"
        class="min-h-[44px] px-3 py-2 rounded-xl bg-white hover:bg-zinc-100 text-zinc-900 text-xs font-bold shadow-lg inline-flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors"
      >
        <ArrowLeft class="w-4 h-4" aria-hidden="true" />
        <span>Kembali ke Motor</span>
      </button>
    </div>

    <!-- Main Split: Left = Focused Part Close-Up Photo, Right = Bolt Cards, Connected by SVG Lines -->
    <div
      ref="overlayGridRef"
      class="relative flex-1 min-h-0 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-6"
    >
      <!-- SVG Leader Lines connecting Pin on Part (Left) -> Bolt Card (Right) -->
      <svg
        v-if="connectorLines.length > 0"
        class="hidden sm:block absolute inset-0 w-full h-full pointer-events-none z-20 overflow-visible"
        aria-hidden="true"
      >
        <g v-for="line in connectorLines" :key="line.key">
          <line
            :x1="line.x1"
            :y1="line.y1"
            :x2="line.x2"
            :y2="line.y2"
            stroke="rgba(0,0,0,0.65)"
            stroke-width="4"
            stroke-linecap="round"
          />
          <line
            :x1="line.x1"
            :y1="line.y1"
            :x2="line.x2"
            :y2="line.y2"
            :stroke="line.active ? '#fbbf24' : '#e4e4e7'"
            stroke-width="2"
            stroke-linecap="round"
          />
          <circle
            :cx="line.x2"
            :cy="line.y2"
            r="4"
            :fill="line.active ? '#fbbf24' : '#ffffff'"
            stroke="#18181b"
            stroke-width="1.5"
          />
        </g>
      </svg>

      <!-- LEFT SIDE: Part Close-Up Image covering blurred 3D/2D motor background -->
      <div class="w-full sm:w-[55%] h-[48%] sm:h-full flex items-center justify-center min-w-0">
        <div
          class="relative max-w-full max-h-full rounded-2xl overflow-hidden border-2 border-white/30 bg-zinc-950 shadow-2xl flex items-center justify-center"
          :style="{ aspectRatio: photoAspectRatio }"
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
            class="w-full h-full min-w-[220px] min-h-[150px] flex flex-col items-center justify-center p-4 text-center bg-gradient-to-br from-zinc-800 to-zinc-950"
          >
            <Wrench class="w-10 h-10 text-zinc-400 mb-2" aria-hidden="true" />
            <p class="text-xs font-semibold text-zinc-200">{{ areaTitle }}</p>
            <p class="text-[11px] text-zinc-400 mt-0.5">Belum ada foto close-up</p>
          </div>

          <!-- Numbered Bolt Pins directly on the Part Photo -->
          <template v-for="(entry, idx) in boltItems" :key="entry.key">
            <button
              v-if="entry.hasPin"
              :ref="(el) => setPinRef(entry.key, el)"
              type="button"
              @click.stop="activeEntryKey = entry.key"
              :aria-label="`Baut ${idx + 1}: ${entry.label}`"
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
      </div>

      <!-- RIGHT SIDE: Linked Bolt Cards (80% visual focus + size/qty + direct checklist toggle) -->
      <div class="w-full sm:w-[40%] max-h-[50%] sm:max-h-full overflow-y-auto space-y-2 pr-0.5 z-30">
        <div
          v-for="(entry, idx) in boltItems"
          :key="`card-${entry.key}`"
          :ref="(el) => setCardRef(entry.key, el)"
          @click.stop="activeEntryKey = entry.key"
          class="rounded-xl bg-white/95 dark:bg-[#121215]/95 border shadow-lg overflow-hidden flex items-stretch cursor-pointer transition-all"
          :class="boltCardClass(entry)"
        >
          <!-- Visual Bolt Image (dominant square thumb) -->
          <div class="relative w-16 sm:w-20 min-h-[68px] sm:min-h-[78px] bg-zinc-950 shrink-0 flex items-center justify-center">
            <img
              v-if="entry.boltImage"
              :src="entry.boltImage"
              :alt="entry.code"
              class="w-full h-full object-cover"
              :class="entry.checkStatus === 'done' ? 'opacity-65 grayscale-[25%]' : ''"
            />
            <Nut v-else class="w-7 h-7 text-zinc-300" aria-hidden="true" />

            <span class="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-zinc-950/90 border border-white/20 text-white font-mono text-[10px] font-bold leading-none">
              #{{ idx + 1 }}
            </span>
          </div>

          <!-- Compact Bolt Details -->
          <div class="flex-1 min-w-0 p-2 sm:p-2.5 flex items-center justify-between gap-2">
            <div class="min-w-0">
              <div class="flex items-center gap-1.5">
                <span class="font-mono text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                  M{{ entry.diameter }}&times;{{ entry.length }}
                </span>
                <span class="px-1.5 py-0.5 rounded bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-mono text-[11px] font-bold shrink-0">
                  {{ entry.quantity }} pcs
                </span>
              </div>
              <p class="font-mono text-[11px] text-zinc-600 dark:text-zinc-400 truncate mt-0.5">
                {{ entry.code }}
              </p>
              <p v-if="entry.label" class="text-[11px] font-medium text-zinc-800 dark:text-zinc-200 truncate">
                {{ entry.label }}
              </p>
            </div>

            <!-- Live Checklist Check Button (only in PickSession checklist mode) -->
            <button
              v-if="entry.checkStatus"
              type="button"
              @click.stop="$emit('toggle-spec-check', entry.boltSpecId)"
              :disabled="isTogglingCheck"
              :aria-label="entry.checkStatus === 'done' ? `Batalkan ${entry.code}` : `Tandai diambil ${entry.code}`"
              class="min-w-[44px] min-h-[44px] px-2.5 rounded-xl font-bold text-xs inline-flex items-center justify-center gap-1 shrink-0 cursor-pointer transition-colors disabled:opacity-50"
              :class="entry.checkStatus === 'done'
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900'"
            >
              <Check class="w-4 h-4 stroke-[2.5]" aria-hidden="true" />
              <span class="hidden md:inline">{{ entry.checkStatus === 'done' ? 'Sudah' : 'Ambil' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { ArrowLeft, Check, Nut, Wrench } from 'lucide-vue-next';

const props = defineProps({
  annotation: { type: Object, required: true },
  closeUpPhotos: { type: Array, default: () => [] },
  motorcycle: { type: Object, default: null },
  bolts: { type: Array, default: () => [] },
  positionBreakdown: { type: Array, default: () => [] },
  sessionItems: { type: Array, default: null },
  isTogglingCheck: { type: Boolean, default: false },
});

defineEmits(['close', 'toggle-spec-check']);

const overlayGridRef = ref(null);
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
    || props.motorcycle?.images?.[0]?.url
    || null;
});

function getSpecCheckStatus(boltSpecId) {
  if (!Array.isArray(props.sessionItems) || !boltSpecId) return null;
  const item = props.sessionItems.find((it) => it.boltSpecId === boltSpecId);
  if (!item) return null;
  return item.checked ? 'done' : 'pending';
}

const boltItems = computed(() => {
  const cu = matchingCloseup.value;
  if (cu?.pins?.length > 0) {
    // Sort pins top-to-bottom (pin.y) so leader lines from left photo to right cards never cross
    return [...cu.pins]
      .sort((a, b) => Number(a.y) - Number(b.y))
      .map((pin) => {
        const spec = pin.boltSpec || {};
        return {
          key: `pin-${pin.id}`,
          hasPin: true,
          x: Number(pin.x),
          y: Number(pin.y),
          boltSpecId: pin.boltSpecId,
          code: spec.code || '-',
          diameter: Number(spec.diameterMm || 0),
          length: Number(spec.lengthMm || 0),
          quantity: pin.quantity || 1,
          label: pin.label || '',
          boltImage: spec.images?.[0]?.url || null,
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
        diameter: Number(row.boltSpec.diameterMm || 0),
        length: Number(row.boltSpec.lengthMm || 0),
        quantity: row.quantity,
        label: row.positionName,
        boltImage: consolidated?.images?.[0]?.url || row.boltSpec.images?.[0]?.url || null,
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
      diameter: Number(b.diameterMm || 0),
      length: Number(b.lengthMm || 0),
      quantity: b.totalQuantity,
      label: areaTitle.value,
      boltImage: b.images?.[0]?.url || null,
      checkStatus: getSpecCheckStatus(b.boltSpecId),
    }));
});

const totalQty = computed(() => boltItems.value.reduce((s, item) => s + Number(item.quantity || 0), 0));

function pinCircleClass(entry) {
  if (activeEntryKey.value === entry.key) {
    return 'bg-amber-500 border-white text-zinc-950 ring-2 ring-amber-300';
  }
  if (entry.checkStatus === 'done') return 'bg-emerald-600 border-white text-white';
  return 'bg-zinc-900/95 border-white text-white';
}

function boltCardClass(entry) {
  if (activeEntryKey.value === entry.key) {
    return 'border-amber-400 ring-2 ring-amber-400/60';
  }
  if (entry.checkStatus === 'done') {
    return 'border-emerald-500/80';
  }
  return 'border-zinc-300 dark:border-zinc-700 hover:border-amber-400';
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

  const lines = [];
  for (const entry of boltItems.value) {
    if (!entry.hasPin) continue;
    const pinEl = pinEls.get(entry.key);
    const cardEl = cardEls.get(entry.key);
    if (!pinEl || !cardEl) continue;

    const pRect = pinEl.getBoundingClientRect();
    const kRect = cardEl.getBoundingClientRect();

    lines.push({
      key: entry.key,
      active: activeEntryKey.value === entry.key,
      x1: pRect.left + pRect.width / 2 - cRect.left,
      y1: pRect.top + pRect.height / 2 - cRect.top,
      x2: kRect.left - cRect.left,
      y2: kRect.top + kRect.height / 2 - cRect.top,
    });
  }
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
