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
  /** No painel aberto: mostra LC1 completo (object-contain) + rótulo */
  showWordmark?: boolean;
  /** FAB: tipografia "abz" + mini-rótulo (sem crop destruído) */
  compactLabel?: boolean;
}

/**
 * Ícone Companion ABZ.
 * FAB (~40–56px): tipografia bold "abz" — o PNG horizontal LC1 NÃO cabe em círculo
 * sem virar mancha. Painel maior: LC1_Azul com object-contain.
 * Motion só em rings/aura; a marca nunca gira.
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
  const discSize = Math.round(size * (showWordmark ? 0.78 : 0.76));
  const labelSpace = showWordmark ? 16 : compactLabel ? 11 : 0;
  /** Tipografia "abz" no FAB — escala com o disco */
  const abzFontSize = Math.max(11, Math.round(discSize * 0.38));

  return (
    <div
      className={`relative inline-flex flex-col items-center ${className}`}
      style={{ width: size, height: size + labelSpace }}
      aria-label="ABZ Companion"
      title="ABZ Companion"
    >
      <div className="relative" style={{ width: size, height: size }}>
        <motion.div
          className="absolute rounded-full pointer-events-none"
          style={{
            inset: 0,
            background: `radial-gradient(circle, ${accent}33 0%, ${accent}00 70%)`,
          }}
          animate={motionPreset.aura}
          transition={motionPreset.auraTransition}
        />

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

        {/* Disco da marca — tipografia no FAB; PNG só no painel (contain) */}
        <div
          className="absolute z-10 rounded-full bg-white overflow-hidden flex items-center justify-center"
          style={{
            width: discSize,
            height: discSize,
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            boxShadow: `inset 0 0 0 1px ${BRAND_BLUE}14, 0 1px 2px rgba(0,91,150,0.08)`,
          }}
        >
          {showWordmark ? (
            <div className="relative w-[88%] h-[55%]">
              <Image
                src="/images/LC1_Azul.png"
                alt="abz group"
                fill
                sizes={`${discSize}px`}
                className="object-contain select-none pointer-events-none"
                priority
                draggable={false}
              />
            </div>
          ) : (
            <span
              className="select-none pointer-events-none font-extrabold lowercase leading-none tracking-tight"
              style={{
                color: BRAND_BLUE,
                fontSize: abzFontSize,
                letterSpacing: '-0.04em',
                fontFamily:
                  'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
              }}
            >
              abz
            </span>
          )}
        </div>
      </div>

      {(showWordmark || compactLabel) && (
        <span
          className="relative z-10 font-extrabold tracking-[0.2em] leading-none"
          style={{
            color: accent,
            fontSize: showWordmark ? 10 : Math.max(8, Math.round(size * 0.15)),
            marginTop: showWordmark ? 4 : 2,
          }}
        >
          ABZ
        </span>
      )}
    </div>
  );
}
