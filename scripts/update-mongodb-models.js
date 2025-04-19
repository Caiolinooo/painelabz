/**
 * Script para atualizar os modelos do MongoDB
 * Este script adiciona os campos de permissões aos modelos existentes
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

async function updateModels() {
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Conectado ao MongoDB');

    const database = client.db();

    // Atualizar modelo Card
    console.log('Atualizando modelo Card...');
    await database.collection('Card').updateMany(
      { adminOnly: { $exists: false } },
      { 
        $set: { 
          adminOnly: false,
          managerOnly: false,
          allowedRoles: [],
          allowedUserIds: []
        } 
      }
    );

    // Atualizar modelo MenuItem
    console.log('Atualizando modelo MenuItem...');
    await database.collection('MenuItem').updateMany(
      { managerOnly: { $exists: false } },
      { 
        $set: { 
          managerOnly: false,
          allowedRoles: [],
          allowedUserIds: []
        } 
      }
    );

    // Atualizar modelo Document
    console.log('Atualizando modelo Document...');
    await database.collection('Document').updateMany(
      { adminOnly: { $exists: false } },
      { 
        $set: { 
          adminOnly: false,
          managerOnly: false,
          allowedRoles: [],
          allowedUserIds: []
        } 
      }
    );

    // Atualizar modelo News
    console.log('Atualizando modelo News...');
    await database.collection('News').updateMany(
      { content: { $exists: false } },
      { 
        $set: { 
          content: '',
          adminOnly: false,
          managerOnly: false,
          allowedRoles: [],
          allowedUserIds: []
        } 
      }
    );

    // Adicionar card do módulo de gerentes
    console.log('Adicionando card do módulo de gerentes...');
    const existingCard = await database.collection('Card').findOne({ 
      href: '/manager-module' 
    });

    if (!existingCard) {
      await database.collection('Card').insertOne({
        title: 'Manager Module',
        description: 'Special tools and features for managers',
        href: '/manager-module',
        icon: 'FiUsers',
        color: '#4F46E5',
        hoverColor: '#4338CA',
        external: false,
        enabled: true,
        order: 100,
        managerOnly: true,
        adminOnly: false,
        allowedRoles: ['MANAGER', 'ADMIN'],
        allowedUserIds: [],
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log('Card do módulo de gerentes adicionado com sucesso');
    } else {
      console.log('Card do módulo de gerentes já existe');
    }

    console.log('Atualização concluída com sucesso!');
  } catch (error) {
    console.error('Erro ao atualizar modelos:', error);
  } finally {
    await client.close();
    console.log('Conexão com o MongoDB fechada');
  }
}

// Executar a função
updateModels();
