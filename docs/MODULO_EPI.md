# Módulo EPI — Guia do Desenvolvedor

Documentação do módulo de Equipamentos de Proteção Individual: estoque, hierarquia de tamanhos e relatórios PDF (v5.26.0).

## Visão Geral

```
/admin/epi          → gestão de tipos, estoque, movimentações
/epi               → entrega e consulta (colaborador)
/api/epi/*         → CRUD, estoque, CA lookup, reset
```

O módulo suporta EPIs com variações de tamanho (hierarquia pai/filho), controle de estoque por nível, alertas de estoque baixo e geração de relatórios PDF.

## Estrutura de Dados

### Hierarquia de tipos

- **EPI pai**: tipo principal (ex: "Luva de Segurança")
- **Variações filhas**: tamanhos/sub-divisões (ex: "P", "M", "G") com estoque próprio
- Cadastro individual via modal ou lote por vírgulas
- Filhos herdam CA, categoria e descrição do pai

### Estoque

| Tabela | Descrição |
|--------|-----------|
| `epi_types` | Tipos e variações de EPI |
| `epi_stock` | Níveis de estoque por tipo/variação |
| `epi_stock_movements` | Histórico (entrada, saída, ajuste, devolução) |

A listagem agrupa variações sob o EPI pai com recuo visual (cascata) e calcula estoque consolidado.

## Páginas e Componentes

| Rota | Arquivo | Função |
|------|---------|--------|
| `/admin/epi` | `src/app/admin/epi/page.tsx` | Admin: tipos, estoque, movimentações |
| `/admin/epi/settings` | `src/app/admin/epi/settings/page.tsx` | Responsáveis por setor, reset |
| `/epi` | `src/app/epi/page.tsx` | Entrega e consulta |

### Abas do admin

1. **Tipos de EPI** — filtros (nome, CA, validade, estoque máximo), edição inline, estoque em tempo real no card
2. **Estoque** — filtros avançados, visualização hierárquica, alertas de estoque baixo
3. **Movimentações** — histórico com modal de nova movimentação

### Modal de movimentação

- Combobox pesquisável para seleção de EPI
- Se o EPI tem variações, menu secundário para escolher tamanho
- Tipos: `entry`, `exit`, `adjustment`, `return`

## API Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET/POST` | `/api/epi` | Registros de entrega |
| `GET/POST/DELETE` | `/api/epi/types` | CRUD de tipos e variações |
| `GET/POST/PUT` | `/api/epi/stock` | Níveis e movimentações |
| `GET` | `/api/epi/ca-lookup?ca=XXXXX` | Consulta CA no MTE |
| `GET/POST/DELETE` | `/api/epi/sector-responsibles` | Responsáveis por setor |
| `POST` | `/api/epi/reset` | Reset completo (estoque + movimentações) |
| `GET` | `/api/epi/stock/export` | Exportação planilha |
| `POST` | `/api/epi/stock/import` | Importação planilha |

## Relatórios PDF

Geradores em `src/lib/pdf/`:

| Arquivo | Uso |
|---------|-----|
| `generateEPIStockReport.ts` | Relatório de estoque com CA, validade, local |
| `generateEPIReport.ts` | Relatório de entregas |
| `generateGeneralEPIReport.ts` | Relatório geral consolidado |

### Relatório de estoque (v5.26.0)

Modal com filtros:

- Nome do EPI
- Número do CA
- Data de validade do CA
- Estoque máximo
- Período de movimentações (opcional)
- Tipo: todos / estoque baixo / movimentações

Colunas do PDF: CA, validade, local de armazenamento, destaque visual para estoque abaixo do mínimo.

```typescript
import { generateEPIStockReport } from '@/lib/pdf/generateEPIStockReport';

generateEPIStockReport(stocks, movements, {
  reportType: 'low_stock',       // 'all' | 'low_stock' | 'movements'
  includeMovements: true,
  startDate: '2026-01-01',
  endDate: '2026-06-30',
});
```

## CA Lookup

`src/components/epi/CALookupField.tsx` consulta `/api/epi/ca-lookup` para preencher dados do Certificado de Aprovação automaticamente a partir do número do CA.

## Notificações de Estoque Baixo

E-mails de estoque crítico são enviados apenas aos responsáveis setoriais configurados em `/admin/epi/settings` (v5.12.0+).

## Reset de Dados

`POST /api/epi/reset` remove:

- Todos os registros de `epi_stock`
- Todas as movimentações em `epi_stock_movements`

Disponível na página de settings do admin. **Irreversível** — usar apenas em manutenção.

## Edição de Tipos

Ícones de edição (lápis) na grade de tipos abrem o modal preenchido para alterar:

- Nome, categoria, CA, descrição
- Flag de obrigatoriedade
- Variações de tamanho

## Pitfalls Comuns

| Problema | Solução |
|----------|---------|
| Estoque consolidado incorreto | Verificar agrupamento pai/filho na view de estoque |
| Variação sem estoque próprio | Cada filho tem registro em `epi_stock` |
| Reset parcial | v5.26.0 garante limpeza de stock + movements |
| CA não encontrado | Verificar conectividade com fonte MTE; CA pode estar expirado |

## Arquivos Relacionados

- `src/types/epi.ts` — tipos TypeScript
- `src/services/stockImportExport.ts` — import/export planilha AN-CPR-003
- `CHANGELOG.md` — v5.26.0 para detalhes da release
