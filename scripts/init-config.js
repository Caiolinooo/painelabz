/**
 * Script para inicializar a configuração padrão do site
 * Compatível com MongoDB
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

async function initConfig() {
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Conectado ao MongoDB');

    const database = client.db();
    const siteConfigCollection = database.collection('SiteConfig');

    console.log('Verificando configuração existente...');

    // Verificar se já existe uma configuração
    const existingConfig = await siteConfigCollection.findOne({ _id: 'default' });

    if (existingConfig) {
      console.log('Configuração já existe:', existingConfig);
      return;
    }

    console.log('Criando configuração padrão...');

    // Criar configuração padrão
    const config = {
      _id: 'default',
      title: 'Painel ABZ Group',
      description: 'Painel centralizado para colaboradores da ABZ Group',
      logo: '/images/LC1_Azul.png',
      favicon: '/favicon.ico',
      primaryColor: '#005dff',
      secondaryColor: '#6339F5',
      companyName: 'ABZ Group',
      contactEmail: 'contato@groupabz.com',
      footerText: '© 2024 ABZ Group. Todos os direitos reservados.',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await siteConfigCollection.insertOne(config);

    if (result.acknowledged) {
      console.log('Configuração padrão criada com sucesso:', config);
    } else {
      console.error('Erro ao criar configuração padrão');
    }
  } catch (error) {
    console.error('Erro ao inicializar configuração:', error);
  } finally {
    await client.close();
    console.log('Conexão com o MongoDB fechada');
  }
}

// Executar a função
initConfig();
