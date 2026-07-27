'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';

export type AICompanionStatus = 'idle' | 'listening' | 'speaking' | 'executing';

interface AnimatedABZLogoProps {
  status?: AICompanionStatus;
  size?: number;
  className?: string;
  /** Exibe a marca "ABZ" abaixo do logo */
  showWordmark?: boolean;
}

const STATUS_RING: Record<AICompanionStatus, string> = {
  idle: '#005B96',
  listening: '#0A7AB8',
  speaking: '#2563EB',
  executing: '#059669',
};

/**
 * Ícone do Companion = logo oficial ABZ (LC1_Azul) estável + anel de status.
 * O logo NÃO gira (permanece legível como marca ABZ); só o anel anima.
 */
export default function AnimatedABZLogo({
  status = 'idle',
  size = 48,
  className = '',
  showWordmark = false,
}: AnimatedABZLogoProps) {
  const ring = STATUS_RING[status];
  const logoSize = Math.round(size * 0.78);

  const ringPulse =
    status === 'idle'
      ? { scale: [1, 1.04, 1], opacity: [0.65, 1, 0.65] }
      : status === 'listening'
        ? { scale: [1, 1.12, 1], opacity: [0.75, 1, 0.75] }
        : status === 'speaking'
          ? { scale: [1, 1.08, 1], opacity: [0.8, 1, 0.8] }
          : { scale: [1, 1.1, 1], opacity: [0.85, 1, 0.85] };

  return (
    <div
      className={`relative inline-flex flex-col items-center justify-center ${className}`}
      style={{ width: size, height: showWordmark ? size + 16 : size }}
      aria-label="ABZ Companion"
      title="ABZ Companion"
    >
      {/* Anel de status — único elemento que pulsa/gira */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: size,
          height: size,
          top: 0,
          left: 0,
          border: `2.5px solid ${ring}`,
          boxShadow: `0 0 0 3px ${ring}22, 0 0 12px ${ring}44`,
        }}
        animate={{
          ...ringPulse,
          ...(status === 'executing' ? { rotate: 360 } : {}),
        }}
        transition={{
          duration: status === 'executing' ? 1.4 : 2.2,
          repeat: Infinity,
          ease: status === 'executing' ? 'linear' : 'easeInOut',
        }}
      />

      {/* Segmento curto no anel (idle/listening) — reforça “ao vivo” sem girar o logo */}
      {(status === 'listening' || status === 'speaking') && (
        <motion.div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: size,
            height: size,
            top: 0,
            left: 0,
            border: '2.5px solid transparent',
            borderTopColor: ring,
            borderRightColor: `${ring}88`,
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: status === 'listening' ? 1.8 : 2.4, repeat: Infinity, ease: 'linear' }}
        />
      )}

      {/* Logo oficial ABZ — estático e legível */}
      <div
        className="relative z-10 flex items-center justify-center rounded-full bg-white overflow-hidden"
        style={{
          width: logoSize,
          height: logoSize,
          boxShadow: 'inset 0 0 0 1px rgba(0,91,150,0.12)',
        }}
      >
        <Image
          src="/images/LC1_Azul.png"
          alt="ABZ Group"
          width={logoSize}
          height={logoSize}
          className="object-contain p-[10%]"
          priority
        />
      </div>

      {showWordmark && (
        <span
          className="relative z-10 mt-1 font-extrabold tracking-[0.2em] text-[10px] leading-none"
          style={{ color: ring }}
        >
          ABZ
        </span>
      )}
    </div>
  );
}
