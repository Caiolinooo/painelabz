/**
 * Migração para atualizar o modelo de usuário
 * Adiciona campos para o processo de convite
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

async function updateUserModel() {
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Conectado ao MongoDB');

    const database = client.db();
    const usersCollection = database.collection('User');

    // Atualizar schema do modelo User
    console.log('Atualizando modelo User...');
    
    // Adicionar campos para o processo de convite
    await usersCollection.updateMany(
      { inviteCode: { $exists: false } },
      { 
        $set: { 
          inviteCode: null,
          inviteSent: false,
          inviteSentAt: null,
          inviteAccepted: false,
          inviteAcceptedAt: null
        } 
      }
    );

    // Adicionar campo name para nome completo
    await usersCollection.updateMany(
      { name: { $exists: false } },
      [
        { 
          $set: { 
            name: { 
              $concat: [
                { $ifNull: ["$firstName", ""] }, 
                { $cond: [{ $and: [{ $ifNull: ["$firstName", false] }, { $ifNull: ["$lastName", false] }] }, " ", ""] },
                { $ifNull: ["$lastName", ""] }
              ] 
            }
          } 
        }
      ]
    );

    // Tornar firstName e lastName opcionais
    // MongoDB é schemaless, então não precisamos fazer nada aqui

    console.log('Migração concluída com sucesso!');
  } catch (error) {
    console.error('Erro ao atualizar modelo User:', error);
  } finally {
    await client.close();
    console.log('Conexão com o MongoDB fechada');
  }
}

// Executar a migração
updateUserModel();
