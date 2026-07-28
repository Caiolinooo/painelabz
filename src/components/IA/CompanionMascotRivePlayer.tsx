'use client';

import React, { useEffect } from 'react';
import { useRive, useStateMachineInput } from '@rive-app/react-canvas-lite';
import type { AICompanionStatus } from './companion-logo-motion';
import {
  COMPANION_RIVE_SM,
  COMPANION_RIVE_SRC,
  STATUS_TO_RIVE_INDEX,
} from './companion-mascot-frames';

export interface CompanionMascotRivePlayerProps {
  status: AICompanionStatus;
  size: number;
  reducedMotion?: boolean;
  visemeIndex?: number;
  className?: string;
  onLoadError?: () => void;
}

/**
 * Real Rive runtime for companion-mascot.riv.
 * State machine inputs: status (0–3), viseme (0–3).
 * Lazy-imported only when the .riv asset is present.
 */
export default function CompanionMascotRivePlayer({
  status,
  size,
  reducedMotion = false,
  visemeIndex = 0,
  className = '',
  onLoadError,
}: CompanionMascotRivePlayerProps) {
  const { rive, RiveComponent } = useRive({
    src: COMPANION_RIVE_SRC,
    stateMachines: COMPANION_RIVE_SM.stateMachine,
    autoplay: !reducedMotion,
    onLoadError: () => {
      onLoadError?.();
    },
  });

  const statusInput = useStateMachineInput(
    rive,
    COMPANION_RIVE_SM.stateMachine,
    COMPANION_RIVE_SM.statusInput
  );
  const visemeInput = useStateMachineInput(
    rive,
    COMPANION_RIVE_SM.stateMachine,
    COMPANION_RIVE_SM.visemeInput
  );

  useEffect(() => {
    if (!statusInput) return;
    statusInput.value = STATUS_TO_RIVE_INDEX[status];
  }, [status, statusInput]);

  useEffect(() => {
    if (!visemeInput) return;
    visemeInput.value = ((visemeIndex % 4) + 4) % 4;
  }, [visemeIndex, visemeInput]);

  useEffect(() => {
    if (!rive) return;
    if (reducedMotion) {
      rive.pause();
    } else {
      rive.play();
    }
  }, [rive, reducedMotion]);

  return (
    <div
      className={className}
      style={{ width: size, height: size }}
      data-mascot-runtime="rive"
      data-mascot-status={status}
    >
      <RiveComponent style={{ width: size, height: size }} />
    </div>
  );
}
