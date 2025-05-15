# Guia de Implantação do Painel ABZ

Este documento descreve o processo de implantação do Painel ABZ em um ambiente de produção.

## Pré-requisitos

- Node.js 18.x ou superior
- NPM 9.x ou superior
- PostgreSQL 14.x ou superior
- Supabase (conta configurada)
- Servidor com pelo menos 2GB de RAM e 1 vCPU
- (Opcional) PM2 para gerenciamento de processos

## Etapas de Implantação

### 1. Preparação do Ambiente

1. Clone o repositório:
   ```bash
   git clone https://github.com/Caiolinooo/painelabz.git
   cd painelabz
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Instale o PM2 globalmente (opcional, mas recomendado):
   ```bash
   npm install -g pm2
   ```

### 2. Configuração

1. Configure as variáveis de ambiente:
   - Copie o arquivo `.env.production` para `.env`:
     ```bash
     cp .env.production .env
     ```
   - Edite o arquivo `.env` com as configurações corretas para o ambiente de produção

2. Verifique a conexão com o Supabase:
   ```bash
   npm run check:supabase
   ```

3. Configure o usuário administrador:
   ```bash
   npm run setup:admin
   ```

### 3. Construção e Implantação

1. Construa a aplicação para produção:
   ```bash
   npm run build
   ```

2. Inicie o servidor em modo de produção:
   ```bash
   # Opção 1: Usando o Node.js diretamente
   npm run start:standalone

   # Opção 2: Usando o PM2 (recomendado)
   npm run start:prod:pm2
   ```

3. Ou use o comando de implantação completa (recomendado):
   ```bash
   npm run deploy
   ```

   Este comando verifica se o PM2 está instalado e, se estiver, inicia o servidor usando o PM2.
   Caso contrário, inicia o servidor diretamente usando o Node.js.

### 4. Configuração do Servidor Web (Nginx)

Para servir a aplicação através do Nginx:

1. Instale o Nginx:
   ```bash
   sudo apt update
   sudo apt install nginx
   ```

2. Crie uma configuração para o site:
   ```bash
   sudo nano /etc/nginx/sites-available/painelabz
   ```

3. Adicione a seguinte configuração:
   ```nginx
   server {
       listen 80;
       server_name seu-dominio.com www.seu-dominio.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }

       # Configuração para arquivos estáticos
       location /static/ {
           alias /caminho/para/painelabz/public/;
           expires 30d;
           add_header Cache-Control "public, max-age=2592000";
       }

       # Configuração para documentos
       location /documentos/ {
           alias /caminho/para/painelabz/public/documentos/;
           expires 0;
           add_header Cache-Control "no-cache";
       }
   }
   ```

4. Ative a configuração:
   ```bash
   sudo ln -s /etc/nginx/sites-available/painelabz /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

5. Configure o SSL com Certbot:
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d seu-dominio.com -d www.seu-dominio.com
   ```

### 5. Monitoramento e Manutenção

1. Monitoramento com PM2:
   ```bash
   pm2 status
   pm2 logs painelabz
   pm2 monit
   ```

2. Configurar reinicialização automática:
   ```bash
   pm2 startup
   pm2 save
   ```

3. Atualização da aplicação:
   ```bash
   git pull
   npm install
   npm run build:prod
   pm2 restart painelabz
   ```

## Solução de Problemas

### Erro de conexão com o Supabase

Verifique se as chaves do Supabase estão corretas no arquivo `.env`:
```
NEXT_PUBLIC_SUPABASE_URL=https://arzvingdtnttiejcvucs.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anonima
SUPABASE_SERVICE_KEY=sua-chave-de-servico
```

Execute o script de verificação:
```bash
npm run check:supabase
```

### Erro ao iniciar o servidor

Verifique os logs:
```bash
pm2 logs painelabz
```

Verifique se todas as dependências estão instaladas:
```bash
npm install
```

### Problemas com o banco de dados

Verifique a conexão com o banco de dados:
```bash
npm run db:check-tables
```

## Contato e Suporte

Para suporte técnico, entre em contato com:
- Email: caiovaleriogoulartcorreia@gmail.com
- LinkedIn: https://www.linkedin.com/in/caio-goulart/
- GitHub: https://github.com/Caiolinooo
