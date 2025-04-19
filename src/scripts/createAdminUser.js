// Script para criar um usuário administrador
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

// Carregar variáveis de ambiente
require('dotenv').config();

// Verificar se as variáveis de ambiente estão definidas
if (!process.env.MONGODB_URI) {
  console.error('Erro: Variável de ambiente MONGODB_URI não definida');
  console.log('Verificando arquivo .env...');

  // Verificar se o arquivo .env existe
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    console.log('Arquivo .env encontrado. Conteúdo:');
    const envContent = fs.readFileSync(envPath, 'utf8');
    console.log(envContent);
  } else {
    console.log('Arquivo .env não encontrado.');
  }

  // Definir URI padrão para MongoDB
  process.env.MONGODB_URI = 'mongodb://localhost:27017/ABZPainel';
  console.log('Usando URI padrão para MongoDB:', process.env.MONGODB_URI);
}

// Conectar ao MongoDB
async function connectToDatabase() {
  try {
    console.log('Conectando ao MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Conectado ao MongoDB com sucesso!');
  } catch (error) {
    console.error('Erro ao conectar ao MongoDB:', error);
    process.exit(1);
  }
}

// Definir o esquema do usuário
const UserSchema = new mongoose.Schema({
  phoneNumber: { type: String, required: true, unique: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, sparse: true },
  password: { type: String },
  role: { type: String, enum: ['ADMIN', 'USER', 'MANAGER'], default: 'USER' },
  position: { type: String },
  avatar: { type: String },
  department: { type: String },
  active: { type: Boolean, default: true },
  accessPermissions: {
    modules: {
      dashboard: { type: Boolean, default: true },
      manual: { type: Boolean, default: true },
      procedimentos: { type: Boolean, default: true },
      politicas: { type: Boolean, default: true },
      calendario: { type: Boolean, default: true },
      noticias: { type: Boolean, default: true },
      reembolso: { type: Boolean, default: true },
      contracheque: { type: Boolean, default: true },
      ponto: { type: Boolean, default: true },
      admin: { type: Boolean, default: false }
    }
  },
}, { timestamps: true });

// Hash da senha antes de salvar
UserSchema.pre('save', async function(next) {
  if (this.isModified('password') && this.password) {
    try {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
      next();
    } catch (error) {
      next(error);
    }
  } else {
    next();
  }
});

// Criar o modelo de usuário
const User = mongoose.models.User || mongoose.model('User', UserSchema);

// Função para criar um usuário administrador
async function createAdminUser() {
  try {
    // Verificar se já existe um usuário administrador
    console.log('Verificando se já existe um usuário administrador...');
    const existingAdmin = await User.findOne({ role: 'ADMIN' });

    if (existingAdmin) {
      console.log('Usuário administrador já existe:', existingAdmin.email || existingAdmin.phoneNumber);

      // Atualizar as permissões do administrador existente para garantir acesso completo
      console.log('Atualizando permissões do administrador existente...');
      existingAdmin.accessPermissions = {
        modules: {
          dashboard: true,
          manual: true,
          procedimentos: true,
          politicas: true,
          calendario: true,
          noticias: true,
          reembolso: true,
          contracheque: true,
          ponto: true,
          admin: true
        }
      };

      await existingAdmin.save();
      console.log('Permissões do administrador atualizadas com sucesso!');
      return;
    }

    // Definir valores padrão se as variáveis de ambiente não estiverem definidas
    const adminPhone = process.env.ADMIN_PHONE_NUMBER || '5511999999999';
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@abzgroup.com.br';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    console.log('Criando novo usuário administrador com:');
    console.log('- Telefone:', adminPhone);
    console.log('- Email:', adminEmail);
    console.log('- Senha:', adminPassword.substring(0, 3) + '***');

    // Dados do usuário administrador
    const adminData = {
      phoneNumber: adminPhone,
      firstName: 'Admin',
      lastName: 'ABZ',
      email: adminEmail,
      password: adminPassword,
      role: 'ADMIN',
      position: 'Administrador do Sistema',
      department: 'TI',
      active: true,
      accessPermissions: {
        modules: {
          dashboard: true,
          manual: true,
          procedimentos: true,
          politicas: true,
          calendario: true,
          noticias: true,
          reembolso: true,
          contracheque: true,
          ponto: true,
          admin: true
        }
      }
    };

    // Criar o usuário administrador
    console.log('Salvando usuário administrador no banco de dados...');
    const adminUser = new User(adminData);
    await adminUser.save();

    console.log('Usuário administrador criado com sucesso!');
    console.log('Email:', adminUser.email);
    console.log('Telefone:', adminUser.phoneNumber);
    console.log('Papel:', adminUser.role);
  } catch (error) {
    console.error('Erro ao criar usuário administrador:', error);
  }
}

// Função principal
async function main() {
  await connectToDatabase();
  await createAdminUser();
  mongoose.disconnect();
  console.log('Desconectado do MongoDB');
}

// Executar o script
main();
