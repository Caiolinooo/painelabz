# Plano de Implementação - Requisição de Compra (RQF)

## Contexto
O sistema atual de ordens de compra (OC) está funcional, mas falta implementar a funcionalidade de Requisição de Compra (RQF) conforme solicitado pelo usuário.

## Requisitos Identificados
1. Gerar Fluxo e RQF com mesma regra de nomenclatura da OC
2. Gerar OC após aprovação
3. Permitir impressão no modelo OC antiga (PDF)
4. Mover botão de adicionar mais itens para canto inferior esquerdo

## Estrutura de Implementação

### 1. Banco de Dados
#### Novas Tabelas Necessárias:
```sql
-- Tabela para Requisições de Compra
CREATE TABLE purchase_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_number VARCHAR(50) UNIQUE NOT NULL,
    user_id UUID REFERENCES users_unified(id),
    sector_id UUID REFERENCES sectors(id),
    status VARCHAR(20) DEFAULT 'draft',
    total_value DECIMAL(12,2),
    observation TEXT,
    items JSONB[],
    approver_ids UUID[],
    history JSONB[],
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela para Fluxo de Aprovação
CREATE TABLE approval_flows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID REFERENCES purchase_requests(id),
    step_number INTEGER,
    approver_id UUID REFERENCES users_unified(id),
    status VARCHAR(20) DEFAULT 'pending',
    decision_date TIMESTAMP,
    note TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela para OCs Geradas a partir de RQFs
CREATE TABLE generated_purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID REFERENCES purchase_requests(id),
    po_number VARCHAR(50),
    provider_name VARCHAR(200),
    total_value DECIMAL(12,2),
    items JSONB[],
    invoice_url VARCHAR(500),
    status VARCHAR(20) DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 2. API Routes
#### Novas Rotas Necessárias:
```typescript
// src/app/api/purchase-requests/route.ts
// src/app/api/purchase-requests/[id]/route.ts
// src/app/api/purchase-requests/[id]/approve/route.ts
// src/app/api/purchase-requests/[id]/generate-po/route.ts
// src/app/api/approval-flows/route.ts
```

### 3. Componentes Frontend
#### Novos Componentes:
```typescript
// src/components/PurchaseRequest/
// - PurchaseRequestForm.tsx
// - PurchaseRequestList.tsx
// - PurchaseRequestDetails.tsx
// - PurchaseRequestPdf.tsx
```

#### Componentes Existentes a Modificar:
```typescript
// src/components/PurchaseOrder/PurchaseOrderForm.tsx
// - Mover botão de adicionar itens para canto inferior esquerdo
```

## Fluxo de Implementação

### Fase 1: Estrutura de Dados
1. Criar migrations para novas tabelas
2. Implementar modelos de dados
3. Configurar RLS policies

### Fase 2: API Backend
1. Implementar rotas para RQF
2. Implementar lógica de geração de números
3. Implementar fluxo de aprovação
4. Implementar geração de OC

### Fase 3: Frontend
1. Criar componentes para RQF
2. Modificar formulário existente
3. Implementar visualização em PDF

### Fase 4: Integração
1. Conectar RQF com sistema existente
2. Implementar notificações
3. Testes de integração

## Regras de Nomenclatura

### RQF (Requisição de Compra)
```
Formato: RQF-YYYYMMDD-SectorCode-Sequence
Exemplo: RQF-20231215-FN-01
```

### Fluxo
```
Formato: FLW-YYYYMMDD-SectorCode-Sequence
Exemplo: FLW-20231215-FN-01
```

### OC Gerada
```
Formato: OC-YYYYMMDD-SectorCode-Sequence
Exemplo: OC-20231215-FN-01
```

## Lógica de Geração

### 1. Geração de Número
- Baseado na data atual
- Código do setor (2 letras)
- Sequência incremental

### 2. Fluxo de Aprovação
- Múltiplos passos baseados em regras de configuração
- Notificações por email
- Histórico de aprovações

### 3. Geração de OC
- Automática após aprovação final
- Cópia dos itens da RQF
- Status inicial como 'draft'

## Componentes PDF

### Modelo OC Antigo
- Layout similar ao sistema anterior
- Campos obrigatórios
- Formatação consistente
- Logomarca da empresa

### Campos PDF:
- Número da OC
- Data
- Fornecedor
- Valores
- Itens detalhados
- Observações
- Assinaturas

## Modificações UI/UX

### Botão Adicionar Itens
- Mover para canto inferior esquerdo do formulário
- Estilização consistente com padrão do sistema
- Tooltip explicativa

### Layout do Formulário
- Grid responsivo
- Seções colapsáveis
- Validação em tempo real
- Preview dos dados

## Testes e Validação

### Testes Unitários
- Geração de números
- Fluxo de aprovação
- Cálculo de valores
- Validação de formulário

### Testes de Integração
- Fluxo completo RQF → Aprovação → OC
- Notificações por email
- Geração de PDF
- Permissões de acesso

### Testes de Interface
- Responsividade
- Acessibilidade
- Performance
- Compatibilidade

## Prazos e Entregas

### Fase 1: Estrutura (2-3 dias)
- Migrations
- Modelos
- Configuração inicial

### Fase 2: Backend (3-4 dias)
- API routes
- Lógica de negócio
- Validações

### Fase 3: Frontend (2-3 dias)
- Componentes
- Formulários
- Visualização

### Fase 4: Integração (1-2 dias)
- Testes
- Correções
- Documentação

## Riscos e Mitigações

### Riscos Identificados
1. Conflito com sistema existente
2. Performance com grandes volumes
3. Complexidade do fluxo de aprovação
4. Formatação de PDF

### Mitigações
1. Testes extensivos de integração
2. Otimização de queries
3. Validação de regras de negócio
4. Templates reutilizáveis

## Documentação

### Interna
- Diagramas de fluxo
- Especificação de API
- Guia de configuração
- Instruções de deploy

### Usuário
- Guia de uso
- FAQ
- Exemplos
- Troubleshooting

## Checklist de Implementação

### Estrutura
- [ ] Migrations criadas
- [ ] Modelos implementados
- [ ] RLS policies configuradas

### Backend
- [ ] API routes implementadas
- [ ] Lógica de negócio funcional
- [ ] Validações em vigor

### Frontend
- [ ] Componentes criados
- [ ] Formulários funcionais
- [ ] Visualização em PDF

### Integração
- [ ] Sistema conectado
- [ ] Notificações funcionando
- [ ] Permissões corretas

### Testes
- [ ] Unitários passando
- [ ] Integração validada
- [ ] Interface testada

### Deploy
- [ ] Ambiente configurado
- [ ] Rollback planejado
- [ ] Monitoramento ativo

## Considerações Finais

Este plano mantém a consistência com o padrão do sistema existente, utilizando:
- Mesma estrutura de API
- Mesmos padrões de nomenclatura
- Mesma abordagem de autenticação
- Mesma estrutura de componentes
- Mesma estratégia de banco de dados

A implementação será feita de forma incremental, garantindo que o sistema existente continue funcionando durante todo o processo.