# Configuração do SendGrid

Este documento contém instruções para configurar corretamente o SendGrid como serviço de envio de e-mails para o projeto.

## Problema Atual

Atualmente, o SendGrid está configurado no projeto, mas não é possível enviar e-mails porque o endereço de remetente não está verificado. O SendGrid exige que todos os endereços de e-mail remetentes sejam verificados para evitar spam.

## Solução

Para resolver esse problema, você precisa verificar o domínio ou endereço de e-mail no painel do SendGrid.

### Opção 1: Verificar um Endereço de E-mail Individual

1. Acesse o [painel do SendGrid](https://app.sendgrid.com/)
2. Faça login com as credenciais associadas à chave de API configurada
3. No menu lateral, vá para **Settings > Sender Authentication**
4. Clique em **Verify a Single Sender**
5. Preencha o formulário com as informações do remetente:
   - **From Email Address**: O endereço de e-mail que será usado como remetente (ex: noreply@abzgroup.com.br)
   - **From Name**: O nome que aparecerá como remetente (ex: ABZ Group)
   - **Company/Organization**: Nome da empresa (ex: ABZ Group)
   - **Address, City, State, Zip/Postal Code, Country**: Endereço físico da empresa
6. Clique em **Create**
7. O SendGrid enviará um e-mail de verificação para o endereço informado
8. Abra o e-mail e clique no link de verificação
9. Após a verificação, o endereço estará pronto para ser usado como remetente

### Opção 2: Verificar um Domínio Inteiro (Recomendado)

1. Acesse o [painel do SendGrid](https://app.sendgrid.com/)
2. Faça login com as credenciais associadas à chave de API configurada
3. No menu lateral, vá para **Settings > Sender Authentication**
4. Clique em **Authenticate Your Domain**
5. Insira o nome do domínio que deseja verificar (ex: abzgroup.com.br)
6. Escolha uma configuração de DNS avançada ou básica (recomendado: avançada)
7. Clique em **Next**
8. O SendGrid fornecerá registros DNS (CNAME, MX, etc.) que precisam ser adicionados ao seu provedor de DNS
9. Adicione esses registros no seu provedor de DNS (GoDaddy, Cloudflare, etc.)
10. Volte ao painel do SendGrid e clique em **Verify**
11. Após a verificação bem-sucedida, o domínio estará pronto para ser usado

## Configuração Temporária para Testes

Enquanto o domínio ou endereço de e-mail não for verificado, você pode usar o serviço Ethereal para testes. O Ethereal é um serviço de e-mail falso que captura os e-mails enviados e permite visualizá-los em uma interface web.

Para configurar o Ethereal:

1. Execute o script `scripts/test-ethereal.js` para gerar credenciais temporárias:
   ```
   node scripts/test-ethereal.js seu-email@exemplo.com
   ```

2. Copie as credenciais geradas e atualize o arquivo `.env`:
   ```
   EMAIL_HOST=smtp.ethereal.email
   EMAIL_PORT=587
   EMAIL_SECURE=false
   EMAIL_USER=usuario_gerado@ethereal.email
   EMAIL_PASSWORD=senha_gerada
   ```

3. Atualize o arquivo `src/lib/email.ts` para usar o Ethereal em vez do SendGrid:
   ```typescript
   // Comentar a linha do SendGrid
   // export * from './email-sendgrid';
   
   // Descomentar a linha do Ethereal (criar este arquivo se necessário)
   export * from './email-ethereal';
   ```

## Após a Verificação do SendGrid

Depois que o domínio ou endereço de e-mail for verificado no SendGrid, você pode voltar à configuração original:

1. Atualize o arquivo `.env` com as configurações do SendGrid:
   ```
   SENDGRID_API_KEY=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
   EMAIL_FROM=seu-email-verificado@seu-dominio.com
   EMAIL_HOST=smtp.sendgrid.net
   EMAIL_PORT=587
   EMAIL_SECURE=false
   EMAIL_USER=apikey
   EMAIL_PASSWORD=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
   ```

2. Atualize o arquivo `src/lib/email.ts` para usar o SendGrid:
   ```typescript
   // Descomentar a linha do SendGrid
   export * from './email-sendgrid';
   
   // Comentar a linha do Ethereal
   // export * from './email-ethereal';
   ```

3. Teste o envio de e-mail com o SendGrid:
   ```
   node scripts/test-sendgrid.js seu-email@exemplo.com
   ```

## Recursos Adicionais

- [Documentação do SendGrid sobre Sender Identity](https://sendgrid.com/docs/for-developers/sending-email/sender-identity/)
- [Guia de Autenticação de Domínio do SendGrid](https://sendgrid.com/docs/ui/account-and-settings/how-to-set-up-domain-authentication/)
- [Guia de Verificação de Remetente Individual](https://sendgrid.com/docs/ui/sending-email/sender-verification/)
