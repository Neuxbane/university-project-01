/**
 * AAA Showroom Cinematic Camera Director for Three.js Motorcycle Viewer.
 * Provides >= 20 procedural camera presets (including full top & bottom 360 orbits,
 * close-up wheel/CVT/exhaust/visor passes, crane sweeps, and profiles) plus random
 * transition effects (fade, zoom in/out, swipe left/right/up/down, smooth glide).
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
 * 24 named camera presets parameterized in spherical / relative offsets around
 * model center & modelMaxDim so every uploaded .glb frames consistently.
 * azimuth: radians around Y (0 = +X front, PI/2 = +Z right side, -PI/2 = -Z left side, PI = -X rear)
 * elevation: radians above horizon (+ = looking down from above, - = low ground angle)
 * distMul: multiplier of base fitDist
 * durationMs: shot playback duration
 * targetOffset: [ox, oy, oz] fractions of modelMaxDim shifted from box center
 */
export const CINEMATIC_PRESETS = [
  {
    id: 'high_orbit_360',
    label: 'Putaran Atas 360°',
    durationMs: 7500,
    azimuthStart: 0.65,
    azimuthEnd: 0.65 + Math.PI * 2,
    elevationStart: 0.88,
    elevationEnd: 0.82,
    distStart: 1.05,
    distEnd: 1.0,
    targetOffset: [0, 0, 0],
  },
  {
    id: 'low_orbit_360',
    label: 'Putaran Bawah 360°',
    durationMs: 7500,
    azimuthStart: -0.9,
    azimuthEnd: -0.9 + Math.PI * 2,
    elevationStart: 0.1,
    elevationEnd: 0.14,
    distStart: 0.96,
    distEnd: 0.96,
    targetOffset: [0, -0.08, 0],
  },
  {
    id: 'hero_front_34_right',
    label: 'Hero Depan Kanan',
    durationMs: 4200,
    azimuthStart: 0.45,
    azimuthEnd: 0.92,
    elevationStart: 0.28,
    elevationEnd: 0.22,
    distStart: 0.98,
    distEnd: 0.9,
    targetOffset: [0.06, 0.02, 0],
  },
  {
    id: 'hero_front_34_left',
    label: 'Hero Depan Kiri',
    durationMs: 4200,
    azimuthStart: -0.45,
    azimuthEnd: -0.98,
    elevationStart: 0.24,
    elevationEnd: 0.3,
    distStart: 0.95,
    distEnd: 0.88,
    targetOffset: [0.05, 0.02, 0],
  },
  {
    id: 'hero_rear_34_right',
    label: 'Hero Belakang Kanan',
    durationMs: 4200,
    azimuthStart: 2.1,
    azimuthEnd: 2.65,
    elevationStart: 0.22,
    elevationEnd: 0.3,
    distStart: 0.95,
    distEnd: 0.88,
    targetOffset: [-0.08, 0, 0],
  },
  {
    id: 'hero_rear_34_left',
    label: 'Hero Belakang Kiri',
    durationMs: 4200,
    azimuthStart: -2.05,
    azimuthEnd: -2.6,
    elevationStart: 0.25,
    elevationEnd: 0.18,
    distStart: 0.96,
    distEnd: 0.88,
    targetOffset: [-0.08, 0, 0],
  },
  {
    id: 'overhead_top_down',
    label: 'Drone Atas Menyapu',
    durationMs: 4400,
    azimuthStart: 1.35,
    azimuthEnd: 1.85,
    elevationStart: 1.32,
    elevationEnd: 1.24,
    distStart: 1.05,
    distEnd: 0.92,
    targetOffset: [0.12, 0, 0],
  },
  {
    id: 'wheel_front_closeup',
    label: 'Close-Up Roda & Kaliper Depan',
    durationMs: 4000,
    azimuthStart: -0.55,
    azimuthEnd: -1.15,
    elevationStart: 0.08,
    elevationEnd: 0.15,
    distStart: 0.62,
    distEnd: 0.56,
    targetOffset: [0.28, -0.14, -0.02],
  },
  {
    id: 'wheel_rear_closeup',
    label: 'Close-Up Roda Belakang',
    durationMs: 4000,
    azimuthStart: 2.05,
    azimuthEnd: 2.55,
    elevationStart: 0.09,
    elevationEnd: 0.16,
    distStart: 0.64,
    distEnd: 0.58,
    targetOffset: [-0.28, -0.14, 0.02],
  },
  {
    id: 'cvt_crankcase_dolly',
    label: 'Dolly Area CVT Kiri',
    durationMs: 4200,
    azimuthStart: -1.85,
    azimuthEnd: -1.35,
    elevationStart: 0.12,
    elevationEnd: 0.18,
    distStart: 0.68,
    distEnd: 0.62,
    targetOffset: [-0.14, -0.12, -0.06],
  },
  {
    id: 'exhaust_muffler_pan',
    label: 'Pan Area Knalpot Kanan',
    durationMs: 4200,
    azimuthStart: 1.32,
    azimuthEnd: 1.92,
    elevationStart: 0.1,
    elevationEnd: 0.16,
    distStart: 0.68,
    distEnd: 0.6,
    targetOffset: [-0.16, -0.1, 0.06],
  },
  {
    id: 'visor_cockpit_tilt',
    label: 'Sudut Stang & Visor',
    durationMs: 4000,
    azimuthStart: 0.38,
    azimuthEnd: -0.38,
    elevationStart: 0.68,
    elevationEnd: 0.56,
    distStart: 0.72,
    distEnd: 0.66,
    targetOffset: [0.16, 0.2, 0],
  },
  {
    id: 'tail_behel_glide',
    label: 'Sweep Ekor & Behel Jok',
    durationMs: 4000,
    azimuthStart: -2.4,
    azimuthEnd: -3.3,
    elevationStart: 0.45,
    elevationEnd: 0.32,
    distStart: 0.78,
    distEnd: 0.7,
    targetOffset: [-0.24, 0.12, 0],
  },
  {
    id: 'front_headlamp_push',
    label: 'Sorot Depan Simetris',
    durationMs: 3800,
    azimuthStart: -0.12,
    azimuthEnd: 0.12,
    elevationStart: 0.16,
    elevationEnd: 0.24,
    distStart: 1.08,
    distEnd: 0.76,
    targetOffset: [0.18, 0.04, 0],
  },
  {
    id: 'rear_tail_pullback',
    label: 'Tarik Belakang Simetris',
    durationMs: 3800,
    azimuthStart: 2.98,
    azimuthEnd: 3.28,
    elevationStart: 0.22,
    elevationEnd: 0.34,
    distStart: 0.76,
    distEnd: 1.1,
    targetOffset: [-0.18, 0.04, 0],
  },
  {
    id: 'dutch_rise_left',
    label: 'Crane Naik Sisi Kiri',
    durationMs: 4300,
    azimuthStart: -1.9,
    azimuthEnd: -1.1,
    elevationStart: 0.08,
    elevationEnd: 0.75,
    distStart: 0.92,
    distEnd: 1.02,
    targetOffset: [0, 0.04, 0],
  },
  {
    id: 'crane_descend_right',
    label: 'Crane Turun Sisi Kanan',
    durationMs: 4300,
    azimuthStart: 1.1,
    azimuthEnd: 1.95,
    elevationStart: 0.85,
    elevationEnd: 0.12,
    distStart: 1.05,
    distEnd: 0.85,
    targetOffset: [0, 0, 0],
  },
  {
    id: 'side_profile_left',
    label: 'Siluet Samping Kiri',
    durationMs: 4000,
    azimuthStart: -1.57,
    azimuthEnd: -1.57,
    elevationStart: 0.18,
    elevationEnd: 0.18,
    distStart: 1.12,
    distEnd: 0.94,
    targetOffset: [0, 0, 0],
  },
  {
    id: 'side_profile_right',
    label: 'Siluet Samping Kanan',
    durationMs: 4000,
    azimuthStart: 1.57,
    azimuthEnd: 1.57,
    elevationStart: 0.18,
    elevationEnd: 0.18,
    distStart: 1.12,
    distEnd: 0.94,
    targetOffset: [0, 0, 0],
  },
  {
    id: 'ground_level_pass',
    label: 'Kamera Rendah Menyusur',
    durationMs: 4200,
    azimuthStart: -0.65,
    azimuthEnd: -2.45,
    elevationStart: 0.06,
    elevationEnd: 0.08,
    distStart: 0.88,
    distEnd: 0.88,
    targetOffset: [0, -0.1, 0],
  },
  {
    id: 'diag_high_sweep',
    label: 'Sweep Diagonal Tinggi',
    durationMs: 4400,
    azimuthStart: 0.6,
    azimuthEnd: -0.9,
    elevationStart: 0.95,
    elevationEnd: 0.65,
    distStart: 1.15,
    distEnd: 0.95,
    targetOffset: [0, 0.04, 0],
  },
  {
    id: 'engine_belly_orbit',
    label: 'Fokus Tengah Rangka & Mesin',
    durationMs: 4200,
    azimuthStart: 1.0,
    azimuthEnd: 2.15,
    elevationStart: 0.15,
    elevationEnd: 0.25,
    distStart: 0.7,
    distEnd: 0.68,
    targetOffset: [-0.04, -0.08, 0],
  },
  {
    id: 'spiral_ascend_360',
    label: 'Spiral Naik 360°',
    durationMs: 7000,
    azimuthStart: 0,
    azimuthEnd: Math.PI * 2,
    elevationStart: 0.12,
    elevationEnd: 0.95,
    distStart: 0.85,
    distEnd: 1.12,
    targetOffset: [0, 0, 0],
  },
  {
    id: 'helix_descend_360',
    label: 'Helix Turun 360°',
    durationMs: 7000,
    azimuthStart: Math.PI,
    azimuthEnd: -Math.PI,
    elevationStart: 0.92,
    elevationEnd: 0.14,
    distStart: 1.12,
    distEnd: 0.88,
    targetOffset: [0, 0, 0],
  },
];

export function easeInOutSine(t) {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

/**
 * Evaluates world camera position and target for a preset at progress t in [0, 1].
 */
export function evaluatePresetPose(preset, progress, center, modelMaxDim, baseFitDist) {
  const t = easeInOutSine(Math.max(0, Math.min(1, progress)));
  const az = preset.azimuthStart + (preset.azimuthEnd - preset.azimuthStart) * t;
  const el = preset.elevationStart + (preset.elevationEnd - preset.elevationStart) * t;
  const dist = baseFitDist * (preset.distStart + (preset.distEnd - preset.distStart) * t);

  const off = preset.targetOffset || [0, 0, 0];
  const tx = center.x + off[0] * modelMaxDim;
  const ty = center.y + off[1] * modelMaxDim;
  const tz = center.z + off[2] * modelMaxDim;

  const cosEl = Math.cos(el);
  const sinEl = Math.sin(el);
  const cx = tx + dist * cosEl * Math.cos(az);
  const cy = ty + dist * sinEl;
  const cz = tz + dist * cosEl * Math.sin(az);

  return {
    camPos: [cx, cy, cz],
    target: [tx, ty, tz],
  };
}

/**
 * Picks next preset index avoiding immediate repeats. When forcePair is true (e.g.
 * initial idle sequence), cycles high_orbit_360 -> low_orbit_360 first before randomizing.
 */
export function pickNextPreset(currentId = null, stepCount = 0) {
  if (stepCount === 0 && !currentId) {
    // Cinematic opening shot on page load
    return CINEMATIC_PRESETS[2]; // hero_front_34_right or pick random hero
  }
  if (stepCount === 1) return CINEMATIC_PRESETS[0]; // high_orbit_360 (1 top turn)
  if (stepCount === 2) return CINEMATIC_PRESETS[1]; // low_orbit_360 (1 bottom turn)

  const pool = CINEMATIC_PRESETS.filter((p) => p.id !== currentId);
  return pool[Math.floor(Math.random() * pool.length)] || CINEMATIC_PRESETS[0];
}

export function pickRandomTransition(prevType = null) {
  const pool = TRANSITION_TYPES.filter((t) => t !== prevType);
  return pool[Math.floor(Math.random() * pool.length)] || 'fade';
}
