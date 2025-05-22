const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Desativar a verificação de tipos durante o build
  typescript: {
    ignoreBuildErrors: true,
  },
  // Desativar a verificação de ESLint durante o build
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Configurar pacotes para transpilação (não pode incluir pacotes em serverExternalPackages)
  transpilePackages: [],

  // Configurar o webpack para lidar com módulos problemáticos
  webpack: (config, { isServer, dev }) => {
    if (isServer) {
      // Ignorar pacotes problemáticos no middleware
      // Nota: Twilio foi removido pois causa conflito com serverExternalPackages
      config.externals = [...config.externals || [], 'bcryptjs', 'nodemailer'];
    }

    // Fix webpack cache issues
    if (dev) {
      // Use a custom cache directory to avoid permission issues
      config.cache = {
        type: 'filesystem',
        cacheDirectory: path.resolve('.next/cache/webpack'),
        compression: false,
        buildDependencies: {
          config: [__filename],
        },
      };
    }

    // Corrigir problema de MIME Type para arquivos CSS
    config.module.rules.forEach((rule) => {
      if (rule.oneOf) {
        rule.oneOf.forEach((oneOfRule) => {
          if (
            oneOfRule.test &&
            oneOfRule.test.toString().includes('css') &&
            oneOfRule.issuer &&
            oneOfRule.issuer.not
          ) {
            delete oneOfRule.issuer;
          }
        });
      }
    });

    // Otimizações para o Fast Refresh
    if (!isServer) {
      // Use a single runtime chunk to avoid "Cannot read properties of undefined (reading 'call')" errors
      config.optimization.runtimeChunk = 'single';

      // Melhorar a estabilidade do build
      config.optimization.moduleIds = 'deterministic';

      // Fix for circular dependencies and module loading issues
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          // Create a single chunk for all node_modules
          commons: {
            name: 'commons',
            chunks: 'all',
            test: /[\\/]node_modules[\\/]/,
            priority: 10,
            reuseExistingChunk: true,
          },
          // Create a single chunk for all context files
          contexts: {
            name: 'contexts',
            chunks: 'all',
            test: /[\\/]contexts[\\/]/,
            priority: 20,
            reuseExistingChunk: true,
          },
          // Create a single chunk for all lib files
          libs: {
            name: 'libs',
            chunks: 'all',
            test: /[\\/]lib[\\/]/,
            priority: 15,
            reuseExistingChunk: true,
          },
        },
      };

      // Resolver problema com módulos Node.js no browser
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        os: false,
        net: false,
        tls: false,
        child_process: false,
      };

      // Add source maps in development for better debugging
      if (dev) {
        config.devtool = 'source-map';
      }
    }

    // Aumentar o limite de tamanho dos chunks para evitar erros de ENOENT
    config.performance = {
      ...config.performance,
      maxAssetSize: 1024 * 1024 * 2, // 2MB
      maxEntrypointSize: 1024 * 1024 * 2, // 2MB
    };

    return config;
  },

  // Configurações de imagens
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'abzgroup.com.br',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'https',
        hostname: 'arzvingdtnttiejcvucs.supabase.co',
      },
    ],
  },

  // Permitir origens de desenvolvimento
  experimental: {
    allowedDevOrigins: ['192.168.0.173', 'localhost', '127.0.0.1'],
    // Melhorar a estabilidade do build
    optimizePackageImports: ['react-icons'],
    // Fix CSS preload warning
    optimizeCss: true,
  },

  // External packages for server components (moved from experimental)
  // These packages will be bundled for server components but not for middleware
  serverExternalPackages: ['bcryptjs', 'nodemailer', 'twilio'],

  // Configurar o comportamento de build
  poweredByHeader: false,
  reactStrictMode: true, // Ativar o modo estrito para melhor detecção de erros

  // Configuração do SWC (substitui o Babel)
  compiler: {
    styledComponents: true,
    // Configurações adicionais do SWC
    reactRemoveProperties: process.env.NODE_ENV === 'production',
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // Configurações de segurança
  headers: async () => {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },

  // Configurações para lidar com erros 404
  async rewrites() {
    return [
      // Removendo redirecionamentos desnecessários que podem causar loops
      // {
      //   source: '/login',
      //   destination: '/login',
      // },
      // {
      //   source: '/dashboard',
      //   destination: '/dashboard',
      // },
      // {
      //   source: '/manual',
      //   destination: '/manual',
      // },
      // {
      //   source: '/set-password',
      //   destination: '/set-password',
      // },
      // {
      //   source: '/admin',
      //   destination: '/admin',
      // },
      // {
      //   source: '/admin/:path*',
      //   destination: '/admin/:path*',
      // },
    ];
  },

  // Configurações de redirecionamento
  async redirects() {
    return [
      // Redirecionamentos para a página de avaliação
      {
        source: '/avaliacao/avaliacoes/:id',
        destination: '/avaliacao/:id',
        permanent: false,
      },
      {
        source: '/avaliacao/avaliacoes/nova',
        destination: '/avaliacao/nova',
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;
