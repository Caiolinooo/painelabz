# Correção do Módulo de Avaliação

Este documento contém instruções para corrigir os problemas no módulo de avaliação.

## Problemas Identificados

1. **Estrutura do Banco de Dados**: Há um problema na estrutura do banco de dados, onde as tabelas `avaliacoes` e `funcionarios` não estão corretamente configuradas ou não existem.

2. **Relacionamentos entre Tabelas**: Faltam chaves estrangeiras entre as tabelas `avaliacoes` e `funcionarios`.

3. **Mapeamento de Colunas**: O frontend está tentando acessar colunas que não existem na tabela `funcionarios` (como `first_name` e `last_name` em vez de `nome`).

4. **Inconsistência na Nomenclatura**: Há inconsistência no uso de `avaliado_id` vs `funcionario_id`.

## Soluções Implementadas

1. **Correção do Banco de Dados**:
   - Criação das tabelas `avaliacoes` e `funcionarios` se não existirem
   - Adição de chaves estrangeiras entre as tabelas
   - Criação da view `vw_avaliacoes_desempenho` para facilitar consultas

2. **Correção do Frontend**:
   - Atualização das consultas para usar os nomes corretos de colunas
   - Atualização dos componentes para exibir os dados corretamente
   - Correção do formulário de criação de avaliações

## Como Aplicar as Correções

### 1. Correção do Banco de Dados

Execute o script SQL no SQL Editor do Supabase:

1. Acesse o painel do Supabase
2. Vá para a seção SQL Editor
3. Crie um novo script
4. Cole o conteúdo do arquivo `fix-avaliacao-sql-editor.sql`
5. Execute o script

Ou execute o script localmente:

```bash
node scripts/run-database-fix.js
```

### 2. Verificação das Correções

Execute o script de teste para verificar se as correções foram aplicadas corretamente:

```bash
node scripts/test-avaliacao-api.js
```

### 3. Reinicie o Servidor de Desenvolvimento

```bash
npm run dev
```

## Detalhes Técnicos

### Estrutura da Tabela `funcionarios`

```sql
CREATE TABLE funcionarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  cargo TEXT,
  departamento TEXT,
  data_admissao DATE,
  email TEXT,
  matricula TEXT,
  status TEXT NOT NULL DEFAULT 'ativo',
  user_id UUID,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

### Estrutura da Tabela `avaliacoes`

```sql
CREATE TABLE avaliacoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  funcionario_id UUID NOT NULL,
  avaliador_id UUID NOT NULL,
  periodo TEXT NOT NULL,
  data_inicio DATE DEFAULT CURRENT_DATE,
  data_fim DATE DEFAULT (CURRENT_DATE + INTERVAL '3 months'),
  status TEXT NOT NULL DEFAULT 'pending',
  pontuacao_total FLOAT DEFAULT 0,
  observacoes TEXT,
  deleted_at TIMESTAMP WITH TIME ZONE,
  data_criacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  data_atualizacao TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

### Estrutura da View `vw_avaliacoes_desempenho`

```sql
CREATE OR REPLACE VIEW vw_avaliacoes_desempenho AS
SELECT 
  a.id,
  a.funcionario_id,
  a.avaliador_id,
  a.periodo,
  a.data_inicio,
  a.data_fim,
  a.status,
  a.pontuacao_total,
  a.observacoes,
  a.data_criacao,
  a.data_atualizacao,
  a.created_at,
  a.updated_at,
  a.deleted_at,
  f_func.nome AS funcionario_nome,
  f_func.cargo AS funcionario_cargo,
  f_func.departamento AS funcionario_departamento,
  f_func.email AS funcionario_email,
  f_aval.nome AS avaliador_nome,
  f_aval.cargo AS avaliador_cargo,
  f_aval.email AS avaliador_email
FROM 
  avaliacoes a
  LEFT JOIN funcionarios f_func ON a.funcionario_id = f_func.id
  LEFT JOIN funcionarios f_aval ON a.avaliador_id = f_aval.id
WHERE 
  a.deleted_at IS NULL;
```

## Solução de Problemas

Se ainda houver problemas após aplicar as correções, verifique:

1. **Logs do Servidor**: Verifique os logs do servidor para identificar erros específicos.

2. **Console do Navegador**: Verifique o console do navegador para identificar erros no frontend.

3. **Banco de Dados**: Verifique se as tabelas e a view foram criadas corretamente no Supabase.

4. **Permissões**: Verifique se as permissões foram concedidas corretamente para as tabelas e a view.

5. **Dados**: Verifique se há dados nas tabelas `funcionarios` e `avaliacoes`.

## Contato

Se precisar de ajuda adicional, entre em contato com a equipe de desenvolvimento.
