<template>
  <!-- Automatic 2D Fallback when no 3D .glb model exists or if WebGL/load fails -->
  <LocationCanvas
    v-if="!has3DModel || loadFailed"
    :motorcycle="motorcycle"
    :positions="positions"
    :all-positions="allPositions"
    :annotations="annotations"
    :close-up-photos="closeUpPhotos"
    :bolts="bolts"
    :position-breakdown="positionBreakdown"
    :session-items="sessionItems"
    :is-toggling-check="isTogglingCheck"
    :active-annotation="activeAnnotation"
    :selected-bolt="selectedBolt"
    :annotation-mode="annotationMode"
    :can-annotate="canAnnotate"
    :is-saving-annotation="isSavingAnnotation"
    :is-deleting-annotation="isDeletingAnnotation"
    @select-annotation="$emit('select-annotation', $event)"
    @clear-selection="$emit('clear-selection')"
    @toggle-check="$emit('toggle-check', $event)"
    @toggle-spec-check="$emit('toggle-spec-check', $event)"
    @create-annotation="$emit('create-annotation', $event)"
    @update-annotation="$emit('update-annotation', $event)"
    @delete-annotation="$emit('delete-annotation', $event)"
    @enable-annotation="$emit('enable-annotation')"
  />

  <!-- Interactive Three.js 3D Viewer -->
  <div
    v-else
    ref="wrapperRef"
    class="bg-white dark:bg-[#121215] rounded-2xl border border-zinc-300 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col"
  >
    <!-- Viewer Header Bar -->
    <div class="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2">
      <div class="flex items-center gap-2 min-w-0">
        <Box class="w-4 h-4 text-zinc-600 dark:text-zinc-400 shrink-0" aria-hidden="true" />
        <span class="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
          {{ annotationMode ? 'Mode Anotasi 3D — Ketuk permukaan motor' : 'Model 3D Motor' }}
        </span>
      </div>

      <div class="flex items-center gap-2">
        <button
          v-if="annotations3D.length > 0 && !annotationMode"
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
          {{ annotations3D.length }} titik 3D
        </span>
      </div>
    </div>

    <!-- 3D Viewport Stage -->
    <div
      ref="stageRef"
      class="relative w-full aspect-[4/3] sm:aspect-[16/11] bg-zinc-100 dark:bg-[#09090b] overflow-hidden select-none"
      :class="isFullscreen ? 'h-full aspect-auto flex-1' : ''"
    >
      <canvas
        ref="canvasRef"
        @pointerdown="onCanvasPointerDown"
        @pointerup="onCanvasPointerUp"
        @wheel="markUserInteraction"
        @touchstart.passive="markUserInteraction"
        class="block w-full h-full touch-none outline-none transition-all duration-300 ease-out will-change-transform"
        :class="[
          annotationMode && canAnnotate ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing',
          canvasTransitionClass,
        ]"
      ></canvas>

      <!-- Cinematic Fade Curtain for Fade / Swipe / Cross-Zoom Cuts -->
      <div
        class="absolute inset-0 pointer-events-none z-10 bg-zinc-100 dark:bg-[#09090b] transition-opacity duration-300 ease-in-out"
        :style="{ opacity: cinematicCurtainOpacity }"
        aria-hidden="true"
      ></div>

      <!-- Loading Overlay -->
      <div
        v-if="isModelLoading"
        role="status"
        class="absolute inset-0 z-40 bg-zinc-100/90 dark:bg-zinc-950/90 backdrop-blur-sm flex flex-col items-center justify-center gap-2 p-4 text-center"
      >
        <div class="w-8 h-8 rounded-full border-2 border-zinc-400 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-100 animate-spin"></div>
        <p class="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Memuat model 3D motor...</p>
      </div>

      <!-- Top-Right 3D Controls (hidden while FocusedPartOverlay is open) -->
      <div v-if="!(activeAnnotation && !annotationMode)" class="absolute top-3 right-3 z-30 flex items-center gap-2">
        <button
          v-if="!annotationMode"
          type="button"
          @click="toggleCinematicManual"
          :aria-pressed="isCinematicPlaying"
          aria-label="Putar atau jeda kamera sinematik"
          title="Kamera Sinematik (Otomatis 5 dtk)"
          class="min-w-[44px] min-h-[44px] px-3 py-2 rounded-xl border shadow-md backdrop-blur-sm inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer transition-colors"
          :class="isCinematicPlaying
            ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100'
            : 'bg-white/90 dark:bg-zinc-900/90 hover:bg-white dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-zinc-300 dark:border-zinc-700'"
        >
          <Pause v-if="isCinematicPlaying" class="w-4 h-4" aria-hidden="true" />
          <Play v-else class="w-4 h-4" aria-hidden="true" />
          <span class="hidden sm:inline">Sinematik</span>
        </button>

        <button
          type="button"
          @click="onManualResetClick"
          aria-label="Reset tampilan kamera 3D"
          title="Reset Tampilan"
          class="min-w-[44px] min-h-[44px] px-3 py-2 rounded-xl bg-white/90 dark:bg-zinc-900/90 hover:bg-white dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700 shadow-md backdrop-blur-sm inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
        >
          <RotateCcw class="w-4 h-4" aria-hidden="true" />
          <span class="hidden sm:inline">Reset</span>
        </button>

        <button
          type="button"
          @click="toggleFullscreen"
          :aria-label="isFullscreen ? 'Keluar layar penuh' : 'Tampilkan layar penuh'"
          :title="isFullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh'"
          class="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-xl bg-white/90 dark:bg-zinc-900/90 hover:bg-white dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700 shadow-md backdrop-blur-sm cursor-pointer"
        >
          <Minimize2 v-if="isFullscreen" class="w-4 h-4" aria-hidden="true" />
          <Maximize2 v-else class="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      <!-- Subtle Cinematic HUD Pill -->
      <div
        v-if="isCinematicPlaying && !(activeAnnotation && !annotationMode)"
        class="absolute top-3 left-3 z-20 pointer-events-none"
      >
        <span class="px-2.5 py-1 rounded-lg bg-black/70 text-zinc-100 text-[11px] font-mono backdrop-blur-sm inline-flex items-center gap-1.5 shadow">
          <span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse" aria-hidden="true"></span>
          <span>{{ cinematicPresetLabel }} &bull; Ketuk kanvas untuk reset</span>
        </span>
      </div>

      <!-- Auto-Show Leader Lines + Compact Bolt Callouts for all visible non-occluded points -->
      <template v-if="autoCallouts.length > 0">
        <LeaderLine
          v-for="c in autoCallouts"
          :key="`auto-line-${c.annotation.id}`"
          :x1="c.lineX1"
          :y1="c.lineY1"
          :x2="c.lineX2"
          :y2="c.lineY2"
          :subtle="true"
        />

        <div
          v-for="c in autoCallouts"
          :key="`auto-card-${c.annotation.id}`"
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
            @select="onHotspotClick(c.annotation)"
          />
        </div>
      </template>

      <!-- Projected 3D Hotspot Markers (hidden when focused or occluded) -->
      <template v-if="!(activeAnnotation && !annotationMode)">
        <template v-for="proj in projectedHotspots" :key="proj.annotation.id">
          <button
            v-if="proj.visible && !proj.occluded"
            type="button"
            @click.stop="onHotspotClick(proj.annotation)"
            :aria-label="`Titik ${proj.index}: ${proj.annotation.label || proj.annotation.boltPosition?.name || 'Baut'}`"
            :aria-pressed="activeAnnotation?.id === proj.annotation.id"
            class="absolute -translate-x-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full cursor-pointer transition-transform duration-100 focus-visible:ring-2 focus-visible:ring-amber-400 z-20"
            :class="activeAnnotation?.id === proj.annotation.id ? 'scale-110 z-30' : 'hover:scale-110'"
            :style="{ left: `${proj.screenX}px`, top: `${proj.screenY}px` }"
          >
            <span
              class="absolute w-7 h-7 rounded-full pointer-events-none"
              :class="activeAnnotation?.id === proj.annotation.id
                ? 'bg-amber-400/50 motion-safe:animate-ping'
                : getCheckStatus(proj.annotation) === 'done'
                  ? 'bg-emerald-400/35'
                  : 'bg-white/35 motion-safe:animate-pulse'"
              aria-hidden="true"
            ></span>
            <span
              class="relative w-6 h-6 rounded-full border-2 shadow-lg flex items-center justify-center font-mono text-[10px] font-bold"
              :class="hotspotDotClass(proj.annotation)"
            >
              <Check v-if="getCheckStatus(proj.annotation) === 'done' && activeAnnotation?.id !== proj.annotation.id" class="w-3.5 h-3.5 stroke-[3]" aria-hidden="true" />
              <template v-else>{{ proj.index }}</template>
            </span>
          </button>
        </template>
      </template>

      <!-- Ghost Draft Marker Overlay (while placing 3D annotation) -->
      <div
        v-if="annotationMode && draftProjected && draftProjected.visible"
        class="absolute -translate-x-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] flex items-center justify-center pointer-events-none z-30"
        :style="{ left: `${draftProjected.screenX}px`, top: `${draftProjected.screenY}px` }"
      >
        <span class="absolute w-8 h-8 rounded-full bg-sky-400/50 motion-safe:animate-ping"></span>
        <span class="relative w-6 h-6 rounded-full bg-sky-500 border-2 border-white text-white font-mono text-xs font-bold flex items-center justify-center shadow-lg">
          +
        </span>
      </div>

      <!-- Focused Part Overlay: Blurs 3D motor background, places Part Close-Up Left + Bolt Cards & Lines Right -->
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

    </div>

    <!-- Clean Gesture & Checklist Status Strip (outside canvas so it never collides with cards) -->
    <div class="px-4 py-2 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/90 dark:bg-[#18181c] flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-zinc-600 dark:text-zinc-400">
      <span>Geser: putar 360&deg; &bull; Gulir/Cubit: zoom</span>
      <div v-if="Array.isArray(sessionItems)" class="flex items-center gap-3">
        <span class="inline-flex items-center gap-1">
          <span class="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block" aria-hidden="true"></span>
          <span>Belum</span>
        </span>
        <span class="inline-flex items-center gap-1">
          <span class="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" aria-hidden="true"></span>
          <span>Sudah</span>
        </span>
      </div>
    </div>

    <!-- Compact Empty 3D Annotations Bar (below 3D viewport so model stays unobstructed) -->
    <div
      v-if="!isModelLoading && annotations3D.length === 0 && !annotationMode"
      class="px-4 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#18181c] flex flex-wrap items-center justify-between gap-2"
    >
      <p class="text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Belum ada titik 3D yang ditandai pada model ini.
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

    <!-- Phase C: Inline 3D Annotation Editor (Admin only) -->
    <AnnotationEditor
      v-if="annotationMode && canAnnotate"
      :positions="positions"
      :all-positions="allPositions"
      :annotations="annotations3D"
      :active-annotation-id="activeAnnotation?.id || null"
      :draft-point="draftPoint"
      :is-saving="isSavingAnnotation"
      :is-deleting="isDeletingAnnotation"
      @select-annotation="onHotspotClick"
      @clear-draft="clearDraft"
      @create-annotation="onCreateFromEditor"
      @update-annotation="$emit('update-annotation', $event)"
      @delete-annotation="$emit('delete-annotation', $event)"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Box, Check, Eye, Maximize2, Minimize2, Pause, Play, RotateCcw } from 'lucide-vue-next';
import { useTheme } from '../../composables/useTheme';
import {
  resolvePartCalloutForAnnotation,
  resolveChecklistStatus,
  layoutVisibleCallouts,
} from '../../utils/annotationCallouts';
import {
  evaluatePresetPose,
  pickNextPreset,
  pickRandomTransition,
} from '../../utils/cinematicCamera';
import LocationCanvas from './LocationCanvas.vue';
import FocusedPartOverlay from './FocusedPartOverlay.vue';
import AutoCalloutCard from './AutoCalloutCard.vue';
import LeaderLine from './LeaderLine.vue';
import AnnotationEditor from './AnnotationEditor.vue';

const props = defineProps({
  motorcycle: { type: Object, default: null },
  model: { type: Object, default: null },
  positions: { type: Array, default: () => [] },
  allPositions: { type: Array, default: () => [] },
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
  'update-annotation',
  'delete-annotation',
  'enable-annotation',
]);

const { isDark } = useTheme();
const wrapperRef = ref(null);
const stageRef = ref(null);
const canvasRef = ref(null);
const cardWrapRef = ref(null);

const isModelLoading = ref(false);
const loadFailed = ref(false);
const isFullscreen = ref(false);
const autoShowCallouts = ref(true);
const isCinematicPlaying = ref(false);
const cinematicPresetLabel = ref('');
const cinematicCurtainOpacity = ref(0);
const canvasTransitionClass = ref('');
const isTransitionCutting = ref(false);
const stageSize = ref({ width: 600, height: 400 });
const modelScreenBounds = ref(null);
const projectedHotspots = ref([]);
const draftPoint = ref(null);
const draftProjected = ref(null);
const lineCoords = ref(null);

const has3DModel = computed(() => Boolean(props.model?.modelUrl));

// Only treat annotations tied to a 3D model or non-zero Z as 3D coordinates
const annotations3D = computed(() => {
  if (!props.model?.id) return [];
  return (props.annotations || []).filter(
    (a) => a.modelId === props.model.id || (a.modelId == null && Number(a.z) !== 0)
  );
});

const autoCallouts = computed(() => {
  if (
    !autoShowCallouts.value
    || props.annotationMode
    || props.activeAnnotation
    || isModelLoading.value
    || isTransitionCutting.value
  ) {
    return [];
  }
  const visible = projectedHotspots.value
    .filter((p) => p.visible && !p.occluded)
    .map((p) => ({
      ...p,
      resolved: resolvePartCalloutForAnnotation(
        p.annotation,
        props.closeUpPhotos,
        props.motorcycle,
        props.bolts,
        props.positionBreakdown
      ),
    }))
    .filter((entry) => Boolean(entry.resolved?.bolt));

  return layoutVisibleCallouts(visible, stageSize.value.width, stageSize.value.height, modelScreenBounds.value);
});

function getCheckStatus(ann) {
  if (!Array.isArray(props.sessionItems) || !ann) return null;
  return resolveChecklistStatus(ann, props.sessionItems, props.bolts, props.positionBreakdown).status;
}

function hotspotDotClass(ann) {
  if (props.activeAnnotation?.id === ann.id) {
    return 'bg-amber-500 border-white text-zinc-950 ring-2 ring-amber-300';
  }
  const st = getCheckStatus(ann);
  if (st === 'done') return 'bg-emerald-600 border-white text-white';
  if (st === 'partial') return 'bg-amber-500 border-white text-zinc-950';
  return 'bg-zinc-900/95 border-white text-white';
}

const activeProjected = computed(() => {
  if (!props.activeAnnotation) return null;
  return projectedHotspots.value.find((p) => p.annotation.id === props.activeAnnotation.id) || null;
});

const cardPositionClass = computed(() => {
  const stageW = stageRef.value?.clientWidth || 600;
  const stageH = stageRef.value?.clientHeight || 400;
  if (!activeProjected.value) return 'right-3 bottom-3';
  const horizontal = activeProjected.value.screenX > stageW * 0.52 ? 'left-3' : 'right-3';
  const vertical = activeProjected.value.screenY > stageH * 0.55 ? 'top-16' : 'bottom-3';
  return `${horizontal} ${vertical}`;
});

// Three.js instances (non-reactive for 60fps loop performance)
let renderer = null;
let scene = null;
let camera = null;
let controls = null;
let modelGroup = null;
let loadedModelRoot = null;
let hotspotSpheres = [];
let ghostSphere = null;
let pointerDownPos = null;
let animFrameId = null;
let resizeObserver = null;
let defaultCamPos = new THREE.Vector3(3, 2, 3);
let defaultTarget = new THREE.Vector3(0, 0, 0);
let modelCenter = new THREE.Vector3(0, 0, 0);
let baseFitDist = 3;
let modelMaxDim = 2;
let modelBoxCorners = [];
let cameraTween = null;
const raycaster = new THREE.Raycaster();

// AAA Cinematic Camera Director state (5s inactivity trigger + random transitions)
const IDLE_CINEMATIC_DELAY_MS = 5000;
let lastInteractionAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
let userPausedManually = false;
let wasCinematicOnPointerDown = false;
let cinematicShot = null; // { preset, startTime, stepCount, transitionType, frozen? }
let cinematicCutTimer = null;
let cinematicSettleTimer = null;

function updateModelBoxCorners() {
  if (!loadedModelRoot) {
    modelBoxCorners = [];
    return;
  }
  const box = new THREE.Box3().setFromObject(loadedModelRoot);
  const { min, max } = box;
  modelBoxCorners = [
    new THREE.Vector3(min.x, min.y, min.z),
    new THREE.Vector3(min.x, min.y, max.z),
    new THREE.Vector3(min.x, max.y, min.z),
    new THREE.Vector3(min.x, max.y, max.z),
    new THREE.Vector3(max.x, min.y, min.z),
    new THREE.Vector3(max.x, min.y, max.z),
    new THREE.Vector3(max.x, max.y, min.z),
    new THREE.Vector3(max.x, max.y, max.z),
  ];
}

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function updateSceneBackground() {
  if (!scene) return;
  scene.background = new THREE.Color(isDark.value ? 0x09090b : 0xf4f4f5);
}

function rebuildHotspotSpheres() {
  if (!modelGroup) return;
  for (const entry of hotspotSpheres) {
    modelGroup.remove(entry.mesh);
    entry.mesh.geometry.dispose();
    entry.mesh.material.dispose();
  }
  hotspotSpheres = [];

  const radius = Math.max(0.015, modelMaxDim * 0.015);
  annotations3D.value.forEach((ann, idx) => {
    const geom = new THREE.SphereGeometry(radius, 12, 12);
    const st = getCheckStatus(ann);
    const sphereColor = props.activeAnnotation?.id === ann.id
      ? 0xf59e0b
      : st === 'done'
        ? 0x10b981
        : st === 'partial'
          ? 0xf59e0b
          : 0xffffff;
    const mat = new THREE.MeshBasicMaterial({
      color: sphereColor,
      transparent: true,
      opacity: 0.9,
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(Number(ann.x) || 0, Number(ann.y) || 0, Number(ann.z) || 0);
    modelGroup.add(mesh);
    hotspotSpheres.push({ annotation: ann, index: idx + 1, mesh });
  });
}

function focusCameraOnAnnotation(ann) {
  if (!ann || !camera || !controls || !modelGroup) return;
  const entry = hotspotSpheres.find((h) => h.annotation.id === ann.id);
  if (!entry) return;

  const worldPos = new THREE.Vector3();
  entry.mesh.getWorldPosition(worldPos);

  const normal = new THREE.Vector3(
    Number(ann.normalX) || 0,
    Number(ann.normalY) || 0.25,
    Number(ann.normalZ) || 1
  );
  if (normal.lengthSq() < 0.001) {
    normal.copy(camera.position).sub(controls.target);
  }
  normal.normalize();

  const focusDist = Math.max(0.8, modelMaxDim * 0.85);
  const endPos = worldPos.clone().addScaledVector(normal, focusDist);
  const endTarget = worldPos.clone();

  if (prefersReducedMotion()) {
    camera.position.copy(endPos);
    controls.target.copy(endTarget);
    controls.update();
    cameraTween = null;
    return;
  }

  cameraTween = {
    startPos: camera.position.clone(),
    endPos,
    startTarget: controls.target.clone(),
    endTarget,
    progress: 0,
  };
}

const resetView = () => {
  if (!camera || !controls) return;
  if (prefersReducedMotion()) {
    camera.position.copy(defaultCamPos);
    controls.target.copy(defaultTarget);
    controls.update();
    cameraTween = null;
    return;
  }
  cameraTween = {
    startPos: camera.position.clone(),
    endPos: defaultCamPos.clone(),
    startTarget: controls.target.clone(),
    endTarget: defaultTarget.clone(),
    progress: 0,
  };
};

const toggleFullscreen = async () => {
  if (!wrapperRef.value) return;
  try {
    if (!document.fullscreenElement) {
      await wrapperRef.value.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  } catch {
    // Fullscreen unsupported or rejected
  }
};

const onFullscreenChange = () => {
  isFullscreen.value = document.fullscreenElement === wrapperRef.value;
  resizeViewer();
};

function resizeViewer() {
  if (!renderer || !camera || !stageRef.value) return;
  const w = stageRef.value.clientWidth;
  const h = stageRef.value.clientHeight;
  if (!w || !h) return;
  stageSize.value = { width: w, height: h };
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
}

function projectHotspotsFrame() {
  if (!camera || !stageRef.value) return;
  const width = stageRef.value.clientWidth;
  const height = stageRef.value.clientHeight;
  if (!width || !height) return;

  const worldPos = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const nextProjected = [];

  for (const item of hotspotSpheres) {
    item.mesh.getWorldPosition(worldPos);
    const ndc = worldPos.clone().project(camera);
    const inFront = ndc.z >= -1 && ndc.z <= 1;
    const screenX = (ndc.x * 0.5 + 0.5) * width;
    const screenY = (-ndc.y * 0.5 + 0.5) * height;
    const withinBounds = screenX >= -24 && screenX <= width + 24 && screenY >= -24 && screenY <= height + 24;

    let occluded = false;
    if (inFront && loadedModelRoot) {
      dir.copy(worldPos).sub(camera.position);
      const dist = dir.length();
      if (dist > 0.001) {
        dir.normalize();
        raycaster.set(camera.position, dir);
        const hits = raycaster.intersectObject(loadedModelRoot, true);
        if (hits.length > 0 && hits[0].distance < dist - modelMaxDim * 0.03) {
          occluded = true;
        }
      }
    }

    nextProjected.push({
      annotation: item.annotation,
      index: item.index,
      screenX,
      screenY,
      visible: inFront && withinBounds,
      occluded,
    });
  }

  projectedHotspots.value = nextProjected;

  // Project 8 bounding box corners so callout cards dynamically hug the motorcycle silhouette
  if (modelBoxCorners.length === 8) {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const c of modelBoxCorners) {
      const ndc = c.clone().project(camera);
      const sx = (ndc.x * 0.5 + 0.5) * width;
      const sy = (-ndc.y * 0.5 + 0.5) * height;
      if (sx < minX) minX = sx;
      if (sx > maxX) maxX = sx;
      if (sy < minY) minY = sy;
      if (sy > maxY) maxY = sy;
    }
    modelScreenBounds.value = { minX, maxX, minY, maxY };
  } else {
    modelScreenBounds.value = null;
  }

  // Project ghost marker if placing a 3D annotation
  if (ghostSphere && ghostSphere.visible && draftPoint.value !== null) {
    ghostSphere.getWorldPosition(worldPos);
    const ndc = worldPos.clone().project(camera);
    const inFront = ndc.z >= -1 && ndc.z <= 1;
    draftProjected.value = {
      screenX: (ndc.x * 0.5 + 0.5) * width,
      screenY: (-ndc.y * 0.5 + 0.5) * height,
      visible: inFront,
    };
  } else {
    draftProjected.value = null;
  }

  // Update SVG LeaderLine to FloatingBoltCard if active
  const active = props.activeAnnotation
    ? nextProjected.find((p) => p.annotation.id === props.activeAnnotation.id)
    : null;
  if (active && active.visible && !active.occluded && props.selectedBolt && !props.annotationMode && cardWrapRef.value) {
    const stageRect = stageRef.value.getBoundingClientRect();
    const cardRect = cardWrapRef.value.getBoundingClientRect();
    const cardLeft = cardRect.left - stageRect.left;
    const cardRight = cardRect.right - stageRect.left;
    const cardTop = cardRect.top - stageRect.top;
    const cardBottom = cardRect.bottom - stageRect.top;

    const x1 = active.screenX;
    const y1 = active.screenY;
    const x2 = x1 < cardLeft ? cardLeft : x1 > cardRight ? cardRight : (cardLeft + cardRight) / 2;
    const y2 = y1 < cardTop ? cardTop : y1 > cardBottom ? cardBottom : (cardTop + cardBottom) / 2;
    lineCoords.value = { x1, y1, x2, y2 };
  } else {
    lineCoords.value = null;
  }
}

function clearCinematicTimers() {
  if (cinematicCutTimer) {
    clearTimeout(cinematicCutTimer);
    cinematicCutTimer = null;
  }
  if (cinematicSettleTimer) {
    clearTimeout(cinematicSettleTimer);
    cinematicSettleTimer = null;
  }
}

function applyOutgoingTransition(type) {
  isTransitionCutting.value = true;
  cinematicCurtainOpacity.value = 1;
  switch (type) {
    case 'cross_zoom_in':
      canvasTransitionClass.value = 'scale-110 opacity-0';
      break;
    case 'cross_zoom_out':
      canvasTransitionClass.value = 'scale-90 opacity-0';
      break;
    case 'swipe_left':
      canvasTransitionClass.value = '-translate-x-8 opacity-0';
      break;
    case 'swipe_right':
      canvasTransitionClass.value = 'translate-x-8 opacity-0';
      break;
    case 'swipe_up':
      canvasTransitionClass.value = '-translate-y-6 opacity-0';
      break;
    case 'swipe_down':
      canvasTransitionClass.value = 'translate-y-6 opacity-0';
      break;
    default:
      canvasTransitionClass.value = '';
      break;
  }
}

function applyIncomingEntryTransform(type) {
  switch (type) {
    case 'cross_zoom_in':
      canvasTransitionClass.value = 'scale-95';
      break;
    case 'cross_zoom_out':
      canvasTransitionClass.value = 'scale-105';
      break;
    case 'swipe_left':
      canvasTransitionClass.value = 'translate-x-8';
      break;
    case 'swipe_right':
      canvasTransitionClass.value = '-translate-x-8';
      break;
    case 'swipe_up':
      canvasTransitionClass.value = 'translate-y-6';
      break;
    case 'swipe_down':
      canvasTransitionClass.value = '-translate-y-6';
      break;
    default:
      canvasTransitionClass.value = '';
      break;
  }
}

function stopCinematicMode({ manual = false } = {}) {
  clearCinematicTimers();
  isCinematicPlaying.value = false;
  cinematicPresetLabel.value = '';
  cinematicCurtainOpacity.value = 0;
  canvasTransitionClass.value = '';
  isTransitionCutting.value = false;
  cinematicShot = null;
  if (manual) {
    userPausedManually = true;
  }
}

function advanceCinematicShot({ initial = false } = {}) {
  if (!camera || !controls || !loadedModelRoot || props.annotationMode || props.activeAnnotation) return;
  clearCinematicTimers();

  const nextStep = cinematicShot ? cinematicShot.stepCount + 1 : (initial ? 0 : 1);
  const nextPreset = pickNextPreset(cinematicShot?.preset?.id || null, nextStep);
  const transitionType = initial ? 'smooth_glide' : pickRandomTransition(cinematicShot?.transitionType || null);

  const startShotNow = () => {
    const pose = evaluatePresetPose(nextPreset, 0, modelCenter, modelMaxDim, baseFitDist);
    camera.position.set(pose.camPos[0], pose.camPos[1], pose.camPos[2]);
    controls.target.set(pose.target[0], pose.target[1], pose.target[2]);
    controls.update();
    cinematicShot = {
      preset: nextPreset,
      startTime: performance.now(),
      stepCount: nextStep,
      transitionType,
    };
    cinematicPresetLabel.value = nextPreset.label;
  };

  if (transitionType === 'smooth_glide' && !initial) {
    const pose = evaluatePresetPose(nextPreset, 0, modelCenter, modelMaxDim, baseFitDist);
    cinematicShot = {
      preset: nextPreset,
      startTime: performance.now(),
      stepCount: nextStep,
      transitionType,
    };
    cinematicPresetLabel.value = nextPreset.label;
    cameraTween = {
      startPos: camera.position.clone(),
      endPos: new THREE.Vector3(...pose.camPos),
      startTarget: controls.target.clone(),
      endTarget: new THREE.Vector3(...pose.target),
      progress: 0,
    };
    return;
  }

  if (initial) {
    // Opening cinematic glide cleanly from elevated intro pose
    const pose0 = evaluatePresetPose(nextPreset, 0, modelCenter, modelMaxDim, baseFitDist);
    camera.position.set(pose0.camPos[0] * 1.15, pose0.camPos[1] + modelMaxDim * 0.4, pose0.camPos[2] * 1.15);
    controls.target.copy(defaultTarget);
    controls.update();
    cinematicShot = {
      preset: nextPreset,
      startTime: performance.now(),
      stepCount: nextStep,
      transitionType: 'smooth_glide',
    };
    cinematicPresetLabel.value = nextPreset.label;
    cameraTween = {
      startPos: camera.position.clone(),
      endPos: new THREE.Vector3(...pose0.camPos),
      startTarget: controls.target.clone(),
      endTarget: new THREE.Vector3(...pose0.target),
      progress: 0,
    };
    return;
  }

  applyOutgoingTransition(transitionType);
  cinematicCutTimer = setTimeout(() => {
    if (!isCinematicPlaying.value) return;
    startShotNow();
    applyIncomingEntryTransform(transitionType);
    requestAnimationFrame(() => {
      cinematicCurtainOpacity.value = 0;
      canvasTransitionClass.value = '';
    });
    cinematicSettleTimer = setTimeout(() => {
      isTransitionCutting.value = false;
    }, 260);
  }, 260);
}

function startCinematicMode({ initial = false } = {}) {
  if (prefersReducedMotion() || !loadedModelRoot || props.annotationMode || props.activeAnnotation) return;
  userPausedManually = false;
  isCinematicPlaying.value = true;
  cinematicShot = null;
  advanceCinematicShot({ initial });
}

function markUserInteraction() {
  lastInteractionAt = performance.now();
  userPausedManually = false;
  if (isCinematicPlaying.value) {
    stopCinematicMode();
  }
}

function toggleCinematicManual() {
  lastInteractionAt = performance.now();
  if (isCinematicPlaying.value) {
    stopCinematicMode({ manual: true });
    resetView();
  } else {
    startCinematicMode({ initial: false });
  }
}

function onManualResetClick() {
  lastInteractionAt = performance.now();
  userPausedManually = false;
  if (isCinematicPlaying.value) {
    stopCinematicMode();
  }
  resetView();
}

function animateLoop() {
  animFrameId = requestAnimationFrame(animateLoop);
  const now = performance.now();

  if (cameraTween && camera && controls) {
    cameraTween.progress = Math.min(1, cameraTween.progress + 0.065);
    const t = 1 - Math.pow(1 - cameraTween.progress, 3);
    camera.position.lerpVectors(cameraTween.startPos, cameraTween.endPos, t);
    controls.target.lerpVectors(cameraTween.startTarget, cameraTween.endTarget, t);
    if (cameraTween.progress >= 1) {
      cameraTween = null;
      if (isCinematicPlaying.value && cinematicShot) {
        cinematicShot.startTime = now;
      }
    }
  } else if (isCinematicPlaying.value && cinematicShot && camera && controls) {
    const elapsed = now - cinematicShot.startTime;
    const progress = elapsed / cinematicShot.preset.durationMs;
    if (progress >= 1) {
      if (!cinematicCutTimer) {
        advanceCinematicShot({ initial: false });
      }
    } else if (!cinematicCutTimer) {
      const pose = evaluatePresetPose(cinematicShot.preset, progress, modelCenter, modelMaxDim, baseFitDist);
      camera.position.set(pose.camPos[0], pose.camPos[1], pose.camPos[2]);
      controls.target.set(pose.target[0], pose.target[1], pose.target[2]);
    }
  } else if (
    !isCinematicPlaying.value
    && !userPausedManually
    && loadedModelRoot
    && !isModelLoading.value
    && !props.annotationMode
    && !props.activeAnnotation
    && !prefersReducedMotion()
    && now - lastInteractionAt >= IDLE_CINEMATIC_DELAY_MS
  ) {
    startCinematicMode({ initial: false });
  }

  controls?.update();
  if (renderer && scene && camera) {
    renderer.render(scene, camera);
    projectHotspotsFrame();
  }
}

function loadGLBModel() {
  if (!props.model?.modelUrl || !modelGroup) return;
  isModelLoading.value = true;
  loadFailed.value = false;

  if (loadedModelRoot) {
    modelGroup.remove(loadedModelRoot);
    disposeObject3D(loadedModelRoot);
    loadedModelRoot = null;
  }

  const loader = new GLTFLoader();
  loader.load(
    props.model.modelUrl,
    (gltf) => {
      loadedModelRoot = gltf.scene;
      const scale = Number(props.model.scale) || 1;
      const rotY = Number(props.model.rotationY) || 0;
      loadedModelRoot.scale.setScalar(scale);
      loadedModelRoot.rotation.y = rotY;
      modelGroup.add(loadedModelRoot);

      // Auto-fit camera to bounding box
      updateModelBoxCorners();
      const box = new THREE.Box3().setFromObject(loadedModelRoot);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      modelMaxDim = Math.max(size.x, size.y, size.z, 0.5);

      const fovRad = (camera.fov * Math.PI) / 180;
      const fitDist = Math.abs(modelMaxDim / (2 * Math.tan(fovRad / 2))) * 1.45;
      modelCenter.copy(center);
      baseFitDist = fitDist;
      defaultTarget.copy(center);
      defaultCamPos.set(
        center.x + fitDist * 0.72,
        center.y + fitDist * 0.38,
        center.z + fitDist * 0.78
      );

      camera.near = Math.max(0.01, modelMaxDim / 200);
      camera.far = Math.max(100, modelMaxDim * 40);
      camera.position.copy(defaultCamPos);
      camera.updateProjectionMatrix();

      controls.target.copy(defaultTarget);
      controls.minDistance = modelMaxDim * 0.35;
      controls.maxDistance = modelMaxDim * 5;
      controls.update();

      rebuildHotspotSpheres();
      isModelLoading.value = false;
      lastInteractionAt = performance.now();
      if (!prefersReducedMotion() && !props.annotationMode && !props.activeAnnotation) {
        startCinematicMode({ initial: true });
      }
    },
    undefined,
    (err) => {
      console.error('Failed to load 3D model:', err);
      isModelLoading.value = false;
      loadFailed.value = true;
    }
  );
}

function disposeObject3D(obj) {
  obj.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      for (const m of mats) {
        for (const val of Object.values(m)) {
          if (val && typeof val.dispose === 'function') val.dispose();
        }
        m.dispose();
      }
    }
  });
}

function cleanupThree() {
  stopCinematicMode();
  if (animFrameId) {
    cancelAnimationFrame(animFrameId);
    animFrameId = null;
  }
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
  if (controls) {
    controls.dispose();
    controls = null;
  }
  if (scene) {
    disposeObject3D(scene);
    scene = null;
  }
  if (renderer) {
    renderer.dispose();
    renderer = null;
  }
  modelGroup = null;
  loadedModelRoot = null;
  modelBoxCorners = [];
  modelScreenBounds.value = null;
  hotspotSpheres = [];
  ghostSphere = null;
}

function ensureGhostSphere() {
  if (!modelGroup) return null;
  if (!ghostSphere) {
    const radius = Math.max(0.018, modelMaxDim * 0.018);
    const geom = new THREE.SphereGeometry(radius, 16, 16);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x0ea5e9,
      transparent: true,
      opacity: 0.85,
    });
    ghostSphere = new THREE.Mesh(geom, mat);
    ghostSphere.visible = false;
    modelGroup.add(ghostSphere);
  }
  return ghostSphere;
}

const clearDraft = () => {
  draftPoint.value = null;
  draftProjected.value = null;
  if (ghostSphere) {
    ghostSphere.visible = false;
  }
};

const onCanvasPointerDown = (e) => {
  if (e.button !== undefined && e.button !== 0) return;
  wasCinematicOnPointerDown = isCinematicPlaying.value;
  lastInteractionAt = performance.now();
  pointerDownPos = { x: e.clientX, y: e.clientY };
};

const onCanvasPointerUp = (e) => {
  if (!pointerDownPos) return;
  const dist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
  pointerDownPos = null;
  lastInteractionAt = performance.now();

  // If user tapped (didn't drag) canvas while Cinematic Mode was playing, return cleanly to Reset position
  if (!props.annotationMode && wasCinematicOnPointerDown && dist < 6) {
    wasCinematicOnPointerDown = false;
    userPausedManually = false;
    stopCinematicMode();
    resetView();
    return;
  }
  wasCinematicOnPointerDown = false;

  if (!props.annotationMode || !props.canAnnotate) return;
  if (dist >= 6 || !loadedModelRoot || !camera || !stageRef.value || !modelGroup) return;

  const rect = stageRef.value.getBoundingClientRect();
  if (!rect.width || !rect.height) return;

  const ndc = new THREE.Vector2(
    ((e.clientX - rect.left) / rect.width) * 2 - 1,
    -((e.clientY - rect.top) / rect.height) * 2 + 1
  );
  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObject(loadedModelRoot, true);
  if (!hits.length) return;

  const hit = hits[0];
  const localPoint = modelGroup.worldToLocal(hit.point.clone());
  const worldNormal = hit.face
    ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld).normalize()
    : new THREE.Vector3(0, 1, 0);

  draftPoint.value = {
    x: Number(localPoint.x.toFixed(4)),
    y: Number(localPoint.y.toFixed(4)),
    z: Number(localPoint.z.toFixed(4)),
    normalX: Number(worldNormal.x.toFixed(4)),
    normalY: Number(worldNormal.y.toFixed(4)),
    normalZ: Number(worldNormal.z.toFixed(4)),
  };

  const ghost = ensureGhostSphere();
  if (ghost) {
    ghost.position.copy(localPoint);
    ghost.visible = true;
  }
};

const onCreateFromEditor = (payload) => {
  emit('create-annotation', payload);
  clearDraft();
};

function initThree() {
  if (!has3DModel.value || !canvasRef.value || !stageRef.value) return;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.value,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;

    scene = new THREE.Scene();
    updateSceneBackground();

    const w = stageRef.value.clientWidth || 600;
    const h = stageRef.value.clientHeight || 400;
    camera = new THREE.PerspectiveCamera(45, w / h, 0.05, 200);
    camera.position.copy(defaultCamPos);

    const hemi = new THREE.HemisphereLight(0xffffff, 0x3f3f46, 1.35);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.8);
    keyLight.position.set(5, 8, 6);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xe4e4e7, 0.85);
    rimLight.position.set(-5, 3, -4);
    scene.add(rimLight);

    modelGroup = new THREE.Group();
    scene.add(modelGroup);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.autoRotate = false;
    controls.addEventListener('start', () => {
      cameraTween = null;
      markUserInteraction();
    });

    resizeViewer();
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(resizeViewer);
      resizeObserver.observe(stageRef.value);
    }

    loadGLBModel();
    animateLoop();
  } catch (err) {
    console.error('WebGL init failed, falling back to 2D:', err);
    loadFailed.value = true;
    cleanupThree();
  }
}

const onHotspotClick = (ann) => {
  emit('select-annotation', ann);
};

watch(isDark, updateSceneBackground);

watch(
  () => props.model?.modelUrl,
  async (newUrl) => {
    cleanupThree();
    loadFailed.value = false;
    if (newUrl) {
      await nextTick();
      initThree();
    }
  }
);

watch(
  () => [props.model?.scale, props.model?.rotationY],
  ([nextScale, nextRotY]) => {
    if (!loadedModelRoot || !camera || !controls) return;
    loadedModelRoot.scale.setScalar(Number(nextScale) || 1);
    loadedModelRoot.rotation.y = Number(nextRotY) || 0;
    updateModelBoxCorners();

    const box = new THREE.Box3().setFromObject(loadedModelRoot);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    modelMaxDim = Math.max(size.x, size.y, size.z, 0.5);
    defaultTarget.copy(center);
    controls.target.copy(center);
    controls.update();
  }
);

watch(
  () => props.annotationMode,
  (active) => {
    lastInteractionAt = performance.now();
    if (active) {
      stopCinematicMode();
    } else {
      clearDraft();
    }
  }
);

watch(annotations3D, rebuildHotspotSpheres, { deep: true });

watch(
  [() => props.activeAnnotation, () => props.sessionItems],
  ([ann]) => {
    for (const h of hotspotSpheres) {
      if (ann?.id === h.annotation.id) {
        h.mesh.material.color.setHex(0xf59e0b);
      } else {
        const st = getCheckStatus(h.annotation);
        h.mesh.material.color.setHex(st === 'done' ? 0x10b981 : st === 'partial' ? 0xf59e0b : 0xffffff);
      }
    }
  },
  { deep: true }
);

watch(
  () => props.activeAnnotation,
  (ann) => {
    lastInteractionAt = performance.now();
    if (ann) {
      stopCinematicMode();
      if (has3DModel.value && !loadFailed.value) {
        focusCameraOnAnnotation(ann);
      }
    }
  }
);

onMounted(() => {
  document.addEventListener('fullscreenchange', onFullscreenChange);
  if (has3DModel.value) {
    initThree();
  }
});

onUnmounted(() => {
  document.removeEventListener('fullscreenchange', onFullscreenChange);
  cleanupThree();
});
</script>
