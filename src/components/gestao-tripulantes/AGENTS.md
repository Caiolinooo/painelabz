# Gestão de Tripulantes UI — DOX

## Purpose

Componentes da Matriz, modal do colaborador e Man Schedule. Lookups profissionais compartilhados e viewport da escala.

## Ownership

- `src/components/gestao-tripulantes/`
- Lookups: `SearchableCreatableSelect.tsx`, `createGtLookupOption.ts`
- KPIs: consomem `GET /api/gestao-tripulantes/dashboard` (`dashboard-service.ts`)

## Local Contracts

- Cargo / Empresa / Embarcação / Centro de Custo: `SearchableCreatableSelect` (busca + Adicionar). Create via POST `/api/gestao-tripulantes/{cargos|empresas|embarcacoes|centros-custo}` (`createGtLookupOption`). Filtros da matriz/Man Schedule: busca sem create (valores de nome, não UUID).
- Cards da Matriz: só `ativo=true` e CC ativo; docs vencidos por `data_validade` civil.
- Man Schedule: checkbox `Visualizar por dia` (`gt-man-schedule-viewport-day`). Off = semana sáb–sex; on = um dia por coluna.

## Work Guidance

- Não voltar `<select>` nativo nesses quatro campos de cadastro.
- Não gravar escala no MIO.

## Verification

- Editar Dados Pessoais: digitar cargo inexistente → Adicionar → POST 201 → campo fica com o novo id.
- Cards da Matriz < total de linhas se existirem inativos.
- Man Schedule: checkbox liga colunas diárias; desliga volta semana.

## Child DOX Index

_(none)_
