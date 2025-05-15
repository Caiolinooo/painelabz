// Servidor Express para produção
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const next = require('next');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Carregar variáveis de ambiente
dotenv.config();

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
// Usar porta 80 em produção, 3000 em desenvolvimento
const port = parseInt(process.env.PORT || (dev ? '3000' : '80'), 10);

// Inicializar o aplicativo Next.js
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Preparar o servidor
app.prepare().then(() => {
  const server = express();

  // Configurar cabeçalhos de segurança
  server.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });

  // Servir arquivos estáticos com cache
  server.use('/static', express.static(path.join(__dirname, 'public'), {
    maxAge: '30d',
    immutable: true
  }));

  // Servir arquivos de documentos sem cache para sempre ter a versão mais recente
  server.use('/documentos', express.static(path.join(__dirname, 'public/documentos'), {
    maxAge: '0',
    etag: true
  }));

  // Middleware para logs de requisições
  server.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`${req.method} ${req.url} ${res.statusCode} - ${duration}ms`);
    });
    next();
  });

  // Rota de verificação de saúde
  server.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Rota para verificar a versão do aplicativo
  server.get('/version', (req, res) => {
    try {
      const packageJson = require('./package.json');
      res.status(200).json({
        version: packageJson.version,
        name: packageJson.name,
        environment: process.env.NODE_ENV
      });
    } catch (error) {
      res.status(500).json({ error: 'Não foi possível obter informações de versão' });
    }
  });

  // Configurar proxy para API externa se necessário
  if (process.env.EXTERNAL_API_URL) {
    server.use('/api/external', createProxyMiddleware({
      target: process.env.EXTERNAL_API_URL,
      changeOrigin: true,
      pathRewrite: { '^/api/external': '' },
      logLevel: 'warn'
    }));
  }

  // Manipular todas as outras requisições com Next.js
  server.all('*', (req, res) => {
    return handle(req, res);
  });

  // Iniciar o servidor
  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Servidor pronto em http://${hostname}:${port}`);
    console.log(`> Ambiente: ${process.env.NODE_ENV}`);
  });
}).catch(err => {
  console.error('Erro ao iniciar o servidor:', err);
  process.exit(1);
});
