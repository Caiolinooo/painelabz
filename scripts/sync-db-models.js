/**
 * Script para sincronizar modelos entre Mongoose e Prisma
 * Este script garante que os dados estejam consistentes entre os dois ORMs
 */

const { PrismaClient } = require('@prisma/client');
const mongoose = require('mongoose');
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
const MONGODB_URI = process.env.MONGODB_URI;

// Verificar se a string de conexão foi fornecida
if (!MONGODB_URI) {
  console.error(`${colors.red}✗ A variável de ambiente MONGODB_URI não está definida${colors.reset}`);
  process.exit(1);
}

// Inicializar Prisma Client
const prisma = new PrismaClient();

// Definir schemas do Mongoose
const UserSchema = new mongoose.Schema(
  {
    phoneNumber: { type: String, required: true, unique: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, sparse: true },
    password: { type: String },
    role: { type: String, enum: ['ADMIN', 'USER', 'MANAGER'], default: 'USER' },
    position: { type: String },
    avatar: { type: String },
    department: { type: String },
    verificationCode: { type: String },
    verificationCodeExpires: { type: Date },
    passwordLastChanged: { type: Date },
    active: { type: Boolean, default: true },
    accessHistory: [{
      timestamp: { type: Date, default: Date.now },
      action: { type: String },
      details: { type: String }
    }],
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
      },
      features: { type: Map, of: Boolean, default: {} }
    },
  },
  { timestamps: true }
);

// Registrar modelos
const User = mongoose.models.User || mongoose.model('User', UserSchema);

// Função para sincronizar usuários
async function syncUsers() {
  console.log(`${colors.cyan}> Sincronizando usuários...${colors.reset}`);
  
  try {
    // Obter todos os usuários do Mongoose
    const mongooseUsers = await User.find({});
    console.log(`${colors.cyan}  Encontrados ${mongooseUsers.length} usuários no Mongoose${colors.reset}`);
    
    // Obter todos os usuários do Prisma
    const prismaUsers = await prisma.user.findMany();
    console.log(`${colors.cyan}  Encontrados ${prismaUsers.length} usuários no Prisma${colors.reset}`);
    
    // Mapear usuários do Mongoose por phoneNumber para fácil acesso
    const mongooseUserMap = new Map();
    mongooseUsers.forEach(user => {
      mongooseUserMap.set(user.phoneNumber, user);
    });
    
    // Mapear usuários do Prisma por phoneNumber para fácil acesso
    const prismaUserMap = new Map();
    prismaUsers.forEach(user => {
      prismaUserMap.set(user.phoneNumber, user);
    });
    
    // Sincronizar usuários do Mongoose para Prisma
    let createdInPrisma = 0;
    let updatedInPrisma = 0;
    
    for (const mongoUser of mongooseUsers) {
      const prismaUser = prismaUserMap.get(mongoUser.phoneNumber);
      
      // Preparar dados para Prisma
      const userData = {
        phoneNumber: mongoUser.phoneNumber,
        firstName: mongoUser.firstName,
        lastName: mongoUser.lastName,
        email: mongoUser.email,
        password: mongoUser.password,
        role: mongoUser.role,
        position: mongoUser.position,
        avatar: mongoUser.avatar,
        department: mongoUser.department,
        passwordLastChanged: mongoUser.passwordLastChanged,
        active: mongoUser.active,
        accessHistory: mongoUser.accessHistory ? JSON.parse(JSON.stringify(mongoUser.accessHistory)) : null,
        accessPermissions: mongoUser.accessPermissions ? JSON.parse(JSON.stringify(mongoUser.accessPermissions)) : null,
      };
      
      if (!prismaUser) {
        // Criar usuário no Prisma
        await prisma.user.create({
          data: userData
        });
        createdInPrisma++;
      } else {
        // Atualizar usuário no Prisma
        await prisma.user.update({
          where: { id: prismaUser.id },
          data: userData
        });
        updatedInPrisma++;
      }
    }
    
    // Sincronizar usuários do Prisma para Mongoose
    let createdInMongoose = 0;
    let updatedInMongoose = 0;
    
    for (const prismaUser of prismaUsers) {
      const mongoUser = mongooseUserMap.get(prismaUser.phoneNumber);
      
      if (!mongoUser) {
        // Criar usuário no Mongoose
        const newUser = new User({
          phoneNumber: prismaUser.phoneNumber,
          firstName: prismaUser.firstName,
          lastName: prismaUser.lastName,
          email: prismaUser.email,
          password: prismaUser.password,
          role: prismaUser.role,
          position: prismaUser.position,
          avatar: prismaUser.avatar,
          department: prismaUser.department,
          passwordLastChanged: prismaUser.passwordLastChanged,
          active: prismaUser.active,
          accessHistory: prismaUser.accessHistory,
          accessPermissions: prismaUser.accessPermissions,
        });
        
        await newUser.save();
        createdInMongoose++;
      } else {
        // Atualizar usuário no Mongoose se necessário
        let needsUpdate = false;
        
        // Verificar se há diferenças
        if (prismaUser.firstName !== mongoUser.firstName ||
            prismaUser.lastName !== mongoUser.lastName ||
            prismaUser.email !== mongoUser.email ||
            prismaUser.role !== mongoUser.role ||
            prismaUser.position !== mongoUser.position ||
            prismaUser.department !== mongoUser.department ||
            prismaUser.active !== mongoUser.active) {
          needsUpdate = true;
        }
        
        if (needsUpdate) {
          mongoUser.firstName = prismaUser.firstName;
          mongoUser.lastName = prismaUser.lastName;
          mongoUser.email = prismaUser.email;
          mongoUser.role = prismaUser.role;
          mongoUser.position = prismaUser.position;
          mongoUser.department = prismaUser.department;
          mongoUser.active = prismaUser.active;
          
          await mongoUser.save();
          updatedInMongoose++;
        }
      }
    }
    
    console.log(`${colors.green}✓ Sincronização de usuários concluída:${colors.reset}`);
    console.log(`  - Criados no Prisma: ${createdInPrisma}`);
    console.log(`  - Atualizados no Prisma: ${updatedInPrisma}`);
    console.log(`  - Criados no Mongoose: ${createdInMongoose}`);
    console.log(`  - Atualizados no Mongoose: ${updatedInMongoose}`);
    
  } catch (error) {
    console.error(`${colors.red}✗ Erro ao sincronizar usuários:${colors.reset}`, error);
  }
}

// Função principal
async function main() {
  console.log(`\n${colors.bright}${colors.cyan}=== Sincronização de Modelos entre Mongoose e Prisma ===${colors.reset}\n`);
  
  try {
    // Conectar ao MongoDB
    console.log(`${colors.cyan}> Conectando ao MongoDB...${colors.reset}`);
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`${colors.green}✓ Conectado ao MongoDB com sucesso!${colors.reset}\n`);
    
    // Sincronizar modelos
    await syncUsers();
    
    console.log(`\n${colors.bright}${colors.green}=== Sincronização Concluída com Sucesso! ===${colors.reset}\n`);
  } catch (error) {
    console.error(`${colors.red}✗ Erro durante a sincronização:${colors.reset}`, error);
  } finally {
    // Fechar conexões
    await mongoose.disconnect();
    await prisma.$disconnect();
    console.log(`${colors.cyan}> Conexões fechadas.${colors.reset}\n`);
  }
}

// Executar a função principal
main();
