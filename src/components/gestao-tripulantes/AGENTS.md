# Gestão de Tripulantes UI — DOX

## Purpose

Componentes da Matriz, modal do colaborador e Man Schedule. Lookups profissionais compartilhados e viewport da escala.

## Ownership

- `src/components/gestao-tripulantes/`
- Lookups: `SearchableCreatableSelect.tsx`, `createGtLookupOption.ts`
- KPIs: consomem `GET /api/gestao-tripulantes/dashboard` (`dashboard-service.ts`)
- Filtro de data da escala: `ScheduleDateFilterInput.tsx` + `src/lib/gestao-tripulantes/filter-date.ts`

## Local Contracts

- Cargo / Empresa / Embarcação / Centro de Custo: `SearchableCreatableSelect` (busca + Adicionar). Create via POST `/api/gestao-tripulantes/{cargos|empresas|embarcacoes|centros-custo}` (`createGtLookupOption`). Filtros da matriz/Man Schedule: busca sem create (valores de nome, não UUID).
- Cards da Matriz: só `ativo=true` e CC ativo; docs vencidos do card e das badges = **primário por grupo** (`documento-historico.ts`), não irmãos obsoletos. Coluna Documentos mostra título/tipo do vigente vencido. Filtro **Docs Vencidos** abre `DocsAlertasPanel`.
- Abas do modal filtram com `documentoPertenceAba` (`certificado`→treinamentos, `laudo`→aso). Highlight `gt-doc-<id>`.
- **POB / Embarcados Agora**: só código de escala **exato `ON`** no dia civil de hoje (`embarque-status.ts`). `ON*`, `*`, STB, DBA, FI, OFF-C, TRE, FER, UTR, DHC não entram.
- Cards de KPI são botões: `?kpi=embarcados|disponiveis|docs_vencidos|colaboradores` filtra a lista (e Man Schedule para embarcados/STB). Clique de novo limpa.
- Man Schedule: checkbox `Visualizar por dia` (`gt-man-schedule-viewport-day`). Off = semana sáb–sex; on = um dia por coluna.
- Save de evento escreve linha em `allSchedules` (`rotation_start`/`end`). Novo lançamento prevalece sobre STB/ON antigo no mesmo período. `QTD. EMBARC` = pessoas no cargo (não é quantidade de embarques).
- Aba **Documentos** do modal: `gt_documentos` locais agrupados por tipo (`documento-historico.ts` + `HistoricoColapsavel`, default fechado). Sem dump de “outros módulos”.
- Aba **QHSE / EPI** (`QhseTab`): só se o viewer `hasAccess('epi')` (mesmo módulo do `/epi`). Lista ficha AN-HSE-005, entregas e listas de presença QHSE via catálogo (`onlyQhse`). Não altera Treinamentos/CBSP.
- Aba **Treinamentos** / **Passaportes**: mesmo agrupamento. Primário = último certificado válido/permanente; irmãos = Histórico (Obsoleto) com download. Badges do resumo usam só o primário.
- **Filtro Data Início / Data Fim** (`GTManScheduleTab` e `/department/man-schedule`): `ScheduleDateFilterInput` commita só `YYYY-MM-DD` completo com ano 1990–2100 (ou vazio). Chrome `0002-01-01` / `0020-01-01` / `0202-01-01` ao digitar o ano **não** recalcula a grade. Cap: 400 colunas/dia, 2000 semanas (segurança). Matriz/vencimentos/dashboard não têm filtro de período.

## Work Guidance

- Não voltar `<select>` nativo nesses quatro campos de cadastro.
- Não gravar escala no MIO.
- Não ligar `onChange` de `type="date"` direto em `setFilterDate*` da grade.

## Verification

- Editar Dados Pessoais: digitar cargo inexistente → Adicionar → POST 201 → campo fica com o novo id.
- Cards da Matriz < total de linhas se existirem inativos.
- KPI 1 vencido: card/filtro lista o documento; linha abre ficha; aba correta mostra o card (incl. certificado/CNH/laudo).
- Clique em "Embarcados Agora" filtra a lista ao mesmo conjunto do card (ON hoje, sem *).
- Man Schedule: checkbox liga colunas diárias; desliga volta semana. Badge `Hoje: NP a bordo` usa a mesma regra POB.
- Após Salvar ON, as células do período e a coluna ON atualizam sem recarregar a página.
- Digitar o ano em Data Início (`2`, `20`, `202`) não congela a UI; a grade só muda com data completa ou picker.
- Treinamentos: CBSP válido + CBSP vencido/declaração → uma linha primária, Histórico colapsado, resumo sem “1 vencido” falso.
- Card `total_docs_vencidos` da Matriz não sobe por declaração/certificado antigo se o primário do grupo está válido.

## Child DOX Index

- `src/lib/document-catalog/AGENTS.md` — catálogo global; aba QHSE / EPI do modal (módulo `epi`)
