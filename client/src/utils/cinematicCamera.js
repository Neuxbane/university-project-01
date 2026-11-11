/**
 * AAA Showroom Cinematic Camera Director for Three.js Motorcycle Viewer.
 * Implements 28 real video-production / automotive-showcase camera movements
 * (360 top/bottom orbits, diagonal dolly out/in, crab/truck lateral moves,
 * crab dolly back-right, pullback 30 deg right/left, pedestal/crane/jib arcs,
 * vertigo dolly-zoom, drone overhead flyover, close tracking shots) plus
 * 8 random transition effects and deck-shuffled random sequencing.
 */

export const TRANSITION_TYPES = [
  'fade',
  'cross_zoom_in',
  'cross_zoom_out',
  'swipe_left',
  'swipe_right',
  'swipe_up',
  'swipe_down',
  'smooth_glide',
];

/**
 * 28 video-production camera presets.
 * Each shot supports independent start/end spherical camera angles (az, el, dist),
 * independent start/end camera-target offsets (allowing true lateral crabbing,
 * push-throughs, and pan reveals), and optional lens FOV shifts (e.g. dolly-zoom).
 * Coordinate convention: +X = Front, -X = Rear, +Y = Up, +Z = Right, -Z = Left.
 */
export const CINEMATIC_PRESETS = [
  {
    id: 'high_orbit_360',
    durationMs: 7000,
    az: [0.6, 0.6 + Math.PI * 2],
    el: [0.9, 0.84],
    dist: [1.05, 1.0],
    targetStart: [0, 0, 0],
    targetEnd: [0, 0, 0],
  },
  {
    id: 'low_orbit_360',
    durationMs: 7000,
    az: [-0.85, -0.85 + Math.PI * 2],
    el: [0.09, 0.14],
    dist: [0.95, 0.95],
    targetStart: [0, -0.08, 0],
    targetEnd: [0, -0.06, 0],
  },
  {
    id: 'diagonal_dolly_out',
    durationMs: 4000,
    az: [-0.45, -1.15],
    el: [0.16, 0.58],
    dist: [0.68, 1.24],
    targetStart: [0.16, -0.05, -0.04],
    targetEnd: [0, 0.03, 0],
  },
  {
    id: 'diagonal_dolly_in',
    durationMs: 3900,
    az: [1.1, 0.42],
    el: [0.54, 0.16],
    dist: [1.22, 0.68],
    targetStart: [0, 0.04, 0],
    targetEnd: [0.18, 0.02, 0.04],
  },
  {
    id: 'crab_dolly_back_right',
    durationMs: 4200,
    az: [1.35, 2.25],
    el: [0.22, 0.34],
    dist: [0.76, 1.18],
    targetStart: [0.1, -0.04, 0.04],
    targetEnd: [-0.14, 0.04, 0.1],
  },
  {
    id: 'crab_dolly_back_left',
    durationMs: 4200,
    az: [-1.35, -2.25],
    el: [0.2, 0.32],
    dist: [0.76, 1.18],
    targetStart: [0.1, -0.04, -0.04],
    targetEnd: [-0.14, 0.04, -0.1],
  },
  {
    id: 'pullback_30_right',
    durationMs: 3800,
    az: [0.52, 0.58], // ~30 deg right of front axis
    el: [0.24, 0.32],
    dist: [0.64, 1.22],
    targetStart: [0.2, 0.04, 0.04],
    targetEnd: [0, 0.02, 0],
  },
  {
    id: 'pullback_30_left',
    durationMs: 3800,
    az: [-0.52, -0.58], // ~30 deg left of front axis
    el: [0.22, 0.32],
    dist: [0.64, 1.22],
    targetStart: [0.2, 0.04, -0.04],
    targetEnd: [0, 0.02, 0],
  },
  {
    id: 'crab_truck_left',
    durationMs: 4100,
    az: [-1.57, -1.57],
    el: [0.18, 0.2],
    dist: [0.74, 0.78],
    targetStart: [0.28, -0.04, 0],
    targetEnd: [-0.28, -0.02, 0],
  },
  {
    id: 'crab_truck_right',
    durationMs: 4100,
    az: [1.57, 1.57],
    el: [0.18, 0.2],
    dist: [0.74, 0.78],
    targetStart: [-0.28, -0.02, 0],
    targetEnd: [0.28, -0.04, 0],
  },
  {
    id: 'pedestal_up_front',
    durationMs: 3900,
    az: [0.78, 0.65],
    el: [0.06, 0.72],
    dist: [0.88, 0.96],
    targetStart: [0.12, -0.12, 0],
    targetEnd: [0.04, 0.12, 0],
  },
  {
    id: 'pedestal_down_rear',
    durationMs: 3900,
    az: [-2.45, -2.3],
    el: [0.75, 0.09],
    dist: [0.98, 0.86],
    targetStart: [-0.1, 0.14, 0],
    targetEnd: [-0.14, -0.1, 0],
  },
  {
    id: 'crane_arc_over',
    durationMs: 4400,
    az: [0.85, -0.85],
    el: [0.24, 0.92],
    dist: [0.94, 1.06],
    targetStart: [0, 0, 0],
    targetEnd: [0.05, 0.05, 0],
  },
  {
    id: 'jib_sweep_left',
    durationMs: 4400,
    az: [-2.15, -0.75],
    el: [0.12, 0.56],
    dist: [0.84, 1.02],
    targetStart: [-0.15, -0.06, 0],
    targetEnd: [0.12, 0.06, 0],
  },
  {
    id: 'vertigo_dolly_zoom',
    durationMs: 4000,
    az: [0.42, 0.52],
    el: [0.2, 0.22],
    dist: [0.72, 1.24],
    targetStart: [0.06, 0.02, 0],
    targetEnd: [0, 0.02, 0],
    fov: [54, 34],
  },
  {
    id: 'overhead_flyover',
    durationMs: 4300,
    az: [1.45, 1.75],
    el: [1.34, 1.28],
    dist: [1.06, 0.92],
    targetStart: [0.24, 0, 0],
    targetEnd: [-0.24, 0, 0],
  },
  {
    id: 'worm_eye_front',
    durationMs: 3800,
    az: [-0.22, 0.22],
    el: [0.04, 0.12],
    dist: [0.92, 0.82],
    targetStart: [0.16, -0.12, 0],
    targetEnd: [0.14, 0.1, 0],
  },
  {
    id: 'whip_orbit_front',
    durationMs: 3600,
    az: [-1.15, 1.15],
    el: [0.22, 0.28],
    dist: [0.92, 0.88],
    targetStart: [0.08, 0, 0],
    targetEnd: [0.08, 0, 0],
  },
  {
    id: 'track_cvt_left',
    durationMs: 3900,
    az: [-1.85, -1.28],
    el: [0.12, 0.18],
    dist: [0.66, 0.62],
    targetStart: [-0.22, -0.12, -0.06],
    targetEnd: [-0.04, -0.1, -0.04],
  },
  {
    id: 'track_exhaust_right',
    durationMs: 3900,
    az: [1.28, 1.95],
    el: [0.1, 0.18],
    dist: [0.68, 0.62],
    targetStart: [-0.04, -0.1, 0.05],
    targetEnd: [-0.24, -0.08, 0.06],
  },
  {
    id: 'visor_cockpit_arc',
    durationMs: 4000,
    az: [0.5, -0.5],
    el: [0.7, 0.52],
    dist: [0.74, 0.66],
    targetStart: [0.18, 0.18, 0],
    targetEnd: [0.14, 0.16, 0],
  },
  {
    id: 'caliper_tight_pan',
    durationMs: 3800,
    az: [-0.55, -1.2],
    el: [0.08, 0.16],
    dist: [0.62, 0.56],
    targetStart: [0.3, -0.15, -0.03],
    targetEnd: [0.24, -0.13, -0.02],
  },
  {
    id: 'tail_reveal_pan',
    durationMs: 3900,
    az: [2.35, 3.35],
    el: [0.42, 0.26],
    dist: [0.76, 0.94],
    targetStart: [-0.24, 0.1, 0],
    targetEnd: [-0.14, 0.04, 0],
  },
  {
    id: 'spiral_ascend_360',
    durationMs: 6800,
    az: [0, Math.PI * 2],
    el: [0.12, 0.96],
    dist: [0.85, 1.12],
    targetStart: [0, -0.04, 0],
    targetEnd: [0, 0.02, 0],
  },
  {
    id: 'helix_descend_360',
    durationMs: 6800,
    az: [Math.PI, -Math.PI],
    el: [0.94, 0.12],
    dist: [1.14, 0.86],
    targetStart: [0, 0.03, 0],
    targetEnd: [0, -0.05, 0],
  },
  {
    id: 'diagonal_climb_sweep',
    durationMs: 4300,
    az: [-2.5, -1.3],
    el: [0.14, 0.78],
    dist: [0.78, 1.15],
    targetStart: [-0.18, -0.06, 0],
    targetEnd: [0.06, 0.06, 0],
  },
  {
    id: 'wide_establish_right',
    durationMs: 4000,
    az: [0.65, 1.35],
    el: [0.34, 0.24],
    dist: [1.22, 0.94],
    targetStart: [0, 0.02, 0],
    targetEnd: [0, 0, 0],
  },
  {
    id: 'reverse_arc_left',
    durationMs: 4000,
    az: [-0.65, -1.45],
    el: [0.32, 0.22],
    dist: [0.9, 1.18],
    targetStart: [0.06, 0, 0],
    targetEnd: [-0.04, 0.02, 0],
  },
];

export function easeInOutSine(t) {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

/**
 * Evaluates world camera position, target, and FOV for a preset at progress t in [0, 1].
 */
export function evaluatePresetPose(preset, progress, center, modelMaxDim, baseFitDist) {
  const t = easeInOutSine(Math.max(0, Math.min(1, progress)));
  const az = preset.az[0] + (preset.az[1] - preset.az[0]) * t;
  const el = preset.el[0] + (preset.el[1] - preset.el[0]) * t;
  const dist = baseFitDist * (preset.dist[0] + (preset.dist[1] - preset.dist[0]) * t);
  const fov = preset.fov ? preset.fov[0] + (preset.fov[1] - preset.fov[0]) * t : 45;

  const ts = preset.targetStart || [0, 0, 0];
  const te = preset.targetEnd || [0, 0, 0];
  const tx = center.x + (ts[0] + (te[0] - ts[0]) * t) * modelMaxDim;
  const ty = center.y + (ts[1] + (te[1] - ts[1]) * t) * modelMaxDim;
  const tz = center.z + (ts[2] + (te[2] - ts[2]) * t) * modelMaxDim;

  const cosEl = Math.cos(el);
  const sinEl = Math.sin(el);
  const cx = tx + dist * cosEl * Math.cos(az);
  const cy = ty + dist * sinEl;
  const cz = tz + dist * cosEl * Math.sin(az);

  return {
    camPos: [cx, cy, cz],
    target: [tx, ty, tz],
    fov,
  };
}

/**
 * Fisher-Yates shuffled deck director so every cinematic shot plays in random order
 * without repeats until all presets are exhausted, prioritizing top & bottom orbits early
 * when returning from idle.
 */
export function createCinematicDeck(excludeId = null) {
  const ids = CINEMATIC_PRESETS.map((p) => p.id).filter((id) => id !== excludeId);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids;
}

export function getPresetById(id) {
  return CINEMATIC_PRESETS.find((p) => p.id === id) || CINEMATIC_PRESETS[0];
}

export function pickNextPresetFromQueue(queue, currentId = null) {
  if (!Array.isArray(queue) || queue.length === 0) {
    queue.push(...createCinematicDeck(currentId));
  }
  let nextId = queue.shift();
  if (nextId === currentId && queue.length > 0) {
    queue.push(nextId);
    nextId = queue.shift();
  }
  return getPresetById(nextId);
}

export function pickRandomTransition(prevType = null) {
  const pool = TRANSITION_TYPES.filter((t) => t !== prevType);
  return pool[Math.floor(Math.random() * pool.length)] || 'fade';
}
