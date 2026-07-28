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
  MASCOT_BLINK,
  MASCOT_BODY,
  MASCOT_FACE_OVERLAY,
  MASCOT_LIP_SYNC_FPS,
  MASCOT_PREFETCH_SRC,
  MASCOT_STATUS_CYCLES,
  MASCOT_VISEMES,
  MascotBodyId,
  MascotFaceId,
  hasMascotFaceAssets,
  mascotFaceSrc,
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

function randomBlinkDelay(): number {
  const span = MASCOT_BLINK.idleMsMax - MASCOT_BLINK.idleMsMin;
  return MASCOT_BLINK.idleMsMin + Math.floor(Math.random() * Math.max(1, span));
}

/**
 * Companion FAB / panel mascot — blue-book body + face overlay (blink / fake lip-sync).
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
  const faceEnabled = hasMascotFaceAssets();

  const [frameIdx, setFrameIdx] = useState(0);
  const [visemeIdx, setVisemeIdx] = useState(0);
  const [blinking, setBlinking] = useState(false);

  useEffect(() => {
    setFrameIdx(0);
    setVisemeIdx(0);
    setBlinking(false);
  }, [status]);

  // Prefetch key PNGs once (body + face) to avoid flicker on status changes.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    for (const src of MASCOT_PREFETCH_SRC) {
      const img = new window.Image();
      img.decoding = 'async';
      img.src = src;
    }
  }, []);

  // Body pose cycle
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

  // Idle blink (random interval)
  useEffect(() => {
    if (shouldReduceMotion || !faceEnabled || cycle.face !== 'blink') {
      setBlinking(false);
      return;
    }
    let cancelled = false;
    let timeoutId = 0;
    let holdId = 0;

    const schedule = () => {
      timeoutId = window.setTimeout(() => {
        if (cancelled) return;
        setBlinking(true);
        holdId = window.setTimeout(() => {
          if (cancelled) return;
          setBlinking(false);
          schedule();
        }, MASCOT_BLINK.holdMs);
      }, randomBlinkDelay());
    };

    schedule();
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      window.clearTimeout(holdId);
    };
  }, [cycle.face, faceEnabled, shouldReduceMotion, status]);

  // Speaking fake lip-sync (viseme cycle)
  useEffect(() => {
    if (
      shouldReduceMotion ||
      !faceEnabled ||
      cycle.face !== 'lipSync' ||
      MASCOT_VISEMES.length === 0
    ) {
      return;
    }
    const ms = Math.max(60, Math.round(1000 / MASCOT_LIP_SYNC_FPS));
    const id = window.setInterval(() => {
      setVisemeIdx(i => (i + 1) % MASCOT_VISEMES.length);
    }, ms);
    return () => window.clearInterval(id);
  }, [cycle.face, faceEnabled, shouldReduceMotion, status]);

  const bodyId: MascotBodyId =
    cycle.frames[Math.min(frameIdx, cycle.frames.length - 1)] ?? 'idle_stand';
  const bodySrc = mascotFrameSrc(bodyId in MASCOT_BODY ? bodyId : 'idle_stand');

  let faceId: MascotFaceId | null = null;
  if (faceEnabled && !shouldReduceMotion) {
    switch (cycle.face) {
      case 'blink':
        faceId = blinking ? 'face_blink' : 'face_neutral';
        break;
      case 'lipSync':
        faceId = MASCOT_VISEMES[visemeIdx] ?? 'face_neutral';
        break;
      case 'neutral':
        faceId = 'face_neutral';
        break;
      default: {
        const _exhaustive: never = cycle.face;
        void _exhaustive;
        faceId = 'face_neutral';
      }
    }
  } else if (faceEnabled && shouldReduceMotion) {
    faceId = 'face_neutral';
  }

  const iconSize = Math.round(size * 0.92);
  const faceLeft = Math.round(iconSize * MASCOT_FACE_OVERLAY.x);
  const faceTop = Math.round(iconSize * MASCOT_FACE_OVERLAY.y);
  const faceW = Math.max(1, Math.round(iconSize * MASCOT_FACE_OVERLAY.w));
  const faceH = Math.max(1, Math.round(iconSize * MASCOT_FACE_OVERLAY.h));

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
        className="relative z-10 overflow-hidden"
        style={{ width: iconSize, height: iconSize }}
      >
        <Image
          src={bodySrc}
          alt="Companion ABZ"
          width={iconSize}
          height={iconSize}
          className="object-contain select-none pointer-events-none drop-shadow-md"
          style={{ background: 'transparent' }}
          priority
          draggable={false}
          unoptimized
        />
        {faceId && (
          <Image
            src={mascotFaceSrc(faceId)}
            alt=""
            width={faceW}
            height={faceH}
            className="absolute select-none pointer-events-none object-fill"
            style={{
              left: faceLeft,
              top: faceTop,
              width: faceW,
              height: faceH,
              background: 'transparent',
            }}
            aria-hidden
            draggable={false}
            unoptimized
          />
        )}
      </div>
    </motion.div>
  );
}
