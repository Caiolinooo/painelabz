'use client';

import React from 'react';
import { motion } from 'framer-motion';

export type AICompanionStatus = 'idle' | 'listening' | 'speaking' | 'executing';

interface AnimatedABZLogoProps {
  status?: AICompanionStatus;
  size?: number;
  className?: string;
}

export default function AnimatedABZLogo({
  status = 'idle',
  size = 48,
  className = ''
}: AnimatedABZLogoProps) {
  // Variantes de Animação para cada elemento do Logo ABZ

  // 1. Arco Azul (#0EA5E9) - Topo/Esquerda
  const blueArcVariants = {
    idle: {
      rotate: [0, 360],
      scale: [1, 1.05, 1],
      transition: { rotate: { duration: 14, repeat: Infinity, ease: 'linear' }, scale: { duration: 3, repeat: Infinity } }
    },
    listening: {
      scale: [1, 1.3, 1.1, 1.25],
      rotate: [0, 90, 180, 270, 360],
      transition: { duration: 1.2, repeat: Infinity, ease: 'easeInOut' }
    },
    speaking: {
      scale: [0.9, 1.2, 0.95, 1.15],
      strokeWidth: [3.5, 5, 3.5],
      transition: { duration: 0.6, repeat: Infinity, ease: 'easeInOut' }
    },
    executing: {
      rotate: [0, 720],
      scale: 1.1,
      transition: { duration: 1, repeat: Infinity, ease: 'linear' }
    }
  };

  // 2. Arco Verde (#22C55E) - Base Esquerda
  const greenArcVariants = {
    idle: {
      scale: [1, 1.12, 1],
      y: [0, -1, 0],
      transition: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' }
    },
    listening: {
      scale: [1.1, 1.4, 1],
      x: [-1, 2, -1],
      transition: { duration: 0.8, repeat: Infinity, ease: 'easeInOut' }
    },
    speaking: {
      scale: [1, 1.35, 0.9],
      transition: { duration: 0.5, repeat: Infinity, ease: 'easeInOut' }
    },
    executing: {
      rotate: [360, 0],
      scale: [1, 1.2, 1],
      transition: { rotate: { duration: 1.5, repeat: Infinity, ease: 'linear' }, scale: { duration: 0.5, repeat: Infinity } }
    }
  };

  // 3. Arco Amarelo/Laranja (#F59E0B) - Direita
  const yellowArcVariants = {
    idle: {
      rotate: [360, 0],
      scale: [1, 1.08, 1],
      transition: { rotate: { duration: 18, repeat: Infinity, ease: 'linear' }, scale: { duration: 4, repeat: Infinity } }
    },
    listening: {
      rotate: [-30, 30, -30],
      scale: [1, 1.3, 1],
      transition: { duration: 1, repeat: Infinity, ease: 'easeInOut' }
    },
    speaking: {
      scale: [1.2, 0.9, 1.3, 1],
      transition: { duration: 0.7, repeat: Infinity, ease: 'easeInOut' }
    },
    executing: {
      rotate: [0, -720],
      scale: 1.15,
      transition: { duration: 1, repeat: Infinity, ease: 'linear' }
    }
  };

  // 4. Núcleo Central / Círculo (#3B82F6)
  const coreNodeVariants = {
    idle: {
      scale: [1, 1.25, 1],
      opacity: [0.85, 1, 0.85],
      transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' }
    },
    listening: {
      scale: [1.2, 1.8, 1.2],
      fill: '#A855F7', // Purpura quando ouvindo
      transition: { duration: 0.6, repeat: Infinity, ease: 'easeInOut' }
    },
    speaking: {
      scale: [1, 2, 1.1, 1.7, 1],
      fill: '#3B82F6',
      transition: { duration: 0.4, repeat: Infinity, ease: 'easeInOut' }
    },
    executing: {
      scale: [1.3, 1.7, 1.3],
      fill: '#10B981', // Verde Esmeralda quando executando ações no portal
      transition: { duration: 0.5, repeat: Infinity, ease: 'easeInOut' }
    }
  };

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      {/* Halo de Brilho Dinâmico ao fundo */}
      <motion.div
        className="absolute inset-0 rounded-full blur-md opacity-40"
        animate={{
          backgroundColor:
            status === 'listening' ? '#A855F7' :
            status === 'speaking' ? '#3B82F6' :
            status === 'executing' ? '#10B981' : '#0EA5E9',
          scale: status === 'idle' ? [1, 1.15, 1] : [1.1, 1.4, 1.1]
        }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />

      {/* SVG do Logo ABZ com elementos independentes */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10 overflow-visible"
      >
        {/* Arco 1: Azul (#0EA5E9) */}
        <motion.path
          d="M16.5 7C13 7 10 9 9 12C8 15 9.5 19 12 21C14.5 23 18 23 21 21"
          stroke="#0EA5E9"
          strokeWidth="3.5"
          strokeLinecap="round"
          style={{ transformOrigin: '50% 47%' }}
          animate={status}
          variants={blueArcVariants}
        />

        {/* Arco 2: Verde (#22C55E) */}
        <motion.path
          d="M12 21C10 23 8 23 6 22"
          stroke="#22C55E"
          strokeWidth="3.5"
          strokeLinecap="round"
          style={{ transformOrigin: '50% 47%' }}
          animate={status}
          variants={greenArcVariants}
        />

        {/* Arco 3: Amarelo/Laranja (#F59E0B) */}
        <motion.path
          d="M21 10C24 10 26 12 26 15C26 18 24 20 21 21"
          stroke="#F59E0B"
          strokeWidth="3.5"
          strokeLinecap="round"
          style={{ transformOrigin: '50% 47%' }}
          animate={status}
          variants={yellowArcVariants}
        />

        {/* Núcleo Central (#3B82F6) */}
        <motion.circle
          cx="16"
          cy="15"
          r="3"
          fill="#3B82F6"
          style={{ transformOrigin: '50% 47%' }}
          animate={status}
          variants={coreNodeVariants}
        />
      </svg>
    </div>
  );
}
