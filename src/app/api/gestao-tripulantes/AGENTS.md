# Gestão de Tripulantes API — DOX

## Purpose

API routes for crew management (colaboradores, documentos, ASO, embarques, tipos de escala, PoliWeb, cron). Owns contracts for ASO identity, e-Social visibility, and Man Schedule local event types/colors.

## Ownership

- Routes under `src/app/api/gestao-tripulantes/`
- Related libs: `src/lib/gestao-tripulantes/*`, OCR in `src/lib/ocr/*` + `src/lib/gestao-tripulantes/ocr-processor.ts`
- Man Schedule realtime: `src/app/api/man-schedule/realtime/route.ts` (reads MIO cache + **local-only** GT overrides)
- UI consumers: `ASOTab`, `ImportarASOModal`, Collaborator modal, `GTManScheduleTab`, admin `/admin/gestao-tripulantes`

## Local Contracts

### ASO identity gate

- CPF normalize: digits-only via `@/lib/utils/identity` → `@/lib/gestao-tripulantes/cpf` (client-safe) + `cpf-lookup.ts` (server).
- OCR path (`extrairDadosASODoTexto`): **CPF-only** reassociation. Never silent name/`ilike` moves.
- If OCR CPF ≠ profile CPF: reassign to `gt_colaboradores` by CPF **or** quarantine (`gt_documentos.colaborador_id` + ASO `colaborador_id` = null, `esocial_status = quarentena`, `identity_match = quarantine`). When OCR cannot extract CPF, quarantine is set immediately to avoid wrong profile assignment.
- After `esocial_status` in `pendente|enviado|processado`: freeze identity (`identity_match = frozen`); do not reset status to `nao_enviado`.
- Persist `cpf_documento` + `identity_match` on `gt_documentos_aso`.
- Send (`POST .../documentos/[id]/esocial`): prefer OCR CPF; **block** if OCR CPF ≠ profile CPF.

### All e-Social Events ↔ Module Sync
- Generic sync service `esocial-sync.ts` mirrors e-Social event status changes back to originating entities:
  - **S-2200**: `gt_colaboradores.esocial_admissao_status`
  - **S-2205**: `gt_colaboradores.esocial_cadastro_status`
  - **S-2206**: `gt_colaboradores.esocial_contrato_status`
  - **S-2220**: `gt_documentos_aso.esocial_status`
  - **S-2230**: `gt_afastamentos.esocial_status`
  - **S-2210**: `gt_acidentes.esocial_status`
  - **S-2240**: `gt_colaboradores.esocial_risco_status`
  - **S-2299**: `gt_colaboradores.esocial_desligamento_status`

### Employee Record Hub (`/api/employee-hub`)
- Single point of truth for employee data, combining personal details, document counts, ASOs, embarques, e-Social event timeline, afastamentos, acidentes (CAT), and trainings.
- Endpoints: `GET /api/employee-hub/[id]`, `GET /api/employee-hub/[id]/timeline`, `GET /api/employee-hub/search`.

### Global ASO read

- `GET /api/gestao-tripulantes/aso?cpf=` → only `enviado|processado`.
- `algoritmo-back` prefers those ASOs for validity scoring; falls back to any dated `gt_documentos` per candidate without a global ASO.

### Man Schedule — tipos / cores / observações

- Table `gt_tipos_evento_escala`: `codigo`, `display_code`, `label`, `bg_color`, `text_color`, `ordem`, `ativo`, `is_system`, `maps_to_db_tipo`.
- Seed system codes: `normal`→ON, `fi`→FI, `dba`→DBA, `stb`→STB, `offc`→OFF-C.
- CRUD: `GET|POST /api/gestao-tripulantes/tipos-evento`, `PUT|DELETE /api/gestao-tripulantes/tipos-evento/[id]` (ADMIN/MANAGER for writes).
- Embarques locais: `POST /embarques`, `PUT|DELETE /embarques/[id]` — only `origem='local'`; soft-delete via `deleted_at`.
- Storage mapping (`escala-tipos.ts`): UI `offc` persists as `offc` (**never** collapse to `folga_indenizada` / `fi`). Legacy `folga_indenizada|dobra|standby` normalize on read to `fi|dba|stb`.
- `GET /api/man-schedule/realtime`: merge **only** `gt_historico_embarques.origem = 'local'`; return explicit `observacoes` + `tipo_codigo` / `rotation_type` (do not put obs into `embarque_status`); CPF joins via digits-only normalize.

### Schema notes

- Migration `20260723_000001_aso_identity_gate.sql`: `cpf_documento`, `identity_match`, expanded `esocial_status` CHECK.
- Migration `20260723_000002_gt_tipos_evento_escala.sql`: tipos table + relax `gt_historico_embarques.tipo` CHECK (allows `fi|dba|stb|offc` + custom).
- Optional SQL backfill of `gt_colaboradores.cpf` to digits-only (documented in root `tasks.md`); app lookups try digits + masked forms.

### Document integrity gate (ALL document types)

- Migration `20260825_000001_gt_documento_integrity.sql`: `gt_documentos.numero_rastreio` (unique, partial index), `arquivo_hash` (sha256), `identity_match` (doc-level mirror of ASO gate) + deterministic backfill of tracking numbers.
- **numero_rastreio = NÚMERO PRÓPRIO DO DOCUMENTO**: the number printed on the file itself — nº do ASO impresso no laudo, nº do passaporte, nº do certificado/treinamento. NEVER an invented internal code when the document has its own numbering.
  - OCR path: `ocr-processor.ts::extrairNumeroDocumentoDoTexto(texto, tipo)` extracts it (ASO nº / "Nº do exame|laudo", Passport No / "Nº do passaporte", Certificado/NR nº; CRM/RQE/CNPJ/CPF are never the doc number); `persistirNumeroProprioRastreio` saves it — overwrites ONLY a `GT-...` fallback or null, never an intrinsic/manual value, and checks uniqueness first. Wired into both `extrairDadosASODoTexto` (ASO) and `aplicarGateIdentidadeDocumento` (all types).
  - Fallback interno (`documento-integrity.ts::garantirNumeroRastreioUnico`, format `GT-<TIPO>-<cpf4>-<YYYY>-<suffix>`) is acceptable ONLY for documents that genuinely have no intrinsic numbering (e.g. metadata-only MIO rows).
  - Manual fix: auditoria POST action `corrigir_rastreio` (ADMIN-only; `{documento_id, numero_rastreio}`, uniqueness-checked) + inline "Editar rastreio" in `AuditoriaDocumentosTab`; fallback values render flagged as "(fallback)".
- **Hard validation on save** (upload route, `POST /colaboradores/[id]/documentos`, `PUT /documentos/[id]`, `documento-service`): `data_emissao` + `data_validade` required (422 otherwise). Quarantine (`quarentena=true` / `identity_match='quarantine'`) is the only exemption.
- **Anti-duplication** (`buscarDuplicado`): before insert, match by `arquivo_hash` → `arquivo_path` → `(colaborador, tipo, titulo, numero_documento)` **on the same colaborador**. Duplicate ⇒ UPDATE existing row (returns `merged: true`). Same hash on another colaborador ⇒ HTTP 409, never a foreign-row UPDATE.
- **Privileged APIs**: `GET|POST /export`, `GET /auditoria`, `GET /esocial-consistencia`, `GET /esocial-crossref`, `GET|POST /documentos/[id]/esocial` require ADMIN or MANAGER (`requireGtAdminOrManager`). `POST /auditoria` remains ADMIN-only. Do not log CPF or intrinsic document numbers in OCR traces.
- **Identity gate for all types** (`aplicarGateIdentidadeDocumento` in `ocr-processor.ts`, wired into `/documentos/[id]/ocr`): OCR CPF of ANY document type (passaporte, CNH, treinamento…) must match profile CPF; mismatch with no owning colaborador or no extractable CPF ⇒ quarantine (`colaborador_id=null`, `identity_match='quarantine'`). ASO path also mirrors its `gt_documentos_aso.identity_match` onto the doc row. Frozen identities never move.
- **Auditoria panel**: tab "Auditoria Documentos" in `/admin/gestao-tripulantes` + API `GET|POST /api/gestao-tripulantes/auditoria`. GET returns buckets: sem_emissao, sem_validade, sem_rastreio, duplicados (groups), quarentena, vencidos, vencendo. POST fix actions (ADMIN-only): `gerar_rastreio`, `corrigir_datas`, `resolver_quarentena` (blocks if OCR CPF ≠ target CPF), `mesclar_duplicados`.

## Work Guidance

- Filename/title is storage label only — never treat as identity.
- Profile ASO tab: separate disponíveis vs rascunhos; drafts badge “não enviado / rascunho”.
- Escala colors/labels: load from `tipos-evento` API — do not hardcode ON/FI/DBA/STB/OFF-C in the grade.
- Local scale edits must PUT when UUID exists; never create-always.
- Minimal impact on MIO read-only rows — never edit/delete `origem='mio'`.
- No secrets in code; use env / `app_secrets` patterns from root DOX.

## Verification

- Upload ASO with matching CPF → OCR `identity_match=match` → send e-Social allowed.
- Upload wrong-person PDF on profile → reassign or quarantine; never stays on wrong profile.
- Send S-2220 → `gt_documentos_aso.esocial_status=enviado`; consult PROCESSADO → `processado`.
- `GET /api/gestao-tripulantes/aso?cpf=` excludes `nao_enviado`/`pendente`.
- Create OFF-C local event → reload grade still shows OFF-C (not FI); observações appear on hover + icon.
- Admin tab Marcadores Escala: change color → grade/legend/export reflect new colors.
- PUT `/embarques/[id]` updates dates/tipo/obs without duplicating rows.

## Child DOX Index

_(none)_
