# Consolidação das Tabelas de Usuários e Autenticação

Este documento descreve o processo de consolidação das tabelas de usuários e autenticação no banco de dados Supabase.

## Problema

O banco de dados atual possui várias tabelas duplicadas ou com funcionalidades sobrepostas:

1. `User` - Tabela com formato PascalCase, contendo dados de usuários
2. `users` - Tabela com formato snake_case, também contendo dados de usuários
3. `AuthorizedUser` - Tabela para usuários autorizados
4. `user_permissions` - Tabela de permissões de usuários
5. `access_history` - Tabela de histórico de acesso (vazia)
6. `invite_codes` - Tabela de códigos de convite (vazia)
7. `password_reset_tokens` - Tabela de tokens de redefinição de senha (vazia)

Esta duplicação causa problemas de manutenção, consistência de dados e desempenho.

## Solução

A solução implementada consolida essas tabelas em um conjunto menor e mais coeso:

1. `users` - Tabela única para todos os dados de usuários
2. `user_permissions` - Tabela para permissões de usuários
3. `access_history` - Tabela para histórico de acesso

## Processo de Consolidação

O script `scripts/consolidate-user-tables.sql` realiza as seguintes operações:

1. Cria tabelas temporárias para armazenar os dados consolidados
2. Migra dados das tabelas existentes para as tabelas consolidadas
3. Renomeia as tabelas antigas para backup
4. Renomeia as tabelas consolidadas para os nomes finais
5. Cria índices para melhorar o desempenho
6. Cria funções e triggers para manter a tabela de usuários atualizada

## Executando a Consolidação

Para executar a consolidação das tabelas, siga os passos abaixo:

1. Certifique-se de que a variável de ambiente `DATABASE_URL` está configurada corretamente no arquivo `.env`
2. Execute o comando:

```bash
npm run db:consolidate-users
```

## Estrutura da Nova Tabela de Usuários

A nova tabela `users` possui a seguinte estrutura:

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

## Estrutura da Nova Tabela de Permissões

A nova tabela `user_permissions` possui a seguinte estrutura:

```sql
CREATE TABLE user_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  module TEXT NOT NULL,
  feature TEXT,
  can_view BOOLEAN DEFAULT TRUE,
  can_create BOOLEAN DEFAULT FALSE,
  can_edit BOOLEAN DEFAULT FALSE,
  can_delete BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, module, feature)
);
```

## Estrutura da Nova Tabela de Histórico de Acesso

A nova tabela `access_history` possui a seguinte estrutura:

```sql
CREATE TABLE access_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  action TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Backup das Tabelas Antigas

As tabelas antigas são renomeadas com o sufixo `_backup` e mantidas no banco de dados para referência. Após verificar que a consolidação foi bem-sucedida, você pode remover essas tabelas de backup.
