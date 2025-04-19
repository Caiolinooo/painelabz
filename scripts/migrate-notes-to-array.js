/**
 * Script para migrar o campo notes de string para array em AuthorizedUser
 * 
 * Este script deve ser executado uma única vez para converter todos os documentos
 * que têm o campo notes como string para um array.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { Schema } = mongoose;

// Conectar ao MongoDB
async function connectToMongoDB() {
  try {
    console.log('Tentando conectar ao MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Conectado ao MongoDB com sucesso!');
  } catch (error) {
    console.error('Erro ao conectar ao MongoDB:', error);
    process.exit(1);
  }
}

// Definir o schema do AuthorizedUser
const AuthorizedUserSchema = new Schema({
  email: String,
  phoneNumber: String,
  inviteCode: String,
  domain: String,
  status: String,
  expiresAt: Date,
  maxUses: Number,
  usedCount: Number,
  createdBy: Schema.Types.ObjectId,
  notes: Schema.Types.Mixed, // Usar Mixed para aceitar tanto string quanto array
  createdAt: Date,
  updatedAt: Date
});

// Executar a migração
async function migrateNotesToArray() {
  try {
    // Registrar o modelo
    const AuthorizedUser = mongoose.model('AuthorizedUser', AuthorizedUserSchema);
    
    // Encontrar todos os documentos onde notes é uma string
    const users = await AuthorizedUser.find({
      notes: { $exists: true, $type: 'string' }
    });
    
    console.log(`Encontrados ${users.length} documentos com notes como string.`);
    
    // Converter cada documento
    for (const user of users) {
      const noteString = user.notes;
      
      // Atualizar o documento para usar um array
      await AuthorizedUser.updateOne(
        { _id: user._id },
        { $set: { notes: [noteString] } }
      );
      
      console.log(`Convertido documento ${user._id}: "${noteString}" -> ["${noteString}"]`);
    }
    
    console.log('Migração concluída com sucesso!');
  } catch (error) {
    console.error('Erro durante a migração:', error);
  } finally {
    // Fechar a conexão
    await mongoose.connection.close();
    console.log('Conexão com o MongoDB fechada.');
  }
}

// Executar o script
(async () => {
  await connectToMongoDB();
  await migrateNotesToArray();
  process.exit(0);
})();
