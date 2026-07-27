'use client';

import React from 'react';
import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';
import {
  AICompanionStatus,
  BRAND_BLUE,
  getCompanionMotion,
  statusAccent,
} from './companion-logo-motion';

export type { AICompanionStatus };

interface AnimatedABZLogoProps {
  status?: AICompanionStatus;
  size?: number;
  className?: string;
  /** Wordmark tipográfico "ABZ" abaixo do disco (painel aberto) */
  showWordmark?: boolean;
  /** Mini-rótulo "ABZ" sob o disco (FAB compacto) */
  compactLabel?: boolean;
}

/**
 * Ícone Companion = marca oficial ABZ (`LC1_Azul`) estável + anéis/aura de status.
 * O logo NUNCA gira; só rings/aura/segmento animam. Crop focado na porção "abz".
 */
export default function AnimatedABZLogo({
  status = 'idle',
  size = 48,
  className = '',
  showWordmark = false,
  compactLabel = false,
}: AnimatedABZLogoProps) {
  const shouldReduceMotion = useReducedMotion();
  const accent = statusAccent(status);
  const motionPreset = getCompanionMotion(status, !!shouldReduceMotion);
  const discSize = Math.round(size * 0.72);
  const labelSpace = showWordmark ? 18 : compactLabel ? 12 : 0;

  return (
    <div
      className={`relative inline-flex flex-col items-center ${className}`}
      style={{ width: size, height: size + labelSpace }}
      aria-label="ABZ Companion"
      title="ABZ Companion"
    >
      <div className="relative" style={{ width: size, height: size }}>
        {/* Soft aura — idle breath / speaking pulse (never purple) */}
        <motion.div
          className="absolute rounded-full pointer-events-none"
          style={{
            inset: 0,
            background: `radial-gradient(circle, ${accent}33 0%, ${accent}00 70%)`,
          }}
          animate={motionPreset.aura}
          transition={motionPreset.auraTransition}
        />

        {/* Listening radar ripples */}
        {motionPreset.showRadar &&
          [0, 1].map(i => (
            <motion.div
              key={`radar-${i}`}
              className="absolute rounded-full pointer-events-none"
              style={{
                inset: 0,
                border: `1.5px solid ${accent}`,
              }}
              initial={{ scale: 0.72, opacity: 0.55 }}
              animate={{ scale: 1.28, opacity: 0 }}
              transition={{
                duration: 1.6,
                repeat: Infinity,
                ease: 'easeOut',
                delay: i * 0.55,
              }}
            />
          ))}

        {/* Static / breathing status ring */}
        <motion.div
          className="absolute rounded-full pointer-events-none"
          style={{
            inset: 0,
            border: `2px solid ${accent}`,
            boxShadow: `0 0 0 2px ${accent}18, 0 0 10px ${accent}28`,
          }}
          animate={motionPreset.ring}
          transition={motionPreset.ringTransition}
        />

        {/* Progress / radar tip segment — rotates independently of the logo */}
        {(motionPreset.showProgressArc || status === 'listening') && !shouldReduceMotion && (
          <motion.div
            className="absolute rounded-full pointer-events-none"
            style={{
              inset: 0,
              border: '2.5px solid transparent',
              borderTopColor: accent,
              borderRightColor: status === 'executing' ? `${accent}99` : `${accent}55`,
            }}
            animate={motionPreset.segment}
            transition={motionPreset.segmentTransition}
          />
        )}

        {/* Reduced-motion: static progress hint for executing */}
        {shouldReduceMotion && motionPreset.showProgressArc && (
          <div
            className="absolute rounded-full pointer-events-none"
            style={{
              inset: 0,
              border: '2.5px solid transparent',
              borderTopColor: accent,
              borderRightColor: `${accent}66`,
              transform: 'rotate(-45deg)',
            }}
          />
        )}

        {/* Brand disc — logo STATIC; crop focado na porção esquerda "abz" */}
        <div
          className="absolute z-10 rounded-full bg-white overflow-hidden"
          style={{
            width: discSize,
            height: discSize,
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            boxShadow: `inset 0 0 0 1px ${BRAND_BLUE}14, 0 1px 2px rgba(0,91,150,0.08)`,
          }}
        >
          <Image
            src="/images/LC1_Azul.png"
            alt="ABZ Group"
            fill
            sizes={`${discSize}px`}
            className="select-none pointer-events-none object-cover"
            style={{
              // Wordmark 4.2:1 — object-cover + position esquerda = “abz” no FAB
              objectPosition: '14% 50%',
              transform: 'scale(1.15)',
              transformOrigin: '14% 50%',
            }}
            priority
            draggable={false}
          />
        </div>
      </div>

      {showWordmark && (
        <span
          className="relative z-10 mt-1 font-extrabold tracking-[0.22em] text-[10px] leading-none"
          style={{ color: accent }}
        >
          ABZ
        </span>
      )}

      {compactLabel && !showWordmark && (
        <span
          className="relative z-10 -mt-0.5 font-extrabold tracking-[0.2em] leading-none"
          style={{ color: BRAND_BLUE, fontSize: Math.max(8, Math.round(size * 0.16)) }}
        >
          ABZ
        </span>
      )}
    </div>
  );
}
