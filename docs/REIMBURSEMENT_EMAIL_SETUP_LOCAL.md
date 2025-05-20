# Configuração Local de Email de Reembolso

Este documento explica como configurar e usar o sistema de email de reembolso com armazenamento local, sem depender do banco de dados Supabase.

## Visão Geral

O sistema permite configurar regras especiais para o envio de emails de reembolso:

1. **Regra de Domínio**: Quando ativada, os formulários de reembolso enviados por usuários com email do domínio @groupabz.com serão automaticamente enviados para destinatários adicionais (por padrão, andresa.oliveira@groupabz.com e fiscal@groupabz.com).

2. **Configurações por Usuário**: É possível configurar regras específicas para cada usuário, independentemente do domínio de email.

## Instalação

### 1. Aplicar a Solução Local

Execute o script de migração para criar os arquivos necessários:

```bash
node scripts/apply-reimbursement-migration.js
```

Este script irá:

1. Criar um arquivo de configuração local em `src/config/reimbursementSettings.json`
2. Criar um endpoint de API local em `src/app/api/reimbursement-settings-local/route.ts`
3. Atualizar a página de configurações para usar o endpoint local

### 2. Verificar Instalação

Após a execução do script, verifique se:

- O arquivo `src/config/reimbursementSettings.json` foi criado
- O endpoint de API local `src/app/api/reimbursement-settings-local/route.ts` foi criado
- A página de configurações foi atualizada para usar o endpoint local

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

1. Se o arquivo `src/config/reimbursementSettings.json` existe e tem o formato correto
2. Se o endpoint de API local `src/app/api/reimbursement-settings-local/route.ts` está funcionando corretamente

### Erro ao Salvar Configurações

Se as configurações não estiverem sendo salvas corretamente, verifique:

1. Se o diretório `src/config` tem permissões de escrita
2. Se o arquivo `src/config/reimbursementSettings.json` tem permissões de escrita

### Reiniciar o Servidor

Se você fizer alterações nos arquivos, reinicie o servidor Next.js:

```bash
npm run dev
```

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
