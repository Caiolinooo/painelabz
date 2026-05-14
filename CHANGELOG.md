# Changelog

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
