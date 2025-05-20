# Correção Manual para Configurações de Reembolso por Usuário

Este documento fornece instruções para corrigir manualmente problemas com a coluna `reimbursement_email_settings` na tabela `users_unified`, que é necessária para o funcionamento das configurações de reembolso por usuário.

## Problema

O seguinte erro pode ocorrer ao tentar acessar ou salvar configurações de reembolso por usuário:

```
Erro ao buscar configurações de email do usuário: {
  code: '42703',
  details: null,
  hint: null,
  message: 'column users_unified.reimbursement_email_settings does not exist'
}
```

Este erro indica que a coluna `reimbursement_email_settings` não existe na tabela `users_unified`.

## Solução Manual

### Opção 1: Executar SQL no Supabase

A maneira mais direta de resolver o problema é adicionar a coluna manualmente no SQL Editor do Supabase:

1. Acesse o [Supabase Dashboard](https://app.supabase.com)
2. Selecione seu projeto
3. Vá para a seção "SQL Editor" no menu lateral
4. Clique em "New Query" para criar uma nova consulta
5. Cole o seguinte SQL:

```sql
-- Adicionar coluna se não existir
ALTER TABLE users_unified ADD COLUMN IF NOT EXISTS reimbursement_email_settings JSONB;

-- Criar índice para melhorar performance de consultas
CREATE INDEX IF NOT EXISTS idx_users_unified_reimbursement_email_settings ON users_unified USING GIN (reimbursement_email_settings);

-- Atualizar usuários existentes com configurações padrão
UPDATE users_unified
SET reimbursement_email_settings = '{"enabled": false, "recipients": []}'::jsonb
WHERE reimbursement_email_settings IS NULL;
```

6. Clique em "Run" para executar o SQL
7. Verifique se a coluna foi adicionada com sucesso executando:

```sql
SELECT 
  column_name, 
  data_type 
FROM 
  information_schema.columns 
WHERE 
  table_name = 'users_unified' AND 
  column_name = 'reimbursement_email_settings';
```

### Opção 2: Usar o Script Automatizado

Se você tem acesso ao servidor onde a aplicação está rodando, pode executar o script automatizado:

1. Navegue até a pasta raiz do projeto
2. Execute o seguinte comando:

```bash
node scripts/add-reimbursement-email-settings-column.js
```

Este script tentará adicionar a coluna automaticamente e fornecerá feedback sobre o resultado.

### Opção 3: Usar o Arquivo de Configuração Local

Se você não conseguir adicionar a coluna no Supabase, a aplicação foi atualizada para usar um arquivo de configuração local como fallback:

1. Acesse a página de configurações de reembolso do usuário
2. Tente salvar as configurações - mesmo que ocorra um erro, a aplicação tentará usar o fallback local
3. Os arquivos serão criados em `src/config/users/[userId].json`
4. A aplicação usará automaticamente estes arquivos quando a coluna no Supabase não estiver disponível

## Verificação

Para verificar se a correção foi aplicada com sucesso:

1. Acesse a página de configurações de reembolso de um usuário
2. Verifique se as configurações são exibidas corretamente
3. Tente salvar as configurações e verifique se não ocorrem erros

## Solução de Problemas

### Permissões do Supabase

Se você continuar tendo problemas com permissões no Supabase:

1. Verifique se o usuário tem permissões para modificar a estrutura da tabela
2. Verifique se as políticas de segurança do Row Level Security (RLS) permitem acesso à tabela users_unified
3. Se necessário, adicione a seguinte política à tabela users_unified:

```sql
ALTER TABLE users_unified ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to authenticated users" ON users_unified
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
```

### Logs de Erro

Se você continuar enfrentando problemas, verifique os logs do console do navegador e do servidor para obter mais informações sobre os erros específicos que estão ocorrendo.

## Contato para Suporte

Se você precisar de ajuda adicional, entre em contato com a equipe de suporte técnico.
