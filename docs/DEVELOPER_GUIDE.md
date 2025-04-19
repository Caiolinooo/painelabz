# Guia do Desenvolvedor - Painel ABZ

Este guia fornece informações técnicas para desenvolvedores que desejam estender, personalizar ou manter o Painel ABZ.

## Índice

1. [Visão Geral da Arquitetura](#visão-geral-da-arquitetura)
2. [Ambiente de Desenvolvimento](#ambiente-de-desenvolvimento)
3. [Estrutura do Projeto](#estrutura-do-projeto)
4. [Banco de Dados](#banco-de-dados)
5. [Autenticação e Autorização](#autenticação-e-autorização)
6. [API](#api)
7. [Frontend](#frontend)
8. [Extensão do Sistema](#extensão-do-sistema)
9. [Deployment](#deployment)
10. [Boas Práticas](#boas-práticas)

## Visão Geral da Arquitetura

O Painel ABZ é construído com uma arquitetura moderna baseada em:

- **Frontend**: Next.js com App Router, React e TailwindCSS
- **Backend**: API Routes do Next.js com Node.js
- **Banco de Dados**: PostgreSQL com Prisma ORM
- **Autenticação**: JWT (JSON Web Tokens)

A aplicação segue uma arquitetura de camadas:

1. **Interface do Usuário**: Componentes React e páginas Next.js
2. **Lógica de Negócios**: Contextos React e serviços
3. **API**: Endpoints RESTful para comunicação com o banco de dados
4. **Persistência**: Prisma ORM para interação com o PostgreSQL

## Ambiente de Desenvolvimento

### Requisitos

- Node.js 18.x ou superior
- PostgreSQL 14.x ou superior
- npm 8.x ou superior

### Configuração Inicial

1. Clone o repositório:

```bash
git clone https://github.com/seu-usuario/painel-abz.git
cd painel-abz
```

2. Instale as dependências:

```bash
npm install
```

3. Configure o arquivo `.env`:

```
DATABASE_URL="postgresql://usuario:senha@localhost:5432/abz_painel?schema=public"
JWT_SECRET="sua-chave-secreta-para-jwt"
NEXT_PUBLIC_API_URL="http://localhost:3000/api"
```

4. Configure o banco de dados:

```bash
npm run db:setup
```

5. Inicie o servidor de desenvolvimento:

```bash
npm run dev
```

### Scripts Disponíveis

- `npm run dev`: Inicia o servidor de desenvolvimento
- `npm run build`: Compila o projeto para produção
- `npm run start`: Inicia o servidor de produção
- `npm run start:prod`: Inicia o servidor de produção com o Express
- `npm run lint`: Executa o linter
- `npm run prisma:generate`: Gera o cliente Prisma
- `npm run prisma:migrate`: Executa as migrações do Prisma
- `npm run prisma:studio`: Abre o Prisma Studio para visualizar o banco de dados
- `npm run prisma:seed`: Popula o banco de dados com dados iniciais
- `npm run db:setup`: Configura o banco de dados (migrações, cliente e seed)

## Estrutura do Projeto

```
├── prisma/              # Configuração do Prisma e migrações
│   ├── schema.prisma    # Schema do banco de dados
│   └── seed.ts          # Script para popular o banco de dados
├── public/              # Arquivos estáticos
├── scripts/             # Scripts utilitários
├── src/
│   ├── app/             # Páginas da aplicação (Next.js App Router)
│   │   ├── admin/       # Painel administrativo
│   │   ├── api/         # Endpoints da API
│   │   └── ...          # Outras páginas
│   ├── components/      # Componentes React
│   │   ├── Admin/       # Componentes do painel administrativo
│   │   ├── Auth/        # Componentes de autenticação
│   │   └── Layout/      # Componentes de layout
│   ├── contexts/        # Contextos React
│   │   └── AuthContext.tsx  # Contexto de autenticação
│   ├── data/            # Dados estáticos
│   └── lib/             # Utilitários e funções auxiliares
│       ├── auth.ts      # Funções de autenticação
│       ├── db.ts        # Cliente Prisma
│       ├── jwt.ts       # Funções para JWT
│       └── password.ts  # Funções para hash de senha
├── .env                 # Variáveis de ambiente
├── next.config.js       # Configuração do Next.js
├── package.json         # Dependências e scripts
├── server.js            # Servidor Express para produção
└── tailwind.config.ts   # Configuração do TailwindCSS
```

## Banco de Dados

O sistema utiliza PostgreSQL com Prisma ORM para gerenciamento do banco de dados.

### Schema do Prisma

O schema do banco de dados está definido em `prisma/schema.prisma` e inclui os seguintes modelos:

- `User`: Usuários do sistema
- `SiteConfig`: Configurações do site
- `Card`: Cards do dashboard
- `MenuItem`: Itens do menu lateral
- `Document`: Documentos (políticas, manuais, etc.)
- `News`: Notícias e comunicados

### Migrações

Para criar uma nova migração após alterar o schema:

```bash
npx prisma migrate dev --name nome-da-migracao
```

### Prisma Studio

Para visualizar e editar os dados do banco de dados:

```bash
npx prisma studio
```

## Autenticação e Autorização

O sistema utiliza JWT (JSON Web Tokens) para autenticação e autorização.

### Fluxo de Autenticação

1. O usuário envia credenciais para `/api/auth/login`
2. O servidor valida as credenciais e gera um token JWT
3. O token é armazenado no localStorage do navegador
4. O token é enviado em todas as requisições subsequentes no cabeçalho `Authorization`
5. O middleware verifica o token e autoriza ou rejeita a requisição

### Arquivos Relevantes

- `src/lib/jwt.ts`: Funções para gerar e verificar tokens JWT
- `src/lib/password.ts`: Funções para hash e verificação de senhas
- `src/contexts/AuthContext.tsx`: Contexto React para gerenciar o estado de autenticação
- `src/middleware.ts`: Middleware para proteção de rotas
- `src/components/Auth/ProtectedRoute.tsx`: Componente para proteger rotas no cliente

## API

O sistema possui uma API RESTful completa para gerenciamento de todos os recursos.

### Endpoints

- `/api/auth/login`: Autenticação de usuários
- `/api/auth/register`: Registro de novos usuários
- `/api/auth/me`: Obter dados do usuário atual
- `/api/cards`: Gerenciamento de cards
- `/api/menu`: Gerenciamento de itens de menu
- `/api/documents`: Gerenciamento de documentos
- `/api/news`: Gerenciamento de notícias
- `/api/users`: Gerenciamento de usuários
- `/api/config`: Configurações do sistema
- `/api/upload`: Upload de arquivos

### Estrutura dos Endpoints

Cada recurso segue o padrão RESTful:

- `GET /api/recurso`: Listar todos os recursos
- `POST /api/recurso`: Criar um novo recurso
- `GET /api/recurso/[id]`: Obter um recurso específico
- `PUT /api/recurso/[id]`: Atualizar um recurso específico
- `DELETE /api/recurso/[id]`: Excluir um recurso específico

## Frontend

O frontend é construído com Next.js, React e TailwindCSS.

### Componentes Principais

- `src/components/Layout/MainLayout.tsx`: Layout principal do sistema
- `src/app/admin/layout.tsx`: Layout do painel administrativo
- `src/components/Auth/ProtectedRoute.tsx`: Componente para proteger rotas

### Estilos

O sistema utiliza TailwindCSS para estilização. As cores personalizadas estão definidas em `tailwind.config.ts`:

```typescript
colors: {
  'abz-purple': '#6339F5',
  'abz-purple-dark': '#5128D4',
  'abz-blue-dark': '#0D1B42',
  'abz-blue': '#005dff',
  // ...outras cores
}
```

## Extensão do Sistema

O sistema foi projetado para ser facilmente extensível.

### Adicionar uma Nova Página

1. Crie um novo diretório em `src/app/` com o nome da página
2. Crie um arquivo `page.tsx` dentro do diretório
3. Implemente o componente da página
4. Adicione a página ao menu em `src/data/menu.ts`

### Adicionar um Novo Recurso à API

1. Crie um novo diretório em `src/app/api/` com o nome do recurso
2. Crie um arquivo `route.ts` para os endpoints principais
3. Crie um diretório `[id]` com um arquivo `route.ts` para endpoints específicos
4. Adicione o modelo ao schema do Prisma em `prisma/schema.prisma`
5. Execute `npx prisma migrate dev` para criar a tabela no banco de dados

### Adicionar um Novo Tipo de Conteúdo

1. Adicione o modelo ao schema do Prisma em `prisma/schema.prisma`
2. Crie os endpoints da API para o novo recurso
3. Crie uma página de administração em `src/app/admin/`
4. Adicione o item ao menu administrativo em `src/app/admin/layout.tsx`
5. Crie uma página pública para exibir o conteúdo em `src/app/`

## Deployment

### Preparação para Produção

1. Compile o projeto:

```bash
npm run build
```

2. Inicie o servidor de produção:

```bash
npm run start:prod
```

### Variáveis de Ambiente para Produção

Certifique-se de configurar as seguintes variáveis de ambiente em produção:

```
DATABASE_URL="postgresql://usuario:senha@host:5432/abz_painel?schema=public"
JWT_SECRET="chave-secreta-forte-para-producao"
NEXT_PUBLIC_API_URL="https://seu-dominio.com/api"
NODE_ENV="production"
```

### Considerações para Deployment

- Configure um proxy reverso (Nginx, Apache) para servir a aplicação
- Configure HTTPS para segurança
- Configure um serviço de backup para o banco de dados
- Considere usar um serviço de armazenamento de arquivos (S3, GCS) para uploads

## Boas Práticas

### Código

- Siga o padrão de nomenclatura existente
- Use TypeScript para tipagem estática
- Documente funções e componentes complexos
- Escreva testes para funcionalidades críticas

### Segurança

- Nunca armazene senhas em texto plano
- Sempre valide entradas do usuário
- Use HTTPS em produção
- Implemente rate limiting para endpoints sensíveis
- Mantenha as dependências atualizadas

### Performance

- Otimize imagens e assets estáticos
- Use carregamento lazy para componentes pesados
- Implemente cache para consultas frequentes
- Monitore o desempenho em produção

## Suporte

Para suporte técnico ou dúvidas sobre o desenvolvimento, entre em contato com a equipe de desenvolvimento através do e-mail suporte@groupabz.com.
