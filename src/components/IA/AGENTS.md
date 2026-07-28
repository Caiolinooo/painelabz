# Companion UI — DOX

## Purpose

Componentes React do Companion FAB / chat IA (`AnimatedABZLogo`, mascote, bolhas Markdown).

## Ownership

- `AnimatedABZLogo.tsx` — API pública (status / size / className / visemeIndex) → `CompanionMascotRive`
- `CompanionMascotRive.tsx` — gate Rive vs Rive-like
- `CompanionMascotRiveLike.tsx` — sprite SM (crossfade + face + visemes)
- `CompanionMascotRivePlayer.tsx` — runtime `@rive-app/react-canvas-lite` (lazy)
- `companion-mascot-frames.ts` — body/face maps, cycles, blink/visemes, Rive SM contract
- `companion-mascot-rive-probe.ts` — HEAD probe de `/rive/companion-mascot.riv`
- `companion-logo-motion.ts` — float/aura/radar por status
- `AICompanionWidget.tsx` — FAB + session UI (não alterar bus/session aqui)

## Local Contracts

- Status: `idle` | `listening` | `speaking` | `executing`
- Rive drop-in: `public/rive/companion-mascot.riv` — SM `CompanionSM`, inputs Number `status` (0–3) + `viseme` (0–3); ver `public/rive/README.md`
- Sem `.riv` → `CompanionMascotRiveLike`; load error → fallback
- Face overlay: `MASCOT_FACE_OVERLAY` + `face/*` (blink idle, lip-sync speaking)
- `prefers-reduced-motion` → sem Rive play / sem ciclos (frame estático)
- Não quebrar FAB (`fixed`), session provider ou `portal-action-bus`

## Work Guidance

- Preferir trocar PNGs / `.riv` a redesenhar o shell do FAB
- Fake lip-sync OK até TTS real passar `visemeIndex`
- Manter `@rive-app/react-canvas-lite` só no player lazy

## Verification

- Idle: crossfade + blink; speaking: boca/visemes; reduced-motion: estático
- FAB open/close + send message sem regressão de session/bus

## Child DOX Index

_(none)_
