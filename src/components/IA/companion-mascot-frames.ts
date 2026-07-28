import type { AICompanionStatus } from './companion-logo-motion';

/** Public paths for keyed RGBA body frames (see public/images/companion-mascot/frames.json). */
export const MASCOT_BODY: Record<string, string> = {
  idle_stand: '/images/companion-mascot/body/idle_stand.png',
  idle_wave: '/images/companion-mascot/body/idle_wave.png',
  idle_alt: '/images/companion-mascot/body/idle_alt.png',
  listen_ear: '/images/companion-mascot/body/listen_ear.png',
  think_chin: '/images/companion-mascot/body/think_chin.png',
  speak_open: '/images/companion-mascot/body/speak_open.png',
  speak_grin: '/images/companion-mascot/body/speak_grin.png',
  speak_gesture: '/images/companion-mascot/body/speak_gesture.png',
  speak_active: '/images/companion-mascot/body/speak_active.png',
  exec_bulb: '/images/companion-mascot/body/exec_bulb.png',
  exec_type_a: '/images/companion-mascot/body/exec_type_a.png',
  exec_type_b: '/images/companion-mascot/body/exec_type_b.png',
};

/** Face overlays (64×64) composited over body via MASCOT_FACE_OVERLAY. */
export const MASCOT_FACE: Record<string, string> = {
  face_neutral: '/images/companion-mascot/face/face_neutral.png',
  face_blink: '/images/companion-mascot/face/face_blink.png',
  viseme_a: '/images/companion-mascot/face/viseme_a.png',
  viseme_e: '/images/companion-mascot/face/viseme_e.png',
  viseme_i: '/images/companion-mascot/face/viseme_i.png',
  viseme_u: '/images/companion-mascot/face/viseme_u.png',
};

export type MascotBodyId = keyof typeof MASCOT_BODY;
export type MascotFaceId = keyof typeof MASCOT_FACE;

/**
 * Face layer placement on the body box.
 * - x/y/w/h: normalized fractions (Fase 0 compositor)
 * - left/top/width/height: CSS % strings (Rive-like overlay)
 * Tweaking these recenters blink/visemes without re-baking PNGs.
 */
export const MASCOT_FACE_OVERLAY = {
  x: 0.234375,
  y: 0.125,
  w: 0.453125,
  h: 0.46875,
  left: '23.4375%',
  top: '12.5%',
  width: '45.3125%',
  height: '46.875%',
} as const;

/** Idle blink timing (random interval between min/max). */
export const MASCOT_BLINK = {
  idleMsMin: 2200,
  idleMsMax: 5200,
  holdMs: 140,
} as const;

/**
 * Fake lip-sync cycle while status === 'speaking'.
 * Order = mouth shapes; `face_neutral` = rest.
 * Tweak: edit this array (or frames.json → lipSync.visemes).
 */
export const MASCOT_VISEMES: MascotFaceId[] = [
  'viseme_a',
  'viseme_e',
  'viseme_i',
  'viseme_u',
  'face_neutral',
];

/** Alias for Rive / Rive-like drivers (a/e/i/u only — rest is index wrap side-effect). */
export const MASCOT_VISEME_IDS: MascotFaceId[] = [
  'viseme_a',
  'viseme_e',
  'viseme_i',
  'viseme_u',
];

export const MASCOT_LIP_SYNC_FPS = 6;

export function visemeIdAt(index: number): MascotFaceId {
  const ids = MASCOT_VISEME_IDS;
  if (ids.length === 0) return 'face_neutral';
  const i = ((index % ids.length) + ids.length) % ids.length;
  return ids[i] ?? 'face_neutral';
}

export type MascotStatusCycle = {
  frames: MascotBodyId[];
  /** Frames per second; 0 = static first frame */
  fps: number;
  /** Body crossfade duration (Rive-like) */
  crossfadeMs: number;
  /** Face driver: blink (idle), lipSync (speaking), or static neutral */
  face: 'blink' | 'lipSync' | 'neutral';
};

/**
 * Status → pose cycle. Edit here or frames.json to retune without redesign.
 */
export const MASCOT_STATUS_CYCLES: Record<AICompanionStatus, MascotStatusCycle> = {
  idle: {
    frames: ['idle_stand', 'idle_wave', 'idle_alt', 'idle_stand'],
    fps: 1.2,
    crossfadeMs: 180,
    face: 'blink',
  },
  listening: {
    frames: ['listen_ear', 'think_chin', 'idle_alt', 'listen_ear', 'think_chin'],
    fps: 1.5,
    crossfadeMs: 160,
    face: 'neutral',
  },
  speaking: {
    frames: ['speak_open', 'speak_grin', 'speak_gesture', 'speak_active'],
    fps: 3.2,
    crossfadeMs: 120,
    face: 'lipSync',
  },
  executing: {
    frames: [
      'think_chin',
      'exec_bulb',
      'exec_type_a',
      'exec_type_b',
      'speak_gesture',
      'speak_active',
      'exec_bulb',
      'exec_type_a',
    ],
    fps: 2.8,
    crossfadeMs: 140,
    face: 'neutral',
  },
};

/** Key PNGs to warm the browser cache (body + face used by all statuses). */
export const MASCOT_PREFETCH_SRC: string[] = [
  MASCOT_BODY.idle_stand,
  MASCOT_BODY.idle_wave,
  MASCOT_BODY.idle_alt,
  MASCOT_BODY.listen_ear,
  MASCOT_BODY.think_chin,
  MASCOT_BODY.speak_open,
  MASCOT_BODY.speak_grin,
  MASCOT_BODY.speak_gesture,
  MASCOT_BODY.speak_active,
  MASCOT_BODY.exec_bulb,
  MASCOT_BODY.exec_type_a,
  MASCOT_BODY.exec_type_b,
  MASCOT_FACE.face_neutral,
  MASCOT_FACE.face_blink,
  MASCOT_FACE.viseme_a,
  MASCOT_FACE.viseme_e,
  MASCOT_FACE.viseme_i,
  MASCOT_FACE.viseme_u,
];

/** Drop-in Rive artboard (optional). */
export const COMPANION_RIVE_SRC = '/rive/companion-mascot.riv';

export const COMPANION_RIVE_SM = {
  stateMachine: 'CompanionSM',
  statusInput: 'status',
  visemeInput: 'viseme',
} as const;

export const STATUS_TO_RIVE_INDEX: Record<AICompanionStatus, number> = {
  idle: 0,
  listening: 1,
  speaking: 2,
  executing: 3,
};

export function mascotFrameSrc(frameId: MascotBodyId): string {
  return MASCOT_BODY[frameId];
}

export function mascotFaceSrc(faceId: MascotFaceId): string {
  return MASCOT_FACE[faceId];
}

export function hasMascotFaceAssets(): boolean {
  return Object.keys(MASCOT_FACE).length > 0;
}
