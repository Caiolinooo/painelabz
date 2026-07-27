import type { Transition, TargetAndTransition } from 'framer-motion';

export type AICompanionStatus = 'idle' | 'listening' | 'speaking' | 'executing';

/** Brand blue — official ABZ (avoid purple AI glow) */
export const BRAND_BLUE = '#005B96';
export const BRAND_BLUE_BRIGHT = '#0B72E7';

export function statusAccent(status: AICompanionStatus): string {
  switch (status) {
    case 'idle':
      return BRAND_BLUE;
    case 'listening':
      return '#0A7AB8';
    case 'speaking':
      return BRAND_BLUE_BRIGHT;
    case 'executing':
      return '#059669';
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export type CompanionMotionPreset = {
  aura?: TargetAndTransition;
  auraTransition?: Transition;
  ring?: TargetAndTransition;
  ringTransition?: Transition;
  /** Rotating progress segment (listening radar tip / executing) */
  segment?: TargetAndTransition;
  segmentTransition?: Transition;
  showRadar: boolean;
  showProgressArc: boolean;
};

const easeInOut: Transition['ease'] = 'easeInOut';

/**
 * Motion only on rings/aura — never on the brand mark.
 * When `reduced` is true, return static accents (no loops).
 */
export function getCompanionMotion(
  status: AICompanionStatus,
  reduced: boolean
): CompanionMotionPreset {
  if (reduced) {
    return {
      showRadar: false,
      showProgressArc: status === 'executing',
    };
  }

  switch (status) {
    case 'idle':
      return {
        showRadar: false,
        showProgressArc: false,
        aura: { opacity: [0.28, 0.48, 0.28], scale: [1, 1.06, 1] },
        auraTransition: { duration: 3.2, repeat: Infinity, ease: easeInOut },
        ring: { opacity: [0.55, 0.9, 0.55] },
        ringTransition: { duration: 3.2, repeat: Infinity, ease: easeInOut },
      };
    case 'listening':
      return {
        showRadar: true,
        showProgressArc: false,
        aura: { opacity: [0.35, 0.55, 0.35], scale: [1, 1.1, 1] },
        auraTransition: { duration: 1.6, repeat: Infinity, ease: easeInOut },
        segment: { rotate: 360 },
        segmentTransition: { duration: 1.8, repeat: Infinity, ease: 'linear' },
      };
    case 'speaking':
      return {
        showRadar: false,
        showProgressArc: false,
        aura: { opacity: [0.4, 0.7, 0.4], scale: [1, 1.12, 1] },
        auraTransition: { duration: 0.9, repeat: Infinity, ease: easeInOut },
        ring: { scale: [1, 1.05, 1], opacity: [0.7, 1, 0.7] },
        ringTransition: { duration: 0.9, repeat: Infinity, ease: easeInOut },
      };
    case 'executing':
      return {
        showRadar: false,
        showProgressArc: true,
        segment: { rotate: 360 },
        segmentTransition: { duration: 1.25, repeat: Infinity, ease: 'linear' },
      };
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}
