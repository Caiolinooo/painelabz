# Companion mascot — Rive drop-in

Place a Rive artboard here to replace the sprite state machine at runtime:

```
public/rive/companion-mascot.riv
```

Served as `/rive/companion-mascot.riv`.

## Required state machine contract

| Item | Value |
|------|--------|
| State machine name | `CompanionSM` |
| Input `status` (Number) | `0` idle · `1` listening · `2` speaking · `3` executing |
| Input `viseme` (Number) | `0`–`3` mouth shapes while speaking (A/E/I/U) |

## Designer steps (Rive Editor)

1. Create artboard from the blue-book mascot (export layers from `public/images/companion-mascot/`).
2. Add state machine **CompanionSM** with transitions on `status`.
3. On speaking state, drive mouth blends from `viseme`.
4. Export `.riv` → save as `companion-mascot.riv` in this folder.
5. Deploy — `AnimatedABZLogo` auto-detects the file (HEAD probe) and lazy-loads `@rive-app/react-canvas-lite`.
6. If the file is missing or fails to load, the app keeps **CompanionMascotRiveLike** (crossfade + face + fake lip-sync).

## Notes

- Do not commit huge WIP exports; keep production `.riv` optimized.
- `prefers-reduced-motion` always freezes on the sprite fallback static frame (never autoplays Rive).
