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
  // Configurar o transpilador para ignorar o Twilio no middleware
  transpilePackages: ['twilio'],

  // Configurar o webpack para lidar com módulos problemáticos
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Ignorar o Twilio e outros pacotes problemáticos no middleware
      config.externals = [...config.externals || [], 'twilio', 'bcryptjs', 'nodemailer'];
    }

    // Otimizações para o Fast Refresh
    if (!isServer) {
      config.optimization.runtimeChunk = 'single';

      // Melhorar a estabilidade do build
      config.optimization.moduleIds = 'deterministic';

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
      // Redirecionamento para a página de avaliação
      {
        source: '/avaliacao/:id',
        destination: '/avaliacao/avaliacoes/:id',
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;
