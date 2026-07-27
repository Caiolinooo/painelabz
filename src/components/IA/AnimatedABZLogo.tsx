'use client';

import React from 'react';
import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';
import {
  AICompanionStatus,
  ICON_CYAN,
  ICON_GOLD,
  ICON_GREEN,
  getCompanionMotion,
  statusAccent,
} from './companion-logo-motion';

export type { AICompanionStatus };

interface AnimatedABZLogoProps {
  status?: AICompanionStatus;
  size?: number;
  className?: string;
  /** @deprecated — FAB usa só o ícone colorido */
  showWordmark?: boolean;
  /** @deprecated — FAB usa só o ícone colorido */
  compactLabel?: boolean;
}

const ICON_SRC = '/images/abz-icon-color.png';

/**
 * Ícone flutuante do Companion = pinwheel oficial ABZ (verde / ouro / azul).
 * Anima float + rotação suave; reduced motion = estático.
 */
export default function AnimatedABZLogo({
  status = 'idle',
  size = 56,
  className = '',
}: AnimatedABZLogoProps) {
  const shouldReduceMotion = useReducedMotion();
  const accent = statusAccent(status);
  const motionPreset = getCompanionMotion(status, !!shouldReduceMotion);
  const iconSize = Math.round(size * 0.78);

  return (
    <motion.div
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      aria-label="ABZ Companion"
      title="ABZ Companion"
      animate={motionPreset.float}
      transition={motionPreset.floatTransition}
    >
      {/* Aura multicolor suave */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          inset: -4,
          background: `radial-gradient(circle at 30% 30%, ${ICON_GREEN}44 0%, transparent 45%),
            radial-gradient(circle at 80% 40%, ${ICON_GOLD}44 0%, transparent 45%),
            radial-gradient(circle at 40% 80%, ${ICON_CYAN}44 0%, transparent 50%)`,
        }}
        animate={motionPreset.aura}
        transition={motionPreset.auraTransition}
      />

      {/* Radar rings (listening / executing) */}
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

      {/* Pinwheel — gira conforme status */}
      <motion.div
        className="relative z-10 flex items-center justify-center"
        style={{ width: iconSize, height: iconSize }}
        animate={motionPreset.icon}
        transition={motionPreset.iconTransition}
      >
        <Image
          src={ICON_SRC}
          alt="ABZ"
          width={iconSize}
          height={iconSize}
          className="object-contain select-none pointer-events-none drop-shadow-md"
          priority
          draggable={false}
        />
      </motion.div>
    </motion.div>
  );
}
