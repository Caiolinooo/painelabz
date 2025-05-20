# Solução de Problemas - Configuração de Email de Reembolso

Este documento fornece instruções detalhadas para solucionar problemas com a configuração de email de reembolso.

## Erro: "Erro ao carregar configurações. Por favor, tente novamente."

Este erro geralmente ocorre quando:

1. A tabela `settings` não existe no banco de dados
2. A configuração `reimbursement_email_settings` não foi criada
3. Há problemas de permissão para acessar a tabela `settings`

## Solução Passo a Passo

### 1. Verificar e Criar a Tabela Settings

Execute o script SQL para criar a tabela `settings` no painel de administração do Supabase:

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
```

### 2. Adicionar a Configuração Padrão

Execute o script SQL para adicionar a configuração padrão:

```sql
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

### 3. Executar o Script de Migração

Execute o script de migração para adicionar a coluna `reimbursement_email_settings` à tabela `users`:

```bash
node scripts/apply-reimbursement-migration.js
```

### 4. Verificar Permissões no Supabase

Certifique-se de que as políticas de segurança do Supabase permitam:

1. Leitura da tabela `settings` para todos os usuários autenticados
2. Escrita na tabela `settings` apenas para usuários com papel de administrador

Execute o seguinte SQL para configurar as permissões:

```sql
-- Permitir leitura da tabela settings para todos os usuários autenticados
CREATE POLICY "Permitir leitura de settings para usuários autenticados" 
ON settings FOR SELECT 
TO authenticated 
USING (true);

-- Permitir escrita na tabela settings apenas para administradores
CREATE POLICY "Permitir escrita em settings para administradores" 
ON settings FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid() AND users.role = 'ADMIN'
  )
);
```

### 5. Verificar Logs do Servidor

Se o problema persistir, verifique os logs do servidor para identificar erros específicos:

1. Abra as ferramentas de desenvolvedor do navegador (F12)
2. Vá para a aba "Console" para ver mensagens de erro
3. Verifique os logs do servidor Next.js no terminal onde o servidor está sendo executado

### 6. Verificar Configuração do Supabase

Certifique-se de que as variáveis de ambiente estão configuradas corretamente:

```
NEXT_PUBLIC_SUPABASE_URL=sua-url-do-supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon-do-supabase
SUPABASE_SERVICE_KEY=sua-chave-de-servico-do-supabase
```

### 7. Reiniciar o Servidor

Após fazer todas as alterações, reinicie o servidor Next.js:

```bash
npm run dev
```

## Verificação Final

Para verificar se a configuração está funcionando corretamente:

1. Acesse o painel de administração em `/admin`
2. Navegue até "Configurações de Reembolso"
3. Verifique se a interface carrega sem erros
4. Tente salvar uma configuração e verifique se ela é persistida

Se você ainda estiver enfrentando problemas, entre em contato com o desenvolvedor para obter assistência adicional.
