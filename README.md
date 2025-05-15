# Painel ABZ Group

<div align="center">
  <img src="public/images/LC1_Azul.png" alt="ABZ Group Logo" width="300px">
  <br>
  <h3>Plataforma de Gestão Interna</h3>
</div>

## 📋 Sobre o Projeto

O Painel ABZ Group é uma plataforma de gestão interna desenvolvida para centralizar e otimizar processos administrativos da empresa. A plataforma oferece módulos para gerenciamento de usuários, reembolsos, documentos, notícias e outras funcionalidades essenciais para a operação diária.

## 🌟 Principais Características

- **Sistema de Autenticação Seguro**: Login com e-mail/telefone e senha
- **Gerenciamento de Usuários**: Cadastro, importação e controle de acesso
- **Módulo de Reembolso**: Solicitação e aprovação de reembolsos com fluxo completo
- **Módulo de Avaliação de Desempenho**: Sistema para avaliação de funcionários
- **Painel Administrativo**: Interface intuitiva para gestão de todas as funcionalidades
- **Multilíngue**: Suporte para múltiplos idiomas
- **Design Responsivo**: Funciona em dispositivos desktop e móveis
- **Banco de Dados PostgreSQL (Supabase)**: Armazenamento robusto, escalável e relacional
- **API RESTful**: Endpoints para gerenciamento de todos os recursos
- **Upload de Arquivos**: Sistema para upload e gerenciamento de documentos e imagens
- **Personalização**: Configurações de cores, logo, favicon e textos
- **Tabela Unificada de Usuários**: Sistema consolidado de gerenciamento de usuários

## 🚀 Tecnologias Utilizadas

- **Frontend**:
  - [Next.js 14](https://nextjs.org/) - Framework React com SSR e SSG
  - [React](https://reactjs.org/) - Biblioteca JavaScript para interfaces
  - [Tailwind CSS](https://tailwindcss.com/) - Framework CSS utilitário
  - [TypeScript](https://www.typescriptlang.org/) - Superset tipado de JavaScript

- **Backend**:
  - [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction) - API serverless
  - [PostgreSQL](https://www.postgresql.org/) - Banco de dados relacional
  - [Supabase](https://supabase.com/) - Plataforma de banco de dados e autenticação
  - [Prisma](https://www.prisma.io/) - ORM para TypeScript e Node.js

- **Autenticação e Segurança**:
  - [JWT](https://jwt.io/) - Tokens de autenticação
  - [bcrypt](https://github.com/kelektiv/node.bcrypt.js) - Criptografia de senhas

- **Email e Notificações**:
  - [Nodemailer](https://nodemailer.com/) - Envio de e-mails via Exchange Server
  - [Supabase](https://supabase.com/) - Envio de SMS e códigos de verificação

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
SUPABASE_SERVICE_KEY="sua-chave-servico-supabase"

# Chave secreta para JWT
JWT_SECRET="sua-chave-secreta-jwt"

# Configurações do servidor
NEXT_PUBLIC_API_URL="http://localhost:3000/api"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Configurações de Email (Exchange)
EMAIL_SERVER="smtp://seu-usuario:sua-senha@outlook.office365.com:587"
EMAIL_FROM="\"ABZ Group\" <apiabz@groupabz.com>"
EMAIL_USER="apiabz@groupabz.com"
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

### Executando Migrações do Banco de Dados

```bash
npx prisma generate
npx prisma db push
```

### Inicializando o Banco de Dados com Dados Iniciais

```bash
npm run db:setup-postgres
# ou
yarn db:setup-postgres
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

```
painel-abz/
├── public/             # Arquivos estáticos
├── prisma/             # Esquemas e migrações do Prisma
├── scripts/            # Scripts de utilidade e inicialização
├── src/
│   ├── app/            # Rotas e páginas Next.js App Router
│   ├── components/     # Componentes React reutilizáveis
│   ├── contexts/       # Contextos React (auth, i18n, etc.)
│   ├── hooks/          # Hooks personalizados
│   ├── lib/            # Bibliotecas e utilitários
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
- Importação em lote
- Controle de permissões
- Histórico de acesso
- Tabela unificada de usuários

### Reembolsos
- Solicitação de reembolsos
- Upload de comprovantes
- Fluxo de aprovação
- Notificações por e-mail

### Avaliação de Desempenho
- Avaliação de funcionários
- Métricas de desempenho
- Histórico de avaliações
- Relatórios de desempenho

### Documentos
- Repositório de documentos
- Categorização e busca
- Controle de acesso por grupo
- Visualização integrada de PDFs

### Notícias e Comunicados
- Publicação de notícias
- Destaque de conteúdo
- Notificações

### Painel Administrativo
- **Dashboard**: Visão geral do sistema
- **Cards**: Gerenciamento dos cards do dashboard
- **Menu**: Configuração dos itens do menu lateral
- **Configurações**: Personalização do sistema (cores, logo, favicon, textos)

## 🌎 Internacionalização

O sistema suporta múltiplos idiomas, incluindo:
- Português (Brasil)
- Inglês
- Espanhol

## 🔗 API RESTful

O sistema possui uma API RESTful completa para gerenciamento de todos os recursos:

- `/api/auth`: Autenticação e autorização
- `/api/admin`: Endpoints administrativos
- `/api/users`: Gerenciamento de usuários
- `/api/users-unified`: Gerenciamento de usuários unificados
- `/api/cards`: Gerenciamento de cards
- `/api/menu`: Gerenciamento de menu
- `/api/documents`: Gerenciamento de documentos
- `/api/news`: Gerenciamento de notícias
- `/api/reimbursement`: Gerenciamento de reembolsos
- `/api/evaluation`: Gerenciamento de avaliações de desempenho
- `/api/config`: Configurações do sistema
- `/api/upload`: Upload de arquivos
- `/api/token-refresh`: Atualização de tokens de autenticação

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

```
/api/test-email
```

## 🤝 Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-funcionalidade`)
3. Faça commit das suas alterações (`git commit -m 'Adiciona nova funcionalidade'`)
4. Faça push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 📄 Licença

Este projeto é propriedade pessoal de Caio Valerio Goulart Correia. Todos os direitos reservados.
O uso, distribuição ou modificação deste código sem autorização expressa do autor é proibido.

Este software é licenciado sob uma licença proprietária. Veja o arquivo [LICENSE](./LICENSE) para mais detalhes.

## 📞 Contato

Para suporte ou dúvidas, entre em contato através do e-mail pessoal do desenvolvedor: caiovaleriogoulartcorreia@gmail.com

---

<div align="center">
  <p>Desenvolvido com ❤️ por Caio Valerio Goulart Correia</p>
  <div class="social-links" style="margin-top: 10px;">
    <a href="https://www.linkedin.com/in/caio-goulart/" target="_blank">LinkedIn</a> |
    <a href="https://github.com/Caiolinooo" target="_blank">GitHub</a> |
    <a href="https://www.instagram.com/Tal_do_Goulart" target="_blank">Instagram</a>
  </div>
</div>
