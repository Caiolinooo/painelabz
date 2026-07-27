import type { Transition, TargetAndTransition } from 'framer-motion';

export type AICompanionStatus = 'idle' | 'listening' | 'speaking' | 'executing';

/** Brand blue — ABZ UI chrome */
export const BRAND_BLUE = '#005B96';
export const BRAND_BLUE_BRIGHT = '#0B72E7';

/** Cores oficiais do ícone pinwheel ABZ */
export const ICON_GREEN = '#22C55E';
export const ICON_GOLD = '#F59E0B';
export const ICON_CYAN = '#0EA5E9';

export function statusAccent(status: AICompanionStatus): string {
  switch (status) {
    case 'idle':
      return BRAND_BLUE;
    case 'listening':
      return ICON_CYAN;
    case 'speaking':
      return BRAND_BLUE_BRIGHT;
    case 'executing':
      return ICON_GREEN;
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export type CompanionMotionPreset = {
  /** Flutuação vertical do FAB */
  float?: TargetAndTransition;
  floatTransition?: Transition;
  /** Rotação suave do pinwheel (ícone circular) */
  icon?: TargetAndTransition;
  iconTransition?: Transition;
  aura?: TargetAndTransition;
  auraTransition?: Transition;
  showRadar: boolean;
};

/**
 * Motion para o ícone colorido ABZ (pinwheel).
 * Reduced motion → estático.
 */
export function getCompanionMotion(
  status: AICompanionStatus,
  reduced: boolean
): CompanionMotionPreset {
  if (reduced) {
    return { showRadar: false };
  }

  switch (status) {
    case 'idle':
      return {
        showRadar: false,
        float: { y: [0, -5, 0] },
        floatTransition: { duration: 3.4, repeat: Infinity, ease: 'easeInOut' },
        icon: { rotate: 360 },
        iconTransition: { duration: 18, repeat: Infinity, ease: 'linear' },
        aura: { opacity: [0.35, 0.6, 0.35], scale: [1, 1.08, 1] },
        auraTransition: { duration: 3.4, repeat: Infinity, ease: 'easeInOut' },
      };
    case 'listening':
      return {
        showRadar: true,
        float: { y: [0, -3, 0] },
        floatTransition: { duration: 1.4, repeat: Infinity, ease: 'easeInOut' },
        icon: { rotate: 360 },
        iconTransition: { duration: 4.5, repeat: Infinity, ease: 'linear' },
        aura: { opacity: [0.45, 0.75, 0.45], scale: [1, 1.14, 1] },
        auraTransition: { duration: 1.4, repeat: Infinity, ease: 'easeInOut' },
      };
    case 'speaking':
      return {
        showRadar: false,
        float: { y: [0, -4, 0] },
        floatTransition: { duration: 0.85, repeat: Infinity, ease: 'easeInOut' },
        icon: { rotate: [0, 12, -12, 8, 0], scale: [1, 1.06, 1] },
        iconTransition: { duration: 1.1, repeat: Infinity, ease: 'easeInOut' },
        aura: { opacity: [0.5, 0.85, 0.5], scale: [1, 1.16, 1] },
        auraTransition: { duration: 0.85, repeat: Infinity, ease: 'easeInOut' },
      };
    case 'executing':
      return {
        showRadar: true,
        float: { y: 0 },
        icon: { rotate: 360 },
        iconTransition: { duration: 1.35, repeat: Infinity, ease: 'linear' },
        aura: { opacity: [0.55, 0.9, 0.55], scale: [1, 1.12, 1] },
        auraTransition: { duration: 1.0, repeat: Infinity, ease: 'easeInOut' },
      };
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}
