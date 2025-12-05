# 🚀 Painel ABZ - Sistema de Gestão Empresarial

<div align="center">

![Painel ABZ Logo](public/images/LC1_Azul.png)

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-green?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Netlify](https://img.shields.io/badge/Netlify-Deploy-00C7B7?style=for-the-badge&logo=netlify)](https://netlify.com/)
[![React](https://img.shields.io/badge/React-18.2-61DAFB?style=for-the-badge&logo=react)](https://reactjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Latest-336791?style=for-the-badge&logo=postgresql)](https://postgresql.org/)
[![Version](https://img.shields.io/badge/Version-3.6.2-orange?style=for-the-badge)](#)

**Sistema completo de gestão empresarial com foco em reembolsos, avaliações e administração de usuários**

[🌐 Demo Live](https://painelabzgroup.netlify.app) • [📖 Documentação](#-documentação) • [🚀 Deploy](#-deploy)

</div>

---

## 📋 Sobre o Projeto

O **Painel ABZ** é uma plataforma moderna de gestão empresarial desenvolvida para centralizar e otimizar processos administrativos. Com arquitetura robusta e interface intuitiva, oferece módulos completos para gerenciamento de usuários, sistema de reembolsos, avaliações de desempenho e muito mais.

## ✨ Funcionalidades Principais

### 🏢 **Gestão Empresarial**
- **Dashboard Interativo** - Visão geral com métricas em tempo real e cards customizáveis
- **Sistema de Reembolsos** - Solicitação, aprovação e controle financeiro completo com PDF
- **Gestão de Usuários** - Controle de acesso e permissões granulares por role
- **Avaliações de Desempenho** - Sistema completo de avaliação de funcionários com critérios
- **Módulo de Documentos** - Repositório centralizado com controle de acesso
- **Sistema de Perfil** - Gerenciamento completo de perfis com fotos e configurações
- **Sistema de Banimento** - Controle de usuários banidos com histórico
- **Academia Corporativa** - Sistema de cursos, certificados e treinamentos
- **Calendário Empresarial** - Eventos, notificações e integração ICS
- **Sistema de Notícias** - Feed de notícias com comentários e moderação
- **Rede Social Interna** - Posts, likes, comentários e interação entre usuários
- **WKRadar** - Sistema de gerenciamento de credenciais e seed cards com controle de acesso

### 🔐 **Segurança & Autenticação**
- **Autenticação Supabase** - Login seguro com JWT e verificação em duas etapas
- **Controle de Acesso** - Sistema de roles: Admin, Manager, User
- **Proteção de Rotas** - Middleware de segurança em todas as páginas
- **Auditoria Completa** - Log de ações e alterações do sistema
- **Criptografia** - Senhas com bcrypt e dados sensíveis protegidos
- **ACL Avançado** - Sistema de permissões granulares por módulo
- **Verificação de Email/SMS** - Autenticação em duas etapas

### 🌐 **Experiência do Usuário**
- **Interface Responsiva** - Design adaptável para todos os dispositivos
- **Internacionalização** - Suporte completo a múltiplos idiomas (PT/EN/ES)
- **Tema Customizável** - Cores, logos e favicon personalizáveis via admin
- **Notificações Push** - Sistema de alertas em tempo real via web push
- **Performance** - Carregamento otimizado e cache inteligente
- **Sistema de Perfil Completo** - Upload de fotos, edição de dados e configurações
- **Configurações Personalizadas** - Preferências de tema, idioma e notificações
- **Menu Colapsável** - Sidebar responsiva com persistência de estado
- **Editor Markdown** - Editor avançado com preview em tempo real

### 📊 **Relatórios & Analytics**
- **Métricas de Reembolso** - Análise financeira detalhada com gráficos
- **Performance do Sistema** - Monitoramento em tempo real
- **Exportação** - Relatórios em PDF, Excel e CSV
- **Dashboard Customizável** - Cards e widgets configuráveis

## 🏗️ Arquitetura do Sistema

```mermaid
graph TB
    A[Frontend - Next.js 14] --> B[API Routes]
    B --> C[Supabase Database]
    B --> D[Authentication]
    B --> E[File Storage]

    F[Admin Panel] --> A
    G[User Dashboard] --> A
    H[Reimbursement System] --> A
    I[Evaluation System] --> A

    C --> J[PostgreSQL]
    D --> K[JWT Tokens]
    E --> L[File Upload]

    style A fill:#0066cc,stroke:#fff,color:#fff
    style C fill:#3ecf8e,stroke:#fff,color:#fff
    style F fill:#ff6b6b,stroke:#fff,color:#fff
```

### 🛠️ **Stack Tecnológico**

| Categoria | Tecnologia | Versão | Descrição |
|-----------|------------|--------|-----------|
| **Frontend** | Next.js | 14.2 | Framework React com SSR |
| **React** | React | 18.2 | Biblioteca UI reativa |
| **Linguagem** | TypeScript | 5.0+ | Tipagem estática |
| **Styling** | Tailwind CSS | 3.4+ | Framework CSS utilitário |
| **Database** | Supabase | Latest | PostgreSQL como serviço |
| **Auth** | Supabase Auth | Latest | Autenticação e autorização |
| **Storage** | Google Drive API | Latest | Armazenamento de fotos |
| **Deploy** | Netlify | Latest | Hospedagem e CI/CD |
| **Icons** | React Icons | 5.5+ | Biblioteca de ícones |
| **Email** | Gmail SMTP | Latest | Envio de emails |
| **Security** | bcrypt | Latest | Criptografia de senhas |
| **PDF** | jsPDF | 3.0+ | Geração de PDFs |
| **Forms** | React Hook Form | 7.55+ | Gerenciamento de formulários |
| **Notifications** | Web Push | 3.6+ | Notificações push |
| **Animation** | Framer Motion | 12.6+ | Animações e transições |
| **File Processing** | XLSX | 0.18+ | Processamento de planilhas |
| **Calendar** | React Calendar | 5.1+ | Componente de calendário |
| **Charts** | Chart.js | Latest | Gráficos e visualizações |

## 💻 Requisitos do Sistema

- Node.js 18.x ou superior
- Conta Supabase com PostgreSQL
- NPM 8.x ou superior ou Yarn 1.22.x ou superior
- Conta de email Exchange para envio de emails

## 🔧 Instalação e Configuração

### Clonando o Repositório

```bash
git clone https://github.com/Caiolinooo/painel-abz.git
cd painel-abz
```

### Instalando Dependências

```bash
npm install
# ou
yarn install
```

### Configurando Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```env
# Configurações do PostgreSQL (Supabase)
DATABASE_URL="postgresql://postgres:senha@localhost:5432/abzpainel"
NEXT_PUBLIC_SUPABASE_URL="https://seu-projeto.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="sua-chave-anonima-supabase"
***REMOVED***="sua-chave-servico-supabase"

# Chave secreta para JWT
JWT_SECRET="sua-chave-secreta-jwt"

# Configurações do servidor
NEXT_PUBLIC_API_URL="http://localhost:3000/api"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Configurações de Email (Exchange)
EMAIL_SERVER="smtp://seu-usuario:sua-senha@outlook.office365.com:587"
EMAIL_FROM="\"ABZ Group\" <***REMOVED***>"
EMAIL_USER="***REMOVED***"
EMAIL_PASSWORD="sua-senha"
EMAIL_HOST="outlook.office365.com"
EMAIL_PORT="587"
EMAIL_SECURE="true"

# Configurações de autenticação
ADMIN_PHONE_NUMBER="+5511999999999"
ADMIN_EMAIL="admin@exemplo.com"
ADMIN_PASSWORD="senha-segura"
ADMIN_FIRST_NAME="Admin"
ADMIN_LAST_NAME="ABZ"
```

### Configurando o Banco de Dados

```bash
# Configurar tabelas e funções do Supabase
npm run db:setup

# Verificar estrutura das tabelas
npm run db:check

# Adicionar histórico de acesso aos usuários
npm run db:add-access-history
```

### Iniciando o Servidor de Desenvolvimento

```bash
npm run dev
# ou
yarn dev
```

O servidor estará disponível em `http://localhost:3000`.

### Construindo para Produção

```bash
# Construir para produção com limpeza de cache
npm run build:prod

# Iniciar em modo produção
npm run start:prod

# Implantação completa (build + start)
npm run deploy

# Iniciar com PM2 (recomendado para produção)
npm run start:prod:pm2
```

## 🔐 Autenticação e Autorização

O sistema utiliza um mecanismo de autenticação baseado em JWT com diferentes níveis de acesso:

- **Usuário Padrão**: Acesso básico às funcionalidades
- **Gerente**: Acesso intermediário com permissões adicionais
- **Administrador**: Acesso completo a todas as funcionalidades

Os novos usuários podem ser adicionados de três formas:
1. Cadastro direto (requer aprovação)
2. Convite por e-mail/SMS
3. Importação em lote (Excel, CSV)

### Acesso Inicial

- **Administrador**:
  - E-mail: Definido na variável de ambiente `ADMIN_EMAIL`
  - Senha: Definida na variável de ambiente `ADMIN_PASSWORD`
  - Telefone: Definido na variável de ambiente `ADMIN_PHONE_NUMBER`

## 📚 Estrutura do Projeto

```text
painel-abz/
├── public/             # Arquivos estáticos
│   ├── images/         # Logos e imagens
│   ├── documentos/     # Documentos públicos
│   └── notifications-sw.js # Service Worker para notificações
├── scripts/            # Scripts de utilidade e inicialização
├── supabase/           # Migrações e configurações Supabase
├── src/
│   ├── app/            # Rotas e páginas Next.js App Router
│   │   ├── api/        # API Routes
│   │   ├── admin/      # Painel administrativo
│   │   ├── academy/    # Academia corporativa
│   │   └── profile/    # Sistema de perfil
│   ├── components/     # Componentes React reutilizáveis
│   ├── contexts/       # Contextos React (auth, i18n, etc.)
│   ├── hooks/          # Hooks personalizados
│   ├── lib/            # Bibliotecas e utilitários
│   ├── i18n/           # Arquivos de internacionalização
│   └── types/          # Definições de tipos TypeScript
├── .env                # Variáveis de ambiente (não versionado)
├── .env.example        # Exemplo de variáveis de ambiente
├── next.config.js      # Configuração do Next.js
├── package.json        # Dependências e scripts
├── tailwind.config.js  # Configuração do Tailwind CSS
└── tsconfig.json       # Configuração do TypeScript
```

## 📱 Módulos Principais

### Gerenciamento de Usuários
- Cadastro e edição de usuários
- Importação em lote (Excel, CSV)
- Controle de permissões granulares
- Histórico de acesso e auditoria
- Tabela unificada de usuários
- Sistema de banimento com histórico
- Perfis completos com fotos do Google Drive

### Reembolsos
- Solicitação de reembolsos com formulário completo
- Upload de comprovantes (múltiplos arquivos)
- Fluxo de aprovação com status em tempo real
- Notificações por e-mail automáticas
- Geração de PDF com dados completos
- Configurações de email personalizadas por usuário

### Avaliação de Desempenho
- **Sistema Completo**: Criação, edição e gestão de avaliações
- **Workflow**: Pendente → Em andamento → Finalizado
- **Soft Delete**: Lixeira com exclusão automática após 30 dias
- **Critérios Personalizáveis**: Sistema de pontuação flexível
- **Autoavaliação**: Funcionários podem se autoavaliar
- **Avaliação por Gerentes**: Sistema de aprovação hierárquico
- **Histórico Completo**: Registro de todas as avaliações
- **Relatórios de Desempenho**: Análise detalhada com gráficos
- **Notificações Automáticas**: Alertas sobre novas avaliações

### Documentos
- Repositório de documentos
- Categorização e busca
- Controle de acesso por grupo
- Visualização integrada de PDFs

### Sistema de Perfil Completo
- **Upload de Fotos**: Integração com Google Drive para armazenamento
- **Edição de Dados**: Informações pessoais e profissionais completas
- **Alteração de Senha**: Sistema seguro com validação
- **Configurações de Preferências**: Tema, idioma e notificações
- **Configurações de Email**: Personalização para reembolsos
- **Interface Responsiva**: Design moderno e intuitivo

### Academia Corporativa
- **Cursos Online**: Sistema completo de e-learning
- **Certificados**: Geração automática com templates personalizáveis
- **Progresso**: Acompanhamento detalhado do aprendizado
- **Avaliações**: Sistema de notas e feedback
- **Comentários**: Interação entre alunos e instrutores

### Sistema de Notícias e Comunicação
- **Feed de Notícias**: Publicação com editor markdown avançado
- **Comentários**: Sistema de comentários com moderação
- **Rede Social**: Posts, likes e interações entre usuários
- **Notificações Push**: Alertas em tempo real via web push
- **Editor Fullscreen**: Interface imersiva para criação de conteúdo

### Calendário Empresarial
- **Eventos**: Criação e gerenciamento de eventos corporativos
- **Integração ICS**: Sincronização com calendários externos
- **Notificações**: Lembretes automáticos por email
- **Configurações**: Personalização por usuário e empresa

### Painel Administrativo
- **Dashboard**: Visão geral do sistema com métricas em tempo real
- **Cards**: Gerenciamento dos cards do dashboard
- **Menu**: Configuração dos itens do menu lateral colapsável
- **Configurações**: Personalização do sistema (cores, logo, favicon, textos)
- **Usuários Banidos**: Controle de acesso com histórico
- **Permissões ACL**: Sistema granular de controle de acesso
- **Auditoria**: Logs completos de ações do sistema

### WKRadar
- **Gerenciamento de Credenciais**: CRUD completo de credenciais WKRadar
- **Seed Cards**: Visualização pública de cartões de sementes
- **Interface Administrativa**: Painel dedicado para administradores
- **API RESTful**: Endpoints completos para integração
- **Controle de Acesso**: Permissões específicas por usuário
- **Migrações de Banco**: Tabelas dedicadas com estrutura otimizada

## 📱 Screenshots do Sistema

### 🏠 **Dashboard Principal**
![Dashboard](https://via.placeholder.com/800x400/0066CC/FFFFFF?text=Dashboard+Principal)
*Dashboard com métricas em tempo real e cards customizáveis*

### 💰 **Sistema de Reembolsos**
![Reembolsos](https://via.placeholder.com/800x400/28A745/FFFFFF?text=Sistema+de+Reembolsos)
*Interface completa para solicitação e aprovação de reembolsos*

### 👥 **Gestão de Usuários**
![Usuários](https://via.placeholder.com/800x400/DC3545/FFFFFF?text=Gestão+de+Usuários)
*Painel administrativo para gerenciamento de usuários e permissões*

### 📊 **Relatórios e Analytics**
![Relatórios](https://via.placeholder.com/800x400/FFC107/000000?text=Relatórios+e+Analytics)
*Gráficos interativos e relatórios detalhados*

---

## 🗺️ Roadmap de Desenvolvimento

### ✅ **Concluído (v1.0)**
- [x] Sistema de autenticação completo com Supabase
- [x] Dashboard interativo com métricas em tempo real
- [x] Sistema de reembolsos com fluxo completo e PDF
- [x] Gestão de usuários e permissões por role
- [x] Sistema de perfil completo com upload de fotos
- [x] Sistema de avaliações de desempenho funcional
- [x] Sistema de banimento de usuários
- [x] Internacionalização (PT/EN/ES)
- [x] Deploy automatizado no Netlify
- [x] Sistema de notificações por email
- [x] Interface responsiva e moderna
- [x] Integração com Google Drive para fotos
- [x] Configurações personalizadas por usuário
- [x] Academia corporativa com certificados
- [x] Sistema de notícias com comentários
- [x] Rede social interna
- [x] Notificações push web
- [x] Menu colapsável responsivo
- [x] Editor markdown avançado
- [x] Sistema de calendário empresarial
- [x] Módulo WKRadar para gerenciamento de credenciais

### 🚧 **Em Desenvolvimento (v3.7)**
- [ ] Sistema de avaliações avançado com métricas
- [ ] Relatórios em PDF com gráficos
- [ ] API mobile para aplicativo
- [ ] Integração com sistemas externos (ERP)
- [ ] Dashboard de BI avançado
- [ ] Sistema de workflows automatizados
- [ ] Chat interno em tempo real

### 🔮 **Planejado (v2.0)**
- [ ] Módulo de RH completo
- [ ] BI e Analytics com Machine Learning
- [ ] Aplicativo mobile nativo (React Native)
- [ ] Integração com Microsoft 365
- [ ] Sistema de videoconferência
- [ ] Automação de processos com IA

---

## 🆕 Atualizações Recentes

### **Dezembro 2024 (v3.6.2)**
- ✅ **Aprimoramento de Segurança WKRadar**: Migração para URL HTTPS direta
  - Removido proxy intermediário do Next.js
  - Implementado acesso direto via HTTPS (vm.groupabz.com)
  - Melhor performance e segurança sem proxy reverso
  - Simplificação da arquitetura de acesso ao Guacamole

### **Dezembro 2024 (v3.6.1)**
- ✅ **Correção de Segurança WKRadar**: Implementado proxy Next.js para Guacamole
  - Resolvido problema de Mixed Content (HTTP/HTTPS)
  - URL relativa para melhor segurança e compatibilidade
  - Configuração de rewrites no next.config.js

### **Dezembro 2024 (v3.6.0)**
- ✅ **Módulo WKRadar**: Sistema completo de gerenciamento de credenciais e seed cards
  - Interface administrativa para gestão de credenciais
  - Página pública para visualização de seed cards
  - API RESTful completa para operações CRUD
  - Migrações de banco de dados com tabelas dedicadas
  - Controle de acesso e permissões granulares
- ✅ **Internacionalização**: Traduções completas para PT-BR e EN-US do módulo WKRadar
- ✅ **Versionamento**: Sistema de controle de versão aprimorado

### **Novembro 2024 (v3.5.0)**
- ✅ **Sistema de Avaliação Refatorado**: Correção de bugs críticos e melhoria de performance
  - Corrigido erro 400 na criação de avaliações (coluna resultado)
  - Implementado sistema de soft delete com lixeira (30 dias)
  - Melhorado sistema de tradução do menu lateral
  - Otimizado cache e performance do sistema
- ✅ **Segurança Aprimorada**: Hardening de autenticação e permissões
- ✅ **Estabilidade do Sistema**: Correção de bugs e melhorias gerais

### **Setembro 2024**
- ✅ **Academia Corporativa**: Sistema completo de cursos, certificados e templates
- ✅ **Notificações Push**: Implementação de web push notifications com service worker
- ✅ **Sistema de Notícias**: Feed avançado com comentários, moderação e editor markdown
- ✅ **Rede Social Interna**: Posts, likes, comentários e interação entre usuários
- ✅ **Calendário Empresarial**: Eventos, notificações ICS e configurações personalizadas
- ✅ **Editor Fullscreen**: Editor markdown com preview em tempo real
- ✅ **Melhorias de UX**: Menu colapsável, saudação personalizada, tema consistente

### **Agosto 2024**
- ✅ **Correções de Segurança**: Hardening de autenticação e CORS
- ✅ **Migração Supabase**: Transição completa do Prisma para Supabase
- ✅ **Sistema de Perfil**: Upload de fotos via Google Drive e configurações avançadas
- ✅ **Deploy Netlify**: Correção de URLs e configurações de ambiente
- ✅ **Auditoria Completa**: Sistema de logs e histórico de acesso

---

## 🌎 Internacionalização

O sistema possui suporte completo a múltiplos idiomas:

| Idioma | Status | Cobertura |
|--------|--------|-----------|
| 🇧🇷 **Português (Brasil)** | ✅ Completo | 100% |
| 🇺🇸 **Inglês** | ✅ Completo | 95% |
| 🇪🇸 **Espanhol** | 🚧 Em desenvolvimento | 80% |

## 🔗 API RESTful

O sistema possui uma API RESTful completa para gerenciamento de todos os recursos:

- `/api/auth`: Autenticação e autorização
- `/api/admin`: Endpoints administrativos
- `/api/users`: Gerenciamento de usuários
- `/api/users-unified`: Gerenciamento de usuários unificados
- `/api/users-unified/profile`: Gerenciamento de perfis de usuário
- `/api/users-unified/upload-photo`: Upload de fotos de perfil
- `/api/admin/banned-users`: Gerenciamento de usuários banidos
- `/api/cards`: Gerenciamento de cards
- `/api/menu`: Gerenciamento de menu
- `/api/documents`: Gerenciamento de documentos
- `/api/news`: Gerenciamento de notícias
- `/api/reimbursement`: Gerenciamento de reembolsos
- `/api/reimbursement-settings`: Configurações de reembolso
- `/api/avaliacao-desempenho`: Gerenciamento de avaliações de desempenho
- `/api/config`: Configurações do sistema
- `/api/upload`: Upload de arquivos
- `/api/token-refresh`: Atualização de tokens de autenticação
- `/api/academy`: Sistema de academia corporativa
- `/api/calendar`: Gerenciamento de calendário
- `/api/social`: Rede social interna
- `/api/notifications`: Sistema de notificações push
- `/api/wkradar`: Gerenciamento de credenciais e seed cards WKRadar

## 📧 Sistema de Email

O sistema possui um sistema de envio de emails para notificações e comunicações com os usuários, utilizando o servidor Exchange da empresa. Os emails são enviados nos seguintes casos:

1. **Aprovação de Acesso**: Quando um administrador aprova uma solicitação de acesso
2. **Código de Convite**: Quando um administrador envia um código de convite
3. **Solicitação de Reembolso**: Quando um usuário envia uma solicitação de reembolso
4. **Aprovação/Rejeição de Reembolso**: Quando um administrador processa uma solicitação
5. **Verificação de Login**: Envio de códigos de verificação para login
6. **Avaliação de Desempenho**: Notificações sobre novas avaliações

### Testando o Envio de Email

Você pode testar a configuração de email acessando a rota:

```http
GET /api/test-email
```

## 🤝 Como Contribuir

Contribuições são sempre bem-vindas! Siga os passos abaixo:

### 📝 **Processo de Contribuição**

1. **Fork** o projeto
2. **Clone** seu fork: `git clone https://github.com/seu-usuario/painelabz.git`
3. **Crie** uma branch: `git checkout -b feature/nova-funcionalidade`
4. **Desenvolva** sua funcionalidade
5. **Teste** suas alterações
6. **Commit** com mensagem descritiva: `git commit -m 'feat: adiciona nova funcionalidade'`
7. **Push** para sua branch: `git push origin feature/nova-funcionalidade`
8. **Abra** um Pull Request

### 🐛 **Reportar Bugs**

Use as [Issues](https://github.com/Caiolinooo/painelabz/issues) para reportar bugs:

- **Descreva** o problema detalhadamente
- **Inclua** steps para reproduzir
- **Adicione** screenshots se necessário
- **Especifique** seu ambiente (OS, browser, etc.)

### 💡 **Sugerir Funcionalidades**

Tem uma ideia? Abra uma [Issue](https://github.com/Caiolinooo/painelabz/issues) com:

- **Descrição** clara da funcionalidade
- **Justificativa** do valor que agregaria
- **Mockups** ou exemplos (se aplicável)

---

## 📊 Estatísticas do Projeto

<div align="center">

![GitHub stars](https://img.shields.io/github/stars/Caiolinooo/painelabz?style=social)
![GitHub forks](https://img.shields.io/github/forks/Caiolinooo/painelabz?style=social)
![GitHub issues](https://img.shields.io/github/issues/Caiolinooo/painelabz)
![GitHub pull requests](https://img.shields.io/github/issues-pr/Caiolinooo/painelabz)

</div>

---

## 📄 Licença

Este projeto é propriedade de **Caio Valerio Goulart Correia**.

**Licença Proprietária** - Todos os direitos reservados. O uso, distribuição ou modificação deste código sem autorização expressa é proibido.

Para licenciamento comercial, entre em contato: [caiovaleriogoulartcorreia@gmail.com](mailto:caiovaleriogoulartcorreia@gmail.com)

---

## 📞 Contato & Suporte

<div align="center">

### 👨‍💻 **Desenvolvedor Principal**
**Caio Valerio Goulart Correia**

[![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/caio-goulart/)
[![GitHub](https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white)](https://github.com/Caiolinooo)
[![Instagram](https://img.shields.io/badge/Instagram-E4405F?style=for-the-badge&logo=instagram&logoColor=white)](https://www.instagram.com/Tal_do_Goulart)
[![Email](https://img.shields.io/badge/Email-D14836?style=for-the-badge&logo=gmail&logoColor=white)](mailto:caiovaleriogoulartcorreia@gmail.com)

### 🏢 **Suporte Empresarial**
Para suporte técnico ou dúvidas sobre implementação:
📧 **Email:** [caiovaleriogoulartcorreia@gmail.com](mailto:caiovaleriogoulartcorreia@gmail.com)

---

**Desenvolvido com ❤️ e muito ☕ por Caio Valerio Goulart Correia**

*"Transformando ideias em soluções digitais que fazem a diferença"*

</div>
