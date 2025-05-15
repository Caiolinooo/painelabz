// Script para inicializar os dados básicos no PostgreSQL
require('dotenv').config();
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

async function main() {
  console.log('Inicializando dados básicos no PostgreSQL...');

  // Extrair informações da string de conexão
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('Variável de ambiente DATABASE_URL não está definida');
    process.exit(1);
  }

  // Criar pool de conexão
  const pool = new Pool({
    connectionString: databaseUrl
  });

  try {
    // Inicializar configurações do site
    console.log('Inicializando configurações do site...');
    const siteConfigResult = await pool.query(`
      SELECT * FROM "SiteConfig" WHERE "id" = 'default'
    `);

    if (siteConfigResult.rows.length === 0) {
      await pool.query(`
        INSERT INTO "SiteConfig" (
          "id",
          "title",
          "description",
          "logo",
          "favicon",
          "primaryColor",
          "secondaryColor",
          "companyName",
          "contactEmail",
          "footerText",
          "updatedAt"
        ) VALUES (
          'default',
          'ABZ Group - Painel Administrativo',
          'Painel administrativo para funcionários da ABZ Group',
          '/images/logo.png',
          '/favicon.ico',
          '#0070f3',
          '#0070f3',
          'ABZ Group',
          'contato@groupabz.com',
          '© 2024 ABZ Group. Todos os direitos reservados.',
          CURRENT_TIMESTAMP
        )
      `);
      console.log('Configurações do site inicializadas com sucesso!');
    } else {
      console.log('Configurações do site já existem.');
    }

    // Inicializar itens de menu
    console.log('Inicializando itens de menu...');
    const menuItemsResult = await pool.query(`
      SELECT COUNT(*) FROM "MenuItem"
    `);

    if (menuItemsResult.rows[0].count === '0') {
      const menuItems = [
        {
          id: uuidv4(),
          href: '/dashboard',
          label: 'Dashboard',
          icon: 'dashboard',
          external: false,
          enabled: true,
          order: 1,
          adminOnly: false,
          managerOnly: false
        },
        {
          id: uuidv4(),
          href: '/manual',
          label: 'Manual',
          icon: 'book',
          external: false,
          enabled: true,
          order: 2,
          adminOnly: false,
          managerOnly: false
        },
        {
          id: uuidv4(),
          href: '/procedimentos',
          label: 'Procedimentos',
          icon: 'description',
          external: false,
          enabled: true,
          order: 3,
          adminOnly: false,
          managerOnly: false
        },
        {
          id: uuidv4(),
          href: '/politicas',
          label: 'Políticas',
          icon: 'policy',
          external: false,
          enabled: true,
          order: 4,
          adminOnly: false,
          managerOnly: false
        },
        {
          id: uuidv4(),
          href: '/calendario',
          label: 'Calendário',
          icon: 'calendar_today',
          external: false,
          enabled: true,
          order: 5,
          adminOnly: false,
          managerOnly: false
        },
        {
          id: uuidv4(),
          href: '/noticias',
          label: 'Notícias',
          icon: 'newspaper',
          external: false,
          enabled: true,
          order: 6,
          adminOnly: false,
          managerOnly: false
        },
        {
          id: uuidv4(),
          href: '/reembolso',
          label: 'Reembolso',
          icon: 'receipt',
          external: false,
          enabled: true,
          order: 7,
          adminOnly: false,
          managerOnly: false
        },
        {
          id: uuidv4(),
          href: '/contracheque',
          label: 'Contracheque',
          icon: 'payments',
          external: false,
          enabled: true,
          order: 8,
          adminOnly: false,
          managerOnly: false
        },
        {
          id: uuidv4(),
          href: '/ponto',
          label: 'Ponto',
          icon: 'schedule',
          external: false,
          enabled: true,
          order: 9,
          adminOnly: false,
          managerOnly: false
        },
        {
          id: uuidv4(),
          href: '/avaliacao',
          label: 'Avaliação',
          icon: 'assessment',
          external: false,
          enabled: true,
          order: 10,
          adminOnly: false,
          managerOnly: false
        },
        {
          id: uuidv4(),
          href: '/admin',
          label: 'Admin',
          icon: 'admin_panel_settings',
          external: false,
          enabled: true,
          order: 11,
          adminOnly: true,
          managerOnly: false
        }
      ];

      for (const item of menuItems) {
        await pool.query(`
          INSERT INTO "MenuItem" (
            "id",
            "href",
            "label",
            "icon",
            "external",
            "enabled",
            "order",
            "adminOnly",
            "managerOnly",
            "createdAt",
            "updatedAt"
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
          )
        `, [
          item.id,
          item.href,
          item.label,
          item.icon,
          item.external,
          item.enabled,
          item.order,
          item.adminOnly,
          item.managerOnly
        ]);
      }

      console.log('Itens de menu inicializados com sucesso!');
    } else {
      console.log('Itens de menu já existem.');
    }

    // Inicializar cards do dashboard
    console.log('Inicializando cards do dashboard...');
    const cardsResult = await pool.query(`
      SELECT COUNT(*) FROM "Card"
    `);

    if (cardsResult.rows[0].count === '0') {
      const cards = [
        {
          id: uuidv4(),
          title: 'Manual',
          description: 'Acesse o manual da empresa',
          href: '/manual',
          icon: 'book',
          color: '#0070f3',
          hoverColor: '#0060df',
          external: false,
          enabled: true,
          order: 1,
          adminOnly: false,
          managerOnly: false
        },
        {
          id: uuidv4(),
          title: 'Procedimentos',
          description: 'Consulte os procedimentos da empresa',
          href: '/procedimentos',
          icon: 'description',
          color: '#0070f3',
          hoverColor: '#0060df',
          external: false,
          enabled: true,
          order: 2,
          adminOnly: false,
          managerOnly: false
        },
        {
          id: uuidv4(),
          title: 'Políticas',
          description: 'Consulte as políticas da empresa',
          href: '/politicas',
          icon: 'policy',
          color: '#0070f3',
          hoverColor: '#0060df',
          external: false,
          enabled: true,
          order: 3,
          adminOnly: false,
          managerOnly: false
        },
        {
          id: uuidv4(),
          title: 'Calendário',
          description: 'Consulte o calendário de eventos',
          href: '/calendario',
          icon: 'calendar_today',
          color: '#0070f3',
          hoverColor: '#0060df',
          external: false,
          enabled: true,
          order: 4,
          adminOnly: false,
          managerOnly: false
        },
        {
          id: uuidv4(),
          title: 'Notícias',
          description: 'Fique por dentro das novidades',
          href: '/noticias',
          icon: 'newspaper',
          color: '#0070f3',
          hoverColor: '#0060df',
          external: false,
          enabled: true,
          order: 5,
          adminOnly: false,
          managerOnly: false
        },
        {
          id: uuidv4(),
          title: 'Reembolso',
          description: 'Solicite reembolso de despesas',
          href: '/reembolso',
          icon: 'receipt',
          color: '#0070f3',
          hoverColor: '#0060df',
          external: false,
          enabled: true,
          order: 6,
          adminOnly: false,
          managerOnly: false
        },
        {
          id: uuidv4(),
          title: 'Contracheque',
          description: 'Acesse seus contracheques',
          href: '/contracheque',
          icon: 'payments',
          color: '#0070f3',
          hoverColor: '#0060df',
          external: false,
          enabled: true,
          order: 7,
          adminOnly: false,
          managerOnly: false
        },
        {
          id: uuidv4(),
          title: 'Ponto',
          description: 'Registre seu ponto',
          href: '/ponto',
          icon: 'schedule',
          color: '#0070f3',
          hoverColor: '#0060df',
          external: false,
          enabled: true,
          order: 8,
          adminOnly: false,
          managerOnly: false
        },
        {
          id: uuidv4(),
          title: 'Avaliação',
          description: 'Acesse suas avaliações',
          href: '/avaliacao',
          icon: 'assessment',
          color: '#0070f3',
          hoverColor: '#0060df',
          external: false,
          enabled: true,
          order: 9,
          adminOnly: false,
          managerOnly: false
        },
        {
          id: uuidv4(),
          title: 'Admin',
          description: 'Painel administrativo',
          href: '/admin',
          icon: 'admin_panel_settings',
          color: '#0070f3',
          hoverColor: '#0060df',
          external: false,
          enabled: true,
          order: 10,
          adminOnly: true,
          managerOnly: false
        }
      ];

      for (const card of cards) {
        await pool.query(`
          INSERT INTO "Card" (
            "id",
            "title",
            "description",
            "href",
            "icon",
            "color",
            "hoverColor",
            "external",
            "enabled",
            "order",
            "adminOnly",
            "managerOnly",
            "createdAt",
            "updatedAt"
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
          )
        `, [
          card.id,
          card.title,
          card.description,
          card.href,
          card.icon,
          card.color,
          card.hoverColor,
          card.external,
          card.enabled,
          card.order,
          card.adminOnly,
          card.managerOnly
        ]);
      }

      console.log('Cards do dashboard inicializados com sucesso!');
    } else {
      console.log('Cards do dashboard já existem.');
    }

    console.log('Dados básicos inicializados com sucesso!');
  } catch (error) {
    console.error('Erro ao inicializar dados básicos:', error);
  } finally {
    await pool.end();
  }
}

main()
  .catch(error => {
    console.error('Erro durante a inicialização dos dados:', error);
    process.exit(1);
  });
