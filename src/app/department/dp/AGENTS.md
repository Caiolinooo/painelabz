# Departamento Pessoal (DP) — DOX

## Purpose

UI de `/department/dp` para o DP operar cadastro de colaboradores, fechamento de escala/folha, vencimentos de ASO e atalho ao e-Social. Lê só `gt_*` via APIs de Gestão de Tripulantes.

## Ownership

- Page/layout: `src/app/department/dp/`
- APIs: `GET /api/gestao-tripulantes/colaboradores`, `GET|POST /api/gestao-tripulantes/aso/notificar-vencimentos`, `GET /api/gestao-tripulantes/relatorio-mensal`, `POST /api/e-social/consolidar`
- Lib: `src/lib/gestao-tripulantes/aso-vencimentos.ts`, `LIST_SELECT` em `colaborador-get.ts`

## Local Contracts

- Sempre wrap com `MainLayout` (`layout.tsx`) — o menu lateral vem daí, como GT / e-Social / Man Schedule.
- Lista de colaboradores usa campos achatados da API: `cargo_nome`, `empresa_nome`, `embarcacao_nome`, `centro_custo_nome`, `centro_custo_codigo`, `ativo`, `regime_trabalho`, `escala_embarque`, `escala_folga`. Nunca `cargo.nome` / `empresa.nome` (o flatten remove os nested).
- Aba ASO lê `GET /api/gestao-tripulantes/aso/notificar-vencimentos` (`tipo_documento=aso` + join colaborador). Não usar o bucket genérico de `/auditoria` (mistura passaporte/treino e expõe `gt_colaboradores` sem alias `colaborador`).
- Status VENCIDO/VENCENDO vem de `alerta` calculado por data civil local (`YYYY-MM-DD`), não de `new Date(iso)` UTC.
- Fechamento: preview de totais via `relatorio-mensal`; aprovação continua em `ModalAprovacaoFechamento`.

## Work Guidance

- Novos campos da tabela DP devem existir em `LIST_SELECT` + flatten.
- Clique na linha de ASO abre o `CollaboratorModal` do colaborador.

## Verification

- `/department/dp` mostra sidebar do portal (não tela full-bleed).
- Colunas Cargo, Centro de Custo, Empresa e Escala preenchidas quando o cadastro tem FK.
- Aba ASO lista nome/CPF/cargo (não `N/A` em massa); validade em `dd/mm/aaaa`; vencido só se a data local já passou.
- Aba Fechamento mostra totais ON/DBA/FI/TRE do mês selecionado.

## Child DOX Index

_(none)_
