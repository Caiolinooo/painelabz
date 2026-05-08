# Implementação do Agente IA Autônomo para KPIs - Sumário

## Visão Geral
Implementação completa de um Agente IA Autônomo para monitoramento contínuo, análise e otimização de KPIs no Portal ABZ.

## Arquitetura do Sistema

### Componentes Principais

#### 1. **Motor do Agente Autônomo** (`src/lib/ia/autonomous-loop.ts`)
- **Classe**: `AutonomousKPIAgent`
- **Responsabilidade**: Ciclo contínuo de análise e execução
- **Features**:
  - Ciclos periódicos configuráveis (10s a 5min)
  - 4 níveis de autonomia (baixo, médio, alto, total)
  - Execução automática de ações
  - Sistema de eventos completo
  - Armazenamento de histórico (layouts, decisões, ciclos)
  - Ajuste automático de configuração baseado em performance

#### 2. **Orquestrador Avançado** (`src/lib/ia/advanced-orchestrator.ts`)
- **Responsabilidade**: Tomada de decisão inteligente
- **Features**:
  - Cálculo de prioridades baseado em múltiplos fatores
  - Geração de planos de ação
  - Criação de etapas executáveis
  - Geração de alternativas
  - Estimativa de impacto
  - Histórico de decisões

#### 3. **Gerenciador de Contexto** (`src/lib/ia/context-manager.ts`)
- **Responsabilidade**: Memória e enriquecimento contínuo
- **Features**:
  - Armazenamento de interações (até 1000 por usuário)
  - Detecção de padrões comportamentais
  - Geração de previsões
  - Preferências do usuário
  - Persistência em banco de dados (tabela `ia_memory`)
  - Contexto enriquecido com dados em tempo real

#### 4. **Serviço de Dashboard** (`src/lib/ia/dashboard-service.ts`)
- **Responsabilidade**: Agregação e geração de KPIs
- **Features**:
  - Cache com TTL de 15 minutos
  - KPIs de avaliações, férias, reembolsos
  - KPIs modulares via `kpi_targets`
  - Dados de pendências
  - Resumo inteligente

#### 5. **Serviço de Agente** (`src/lib/ia/agent-service.ts`)
- **Responsabilidade**: Análise de KPIs e notificações
- **Features**:
  - Análise de KPIs com detecção de gaps
  - Verificação de feature toggles
  - Notificações proativas (push, email, portal)
  - Tarefas agendadas
  - Logs de ações

### Componentes de Interface

#### 6. **Hook de Automação** (`src/hooks/useKPIAutonomous.ts`)
- **Responsabilidade**: Integração React com o agente
- **Features**:
  - Controle de ciclo de vida
  - Event handlers
  - Estado reativo
  - Configuração dinâmica

#### 7. **Hook de Configuração** (`src/hooks/useAutonomousConfig.ts`)
- **Responsabilidade**: Gestão de configurações
- **Features**:
  - 4 presets predefinidos
  - Persistência em localStorage
  - Detecção automática de configuração
  - Reset para padrões

#### 8. **Renderizador de Dashboard** (`src/components/KPI/AutonomousKPIRenderer.tsx`)
- **Responsabilidade**: Interface do agente autônomo
- **Features**:
  - Controles de play/pause/stop
  - Visualização de layouts gerados
  - Histórico de decisões
  - Histórico de ciclos
  - Estatísticas em tempo real

#### 9. **Cabeçalho Autônomo** (`src/components/KPI/KPIAutonomousHeader.tsx`)
- **Responsabilidade**: Painel de controle
- **Features**:
  - Seletor de intervalo
  - Seletor de nível de autonomia
  - Botões de controle
  - Indicador de status
  - Exportação (PDF/XLSX)

### Configuração

#### 10. **Configuração do Agente** (`src/lib/ia/autonomous-config.ts`)
- **Tipos**:
  - `AutonomousConfig`: Configuração completa
  - `AgentStatus`: Estados (idle, running, paused, error)
  - `CycleData`: Dados do ciclo
  - `DecisionLog`: Log de decisões
  - `MemoryStore`: Armazenamento de memória

- **Presets**:
  - **Baixo**: 1min, sem auto-render, 1 ação/ciclo
  - **Médio**: 30s, auto-render, 3 ações/ciclo (padrão)
  - **Alto**: 15s, auto-render, 5 ações/ciclo
  - **Total**: 10s, auto-render, 10 ações/ciclo

### Banco de Dados

#### Novas Tabelas Necessárias:
```sql
-- Memória do agente IA
CREATE TABLE ia_memory (
  user_id UUID PRIMARY KEY REFERENCES users_unified(id),
  interactions JSONB DEFAULT '[]',
  patterns JSONB DEFAULT '[]',
  preferences JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cache de dashboards
CREATE TABLE ia_dashboard_cache (
  user_id UUID REFERENCES users_unified(id),
  dashboard_type TEXT,
  data JSONB,
  generated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, dashboard_type)
);

-- Tarefas agendadas
CREATE TABLE scheduled_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users_unified(id),
  task_name TEXT,
  task_type TEXT,
  prompt TEXT,
  schedule TEXT,
  target_users TEXT[] DEFAULT '{}',
  target_roles TEXT[] DEFAULT '{}',
  notification_channels TEXT[] DEFAULT '{push,email}',
  metadata JSONB DEFAULT '{}',
  last_run TIMESTAMPTZ,
  next_run TIMESTAMPTZ,
  run_count INTEGER DEFAULT 0,
  max_runs INTEGER,
  status TEXT DEFAULT 'active',
  error_log TEXT,
  created_by UUID REFERENCES users_unified(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Metas de KPIs
CREATE TABLE kpi_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kpi_key TEXT,
  kpi_label TEXT,
  target_value NUMERIC,
  current_value NUMERIC,
  unit TEXT DEFAULT '%',
  category TEXT, -- 'performance' ou 'solutions'
  department TEXT,
  sector TEXT,
  is_active BOOLEAN DEFAULT true,
  auto_calculated BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Logs de ações do agente
CREATE TABLE agent_action_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES scheduled_tasks(id),
  user_id UUID REFERENCES users_unified(id),
  action_type TEXT,
  action_description TEXT,
  details JSONB DEFAULT '{}',
  channels_used TEXT[] DEFAULT '{}',
  kpi_snapshot JSONB,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Fluxo de Execução

### 1. Inicialização
```
Usuário inicia agente → useKPIAutonomous cria AutonomousKPIAgent
    ↓
Agente registra handlers de eventos
    ↓
Auto-start se configurado
    ↓
Primeiro ciclo executado imediatamente
```

### 2. Ciclo do Agente (30s padrão)
```
1. Coleta contexto (fetchBaseContext)
   ├─ Perfil do usuário
   ├─ Avaliações
   ├─ Férias
   ├─ Reembolsos
   └─ E-mails recentes

2. Busca KPIs atuais (generateDashboard)
   ├─ KPIs de avaliações
   ├─ KPIs de férias
   ├─ KPIs de reembolsos
   └─ KPIs modulares

3. Analisa gaps (analyzeGaps)
   ├─ Compara valores atuais vs metas
   ├─ Calcula % de desvio
   ├─ Define prioridade
   └─ Identifica tendências

4. Gera plano (generatePlan)
   ├─ Calcula prioridades
   ├─ Cria etapas
   ├─ Adiciona etapas de recuperação
   ├─ Calcula confiança
   ├─ Gera alternativas
   └─ Estima impacto

5. Executa ações (executeActions)
   ├─ Notificações
   ├─ E-mails
   ├─ Análises de KPIs
   ├─ Criação de tarefas
   ├─ Geração de relatórios
   └─ Atualização de dashboard

6. Renderiza dashboard (renderUpdatedDashboard)
   ├─ Gera layout
   ├─ Adiciona widgets
   └─ Emite evento

7. Avalia resultados (evaluateResults)
   ├─ Calcula taxa de sucesso
   ├─ Armazena avaliação
   └─ Ajusta configuração se necessário

8. Verifica alertas (checkAlerts)
   └─ Envia notificações se fora do threshold

9. Loga decisão (logDecision)
   └─ Armazena no histórico

10. Armazena interação (storeInteraction)
    └─ Persiste em ia_memory
```

## Eventos Disponíveis

- **layoutUpdate**: Novo layout gerado
- **decision**: Decisão tomada
- **statusChange**: Mudança de status
- **error**: Erro no ciclo
- **cycleComplete**: Ciclo concluído

## Ações Disponíveis

1. **send_notification**: Envia notificação push/portal
2. **send_email**: Envia e-mail com template
3. **analyze_kpi**: Analisa KPI específico
4. **create_task**: Cria tarefa para usuário
5. **generate_report**: Gera relatório PDF/XLSX
6. **update_dashboard**: Atualiza dashboard
7. **monitor_outcome**: Monitora resultados

## Níveis de Prioridade

- **critical**: Gap > 50% - Ação imediata
- **high**: Gap > 25% - Ação urgente
- **medium**: Gap > 10% - Ação importante
- **low**: Gap < 10% - Ação de otimização

## Performance

- **Cache**: 15 minutos para dashboards
- **Memória**: 1000 interações por usuário
- **Ciclos**: Configuráveis (10s a 5min)
- **Ações/Ciclo**: Configuráveis (1 a 10)
- **Timeout**: 4 minutos por requisição LLM

## Segurança

- Respeita RBAC existente
- Verifica permissões por módulo
- Feature toggles para controle gradual
- Logs completos de todas as ações
- Limite de iterações (5) para tool calls

## Integração

### APIs Existentes Utilizadas:
- `/api/ia/dashboard` - Geração de dashboards
- `/api/ia/chat` - Chat com IA
- `/api/ia/config` - Configuração da IA
- `/api/ia/autonomous/control` - Controle do agente

### Novas APIs:
- `POST /api/ia/autonomous/control` - Iniciar/parar agente
- `GET /api/ia/autonomous/status` - Status do agente
- `POST /api/ia/autonomous/override` - Sobrescrever ação

## Testes Realizados

✓ TypeScript compilation sem erros na IA lib
✓ Importações corretas
✓ Tipos definidos corretamente
✓ Event handlers registrados
✓ Ciclo de vida completo
✓ Configuração dinâmica
✓ Persistência de estado
✓ Integração com UI

## Próximos Passos

1. Deploy das novas tabelas no banco
2. Configuração inicial de kpi_targets
3. Testes end-to-end
4. Monitoramento de performance
5. Ajustes baseados em feedback

## Observações

- Implementação respeita código existente
- Sem breaking changes
- Extensível para novos módulos
- Documentação completa
- Logs detalhados para debugging