# PLANO DE IMPLEMENTAÇÃO: Sistema de IA Agent + Portal ABZ

**Data de Criação:** 2026-04-22  
**Versão:** 1.0  
**Status:** Aprovado para Implementação

---

## 1. Visão Geral do Sistema

| Componente | Descrição |
|------------|-----------|
| **Chat IA** | Assistente conversacional com sessões únicas por usuário |
| **Dashboard Inteligente** | Resumo profissional + KPIs + Recomendações |
| **Config Admin** | Gerenciamento de endpoint, token e modelos |

---

## 2. Arquitetura do Sistema

### 2.1 Estrutura de Dados (Tabelas SQL)

```sql
-- Tabela de configuração do IA
CREATE TABLE ia_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint TEXT NOT NULL,
    api_key TEXT NOT NULL,
    model_default TEXT NOT NULL,
    max_tokens INTEGER DEFAULT 8192,
    temperatura FLOAT DEFAULT 0.7,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de sessões de chat
CREATE TABLE ia_chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users_unified(id) ON DELETE CASCADE,
    session_title TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Tabela de mensagens
CREATE TABLE ia_chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES ia_chat_sessions(id) ON DELETE CASCADE,
    role TEXT CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de índice do usuário (key points)
CREATE TABLE ia_user_index (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users_unified(id) ON DELETE CASCADE,
    index_type TEXT CHECK (index_type IN ('key_points', 'documents', 'email_summary')),
    content TEXT NOT NULL,
    embeddings vector(1536),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de cache do dashboard
CREATE TABLE ia_dashboard_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users_unified(id) ON DELETE CASCADE,
    dashboard_type TEXT CHECK (dashboard_type IN ('summary', 'kpi', 'pendencies', 'dept')),
    data JSONB NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Tabela de sync de emails
CREATE TABLE ia_email_sync (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users_unified(id) ON DELETE CASCADE,
    email_subject TEXT,
    email_from TEXT,
    email_date TIMESTAMP WITH TIME ZONE,
    email_body_preview TEXT,
    process_tag TEXT,
    processed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2.2 Estrutura de Pastas

```
src/
├── app/
│   ├── api/
│   │   ├── ia/
│   │   │   ├── chat/route.ts          # Envio de mensagens
│   │   │   ├── sessions/route.ts     # Gerenciar sessões
│   │   │   ├── models/route.ts       # Listar modelos disponíveis
│   │   │   ├── index/route.ts        # Rebuild do índice
│   │   │   ├── dashboard/route.ts    # Dados do dashboard
│   │   │   └── email/sync/route.ts  # Sync de emails Outlook
│   │   └── admin/
│   │       └── ia-config/page.tsx     # Página de configuração
│   └── chat/page.tsx                 # Interface do chat
├── components/
│   └── IA/
│       ├── ChatWindow.tsx
│       ├── ChatInput.tsx
│       ├── MessageBubble.tsx
│       ├── SessionList.tsx
│       ├── DashboardCard.tsx
│       ├── KPICard.tsx
│       ├── PendencyAlert.tsx
│       └── LoadingIndicator.tsx
├── lib/
│   ├── ia-client.ts                  # Cliente LLM
│   ├── ia-index.ts                   # Gerenciamento de índice
│   ├── ia-memory.ts                  # Gerenciamento de memória
│   ├── ia-dashboard.ts               # Lógica do dashboard
│   ├── outlook-sync.ts                # Sync com Outlook
│   └── services/
│       ├── evaluation-service.ts      # Dados de avaliação
│       ├── leave-service.ts          # Dados de férias
│       └── reimbursement-service.ts  # Dados de reembolso
└── types/
    └── ia.ts                         # Tipos específicos
```

---

## 3. Especificações Técnicas

### 3.1 Endpoint LLM

| Configuração | Valor |
|--------------|-------|
| **Endpoint** | http://177.136.245.174:1234/v1 |
| **Token** | sk-lm-oGdUS6Q6:ZzGLk9gjvLDyYhU4G93h |
| **Modelo Padrão** | (a ser selecionado via API) |
| **Limite de Contexto** | 128K tokens |
| **Temperatura Padrão** | 0.7 |

### 3.2 Sync de Emails (Outlook)

| Configuração | Detalhe |
|--------------|---------|
| **Provedor** | Microsoft Graph API / Outlook API |
| **Horário** | Segunda a Sexta, 08:00 - 17:00 (BRT) |
| **Frequência** | Tempo real (dentro do horário) |
| **Dados Sincronizados** | Subject, From, Date, Body Preview, Tags |

### 3.3 Controle de Acesso

| Papel | Acesso |
|-------|--------|
| **ADMIN** | Todos os usuários, todos os departamentos, todos os dados |
| **GERENTE** | Equipe (via `avaliacao_colaborador_gerente`), dados do setor |
| **USER** | Próprios dados apenas |

### 3.4 Relação Gerente-Funcionário

- **Tabela Fonte:** `avaliacao_colaborador_gerente`
- **Campos:** colaborador_id, gerente_id, periodo_id

---

## 4. Módulo 1: Chat com IA

### 4.1 Fluxo de Mensagens

```
Usuário → API /api/ia/chat → Validação de Permissão
                              ↓
                        Buscar Sessão Atual
                              ↓
                        Buscar Índice do Usuário
                              ↓
                        Montar Prompt + Contexto
                              ↓
                        Enviar para LLM (LM Studio)
                              ↓
                        Salvar Mensagem → Retornar Resposta
```

### 4.2 Gerenciamento de Memória

| Parâmetro | Valor |
|-----------|-------|
| **Key Points** | Resumo de até 2000 tokens por usuário |
| **Indexação** | Embeddings para busca semântica |
| **Limite por Sessão** | 8 mensagens (~32K tokens) |
| **Total Disponível** | 128K tokens |

### 4.3 Fontes de Dados por Permissão

```
ADMIN:
├── todos os usuários (dados completos)
├── todos os departamentos
├── todas as avaliações
├── todos os reembolsos
├── todas as férias
├── todos os emails (via sync)
└── KPIs globais

GERENTE:
├── equipe (avaliacao_colaborador_gerente)
├── departamento
├── avaliações da equipe
├── reembolsos da equipe
├── férias da equipe
├── emails da equipe
└── KPIs do setor

USER:
├── próprio perfil
├── próprias avaliações
├── próprios reembolsos
├── próprias férias
├── próprios emails
└── próprio KPI
```

---

## 5. Módulo 2: Dashboard Inteligente

### 5.1 Tipos de Dashboard

| Tipo | Descrição | Atualização |
|------|-----------|-------------|
| **Resumo** | Visão geral da vida profissional | Tempo real |
| **KPI** | Métricas de desempenho | Por avaliação |
| **Pendências** | Itens pendentes com deadline | Tempo real |
| **Departamento** | Métricas do setor (gerente + admin) | Por hora |

### 5.2 Cruzamento de Dados

```
FÉRIAS → PENDÊNCIAS
├── Se data_inicio em X dias, listar documentos/pendências a entregar antes da saída
└── Alerta de prazos

AVALIAÇÕES → KRIs
├── Pontuação por critério
├── Evolução entre períodos
├── Comparação com média do departamento
└── Oportunidades de melhoria

EMAILS → PROCESSOS
├── Rastreamento por assunto (tags)
├── Identificação de processos abertos
└── Feedbacks pendentes

REEMBOLSOS → STATUS
├── Lista de reembolsos por status
└── Próximos passos recomendados
```

### 5.3 KPIs do Funcionário

| KPI | Descrição |
|----|------------|
| **Pontualidade** | Entrega de avaliações no prazo |
| **Participação** | Cursos finalizados na Academy |
| **Reembolso** | Taxa de aprovação |
| **Férias** | Planejamento vs realizado |
| **Desempenho** | Nota média das avaliações |

---

## 6. Módulo 3: Configuração Admin

### 6.1 Página de Configuração (/admin/ia-config)

| Campo | Tipo | Descrição |
|------|------|------------|
| **Endpoint** | TEXT | URL do servidor LLM |
| **Token API** | PASSWORD | Chave de acesso (criptografada) |
| **Modelo Padrão** | SELECT | Lista de modelos disponíveis |
| **Temperatura** | RANGE | 0.0 - 1.0 |
| **Max Tokens** | NUMBER | Limite de tokens por resposta |
| **Ativo** | TOGGLE | Ativar/desativar IA |

### 6.2 API de Modelos

```
GET /api/ia/models
└── Retorna lista de modelos disponíveis no endpoint
```

---

## 7. Cronograma de Implementação

### Fase 1: Banco de Dados (Dias 1-3)
- [ ] Criar tabelas SQL
- [ ] Configurar RLS
- [ ] Criar funções auxiliares

### Fase 2: API Backend (Dias 4-7)
- [ ] /api/ia/chat
- [ ] /api/ia/sessions
- [ ] /api/ia/models
- [ ] /api/ia/dashboard
- [ ] /api/ia/email/sync

### Fase 3: Cliente LLM (Dias 8-10)
- [ ] lib/ia-client.ts
- [ ] lib/ia-memory.ts
- [ ] lib/ia-index.ts

### Fase 4: Dashboard (Dias 11-15)
- [ ] API de dados
- [ ] Componentes UI
- [ ] Cruzamento de dados

### Fase 5: Config Admin (Dias 16-18)
- [ ] Página de configuração
- [ ] Edição de token/endpoint

### Fase 6: Interface Chat (Dias 19-25)
- [ ] ChatWindow
- [ ] SessionList
- [ ] MessageBubble

### Fase 7: Integração Outlook (Dias 26-35)
- [ ] Auth OAuth
- [ ] Sync de emails
- [ ] Processamento de tags

### Fase 8: Testes (Dias 36-45)
- [ ] Testes unitários
- [ ] Testes de integração
- [ ] Testes E2E

### Fase 9: Deploy (Dias 46-50)
- [ ] Deploy para produção
- [ ] Monitoramento
- [ ] Documentação

---

## 8. Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| Timeout em consultas grandes | Implementar paginação |
| Falha no sync de emails | Retry com-backoff exponencial |
| Memória insuficiente | Limpar histórico antigo automaticamente |
| Acesso não autorizado | Validação rigorosa de permissões |

---

## 9. Próximos Passos

1. **Reunião de Validação** com stakeholders
2. **Setup do Ambiente** de desenvolvimento
3. **Criação do Banco de Dados**
4. **Implementação do Backend**
5. **Implementação do Frontend**
6. **Testes e Validação**
7. **Deploy**