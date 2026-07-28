# Companion mascot — Rive drop-in

```
public/rive/companion-mascot.riv
```

Served as `/rive/companion-mascot.riv`.

`AnimatedABZLogo` → `CompanionMascotRive` probes this path (HEAD, then ranged GET). When present, the app lazy-loads `@rive-app/react-canvas-lite`. If missing or load fails → **CompanionMascotRiveLike** (sprite fallback).

## Required state machine contract

| Item | Value |
|------|--------|
| State machine name | `CompanionSM` |
| Input `status` (Number) | `0` idle · `1` listening · `2` speaking · `3` executing |
| Input `viseme` (Number) | `0`–`3` mouth shapes while speaking (A/E/I/U) |

## Shipped spike (v5.56.0)

A real `.riv` is committed here, generated headlessly (no Rive Editor) with **`rive-mcp-server`** (`createRiv` / `riv_create` scene writer — npm package only; **do not vendor/redistribute that server source** into this repo).

| Detail | Value |
|--------|--------|
| Artboard | `Companion` 128×128 |
| Body solos | `idle_stand`, `listen_ear`, `speak_open`, `exec_bulb` |
| Face solos | `viseme_a/e/i/u` (overlay placement matches `MASCOT_FACE_OVERLAY`) |
| SM layers | `Status` + `Viseme` (number conditions on `any` → pose animations) |

### Regenerate

```bash
# one-time tool install (scratch only; not a product dependency)
cd scratch/rive-gen && npm install rive-mcp-server@0.4.1

# from repo root
node scratch/build-companion-mascot-riv.mjs
node scratch/validate-companion-mascot-riv.mjs   # needs Chrome/Edge; sets RIVE_MCP_CHROME if needed
```

License note: `rive-mcp-server` freeware allows unlimited use of **generated** `.riv` output; redistributing the MCP server itself is prohibited — keep it out of git.

## Designer / Editor path (optional upgrade)

1. Open or rebuild the artboard in the Rive Editor from `public/images/companion-mascot/`.
2. Keep SM **CompanionSM** + Number inputs `status` / `viseme`.
3. Export optimized `.riv` over this file.
4. Prefer richer flipbooks/bones; keep the same input contract so the React player stays unchanged.

## Notes

- Keep production `.riv` optimized (current spike ~126 KB with 8 embedded PNGs).
- `prefers-reduced-motion` freezes on the sprite fallback (never autoplays Rive).
