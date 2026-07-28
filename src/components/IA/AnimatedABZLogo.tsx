'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';
import {
  AICompanionStatus,
  getCompanionMotion,
  statusAccent,
} from './companion-logo-motion';
import {
  MASCOT_BODY,
  MASCOT_STATUS_CYCLES,
  mascotFrameSrc,
} from './companion-mascot-frames';

export type { AICompanionStatus };

interface AnimatedABZLogoProps {
  status?: AICompanionStatus;
  size?: number;
  className?: string;
  /** @deprecated — kept for API compat */
  showWordmark?: boolean;
  /** @deprecated — kept for API compat */
  compactLabel?: boolean;
}

/**
 * Companion FAB / panel mascot — blue-book sprite keyed to RGBA frames.
 * Drop-in props: status | size | className. Status owned by AICompanionWidget.
 */
export default function AnimatedABZLogo({
  status = 'idle',
  size = 56,
  className = '',
}: AnimatedABZLogoProps) {
  const shouldReduceMotion = useReducedMotion();
  const accent = statusAccent(status);
  const motionPreset = getCompanionMotion(status, !!shouldReduceMotion);
  const cycle = MASCOT_STATUS_CYCLES[status];
  const [frameIdx, setFrameIdx] = useState(0);

  useEffect(() => {
    setFrameIdx(0);
  }, [status]);

  useEffect(() => {
    if (shouldReduceMotion || cycle.fps <= 0 || cycle.frames.length <= 1) {
      return;
    }
    const ms = Math.max(80, Math.round(1000 / cycle.fps));
    const id = window.setInterval(() => {
      setFrameIdx(i => (i + 1) % cycle.frames.length);
    }, ms);
    return () => window.clearInterval(id);
  }, [cycle, shouldReduceMotion, status]);

  const frameId = cycle.frames[Math.min(frameIdx, cycle.frames.length - 1)] ?? 'idle_stand';
  const src = mascotFrameSrc(frameId in MASCOT_BODY ? frameId : 'idle_stand');
  const iconSize = Math.round(size * 0.92);

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

      <div
        className="relative z-10 flex items-center justify-center"
        style={{ width: iconSize, height: iconSize }}
      >
        <Image
          src={src}
          alt="Companion ABZ"
          width={iconSize}
          height={iconSize}
          className="object-contain select-none pointer-events-none drop-shadow-md"
          priority
          draggable={false}
          unoptimized
        />
      </div>
    </motion.div>
  );
}
