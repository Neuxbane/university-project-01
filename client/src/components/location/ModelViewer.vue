<template>
  <!-- Automatic 2D Fallback when no 3D .glb model exists or if WebGL/load fails -->
  <LocationCanvas
    v-if="!has3DModel || loadFailed"
    :motorcycle="motorcycle"
    :positions="positions"
    :all-positions="allPositions"
    :annotations="annotations"
    :active-annotation="activeAnnotation"
    :selected-bolt="selectedBolt"
    :annotation-mode="annotationMode"
    :can-annotate="canAnnotate"
    :is-saving-annotation="isSavingAnnotation"
    :is-deleting-annotation="isDeletingAnnotation"
    @select-annotation="$emit('select-annotation', $event)"
    @clear-selection="$emit('clear-selection')"
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
        class="block w-full h-full touch-none outline-none"
        :class="annotationMode && canAnnotate ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'"
      ></canvas>

      <!-- Loading Overlay -->
      <div
        v-if="isModelLoading"
        role="status"
        class="absolute inset-0 z-40 bg-zinc-100/90 dark:bg-zinc-950/90 backdrop-blur-sm flex flex-col items-center justify-center gap-2 p-4 text-center"
      >
        <div class="w-8 h-8 rounded-full border-2 border-zinc-400 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-100 animate-spin"></div>
        <p class="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Memuat model 3D motor...</p>
      </div>

      <!-- Top-Right 3D Controls (Reset View + Fullscreen) -->
      <div class="absolute top-3 right-3 z-30 flex items-center gap-2">
        <button
          type="button"
          @click="resetView"
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

      <!-- Bottom-Left Gesture Hint -->
      <div class="absolute bottom-3 left-3 z-20 pointer-events-none hidden sm:block">
        <span class="px-2.5 py-1 rounded-lg bg-black/70 text-zinc-100 text-[11px] font-mono backdrop-blur-sm">
          Geser: putar &bull; Gulir/Cubit: zoom
        </span>
      </div>

      <!-- Projected SVG Leader Line (tracks active 3D hotspot each frame) -->
      <LeaderLine
        v-if="lineCoords && activeProjected && activeProjected.visible && !activeProjected.occluded && selectedBolt"
        :x1="lineCoords.x1"
        :y1="lineCoords.y1"
        :x2="lineCoords.x2"
        :y2="lineCoords.y2"
      />

      <!-- Projected 3D Hotspot Markers (hidden when occluded or behind camera) -->
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
            :class="activeAnnotation?.id === proj.annotation.id ? 'bg-amber-400/50 motion-safe:animate-ping' : 'bg-white/35 motion-safe:animate-pulse'"
            aria-hidden="true"
          ></span>
          <span
            class="relative w-6 h-6 rounded-full border-2 shadow-lg flex items-center justify-center font-mono text-[10px] font-bold"
            :class="activeAnnotation?.id === proj.annotation.id
              ? 'bg-amber-500 border-white text-zinc-950 ring-2 ring-amber-300'
              : 'bg-zinc-900/95 border-white text-white'"
          >
            {{ proj.index }}
          </span>
        </button>
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

      <!-- Floating Bolt Card anchored in opposite quadrant of projected hotspot -->
      <div
        v-if="activeProjected && activeProjected.visible && !activeProjected.occluded && selectedBolt && !annotationMode"
        ref="cardWrapRef"
        class="absolute z-30 pointer-events-none"
        :class="cardPositionClass"
      >
        <FloatingBoltCard
          :bolt="selectedBolt"
          :position-name="activeAnnotation?.label || activeAnnotation?.boltPosition?.name || 'Titik Pasang'"
          @close="$emit('clear-selection')"
        />
      </div>

      <!-- Empty 3D Annotations Overlay -->
      <div
        v-if="!isModelLoading && annotations3D.length === 0 && !annotationMode"
        class="absolute inset-x-4 bottom-4 z-20 bg-zinc-950/85 backdrop-blur-md border border-zinc-700 rounded-2xl p-3.5 text-center space-y-2"
      >
        <p class="text-xs sm:text-sm font-semibold text-white">
          Belum ada titik 3D yang ditandai pada model ini.
        </p>
        <button
          v-if="canAnnotate"
          type="button"
          @click.stop="$emit('enable-annotation')"
          class="min-h-[44px] px-4 py-2 rounded-xl bg-white text-zinc-900 text-xs font-bold cursor-pointer hover:bg-zinc-200 transition-colors"
        >
          Tandai Lokasi Sekarang
        </button>
      </div>
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
import { Box, Maximize2, Minimize2, RotateCcw } from 'lucide-vue-next';
import { useTheme } from '../../composables/useTheme';
import LocationCanvas from './LocationCanvas.vue';
import FloatingBoltCard from './FloatingBoltCard.vue';
import LeaderLine from './LeaderLine.vue';
import AnnotationEditor from './AnnotationEditor.vue';

const props = defineProps({
  motorcycle: { type: Object, default: null },
  model: { type: Object, default: null },
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
let modelMaxDim = 2;
let cameraTween = null;
const raycaster = new THREE.Raycaster();

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
    const mat = new THREE.MeshBasicMaterial({
      color: props.activeAnnotation?.id === ann.id ? 0xf59e0b : 0xffffff,
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

function animateLoop() {
  animFrameId = requestAnimationFrame(animateLoop);
  if (cameraTween && camera && controls) {
    cameraTween.progress = Math.min(1, cameraTween.progress + 0.08);
    const t = 1 - Math.pow(1 - cameraTween.progress, 3);
    camera.position.lerpVectors(cameraTween.startPos, cameraTween.endPos, t);
    controls.target.lerpVectors(cameraTween.startTarget, cameraTween.endTarget, t);
    if (cameraTween.progress >= 1) {
      cameraTween = null;
    }
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
      const box = new THREE.Box3().setFromObject(loadedModelRoot);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      modelMaxDim = Math.max(size.x, size.y, size.z, 0.5);

      const fovRad = (camera.fov * Math.PI) / 180;
      const fitDist = Math.abs(modelMaxDim / (2 * Math.tan(fovRad / 2))) * 1.45;
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
  if (!props.annotationMode || !props.canAnnotate) return;
  if (e.button !== undefined && e.button !== 0) return;
  pointerDownPos = { x: e.clientX, y: e.clientY };
};

const onCanvasPointerUp = (e) => {
  if (!props.annotationMode || !props.canAnnotate || !pointerDownPos) return;
  const dist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
  pointerDownPos = null;
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
  () => props.annotationMode,
  (active) => {
    if (!active) clearDraft();
  }
);

watch(annotations3D, rebuildHotspotSpheres, { deep: true });

watch(
  () => props.activeAnnotation,
  (ann) => {
    for (const h of hotspotSpheres) {
      h.mesh.material.color.setHex(ann?.id === h.annotation.id ? 0xf59e0b : 0xffffff);
    }
    if (ann && has3DModel.value && !loadFailed.value) {
      focusCameraOnAnnotation(ann);
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
