# Consolidação Completa das Tabelas no Supabase

Este documento descreve o processo completo de consolidação das tabelas no banco de dados Supabase, incluindo a consolidação das tabelas de usuários e a adição das tabelas do módulo de avaliação de desempenho.

## Visão Geral

O processo de consolidação consiste em três etapas principais:

1. **Consolidação das tabelas de usuários**: Unifica as tabelas `User`, `users` e `AuthorizedUser` em uma única tabela `users`.
2. **Criação das tabelas do módulo de avaliação**: Cria as tabelas necessárias para o módulo de avaliação de desempenho.
3. **População da tabela de funcionários**: Popula a tabela `funcionarios` com dados da tabela `users`.

## Tabelas Consolidadas

### Tabelas de Usuários

- `users`: Tabela única para todos os dados de usuários
- `user_permissions`: Tabela para permissões de usuários
- `access_history`: Tabela para histórico de acesso

### Tabelas do Módulo de Avaliação

- `funcionarios`: Tabela de funcionários (vinculada à tabela `users`)
- `criterios`: Tabela de critérios de avaliação
- `avaliacoes`: Tabela de avaliações de desempenho
- `pontuacoes`: Tabela de pontuações para cada critério em uma avaliação

## Estrutura das Tabelas

### Tabela `users`

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE,
  phone_number TEXT UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  password TEXT,
  role TEXT NOT NULL DEFAULT 'USER' CHECK (role IN ('ADMIN', 'USER', 'MANAGER')),
  position TEXT,
  department TEXT,
  avatar TEXT,
  verification_code TEXT,
  verification_code_expires TIMESTAMP WITH TIME ZONE,
  invite_code TEXT,
  invite_sent BOOLEAN DEFAULT FALSE,
  invite_sent_at TIMESTAMP WITH TIME ZONE,
  invite_accepted BOOLEAN DEFAULT FALSE,
  invite_accepted_at TIMESTAMP WITH TIME ZONE,
  password_last_changed TIMESTAMP WITH TIME ZONE,
  active BOOLEAN DEFAULT TRUE,
  access_permissions JSONB,
  access_history JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Tabela `funcionarios`

```sql
CREATE TABLE funcionarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  cargo TEXT,
  departamento TEXT,
  data_admissao DATE,
  email TEXT UNIQUE,
  matricula TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo', 'afastado', 'ferias')),
  user_id UUID REFERENCES users(id),
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

### Tabela `criterios`

```sql
CREATE TABLE criterios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  descricao TEXT NOT NULL,
  categoria TEXT NOT NULL,
  peso FLOAT NOT NULL DEFAULT 1.0,
  pontuacao_maxima INTEGER NOT NULL DEFAULT 5,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

### Tabela `avaliacoes`

```sql
CREATE TABLE avaliacoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  funcionario_id UUID NOT NULL REFERENCES funcionarios(id),
  avaliador_id UUID NOT NULL REFERENCES funcionarios(id),
  periodo TEXT NOT NULL,
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_andamento', 'concluida', 'cancelada')),
  pontuacao_total FLOAT DEFAULT 0,
  observacoes TEXT,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

### Tabela `pontuacoes`

```sql
CREATE TABLE pontuacoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  avaliacao_id UUID NOT NULL REFERENCES avaliacoes(id),
  criterio_id UUID NOT NULL REFERENCES criterios(id),
  valor FLOAT NOT NULL CHECK (valor >= 0),
  observacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(avaliacao_id, criterio_id)
);
```

## Funcionalidades Especiais

### Cálculo Automático de Pontuação

O sistema inclui um trigger que calcula automaticamente a pontuação total de uma avaliação com base nas pontuações individuais dos critérios, levando em consideração o peso de cada critério.

### Soft Delete

As tabelas `funcionarios` e `avaliacoes` suportam soft delete através do campo `deleted_at`, permitindo a recuperação de registros excluídos.

### Segurança por Linha (RLS)

Todas as tabelas têm políticas de segurança por linha (Row Level Security) configuradas para garantir que os usuários só possam acessar os dados aos quais têm permissão.

## Executando a Consolidação

Para executar a consolidação completa das tabelas, siga os passos abaixo:

1. Certifique-se de que a variável de ambiente `DATABASE_URL` está configurada corretamente no arquivo `.env`
2. Execute o comando:

```bash
npm run db:consolidate-all
```

Este comando executará os seguintes scripts em sequência:

1. `run-consolidate-user-tables.js`: Consolida as tabelas de usuários
2. `run-create-avaliacao-tables.js`: Cria as tabelas do módulo de avaliação
3. `populate-funcionarios.js`: Popula a tabela de funcionários com dados da tabela de usuários

## Scripts Individuais

Se preferir executar os scripts individualmente, você pode usar os seguintes comandos:

```bash
# Consolidar apenas as tabelas de usuários
npm run db:consolidate-users

# Criar apenas as tabelas do módulo de avaliação
npm run db:create-avaliacao-tables

# Popular apenas a tabela de funcionários
npm run db:populate-funcionarios
```

## Verificação

Após a consolidação, você pode verificar se as tabelas foram criadas corretamente usando o Prisma Studio:

```bash
npm run prisma:studio
```

## Backup das Tabelas Antigas

As tabelas antigas são renomeadas com o sufixo `_backup` e mantidas no banco de dados para referência. Após verificar que a consolidação foi bem-sucedida, você pode remover essas tabelas de backup.
