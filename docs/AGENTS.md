# docs/

## Purpose

Developer and operational documentation for Painel ABZ modules, APIs, and runbooks.

## Ownership

Engineering team. Module guides live alongside implementation docs in `docs/` and subfolders.

## Local Contracts

- Verify behavior against source code before documenting; do not fabricate APIs or defaults.
- Prefer updating existing docs over creating redundant pages.
- Module guides use Portuguese, structured for scanning (tables, endpoints, pitfalls).
- Release notes stay in `CHANGELOG.md` and `README.md`; module guides document stable contracts.

## Work Guidance

- New subsystem with weak docs → add or extend a guide under `docs/`.
- Cross-link from `docs/DEVELOPER_GUIDE.md` module table when adding a top-level guide.
- Include: architecture diagram or flow, env vars, API routes, key source files, troubleshooting.

## Verification

- Run existing test scripts referenced in module docs (e.g. `scripts/test-leave-advance-notice.ts`).

## Child DOX Index

| Path | Scope |
|------|-------|
| `docs/evaluation/` | Performance evaluation module |
| `docs/Implementacao/` | Large module implementation guides (e-Social, tripulantes) |
| `docs/VOICE_AGENT.md` | Voice agent pipeline |
| `docs/MODULO_FERIAS.md` | Leave/vacation module |
| `docs/REIMBURSEMENT_VALIDATION.md` | Reimbursement value validation |
| `docs/MODULO_EPI.md` | EPI stock and reports |
