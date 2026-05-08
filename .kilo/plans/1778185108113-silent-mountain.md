# Plano de Correção e Melhoria do Módulo KPI com IA

## Diagnóstico do Problema

### Erro 401 na Autenticação
O erro 401 ocorre porque o módulo KPI (`src/app/kpi/page.tsx`) tenta ler o token de autenticação de `localStorage.getItem('abz_token')`, mas o token é armazenado como `abzToken`. O restante do sistema utiliza corretamente `localStorage.getItem('abzToken') || localStorage.getItem('token')`.

### Funcionalidades Existentes da IA
O sistema já possui:
- Agente IA autônomo (`src/lib/ia/autonomous-loop.ts`) com capacidade de monitorar e otimizar KPIs
- Sistema de análise de KPIs (`src/lib/ia/agent-service.ts`)
- Capacidade de criar dashboards inteligentes com base em IA
- Sistema de autenticação funcional mas com incoerência no acesso ao token

## Plano de Ação

### 1. Correção Imediata - Token de Autenticação
**Arquivo:** `src/app/kpi/page.tsx`
- Alterar a leitura do token de `localStorage.getItem('abz_token')` para `localStorage.getItem('abzToken') || localStorage.getItem('token')` para manter a consistência com o restante do sistema

### 2. Implementação de Edição de KPIs pela IA
**Arquivo:** `src/lib/ia/registry/definitions/avaliacao.tools.ts`
- Criar nova ferramenta IA para "editar_kpi" que permita ao agente:
  - Criar novos KPIs
  - Atualizar metas existentes
  - Ajustar valores de target
  - Configurar alertas automáticos

### 3. Melhorias no Módulo KPI
**Arquivo:** `src/app/kpi/page.tsx`
- Integrar o agente autônomo de KPI (`AutonomousKPIRenderer`) com o dashboard existente
- Adicionar controles para o usuário gerenciar metas manualmente
- Permitir que o usuário ative/desative o modo autônomo da IA
- Configurar níveis de autonomia (baixo, médio, alto, total) com diferentes graus de intervenção automática

### 4. Controles de Visualização
- Adicionar filtros por período, departamento e tipo de KPI
- Implementar visualização de histórico de KPIs com gráficos de evolução
- Criar sistema de alertas para metas não atingidas
- Adicionar exportação de relatórios em PDF/XLSX

## Integração com Fontes Externas

### 5. Integração com Microsoft Graph API
- Configurar acesso à caixa de email corporativa via Microsoft Graph API
- Implementar leitura de emails relevantes para análise de KPIs
- Sincronizar dados de tarefas, reuniões e atividades do Outlook

### 6. Análise de Dados Corporativos Abrangente
- Integrar dados de:
  - Email corporativo (Microsoft 365)
  - Calendário corporativo (Outlook)
  - SharePoint/OneDrive documentos
  - Sistema de chamados (se aplicável)
- Criar ferramentas de IA específicas para cada fonte de dados

### 7. Sistema de Permissões Hierárquicas
- Implementar níveis de acesso baseados em cargo e hierarquia
- Configurar diferentes níveis de visibilidade de dados por perfil
- Garantir que a IA acesse apenas dados apropriados por nível hierárquico

## Benefícios Esperados
1. **Correção do Erro 401:** O módulo KPI funcionará corretamente com autenticação consistente
2. **Controle Ativo do Usuário:** Interface para edição manual de KPIs
3. **Automação Inteligente:** Agente IA pode monitorar e sugerir melhorias automaticamente
4. **Visualização Flexível:** Usuário pode alternar entre modos manual e automático
5. **Integração Completa:** O módulo KPI se integra com o sistema de IA existente
6. **Visão Holística:** A IA acessa todas as fontes de dados disponíveis para análise completa

## Próximos Passos
1. Corrigir incoerência no acesso ao token de autenticação
2. Criar ferramentas de IA para edição de KPIs
3. Aprimorar interface do módulo KPI com controles de usuário
4. Implementar integração com fontes externas (Microsoft 365)
5. Testar integração entre módulo KPI e agente IA
6. Documentar processo para futuras manutenções

## Considerações de Implementação

### Autenticação e Acesso
- Garantir que o token de acesso esteja consistente em todo o sistema
- Implementar mecanismo de fallback para diferentes métodos de autenticação
- Validar permissões de acesso a diferentes níveis da organização

### Ferramentas de IA
- Criar ferramentas especializadas para diferentes fontes de dados
- Implementar sistema de permissões baseado em cargo e hierarquia
- Garantir que a IA processe dados de todas as fontes disponíveis

### Monitoramento e Alertas
- Configurar sistema de notificações proativas
- Implementar análise automática de KPIs com base em dados corporativos
- Criar relatórios automáticos para gestores