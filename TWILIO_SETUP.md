# Configuração do Twilio para Autenticação por SMS

Este guia explica como configurar o Twilio Verify para autenticação por SMS no Painel ABZ.

## 1. Requisitos

Para usar o Twilio Verify, você precisa:

1. Uma conta no Twilio (você pode criar uma em [twilio.com](https://www.twilio.com))
2. Um serviço Twilio Verify configurado
3. Suas credenciais do Twilio (Account SID e Auth Token)

## 2. Configuração no Twilio

### Criar um Serviço Verify

1. Faça login no [Console do Twilio](https://console.twilio.com)
2. Navegue até "Verify" no menu lateral
3. Clique em "Create a Verify Service"
4. Dê um nome ao serviço (ex: "ABZ Panel Authentication")
5. Anote o Service SID (começa com "VA")

### Obter suas Credenciais

1. No [Console do Twilio](https://console.twilio.com), vá para a página inicial
2. Você verá seu Account SID e Auth Token (clique em "show" para ver o Auth Token)
3. Anote essas informações

## 3. Configuração no Projeto

Edite o arquivo `.env` na raiz do projeto e adicione suas credenciais:

```
# Configurações do Twilio Verify
TWILIO_ACCOUNT_SID="seu-account-sid"
TWILIO_AUTH_TOKEN="seu-auth-token"
TWILIO_VERIFY_SERVICE_SID="seu-verify-service-sid"
```

Substitua `seu-account-sid` e `seu-auth-token` pelos valores que você anotou.

## 4. Testando a Configuração

Para testar se a configuração está funcionando:

1. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

2. Acesse o sistema em [http://localhost:3000](http://localhost:3000)

3. Na página de login, digite o número de telefone do administrador (com código do país)

4. Clique em "Enviar Código"

5. Você deverá receber um SMS com o código de verificação

6. Digite o código recebido para completar o login

## 5. Solução de Problemas

### Não estou recebendo SMS

- Verifique se o número de telefone está no formato correto (com código do país, ex: +5511999999999)
- Verifique se suas credenciais do Twilio estão corretas
- Verifique se o serviço Verify está ativo no Console do Twilio
- Em desenvolvimento, o código é exibido no console do servidor (não é necessário receber SMS)

### Erro ao enviar SMS

- Verifique os logs do servidor para ver mensagens de erro detalhadas
- Certifique-se de que sua conta do Twilio tem saldo suficiente
- Verifique se o número de telefone está na lista de números verificados (para contas de teste)

### Outros Problemas

Se encontrar outros problemas, verifique:

- Os logs do servidor para mensagens de erro
- O Console do Twilio para status das mensagens enviadas
- A documentação do Twilio Verify em [twilio.com/docs/verify](https://www.twilio.com/docs/verify)
