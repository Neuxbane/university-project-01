<template>
  <div class="bg-white dark:bg-[#121215] rounded-2xl border border-zinc-300 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col">
    <!-- Header Bar -->
    <div class="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2">
      <div class="flex items-center gap-2 min-w-0">
        <Camera class="w-4 h-4 text-zinc-700 dark:text-zinc-300 shrink-0" aria-hidden="true" />
        <div class="min-w-0">
          <h3 class="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
            {{ activePhoto?.boltPosition?.name || title || 'Foto Close-Up Area Baut' }}
          </h3>
          <p v-if="activePhoto?.caption" class="text-[11px] text-zinc-600 dark:text-zinc-400 truncate">
            {{ activePhoto.caption }}
          </p>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <button
          v-if="activePhoto && activePins.length > 0 && !pinMode"
          type="button"
          @click="autoShowCallouts = !autoShowCallouts"
          :aria-pressed="autoShowCallouts"
          class="min-h-[36px] px-2.5 py-1 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
          :class="autoShowCallouts
            ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100'
            : 'bg-zinc-50 dark:bg-[#18181c] text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700'"
        >
          <Eye class="w-3.5 h-3.5" aria-hidden="true" />
          <span>Label Otomatis</span>
        </button>

        <button
          v-if="canAnnotate && activePhoto"
          type="button"
          @click="pinMode = !pinMode"
          :aria-pressed="pinMode"
          class="min-h-[36px] px-3 py-1 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
          :class="pinMode
            ? 'bg-sky-600 text-white border-sky-600 hover:bg-sky-700'
            : 'bg-zinc-50 dark:bg-[#18181c] text-zinc-800 dark:text-zinc-200 border-zinc-400 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800'"
        >
          <Crosshair class="w-3.5 h-3.5" aria-hidden="true" />
          <span>{{ pinMode ? 'Selesai Tandai Baut' : 'Tandai Baut di Foto' }}</span>
        </button>

        <span
          v-if="activePhoto"
          class="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 font-mono text-xs font-semibold text-zinc-800 dark:text-zinc-200"
        >
          {{ activePins.length }} titik baut
        </span>
      </div>
    </div>

    <!-- Photo Switcher Pills (if multiple close-up photos are available) -->
    <div
      v-if="photos.length > 1"
      class="px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#18181c] flex flex-wrap gap-1.5"
    >
      <button
        v-for="p in photos"
        :key="p.id"
        type="button"
        @click="selectPhoto(p)"
        class="min-h-[36px] px-3 py-1 rounded-lg text-xs font-semibold border cursor-pointer transition-colors"
        :class="activePhoto?.id === p.id
          ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100'
          : 'bg-white dark:bg-[#121215] text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800'"
      >
        {{ p.boltPosition?.name || 'Close-Up' }} ({{ p.pins?.length || 0 }})
      </button>
    </div>

    <!-- Interactive Close-Up Photo Stage -->
    <div
      v-if="activePhoto"
      ref="stageRef"
      @click="onStageClick"
      class="relative w-full aspect-[4/3] sm:aspect-[16/10] bg-zinc-950 overflow-hidden select-none"
      :class="pinMode ? 'cursor-crosshair' : ''"
    >
      <img
        :src="activePhoto.imageUrl"
        :alt="activePhoto.caption || activePhoto.boltPosition?.name || 'Foto Close-Up Area'"
        @load="recomputeStageSize"
        class="w-full h-full object-contain pointer-events-none"
      />

      <!-- Auto-Show Multi-Bolt Callouts on 1 Close-Up Photo -->
      <template v-if="autoCallouts.length > 0">
        <LeaderLine
          v-for="c in autoCallouts"
          :key="`cu-line-${c.annotation.id}`"
          :x1="c.lineX1"
          :y1="c.lineY1"
          :x2="c.lineX2"
          :y2="c.lineY2"
          :subtle="true"
        />

        <div
          v-for="c in autoCallouts"
          :key="`cu-card-${c.annotation.id}`"
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
            :quantity="c.resolved.quantity"
            :extra-specs-count="0"
            :position-name="c.resolved.positionName"
            :check-status="getPinCheckStatus(c.annotation)"
            @select="onSelectPin(c.annotation)"
          />
        </div>
      </template>

      <!-- Focused Leader Line + Card -->
      <LeaderLine
        v-if="focusedLineCoords && activePin && !pinMode"
        :x1="focusedLineCoords.x1"
        :y1="focusedLineCoords.y1"
        :x2="focusedLineCoords.x2"
        :y2="focusedLineCoords.y2"
      />

      <!-- Saved Bolt Pins -->
      <HotspotMarker
        v-for="(pin, idx) in activePins"
        :key="pin.id"
        :x="pin.x"
        :y="pin.y"
        :index-number="idx + 1"
        :label="pin.label || pin.boltSpec?.code || 'Baut'"
        :active="activePin?.id === pin.id"
        :check-status="getPinCheckStatus(pin)"
        @select="onSelectPin(pin)"
      />

      <!-- Draft Ghost Pin (Admin adding new bolt hole) -->
      <HotspotMarker
        v-if="pinMode && draftPoint"
        :x="draftPoint.x"
        :y="draftPoint.y"
        index-number="+"
        label="Titik Baut Baru"
        :draft="true"
        @select="() => {}"
      />

      <!-- Focused Floating Bolt Card -->
      <div
        v-if="activePin && activePinBolt && !pinMode"
        ref="cardWrapRef"
        class="absolute z-30 pointer-events-none"
        :class="cardPositionClass"
      >
        <FloatingBoltCard
          :bolt="activePinBolt"
          :position-name="activePin.label || activePhoto.boltPosition?.name || 'Lubang Baut'"
          :check-status="getPinCheckStatus(activePin)"
          :is-toggling-check="isTogglingCheck"
          @close="activePin = null"
          @toggle-check="$emit('toggle-spec-check', activePin.boltSpecId)"
        />
      </div>
    </div>

    <!-- Footer Legend / Empty Hint -->
    <div
      v-if="activePhoto && !pinMode && activePins.length === 0"
      class="px-4 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#18181c] flex flex-wrap items-center justify-between gap-2"
    >
      <p class="text-xs text-zinc-600 dark:text-zinc-400">
        Belum ada titik baut spesifik yang ditandai pada foto close-up ini.
      </p>
      <button
        v-if="canAnnotate"
        type="button"
        @click="pinMode = true"
        class="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 text-xs font-bold cursor-pointer"
      >
        Tandai Baut Sekarang
      </button>
    </div>

    <!-- Admin Multi-Bolt Pin Editor & Photo Actions (Inline, No Modal!) -->
    <div
      v-if="canAnnotate && activePhoto"
      class="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#18181c] space-y-4"
    >
      <!-- Draft Creation Form -->
      <div
        v-if="pinMode && draftPoint"
        class="p-3.5 rounded-xl bg-white dark:bg-[#121215] border border-sky-400 dark:border-sky-500/50 space-y-3"
      >
        <div class="flex items-center justify-between gap-2">
          <p class="text-xs font-bold text-zinc-900 dark:text-zinc-100">
            Titik Baut Baru ({{ draftPoint.x }}%, {{ draftPoint.y }}%)
          </p>
          <button
            type="button"
            @click="draftPoint = null"
            class="min-h-[36px] px-2.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white cursor-pointer"
          >
            Batal
          </button>
        </div>

        <form @submit.prevent="submitCreatePin" class="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
          <div class="sm:col-span-5">
            <label for="cu-spec-select" class="block text-[11px] font-mono uppercase text-zinc-600 dark:text-zinc-400 mb-1">
              Spesifikasi Baut
            </label>
            <select
              id="cu-spec-select"
              v-model="draftSpecId"
              required
              class="w-full min-h-[44px] px-3 py-2 rounded-xl bg-zinc-50 dark:bg-[#18181c] border border-zinc-500 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100"
            >
              <option value="">-- Pilih Baut --</option>
              <optgroup v-if="positionSpecs.length" :label="`Baut di ${activePhoto.boltPosition?.name || 'Area Ini'}`">
                <option v-for="s in positionSpecs" :key="`pos-${s.id}`" :value="s.id">
                  {{ s.code }} (M{{ Number(s.diameterMm) }}×{{ Number(s.lengthMm) }} • {{ s.qty }} pcs)
                </option>
              </optgroup>
              <optgroup v-if="otherSpecs.length" label="Semua Ukuran Baut Lainnya">
                <option v-for="s in otherSpecs" :key="`all-${s.id}`" :value="s.id">
                  {{ s.code }} (M{{ Number(s.diameterMm) }}×{{ Number(s.lengthMm) }})
                </option>
              </optgroup>
            </select>
          </div>

          <div class="sm:col-span-2">
            <label for="cu-qty-input" class="block text-[11px] font-mono uppercase text-zinc-600 dark:text-zinc-400 mb-1">
              Jumlah
            </label>
            <input
              id="cu-qty-input"
              v-model.number="draftQty"
              type="number"
              min="1"
              max="50"
              required
              class="w-full min-h-[44px] px-3 py-2 rounded-xl bg-zinc-50 dark:bg-[#18181c] border border-zinc-500 text-xs sm:text-sm font-mono text-zinc-900 dark:text-zinc-100"
            />
          </div>

          <div class="sm:col-span-3">
            <label for="cu-label-input" class="block text-[11px] font-mono uppercase text-zinc-600 dark:text-zinc-400 mb-1">
              Label Lokasi
            </label>
            <input
              id="cu-label-input"
              v-model="draftLabel"
              type="text"
              placeholder="Misal: Lubang Atas"
              class="w-full min-h-[44px] px-3 py-2 rounded-xl bg-zinc-50 dark:bg-[#18181c] border border-zinc-500 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100"
            />
          </div>

          <div class="sm:col-span-2 flex items-end">
            <button
              type="submit"
              :disabled="isSavingPin || !draftSpecId"
              class="w-full min-h-[44px] px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 text-xs font-bold cursor-pointer disabled:opacity-40"
            >
              {{ isSavingPin ? '...' : 'Simpan' }}
            </button>
          </div>
        </form>
      </div>

      <p v-else-if="pinMode" class="text-xs text-zinc-600 dark:text-zinc-400">
        Ketuk tepat di atas lubang baut pada foto close-up di atas untuk menandai jenis &amp; jumlah bautnya.
      </p>

      <!-- Existing Pins List + Delete Close-Up Photo -->
      <div class="flex flex-wrap items-center justify-between gap-2">
        <p class="text-xs font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
          Daftar Titik Baut di Foto Ini ({{ activePins.length }})
        </p>

        <button
          type="button"
          @click="confirmDeletePhoto = activePhoto"
          class="min-h-[36px] px-3 py-1 rounded-lg border border-rose-300 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-700 dark:text-rose-400 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
        >
          <Trash2 class="w-3.5 h-3.5" aria-hidden="true" />
          <span>Hapus Foto Ini</span>
        </button>
      </div>

      <div v-if="activePins.length > 0" class="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div
          v-for="(pin, idx) in activePins"
          :key="pin.id"
          class="p-2.5 rounded-xl bg-white dark:bg-[#121215] border border-zinc-300 dark:border-zinc-700 flex items-center justify-between gap-2"
        >
          <button
            type="button"
            @click="onSelectPin(pin)"
            class="min-h-[44px] flex items-center gap-2 min-w-0 text-left flex-1 cursor-pointer"
          >
            <span class="w-6 h-6 rounded-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-mono text-xs font-bold flex items-center justify-center shrink-0">
              {{ idx + 1 }}
            </span>
            <div class="min-w-0">
              <p class="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                {{ pin.boltSpec?.code }} &bull; {{ pin.quantity }} pcs
              </p>
              <p class="text-[11px] font-mono text-zinc-600 dark:text-zinc-400 truncate">
                {{ pin.label || `M${Number(pin.boltSpec?.diameterMm)}×${Number(pin.boltSpec?.lengthMm)}` }}
              </p>
            </div>
          </button>

          <button
            type="button"
            @click="confirmDeletePin = pin"
            :aria-label="`Hapus titik ${pin.label || pin.boltSpec?.code}`"
            class="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-xl text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/15 cursor-pointer shrink-0"
          >
            <Trash2 class="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>

    <!-- Empty Close-Up State -->
    <div v-if="!activePhoto" class="p-6 text-center text-xs text-zinc-600 dark:text-zinc-400">
      Belum ada foto close-up area untuk motor ini.
    </div>

    <!-- Confirm Delete Pin -->
    <ConfirmDialog
      :open="Boolean(confirmDeletePin)"
      title="Hapus titik baut ini?"
      :message="`Titik '${confirmDeletePin?.label || confirmDeletePin?.boltSpec?.code}' akan dihapus dari foto close-up.`"
      confirm-text="Ya, Hapus"
      :danger="true"
      @confirm="executeDeletePin"
      @cancel="confirmDeletePin = null"
    />

    <!-- Confirm Delete Close-Up Photo -->
    <ConfirmDialog
      :open="Boolean(confirmDeletePhoto)"
      title="Hapus foto close-up ini?"
      message="Foto close-up beserta seluruh titik baut di atasnya akan dihapus permanen."
      confirm-text="Ya, Hapus Foto"
      :danger="true"
      @confirm="executeDeletePhoto"
      @cancel="confirmDeletePhoto = null"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { Camera, Crosshair, Eye, Trash2 } from 'lucide-vue-next';
import { layoutVisibleCallouts } from '../../utils/annotationCallouts';
import HotspotMarker from './HotspotMarker.vue';
import AutoCalloutCard from './AutoCalloutCard.vue';
import FloatingBoltCard from './FloatingBoltCard.vue';
import LeaderLine from './LeaderLine.vue';
import ConfirmDialog from '../ui/ConfirmDialog.vue';

const props = defineProps({
  photos: { type: Array, default: () => [] },
  selectedPhotoId: { type: Number, default: null },
  title: { type: String, default: '' },
  requirements: { type: Array, default: () => [] },
  allSpecs: { type: Array, default: () => [] },
  sessionItems: { type: Array, default: null },
  canAnnotate: { type: Boolean, default: false },
  isSavingPin: { type: Boolean, default: false },
  isTogglingCheck: { type: Boolean, default: false },
});

const emit = defineEmits([
  'select-photo',
  'create-pin',
  'delete-pin',
  'delete-photo',
  'toggle-spec-check',
]);

const stageRef = ref(null);
const cardWrapRef = ref(null);
const stageSize = ref({ width: 600, height: 375 });
const autoShowCallouts = ref(true);
const pinMode = ref(false);
const activePin = ref(null);
const draftPoint = ref(null);
const draftSpecId = ref('');
const draftQty = ref(1);
const draftLabel = ref('');
const confirmDeletePin = ref(null);
const confirmDeletePhoto = ref(null);
const focusedLineCoords = ref(null);

const activePhoto = computed(() => {
  if (!props.photos.length) return null;
  if (props.selectedPhotoId) {
    const found = props.photos.find((p) => p.id === props.selectedPhotoId);
    if (found) return found;
  }
  return props.photos[0];
});

const activePins = computed(() => activePhoto.value?.pins || []);

const activePinBolt = computed(() => {
  if (!activePin.value?.boltSpec) return null;
  return {
    ...activePin.value.boltSpec,
    boltSpecId: activePin.value.boltSpecId,
    totalQuantity: activePin.value.quantity,
  };
});

const positionSpecs = computed(() => {
  const posId = activePhoto.value?.boltPositionId;
  if (!posId || !props.requirements.length) return [];
  const seen = new Map();
  for (const r of props.requirements) {
    if (r.boltPositionId === posId && r.boltSpec) {
      const prev = seen.get(r.boltSpec.id);
      if (prev) prev.qty += r.quantity;
      else seen.set(r.boltSpec.id, { ...r.boltSpec, qty: r.quantity });
    }
  }
  return Array.from(seen.values());
});

const otherSpecs = computed(() => {
  const posIds = new Set(positionSpecs.value.map((s) => s.id));
  return (props.allSpecs || []).filter((s) => !posIds.has(s.id));
});

function getPinCheckStatus(pin) {
  if (!Array.isArray(props.sessionItems) || !pin?.boltSpecId) return null;
  const item = props.sessionItems.find((it) => it.boltSpecId === pin.boltSpecId);
  if (!item) return null;
  return item.checked ? 'done' : 'pending';
}

const autoCallouts = computed(() => {
  if (!autoShowCallouts.value || pinMode.value || activePin.value || !activePins.value.length) {
    return [];
  }
  const w = stageSize.value.width;
  const h = stageSize.value.height;
  if (!w || !h) return [];

  const entries = activePins.value
    .filter((p) => p.boltSpec)
    .map((pin, idx) => ({
      annotation: pin,
      index: idx + 1,
      screenX: (Number(pin.x) / 100) * w,
      screenY: (Number(pin.y) / 100) * h,
      resolved: {
        bolt: {
          ...pin.boltSpec,
          boltSpecId: pin.boltSpecId,
          totalQuantity: pin.quantity,
        },
        quantity: pin.quantity,
        extraSpecsCount: 0,
        positionName: pin.label || `M${Number(pin.boltSpec.diameterMm)}×${Number(pin.boltSpec.lengthMm)}`,
      },
    }));

  return layoutVisibleCallouts(entries, w, h);
});

const cardPositionClass = computed(() => {
  if (!activePin.value) return 'right-3 bottom-3';
  const horizontal = activePin.value.x > 52 ? 'left-3' : 'right-3';
  const vertical = activePin.value.y > 55 ? 'top-3' : 'bottom-3';
  return `${horizontal} ${vertical}`;
});

const recomputeStageSize = () => {
  if (stageRef.value) {
    const rect = stageRef.value.getBoundingClientRect();
    if (rect.width && rect.height) {
      stageSize.value = { width: rect.width, height: rect.height };
    }
  }
  if (!activePin.value || !stageRef.value || !cardWrapRef.value) {
    focusedLineCoords.value = null;
    return;
  }
  const sRect = stageRef.value.getBoundingClientRect();
  const cRect = cardWrapRef.value.getBoundingClientRect();
  const x1 = (activePin.value.x / 100) * sRect.width;
  const y1 = (activePin.value.y / 100) * sRect.height;
  const cLeft = cRect.left - sRect.left;
  const cRight = cRect.right - sRect.left;
  const cTop = cRect.top - sRect.top;
  const cBot = cRect.bottom - sRect.top;
  const x2 = x1 < cLeft ? cLeft : x1 > cRight ? cRight : (cLeft + cRight) / 2;
  const y2 = y1 < cTop ? cTop : y1 > cBot ? cBot : (cTop + cBot) / 2;
  focusedLineCoords.value = { x1, y1, x2, y2 };
};

watch([activePhoto, activePin, pinMode], async () => {
  await nextTick();
  recomputeStageSize();
}, { flush: 'post' });

watch(activePhoto, () => {
  activePin.value = null;
  draftPoint.value = null;
});

watch(pinMode, (on) => {
  if (!on) draftPoint.value = null;
});

let resizeObs = null;
onMounted(() => {
  recomputeStageSize();
  window.addEventListener('resize', recomputeStageSize);
  if (typeof ResizeObserver !== 'undefined' && stageRef.value) {
    resizeObs = new ResizeObserver(recomputeStageSize);
    resizeObs.observe(stageRef.value);
  }
});

onUnmounted(() => {
  window.removeEventListener('resize', recomputeStageSize);
  if (resizeObs) resizeObs.disconnect();
});

const selectPhoto = (photo) => {
  emit('select-photo', photo);
};

const onSelectPin = (pin) => {
  activePin.value = pin;
};

const onStageClick = (e) => {
  if (!props.canAnnotate || !pinMode.value || !stageRef.value) return;
  const rect = stageRef.value.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const rawX = ((e.clientX - rect.left) / rect.width) * 100;
  const rawY = ((e.clientY - rect.top) / rect.height) * 100;
  draftPoint.value = {
    x: Math.max(4, Math.min(96, Number(rawX.toFixed(2)))),
    y: Math.max(4, Math.min(96, Number(rawY.toFixed(2)))),
  };
  if (!draftSpecId.value && positionSpecs.value.length > 0) {
    draftSpecId.value = positionSpecs.value[0].id;
    draftQty.value = positionSpecs.value[0].qty || 1;
  }
};

const submitCreatePin = () => {
  if (!activePhoto.value || !draftPoint.value || !draftSpecId.value) return;
  emit('create-pin', {
    photoId: activePhoto.value.id,
    boltSpecId: draftSpecId.value,
    x: draftPoint.value.x,
    y: draftPoint.value.y,
    quantity: draftQty.value || 1,
    label: draftLabel.value.trim() || null,
  });
  draftPoint.value = null;
  draftLabel.value = '';
};

const executeDeletePin = () => {
  if (!confirmDeletePin.value) return;
  const id = confirmDeletePin.value.id;
  confirmDeletePin.value = null;
  if (activePin.value?.id === id) activePin.value = null;
  emit('delete-pin', id);
};

const executeDeletePhoto = () => {
  if (!confirmDeletePhoto.value) return;
  const id = confirmDeletePhoto.value.id;
  confirmDeletePhoto.value = null;
  emit('delete-photo', id);
};
</script>
