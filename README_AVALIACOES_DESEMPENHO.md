# Resolução do Erro: "Erro ao carregar avaliações da tabela avaliacoes_desempenho"

Este documento explica como resolver o erro que ocorre ao tentar carregar avaliações da tabela `avaliacoes_desempenho` que não existe no banco de dados.

**Status: Resolvido** ✅ - A tabela foi criada com sucesso e já contém dados.

## Problema

O sistema está tentando acessar uma tabela chamada `avaliacoes_desempenho` que não existe no banco de dados Supabase. Isso causa os seguintes erros:

```
Erro ao acessar a tabela avaliacoes_desempenho: {}
Erro ao carregar avaliações da tabela avaliacoes_desempenho: {}
```

## Solução

Para resolver este problema, você precisa criar a tabela `avaliacoes_desempenho` no banco de dados. Siga os passos abaixo:

### 1. Configurar as variáveis de ambiente

Certifique-se de que você tem um arquivo `.env.local` na raiz do projeto com as seguintes variáveis configuradas:

```
# Configurações do Supabase
NEXT_PUBLIC_SUPABASE_URL=https://arzvingdtnttiejcvucs.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyenZpbmdkdG50dGllamN2dWNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ5NDY3MjksImV4cCI6MjA2MDUyMjcyOX0.8OYE8Dg3haAxQ7p3MUiLJE_wiy2rCKsWiszMVwwo1LI
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyenZpbmdkdG50dGllamN2dWNzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDk0NjcyOSwiZXhwIjoyMDYwNTIyNzI5fQ.Rfo5jOH3iFxFBPyV7mNtG7Ja29AFskUQYYA4fgG2HAk

# Configurações do banco de dados (Supabase)
DATABASE_URL=postgresql://postgres.arzvingdtnttiejcvucs:Caio%402122%40@aws-0-us-east-2.pooler.supabase.com:6543/postgres
```

### 2. Executar o script para criar a tabela

Execute o seguinte comando no terminal:

```bash
node scripts/run-create-avaliacoes-desempenho-table.js
```

Este script irá:
1. Conectar-se ao banco de dados Supabase
2. Criar a tabela `avaliacoes_desempenho`
3. Copiar os dados existentes da tabela `avaliacoes` para a nova tabela
4. Configurar índices e políticas de segurança

### 3. Verificar se a tabela foi criada

Após executar o script, você deve ver a mensagem:

```
Criação da tabela avaliacoes_desempenho concluída com sucesso!
```

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

## Solução de Problemas

Se você encontrar problemas ao executar o script, verifique:

1. Se as credenciais do banco de dados estão corretas no arquivo `.env.local`
2. Se você tem permissões para criar tabelas no banco de dados
3. Se o banco de dados está acessível a partir da sua rede

Para mais informações, consulte os logs de erro no console.

## Contato

Se você continuar enfrentando problemas, entre em contato com o administrador do sistema.
