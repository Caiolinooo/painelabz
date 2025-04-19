# Guia Rápido - Painel ABZ com MongoDB e Autenticação por SMS

Este guia fornece instruções rápidas para configurar e executar o Painel ABZ com MongoDB Atlas e autenticação por SMS.

## 1. Configuração do Ambiente

### Configurar o arquivo .env

1. Abra o arquivo `.env` na raiz do projeto
2. Substitua `<db_password>` pela senha real do seu banco de dados MongoDB Atlas:

```
MONGODB_URI="mongodb+srv://apiabzgroup:<db_password>@abzpainel.dz8sggk.mongodb.net/?retryWrites=true&w=majority&appName=ABZPainel"
```

3. Verifique se o número de telefone do administrador está correto:

```
ADMIN_PHONE_NUMBER="+5522997847289"
```

4. Para usar o SMS real em produção, configure as credenciais do Twilio:

```
TWILIO_ACCOUNT_SID="seu-account-sid"
TWILIO_AUTH_TOKEN="seu-auth-token"
TWILIO_VERIFY_SERVICE_SID="seu-verify-service-sid"
TWILIO_MESSAGING_SERVICE_SID="seu-messaging-service-sid"
```

5. Para usar o email para autenticação, as credenciais do Gmail já estão configuradas:

```
EMAIL_SERVER="smtps://apiabzgroup@gmail.com:senha-do-aplicativo@smtp.gmail.com:465"
EMAIL_FROM="\"ABZ Group\" <apiabzgroup@gmail.com>"
```

**Nota**: Esta configuração já usa uma senha de aplicativo específica para este projeto. Não é necessário alterá-la, a menos que você queira usar outra conta de email.

6. Configurações de códigos de convite:

```
INVITE_CODE_EXPIRY_DAYS=30  # Número de dias até a expiração do código
INVITE_CODE_MAX_USES=1      # Número máximo de vezes que o código pode ser usado
```

7. Personalização de emails:

```
EMAIL_COMPANY_NAME="ABZ Group"  # Nome da empresa exibido nos emails
EMAIL_LOGO_URL="https://exemplo.com/logo.png"  # URL do logo da empresa
EMAIL_PRIMARY_COLOR="#0066cc"  # Cor primária para títulos e botões
EMAIL_SECONDARY_COLOR="#f5f5f5"  # Cor secundária para fundos
EMAIL_FOOTER_TEXT="ABZ Group. Todos os direitos reservados."  # Texto do rodapé
```

## 2. Verificar a Conexão com o MongoDB

Execute o comando:

```bash
npm run db:setup
```

Este comando verificará se a conexão com o MongoDB Atlas está funcionando corretamente.

## 3. Popular o Banco de Dados

Se o banco de dados estiver vazio, execute:

```bash
npm run db:seed
```

Este comando criará:
- Um usuário administrador com o número de telefone definido em `ADMIN_PHONE_NUMBER`
- Configurações padrão do site
- Cards do dashboard
- Itens de menu
- Documentos e notícias de exemplo

### 3.1 Sincronizar Modelos entre Mongoose e Prisma

Para garantir que os dados estejam consistentes entre os dois ORMs, execute:

```bash
npm run db:sync
```

Este comando sincronizará os dados entre Mongoose e Prisma, garantindo que ambos tenham as mesmas informações.

### 3.2 Visualizar e Editar Dados com Prisma Studio

Para visualizar e editar os dados do banco de dados usando uma interface gráfica:

```bash
npm run prisma:studio
```

O Prisma Studio será aberto no navegador, permitindo visualizar e editar os dados de forma fácil.

## 4. Iniciar o Servidor

Execute o comando:

```bash
npm run dev
```

Acesse o sistema em [http://localhost:3000](http://localhost:3000)

## 5. Acessar o Sistema

1. Na página de login, digite o número de telefone do administrador (com código do país)
2. Clique em "Enviar Código"
3. Em desenvolvimento, o código será exibido no console do servidor
4. Digite o código de verificação recebido
5. Após o login, você será solicitado a definir uma senha (válida por 1 ano)

## Observações Importantes

- Em ambiente de desenvolvimento, os códigos SMS são exibidos no console do servidor
- Em produção, é necessário configurar o Twilio para enviar SMS reais
- A senha expira após 1 ano, forçando o usuário a definir uma nova senha
- Apenas o administrador pode cadastrar novos usuários

## Solução de Problemas

### Erro de conexão com o MongoDB

- Verifique se a senha no arquivo `.env` está correta
- Verifique se o IP do seu computador está na lista de IPs permitidos no MongoDB Atlas

### Erro ao enviar SMS

- Em desenvolvimento, os códigos são exibidos no console (não é necessário Twilio)
- Em produção, verifique se as credenciais do Twilio estão corretas

### Outros Problemas

Se encontrar outros problemas, verifique os logs do servidor para mais detalhes.
