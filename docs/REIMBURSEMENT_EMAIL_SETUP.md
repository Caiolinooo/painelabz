# Configuração de Email de Reembolso

Este documento explica como configurar e usar o sistema de email de reembolso com regras especiais para usuários com domínio @groupabz.com.

## Visão Geral

O sistema permite configurar regras especiais para o envio de emails de reembolso:

1. **Regra de Domínio**: Quando ativada, os formulários de reembolso enviados por usuários com email do domínio @groupabz.com serão automaticamente enviados para destinatários adicionais (por padrão, andresa.oliveira@groupabz.com e fiscal@groupabz.com).

2. **Configurações por Usuário**: É possível configurar regras específicas para cada usuário, independentemente do domínio de email.

## Instalação

### 1. Aplicar Migração do Banco de Dados

Execute o script de migração para adicionar a coluna `reimbursement_email_settings` à tabela `users` e criar a configuração padrão:

```bash
node scripts/apply-reimbursement-migration.js
```

Se o script não conseguir adicionar a coluna automaticamente, você precisará executar o seguinte SQL no painel de administração do Supabase:

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS reimbursement_email_settings JSONB;
```

### 2. Verificar Instalação

Após a execução do script, verifique se:

- A coluna `reimbursement_email_settings` foi adicionada à tabela `users`
- A configuração `reimbursement_email_settings` foi adicionada à tabela `settings`

## Configuração

### Configuração Global

1. Acesse o painel de administração em `/admin`
2. Clique em "Configurações de Reembolso" no menu lateral
3. Configure as seguintes opções:
   - **Ativar regra para emails com domínio @groupabz.com**: Quando ativada, os formulários de reembolso enviados por usuários com email do domínio @groupabz.com serão automaticamente enviados para os destinatários adicionais.
   - **Destinatários Adicionais**: Lista de emails que receberão os formulários de reembolso quando a regra de domínio estiver ativada.

### Configuração por Usuário

1. Acesse o painel de administração em `/admin`
2. Clique em "Gerenciamento de Usuários" no menu lateral
3. Edite um usuário
4. Clique em "Configurar Email de Reembolso"
5. Configure as seguintes opções:
   - **Ativar configuração especial de email para este usuário**: Quando ativada, os formulários de reembolso enviados por este usuário serão enviados para os destinatários adicionais, independentemente do domínio de email.
   - **Destinatários Adicionais**: Lista de emails que receberão os formulários de reembolso deste usuário.

## Funcionamento

Quando um usuário envia um formulário de reembolso, o sistema verifica:

1. Se o usuário tem configurações específicas de email de reembolso ativadas
   - Se sim, usa os destinatários configurados para o usuário

2. Se o usuário não tem configurações específicas, verifica se:
   - A regra de domínio está ativada nas configurações globais
   - O email do usuário tem o domínio @groupabz.com
   - Se ambas as condições forem verdadeiras, usa os destinatários configurados nas configurações globais

3. Em todos os casos, o email também é enviado para:
   - O próprio usuário que enviou o formulário
   - O email padrão logistica@groupabz.com

## Solução de Problemas

### Erro ao Carregar Configurações

Se você encontrar erros ao carregar as configurações de email de reembolso, verifique:

1. Se a coluna `reimbursement_email_settings` foi adicionada à tabela `users`
2. Se a configuração `reimbursement_email_settings` foi adicionada à tabela `settings`

### Erro ao Enviar Emails

Se os emails não estiverem sendo enviados corretamente, verifique:

1. As configurações de email no arquivo `.env`
2. Os logs do servidor para erros relacionados ao envio de email

## Estrutura de Dados

### Configuração Global

```json
{
  "enableDomainRule": true,
  "recipients": ["andresa.oliveira@groupabz.com", "fiscal@groupabz.com"]
}
```

### Configuração por Usuário

```json
{
  "enabled": true,
  "recipients": ["email1@example.com", "email2@example.com"]
}
```
