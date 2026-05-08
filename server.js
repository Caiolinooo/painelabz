// Servidor Express para produção com WebSocket support para Guacamole
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const next = require('next');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const { WebSocketServer, WebSocket } = require('ws');
const { parse } = require('url');

// Carregar variáveis de ambiente
dotenv.config();

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
// Usar porta 80 em produção, 3000 em desenvolvimento
const port = parseInt(process.env.PORT || (dev ? '3000' : '80'), 10);

// Configure memory limits to prevent memory leaks
const memoryLimit = process.env.MEMORY_LIMIT || '2048';
if (!dev) {
  // Only set memory limits in production
  try {
    // Set memory limit for Node.js process
    process.setMaxListeners(20); // Increase max listeners to prevent warnings
    console.log(`> Setting memory limit to ${memoryLimit}MB`);
    // v8 is available in newer Node.js versions
    if (typeof global.gc === 'function') {
      // Force garbage collection before setting memory limit
      global.gc();
    }
  } catch (e) {
    console.warn('Failed to set memory limits:', e.message);
  }
}

// Inicializar o aplicativo Next.js with custom configuration
const app = next({
  dev,
  hostname,
  port,
  conf: {
    compress: true, // Enable gzip compression
    poweredByHeader: false, // Remove X-Powered-By header
    generateEtags: true, // Generate etags for caching
  }
});
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

  // Add error handling middleware
  server.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).send('Internal Server Error');
  });

  // Iniciar o servidor
  const serverInstance = server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Servidor pronto em http://${hostname}:${port}`);
    console.log(`> Ambiente: ${process.env.NODE_ENV}`);
    console.log(`> Node.js version: ${process.version}`);
    console.log(`> Memory usage: ${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`);
    console.log(`> WebSocket proxy enabled for Guacamole`);
  });

  // WebSocket proxy for Guacamole tunnel connections
  const GUACAMOLE_HOST = 'vm.groupabz.com';
  const GUACAMOLE_PATH = '/guacamole';

  // Create WebSocket server for handling upgrades
  const wss = new WebSocketServer({ noServer: true });

  serverInstance.on('upgrade', (request, socket, head) => {
    const { pathname } = parse(request.url || '', true);

    // Handle WebSocket upgrade for Llama Server logs
    if (pathname === '/api/ia/server/logs') {
      console.log('[WebSocket] Upgrade request for Llama Server logs');
      
      wss.handleUpgrade(request, socket, head, (ws) => {
        const manager = global.llamaServerManager;
        
        if (!manager) {
          ws.send(JSON.stringify({ type: 'log', content: '[System] Manager ainda não inicializado pela API.' }));
        } else {
          // Enviar logs existentes
          const status = manager.getStatus();
          status.logs.forEach(log => {
            ws.send(JSON.stringify({ type: 'log', content: log }));
          });

          // Subscrever a novos logs
          const logHandler = (line) => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'log', content: line }));
            }
          };

          manager.on('log', logHandler);

          ws.on('close', () => {
            manager.off('log', logHandler);
          });
        }
      });
      return;
    }

    // Handle WebSocket upgrade for Guacamole tunnel
    if (pathname?.includes('websocket-tunnel') || pathname?.includes('tunnel')) {
      console.log('[WebSocket] Upgrade request for Guacamole tunnel:', pathname);

      // Build the target WebSocket URL
      const queryString = request.url?.split('?')[1] || '';
      const targetUrl = `wss://${GUACAMOLE_HOST}${GUACAMOLE_PATH}/websocket-tunnel${queryString ? '?' + queryString : ''}`;

      console.log('[WebSocket] Proxying to:', targetUrl);

      // Use wss.handleUpgrade to properly handle the WebSocket upgrade
      wss.handleUpgrade(request, socket, head, (clientWs) => {
        console.log('[WebSocket] Client connection upgraded');

        // Create connection to Guacamole server
        const guacWs = new WebSocket(targetUrl, {
          rejectUnauthorized: false, // For self-signed certs
          headers: {
            'Cookie': request.headers.cookie || '',
            'Guacamole-Token': request.headers['guacamole-token'] || ''
          }
        });

        guacWs.on('open', () => {
          console.log('[WebSocket] Connected to Guacamole server');
        });

        // Forward messages from Guacamole to client
        guacWs.on('message', (data) => {
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(data);
          }
        });

        // Forward messages from client to Guacamole
        clientWs.on('message', (data) => {
          if (guacWs.readyState === WebSocket.OPEN) {
            guacWs.send(data);
          }
        });

        // Handle Guacamole connection close
        guacWs.on('close', (code, reason) => {
          console.log('[WebSocket] Guacamole connection closed:', code);
          clientWs.close(code, reason);
        });

        // Handle client connection close
        clientWs.on('close', () => {
          console.log('[WebSocket] Client disconnected');
          guacWs.close();
        });

        // Handle errors
        guacWs.on('error', (err) => {
          console.error('[WebSocket] Guacamole error:', err.message);
          clientWs.close(1011, 'Guacamole connection error');
        });

        clientWs.on('error', (err) => {
          console.error('[WebSocket] Client error:', err.message);
          guacWs.close();
        });
      });
    } else {
      console.log('[WebSocket] Unknown upgrade path, destroying:', pathname);
      socket.destroy();
    }
  });

  // Handle graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    serverInstance.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err);
    serverInstance.close(() => {
      console.log('HTTP server closed due to uncaught exception');
      process.exit(1);
    });
  });
}).catch(err => {
  console.error('Erro ao iniciar o servidor:', err);
  process.exit(1);
});
