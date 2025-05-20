# Implementação de Segurança e Correções no Sistema

Este documento descreve as melhorias de segurança implementadas no sistema, incluindo a migração de credenciais para o Supabase e a correção de estruturas de banco de dados.

## Visão Geral

As seguintes melhorias foram implementadas:

1. **Backup do código atual** - Backup automático do código no GitHub antes de qualquer alteração
2. **Correção de estrutura de banco de dados** - Adição da coluna `password_hash` à tabela `users_unified` e criação de tabelas de perfil
3. **Migração de credenciais** - Migração de todas as credenciais hard-coded para a tabela `app_secrets` no Supabase
4. **Sistema seguro de credenciais** - Implementação de um sistema de hash usando MD5 com salt para criptografar e descriptografar credenciais
5. **Atualização de referências no código** - Modificação de todos os pontos no código que usam credenciais hard-coded para usar o novo sistema seguro

## Estrutura de Arquivos

- `scripts/backup-code.js` - Script para fazer backup do código no GitHub
- `scripts/run-security-setup.js` - Script para executar os scripts SQL de configuração de segurança
- `scripts/create-app-secrets-table.sql` - Script SQL para criar a tabela `app_secrets`
- `scripts/add-password-hash-column.sql` - Script SQL para adicionar a coluna `password_hash` à tabela `users_unified`
- `scripts/create-profile-tables.sql` - Script SQL para criar as tabelas de perfil
- `scripts/migrate-credentials.js` - Script para migrar credenciais para a tabela `app_secrets`
- `scripts/setup-security.js` - Script principal que executa todos os passos de configuração de segurança
- `src/lib/secure-credentials.ts` - Módulo para gerenciamento seguro de credenciais
- `src/lib/security-config.ts` - Configurações de segurança geradas automaticamente

## Instalação

Para implementar as melhorias de segurança, siga os passos abaixo:

1. Certifique-se de que o arquivo `.env` contém as seguintes variáveis:
   ```
   NEXT_PUBLIC_SUPABASE_URL=sua_url_do_supabase
   SUPABASE_SERVICE_KEY=sua_chave_de_servico_do_supabase
   JWT_SECRET=sua_chave_secreta_jwt
   EMAIL_USER=seu_email_gmail
   EMAIL_PASSWORD=sua_senha_de_app_do_gmail
   ```

2. Execute o script de configuração de segurança:
   ```bash
   node scripts/setup-security.js
   ```

3. Verifique se todas as tabelas foram criadas corretamente no Supabase:
   - `app_secrets` - Tabela para armazenar credenciais
   - `user_emails` - Tabela para e-mails adicionais
   - `user_phones` - Tabela para números de telefone adicionais

4. Verifique se a coluna `password_hash` foi adicionada à tabela `users_unified`

## Uso do Sistema de Credenciais

Para usar o sistema de credenciais seguras em seu código:

```typescript
import { getCredential, initializeCredentials } from '@/lib/secure-credentials';

// Inicializar o sistema de credenciais (deve ser chamado no início da aplicação)
await initializeCredentials();

// Obter uma credencial
const jwtSecret = await getCredential('JWT_SECRET');
const emailPassword = await getCredential('EMAIL_PASSWORD');

// Usar a credencial
// ...
```

## Tabela app_secrets

A tabela `app_secrets` tem a seguinte estrutura:

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID | Identificador único |
| key | TEXT | Chave da credencial (ex: JWT_SECRET) |
| value | TEXT | Valor da credencial (pode ser criptografado) |
| description | TEXT | Descrição da credencial |
| is_encrypted | BOOLEAN | Indica se o valor está criptografado |
| created_at | TIMESTAMP | Data de criação |
| updated_at | TIMESTAMP | Data de atualização |

## Segurança

- As credenciais sensíveis são criptografadas usando AES-256-CBC
- A chave de criptografia é derivada de um salt usando MD5
- O salt é armazenado no arquivo `src/lib/security-config.ts`
- A tabela `app_secrets` tem Row Level Security (RLS) configurada para permitir acesso apenas com a chave de serviço do Supabase

## Manutenção

Para adicionar novas credenciais à tabela `app_secrets`, você pode:

1. Usar o Supabase Studio para inserir diretamente na tabela
2. Modificar o script `scripts/migrate-credentials.js` para incluir novas credenciais e executá-lo novamente
3. Usar as funções SQL criadas:
   ```sql
   SELECT set_app_secret('NOVA_CHAVE', 'novo_valor', 'Descrição da nova credencial');
   ```

## Solução de Problemas

Se encontrar problemas durante a implementação:

1. **Erro ao executar scripts SQL**: Verifique se a chave de serviço do Supabase tem permissões suficientes
2. **Erro ao obter credenciais**: Verifique se a tabela `app_secrets` foi criada corretamente e contém as credenciais necessárias
3. **Erro de conexão com o Supabase**: Verifique se a URL e a chave de serviço do Supabase estão corretas no arquivo `.env`

## Próximos Passos

- Implementar rotação automática de credenciais
- Adicionar auditoria de acesso às credenciais
- Implementar sistema de backup automático das credenciais
