/**
 * Script para popular o banco de dados MongoDB com dados iniciais
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Cores para o console
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

// URL de conexão com o MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/abz_painel';

// Verificar se a string de conexão foi fornecida
if (!MONGODB_URI) {
  console.error(`${colors.red}✗ A variável de ambiente MONGODB_URI não está definida${colors.reset}`);
  process.exit(1);
}

// Modelos
const UserSchema = new mongoose.Schema(
  {
    phoneNumber: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, sparse: true },
    password: { type: String },
    role: { type: String, enum: ['ADMIN', 'USER'], default: 'USER' },
    avatar: { type: String },
    department: { type: String },
    verificationCode: { type: String },
    verificationCodeExpires: { type: Date },
    passwordLastChanged: { type: Date },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const CardSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    href: { type: String, required: true },
    icon: { type: String, required: true },
    color: { type: String, required: true },
    hoverColor: { type: String, required: true },
    external: { type: Boolean, default: false },
    enabled: { type: Boolean, default: true },
    order: { type: Number, required: true },
  },
  { timestamps: true }
);

const MenuItemSchema = new mongoose.Schema(
  {
    href: { type: String, required: true },
    label: { type: String, required: true },
    icon: { type: String, required: true },
    external: { type: Boolean, default: false },
    enabled: { type: Boolean, default: true },
    order: { type: Number, required: true },
    adminOnly: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const DocumentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, required: true },
    language: { type: String, required: true },
    file: { type: String, required: true },
    enabled: { type: Boolean, default: true },
    order: { type: Number, required: true },
  },
  { timestamps: true }
);

const NewsSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    date: { type: Date, required: true },
    file: { type: String, required: true },
    enabled: { type: Boolean, default: true },
    featured: { type: Boolean, default: false },
    category: { type: String, required: true },
    author: { type: String, required: true },
    thumbnail: { type: String },
  },
  { timestamps: true }
);

const SiteConfigSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    logo: { type: String, required: true },
    favicon: { type: String, required: true },
    primaryColor: { type: String, required: true },
    secondaryColor: { type: String, required: true },
    companyName: { type: String, required: true },
    contactEmail: { type: String, required: true },
    footerText: { type: String, required: true },
  },
  { timestamps: true }
);

// Registrar modelos
const User = mongoose.model('User', UserSchema);
const Card = mongoose.model('Card', CardSchema);
const MenuItem = mongoose.model('MenuItem', MenuItemSchema);
const Document = mongoose.model('Document', DocumentSchema);
const News = mongoose.model('News', NewsSchema);
const SiteConfig = mongoose.model('SiteConfig', SiteConfigSchema);

// Função para popular o banco de dados
async function seed() {
  console.log(`\n${colors.bright}${colors.cyan}=== Populando o Banco de Dados MongoDB ===${colors.reset}\n`);

  try {
    // Conectar ao MongoDB
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`${colors.green}✓ Conectado ao MongoDB: ${MONGODB_URI}${colors.reset}\n`);

    // Verificar se o número de telefone do administrador está definido
    const adminPhoneNumber = process.env.ADMIN_PHONE_NUMBER;
    if (!adminPhoneNumber) {
      console.error(`${colors.red}✗ ADMIN_PHONE_NUMBER não está definido no arquivo .env${colors.reset}`);
      process.exit(1);
    }

    // Criar usuário administrador
    console.log(`${colors.cyan}> Criando usuário administrador...${colors.reset}`);
    await User.findOneAndUpdate(
      { phoneNumber: adminPhoneNumber },
      {
        phoneNumber: adminPhoneNumber,
        name: 'Administrador',
        role: 'ADMIN',
        active: true,
      },
      { upsert: true, new: true }
    );
    console.log(`${colors.green}✓ Usuário administrador criado/atualizado com sucesso!${colors.reset}\n`);

    // Criar configuração do site
    console.log(`${colors.cyan}> Criando configuração do site...${colors.reset}`);
    await SiteConfig.findOneAndUpdate(
      { title: 'Painel ABZ Group' },
      {
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
      { upsert: true, new: true }
    );
    console.log(`${colors.green}✓ Configuração do site criada/atualizada com sucesso!${colors.reset}\n`);

    // Criar cards do dashboard
    console.log(`${colors.cyan}> Criando cards do dashboard...${colors.reset}`);
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

    // Limpar cards existentes
    await Card.deleteMany({});

    // Inserir novos cards
    await Card.insertMany(cards);
    console.log(`${colors.green}✓ Cards do dashboard criados com sucesso!${colors.reset}\n`);

    // Criar itens de menu
    console.log(`${colors.cyan}> Criando itens de menu...${colors.reset}`);
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

    // Limpar itens de menu existentes
    await MenuItem.deleteMany({});

    // Inserir novos itens de menu
    await MenuItem.insertMany(menuItems);
    console.log(`${colors.green}✓ Itens de menu criados com sucesso!${colors.reset}\n`);

    // Criar documentos
    console.log(`${colors.cyan}> Criando documentos...${colors.reset}`);
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

    // Limpar documentos existentes
    await Document.deleteMany({});

    // Inserir novos documentos
    await Document.insertMany(documents);
    console.log(`${colors.green}✓ Documentos criados com sucesso!${colors.reset}\n`);

    // Criar notícias
    console.log(`${colors.cyan}> Criando notícias...${colors.reset}`);
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

    // Limpar notícias existentes
    await News.deleteMany({});

    // Inserir novas notícias
    await News.insertMany(news);
    console.log(`${colors.green}✓ Notícias criadas com sucesso!${colors.reset}\n`);

    console.log(`${colors.bright}${colors.green}=== Banco de Dados MongoDB Populado com Sucesso! ===${colors.reset}\n`);
  } catch (error) {
    console.error(`${colors.red}✗ Erro ao popular o banco de dados:${colors.reset}`, error);
    process.exit(1);
  } finally {
    // Fechar a conexão com o MongoDB
    await mongoose.disconnect();
    console.log(`${colors.cyan}> Conexão com o MongoDB fechada.${colors.reset}\n`);
  }
}

// Executar a função de seed
seed();
