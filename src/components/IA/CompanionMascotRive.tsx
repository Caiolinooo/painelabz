'use client';

import React, { Suspense, lazy, useEffect, useState } from 'react';
import type { AICompanionStatus } from './companion-logo-motion';
import CompanionMascotRiveLike from './CompanionMascotRiveLike';
import { MASCOT_VISEME_IDS } from './companion-mascot-frames';
import { probeCompanionRiveAsset } from './companion-mascot-rive-probe';

const CompanionMascotRivePlayer = lazy(() => import('./CompanionMascotRivePlayer'));

export interface CompanionMascotRiveProps {
  status: AICompanionStatus;
  size: number;
  reducedMotion?: boolean;
  className?: string;
  /** Optional TTS-driven viseme; omit for fake lip-sync. */
  visemeIndex?: number;
}

function useCompanionRiveAvailable(): boolean | null {
  const [available, setAvailable] = useState<boolean | null>(null);
  useEffect(() => {
    let cancelled = false;
    probeCompanionRiveAsset().then(ok => {
      if (!cancelled) setAvailable(ok);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return available;
}

/**
 * Companion mascot runtime gate:
 * - If `/rive/companion-mascot.riv` exists → lazy Rive player
 * - Else → CompanionMascotRiveLike (crossfade + face + visemes)
 */
export default function CompanionMascotRive({
  status,
  size,
  reducedMotion = false,
  className = '',
  visemeIndex: visemeIndexProp,
}: CompanionMascotRiveProps) {
  const riveAvailable = useCompanionRiveAvailable();
  const [riveFailed, setRiveFailed] = useState(false);
  const [fakeViseme, setFakeViseme] = useState(0);

  useEffect(() => {
    if (typeof visemeIndexProp === 'number') return;
    if (reducedMotion || status !== 'speaking') {
      setFakeViseme(0);
      return;
    }
    const id = window.setInterval(() => {
      setFakeViseme(i => (i + 1) % MASCOT_VISEME_IDS.length);
    }, 110);
    return () => window.clearInterval(id);
  }, [status, reducedMotion, visemeIndexProp]);

  const visemeIndex = typeof visemeIndexProp === 'number' ? visemeIndexProp : fakeViseme;
  const useRiveRuntime = riveAvailable === true && !riveFailed && !reducedMotion;

  if (useRiveRuntime) {
    return (
      <Suspense
        fallback={
          <CompanionMascotRiveLike
            status={status}
            size={size}
            reducedMotion={reducedMotion}
            className={className}
            visemeIndex={visemeIndex}
          />
        }
      >
        <CompanionMascotRivePlayer
          status={status}
          size={size}
          reducedMotion={reducedMotion}
          visemeIndex={visemeIndex}
          className={className}
          onLoadError={() => setRiveFailed(true)}
        />
      </Suspense>
    );
  }

  return (
    <CompanionMascotRiveLike
      status={status}
      size={size}
      reducedMotion={reducedMotion}
      className={className}
      visemeIndex={visemeIndex}
    />
  );
}
