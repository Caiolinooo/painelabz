# Changelog

## [5.22.0] - 2026-05-28

### Changed
- **OCR PDF Pipeline Complete Rewrite**: `ocrPdfDigitalizado()` now uses a 3-strategy cascade for maximum compatibility across environments:
  1. **pdf-parse with custom render**: Primary strategy using `pdf-parse/lib/pdf-parse.js` with a custom `pagerender` function that captures all text items with Y-coordinate-aware line breaking. Serverless-safe, no worker dependency.
  2. **pdfjs-dist + canvas**: Fallback for local/Node environments only. Checks `pdf.worker.mjs` existence before importing pdfjs-dist. Includes binarization (threshold=128) for improved OCR accuracy on scanned pages.
  3. **Tesseract.js direct**: Last-resort fallback processes the raw PDF buffer through Tesseract when both pdf-parse and pdfjs-dist fail.
- **Next.js Server Configuration**: Removed `outputFileTracingIncludes` for pdfjs-dist. Added `pdf-parse` to `serverComponentsExternalPackages`. Added webpack externals for `canvas` and `pdfjs-dist` on server side to prevent bundling issues.

## [5.21.2] - 2026-05-28

### Changed
- **Next.js Output File Tracing**: Added `outputFileTracingIncludes` for `pdfjs-dist` build files in `next.config.js`. Ensures PDF.js worker (`pdf.worker.mjs`) is properly bundled for serverless/Vercel deployments.
- **OCR PDF Worker Configuration**: Removed manual `GlobalWorkerOptions.workerSrc` setup in `ocr-processor.ts`. PDF.js now resolves its fake worker internally, relying on Next.js output tracing to include the correct files.

## [5.21.1] - 2026-05-28

### Changed
- **OCR LLM Prompt Refinement**: Enhanced ASO extraction prompt with 9 business rules. Added "Empresa x Clinica" rule to prevent contractor company (ABZ/aguas) from being misidentified as the clinic. CNPJ field marked as optional. Medical examiner vs PCMSO coordinator distinction clarified.
- **Next.js Server External Packages**: Added `pdfjs-dist` and `canvas` to `serverComponentsExternalPackages` alongside existing `tesseract.js` for proper server-side rendering of PDF and image processing modules.

## [5.21.0] - 2026-05-28

### Added
- **Authentication Hardening for Leave APIs**: All vacation/leave API endpoints now require JWT token authentication via `Authorization: Bearer` header. Endpoints validate caller identity and ACL permissions before processing requests. Affected routes: `leave-approvals`, `leave-requests`, `leave-settings`, `ferias/admin-access`, `leave/requests`.
- **`checkAclPermission()` Function**: New centralized ACL permission checker in `src/lib/auth.ts`. Queries PostgreSQL with JOINs across `acl_permissions`, `user_acl_permissions`, and `role_acl_permissions` tables. Supports both individual (with expiration) and role-based permissions. Admins always return `true`.
- **Global Leave Access**: `leaveService.ts` now accepts `hasGlobalAccess` parameter. When `true`, admins/managers see all pending requests across all sectors without sector-specific configuration. Self-approval protection remains enforced.
- **ACL → `ferias_admin` Mapping**: Effective permissions endpoint now auto-grants `ferias_admin = true` to ADMIN users and maps ACL `ferias:admin/manage` permissions to the `ferias_admin` module.
- **IA Feedback Module**: New feedback tools system for the AI assistant — `buscar_feedbacks`, `atualizar_status_feedback`, `excluir_feedback` (ADMIN only). Module registered in IA config manager with 💬 icon. Context builder injects pending feedback count for admin users.
- **IA Contract/Attendance Tools**: New tools `obter_link_contracheque` (external WK Radar WebNet link), `buscar_contratos` (contract documents with role-based filtering), `buscar_ponto` (employee attendance records), `buscar_lista_presenca` (available attendance lists).
- **OCR LLM Extraction**: `ocr-processor.ts` now supports intelligent ASO data extraction via LLM (DeepSeek/Qwen). Sends raw OCR text with structured prompt, parses JSON response, and merges with regex results (LLM takes priority). Handles thinking blocks and markdown formatting.
- **3 New IA Module Configs**: `feedback`, `contratos`, and `lista-presenca` modules added to default IA configuration with appropriate read/write role assignments.

### Changed
- **OCR Processor Priority**: In `gestao-tripulantes/ocr-processor.ts`, LLM-extracted data now takes priority over regex extraction for exam type, result, date, physician data, clinic name, and exam list. Regex serves as fallback only.
- **Auth Context Resilience**: `SupabaseAuthContext.tsx` now implements 5-layer try/catch fallback pattern for profile queries. If `sectors` table join fails, falls back to plain `select('*')`. Prevents authentication failures due to missing tables or RLS issues. `sessionStorage.clear()` added on logout.
- **UserEditor ACL Persistence**: ACL permission changes are now batched and persisted on form submit instead of per-click. Reduces database calls from N (one per toggle) to 1 (on save). Includes diff-based add/remove logic.
- **IA Context Builder**: Enhanced with feedback data injection for admins, updated tool usage instructions for contracts, attendance, and paystub access. Simplified pendencias instructions to use `buscar_dados_usuario` with "resumo" type.
- **Leave Requests API**: Now validates JWT token, checks ADMIN role or ACL `ferias:admin/manage` permission for listing/deleting all requests.
- **Leave Settings API**: Now requires ADMIN role for reading/modifying vacation settings.
- **Leave Approvals API**: Validates that the caller is the actual approver (not just any admin) and checks ACL permissions.

### Fixed
- **`requireModule` Corrections**: Fixed wrong module names in IA tools — `reembolsos` → `reembolso`, `avaliacoes_desempenho` → `avaliacao`, `suprimentos` → `compras` (3 tools).
- **OCR RG/CPF False Positive**: `ocr-processor.ts` now cleans both RG and CPF (removes dots, spaces, dashes) and checks if extracted RG is contained within CPF — discards false matches.
- **OCR Birth Date Extraction**: Now uses prefix-specific regex (`DN`, `NASC`, `NASCIMENTO`, etc.) first, then falls back to generic date regex with year < 2015 filter to prevent exam dates from being mistaken for birth dates.
- **PDF.js Worker Check**: Added `fs.existsSync(workerPath)` verification before configuring PDF.js worker. Uses fake worker fallback in serverless/Vercel environments.

### Removed
- **`analisar_kpis_negocio` Tool**: Removed from IA tools (feature toggle `kpi_analysis` removed).

## [5.19.0] - 2026-05-25

### Added
- **Enhanced Contract Signing Identity Validation**: New multi-factor identity verification layer for electronic signatures. Server-side validation now checks CPF format, email match, CPF match, and birth date match before allowing signature. Returns distinct error codes for each validation failure (EMAIL_MISMATCH, CPF_MISMATCH, BIRTH_DATE_MISMATCH).
- **Centralized Identity Utility (`src/lib/utils/identity.ts`)**: New shared identity helper library providing `normalizeCpf()`, `formatCpf()`, `isValidCpf()`, `maskCpf()`, `namesMatch()` (fuzzy name comparison), `formatBirthDate()`, and `birthDatesMatch()` for consistent identity handling across frontend and backend.
- **Signer Identity Fields in Database**: Added `birth_date` to `users_unified`, `external_signer_tax_id` and `external_signer_birth_date` to `solicitacoes_assinatura` with proper indexes for strong identity verification.
- **Enhanced Signature Auth Page**: 6-layer frontend validation (required fields, CPF format, email match, CPF match, birth date match, fuzzy name match) with per-field error styling and progressive validation feedback.
- **Pending Fields Blocker**: Signature page now blocks submission until all text/checkbox fields are filled, with warning banner listing unfilled fields and direct links.
- **Profile Page Identity Fields**: New CPF (auto-masked) and birth date fields on the profile page for self-registration of identity data used in electronic signatures.
- **Contract Detail Signer Identity**: Added CPF (auto-formatting) and birth date inputs for external signer assignment with identity reinforcement.

### Changed
- **Contract Assign API**: Now accepts `external_signer_tax_id` and `external_signer_birth_date`, normalizes CPF and email before storage.
- **Contract Sign API**: Extended audit metadata to store `assinante_data_nascimento` alongside CPF.
- **Sign Access Token API**: Response now includes `target_birth_date` for frontend validation.

### Fixed
- **News Post Editor**: Protected against downgrading published posts to draft status — published posts can no longer be accidentally reverted to draft.

## [5.18.0] - 2026-05-25

### Added
- **E-Social Compliance Module**: Complete integration with Brazilian government's e-Social system for digital transmission of labor, tax, and social security obligations.
  - **Event Management**: Full CRUD for e-Social events (S-2200, S-2205, S-2206, S-2210, S-2220, S-2230, S-2240, S-2298, S-2299, S-2300, S-2399, S-2400, S-3000).
  - **XML Generation**: Automatic XML generation for supported events with proper headers, namespaces, and event IDs following official e-Social layouts (v1.3).
  - **Digital Signing**: Enveloped XML digital signing using `xml-crypto` with RSA-SHA256 algorithm and X509 certificates.
  - **SOAP Web Service Integration**: Mutual TLS communication with e-Social production/homologation environments using PFX digital certificates.
  - **Certificate Management**: Upload, activate/deactivate, and manage A1/A3 digital certificates with AES-256-CBC encrypted password storage in Supabase.
  - **Event Lifecycle**: Complete status flow (draft → pending review → approved/rejected → queued → sending → sent → processed/error/returned).
  - **Review Workflow**: Approval/rejection queue with detailed error processing.
  - **Dashboard**: Summary metrics with real-time event counts by status.
  - **Configuration**: Environment selection (homologation/production), web service URLs, timeout settings, and autonomy controls.
  - **ASO Import Pipeline**: Multi-step import with PDF upload, OCR extraction, data review, and S-2220 event generation.
  - **Official Tables**: Import and lookup of Tabela 27 (medical exam codes) and Tabela 50 (CBO occupation codes) from CSV.
  - **Risk Factors**: Seeded database of 22 occupational risk factors for S-2240 events.
  - **Auto-Generation Service**: Automatic S-2200 and S-2240 event generation when collaborators are registered, with MIO enrichment.

- **Global OCR Module**: New document processing pipeline for text extraction and structured field parsing.
  - **Multi-format Support**: PDF (digital and scanned via Tesseract.js), DOCX, XLSX, TXT/CSV, and images (PNG/JPG/WebP/GIF).
  - **Field Extraction**: Intelligent extraction of CPF, RG, name, birth date, CTPS, CNH, PIS/PASEP, address, CEP by document type.
  - **ASO-specific Extraction**: Type of exam, result (apto/inapto/apto_condicional), exam date, physician data (name, CRM, UF), clinic data (CNPJ, name), and complementary exam codes.
  - **Configurable Pipeline**: Quality settings, language selection (default: Portuguese), and external fallback API support.

- **New Dependencies**: `node-forge` (certificate crypto), `tesseract.js` (OCR engine), `xml-crypto` (XML signing).

### Changed
- **Admin Layout**: Added E-Social and Gestão de Tripulantes entries to admin menu navigation.
- **Cards API**: Added icon mappings for `gestao-tripulantes` (FiUsers) and `e-social` (FiBriefcase).

### Database
- **e-Social Tables**: `esocial_eventos_catalogo`, `esocial_eventos`, `esocial_certificados`, `esocial_configuracoes`, `esocial_envios_log`, `esocial_fatores_risco`, `esocial_tabela_27`, `esocial_tabela_50` with RLS policies.
- **OCR Config**: `settings` table seeded with global OCR configuration.
- **Storage Bucket**: `esocial-certificados` for encrypted PFX certificate storage.

## [5.17.0] - 2026-05-25

### Added
- **Gestão de Tripulantes Module (Crew Management)**: Complete offshore crew management system with comprehensive data model and workflows.
  - **Collaborator Management**: Full CRUD with 7-tab registration form (Personal Data, Documents, Address, Contact, Banking, Employment Bond, e-Social).
  - **Employee Matrix**: Interactive table (`GTMatrix`) with filters (company, vessel, position, cost center, status, standby, expiring documents), color-coded status badges, and real-time search.
  - **Document Management**: Upload, OCR, and validation for 14 document types (ASO, training, passport, CNH, birth/marriage certificates, CTPS, etc.) with automatic validity calculation and expiry notifications.
  - **ASO Pipeline**: Import ASO documents via PDF upload + OCR → data review → e-Social S-2220 event generation.
  - **Embarkation History**: Complete timeline with vessel, type (normal/substitution/double rotation/standby/training), dates, flights, and statistics.
  - **Back-Substitution Algorithm**: Intelligent replacement suggestion system with 8 weighted criteria (30pts cost center, 20pts company, 15pts vessel, 10pts position, 35pts standby, etc.).
  - **Dashboard**: Real-time metrics (total collaborators, onboard, available, expiring documents).
  - **MIO Bidirectional Sync**: Full integration with MIO ERP — import collaborators, training records, embarkations; export manually created collaborators; auto-link by CPF.
  - **PoliWeb Scraper**: Automated ASO import from PoliWeb occupational clinic system with deduplication and e-Social event generation.
  - **Notifications**: Automated expiry warnings (configurable days in advance), embarkation alerts, and substitution notifications via in-app, email, and push channels.
  - **Admin Configuration**: 8-tab admin panel (General, MIO Integration, PoliWeb, Notifications, OCR, Back Algorithm, Autonomy, Dashboard).
  - **Permission System**: 8 granular features (view, manage, admin, documents.edit, documents.ocr, back.suggest, poliweb.scrape, notifications.manage).

### Database
- **Crew Management Tables**: 13 tables with `gt_` prefix — `gt_centros_custo`, `gt_empresas`, `gt_embarcacoes`, `gt_cargos`, `gt_colaboradores` (50+ columns), `gt_documentos`, `gt_documentos_aso`, `gt_documentos_treinamento`, `gt_historico_embarques`, `gt_historico_substituicoes`, `gt_notificacoes_log`, `gt_cron_log`, `gt_configuracoes`.
- **Views**: `gt_vw_colaboradores_completo` (with JOINs to all related tables + subqueries for document counts), `gt_vw_dashboard_resumo` (aggregated metrics).
- **Storage Bucket**: `gestao-tripulantes-documentos` for document file storage.
- **Additional Columns**: 50+ cadastro fields added to `gt_colaboradores` (RG, CTPS, CNH, PIS/PASEP, voter registration, certificates, salary, contract type, shift patterns).
- **PCMSO Fields**: Medical coordinator and UF columns added to `gt_documentos_aso`.

### API
- **18 REST Endpoints**: Health check, CRUD for cargos/centros_custo/empresas/embarcacoes/colaboradores, documents (upload/CRUD/OCR/e-Social), dashboard, configurations, PoliWeb integration, back suggestion algorithm, notifications, and cron jobs.

## [5.16.0] - 2026-05-25

### Added
- **MIO Cache System**: Unified caching layer that replaces direct MIO API calls with a Supabase-backed cache, polled every 15 seconds for real-time data availability.
  - **Cache Architecture**: `mio_cache` Supabase table with 4 data rows (`integrantes`, `treinamentos`, `embarques`, `lgp_reports`) + `__meta__` row for sync tracking.
  - **Update Endpoint (`POST /api/mio/cache/atualizar`)**: Fetches all MIO data in parallel (4 simultaneous requests), respects 10-second rate limit, requires ADMIN/MANAGER auth.
  - **Read Endpoint (`GET /api/mio/cache`)**: Serves cached data by tipo(s), supports role-based filtering (ADMIN full, USER filtered by CPF), single or multi-tipo response.
  - **Frontend Hook (`useMIOData`)**: React hook with 15s polling interval using SWR pattern for reactive data consumption.
  - **Module Integration**: Man Schedule route (`/api/man-schedule/realtime`) migrated from direct MIO calls to cache reads; `revalidate` reduced from 60s to 10s.
  - **RLS Policies**: SELECT allowed for all roles; INSERT/UPDATE/DELETE restricted to service_role only.

- **MIO Client Enhancements**:
  - Added generic `post()` and `put()` HTTP methods for full REST support.
  - `getTreinamentos()` completely rewritten with full Portuguese-to-English field mapping (34 fields).
  - `getEmbarques()` enhanced with rich field mapping (20+ fields: RT{P,E} status, flight info, cost centers, project numbers).
  - New `getAllTreinamentos()` and `getAllEmbarques()` methods for bulk cache sync.
  - New `MIOEmbarque` and `MIOASO` TypeScript interfaces with comprehensive field definitions.

- **MIO Sync Rewrite (`src/lib/mio/sync.ts`)**: Complete employee provisioning pipeline.
  - Creates Supabase Auth users and `users_unified` records for MIO employees not in the database.
  - Auto-creates default permissions for 9 modules (dashboard, manual, procedimentos, politicas, calendario, noticias, reembolso, contracheque, ponto).
  - Logs access history with REGISTERED action and protocol tracking.
  - Sends email verification links for users with valid email addresses.
  - Deduplication logic prevents duplicate user creation.
  - Active/inactive status synced from MIO `situacao` field.

### Changed
- **MIO Types**: `MIOTreinamento` expanded from 8 to 34 fields; new `MIOEmbarque` (20+ fields) and `MIOASO` interfaces added.
- **Man Schedule**: Now reads from `mio_cache` instead of direct MIO API calls; faster refresh (10s revalidate).

## [5.15.0] - 2026-05-25

### Added
- **New Dependencies**:
  - `node-forge` (^1.4.0) — Certificate cryptography and PFX/P12 decoding for E-Social digital signatures.
  - `tesseract.js` (^7.0.0) — OCR engine for document text recognition (ASOs, passports, certificates).
  - `xml-crypto` (^6.1.2) — XML digital signing for E-Social event transmission.
  - `@types/node-forge` (^1.3.14) and `@types/xml-crypto` (^1.4.6) for TypeScript support.

- **ACL Hierarchical System Extension**: Enhanced permission system with new module support for Gestão de Tripulantes and E-Social.
  - **8 Gestão de Tripulantes Permissions**: `view`, `manage`, `admin`, `documents.edit`, `documents.ocr`, `back.suggest`, `poliweb.scrape`, `notifications.manage`.
  - **5 E-Social Permissions**: `view`, `prepare`, `review`, `send`, `admin`.
  - **Role Defaults**: ADMIN gets all permissions for both modules; MANAGER gets selective GT permissions + esocial.view; USER gets none.
  - **Layer 4 ACL in Effective Permissions**: New permission layer reads from `user_acl_permissions` + `role_acl_permissions` tables, maps to `acl_permissions` resources, and enables modules accordingly. Graceful fallback if ACL tables don't exist.
  - **Reactive ACL Loading**: Auth context now loads ACL modules on mount, listens for `permissions-updated` window events, and re-fetches on profile updates.
  - **Permission Change Events**: `useACLPermissions` hook dispatches custom `permissions-updated` event after successful permission mutations.

- **i18n Localization**: Complete Portuguese and English translations for both new modules.
  - **`gestaoTripulantes` namespace**: ~233 entries covering all UI text (filters, table, legend, status, profile tabs, documents, OCR, embarkations, substitutions, back algorithm, notifications).
  - **`eSocial` namespace**: ~233 entries covering event management, review, certificates, configuration, and dashboard.
  - **Menu and module list entries**: `menu.gestaoTripulantes`, `modules.gestao-tripulantes`, `modules.e-social`.

- **Database Schema Extension**: Added `birth_date` column to `users_unified` table (DATE, nullable) with index for identity validation in electronic signatures.

### Changed
- **Next.js Configuration**: Added `serverComponentsExternalPackages: ['tesseract.js']` to enable native Node.js module loading for OCR in server components.
- **TypeScript Configuration**: Added `baseUrl: "."` for root-based imports complementing existing `@/` path aliases.
- **Permissions Type System**: `PermissionFeatures` interface extended with 13 new optional fields for both modules.
- **`PERMISSIONS` constant**: Added `GESTAO_TRIPULANTES` (8 keys) and `ESOCIAL` (5 keys) permission groups.
- **`PERMISSION_DESCRIPTIONS`**: 13 new Portuguese descriptions for permission tooltips and admin UI.
- **`DEFAULT_PERMISSIONS_BY_ROLE`**: Updated for all three roles (ADMIN, MANAGER, USER) with new module and feature entries.
- **Admin Layout Menu**: Added navigation entries for Gestão de Tripulantes (FiAnchor) and E-Social (FiSend) in the admin sidebar.
- **Cards API**: Added icon mappings for both new modules in dashboard card system.
- **Effective Permissions API**: Extended debug output with `_debug.acl` source info and `_debug.acl_modules_applied` array.
- **Auth Context**: `UserProfile` interface extended with `tax_id`, `bio`, `birth_date`, and `cover_url` fields.
- **package.json Scripts**: Added 6 new database setup scripts:
  - `db:setup-esocial` — Storage bucket creation for E-Social certificates
  - `db:seed-esocial-riscos` — Risk factors seeding
  - `db:setup-mio-cache` — MIO cache table setup
  - `db:cadastro-fields` — Cadastro migration for GT module
  - `db:setup-gestao-tripulantes` — Main GT module migration

### Infrastructure
- **Module Registration**: Both `gestao-tripulantes` and `e-social` registered in `src/config/modules.ts` and `src/constants/modules.ts` with proper roles and categories.
- **ACL Init**: ACL system seeded with all 13 new permissions for both modules.
- **Unified Data Hook**: Admin users now bypass sector restrictions in `useUnifiedData`.
- **Supabase Types**: `birth_date` field added to `users_unified` Row, Insert, and Update types.
- **Centralized Identity Utility**: New `src/lib/utils/identity.ts` for CPF normalization, formatting, validation, and masking — shared across frontend and backend for electronic signature identity verification.
- **CSS**: Global stylesheet updates for new UI components.
- **Gitignore**: Updated to exclude temporary and environment-specific files.

## [5.14.0] - 2026-05-20
- **ACL Hierarchical System Overhaul**: Refactored permission system with modular architecture. New `getFullPermissionsForRole()` consolidates module access across ADMIN, MANAGER, and USER roles. Permissions now split into `modules` (access flags) and `features` (fine-grained actions) for each role.
- **New Permission Categories**: Added granular permissions for `ferias` (read/create/approve/manage/admin), `lista-presenca` (read/create/manage/admin), and `contratos` (read/sign/manage) with full i18n descriptions.
- **Contracts Templates System**: Complete template management with CRUD API, role-based signer mapping, and template-to-envelope workflow. Templates support predefined roles (e.g., Colaborador, Gestor, RH) with auto-assignment.
- **Multi-Field Document Signing**: Contracts now support `texto` (text input), `checkbox` (boolean selection), `assinatura` (signature), and `rubrica` (initial) field types with visual position overlay. Batch signing processes all pending fields for a signer in a single transaction.
- **PDF Editor Service Enhancement**: New `embedFieldsAndSignaturesOnPdf()` service handles batch embedding of signatures, rubrics, text fields, and checkboxes across multiple pages in a single PDF pass.
- **Real IA Chat Streaming**: Migrated from simulated SSE streaming to real `chatCompletionStream` with recursive tool processing, dashboard metadata extraction, and content persistence.
- **New System Modules**: Added `ferias` (vacation management), `biblioteca` (document library), `ajuda` (help center), `compras` (purchase orders), `poliweb` (occupational clinic), `man-schedule` (offshore crew management), `chat` (internal communication), `wkradar` (legacy system access), `integracao-erp` (ERP integration), and `ia-assistant` modules with dedicated permissions.
- **Module Categories**: Extended module categorization with `department`, `core`, and `content` categories alongside existing `system`, `business`, and `hr`.
- **i18n Expansion**: Added 636+ new translation entries in `en-US.ts` and 314+ in `pt-BR.ts` covering all new modules, permissions, contracts workflows, and ACL management UI.
- **Signer Reuse**: Contract detail page now remembers the last used signer (internal or external), with toggle to reuse or reset between assignments.
- **Email Templates**: Added 61 new email template variations for contracts, vacations, and attendance list notifications.

### Changed
- **Permissions Data Model**: `DEFAULT_PERMISSIONS_BY_ROLE` restructured from flat `Record<string, boolean>` to nested `{ modules: Record<string, boolean>, features: Partial<PermissionFeatures> }` for cleaner separation of module access vs. feature-level permissions.
- **Available Modules API**: `GET /api/admin/available-modules` now sources from `SYSTEM_MODULES` config instead of hardcoded Supabase card fallback, ensuring single source of truth for module definitions.
- **Effective Permissions Endpoint**: Simplified to delegate role defaults to `getFullPermissionsForRole()` from `@/config/modules`, removing duplicated inline permission maps.
- **Signature Position Overlay**: Enhanced with dynamic tipo detection (auto-detects checkbox, rubric, text, or signature based on field dimensions/label). Updated visual status colors to amber/emerald/gray for pending/signed/rejected states.
- **Document Upload Modal**: Complete UI overhaul with tabbed interface (Envelope / Templates), template selector inside envelope creation, and dedicated template management section with role-based signer configuration.
- **Contracts Detail Page**: Added support for text/checkbox field input, collapsible signer groups, advanced signer search, and CC (carbon copy) email fields.
- **Poliweb Page**: Refactored to use per-tab state management (`tabStates`) instead of shared state, fixing credential save flow across multiple tabs.
- **Purchase Requests/Orders**: Enhanced approval workflow with improved error handling, stage tracking, and permission validation.
- **Voice Server Scripts**: Updated `agent.py` and `audio_server.py` with improved SSE handling, TTS parameter validation, and LiveKit SDK compatibility.

### Fixed
- **IA Chat Streaming**: Resolved issue where streaming used fake chunking of non-streaming API response; now properly uses `chatCompletionStream` for genuine SSE streaming with tool calls.
- **Effective Permissions**: Fixed missing modules in effective permissions by centralizing module definitions in `SYSTEM_MODULES`.
- **Signature Overlay Colors**: Updated visual feedback colors to improve accessibility and clarity of field status (pending, signed, rejected).
- **Contract Signing Flow**: Fixed batch signing to properly update all sibling fields for the same signer, including text/checkbox values alongside signature/rubric.
- **Poliweb Credential Persistence**: Resolved bug where credential updates in one tab would reset state in another tab.

## [5.13.0] - 2026-05-15

### Added
- **Infraestrutura de Voz Local (Cluster L4/Xeon)**: Estabilização do servidor de áudio local (Piper/Whisper) com suporte a streaming real-time compatível com o protocolo OpenAI.
- **Diagnóstico de Voz WebRTC**: Implementação de hooks de telemetria no `VoiceAssistantModal.tsx` para monitorar SID de participantes, estados de trilha de áudio e transições de estado do agente.

### Changed
- **Pipeline de Áudio PCM16**: Otimização do `audio_server.py` e `agent.py` para utilizar PCM raw de 24kHz. Isso reduz a latência de ponta a ponta ao eliminar a necessidade de decodificação MP3/AAC no agente LiveKit.
- **Orquestração LiveKit SDK v1.0**: Atualização do `agent.py` para suportar a arquitetura `AgentSession` (v1.0+) mantendo fallback para `VoicePipelineAgent` (v0.x), garantindo compatibilidade em diferentes ambientes de deploy.

### Fixed
- **Bug de Estol "Thinking"**: Resolvida a falha onde o agente permanecia em loop de pensamento devido ao mismatch entre o formato SSE (Server-Sent Events) esperado pelo plugin default e os raw bytes enviados pelo servidor local. Forçado uso de `model="tts-1"` para stream binário direto.
- **Validação de Parâmetros TTS**: Adicionado suporte aos campos `stream_format`, `speed` e `instructions` no `audio_server.py` para evitar erros de validação (422 Unprocessable Entity) disparados pelo plugin OpenAI.

## [5.12.0] - 2026-05-14

### Added
- **Agente de Voz em Tempo Real (LiveKit)**: Integração de canal WebRTC de alto desempenho para conversa em áudio em tempo real com a IA.
- **Resiliência de Canal**: Adicionado suporte ao estado `useConnectionState` no visualizador de voz, mantendo a interface viva e permitindo auto-recuperação suave de rede em vez de desmontar o modal.

### Changed
- **Identidades de Sessão Dinâmicas**: Tokens LiveKit agora geram identidades com sufixo randômico para eliminar colisões de ID ("reconnection loops") em múltiplos navegadores ou atualizações rápidas.
- **Restrição de Notificações de EPI**: Otimizada a consulta de envio de alertas de estoque baixo, direcionando os e-mails unicamente para os responsáveis cadastrados no painel administrativo (`epi_sector_responsibles`).

## [5.11.0] - 2026-05-14

### Added
- **Globalized Multi-Language Expansion (i18n)**: Full English/Portuguese translation coverage for essential modules including Contracts & Signatures, Attendance Lists, Reimbursement Dashboards, and structural UI components (`en-US.ts`, `pt-BR.ts`).
- **Advanced Date/Time Locality Framework**: Patched native JavaScript Date APIs in the `I18nContext` to override hardcoded locales, enforcing consistent time-zone and format alignments globally based on the user's language settings.
- **Self-Hosted High-Performance PDF.js Workers**: Configured secure offline/firewalled processing of multi-page PDF rendering via pre-compiled local workers (`public/workers/`), eliminating third-party CDN dependency and increasing signature view speed.
- **Netlify Dynamic URL Continuity Scripts**: Implemented continuous integration configuration utilities (`fix-netlify-env.bat/sh`) to automate runtime hostname injections and fix preview deployment URL issues.

### Changed
- **Contract Signatures Workflow**: Re-engineered signature verification envelopes, refined tracking telemetry, and improved visual representation badges for active contract workflows (`AuditInfoPanel.tsx`, `envelopeDispatcher.ts`).
- **Form and Dialog Polish**: Refined dynamic language selection UX, multi-language fallback behaviors, and consistent component layouts during language swapping transitions (`LanguageDialog.tsx`).

## [5.10.0] - 2026-05-13

### Added
- **SSH Connectivity for Local LLMs**: SSH management implementation for local LLM servers (`node-ssh`), including Start/Stop remote lifecycle controls.
- **Dynamic AI Dashboard Framework**: Split-view UI management that allows AI to render complex, interactive widgets (metrics, tables, lists) within the sidebar context.

### Changed
- **Contracts Module Access**: Enforced the `hasPermission` hierarchy recursively in both the sidebar visibility (`MainLayout.tsx`) and the page component route to restrict unauthorized access.
- **Sidebar CSS Overflows**: Fixed visual bug related to `max-h` CSS constraints clipping the "Meu RH" dropdown menu items in the sidebar.
- **Sidebar Notification Badges**: Removed hardcoded generic news badges; notifications now rely solely on module-specific metadata.
- **Email Templates**: Added dynamic variables for recipient name and company logo. Updated links to explicitly point to `portal.groupabz.com`.
- **System Version**: Bumped version uniformly across `package.json` and internal app config from 5.9.0 to 5.10.0.

### Fixed
- **API 404 Route Errors**: Fixed conflicts causing 404s in various API routes.
- **PDF Generation**: Restored functionality for downloading "Lista de Presença" PDFs, and formatted the document's Pauta/Subject field.

## [5.9.0] - 2026-05-08

### Added
- **Motor de Agente Autônomo para KPIs**: Nova arquitetura e ciclo contínuo de monitoração, análise e tomada de decisões periódicas (`src/lib/ia/autonomous-loop.ts`).
- **Orquestrador Avançado de IA**: Planejamento e cálculo de prioridades baseado em múltiplos fatores com etapas de ação e estimativa de impacto (`src/lib/ia/advanced-orchestrator.ts`).
- **Gerenciador de Contexto e Memória**: Nova tabela `ia_memory` para armazenamento de interações, detecção de padrões de uso e previsões comportamentais (`src/lib/ia/context-manager.ts`).
- **Hook de Controle KPI**: Hooks React para controle de ciclo de vida, eventos e presets dinâmicos (`src/hooks/useKPIAutonomous.ts` e `src/hooks/useAutonomousConfig.ts`).
- **Painel de Controle e Renderizador de Dashboard**: Interface completa com play/pause/stop, presets predefinidos e logs em tempo real (`src/components/KPI/AutonomousKPIRenderer.tsx` e `src/components/KPI/KPIAutonomousHeader.tsx`).
- **API de Controle Autônomo**: Endpoint para inicialização, controle e persistência de estado do agente (`src/app/api/ia/autonomous/control/route.ts`).

### Changed
- **Integração de KPIs de Dashboard**: Geração de relatórios e pendências com cache inteligente de dashboard de 15 minutos (`src/lib/ia/dashboard-service.ts` e `src/lib/ia/agent-service.ts`).
- **Estabilidade e Correções de Tipagem**: Ajustes de types na biblioteca IA e componentes React para garantir integridade e zero erros de build do Next.js (`src/lib/ia/client.ts`, `src/lib/ia/tools.ts`, `src/types/ia.ts`).

## [5.8.0] - 2026-05-04

### Fixed
- **Correção de Status de Férias**: Status usavam `pending/approved` (minúsculas), schema usa `PENDING_LEADER/APPROVED` (maiúsculas). Corrigido em:
  - `context-builder.ts`: Filtros ajustados para `PENDING_LEADER`, `PENDING_MANAGER`, `APPROVED`
  - `tools.ts`: Filtros de status corrigidos
  - `ferias.tools.ts`: Status ajustados para schema
  - `dashboard-service.ts`: Filtros corrigidos
- **Correção de Status de Reembolso**: Status usavam `PENDING/APPROVED` (maiúsculas), schema usa `pendente/aprovado` (minúsculas). Corrigido em:
  - `context-builder.ts`: Filtros ajustados para `pendente`, `aprovado`
  - `tools.ts`: Campos e filtros corrigidos
  - `reembolso.tools.ts`: Reescrito com normalização de status
  - `dashboard-service.ts`: KPIs corrigidos
  - `agent-service.ts`: Taxa de aprovação corrigida
- **Correção de Schema Reimbursement**: Campo `user_id` não existe no schema (tabela usa `email`). Corrigido para buscar usuário via email.
- **Correção de Campo**: Campo `valor_total` não existe (schema usa `valorTotal` em camelCase). Corrigido em todas as consultas.

### Changed
- **Modal de Férias Responsivo**: Modal de solicitação de férias agora é auto-adaptável:
  - Largura: `max-w-lg` (antes `max-w-md`)
  - Altura: `max-h-[90vh]` com scroll interno
  - Padding e botões responsivos
  - Acessível em qualquer resolução/zoom

## [5.7.0] - 2026-05-04

## [5.7.1] - 2026-05-04

### Added
- MVP de IA agentic com pendências por fonte (Teams, Emails, Calendar) e Knowledge como fonte adicional opcional.
- Endpoints MVP por fonte: /api/ia/pendencias/teams, /api/ia/pendencias/emails, /api/ia/pendencias/calendar, /api/ia/pendencias/knowledge (opcional).
- Endpoint consolidado: /api/ia/pendencias/overview para visão geral por fonte.
- Orquestrador skeleton para decisão de plano (em futuras iterações evolutivas).

### Changed
- Mantidas as alterações de MVP anteriores; inclusão de patches para suporte a pendências por fonte (agora com estrutura padronizada).

### Fixed
- Correções de rotas API para pendências com fallback seguro para cenários sem dados.

### Added
- **Agente IA Proativo**: Novo motor de automação (`agent-service.ts`) que executa tarefas agendadas e proativas.
- **Base de Conhecimento Corporativa**: Sistema de memória persistente (`ia_knowledge_base`) com injeção dinâmica de contexto baseada em cargo e departamento.
- **Dashboard de KPIs Modulares**: Nova interface `/kpi` para acompanhamento de metas em tempo real com suporte a múltiplos setores.
- **Centro de Comando Admin**: Novas interfaces para gestão de `Feature Toggles` e `Knowledge Base` no painel administrativo.
- **Integração Avançada MS Graph**:
  - Suporte a busca profunda de e-mails via OData filters (removido limite de 5 e-mails).
  - Criação de notas no OneNote e tarefas no Microsoft To Do.
  - Sincronização híbrida de calendário e documentos (SharePoint + Banco Local).
- **Exportação de Relatórios**: Geração automática de relatórios de performance em formatos PDF e XLSX (Excel).
- **Tool Toggles Globais**: Capacidade de ativar/desativar ferramentas da IA individualmente via banco de dados.

### Changed
- **src/lib/ia/tools.ts**: Expansão massiva do conjunto de ferramentas para suportar ações de escrita e automação.
- **src/lib/ia/context-builder.ts**: Injeção de instruções proativas e dados da base de conhecimento no prompt do sistema.
- **RLS Policies**: Endurecimento de segurança com políticas granulares para todas as novas tabelas de IA.

### Fixed
- Erros de cast de tipo (UUID vs Text) em queries complexas do Supabase.
- Limite restritivo de busca de e-mails que impedia visibilidade completa de conversas.
- Falhas de sincronização no dashboard de BI.

## [5.6.0] - 2026-04-28

### Added
- Enhanced IA system context memory (increased from 6000 to 25000 characters)
- Increased message history limit (from 16 to 30 messages)
- Real PDF generation capability for reports
- Real email sending capability with attachments
- Debug logging for IA context building
- Improved session management using React refs

### Changed
- **src/lib/ia/context-builder.ts**: 
  - Increased MAX_CONTEXT_TOKENS_ESTIMATE from 6000 to 25000
  - Increased MAX_HISTORY_MESSAGES from 16 to 30
  - Added debug logging for session context
  - Updated database table references (avaliacoes → avaliacoes_desempenho)
  - Fixed various text strings (accent removal for consistency)
  
- **src/components/IA/ChatWindow.tsx**:
  - Added useRef for activeSessionId to avoid React latency issues
  - Added useEffect to sync ref with state
  - Modified handleSend to use ref for session_id
  - Corrected session_id handling in streaming and non-streaming paths
  - Fixed activeSessionId updates when receiving new session IDs

- **src/lib/ia/tools.ts**:
  - Completely rewrote gerar_relatorio_pdf to generate real PDFs
  - Completely rewrote enviar_email_relatorio to send real emails
  - Added proper data fetching from database for report generation
  - Implemented actual PDF generation using existing pdf-generator utilities
  - Implemented actual email sending using nodemailer/SMTP
  - Added proper error handling and success responses
  - Added import for sendEmailWithNodemailer

- **src/lib/ia/email-tool.ts**:
  - Enhanced getTransporter() with debug logging
  - Added fallback values for development when env vars missing
  - Default to Office 365 SMTP configuration for development
  - Maintained compatibility with existing email sending logic

### Fixed
- IA system now properly maintains conversation history (30 messages vs previous limit)
- Session ID persistence between messages in the same conversation
- PDF generation now creates actual PDF files instead of simulating
- Email sending now actually sends emails instead of simulating
- React state update latency issues affecting session management
- Database query corrections for various data types

### Removed
- None
