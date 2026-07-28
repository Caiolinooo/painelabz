# Companion UI — DOX

## Purpose

Componentes React do Companion FAB / chat IA (`AnimatedABZLogo`, mascote, bolhas Markdown).

## Ownership

- `AnimatedABZLogo.tsx` — API pública (status / size / className / visemeIndex); float/aura + prefetch; delega ao runtime
- `CompanionMascotRive.tsx` — gate Rive vs Rive-like
- `CompanionMascotRiveLike.tsx` — sprite SM Fase 0 (crossfade + face blink/visemes)
- `CompanionMascotRivePlayer.tsx` — runtime `@rive-app/react-canvas-lite` (lazy)
- `companion-mascot-frames.ts` — body/face maps, cycles, blink/visemes, faceOverlay, Rive SM contract
- `companion-mascot-rive-probe.ts` — HEAD probe de `/rive/companion-mascot.riv`
- `companion-logo-motion.ts` — float/aura/radar por status
- `AICompanionWidget.tsx` — FAB + session UI (não alterar bus/session aqui)

## Local Contracts

- Status: `idle` | `listening` | `speaking` | `executing`
- Fase 0 assets: `public/images/companion-mascot/body|face/` + `frames.json`
- Idle → blink aleatório; speaking → ciclo `MASCOT_VISEMES` / `MASCOT_VISEME_IDS`
- Rive drop-in: `public/rive/companion-mascot.riv` — SM `CompanionSM`, inputs Number `status` (0–3) + `viseme` (0–3)
- Sem `.riv` → `CompanionMascotRiveLike`; load error → fallback
- `prefers-reduced-motion` → estático
- Tamanhos FAB 60 / header 36 / hero 80
- Não quebrar FAB `fixed`, session provider ou `portal-action-bus`

## Work Guidance

- Preferir trocar PNGs / retunes em `companion-mascot-frames.ts` a redesenhar o shell do FAB
- Tweak visemes: `MASCOT_VISEMES` + `MASCOT_LIP_SYNC_FPS` + `MASCOT_FACE_OVERLAY`
- Re-bake face overlays: `python scratch/build_face_overlays.py`
- Manter `@rive-app/react-canvas-lite` só no player lazy

## Verification

- Idle: poses + blink; speaking: boca/visemes; reduced-motion: estático
- FAB open/close + send message sem regressão de session/bus

## Child DOX Index

_(none)_
