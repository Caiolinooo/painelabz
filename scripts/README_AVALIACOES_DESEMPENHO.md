# Resolução do Erro: "Erro ao carregar avaliações da tabela avaliacoes_desempenho"

Este documento explica como resolver o erro que ocorre ao tentar carregar avaliações da tabela `avaliacoes_desempenho` que não existe no banco de dados.

## Problema

O sistema está tentando acessar uma tabela chamada `avaliacoes_desempenho` que não existe no banco de dados Supabase. Isso causa o seguinte erro:

```
Erro ao carregar avaliações da tabela avaliacoes_desempenho: {}
```

## Solução

Para resolver este problema, você precisa criar a tabela `avaliacoes_desempenho` no banco de dados. Siga os passos abaixo:

### 1. Configurar as variáveis de ambiente

Certifique-se de que você tem um arquivo `.env` na raiz do projeto com as seguintes variáveis configuradas:

```
SUPABASE_DB_HOST=seu-host-supabase
SUPABASE_DB_PORT=5432
SUPABASE_DB_NAME=seu-banco-de-dados
SUPABASE_DB_USER=seu-usuario
SUPABASE_DB_PASSWORD=sua-senha
SUPABASE_DB_SSL=true
```

### 2. Executar o script de criação da tabela

Execute o seguinte comando no terminal:

```bash
node scripts/run-create-avaliacoes-desempenho-table.js
```

Este script irá:
1. Verificar se a tabela `avaliacoes_desempenho` já existe e removê-la se necessário
2. Criar a tabela `avaliacoes_desempenho` com a estrutura correta
3. Criar índices para melhorar o desempenho
4. Configurar triggers para atualização automática do campo `updated_at`
5. Habilitar Row Level Security (RLS) na tabela
6. Criar políticas de segurança para controlar o acesso aos dados
7. Copiar dados existentes da tabela `avaliacoes` para a nova tabela

### 3. Verificar se a tabela foi criada corretamente

Após executar o script, você pode verificar se a tabela foi criada corretamente acessando o painel do Supabase e navegando até a seção "Table Editor".

### 4. Reiniciar a aplicação

Reinicie a aplicação para que as alterações sejam aplicadas:

```bash
npm run dev
```

## Estrutura da Tabela

A tabela `avaliacoes_desempenho` tem a seguinte estrutura:

```sql
CREATE TABLE avaliacoes_desempenho (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  funcionario_id UUID NOT NULL,
  avaliador_id UUID NOT NULL,
  periodo TEXT NOT NULL,
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente',
  pontuacao_total FLOAT DEFAULT 0,
  observacoes TEXT,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

## Observações

- A tabela `avaliacoes_desempenho` é uma cópia da tabela `avaliacoes` com algumas melhorias
- Os dados existentes na tabela `avaliacoes` são copiados para a nova tabela
- As políticas de segurança RLS são configuradas para garantir que os usuários só possam ver as avaliações relevantes para eles

Se você encontrar algum problema durante este processo, entre em contato com o administrador do sistema.
