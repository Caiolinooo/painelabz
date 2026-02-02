# Changelog
<br>

## [4.6.0] - 2026-02-02

### Added
- **Tradução completa de Posts**: Implementada localização dinâmica para visualizações, curtidas, compartilhamentos e diálogos de confirmação.
- **Localização de Sistema de Atalhos**: Traduzidos todos os modais de adição e gerenciamento de atalhos.
- **Suporte i18n em Comentários**: Adicionadas chaves de tradução para estados de carregamento, placeholders e ações de resposta.
- **Tradução de Modais Críticos**: Localizados os modais de "Criar Evento" e "Criar Destaque".

### Improved
- **Enforcement de Permissões por Setor**: Implementada lógica estrita onde permissões de setor sobrepõem acessos padrão do sistema.
- **Gerenciamento de Cache de Acesso**: Invalidação automática do cache de permissões ao expandir/recolher menus para refletir mudanças em tempo real.
- **Estrutura i18n**: Refatoração dos arquivos `pt-BR.ts` e `en-US.ts` com remoção de duplicatas e correção de aninhamento (nesting).

### Fixed
- **Sincronização de Setores**: Corrigida falha nas APIs de usuários unificados que não retornavam o `sector_id`.
- **Editor de Usuário**: Resolvido bug que impedia o salvamento correto do departamento/setor.
- **Fallback de Idioma**: Garantido fallback para Inglês em componentes onde o texto padrão estava em Português.

## [4.5.0] - 2026-01-30

### Fixed
- **Gestão de Usuários**: Corrigida falha onde o "Departamento / Setor" no Editor de Usuário aparecia vazio mesmo para usuários com setor configurado.
- **APIs de Usuários Unificados**: Adicionado campo `sector_id` no mapeamento das APIs `/api/users-unified` e `/api/admin/users-unified`.

## [4.4.0] - 2026-01-29

### Added
- **Auto-detecção de Idioma**: O sistema agora detecta automaticamente o idioma preferencial do navegador (`navigator.language`) no primeiro acesso.
- **Suporte Hierárquico de Localização**: Implementado sistema de processamento de localização em 3 camadas nas APIs:
  - Header customizado `X-Client-Locale`
  - Header padrão `Accept-Language` (fallback automático)
  - Default do sistema (`pt-BR`)
- **Autenticação em Modo Anônimo**: Suporte a `credentials: 'include'` nas chamadas de API críticas, garantindo que o sistema funcione corretamente em abas anônimas/privadas onde o localStorage pode ser instável.

### Improved
- **Acessibilidade de E-mails**: O atributo HTML `lang` dos e-mails agora é definido dinamicamente de acordo com o idioma do destinatário.
- **Robustez de Internacionalização**: Refatoração do `I18nContext` para evitar o fallback silencioso para `pt-BR` quando o usuário prefere inglês.
- **Logs de Diagnóstico**: Adicionado sistema de logs (`🔧`) no formulário de Ordem de Compra para facilitar a depuração de problemas de carregamento e autenticação.

### Fixed
- **Carregamento de Centros de Custo**: Corrigido erro onde os centros de custo não apareciam no dropdown em modo anônimo devido a falhas de autenticação silenciosa.
- **Internacionalização de E-mails**:
  - Removidos textos fixos em português de templates críticos (`poApprovedFiscalTemplate`).
  - Corrigida falha no `orderStatusUpdateTemplate` que ignorava o parâmetro de locale.
  - Adicionado suporte a parâmetro de locale em todos os componentes de template base.
- **Sincronização de Headers**: Garantido que o header de localização seja enviado em todas as atualizações de status de Ordem de Compra.

## [4.3.0] - 2026-01-29

### Added
- **Sistema de Ícones de Módulos Centralizados**: Sistema completo de ícones para todos os módulos
  - Novo arquivo `moduleIcons.tsx` com ícones consistentes para todos os módulos
  - Suporte a múltiplas bibliotecas (React Icons: Fi, Fa, Hi, Bi, Ai, Bs, Md, Ri, Io)
  - Mapeamento automático de ícones por ID de módulo
  - Interface visual mais coesa e profissional

- **API de Traduções Dinâmicas**: Sistema de gerenciamento de traduções via API
  - Endpoint `/api/i18n/translations` para gerenciamento centralizado
  - Suporte a geração automática de traduções via LLM (futuro)
  - Interface administrativa para edição de traduções
  - Suporte a PT-BR, EN-US, ES-ES com sincronização dinâmica

- **API de Permissões Efetivas**: Sistema granular de controle de acesso
  - Endpoint `/api/user/effective-permissions` para verificação de permissões
  - Cache inteligente de permissões para performance otimizada
  - Integração com sistema de setores e módulos
  - Suporte a permissões por role e por usuário específicas
  - Validação em tempo real de acesso a recursos

- **API de Calendário Google**: Integração completa com Google Calendar
  - Endpoint `/api/calendar/google` para integração com Google Calendar API
  - Sincronização de eventos corporativos
  - Suporte a autenticação OAuth2 para Google
  - Gerenciamento de eventos diretamente do painel
  - Notificações de eventos automatizadas

- **Sistema de Upload Móvel**: API para uploads de dispositivos móveis
  - Endpoint `/api/mobile/upload` para uploads mobile-optimized
  - Suporte a múltiplos formatos de arquivos
  - Compressão automática de imagens
  - Validação de segurança e tipo de arquivo
  - Integração com sistema de documentos

- **Sistema de Reset de Senha**: Fluxo completo de recuperação
  - Endpoint `/api/auth/request-password-reset` para solicitar reset
  - Endpoint `/api/auth/reset-password-with-token` para redefinir senha
  - Tokens seguros com expiração configurável
  - Interface amigável para recuperação de senha
  - Notificações por email automatizadas

### Improved
- **Sistema de Cards Dashboard**: Refatoração completa
  - Melhorias na API `/api/cards/supabase` para performance
  - Cache inteligente de dados dos cards
  - Interface mais responsiva e moderna
  - Suporte a configurações por usuário
  - Melhor tratamento de estados de carregamento

- **Sistema de Notificações**: Performance e UX aprimoradas
  - Otimização da API `/api/notifications` para grandes volumes
  - Melhor performance em listas extensas
  - Interface de notificações mais responsiva
  - Melhor tratamento de estados de carregamento
  - Sistema de marcação de lidas/não lidas otimizado

- **Interface de Avaliações**: Componentes refinados
  - Melhorias no componente `StatusBadge` para visualização clara
  - Novos status e indicadores visuais
  - Interface mais intuitiva para gerentes e funcionários
  - Melhores indicadores de progresso

- **Layout Principal**: Consistência e responsividade
  - Melhorias no `MainLayout` para melhor responsividade
  - Otimização de renderização e performance
  - Melhor tratamento de estados e transições
  - Interface mais coesa em todos os dispositivos

- **Contexto de Internacionalização**: Performance e cache
  - Melhorias no `I18nContext` para performance otimizada
  - Cache inteligente de traduções
  - Melhor tratamento de estados de carregamento
  - Redução de re-renders desnecessários
  - Suporte a lazy loading de traduções

- **Serviço de Reembolsos**: Refatoração e otimização
  - Melhorias no `reimbursementService.ts`
  - Cache inteligente de dados
  - Melhor tratamento de erros
  - Interface mais responsiva
  - Performance otimizada para grandes volumes

- **Templates de Email**: Sistema aprimorado
  - Refatoração completa do sistema de templates
  - Suporte a múltiplos idiomas
  - Templates mais flexíveis e personalizáveis
  - Melhor tratamento de variáveis e formatação

### Fixed
- **Duplicação de Cards**: Correção definitiva de cards duplicados
  - Resolvido problema de `module_key` com prefixo incorreto
  - Script SQL para correção de dados inconsistentes
  - Interface sem duplicatas no modal de atalhos
  - Traduções exibidas corretamente em todos os idiomas

- **Traduções de Módulos**: Correção de chaves de tradução
  - Removido prefixo `cards.` das chaves incorretas
  - Normalização de IDs de módulos em todo o sistema
  - Traduções exibidas corretamente em PT-BR, EN-US, ES-ES
  - Consistência em todo o sistema de internacionalização

- **Performance de Notificações**: Otimizações críticas
  - Redução de chamadas de API redundantes
  - Cache inteligente implementado
  - Melhor tratamento de grandes volumes de dados
  - Interface mais responsiva e fluida

- **Validação de Formulários**: Melhorias robustas
  - Validações mais consistentes em formulários administrativos
  - Melhor feedback visual para erros e sucesso
  - Tratamento robusto de estados inválidos
  - Interface mais segura e confiável

- **Upload de Imagens de Perfil**: Sistema robusto
  - Melhorias no processo de upload de fotos de perfil
  - Validação de tipo e tamanho de arquivo
  - Compressão automática de imagens
  - Tratamento robusto de erros
  - Interface mais intuitiva

### Technical
- **Database Schema**: Otimizações e correções
  - Script de correção para `cards.module_key` duplicados
  - Índices otimizados para performance de consultas
  - Limpeza de dados inconsistentes
  - Integrity constraints reforçados
  - Performance otimizada para grandes volumes

- **API Performance**: Otimizações gerais
  - Redução de complexidade em queries SQL
  - Cache implementado em endpoints críticos
  - Melhor tratamento de concorrência
  - Timeout otimizados para diferentes cenários
  - Rate limiting implementado onde necessário

- **Frontend Performance**: Otimizações de renderização
  - Memoização de componentes pesados implementada
  - Redução significativa de re-renders desnecessários
  - Lazy loading implementado para componentes não críticos
  - Bundle size otimizado com code splitting
  - Performance de primeira carga otimizada

- **Security Enhancements**: Melhorias de segurança
  - Validação reforçada em todos os inputs
  - Sanitização de dados implementada
  - Rate limiting em endpoints críticos
  - CORS configurado adequadamente
  - Headers de segurança reforçados

## [4.2.0] - 2026-01-29

### Added
- **Ícones de Módulo Centralizados**: Sistema completo de ícones para todos os módulos
  - Novo arquivo `moduleIcons.tsx` com ícones consistentes para todos os módulos
  - Suporte a ícones do React Icons (Fi, Fa, Hi, Bi, Ai, Bs, Md, Ri, Io)
  - Mapeamento automático de ícones por ID de módulo
  - Interface visual mais coesa e profissional

- **API de Traduções Dinâmicas**: Sistema de gerenciamento de traduções via API
  - Endpoint `/api/i18n/translations` para gerenciamento de traduções
  - Suporte a geração automática de traduções via LLM (futuro)
  - Interface administrativa para edição de traduções
  - Suporte a PT-BR, EN-US, ES-ES
  - Sincronização dinâmica com frontend

- **API de Permissões Efetivas**: Sistema granular de controle de acesso
  - Endpoint `/api/user/effective-permissions` para verificação de permissões
  - Cache inteligente de permissões para performance
  - Integração com sistema de setores e módulos
  - Suporte a permissões por role e por usuário
  - Validação em tempo real de acesso

- **Sistema de Correção de Cards**: Ferramenta de manutenção de dados
  - Script SQL para correção de `module_key` duplicados
  - Documentação completa do problema e solução
  - Fix para atalhos duplicados no modal
  - Correção de chaves de tradução incorretas
  - Ferramenta de diagnóstico e manutenção

### Improved
- **Sistema de Ordens de Compra**: Refinamentos e otimizações
  - Melhorias na validação de formulários
  - Otimização de consultas ao banco de dados
  - Interface responsiva aprimorada
  - Melhor feedback visual em operações
  - Tratamento robusto de erros

- **Sistema de Notificações**: Performance e experiência do usuário
  - Otimização de queries de notificações
  - Melhor performance em grandes volumes
  - Interface de notificações mais responsiva
  - Melhor tratamento de estados de carregamento

- **Interface de Avaliações**: Componentes e layout
  - Melhorias no componente `StatusBadge`
  - Visualização mais clara de status de avaliações
  - Melhores indicadores visuais
  - Interface mais intuitiva

- **Layout Principal**: Consistência e usabilidade
  - Melhorias no `MainLayout` para melhor responsividade
  - Otimização de renderização
  - Melhor tratamento de estados
  - Interface mais coesa

- **Sistema de Atalhos**: Performance e usabilidade
  - Otimização do modal de adição de atalhos
  - Melhor performance em grandes listas
  - Melhor feedback visual
  - Interface mais responsiva

- **Contexto de Internacionalização**: Performance e cache
  - Melhorias no `I18nContext` para performance
  - Cache inteligente de traduções
  - Melhor tratamento de estados de carregamento
  - Redução de re-renders desnecessários

- **Gestão de Usuários**: API e hooks
  - Melhorias no hook `useNotifications`
  - Otimização de consultas de notificações
  - Melhor tratamento de estados
  - Performance aprimorada

### Fixed
- **Duplicação de Atalhos**: Correção definitiva de cards duplicados
  - Resolvido problema de `module_key` com prefixo incorreto
  - Limpeza de dados inconsistentes no banco
  - Interface sem duplicatas no modal de atalhos
  - Traduções exibidas corretamente

- **Traduções de Módulos**: Correção de chaves de tradução
  - Removido prefixo `cards.` das chaves incorretas
  - Normalização de IDs de módulos
  - Traduções exibidas corretamente em todos os idiomas
  - Consistência em todo o sistema

- **Performance de Notificações**: Otimizações críticas
  - Redução de chamadas de API redundantes
  - Cache inteligente de dados
  - Melhor tratamento de grandes volumes
  - Interface mais responsiva

- **Validação de Formulários**: Melhorias robustas
  - Validações mais consistentes em formulários de PO
  - Melhor feedback visual para erros
  - Tratamento robusto de estados inválidos
  - Interface mais segura

### Technical
- **Database Schema**: Otimizações e correções
  - Script de correção para `cards.module_key`
  - Índices otimizados para performance
  - Limpeza de dados inconsistentes
  - Integrity constraints reforçados

- **API Performance**: Otimizações gerais
  - Redução de complexidade em queries
  - Cache implementado em endpoints críticos
  - Melhor tratamento de concorrência
  - Timeout otimizados

- **Frontend Performance**: Otimizações de renderização
  - Memoização de componentes pesados
  - Redução de re-renders desnecessários
  - Lazy loading implementado
  - Bundle size otimizado

## [4.1.0] - 2026-01-28

### Added
- **Módulo de Ordens de Compra (Purchase Orders)**:
  - Sistema completo de gestão de ordens de compra com aprovação em múltiplos níveis
  - Configurações flexíveis por setor ou usuário com regras de aprovação personalizadas
  - Interface administrativa para gerenciamento de configurações de aprovação
  - Suporte a centros de custo e limites de valores por nível
  - Página dedicada para gestão de ordens de compra (`/department/purchase-orders`)
  - Componentes especializados para estatísticas e gerenciamento
- **Módulo de Setores (Sectors)**:
  - Sistema completo de gestão de setores corporativos
  - Controle granular de módulos e cards permitidos por setor
  - Interface administrativa para configuração de permissões por setor
  - Categorização de módulos (core, hr, content, department)
  - Sistema de constantes centralizado para gerenciamento de módulos
- **Barra de Atalhos Personalizados do Usuário**:
  - Sistema de atalhos personalizáveis na barra do dashboard
  - Modal de adição de atalhos com sugestões inteligentes
  - Busca integrada de módulos e conteúdo disponível
  - Suporte a reorganização de atalhos por posição
  - Persistência das preferências do usuário no banco de dados
- **Página de Ajuda (Ajuda Page)**:
  - Central de suporte com acesso rápido a recursos importantes
  - Links para lista de ramais, procedimentos de emergência
  - Interface intuitiva com ícones contextuais
  - Integração com sistema de autenticação
- **Módulo de Departamentos (Department)**:
  - Estrutura organizacional para módulos específicos de departamento
  - Layout dedicado com navegação contextual
  - Suporte a múltiplos sub-módulos por departamento
- **Sistema de Permissões Efetivas**:
  - Hook `useEffectivePermissions` para verificação granular de permissões
  - Cache inteligente de permissões para melhor performance
  - Integração com sistema de setores e módulos

### Improved
- **Arquitetura de Módulos**: Refatoração completa para sistema modular
  - Constantes centralizadas em `src/constants/modules.ts`
  - Categorias de módulos para melhor organização
  - Suporte a módulos ocultos e visibilidade controlada
- **Interface Administrativa**: Melhorias gerais
  - Interface otimizada para gerenciamento de configurações
  - Melhor feedback visual em operações de CRUD
  - Componentes reutilizáveis para formulários e listagens
- **Performance**: Otimizações em consultas e cache
  - Implementação de cache inteligente para dados frequentemente acessados
  - Redução de chamadas de API redundantes
  - Melhor tratamento de estados de carregamento

### Fixed
- **Autenticação**: Melhorias na consistência de token
  - Tratamento robusto de tokens em múltiplos contextos
  - Melhor recuperação de autenticação em falhas
- **Validações**: Implementação de validações mais robustas
  - Validação de dados em formulários de configuração
  - Tratamento de erros mais descritivo
- **Interface**: Correções de layout e responsividade
  - Melhor alinhamento de componentes
  - Correção de problemas de overflow em telas pequenas

### Technical
- **Database Schema**: Novas tabelas para suporte aos módulos
  - `purchase_orders` para gestão de ordens de compra
  - `po_configs` para configurações de aprovação
  - `sectors` para gestão de setores
  - `user_shortcuts` para atalhos personalizados
- **API Endpoints**: Novos endpoints para suporte funcional
  - `/api/purchase-orders/*` para gestão de ordens de compra
  - `/api/sectors/*` para gestão de setores
  - `/api/user-shortcuts/*` para gestão de atalhos
  - `/api/department/*` para módulos departamentais
- **Components**: Novos componentes reutilizáveis
  - Sistema de componentes para formulários administrativos
  - Componentes especializados para exibição de dados
  - Modais reutilizáveis para operações CRUD

## [4.0.1] - 2026-01-22

### Fixed
- **Language Selector**:
    - Corrigido crash `ReferenceError: getLanguageFlag is not defined` ao alternar idiomas em certas páginas.
    - Padronização total para códigos de texto (PT/EN) em todas as variantes do seletor.

## [4.0.0] - 2026-01-22

### Added
- **Dashboard Refinement**:
    - Seção "Últimas Notícias" dinâmica com suporte a autoplay de vídeo em mudo.
    - Seção "Links Rápidos" atualizada com ferramentas críticas (Ponto, Reembolso, Contracheque, Academy).
    - Integração real com o calendário da empresa para exibição de eventos próximos.
    - Botão "+" rápido para criação de notícias (visível para editores).
- **Módulo de Notícias**:
    - Novo design de barra de busca unificada (estilo "Pill").
    - Filtro "Destaques" integrado à barra de busca.
    - Restrição de criação de posts: usuários padrão não veem mais o card de "O que você está pensando?".
- **Internacionalização (i18n)**:
    - Suporte a interpolação dinâmica em traduções (ex: "Olá, {{name}}!").
    - Correções extensivas em chaves de tradução nos idiomas PT e EN.
- **Perfil do Usuário**:
    - Priorização de `drive_photo_url` para exibição correta da foto de perfil.
    - Lógica defensiva para ignorar logos padrão do sistema como avatar de usuário.

### Improved
- **Interface Geral**:
    - LanguageSelector agora utiliza variante dropdown para melhor UX no header.
    - Limpeza de redundâncias no `MainLayout`.

### Fixed
- **Estabilidade**:
    - Correção de crashes no `NotificationHUD`.
    - Resolvido problema de hidratação e perda de contexto no `I18nProvider`.

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [3.14.0] - 2026-01-22

### Added
- **Novo Sistema de Mensagens (Chat)**:
    - Plataforma completa de comunicação interna inspirada no Discord.
    - Suporte a **Servidores** e **Canais** temáticos.
    - **Mensagens Diretas (DMs)** privativas entre colaboradores.
    - Nova interface `ChatPage` e componentes modulares para navegação e mensagens.
- **Integração de Vídeo Chamadas**:
    - Implementado suporte a chamadas de vídeo diretamente no chat.
    - Componente `VideoCall.tsx` com controles de câmera e microfone.
- **Gestão de Presença e Status**:
    - Novo seletor de status (Online, Ausente, Não Perturbe, Invisível).
    - Persistência de status de usuário via `users_unified`.
- **Infraestrutura de Banco de Dados**:
    - Novas migrações para suporte ao chat: `create-chat-servers.sql`, `create-dm-tables.sql`, `add-user-status.sql`.
    - Habilitado suporte a Realtime no Supabase para mensagens instantâneas via `enable-realtime.sql`.
    - Refinamento de políticas de segurança RLS via `fix-chat-rls.sql`.

### Improved
- **Arquitetura de UI**:
    - Centralização de componentes de chat em `src/components/chat/`.
    - Melhores modais de criação de servidores e canais.
- **UX**:
    - Sistema de confirmação genérico via `ConfirmationModal.tsx`.

### Fixed
- **Estabilidade do Chat**: Correções em permissões de acesso e fluxo de criação de canais.

## [3.13.0] - 2026-01-20

### Added
- **Métricas de Engajamento Global**:
    - Implementado `GlobalTimeTracker` para monitorar o tempo de permanência em todos os módulos e cards do sistema.
    - Sistema de "heartbeat" (15s) para atualização precisa de duração, com pausa automática ao trocar de aba (Page Visibility API).
    - Captura automatizada de User Agent e Session ID para análise de tráfego.

### Improved
- **Identificação de Usuários**:
    - Aprimorada visualização de usuários sem perfil completo: agora exibe "Usuário não identificado" acompanhado do ID, eliminando o rótulo genérico de "Anônimo" para dados rastreáveis.
    - Refinada lógica de avatars nas notícias: priorização de `drive_photo_url` sobre `avatar` com fallback inteligente via `users_unified`.

### Fixed
- **Visualizadores de Notícias**: Corrigida falha onde usuários apareciam como anônimos ou sem foto devido ao uso da tabela de usuários incorreta.
- **Eficácia de Dados**: Implementada validação estrita no backend para evitar registros de rastreio órfãos/anônimos.

## [3.12.2] - 2026-01-12

### Changed
- **Help Widget**:
    - Atualizado horário de atendimento para: 08h às 17h (seg a sexta).
    - Aprimorada coleta de diagnósticos: agora captura automaticamente logs do console e erros de rede (fetch failures) ao enviar feedback.

## [3.12.1] - 2026-01-12

### Fixed
- **Central de Ajuda (Help Widget)**:
    - Corrigido processamento de listas numeradas e sub-listas no conteúdo dos artigos.
    - Resolvido problema de renderização onde imagens não eram exibidas corretamente.
    - Melhorias na identificação visual de itens com bullets.

### Added
- **Feedback**:
    - Adicionada opção para anexar screenshot (print da tela) no formulário de contato.
    - Adicionado envio automático de informações do sistema (Navegador, SO, Resolução) para facilitar diagnóstico.

## [3.12.0] - 2026-01-12

### Added
- **Central de Ajuda (Help Widget)**:
    - Interface moderna interativa com 3 abas (Início, Ajuda, Mensagens).
    - Base de conhecimento oficial da ABZ Group integrada (Manuais, TI, RH).
    - Sistema de busca instantânea em artigos de ajuda.
    - Integração direta com suporte via sistema de feedback aprimorado.
    - Conteúdo oficial sobre Onboarding, Reembolso, Contracheque, Rede Pública, Assinatura de E-mail e Teams.

### Fixed
- **Reembolsos**:
    - Corrigido fluxo de e-mails para garantir o envio correto para os setores Fiscal e Financeiro em solicitações internas.
    - Corrigida falha no cálculo do valor total onde os valores eram divididos por 100 incorretamente.
- **Interface**: Ajustado comportamento de scroll no conteúdo de ajuda.

### Removed
- **GlobalFeedbackWidget**: Removido componente de feedback legado.

## [3.11.0] - 2026-01-12

### Added
- **Sistema de Feedback Avançado**:
    - Captura automática de screenshot via `html2canvas`.
    - Suporte a múltiplos anexos (imagens, logs, PDFs) até 5MB.
    - Coleta de logs do console (`error` e `warn`) e erros não tratados.
    - Métricas de performance (Page Load, Memory Usage) e detalhes técnicos do navegador.
    - E-mails de notificação aprimorados com design profissional e dados técnicos.
- **Painel Administrativo de Feedback**:
    - Dashboard completo para gestão de tickets.
    - Visualizador de logs colorido e formatado.
    - Lightbox para visualização de screenshots e anexos de imagem.

### Fixed
- **WKRadar (Guacamole)**: Resolvido problema de instabilidade nas conexões WebSocket através de conexão direta após autenticação via proxy.

## [3.10.1] - 2026-01-09

### Fixed
- **Loop de Banners**: Corrigido comportamento onde banners reapareciam repetidamente ao trocar de página.
- **Sincronização de Notificações**: Resolvido erro onde a contagem de mensagens lidas não persistia no banco de dados.
- **Estabilidade da API**: Corrigido método HTTP (`POST` -> `PUT`) e rota de limpeza no frontend.
- **Persistência de Histórico**: Corrigido reset do histórico de banners vistos quando o ID do usuário oscilava no carregamento.

## [3.10.0] - 2026-01-09

### Added
- **Sistema de Notificações Realtime**: Nova arquitetura estilo rede social.
    - Suporte a tipos de notificação (curtidas, comentários, menções).
    - Integração de "Atores" (usuários) com exibição de avatar e nome.
    - Links profundos para recursos do sistema.
    - Novos componentes de UI: `NotificationItem` e `NotificationHUD`.
- **Push Notifications Ricas**: Push agora inclui avatar do ator e dados contextuais.
- **Atualizações em Tempo Real**: Notificações atualizam instantaneamente via Supabase.

### Fixed
- **Formatação de Notícias**: Corrigido problema onde quebras de linha eram ignoradas (adicionado `whitespace-pre-wrap`).
- **Otimização de Vídeo**: Compressão de vídeo client-side drasticamente mais rápida (usando preset `ultrafast`).
- **Redirecionamento do Editor**: Editor de notícias em tela cheia agora fecha corretamente após salvar.
- **Erro de Relacionamento Supabase**: Resolvido erro de "schema cache" usando joins manuais no backend.

### Changed
- Preset de compressão de vídeo alterado de `medium` para `ultrafast`.
- Aumento do CRF de 28 para 30 para equilíbrio entre velocidade e tamanho.

## [3.9.1] - 2026-01-08

### Added
- Unificação da interface de Calendário: Eventos ICS agora aparecem integrados no calendário principal e na lista lateral.
- Marcadores coloridos para eventos da empresa no calendário.
- Suporte a `fetchWithToken` na página de calendário e painel administrativo para maior segurança e persistência.

### Fixed
- Persistência das configurações de calendário: Corrigido erro de permissão (401/404) e melhorada lógica de salvamento (upsert) no banco de dados.
- Removido erro enganoso de "Usuário não encontrado" em falhas de autenticação da API.

### Changed
- Removida seção separada "Eventos da Empresa (ICS)" do rodapé da página de calendário.

## [3.9.0] - 2026-01-06

### Adicionado
- **Configuração de Calendário Admin**: Nova seção em "Integração ERP" para gerenciar o feed ICS da empresa.
  - Suporte a URL direta ou conversão automática de links do Google Calendar.
  - Seletor de cores para eventos no calendário.
  - Ferramenta de teste de conexão em tempo real.
- **Integração MIO**: Módulos completos para sincronização de funcionários e autenticação com sistema MIO.

### Corrigido
- **Banners de Notificação**: Resolvido loop infinito/pisca-pisca de banners usando ordenação estável com critério de desempate por ID.
- **Módulo de Notícias**:
  - Preview de vídeo agora usa a tag `<video>` corretamente.
  - Fluxo de compartilhamento aprimorado com mensagens de erro visíveis e opção de tentar novamente.
- **Calendário**: Atualizado fallback de URL para `abz.midia@gmail.com` e melhorado feedback de erro para calendários privados (404).

### Melhorado
- **Performance**: Limpeza de cache e otimização de rotas de API.
- **UX**: Correção de erros de codificação (UTF-8) em múltiplos componentes.

## [3.8.2] - 2025-12-30

### Melhorado
- **ChangelogModal**: Aprimoramentos de UX e segurança
  - Adicionada guarda de autenticação (só exibe para usuários autenticados)
  - Adicionada guarda de rotas (não exibe em páginas de login/registro)
  - Implementado delay de 2 segundos antes de abrir o modal
  - Integração completa com sistema de internacionalização (i18n)
  - Melhor controle de contexto e dependências com `useEffect`
  - UX aprimorada com abertura suave e não intrusiva
  - Correção de referência a `data.latest` após timeout

### Adicionado
- Novas chaves de tradução para módulo de changelog em `pt-BR.ts`:
  - `changelog.title`: "Novidades"
  - `changelog.historyTitle`: "Histórico de Versões"
  - `changelog.version`: "Versão"
  - `changelog.newFeaturesDesc`: "Confira as melhorias que preparamos para você."
  - E outras traduções relacionadas
- Traduções correspondentes em `en-US.ts` para suporte multilíngue
- Textos contextualizados e consistentes em ambos idiomas

## [3.7.8] - 2025-12-17

### Adicionado
- **Sistema de Notificações de Atualizações**: Modal interativo de changelog
  - Modal automático ao detectar nova versão do sistema
  - Visualização de últimas atualizações com animações
  - Histórico completo de versões acessível
  - Efeito confetti para celebrar atualizações
  - Controle de visualização por usuário (localStorage)
  - Design moderno e responsivo com Framer Motion
  - Integração com API de changelog (`/api/changelog`)
  - Ícones contextuais para cada tipo de mudança
- Componente `ChangelogModal.tsx` para exibição de atualizações
- API endpoint `/api/changelog` para busca de informações de versão
- Dependência `canvas-confetti` para efeitos visuais
- Dependência `@types/canvas-confetti` para tipagem TypeScript

### Melhorado
- Feedback visual aprimorado em atualizações do sistema
- Melhor comunicação de mudanças para usuários
- UX aprimorada com celebrações visuais

## [3.7.7] - 2025-12-17

### Adicionado
- Nova API de lista de curtidas em posts (`/api/news/posts/[postId]/likes_list`)

### Melhorado
- Aprimoramentos na API de autenticação com refresh token
- Refinamentos no módulo de avaliações (visualização e preenchimento)
- Melhorias no sistema de notícias (feed, comentários e destaques)
- Otimizações na API de reembolsos por usuário
- Ajustes no modal de detalhes de reembolso
- Refinamentos no serviço de email Exchange
- Melhorias de estabilidade e performance geral

## [3.7.6] - 2025-12-17

### Corrigido
- **CRÍTICO**: Corrigido problema onde líderes de setor não mostravam questões de liderança
- API agora consulta corretamente `users_unified.is_lider` (mesma tabela do painel admin)
- Check robusto: aceita `true`, `'true'`, `1`, `'1'` para compatibilidade
- Frontend propaga `isEmployeeLeader` corretamente através da cadeia de componentes

### Adicionado
- Debug logging extensivo para rastreamento de liderança
- Endpoint de debug `/api/debug/lideres` para verificação de dados

## [3.7.5] - 2025-12-16

### Melhorado
- Ajustes adicionais na rota de avaliação individual (`/api/avaliacao/[id]`)
- Otimizações de validação e tratamento de erros
- Melhorias de performance e estabilidade
- Refinamentos no fluxo de dados

## [3.7.4] - 2025-12-16

### Melhorado
- Refinamentos no componente `ViewEvaluationClient`
- Melhorias na página de visualização de avaliações (`/avaliacao/ver/[id]`)
- Otimização de renderização e performance
- Melhor experiência do usuário na visualização

## [3.7.3] - 2025-12-15

### Melhorado
- Refinamentos na rota de avaliação individual (`/api/avaliacao/[id]`)
- Melhor tratamento de dados e validações
- Otimização de queries e performance

### Corrigido
- Correções de bugs e estabilidade aprimorada

## [3.7.2] - 2025-12-15

### Corrigido
- Correção de todas as datas do README para 2025
- Atualização do badge de versão
- Melhorias na documentação de versões
- Consistência em todo o histórico de atualizações

## [3.7.1] - 2025-12-14

### Melhorado
- Refinamentos na rota de sincronização de módulos (`/api/admin/sync-modules`)
- Melhor tratamento de erros e validações
- Otimização de queries e performance
- Ajustes na API de avaliação individual (`/api/avaliacao/[id]`)
- Otimizações na API de reembolso por protocolo (`/api/reembolso/[protocolo]`)
- Melhor integração com sistema de documentação
- Refinamentos no modal de detalhes de reembolso

### Corrigido
- Ajustes em componentes de interface
- Melhorias de usabilidade
- Correções de bugs menores

## [3.7.0] - 2025-12-13

### Removido
- Removida rota antiga de geração de PDF por ID (`/api/reembolso/[id]/pdf`)
- Redução de código duplicado e endpoints redundantes

### Melhorado
- Consolidação na rota de geração por protocolo (`/api/reembolso/[protocolo]/pdf`)
- Otimizações no gerador de PDF (`pdf-generator.ts`)
- Melhor manutenibilidade e consistência da API

## [3.6.9] - 2025-12-12

### Adicionado
- Implementada rota para gerar PDF de reembolso por protocolo (`/api/reembolso/[protocolo]/pdf`)
- Busca inteligente de reembolsos usando número de protocolo
- Melhor integração com sistema de documentação
- Facilita acesso e compartilhamento de comprovantes

## [3.6.8] - 2025-12-11

### Melhorado
- Melhorias na API de aprovação de avaliações
- Refinamentos no componente de preenchimento de avaliações (`FillEvaluationClient`)
- Otimização de rotas de avaliação individual
- Melhor tratamento de dados e validações
- Nova API para gerenciamento individual de reembolsos (`/api/reembolso/[id]`)
- Melhorias no modal de detalhes de reembolso (`ReimbursementDetailModal`)
- Refinamentos na rota principal de reembolsos
- Melhorias no gerador de PDF (`pdf-generator.ts`)
- Otimizações de renderização e formatação
- Melhor qualidade de documentos gerados

### Adicionado
- Novas traduções em PT-BR
- Consistência linguística aprimorada
- Melhorias em textos da interface

## [3.6.7] - 2025-12-10

### Adicionado
- Gerenciador de permissões por usuário (`UserPermissionManager`)
- Implementada API de sincronização de módulos do sistema
- Endpoints para gerenciamento de permissões individuais por usuário
- Sistema de permissões mais robusto e flexível

### Melhorado
- Melhorias no componente `BannedUsersManager`
- Refinamentos na interface de gerenciamento de banimentos
- Melhorias no `SupabaseAuthContext`
- Ajustes no sistema de autenticação (`auth.ts`)
- Otimização de hooks de notificações
- Atualizações na página de gestão de usuários
- Melhorias na página de feed de notícias
- Ajustes de UI/UX em componentes administrativos

### Corrigido
- Correções de bugs e estabilidade aprimorada

## [3.6.6] - 2025-12-09

### Melhorado
- Refatoração completa do componente de aprovação de reembolsos
- Otimização de queries e redução de chamadas de API
- Melhorias na interface de usuário para aprovadores
- Aprimoramento do sistema de notificações
- Ajustes de performance no carregamento de dados
- Refinamentos de UI/UX em múltiplos componentes

### Corrigido
- Correções de bugs no fluxo de aprovação/rejeição
- Correções de bugs menores e estabilidade aprimorada

## [3.6.5] - 2025-12-08

### Melhorado
- Melhorias no componente de aprovação de reembolso
- Ajustes na interface de aprovação e rejeição
- Novas traduções para PT-BR e EN-US
- Melhorias nas chaves de tradução existentes
- Consistência de linguagem em todo o sistema
- Ajustes de configuração e performance
- Refinamentos de UI/UX

### Corrigido
- Correções de bugs e estabilidade aprimorada
- Correções de bugs menores

## [3.6.4] - 2025-12-07

### Adicionado
- Implementado notificação também para o solicitante ao criar reembolso
- Sistema de notificação bidirecional (aprovadores e solicitantes)
- Adicionado indicador de carregamento durante aprovação/rejeição
- Validação de dados antes do processamento
- Novas chaves de tradução para notificações de reembolso (PT-BR e EN-US)
- Mensagens de erro e sucesso traduzidas

### Melhorado
- Melhorias na função `sendReimbursementNotification` com suporte a notificações de criação
- Logs aprimorados para rastreamento de notificações enviadas
- Tratamento de erros mais robusto com mensagens descritivas
- Feedback visual aprimorado para ações do usuário
- Interface de configuração de destinatários de email reorganizada
- Validação de emails mais robusta no frontend
- Feedback visual durante salvamento de configurações
- Melhor tratamento de erros e estados de carregamento
- Suporte completo a múltiplos idiomas nas novas funcionalidades

### Corrigido
- Correções em rotas de API de avaliação
- Ajustes no componente de visualização de avaliações

## [3.6.3] - 2025-12-06

### Adicionado
- Implementado verificação se funcionário é líder (tabela lideres)
- Adicionado fallback para consulta direta quando RPC não disponível
- Nova propriedade `isEmployeeLeader` na resposta da API de avaliações
- Sistema de logs aprimorado para rastreamento de envios

### Melhorado
- Tratamento de erros aprimorado para verificação de liderança
- Usuários @groupabz.com: apenas destinatários configurados (andresa/fiscal)
- Outros domínios: fallback automático para logistica@groupabz.com
- Redução de emails duplicados para usuários internos
- Ajustes em rotas de API de reembolso
- Melhorias no sistema de perfil de usuário
- Atualizações de traduções (PT-BR e EN-US)

## [3.6.2] - 2025-12-05

### Removido
- Removido proxy intermediário do Next.js

### Melhorado
- Implementado acesso direto via HTTPS (vm.groupabz.com)
- Melhor performance e segurança sem proxy reverso
- Simplificação da arquitetura de acesso ao Guacamole

## [3.6.1] - 2025-12-04

### Corrigido
- Resolvido problema de Mixed Content (HTTP/HTTPS)
- URL relativa para melhor segurança e compatibilidade

### Adicionado
- Implementado proxy Next.js para Guacamole
- Configuração de rewrites no next.config.js

## [3.6.0] - 2025-12-03

### Adicionado
- **Módulo WKRadar**: Sistema completo de gerenciamento de credenciais e seed cards
  - Interface administrativa para gestão de credenciais
  - Página pública para visualização de seed cards
  - API RESTful completa para operações CRUD
  - Migrações de banco de dados com tabelas dedicadas
  - Controle de acesso e permissões granulares
- Traduções completas para PT-BR e EN-US do módulo WKRadar

### Melhorado
- Sistema de controle de versão aprimorado

## [3.5.0] - 2024-11-25

### Adicionado
- Implementado sistema de soft delete com lixeira (30 dias)

### Melhorado
- Melhorado sistema de tradução do menu lateral
- Otimizado cache e performance do sistema
- Hardening de autenticação e permissões

### Corrigido
- Corrigido erro 400 na criação de avaliações (coluna resultado)
- Correção de bugs e melhorias gerais

## [3.4.0] - 2024-10-15

### Melhorado
- Melhorias no sistema de notificações
- Otimizações de performance

## [3.3.0] - 2024-10-01

### Melhorado
- Melhorias gerais do sistema
- Otimizações de performance

## [3.2.1] - 2024-09-20

### Melhorado
- Melhorias no módulo de avaliação
- Melhorias na autenticação e segurança do módulo de avaliação

## [3.1.0] - 2024-09-15

### Melhorado
- Otimizações gerais do sistema
- Melhorias de performance

## [3.0.0] - 2024-09-10

### Adicionado
- Migração completa do sistema de email para Exchange/Office365

### Melhorado
- Refatoração completa do sistema de email
- Remoção do Ethereal e configuração exclusiva do Exchange

## [2.0.0] - 2025-12-01

### 🚀 Major Changes - Módulo de Avaliação de Desempenho

#### ✨ Novas Funcionalidades

**Sistema de Avaliação Completo**
- Implementado fluxo completo de avaliação com 8 status diferentes
- Novo fluxo: Gerente aprova → Funcionário comenta → Gerente finaliza
- Sistema de comentário final do funcionário antes da conclusão
- 10 critérios de avaliação do gerente (Q15-Q24)
- Sistema de notas do gerente para autoavaliação do colaborador (Q11-Q14)
- Cálculo automático de nota final considerando todas as notas
- Gráficos e analytics com todas as avaliações

**Sistema de Notificações e Emails**
- 6 tipos de notificações implementadas em todo o fluxo
- Emails automáticos em cada etapa da avaliação
- Notificações diferenciadas por contexto (aprovação vs comentário)
- Sistema de notificações push web integrado

**Interface e UX**
- Dashboard do gerente sem duplicidade de cards
- Seção destacada "Avaliações Aguardando Sua Revisão"
- Cards contextuais baseados em status
- Bloqueio visual de avaliações concluídas
- Gráficos separados: Avaliação Gerencial vs Notas para Autoavaliação
- Interface responsiva e intuitiva

#### 🔒 Segurança e Controles

**Bloqueios de Edição**
- 4 camadas de proteção para avaliações concluídas
- Validações em frontend e backend
- Controle de permissões por role e status
- Proteção contra edição não autorizada

**Controle de Acesso**
- Funcionário só edita em status permitidos
- Gerente só acessa avaliações da sua equipe
- Validações de transição de status
- Auditoria completa de ações

#### 🗄️ Banco de Dados

**Novas Colunas**
- `notas_gerente` (JSONB) - Notas do gerente para Q11-Q14
- `comentario_final_funcionario` (TEXT) - Comentário final
- `nota_final` (DECIMAL 3,2) - Nota final calculada
- `read` (BOOLEAN) - Status de leitura de notificações

**Novos Status**
- `aprovada_aguardando_comentario` - Aguardando comentário do funcionário
- `aguardando_finalizacao` - Aguardando finalização do gerente

**Correções**
- Constraint de status atualizada com novos valores
- Foreign key `aprovado_por` corrigida para `users_unified`
- Função RPC `create_notification_bypass_rls` com tipos corretos

#### 🔧 APIs

**Novas Rotas**
- `POST /api/avaliacao-desempenho/avaliacoes/[id]/final-comment` - Comentário final
- `POST /api/avaliacao-desempenho/avaliacoes/[id]/finalize` - Finalização definitiva

**Rotas Atualizadas**
- `POST /api/avaliacao-desempenho/avaliacoes/[id]/approve` - Primeira aprovação
- `PATCH /api/avaliacao/[id]` - Suporte a notas_gerente
- `GET /api/notifications` - Tipos de coluna corrigidos

#### 📊 Questionário

**Critérios de Avaliação do Gerente**
1. Prazos e Metas
2. Comprometimento
3. Autonomia e Proatividade
4. Comunicação, Colaboração e Relacionamento
5. Conhecimento das atividades
6. Resolução de problemas
7. Inteligência Emocional e Solução de conflitos
8. Inovação
9. Liderança - Delegação (apenas líderes)
10. Liderança - Feedback e Desenvolvimento (apenas líderes)

### 🐛 Bug Fixes

- Corrigido erro de coluna `read` não encontrada em notifications
- Corrigido erro de tipo na função RPC de notificações
- Corrigido erro de constraint de status
- Corrigido erro de coluna `nota_final` não encontrada
- Removida duplicidade de cards no dashboard do gerente
- Corrigido bloqueio de edição de avaliações concluídas
- Corrigidas mensagens de email por contexto

### 📝 Documentação

- Criado `VERIFICACAO_MODULO_AVALIACAO.md` com verificação completa
- Documentação de fluxo de status
- Documentação de notificações e emails
- Guia de permissões e controles

### 🔄 Migrations

- `20251201_fix_notifications_missing_columns.sql`
- `20251201_fix_notification_rpc_types.sql`
- `20251201_add_notas_gerente_column.sql`
- `20251201_add_comentario_final_funcionario.sql`
- `20251201_add_nota_final_column.sql`
- `20251201_update_status_constraint.sql`
- `20251201_fix_aprovado_por_fkey.sql`

## [1.2.0] - 2024-08-10

### Adicionado
- Feature flag `avaliacao_weighted_calc`
- Extensões BD: respostas/drafts/settings + metrics weighted
- Admin toggle para método de cálculo (simple/weighted)
- Resumo na página de avaliação
- PDF real de avaliação
- Guardas de Supabase nas rotas cron/períodos

## [1.1.0] - 2024-08-05

### Adicionado
- Guia de onboarding para agentes IA e convenções do projeto
- Ferramentas de diagnóstico e correção de foreign keys
- Ferramentas de diagnóstico de permissões de admin
- Script para executar correção via console do navegador
- Rota API para corrigir email_verified de usuários existentes

### Melhorado
- Alinhar avaliações com planilha AN-TED-002-R0
- Melhorar UX do módulo de avaliação e corrigir layout
- Simplificar verificação de admin e melhorar execução de migrations

### Corrigido
- Correções críticas de autenticação e avaliações
- Corrigir módulo de avaliação - visualização, edição e sistema de lixeira
- Corrigir erros de migração do módulo de avaliação
- Adicionar foreign keys para relacionamento entre avaliacoes e funcionarios
- Marcar email_verified=true para usuários criados pelo admin
- Remover verificação de email_verified para permitir login de todos os usuários

## [1.0.0] - 2024-09-01

### Adicionado
- **Sistema de autenticação completo com Supabase**
  - Login seguro com JWT
  - Verificação em duas etapas
  - Controle de acesso por roles (Admin, Manager, User)
- **Dashboard interativo**
  - Métricas em tempo real
  - Cards customizáveis
- **Sistema de reembolsos**
  - Fluxo completo de solicitação e aprovação
  - Geração de PDF
  - Upload de comprovantes
  - Notificações por email
- **Gestão de usuários**
  - Permissões por role
  - Importação em lote (Excel, CSV)
  - Sistema de banimento
- **Sistema de perfil completo**
  - Upload de fotos via Google Drive
  - Edição de dados pessoais
  - Alteração de senha
  - Configurações de preferências
- **Internacionalização (i18n)**
  - Suporte a PT-BR, EN-US, ES
- **Academia Corporativa**
  - Sistema completo de cursos
  - Geração de certificados
  - Progresso de aprendizado
- **Sistema de Notícias**
  - Feed avançado com comentários
  - Moderação de conteúdo
  - Editor markdown
- **Rede Social Interna**
  - Posts, likes, comentários
  - Interação entre usuários
- **Notificações Push**
  - Web push notifications
  - Service worker
- **Calendário Empresarial**
  - Eventos corporativos
  - Integração ICS
  - Lembretes automáticos
- **Menu Colapsável**
  - Sidebar responsiva
  - Persistência de estado
- **Deploy automatizado no Netlify**
- **Sistema de notificações por email**
  - Templates personalizáveis
  - Múltiplos eventos
- **Interface responsiva e moderna**
  - Design adaptável
  - Tema customizável

### Melhorado
- Migração completa do Prisma para Supabase
- Upload de fotos via Google Drive
- Correção de URLs e configurações de ambiente
- Sistema de logs e histórico de acesso
- Hardening de autenticação e CORS

### Segurança
- Implementação de JWT com bcrypt
- Row Level Security (RLS) no Supabase
- Proteção de rotas com middleware
- Criptografia de senhas
- Auditoria completa

---

## Tipos de Mudanças

- `Adicionado` para novas funcionalidades.
- `Melhorado` para mudanças em funcionalidades existentes.
- `Depreciado` para funcionalidades que serão removidas em breve.
- `Removido` para funcionalidades removidas.
- `Corrigido` para correções de bugs.
- `Segurança` para vulnerabilidades corrigidas.

---

## Links

- [Repositório GitHub](https://github.com/Caiolinooo/painel-abz)
- [Demo Live](https://painelabzgroup.netlify.app)
- [Documentação](./README.md)

---

**Mantido por**: Caio Valerio Goulart Correia
**Email**: caiovaleriogoulartcorreia@gmail.com
