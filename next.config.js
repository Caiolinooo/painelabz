/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configurar o transpilador para ignorar o Twilio no middleware
  transpilePackages: ['twilio'],

  // Configurar o webpack para lidar com módulos problemáticos
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Ignorar o Twilio e outros pacotes problemáticos no middleware
      config.externals = [...config.externals || [], 'twilio', 'bcryptjs'];
    }

    // Otimizações para o Fast Refresh
    if (!isServer) {
      config.optimization.runtimeChunk = 'single';

      // Melhorar a estabilidade do build
      config.optimization.moduleIds = 'deterministic';
    }

    // Aumentar o limite de tamanho dos chunks para evitar erros de ENOENT
    config.performance = {
      ...config.performance,
      maxAssetSize: 1024 * 1024, // 1MB
      maxEntrypointSize: 1024 * 1024, // 1MB
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
    ],
  },

  // Permitir origens de desenvolvimento
  experimental: {
    allowedDevOrigins: ['192.168.0.173', 'localhost', '127.0.0.1'],
    // Melhorar a estabilidade do build
    optimizePackageImports: ['react-icons'],
  },

  // Configurar o comportamento de build
  output: 'standalone',
  poweredByHeader: false,
  reactStrictMode: false, // Desativar o modo estrito para evitar problemas com useLayoutEffect

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
      // Remover o redirecionamento de /admin para /admin/ que pode estar causando loops
      // {
      //   source: '/admin',
      //   destination: '/admin/',
      //   permanent: true,
      // },
    ];
  },
};

module.exports = nextConfig;
