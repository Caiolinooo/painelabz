/**
 * Script para popular o banco de dados Supabase com dados iniciais
 *
 * Este script deve ser executado com Node.js:
 * node scripts/seed-supabase.js
 *
 * Certifique-se de que as variáveis de ambiente estão configuradas:
 * - NEXT_PUBLIC_SUPABASE_URL: URL do projeto Supabase
 * - SUPABASE_SERVICE_KEY: Chave de serviço do Supabase (não a chave anônima)
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

// Configurações
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Verificar se as variáveis de ambiente estão configuradas
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('SUPABASE_URL ou SUPABASE_SERVICE_KEY não estão definidos. Configure as variáveis de ambiente.');
  process.exit(1);
}

// Criar cliente Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Dados para popular o banco
const adminUser = {
  email: process.env.ADMIN_EMAIL || 'caio.correia@groupabz.com',
  first_name: process.env.ADMIN_FIRST_NAME || 'Caio',
  last_name: process.env.ADMIN_LAST_NAME || 'Correia',
  phone_number: process.env.ADMIN_PHONE_NUMBER || '+5522997847289',
  role: 'ADMIN',
  position: 'Administrador do Sistema',
  department: 'TI',
  active: true
};

const modules = [
  'dashboard',
  'manual',
  'procedimentos',
  'politicas',
  'calendario',
  'noticias',
  'reembolso',
  'contracheque',
  'ponto',
  'avaliacao',
  'admin'
];

const menuItems = [
  {
    label: 'Dashboard',
    url: '/dashboard',
    icon: 'FiHome',
    order: 1,
    active: true,
    requires_auth: true
  },
  {
    label: 'Documentos',
    url: '/documents',
    icon: 'FiFileText',
    order: 2,
    active: true,
    requires_auth: true
  },
  {
    label: 'Notícias',
    url: '/news',
    icon: 'FiEdit',
    order: 3,
    active: true,
    requires_auth: true
  },
  {
    label: 'Reembolsos',
    url: '/reimbursements',
    icon: 'FiDollarSign',
    order: 4,
    active: true,
    requires_auth: true
  },
  {
    label: 'Administração',
    url: '/admin',
    icon: 'FiSettings',
    order: 5,
    active: true,
    requires_auth: true
  }
];

const dashboardCards = [
  {
    title: 'Documentos',
    description: 'Acesse os documentos e manuais da empresa',
    icon: 'FiFileText',
    url: '/documents',
    order: 1,
    active: true
  },
  {
    title: 'Notícias',
    description: 'Fique por dentro das últimas novidades',
    icon: 'FiEdit',
    url: '/news',
    order: 2,
    active: true
  },
  {
    title: 'Reembolsos',
    description: 'Solicite e acompanhe seus reembolsos',
    icon: 'FiDollarSign',
    url: '/reimbursements',
    order: 3,
    active: true
  },
  {
    title: 'Administração',
    description: 'Acesse o painel administrativo',
    icon: 'FiSettings',
    url: '/admin',
    order: 4,
    active: true
  }
];

const settings = [
  {
    key: 'site_name',
    value: 'ABZ Group',
    description: 'Nome do site'
  },
  {
    key: 'primary_color',
    value: '#0066cc',
    description: 'Cor primária do tema'
  },
  {
    key: 'secondary_color',
    value: '#f5f5f5',
    description: 'Cor secundária do tema'
  },
  {
    key: 'logo_url',
    value: 'https://abzgroup.com.br/wp-content/uploads/2023/05/LC1_Azul.png',
    description: 'URL do logotipo'
  },
  {
    key: 'favicon_url',
    value: 'https://abzgroup.com.br/wp-content/uploads/2023/05/favicon.ico',
    description: 'URL do favicon'
  },
  {
    key: 'footer_text',
    value: 'ABZ Group. Todos os direitos reservados.',
    description: 'Texto do rodapé'
  }
];

const sampleDocuments = [
  {
    title: 'Manual do Colaborador',
    description: 'Guia completo para novos colaboradores',
    content: 'Conteúdo do manual do colaborador...',
    category: 'manual',
    subcategory: 'onboarding'
  },
  {
    title: 'Política de Reembolsos',
    description: 'Regras e procedimentos para solicitação de reembolsos',
    content: 'Conteúdo da política de reembolsos...',
    category: 'politicas',
    subcategory: 'financeiro'
  },
  {
    title: 'Procedimentos de Segurança',
    description: 'Normas de segurança para o ambiente de trabalho',
    content: 'Conteúdo dos procedimentos de segurança...',
    category: 'procedimentos',
    subcategory: 'seguranca'
  }
];

const sampleNews = [
  {
    title: 'Bem-vindo ao novo portal da ABZ Group',
    content: 'É com grande satisfação que apresentamos o novo portal interno da ABZ Group...',
    summary: 'Lançamento do novo portal interno',
    published: true,
    published_at: new Date()
  },
  {
    title: 'Novos projetos para o segundo semestre',
    content: 'A ABZ Group tem o prazer de anunciar os novos projetos para o segundo semestre...',
    summary: 'Anúncio de novos projetos',
    published: true,
    published_at: new Date()
  }
];

// Função para criar o usuário administrador
async function createAdminUser() {
  console.log('Criando usuário administrador...');

  // Verificar se o usuário já existe
  const { data: existingUser, error: userError } = await supabase
    .from('users_unified')
    .select('id')
    .eq('email', adminUser.email)
    .single();

  if (userError && userError.code !== 'PGRST116') {
    console.error('Erro ao verificar usuário existente:', userError);
    return null;
  }

  if (existingUser) {
    console.log('Usuário administrador já existe:', existingUser.id);
    return existingUser.id;
  }

  // Criar usuário na autenticação do Supabase
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: adminUser.email,
    password: process.env.ADMIN_PASSWORD || 'Caio@2122@',
    email_confirm: true,
    user_metadata: {
      first_name: adminUser.first_name,
      last_name: adminUser.last_name,
      phone_number: adminUser.phone_number,
      role: adminUser.role
    }
  });

  if (authError) {
    console.error('Erro ao criar usuário na autenticação:', authError);
    return null;
  }

  console.log('Usuário criado na autenticação:', authData.user.id);

  // Inserir usuário na tabela users_unified
  const { data: userData, error: insertError } = await supabase
    .from('users_unified')
    .insert({
      id: authData.user.id,
      ...adminUser
    })
    .select()
    .single();

  if (insertError) {
    console.error('Erro ao inserir usuário na tabela users_unified:', insertError);
    return null;
  }

  console.log('Usuário administrador criado com sucesso:', userData.id);
  return userData.id;
}

// Função para adicionar permissões ao usuário administrador
async function addAdminPermissions(userId) {
  console.log('Adicionando permissões ao usuário administrador...');

  const permissionsToInsert = modules.map(module => ({
    user_id: userId,
    module,
    feature: null
  }));

  const { data, error } = await supabase
    .from('user_permissions')
    .insert(permissionsToInsert);

  if (error) {
    console.error('Erro ao adicionar permissões:', error);
    return false;
  }

  console.log('Permissões adicionadas com sucesso!');
  return true;
}

// Função para adicionar itens de menu
async function addMenuItems() {
  console.log('Adicionando itens de menu...');

  const { data, error } = await supabase
    .from('menu_items')
    .insert(menuItems);

  if (error) {
    console.error('Erro ao adicionar itens de menu:', error);
    return false;
  }

  console.log('Itens de menu adicionados com sucesso!');
  return true;
}

// Função para adicionar cards do dashboard
async function addDashboardCards() {
  console.log('Adicionando cards do dashboard...');

  const { data, error } = await supabase
    .from('dashboard_cards')
    .insert(dashboardCards);

  if (error) {
    console.error('Erro ao adicionar cards do dashboard:', error);
    return false;
  }

  console.log('Cards do dashboard adicionados com sucesso!');
  return true;
}

// Função para adicionar configurações
async function addSettings() {
  console.log('Adicionando configurações...');

  const settingsToInsert = settings.map(setting => ({
    key: setting.key,
    value: setting.value,
    description: setting.description
  }));

  const { data, error } = await supabase
    .from('settings')
    .insert(settingsToInsert);

  if (error) {
    console.error('Erro ao adicionar configurações:', error);
    return false;
  }

  console.log('Configurações adicionadas com sucesso!');
  return true;
}

// Função para adicionar documentos de exemplo
async function addSampleDocuments(userId) {
  console.log('Adicionando documentos de exemplo...');

  const documentsToInsert = sampleDocuments.map(doc => ({
    ...doc,
    created_by: userId,
    updated_by: userId
  }));

  const { data, error } = await supabase
    .from('documents')
    .insert(documentsToInsert);

  if (error) {
    console.error('Erro ao adicionar documentos de exemplo:', error);
    return false;
  }

  console.log('Documentos de exemplo adicionados com sucesso!');
  return true;
}

// Função para adicionar notícias de exemplo
async function addSampleNews(userId) {
  console.log('Adicionando notícias de exemplo...');

  const newsToInsert = sampleNews.map(news => ({
    ...news,
    created_by: userId,
    updated_by: userId
  }));

  const { data, error } = await supabase
    .from('news')
    .insert(newsToInsert);

  if (error) {
    console.error('Erro ao adicionar notícias de exemplo:', error);
    return false;
  }

  console.log('Notícias de exemplo adicionadas com sucesso!');
  return true;
}

// Função principal
async function main() {
  console.log('Iniciando população do banco de dados Supabase...');

  try {
    // Criar usuário administrador
    const adminId = await createAdminUser();
    if (!adminId) {
      console.error('Não foi possível criar o usuário administrador. Abortando.');
      process.exit(1);
    }

    // Adicionar permissões ao usuário administrador
    await addAdminPermissions(adminId);

    // Adicionar itens de menu
    await addMenuItems();

    // Adicionar cards do dashboard
    await addDashboardCards();

    // Adicionar configurações
    await addSettings();

    // Adicionar documentos de exemplo
    await addSampleDocuments(adminId);

    // Adicionar notícias de exemplo
    await addSampleNews(adminId);

    console.log('População do banco de dados concluída com sucesso!');
  } catch (error) {
    console.error('Erro durante a população do banco de dados:', error);
    process.exit(1);
  }
}

// Executar a função principal
main();
