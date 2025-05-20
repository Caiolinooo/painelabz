# Correção Manual para Configurações de Reembolso

Este documento fornece instruções para corrigir manualmente problemas com a tabela `settings` no Supabase, que é necessária para o funcionamento das configurações de reembolso.

## Problema

Os seguintes erros podem ocorrer ao tentar acessar ou salvar configurações de reembolso:

1. `relation "public.settings" does not exist` - A tabela settings não existe no banco de dados
2. `Could not find the function public.execute_sql(query)` - A função execute_sql não existe ou não está acessível

## Solução Manual

### Opção 1: Executar SQL no Supabase

A maneira mais direta de resolver o problema é criar a tabela manualmente no SQL Editor do Supabase:

1. Acesse o [Supabase Dashboard](https://app.supabase.com)
2. Selecione seu projeto
3. Vá para a seção "SQL Editor" no menu lateral
4. Clique em "New Query" para criar uma nova consulta
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

6. Clique em "Run" para executar o SQL
7. Verifique se a tabela foi criada com sucesso executando:

```sql
SELECT * FROM settings;
```

### Opção 2: Usar o Arquivo de Configuração Local

Se você não conseguir criar a tabela no Supabase, a aplicação foi atualizada para usar um arquivo de configuração local como fallback:

1. Acesse a página de configurações de reembolso em `/admin/reimbursement-settings`
2. Tente salvar as configurações - mesmo que ocorra um erro, a aplicação tentará criar um arquivo local
3. O arquivo será criado em `src/config/reimbursementSettings.json`
4. A aplicação usará automaticamente este arquivo quando a tabela no Supabase não estiver disponível

### Opção 3: Criar o Arquivo de Configuração Manualmente

Se as opções acima não funcionarem, você pode criar o arquivo de configuração manualmente:

1. Crie um diretório `src/config` se ele não existir
2. Crie um arquivo chamado `reimbursementSettings.json` neste diretório
3. Adicione o seguinte conteúdo ao arquivo:

```json
{
  "enableDomainRule": true,
  "recipients": [
    "andresa.oliveira@groupabz.com",
    "fiscal@groupabz.com"
  ]
}
```

## Verificação

Para verificar se a correção foi aplicada com sucesso:

1. Acesse a página de configurações de reembolso em `/admin/reimbursement-settings`
2. Verifique se as configurações são exibidas corretamente
3. Tente salvar as configurações e verifique se não ocorrem erros

## Solução de Problemas

### Permissões do Supabase

Se você continuar tendo problemas com permissões no Supabase:

1. Verifique se o usuário tem permissões para criar tabelas
2. Verifique se as políticas de segurança do Row Level Security (RLS) permitem acesso à tabela settings
3. Se necessário, adicione a seguinte política à tabela settings:

```sql
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to authenticated users" ON settings
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
```

### Logs de Erro

Se você continuar enfrentando problemas, verifique os logs do console do navegador para obter mais informações sobre os erros específicos que estão ocorrendo.

## Contato para Suporte

Se você precisar de ajuda adicional, entre em contato com a equipe de suporte técnico.
