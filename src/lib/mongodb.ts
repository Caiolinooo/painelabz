import mongoose from 'mongoose';

// Obter a string de conexão do MongoDB das variáveis de ambiente
const MONGODB_URI = process.env.MONGODB_URI;

// Extrair o nome do banco de dados da string de conexão ou usar um padrão
const DB_NAME = MONGODB_URI ? MONGODB_URI.split('/').pop()?.split('?')[0] || 'abzpainel' : 'abzpainel';

// Verificar se a string de conexão foi fornecida
if (!MONGODB_URI) {
  throw new Error('Por favor, defina a variável de ambiente MONGODB_URI');
}

// Variável para armazenar a conexão
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  console.log('Tentando conectar ao MongoDB...');
  console.log('String de conexão:', MONGODB_URI?.replace(/:[^:]*@/, ':****@'));
  console.log('Nome do banco de dados:', DB_NAME);

  if (cached.conn) {
    console.log('Usando conexão existente com MongoDB');
    return cached.conn;
  }

  if (!cached.promise) {
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI não está definido nas variáveis de ambiente');
    }

    console.log('Criando nova conexão com MongoDB');
    const opts = {
      bufferCommands: false,
      // Opções adicionais para MongoDB Atlas
      useNewUrlParser: true,
      useUnifiedTopology: true,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      console.log('Conexão com MongoDB estabelecida com sucesso');
      console.log('Usando banco de dados:', DB_NAME);
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
    console.log('Conexão com MongoDB pronta para uso');
  } catch (e) {
    console.error('Erro ao conectar com MongoDB:', e);
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default dbConnect;
