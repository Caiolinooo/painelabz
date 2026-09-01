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

## Local Contracts

- Cargo / Empresa / Embarcação / Centro de Custo: `SearchableCreatableSelect` (busca + Adicionar). Create via POST `/api/gestao-tripulantes/{cargos|empresas|embarcacoes|centros-custo}` (`createGtLookupOption`). Filtros da matriz/Man Schedule: busca sem create (valores de nome, não UUID).
- Cards da Matriz: só `ativo=true` e CC ativo; docs vencidos do card e das badges = **primário por grupo** (`documento-historico.ts`), não irmãos obsoletos. Coluna Documentos mostra título/tipo do vigente vencido. Filtro **Docs Vencidos** abre `DocsAlertasPanel`.
- Abas do modal filtram com `documentoPertenceAba` (`certificado`→treinamentos, `laudo`→aso). Highlight `gt-doc-<id>`.
- **POB / Embarcados Agora**: só código de escala **exato `ON`** no dia civil de hoje (`embarque-status.ts`). `ON*`, `*`, STB, DBA, FI, OFF-C, TRE, FER, UTR, DHC não entram.
- **Pílula Status da Matriz / DP / ficha**: mesma célula de hoje. ON → Embarcado (verde); STB → StandBy (laranja); Folga/OFF/OFF-C/FI → Folga (azul); FER/AFAST → Afastado (vermelho). `GET /colaboradores` sobrescreve `status_embarque` com esse mapa (`escala_codigo_hoje`). Não usar só a coluna stale.
- Cards de KPI são botões: `?kpi=embarcados|disponiveis|docs_vencidos|colaboradores` filtra a lista (e Man Schedule para embarcados/STB). Clique de novo limpa.
- Man Schedule: checkbox `Visualizar por dia` (`gt-man-schedule-viewport-day`). Off = semana sáb–sex; on = um dia por coluna.
- Toolbar **Hoje / ‹ › / pill POB** (`ManScheduleTimelineNav`) compartilhada por `GTManScheduleTab` e `/department/man-schedule`. A pill interpola `{count}` (`manSchedule.todayPob`) via `interpolateTranslationParams`. Contagem = pessoas com `ON` exato no dia civil de **hoje** (`countPobOnCivilDay` / `embarque-status.ts`), independente da coluna visível. **Hoje** leva a coluna de hoje à vista (viewport dia = aquele dia; semana = sáb–sex que contém hoje). Setas andam **uma coluna**. O scroll usa `[data-man-schedule-col]` no scrollport existente — não alterar overflow/sticky só para os botões.
- **Scroll da grade (global)**: wrapper `overflow-auto` + `min-h-0` (`[data-testid=man-schedule-scroll]`). Coluna **NOME** (e QTD/CARGO) `position: sticky; left: …` com fundo opaco; `thead` `sticky top-0`. Tabela `border-separate border-spacing-0` — `border-collapse` quebra sticky no Chrome. Mesmo modelo na aba GT e em `/department/man-schedule`. Classes em `man-schedule-grid-classes.ts`. Hoje/setas rolam **esse** wrapper (uma coluna via `[data-man-schedule-col]`), sem pixel offset fixo.
- Save de evento escreve linha em `allSchedules` (`rotation_start`/`end`). Novo lançamento prevalece sobre STB/ON antigo no mesmo período. `QTD. EMBARC` = pessoas no cargo (não é quantidade de embarques).
- Aba **Documentos** do modal: `gt_documentos` locais agrupados por tipo (`documento-historico.ts` + `HistoricoColapsavel`, default fechado). Sem dump de “outros módulos”.
- Aba **QHSE / EPI** (`QhseTab`): só se o viewer `hasAccess('epi')` (mesmo módulo do `/epi`). Lista ficha AN-HSE-005, entregas e listas de presença QHSE via catálogo (`onlyQhse`). Não altera Treinamentos/CBSP.
- Aba **ASO Logística** na página GT: fila `solicitado` para logística aprovar/reprovar com `useSignature` (sem segundo SignatureModal). API: ADMIN/MANAGER **ou** USER cujo setor é logística-like e tem `gestao-tripulantes`. Aprovação marca o ASO; reprovação exige motivo.
- **Fechamento de escalas / Envio DP**: admin `WorkflowFechamentoTab` busca **usuários do portal + colaboradores GT** com e-mail (`listarCandidatosAprovadores` + `SearchableCreatableSelect`). Digitar nome/e-mail filtra. Adicionar/remover e o **Salvar do topo** da página admin gravam `PUT /relatorio-mensal/config` (não o PUT geral). O PUT `/configuracoes` **não** pode sobrescrever `gt_fechamento_mensal_config`. Lista nominada = exatamente essas pessoas assinam, **independente do role**. Lista vazia = um ADMIN/MANAGER conclui. `ModalAprovacaoFechamento` **sempre** `await requestSignature()`.
- Aba **Treinamentos** / **Passaportes**: mesmo agrupamento. Primário = último certificado válido/permanente; irmãos = Histórico (Obsoleto) com download. Badges do resumo usam só o primário.
- **Filtro Data Início / Data Fim** (`GTManScheduleTab` e `/department/man-schedule`): `ScheduleDateFilterInput` commita só `YYYY-MM-DD` completo com ano 1990–2100 (ou vazio). Chrome `0002-01-01` / `0020-01-01` / `0202-01-01` ao digitar o ano **não** recalcula a grade. Cap: 400 colunas/dia, 2000 semanas (segurança). Matriz/vencimentos/dashboard não têm filtro de período.

## Work Guidance

- Não voltar `<select>` nativo nesses quatro campos de cadastro.
- Não gravar escala no MIO.
- Não ligar `onChange` de `type="date"` direto em `setFilterDate*` da grade.
- Não usar `border-collapse` na tabela da escala (quebra sticky de nomes/semanas).

## Verification

- Editar Dados Pessoais: digitar cargo inexistente → Adicionar → POST 201 → campo fica com o novo id.
- Cards da Matriz < total de linhas se existirem inativos.
- KPI 1 vencido: card/filtro lista o documento; linha abre ficha; aba correta mostra o card (incl. certificado/CNH/laudo).
- Clique em "Embarcados Agora" filtra a lista ao mesmo conjunto do card (ON hoje, sem *). Quem está na lista com ON hoje mostra pílula **Embarcado** (não Folga stale).
- Admin Fechamento: dropdown lista usuários ativos (USER incluso), não só ADMIN/MANAGER. USER na lista consegue assinar; ADMIN fora da lista toma 403. `npx tsx --test src/lib/gestao-tripulantes/fechamento-assinatura.test.ts`.
- GT aba ASO Logística lista solicitações do DP; aprovar com assinatura → status Marcado; reprovar mostra motivo no DP. USER do setor Logística com módulo GT passa no POST aprovar; USER de outro setor com o mesmo módulo toma 403.
- Man Schedule: checkbox liga colunas diárias; desliga volta semana. Badge `Hoje: NP a bordo` interpola `{count}` e usa a mesma regra POB (ON exato no dia civil de hoje). **Hoje** e as setas têm `onClick` e navegam por uma coluna (dia ou semana sáb–sex). `npx tsx --test src/i18n/interpolate.test.ts src/lib/gestao-tripulantes/embarque-status.test.ts src/lib/gestao-tripulantes/man-schedule-nav.test.ts`.
- Man Schedule: scroll horizontal/vertical no wrapper da grade; nomes (`man-schedule-sticky-name`) permanecem visíveis; cabeçalho de semanas fica no topo.
- Após Salvar ON, as células do período e a coluna ON atualizam sem recarregar a página.
- Digitar o ano em Data Início (`2`, `20`, `202`) não congela a UI; a grade só muda com data completa ou picker.
- Treinamentos: CBSP válido + CBSP vencido/declaração → uma linha primária, Histórico colapsado, resumo sem “1 vencido” falso.
- Card `total_docs_vencidos` da Matriz não sobe por declaração/certificado antigo se o primário do grupo está válido.

## Child DOX Index

- `src/lib/document-catalog/AGENTS.md` — catálogo global; aba QHSE / EPI do modal (módulo `epi`)
