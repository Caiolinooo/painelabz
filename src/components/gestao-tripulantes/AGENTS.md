# Gestão de Tripulantes UI — DOX

## Purpose

Componentes da Matriz, modal do colaborador e Man Schedule. Lookups profissionais compartilhados e viewport da escala.

## Ownership

- `src/components/gestao-tripulantes/`
- Lookups: `SearchableCreatableSelect.tsx`, `createGtLookupOption.ts`
- KPIs: consomem `GET /api/gestao-tripulantes/dashboard` (`dashboard-service.ts`)

## Local Contracts

- Cargo / Empresa / Embarcação / Centro de Custo: `SearchableCreatableSelect` (busca + Adicionar). Create via POST `/api/gestao-tripulantes/{cargos|empresas|embarcacoes|centros-custo}` (`createGtLookupOption`). Filtros da matriz/Man Schedule: busca sem create (valores de nome, não UUID).
- Cards da Matriz: só `ativo=true` e CC ativo; docs vencidos = vigente por slot + `data_validade` civil. Coluna Documentos mostra título/tipo do vigente vencido. Filtro **Docs Vencidos** abre `DocsAlertasPanel`.
- Abas do modal filtram com `documentoPertenceAba` (`certificado`→treinamentos, `laudo`→aso). Highlight `gt-doc-<id>`.
- Man Schedule: checkbox `Visualizar por dia` (`gt-man-schedule-viewport-day`). Off = semana sáb–sex; on = um dia por coluna.
- Save de evento escreve linha em `allSchedules` (`rotation_start`/`end`). Novo lançamento prevalece sobre STB/ON antigo no mesmo período. `QTD. EMBARC` = pessoas no cargo (não é quantidade de embarques).

## Work Guidance

- Não voltar `<select>` nativo nesses quatro campos de cadastro.
- Não gravar escala no MIO.

## Verification

- Editar Dados Pessoais: digitar cargo inexistente → Adicionar → POST 201 → campo fica com o novo id.
- Cards da Matriz < total de linhas se existirem inativos.
- KPI 1 vencido: card/filtro lista o documento; linha abre ficha; aba correta mostra o card (incl. certificado/CNH/laudo).
- Man Schedule: checkbox liga colunas diárias; desliga volta semana.
- Após Salvar ON, as células do período e a coluna ON atualizam sem recarregar a página.

## Child DOX Index

_(none)_
