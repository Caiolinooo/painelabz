'use client';

import React, { useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  AICompanionStatus,
  getCompanionMotion,
  statusAccent,
} from './companion-logo-motion';
import { MASCOT_PREFETCH_SRC } from './companion-mascot-frames';
import CompanionMascotRive from './CompanionMascotRive';

export type { AICompanionStatus };

interface AnimatedABZLogoProps {
  status?: AICompanionStatus;
  size?: number;
  className?: string;
  /** Optional TTS-driven viseme index (0–3). Omit for fake lip-sync. */
  visemeIndex?: number;
  /** @deprecated — kept for API compat */
  showWordmark?: boolean;
  /** @deprecated — kept for API compat */
  compactLabel?: boolean;
}

/**
 * Companion FAB / panel mascot — Rive when `.riv` present, else Rive-like sprite SM
 * (crossfade + face/visemes from Fase 0 assets).
 * Drop-in props: status | size | className | visemeIndex.
 */
export default function AnimatedABZLogo({
  status = 'idle',
  size = 56,
  className = '',
  visemeIndex,
}: AnimatedABZLogoProps) {
  const shouldReduceMotion = useReducedMotion();
  const accent = statusAccent(status);
  const motionPreset = getCompanionMotion(status, !!shouldReduceMotion);
  const iconSize = Math.round(size * 0.92);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    for (const src of MASCOT_PREFETCH_SRC) {
      const img = new window.Image();
      img.decoding = 'async';
      img.src = src;
    }
  }, []);

  return (
    <motion.div
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      aria-label="ABZ Companion"
      title="ABZ Companion"
      animate={shouldReduceMotion ? undefined : motionPreset.float}
      transition={motionPreset.floatTransition}
    >
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          inset: -4,
          background: `radial-gradient(circle at 40% 35%, ${accent}33 0%, transparent 62%)`,
        }}
        animate={shouldReduceMotion ? undefined : motionPreset.aura}
        transition={motionPreset.auraTransition}
      />

      {motionPreset.showRadar &&
        !shouldReduceMotion &&
        [0, 1].map(i => (
          <motion.div
            key={`radar-${i}`}
            className="absolute rounded-full pointer-events-none"
            style={{
              inset: -2,
              border: `1.5px solid ${accent}`,
            }}
            initial={{ scale: 0.85, opacity: 0.5 }}
            animate={{ scale: 1.45, opacity: 0 }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeOut',
              delay: i * 0.5,
            }}
          />
        ))}

      <div className="relative z-10 flex items-center justify-center">
        <CompanionMascotRive
          status={status}
          size={iconSize}
          reducedMotion={!!shouldReduceMotion}
          visemeIndex={visemeIndex}
        />
      </div>
    </motion.div>
  );
}
