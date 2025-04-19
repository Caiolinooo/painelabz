// Script para atualizar o usuário administrador
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Conectar ao MongoDB
async function connectToMongoDB() {
  try {
    const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://apiabzgroup:Cli%40212202%40@abzpainel.dz8sggk.mongodb.net/?retryWrites=true&w=majority&appName=ABZPainel";

    console.log('Conectando ao MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Conectado ao MongoDB com sucesso!');
  } catch (error) {
    console.error('Erro ao conectar ao MongoDB:', error);
    process.exit(1);
  }
}

// Definir o modelo de usuário
const userSchema = new mongoose.Schema({
  phoneNumber: { type: String, required: true, unique: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, sparse: true },
  password: { type: String },
  role: { type: String, enum: ['ADMIN', 'USER', 'MANAGER'], default: 'USER' },
  position: { type: String },
  department: { type: String },
  passwordLastChanged: { type: Date },
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
  }
}, { timestamps: true });

// Método para hash da senha
userSchema.pre('save', async function(next) {
  if (this.isModified('password') && this.password) {
    try {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
      this.passwordLastChanged = new Date();
      next();
    } catch (error) {
      next(error);
    }
  } else {
    next();
  }
});

// Criar ou atualizar o modelo
const User = mongoose.models.User || mongoose.model('User', userSchema);

// Função principal para atualizar o administrador
async function updateAdmin() {
  try {
    await connectToMongoDB();

    const adminPhone = '+5522997847289';
    const adminEmail = 'caio.correia@groupabz.com';
    const adminPassword = 'Caio@2122@';

    console.log(`Procurando usuário administrador com telefone: ${adminPhone}`);

    // Procurar o usuário administrador
    let adminUser = await User.findOne({ phoneNumber: adminPhone });

    if (adminUser) {
      console.log('Usuário administrador encontrado. Atualizando...');

      // Atualizar o email e a senha usando updateOne para evitar problemas de validação
      await User.updateOne(
        { phoneNumber: adminPhone },
        {
          $set: {
            email: adminEmail,
            password: adminPassword,
            passwordLastChanged: new Date(),
            firstName: 'Caio',
            lastName: 'Correia',
            role: 'ADMIN',
            position: 'Administrador do Sistema',
            department: 'TI',
            active: true,
            'accessPermissions.modules.admin': true
          }
        }
      );

      // Aplicar o hash da senha manualmente
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(adminPassword, salt);

      await User.updateOne(
        { phoneNumber: adminPhone },
        { $set: { password: hashedPassword } }
      );
      console.log('Usuário administrador atualizado com sucesso!');
    } else {
      console.log('Usuário administrador não encontrado. Criando...');

      // Criar um novo usuário administrador
      adminUser = new User({
        phoneNumber: adminPhone,
        firstName: 'Admin',
        lastName: 'ABZ',
        email: adminEmail,
        password: adminPassword,
        role: 'ADMIN',
        position: 'Administrador do Sistema',
        department: 'TI',
        active: true,
        passwordLastChanged: new Date(),
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
      });

      await adminUser.save();
      console.log('Usuário administrador criado com sucesso!');
    }

    // Exibir informações do usuário (sem a senha)
    const userInfo = await User.findOne({ phoneNumber: adminPhone }).select('-password');
    console.log('Informações do usuário administrador:');
    console.log(userInfo);

  } catch (error) {
    console.error('Erro ao atualizar o usuário administrador:', error);
  } finally {
    // Fechar a conexão com o MongoDB
    await mongoose.connection.close();
    console.log('Conexão com o MongoDB fechada.');
  }
}

// Executar a função principal
updateAdmin();
