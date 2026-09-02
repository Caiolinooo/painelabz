# Gestão de Tripulantes UI — DOX

## Purpose

Componentes da Matriz, modal do colaborador e Man Schedule. Lookups profissionais compartilhados e viewport da escala.

## Ownership

- `src/components/gestao-tripulantes/`
- Lookups: `SearchableCreatableSelect.tsx`, `createGtLookupOption.ts`
- KPIs: consomem `GET /api/gestao-tripulantes/dashboard` (`dashboard-service.ts`)
- Filtro de data da escala: `ScheduleDateFilterInput.tsx` + `src/lib/gestao-tripulantes/filter-date.ts`
- ASO logistics inbox: `AsoAgendamentoInbox.tsx` (aba GT **ASO Logística**)
- ASO DP panel: `AsoAgendamentoDpPanel.tsx`
- Admin ASO config: `admin/AsoAgendamentoConfigTab.tsx`
- Grade da escala: `man-schedule-grid-classes.ts` (scroll + sticky) usado por `GTManScheduleTab` e `/department/man-schedule`
- Viewport das páginas GT-family: `GtPageShell.tsx` (`/department/gestao-tripulantes`, `/department/man-schedule`, `/department/dp`, `/department/e-social`)
- Modal do colaborador: `collaborator-modal-layout.ts` (viewport + tablist + table scrollports) usado por `CollaboratorModal` e todas as abas

## Local Contracts

- Cargo / Empresa / Embarcação / Centro de Custo: `SearchableCreatableSelect` (busca + Adicionar). Create via POST `/api/gestao-tripulantes/{cargos|empresas|embarcacoes|centros-custo}` (`createGtLookupOption`). Filtros da matriz/Man Schedule: busca sem create (valores de nome, não UUID).
- **Regime de trabalho** (`DadosPessoaisTab`): opções `sem_escala` / `administrativo` / `onshore` + NxN. Não defaultar 14x14. Sem rotação grava dias 0; a grade Man Schedule não inventa ON. Token vazio + `escala_* = 0` lê como `sem_escala` (`inferRegimeUi`).
- Cards da Matriz: só `ativo=true` e CC ativo; docs vencidos do card e das badges = **primário por grupo** (`documento-historico.ts`), não irmãos obsoletos. Coluna Documentos mostra título/tipo do vigente vencido. Filtro **Docs Vencidos** abre `DocsAlertasPanel`.
- Abas do modal (contrato): Dados Pessoais = cadastro RH (sem docs ASO/EPI); Ficha unificada = Employee Hub; Treinamentos = certificados/cursos; **ASO** = único lugar de exames ocupacionais/laudo (upload, S-2220, agendamento DP); Passaportes = viagem (não ocultar por cargo); Documentos = só `gt_documentos` agrupados; **QHSE / EPI** = ficha AN-HSE-005 + EPI + listas QHSE, **nunca ASO**; **Desligamento** = rescisão (`gt_desligamentos`) — botão no header para quem `pode_registrar`, histórico readonly se já desligado. Filtro `documentoPertenceAba` (`certificado`→treinamentos, `aso`/`laudo`→aso). Highlight `gt-doc-<id>`.
- Desligamento: `DesligamentoModal` (z-60 sobre o CollaboratorModal). POST fail-soft na folha; após sucesso atualiza `ativo=false` no estado local e chama `onUpdated?` (opcional — DP/GT não precisam mudar a page).
- **POB / Embarcados Agora**: só código de escala **exato `ON`** no dia civil de hoje (`embarque-status.ts`). `ON*`, `*`, STB, DBA, FI, OFF-C, TRE, FER, UTR, DHC não entram.
- **Pílula Status da Matriz / DP / ficha**: mesma célula de hoje. ON → Embarcado (verde); STB → StandBy (laranja); Folga/OFF/OFF-C/FI → Folga (azul); FER/AFAST → Afastado (vermelho). `GET /colaboradores` sobrescreve `status_embarque` com esse mapa (`escala_codigo_hoje`). Não usar só a coluna stale.
- Cards de KPI são botões: `?kpi=embarcados|disponiveis|docs_vencidos|colaboradores` filtra a lista (e Man Schedule para embarcados/STB). Clique de novo limpa.
- Man Schedule: checkbox `Visualizar por dia` (`gt-man-schedule-viewport-day`). Off = semana sáb–sex; on = um dia por coluna.
- Toolbar **Hoje / ‹ › coluna / mês de referência / pill POB** (`ManScheduleTimelineNav`) compartilhada por `GTManScheduleTab` e `/department/man-schedule`. **Mês de referência** (default = mês civil atual; `localStorage` `gt-man-schedule-reference-month`): a grade cobre o mês inteiro (1º–último dia + snap sábado), mesmo sem rotações — permite planejar o futuro. Setas do label (`‹ Setembro 2026 ›`) mudam o mês; distintas das setas que andam **uma coluna**. **Hoje** restaura o mês atual e rola até a coluna de hoje (viewport dia = aquele dia; semana = sáb–sex que contém hoje). Destaque amarelo só quando essa coluna existe na grade (sem nearest-fallback). A pill interpola `{count}` (`manSchedule.todayPob`) via `interpolateTranslationParams`. Contagem = `countPobOnCivilDay` no dia civil de **hoje**, **independente do mês de referência visível**. Colunas via `buildScheduleColumns` (`man-schedule-reference-month.ts`). `/department/man-schedule` amplia `?janela=` (`realtimeJanelaForReferenceMonth`) se o mês sair da janela 90d; aba GT permanece `janela=all`. O scroll usa `[data-man-schedule-col]` no scrollport existente — não alterar overflow/sticky só para os botões.
- **Scroll da grade (global)**: wrapper `overflow-auto` + `min-h-0` (`[data-testid=man-schedule-scroll]`). Coluna **NOME** (e QTD/CARGO) `position: sticky; left: …` com fundo opaco; `thead` `sticky top-0`. Tabela `border-separate border-spacing-0` — `border-collapse` quebra sticky no Chrome. Mesmo modelo na aba GT e em `/department/man-schedule`. Classes em `man-schedule-grid-classes.ts`. Hoje/setas rolam **esse** wrapper (uma coluna via `[data-man-schedule-col]`), sem pixel offset fixo. A **página** em volta usa `GtPageShell` (`flush` em `/department/man-schedule`); não alterar overflow/sticky da grade só para caber o viewport.
- **Viewport das páginas GT-family**: `GtPageShell` — coluna flex `flex-1 min-h-0` que preenche o `<main>` do MainLayout (`h-dvh` + `flex flex-col`). Header/abas/filtros/toolbar `shrink-0`. Tabela/lista/grade `flex-1 min-h-0 overflow-auto` (`GT_PAGE_SCROLLPORT_CLASS`). Sem `h-[calc(100vh-6.5rem)]` nem scroll duplo página+tabela quando evitável. Man Schedule usa `flush` (cancela o padding do `<main>`); o scrollport da grade continua `man-schedule-grid-classes.ts`.
- **CollaboratorModal viewport**: painel `h-[min(96dvh,calc(100dvh-padding))]` em coluna flex (`collaborator-modal-layout.ts`). Overlay sem scroll. Header + tablist `shrink-0` (ficam visíveis). Body `[data-testid=collaborator-modal-body]` `flex-1 min-h-0 overflow-auto`. Tablist: wrap abaixo de `lg`; `lg+` nowrap com overflow-x, scrollbar nativo oculto e fade (`data-overflow-left/right`). Setas Home/End no `role="tablist"`. Todas as abas usam `COLLABORATOR_MODAL_TAB_FILL_CLASS` + `COLLABORATOR_MODAL_TABLE_SCROLL_CLASS` (`overflow-auto` + `flex-1` + `min-h-[8rem]`) — a lista/formulário rola no espaço restante. Sem `min-w-max` no tablist e sem `border-collapse` nas tabelas da ficha.
- Save de evento escreve linha em `allSchedules` (`rotation_start`/`end`). Novo lançamento prevalece sobre STB/ON antigo no mesmo período. `QTD. EMBARC` = pessoas no cargo (não é quantidade de embarques).
- Aba **Ficha unificada**: card **Usuário do portal** lê `portalUser` do hub (nome + e-mail + role). Sem match → "sem vínculo". Join em `src/lib/employee-hub/` (`tax_id` + e-mail, nunca coluna `cpf`).
- Aba **Documentos** do modal: `gt_documentos` locais agrupados por tipo (`documento-historico.ts` + `HistoricoColapsavel`, default fechado). Sem dump de “outros módulos”. Sem QHSE.
- Aba **QHSE / EPI** (`QhseTab`): só se o viewer `hasAccess('epi')` (mesmo módulo do `/epi`). Lista ficha AN-HSE-005, entregas EPI e listas de presença QHSE via catálogo (`onlyQhse`). **Nunca ASO/laudo** — exames ocupacionais ficam na aba ASO. `qhseRelated` é false para `tipo_documento` aso/laudo; `isQhseCatalogDocument` / `?qhse=1` excluem aso mesmo se a fonte marcar `category: 'qhse'`. Não altera Treinamentos/CBSP. Não ocultar Passaportes por cargo.
- Aba **ASO Logística** na página GT: fila `solicitado` para logística aprovar/reprovar com `useSignature` (sem segundo SignatureModal). API: ADMIN/MANAGER **ou** USER cujo setor é logística-like e tem `gestao-tripulantes`. Aprovação marca o ASO; reprovação exige motivo.
- **Fechamento de escalas / Envio DP**: admin `WorkflowFechamentoTab` busca **usuários do portal + colaboradores GT** com e-mail (`listarCandidatosAprovadores` + `SearchableCreatableSelect`). Digitar nome/e-mail filtra. Adicionar/remover e o **Salvar do topo** da página admin gravam `PUT /relatorio-mensal/config` (não o PUT geral). O PUT `/configuracoes` **não** pode sobrescrever `gt_fechamento_mensal_config`. Lista nominada = exatamente essas pessoas assinam, **independente do role**. Lista vazia = um ADMIN/MANAGER conclui. `ModalAprovacaoFechamento` **sempre** `await requestSignature()`. Ator do modal: `useSupabaseAuth` (`profile` + `user` → id, email, role, first_name, last_name). **Nunca** `useAuth` / `@/contexts/AuthContext` — `ClientProviders` só tem `SupabaseAuthProvider` (não ressuscitar `AuthProvider` legado).
- Aba **Treinamentos** / **Passaportes**: mesmo agrupamento. Primário = último certificado válido/permanente; irmãos = Histórico (Obsoleto) com download. Badges do resumo usam só o primário.
- **Editar/Excluir itens do cadastro** (Treinamentos, ASO, Documentos, Passaportes): todas as quatro abas usam `useGtDocumentPermissions()` (`use-gt-document-permissions.ts`) para exibir/ocultar os botões `FiEdit2`/`FiTrash2`. `DocumentosTab` ganhou edição inline (título/nº/órgão/datas); `TreinamentosTab`/`PassaportesTab` ganharam exclusão; `ASOTab` ganhou modal de edição (tipo de exame, resultado, datas, médico, clínica) + exclusão, bloqueados quando o ASO já foi `enviado`/`processado` no e-Social. Servidor: mesmo gate em `PUT`/`DELETE /api/gestao-tripulantes/documentos/[id]` — ver `src/app/api/gestao-tripulantes/AGENTS.md`.
- **Filtro Data Início / Data Fim** (`GTManScheduleTab` e `/department/man-schedule`): `ScheduleDateFilterInput` commita só `YYYY-MM-DD` completo com ano 1990–2100 (ou vazio). Chrome `0002-01-01` / `0020-01-01` / `0202-01-01` ao digitar o ano **não** recalcula a grade. Cap: 400 colunas/dia, 2000 semanas (segurança). Matriz/vencimentos/dashboard não têm filtro de período.

## Work Guidance

- Não voltar `<select>` nativo nesses quatro campos de cadastro.
- Não gravar escala no MIO.
- Não ligar `onChange` de `type="date"` direto em `setFilterDate*` da grade.
- Não usar `border-collapse` na tabela da escala (quebra sticky de nomes/semanas).
- Não restaurar `overflow-x-auto` + `min-w-max` no tablist do CollaboratorModal (scrollbar nativo gigante no Windows). Overlay do modal sem `overflow-y-auto`.
- Não usar alturas mágicas (`calc(100vh-6.5rem)`) nas páginas GT-family — `GtPageShell` + flex `min-h-0` / `overflow-auto`.
- Não mudar overflow/sticky em `man-schedule-grid-classes.ts` só para o chrome da página.

## Verification

- Editar Dados Pessoais: digitar cargo inexistente → Adicionar → POST 201 → campo fica com o novo id. Selecionar **Sem escala** → Salvar → reload ainda mostra Sem escala (não 14x14).
- Cards da Matriz < total de linhas se existirem inativos.
- KPI 1 vencido: card/filtro lista o documento; linha abre ficha; aba correta mostra o card (incl. certificado/CNH/laudo). ASO abre a aba ASO, não QHSE.
- Modal GT com módulo `epi`: aba **QHSE / EPI** lista ficha AN-HSE-005 e listas QHSE e **não** lista ASO/laudo.
- Clique em "Embarcados Agora" filtra a lista ao mesmo conjunto do card (ON hoje, sem *). Quem está na lista com ON hoje mostra pílula **Embarcado** (não Folga stale).
- Admin Fechamento: dropdown lista usuários ativos (USER incluso), não só ADMIN/MANAGER. USER na lista consegue assinar; ADMIN fora da lista toma 403. `npx tsx --test src/lib/gestao-tripulantes/fechamento-assinatura.test.ts`.
- GT aba ASO Logística lista solicitações do DP; aprovar com assinatura → status Marcado; reprovar mostra motivo no DP. USER do setor Logística com módulo GT passa no POST aprovar; USER de outro setor com o mesmo módulo toma 403.
- Man Schedule: checkbox liga colunas diárias; desliga volta semana. Badge `Hoje: NP a bordo` interpola `{count}` e usa a mesma regra POB (ON exato no dia civil de hoje), mesmo com mês de referência futuro. **Hoje** volta ao mês atual e à coluna de hoje; setas de coluna andam uma coluna; setas do mês mudam o mês de referência e geram colunas mesmo sem rotações. `npx tsx --test src/i18n/interpolate.test.ts src/lib/gestao-tripulantes/embarque-status.test.ts src/lib/gestao-tripulantes/man-schedule-nav.test.ts`.
- Man Schedule: scroll horizontal/vertical no wrapper da grade; nomes (`man-schedule-sticky-name`) permanecem visíveis; cabeçalho de semanas fica no topo.
- Matriz GT / aba ASO Logística / `/department/man-schedule`: o documento não rola; filtros ficam visíveis; a lista/grade rola no pane restante (`[data-testid=gt-page-shell]`).
- CollaboratorModal: painel ~96dvh; header+abas visíveis; tablist sem barra nativa grossa (`[data-testid=collaborator-modal-tablist]`); cada aba rola a lista/formulário no espaço restante.
- Ficha unificada: card **Usuário do portal** (`[data-testid=ficha-portal-user]`) mostra nome + e-mail + role quando o hub resolve `users_unified` por `user_id` / `tax_id` / e-mail; sem match → "sem vínculo".
- Após Salvar ON, as células do período e a coluna ON atualizam sem recarregar a página.
- Digitar o ano em Data Início (`2`, `20`, `202`) não congela a UI; a grade só muda com data completa ou picker.
- Treinamentos: CBSP válido + CBSP vencido/declaração → uma linha primária, Histórico colapsado, resumo sem “1 vencido” falso.
- Card `total_docs_vencidos` da Matriz não sobe por declaração/certificado antigo se o primário do grupo está válido.
- USER sem a feature `gestao-tripulantes.documents.edit`/`.delete` não vê os botões de editar/excluir em Treinamentos/ASO/Documentos/Passaportes; ADMIN/MANAGER sempre veem (bypass em `hasFeature`). Ligar a feature em `/admin/users` (checkbox "Gestão de Tripulantes — Cadastro do Colaborador") faz o botão aparecer e o `PUT`/`DELETE` correspondente passar.
- ASO com e-Social `enviado`/`processado`: cartão mostra "Já enviado ao e-Social — não editável" em vez dos botões Editar/Excluir.
- CollaboratorModal: USER ADMIN/MANAGER (ou DP com módulo GT) vê **Desligar**; após confirmar, `ativo=false` no estado local e a aba Desligamento mostra o histórico. Já desligado não abre o wizard de novo.

## Child DOX Index

- `src/lib/document-catalog/AGENTS.md` — catálogo global; aba QHSE / EPI do modal (módulo `epi`); QHSE nunca lista ASO
