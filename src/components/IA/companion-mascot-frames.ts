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

export type MascotStatusCycle = {
  frames: (keyof typeof MASCOT_BODY)[];
  /** Frames per second; 0 = static first frame */
  fps: number;
};

/**
 * Status → pose cycle. Edit here or frames.json to retune without redesign.
 * Grid source: sheet-poses 5×10 (r0c0 idle … r4c5/6 typing, r0c7 lightbulb).
 */
export const MASCOT_STATUS_CYCLES: Record<AICompanionStatus, MascotStatusCycle> = {
  idle: {
    frames: ['idle_stand', 'idle_wave', 'idle_alt', 'idle_stand'],
    fps: 1.2,
  },
  listening: {
    frames: ['listen_ear'],
    fps: 0,
  },
  speaking: {
    frames: ['speak_open', 'speak_grin', 'speak_gesture', 'speak_active'],
    fps: 4,
  },
  executing: {
    frames: ['think_chin', 'exec_bulb', 'exec_type_a', 'exec_type_b'],
    fps: 2.5,
  },
};

export function mascotFrameSrc(frameId: keyof typeof MASCOT_BODY): string {
  return MASCOT_BODY[frameId];
}
