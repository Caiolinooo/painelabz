'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import type { AICompanionStatus } from './companion-logo-motion';
import {
  MASCOT_BLINK,
  MASCOT_BODY,
  MASCOT_FACE_OVERLAY,
  MASCOT_LIP_SYNC_FPS,
  MASCOT_STATUS_CYCLES,
  MASCOT_VISEMES,
  type MascotBodyId,
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
    if (reducedMotion || cycle.face !== 'lipSync') {
      setVisemeIdx(0);
      return;
    }
    const ms = Math.max(60, Math.round(1000 / MASCOT_LIP_SYNC_FPS));
    const id = window.setInterval(() => {
      setVisemeIdx(i => (i + 1 + (Math.random() > 0.55 ? 1 : 0)) % MASCOT_VISEMES.length);
    }, ms);
    return () => window.clearInterval(id);
  }, [cycle.face, reducedMotion, visemeIndexProp]);

  useEffect(() => {
    if (reducedMotion || cycle.face !== 'blink') {
      setBlink(false);
      return;
    }
    let blinkOff: number | null = null;
    const schedule = (): number => {
      const wait =
        MASCOT_BLINK.idleMsMin +
        Math.random() * Math.max(1, MASCOT_BLINK.idleMsMax - MASCOT_BLINK.idleMsMin);
      return window.setTimeout(() => {
        setBlink(true);
        blinkOff = window.setTimeout(() => {
          setBlink(false);
          timer = schedule();
        }, MASCOT_BLINK.holdMs);
      }, wait);
    };
    let timer = schedule();
    return () => {
      window.clearTimeout(timer);
      if (blinkOff != null) window.clearTimeout(blinkOff);
    };
  }, [cycle.face, reducedMotion]);

  const showFace = !reducedMotion && cycle.face !== undefined;
  const faceSrc = (() => {
    if (cycle.face === 'blink') {
      return mascotFaceSrc(blink ? 'face_blink' : 'face_neutral');
    }
    if (cycle.face === 'lipSync') {
      return mascotFaceSrc(MASCOT_VISEMES[visemeIdx] ?? visemeIdAt(visemeIdx));
    }
    return mascotFaceSrc('face_neutral');
  })();

  const fadeMs = reducedMotion ? 0 : cycle.crossfadeMs;
  const faceLeft = Math.round(size * MASCOT_FACE_OVERLAY.x);
  const faceTop = Math.round(size * MASCOT_FACE_OVERLAY.y);
  const faceW = Math.max(1, Math.round(size * MASCOT_FACE_OVERLAY.w));
  const faceH = Math.max(1, Math.round(size * MASCOT_FACE_OVERLAY.h));

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
        <Image
          src={faceSrc}
          alt=""
          width={faceW}
          height={faceH}
          className="absolute select-none pointer-events-none object-fill"
          style={{
            left: faceLeft,
            top: faceTop,
            width: faceW,
            height: faceH,
            opacity: cycle.face === 'lipSync' ? 1 : blink ? 1 : 0.95,
            transition: `opacity ${Math.max(60, fadeMs / 2)}ms ease-out`,
          }}
          aria-hidden
          draggable={false}
          unoptimized
        />
      )}
    </div>
  );
}

function slotFromCycle(
  cycle: (typeof MASCOT_STATUS_CYCLES)[AICompanionStatus],
  idx: number
): LayerSlot {
  const frameId = cycle.frames[Math.min(idx, cycle.frames.length - 1)] ?? 'idle_stand';
  const safeId: MascotBodyId = frameId in MASCOT_BODY ? frameId : 'idle_stand';
  return {
    src: mascotFrameSrc(safeId),
    key: `${safeId}-${idx}`,
  };
}
