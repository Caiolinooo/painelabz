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
- **Painel Administrativo**: Interface intuitiva para gestão de todas as funcionalidades
- **Multilíngue**: Suporte para múltiplos idiomas
- **Design Responsivo**: Funciona em dispositivos desktop e móveis
- **Banco de Dados MongoDB**: Armazenamento robusto e escalável sem esquema fixo
- **API RESTful**: Endpoints para gerenciamento de todos os recursos
- **Upload de Arquivos**: Sistema para upload e gerenciamento de documentos e imagens
- **Personalização**: Configurações de cores, logo, favicon e textos

## 🚀 Tecnologias Utilizadas

- **Frontend**:
  - [Next.js 14](https://nextjs.org/) - Framework React com SSR e SSG
  - [React](https://reactjs.org/) - Biblioteca JavaScript para interfaces
  - [Tailwind CSS](https://tailwindcss.com/) - Framework CSS utilitário
  - [TypeScript](https://www.typescriptlang.org/) - Superset tipado de JavaScript

- **Backend**:
  - [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction) - API serverless
  - [MongoDB](https://www.mongodb.com/) - Banco de dados NoSQL
  - [Prisma](https://www.prisma.io/) - ORM para TypeScript e Node.js
  - [Mongoose](https://mongoosejs.com/) - ODM para MongoDB

- **Autenticação e Segurança**:
  - [JWT](https://jwt.io/) - Tokens de autenticação
  - [bcrypt](https://github.com/kelektiv/node.bcrypt.js) - Criptografia de senhas

- **Email e Notificações**:
  - [Nodemailer](https://nodemailer.com/) - Envio de e-mails
  - [Twilio](https://www.twilio.com/) - Envio de SMS

## 💻 Requisitos do Sistema

- Node.js 18.x ou superior
- MongoDB 5.x ou superior
- NPM 8.x ou superior ou Yarn 1.22.x ou superior
- Conta Twilio para envio de SMS (opcional para desenvolvimento)

## 🔧 Instalação e Configuração

### Clonando o Repositório

```bash
git clone https://github.com/seu-usuario/painel-abz.git
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
# Banco de dados MongoDB
MONGODB_URI="mongodb+srv://usuario:senha@seu-cluster.mongodb.net/abzpainel"

# Chave secreta para JWT
JWT_SECRET="sua-chave-secreta-jwt"

# Configurações do servidor
NEXT_PUBLIC_API_URL="http://localhost:3000/api"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Configurações do Twilio (opcional para SMS)
TWILIO_ACCOUNT_SID="seu-account-sid"
TWILIO_AUTH_TOKEN="seu-auth-token"
TWILIO_VERIFY_SERVICE_SID="seu-verify-service-sid"

# Configurações de Email
EMAIL_SERVER="smtp://seu-usuario:sua-senha@seu-servidor-smtp:587"
EMAIL_FROM="\"ABZ Group\" <seu-email@exemplo.com>"
EMAIL_USER="seu-usuario"
EMAIL_PASSWORD="sua-senha"
EMAIL_HOST="seu-servidor-smtp"
EMAIL_PORT="587"
EMAIL_SECURE="false"

# Configurações de autenticação
ADMIN_PHONE_NUMBER="+5511999999999"
ADMIN_EMAIL="admin@exemplo.com"
ADMIN_PASSWORD="senha-segura"
VERIFICATION_CODE_EXPIRY_MINUTES=15
PASSWORD_EXPIRY_DAYS=365
```

### Executando Migrações do Banco de Dados

```bash
npx prisma generate
npx prisma db push
```

### Inicializando o Banco de Dados com Dados Iniciais

```bash
npm run db:seed
# ou
yarn db:seed
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
npm run build
npm start
# ou
yarn build
yarn start
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
├── src/
│   ├── app/            # Rotas e páginas Next.js App Router
│   ├── components/     # Componentes React reutilizáveis
│   ├── contexts/       # Contextos React (auth, i18n, etc.)
│   ├── hooks/          # Hooks personalizados
│   ├── lib/            # Bibliotecas e utilitários
│   ├── models/         # Modelos Mongoose
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

### Reembolsos
- Solicitação de reembolsos
- Upload de comprovantes
- Fluxo de aprovação
- Notificações por e-mail

### Documentos
- Repositório de documentos
- Categorização e busca
- Controle de acesso por grupo

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
- `/api/cards`: Gerenciamento de cards
- `/api/menu`: Gerenciamento de menu
- `/api/documents`: Gerenciamento de documentos
- `/api/news`: Gerenciamento de notícias
- `/api/reimbursement`: Gerenciamento de reembolsos
- `/api/config`: Configurações do sistema
- `/api/upload`: Upload de arquivos

## 📧 Sistema de Email

O sistema possui um sistema de envio de emails para notificações e comunicações com os usuários. Os emails são enviados nos seguintes casos:

1. **Aprovação de Acesso**: Quando um administrador aprova uma solicitação de acesso
2. **Código de Convite**: Quando um administrador envia um código de convite
3. **Solicitação de Reembolso**: Quando um usuário envia uma solicitação de reembolso
4. **Aprovação/Rejeição de Reembolso**: Quando um administrador processa uma solicitação

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

Este projeto está licenciado sob a [Licença MIT](LICENSE).

## 📞 Suporte

Para suporte ou dúvidas, entre em contato através do e-mail: suporte@abzgroup.com.br

---

<div align="center">
  <p>Desenvolvido com ❤️ por ABZ Group</p>
</div>
