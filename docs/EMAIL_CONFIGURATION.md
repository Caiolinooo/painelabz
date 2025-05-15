# Configuração de Email para Evitar Spam

Este documento fornece instruções para configurar corretamente o sistema de email do Painel ABZ Group para maximizar a entregabilidade e evitar que emails sejam marcados como spam.

## Problema

Emails de convite e outras comunicações do sistema podem ser marcados como spam por provedores de email. Isso ocorre devido a vários fatores:

1. Falta de autenticação de email (SPF, DKIM, DMARC)
2. Reputação do domínio e endereço IP
3. Conteúdo e estrutura do email
4. Cabeçalhos de email inadequados

## Soluções Implementadas

Já implementamos as seguintes melhorias:

1. Migração para Microsoft Exchange/Office 365 (melhor reputação e entregabilidade)
2. Otimização dos cabeçalhos de email
3. Ajuste da prioridade de email para normal (alta prioridade pode acionar filtros de spam)
4. Melhoria na estrutura HTML dos emails
5. Adição de instruções para os usuários verificarem a pasta de spam
6. Preparação para suporte a DKIM

## Configurações de DNS Necessárias

Para garantir a máxima entregabilidade, é necessário configurar os seguintes registros DNS para o domínio usado no envio de emails:

### 1. Registro SPF (Sender Policy Framework)

O SPF permite que servidores de email verifiquem se um servidor está autorizado a enviar emails em nome do seu domínio.

**Tipo de registro:** TXT
**Nome/Host:** @ (ou domínio raiz)
**Valor para Microsoft 365:** `v=spf1 include:spf.protection.outlook.com -all`

> **Nota:** Este valor é específico para Microsoft Exchange/Office 365. Se você estiver usando outro provedor, ajuste o valor do SPF adequadamente.

### 2. Registro DKIM (DomainKeys Identified Mail)

O DKIM adiciona uma assinatura digital aos seus emails, permitindo que os servidores de recebimento verifiquem se o email não foi adulterado.

#### 2.1. Gerar chaves DKIM

```bash
# Instalar OpenSSL se ainda não estiver instalado
# No Linux: sudo apt-get install openssl
# No Windows: usar Git Bash ou WSL

# Gerar chave privada
openssl genrsa -out dkim_private.pem 2048

# Extrair chave pública
openssl rsa -in dkim_private.pem -pubout -out dkim_public.pem
```

#### 2.2. Configurar registro DNS

**Tipo de registro:** TXT
**Nome/Host:** default._domainkey (ou o seletor que você escolher)
**Valor:** `v=DKIM1; k=rsa; p=CHAVE_PUBLICA`

Substitua `CHAVE_PUBLICA` pelo conteúdo do arquivo dkim_public.pem, removendo cabeçalhos, rodapés e quebras de linha.

#### 2.3. Configurar variáveis de ambiente

Adicione as seguintes variáveis ao seu arquivo `.env`:

```
DKIM_PRIVATE_KEY=conteúdo_do_arquivo_dkim_private.pem
DKIM_DOMAIN=seu-dominio.com
DKIM_SELECTOR=default
```

### 3. Registro DMARC (Domain-based Message Authentication, Reporting & Conformance)

O DMARC define o que fazer quando um email não passa nas verificações de SPF ou DKIM.

**Tipo de registro:** TXT
**Nome/Host:** _dmarc
**Valor:** `v=DMARC1; p=quarantine; sp=quarantine; rua=mailto:dmarc-reports@seu-dominio.com; ruf=mailto:dmarc-reports@seu-dominio.com; fo=1; adkim=r; aspf=r;`

> **Nota:** Substitua `dmarc-reports@seu-dominio.com` por um email válido para receber relatórios.

## Configuração do Microsoft Exchange/Office 365

### 1. Configurar Variáveis de Ambiente

Adicione as seguintes variáveis ao seu arquivo `.env`:

```
EMAIL_HOST=smtp.office365.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=seu-email@seudominio.com
EMAIL_PASSWORD=sua-senha
EMAIL_FROM="ABZ Group" <seu-email@seudominio.com>
```

### 2. Testar a Configuração

Execute o script de teste para verificar se a configuração está correta:

```bash
node scripts/test-exchange-config.js seu-email@exemplo.com
```

### 3. Configurar Autenticação Moderna (Recomendado)

Para maior segurança, é recomendado usar autenticação moderna (OAuth2) em vez de senha. Consulte a documentação da Microsoft para mais informações:
[Configurar autenticação moderna para Exchange Online](https://docs.microsoft.com/pt-br/exchange/clients-and-mobile-in-exchange-online/outlook-for-ios-and-android/oauth-modern-auth)

### 4. Configurar Reverse DNS (PTR)

No caso do Microsoft 365, o Reverse DNS já é configurado automaticamente pela Microsoft.

### 5. Configurar BIMI (Brand Indicators for Message Identification)

O BIMI permite exibir seu logotipo nos clientes de email compatíveis, aumentando a confiança.

**Tipo de registro:** TXT
**Nome/Host:** default._bimi
**Valor:** `v=BIMI1; l=https://seu-dominio.com/logo.svg; a=;`

### 6. Monitorar Reputação de Email

Use ferramentas como:
- [Microsoft 365 Defender portal](https://security.microsoft.com/)
- [Microsoft SNDS](https://sendersupport.olc.protection.outlook.com/snds/)
- [Return Path](https://returnpath.com/)

## Boas Práticas para Evitar Spam

1. **Envie emails apenas para destinatários que solicitaram**
   - Nunca compre listas de email
   - Implemente confirmação dupla (double opt-in)

2. **Mantenha sua lista de contatos limpa**
   - Remova emails que quicam (bounce)
   - Respeite solicitações de descadastramento

3. **Envie conteúdo relevante e de qualidade**
   - Evite palavras que acionam filtros de spam
   - Mantenha uma boa proporção texto/HTML

4. **Mantenha uma cadência de envio consistente**
   - Evite picos repentinos no volume de envio
   - Aqueça novos IPs e domínios gradualmente

5. **Teste seus emails antes de enviar**
   - Use ferramentas como [Mail Tester](https://www.mail-tester.com/)
   - Verifique a pontuação SpamAssassin

## Recursos Adicionais

### Microsoft 365 / Exchange Online
- [Configurar SPF para evitar falsificação](https://docs.microsoft.com/pt-br/microsoft-365/security/office-365-security/set-up-spf-in-office-365-to-help-prevent-spoofing)
- [Usar DKIM para emails no Microsoft 365](https://docs.microsoft.com/pt-br/microsoft-365/security/office-365-security/use-dkim-to-validate-outbound-email)
- [Usar DMARC para validar emails](https://docs.microsoft.com/pt-br/microsoft-365/security/office-365-security/use-dmarc-to-validate-email)
- [Melhores práticas para configuração de email no Microsoft 365](https://docs.microsoft.com/pt-br/microsoft-365/security/office-365-security/secure-email-recommended-policies)

### Ferramentas de Verificação
- [DMARC.org](https://dmarc.org/)
- [SPF Record Checker](https://www.dmarcanalyzer.com/spf/checker/)
- [DKIM Record Checker](https://www.dmarcanalyzer.com/dkim/dkim-checker/)
- [DMARC Record Checker](https://www.dmarcanalyzer.com/dmarc/dmarc-checker/)
- [Microsoft Remote Connectivity Analyzer](https://testconnectivity.microsoft.com/)

## Suporte

Para obter ajuda com a configuração de email, entre em contato com o suporte técnico.
