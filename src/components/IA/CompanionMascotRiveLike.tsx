'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import type { AICompanionStatus } from './companion-logo-motion';
import {
  MASCOT_BODY,
  MASCOT_FACE_OVERLAY,
  MASCOT_STATUS_CYCLES,
  MASCOT_VISEME_IDS,
  mascotFaceSrc,
  mascotFrameSrc,
  visemeIdAt,
} from './companion-mascot-frames';

export interface CompanionMascotRiveLikeProps {
  status: AICompanionStatus;
  size: number;
  reducedMotion?: boolean;
  className?: string;
  /** Optional external viseme index (TTS); when omitted, fake lip-sync drives it. */
  visemeIndex?: number;
}

type LayerSlot = {
  src: string;
  key: string;
};

/**
 * High-quality sprite state machine (Rive-like):
 * smooth body crossfades, face layer, viseme driver for speaking.
 * Same visual contract as a future `.riv` artboard.
 */
export default function CompanionMascotRiveLike({
  status,
  size,
  reducedMotion = false,
  className = '',
  visemeIndex: visemeIndexProp,
}: CompanionMascotRiveLikeProps) {
  const cycle = MASCOT_STATUS_CYCLES[status];
  const [bodyIdx, setBodyIdx] = useState(0);
  const [visemeIdx, setVisemeIdx] = useState(0);
  const [blink, setBlink] = useState(false);
  const [front, setFront] = useState<LayerSlot>(() => slotFromCycle(cycle, 0));
  const [back, setBack] = useState<LayerSlot | null>(null);
  const [frontOpacity, setFrontOpacity] = useState(1);
  const crossfadeTimer = useRef<number | null>(null);
  const bodyIdxRef = useRef(0);
  const frontRef = useRef(front);
  frontRef.current = front;

  useEffect(() => {
    bodyIdxRef.current = 0;
    setBodyIdx(0);
    setVisemeIdx(0);
    setBlink(false);
    const initial = slotFromCycle(cycle, 0);
    setFront(initial);
    frontRef.current = initial;
    setBack(null);
    setFrontOpacity(1);
    if (crossfadeTimer.current != null) {
      window.clearTimeout(crossfadeTimer.current);
      crossfadeTimer.current = null;
    }
  }, [status, cycle]);

  useEffect(() => {
    if (reducedMotion || cycle.fps <= 0 || cycle.frames.length <= 1) {
      return;
    }
    const ms = Math.max(70, Math.round(1000 / cycle.fps));
    const id = window.setInterval(() => {
      const next = (bodyIdxRef.current + 1) % cycle.frames.length;
      bodyIdxRef.current = next;
      setBodyIdx(next);
      const nextSlot = slotFromCycle(cycle, next);
      setBack(frontRef.current);
      setFront(nextSlot);
      frontRef.current = nextSlot;
      setFrontOpacity(0);
      requestAnimationFrame(() => {
        setFrontOpacity(1);
      });
      if (crossfadeTimer.current != null) {
        window.clearTimeout(crossfadeTimer.current);
      }
      crossfadeTimer.current = window.setTimeout(() => {
        setBack(null);
        crossfadeTimer.current = null;
      }, cycle.crossfadeMs + 40);
    }, ms);
    return () => {
      window.clearInterval(id);
      if (crossfadeTimer.current != null) {
        window.clearTimeout(crossfadeTimer.current);
        crossfadeTimer.current = null;
      }
    };
  }, [cycle, reducedMotion, status]);

  useEffect(() => {
    if (typeof visemeIndexProp === 'number') {
      setVisemeIdx(visemeIndexProp);
      return;
    }
    if (reducedMotion || status !== 'speaking') {
      setVisemeIdx(0);
      return;
    }
    const id = window.setInterval(() => {
      setVisemeIdx(i => (i + 1 + (Math.random() > 0.55 ? 1 : 0)) % MASCOT_VISEME_IDS.length);
    }, 110);
    return () => window.clearInterval(id);
  }, [status, reducedMotion, visemeIndexProp]);

  useEffect(() => {
    if (reducedMotion || (status !== 'idle' && status !== 'listening')) {
      setBlink(false);
      return;
    }
    let blinkOff: number | null = null;
    const schedule = (): number => {
      const wait = 2200 + Math.random() * 2800;
      return window.setTimeout(() => {
        setBlink(true);
        blinkOff = window.setTimeout(() => {
          setBlink(false);
          timer = schedule();
        }, 120);
      }, wait);
    };
    let timer = schedule();
    return () => {
      window.clearTimeout(timer);
      if (blinkOff != null) window.clearTimeout(blinkOff);
    };
  }, [status, reducedMotion]);

  const showFace =
    !reducedMotion && (status === 'speaking' || blink || status === 'listening');

  const faceSrc = (() => {
    if (blink) return mascotFaceSrc('face_blink');
    if (status === 'speaking') return mascotFaceSrc(visemeIdAt(visemeIdx));
    return mascotFaceSrc('face_neutral');
  })();

  const fadeMs = reducedMotion ? 0 : cycle.crossfadeMs;

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ width: size, height: size }}
      data-mascot-runtime="rive-like"
      data-mascot-status={status}
      data-mascot-viseme={visemeIdx}
      data-mascot-body={cycle.frames[Math.min(bodyIdx, cycle.frames.length - 1)]}
    >
      {back && (
        <Image
          src={back.src}
          alt=""
          width={size}
          height={size}
          className="absolute inset-0 object-contain select-none pointer-events-none drop-shadow-md"
          style={{ opacity: 1, transition: `opacity ${fadeMs}ms ease-out` }}
          draggable={false}
          unoptimized
          aria-hidden
        />
      )}
      <Image
        key={front.key}
        src={front.src}
        alt="Companion ABZ"
        width={size}
        height={size}
        className="absolute inset-0 object-contain select-none pointer-events-none drop-shadow-md"
        style={{
          opacity: frontOpacity,
          transition: `opacity ${fadeMs}ms ease-out`,
        }}
        priority
        draggable={false}
        unoptimized
      />

      {showFace && (
        <div
          className="absolute pointer-events-none select-none"
          style={{
            left: MASCOT_FACE_OVERLAY.left,
            top: MASCOT_FACE_OVERLAY.top,
            width: MASCOT_FACE_OVERLAY.width,
            height: MASCOT_FACE_OVERLAY.height,
            opacity: status === 'speaking' ? 1 : blink ? 1 : 0.85,
            transition: `opacity ${Math.max(60, fadeMs / 2)}ms ease-out`,
          }}
          aria-hidden
        >
          <div className="relative w-full h-full">
            <Image
              src={faceSrc}
              alt=""
              fill
              className="object-contain"
              sizes={`${Math.round(size * 0.5)}px`}
              draggable={false}
              unoptimized
            />
          </div>
        </div>
      )}
    </div>
  );
}

function slotFromCycle(
  cycle: (typeof MASCOT_STATUS_CYCLES)[AICompanionStatus],
  idx: number
): LayerSlot {
  const frameId = cycle.frames[Math.min(idx, cycle.frames.length - 1)] ?? 'idle_stand';
  const safeId = (frameId in MASCOT_BODY ? frameId : 'idle_stand') as keyof typeof MASCOT_BODY;
  return {
    src: mascotFrameSrc(safeId),
    key: `${safeId}-${idx}`,
  };
}
