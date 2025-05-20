# Correção da Tabela de Configurações de Reembolso

Este documento descreve como corrigir problemas relacionados à tabela `settings` usada para armazenar configurações de reembolso no Supabase.

## Problema

O erro `relation "public.settings" does not exist` ocorre quando a tabela `settings` não existe no banco de dados Supabase. Esta tabela é necessária para armazenar as configurações de email de reembolso.

## Solução Automática

A aplicação foi atualizada para tentar criar a tabela automaticamente quando ela não existir. No entanto, se você ainda estiver enfrentando problemas, siga as soluções manuais abaixo.

## Solução Manual 1: Executar SQL no Supabase Studio

1. Acesse o [Supabase Studio](https://app.supabase.com)
2. Selecione seu projeto
3. Vá para a seção "SQL Editor"
4. Crie um novo script
5. Cole o seguinte SQL:

```sql
-- Criar tabela settings se não existir
CREATE TABLE IF NOT EXISTS settings (
  id SERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar configuração padrão de email de reembolso
INSERT INTO settings (
  key,
  value,
  description
) VALUES (
  'reimbursement_email_settings',
  '{"enableDomainRule": true, "recipients": ["andresa.oliveira@groupabz.com", "fiscal@groupabz.com"]}',
  'Configurações de email para solicitações de reembolso'
) ON CONFLICT (key) DO NOTHING;
```

6. Execute o script clicando no botão "Run"

## Solução Manual 2: Executar Script Local

Se você tiver acesso ao servidor onde a aplicação está hospedada, execute o seguinte comando:

```bash
node scripts/setup-reimbursement-settings.js
```

Ou execute o comando específico para configurar o banco de dados:

```bash
npm run db:setup-reimbursement
```

## Solução Manual 3: Usar o Arquivo de Migração

1. Navegue até a pasta `supabase/migrations` no projeto
2. Encontre o arquivo `create_settings_table.sql`
3. Execute este arquivo no SQL Editor do Supabase Studio

## Verificação

Para verificar se a correção foi aplicada com sucesso:

1. Acesse a página de configurações de reembolso em `/admin/reimbursement-settings`
2. Tente salvar as configurações
3. Se não houver erros, a correção foi bem-sucedida

## Logs para Depuração

Se você continuar enfrentando problemas, verifique os logs do servidor para obter mais informações sobre o erro. Procure por mensagens relacionadas a:

- `Erro ao buscar configurações de email de reembolso`
- `relation "public.settings" does not exist`
- `Erro ao criar tabela settings`

## Contato para Suporte

Se você precisar de ajuda adicional, entre em contato com a equipe de suporte técnico.
