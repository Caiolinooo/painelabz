import { PrismaClient, Role } from '@prisma/client';
import { hashPassword } from '../src/lib/password';
import * as Icons from 'react-icons/fi';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando seed do banco de dados...');

  // Criar usuários
  console.log('Criando usuários...');
  const adminPassword = await hashPassword('admin123');
  const userPassword = await hashPassword('GroupABZ');

  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      name: 'Administrador',
      email: 'admin@groupabz.com',
      password: adminPassword,
      role: Role.ADMIN,
      department: 'TI',
    },
  });

  await prisma.user.upsert({
    where: { username: 'user' },
    update: {},
    create: {
      username: 'user',
      name: 'Usuário Padrão',
      email: 'user@groupabz.com',
      password: userPassword,
      role: Role.USER,
      department: 'Logística',
    },
  });

  // Criar configuração do site
  console.log('Criando configuração do site...');
  await prisma.siteConfig.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      title: 'Painel ABZ Group',
      description: 'Painel centralizado para colaboradores da ABZ Group',
      logo: '/images/LC1_Azul.png',
      favicon: '/favicon.ico',
      primaryColor: '#005dff',
      secondaryColor: '#6339F5',
      companyName: 'ABZ Group',
      contactEmail: 'contato@groupabz.com',
      footerText: '© 2024 ABZ Group. Todos os direitos reservados.',
    },
  });

  // Criar cards do dashboard
  console.log('Criando cards do dashboard...');
  const cards = [
    {
      title: 'Manual do Colaborador',
      description: 'Acesse o manual completo do colaborador.',
      href: '/manual',
      icon: 'FiBookOpen',
      color: 'bg-abz-blue',
      hoverColor: 'hover:bg-abz-blue-dark',
      external: false,
      enabled: true,
      order: 1,
    },
    {
      title: 'Procedimentos de Logística',
      description: 'Consulte os procedimentos padrões da área.',
      href: '/procedimentos-logistica',
      icon: 'FiClipboard',
      color: 'bg-abz-green',
      hoverColor: 'hover:bg-abz-green-dark',
      external: false,
      enabled: true,
      order: 2,
    },
    {
      title: 'Políticas',
      description: 'Visualize as políticas de HSE e Qualidade.',
      href: '/politicas',
      icon: 'FiFileText',
      color: 'bg-abz-purple',
      hoverColor: 'hover:bg-abz-purple-dark',
      external: false,
      enabled: true,
      order: 3,
    },
    {
      title: 'Procedimentos Gerais',
      description: 'Documentos e diretrizes gerais.',
      href: '/procedimentos',
      icon: 'FiBriefcase',
      color: 'bg-abz-cyan',
      hoverColor: 'hover:bg-abz-cyan-dark',
      external: false,
      enabled: true,
      order: 4,
    },
    {
      title: 'Calendário',
      description: 'Veja feriados nacionais e locais.',
      href: '/calendario',
      icon: 'FiCalendar',
      color: 'bg-abz-red',
      hoverColor: 'hover:bg-abz-red-dark',
      external: false,
      enabled: true,
      order: 5,
    },
    {
      title: 'ABZ News',
      description: 'Últimas notícias e comunicados.',
      href: '/noticias',
      icon: 'FiRss',
      color: 'bg-abz-pink',
      hoverColor: 'hover:bg-abz-pink-dark',
      external: false,
      enabled: true,
      order: 6,
    },
    {
      title: 'Reembolso',
      description: 'Solicite reembolsos de despesas.',
      href: '/reembolso',
      icon: 'FiDollarSign',
      color: 'bg-abz-yellow',
      hoverColor: 'hover:bg-abz-yellow-dark',
      external: false,
      enabled: true,
      order: 7,
    },
    {
      title: 'Contracheque',
      description: 'Acesse seus contracheques.',
      href: '/contracheque',
      icon: 'FiDollarSign',
      color: 'bg-abz-orange',
      hoverColor: 'hover:bg-abz-orange-dark',
      external: false,
      enabled: true,
      order: 8,
    },
    {
      title: 'Ponto',
      description: 'Registre seu ponto.',
      href: '/ponto',
      icon: 'FiClock',
      color: 'bg-abz-teal',
      hoverColor: 'hover:bg-abz-teal-dark',
      external: false,
      enabled: true,
      order: 9,
    },
  ];

  for (const card of cards) {
    await prisma.card.upsert({
      where: { id: `seed-${card.title.toLowerCase().replace(/\s+/g, '-')}` },
      update: {},
      create: {
        id: `seed-${card.title.toLowerCase().replace(/\s+/g, '-')}`,
        ...card,
      },
    });
  }

  // Criar itens de menu
  console.log('Criando itens de menu...');
  const menuItems = [
    {
      href: '/dashboard',
      label: 'Dashboard',
      icon: 'FiGrid',
      external: false,
      enabled: true,
      order: 1,
      adminOnly: false,
    },
    {
      href: '/manual',
      label: 'Manual Logístico',
      icon: 'FiBookOpen',
      external: false,
      enabled: true,
      order: 2,
      adminOnly: false,
    },
    {
      href: '/procedimentos-logistica',
      label: 'Procedimento Logística',
      icon: 'FiClipboard',
      external: false,
      enabled: true,
      order: 3,
      adminOnly: false,
    },
    {
      href: '/politicas',
      label: 'Políticas',
      icon: 'FiFileText',
      external: false,
      enabled: true,
      order: 4,
      adminOnly: false,
    },
    {
      href: '/procedimentos',
      label: 'Procedimentos Gerais',
      icon: 'FiBriefcase',
      external: false,
      enabled: true,
      order: 5,
      adminOnly: false,
    },
    {
      href: '/calendario',
      label: 'Calendário',
      icon: 'FiCalendar',
      external: false,
      enabled: true,
      order: 6,
      adminOnly: false,
    },
    {
      href: '/noticias',
      label: 'ABZ News',
      icon: 'FiRss',
      external: false,
      enabled: true,
      order: 7,
      adminOnly: false,
    },
    {
      href: '/reembolso',
      label: 'Reembolso',
      icon: 'FiDollarSign',
      external: false,
      enabled: true,
      order: 8,
      adminOnly: false,
    },
    {
      href: '/contracheque',
      label: 'Contracheque',
      icon: 'FiDollarSign',
      external: false,
      enabled: true,
      order: 9,
      adminOnly: false,
    },
    {
      href: '/ponto',
      label: 'Ponto',
      icon: 'FiClock',
      external: false,
      enabled: true,
      order: 10,
      adminOnly: false,
    },
    {
      href: '/admin',
      label: 'Administração',
      icon: 'FiSettings',
      external: false,
      enabled: true,
      order: 11,
      adminOnly: true,
    },
  ];

  for (const item of menuItems) {
    await prisma.menuItem.upsert({
      where: { id: `seed-${item.label.toLowerCase().replace(/\s+/g, '-')}` },
      update: {},
      create: {
        id: `seed-${item.label.toLowerCase().replace(/\s+/g, '-')}`,
        ...item,
      },
    });
  }

  // Criar documentos
  console.log('Criando documentos...');
  const documents = [
    {
      title: 'Política de HSE',
      description: 'Diretrizes de Saúde, Segurança e Meio Ambiente do ABZ Group',
      category: 'HSE',
      language: 'Português',
      file: '/documentos/PL-HSE-R0 - Política de HSE_ABZ Group-PORT.pdf',
      enabled: true,
      order: 1,
    },
    {
      title: 'Política da Qualidade',
      description: 'Política de Qualidade e Gestão do ABZ Group',
      category: 'Qualidade',
      language: 'Português',
      file: '/documentos/PL-QUA-R8 - Politica da Qualidade_ABZ Group-PORT.pdf',
      enabled: true,
      order: 2,
    },
    {
      title: 'Quality Policy',
      description: 'ABZ Group Quality Management Policy',
      category: 'Qualidade',
      language: 'English',
      file: '/documentos/PL-QUA-a-R8 - Quality Policy_ABZ Group-ENG.pdf',
      enabled: true,
      order: 3,
    },
    {
      title: 'Manual de Logística',
      description: 'Guia completo com as diretrizes e informações sobre os processos logísticos.',
      category: 'Manual',
      language: 'Português',
      file: '/documentos/Manual de logística.pdf',
      enabled: true,
      order: 4,
    },
  ];

  for (const doc of documents) {
    await prisma.document.upsert({
      where: { id: `seed-${doc.title.toLowerCase().replace(/\s+/g, '-')}` },
      update: {},
      create: {
        id: `seed-${doc.title.toLowerCase().replace(/\s+/g, '-')}`,
        ...doc,
      },
    });
  }

  // Criar notícias
  console.log('Criando notícias...');
  const news = [
    {
      title: 'Exemplo de Notícia 1',
      description: 'Breve descrição do conteúdo desta notícia ou cartilha.',
      date: new Date('2024-04-01'),
      file: '/documentos/noticias/exemplo-noticia-1.pdf',
      enabled: true,
      featured: true,
      category: 'Comunicados',
      author: 'Equipe ABZ',
    },
    {
      title: 'Exemplo de Notícia 2',
      description: 'Outro exemplo de um comunicado importante em formato PDF.',
      date: new Date('2024-03-25'),
      file: '/documentos/noticias/exemplo-noticia-2.pdf',
      enabled: true,
      featured: false,
      category: 'Notícias',
      author: 'Equipe ABZ',
    },
  ];

  for (const item of news) {
    await prisma.news.upsert({
      where: { id: `seed-${item.title.toLowerCase().replace(/\s+/g, '-')}` },
      update: {},
      create: {
        id: `seed-${item.title.toLowerCase().replace(/\s+/g, '-')}`,
        ...item,
      },
    });
  }

  console.log('Seed concluído com sucesso!');
}

main()
  .catch((e) => {
    console.error('Erro durante o seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
