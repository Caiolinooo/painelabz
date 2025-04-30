// Script para inicializar o banco de dados PostgreSQL com o usuário administrador
require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// Função para obter permissões padrão com base no papel
function getDefaultPermissions(role) {
  const defaultPermissions = {
    ADMIN: {
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
        admin: true,
        avaliacao: true
      }
    }
  };

  return defaultPermissions[role];
}

async function main() {
  console.log('Inicializando banco de dados PostgreSQL com usuário administrador...');
  
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPhone = process.env.ADMIN_PHONE_NUMBER;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminFirstName = process.env.ADMIN_FIRST_NAME || 'Admin';
  const adminLastName = process.env.ADMIN_LAST_NAME || 'ABZ';
  
  if (!adminEmail || !adminPhone || !adminPassword) {
    console.error('Variáveis de ambiente ADMIN_EMAIL, ADMIN_PHONE_NUMBER e ADMIN_PASSWORD são obrigatórias');
    process.exit(1);
  }
  
  try {
    // Verificar se o usuário admin já existe
    const existingAdmin = await prisma.user.findFirst({
      where: {
        OR: [
          { email: adminEmail },
          { phoneNumber: adminPhone }
        ]
      }
    });
    
    if (existingAdmin) {
      console.log('Usuário administrador já existe, atualizando...');
      
      // Hash da senha
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      
      await prisma.user.update({
        where: { id: existingAdmin.id },
        data: {
          firstName: adminFirstName,
          lastName: adminLastName,
          email: adminEmail,
          phoneNumber: adminPhone,
          password: hashedPassword,
          role: 'ADMIN',
          position: 'Administrador do Sistema',
          department: 'TI',
          active: true,
          passwordLastChanged: new Date(),
          accessPermissions: getDefaultPermissions('ADMIN')
        }
      });
      
      console.log('Usuário administrador atualizado com sucesso!');
    } else {
      console.log('Criando usuário administrador...');
      
      // Hash da senha
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      
      await prisma.user.create({
        data: {
          firstName: adminFirstName,
          lastName: adminLastName,
          email: adminEmail,
          phoneNumber: adminPhone,
          password: hashedPassword,
          role: 'ADMIN',
          position: 'Administrador do Sistema',
          department: 'TI',
          active: true,
          passwordLastChanged: new Date(),
          accessPermissions: getDefaultPermissions('ADMIN'),
          accessHistory: {
            timestamp: new Date(),
            action: 'CREATED',
            details: 'Usuário administrador criado pelo script de inicialização'
          }
        }
      });
      
      console.log('Usuário administrador criado com sucesso!');
    }
  } catch (error) {
    console.error('Erro ao criar/atualizar usuário administrador:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch(error => {
    console.error('Erro durante a inicialização:', error);
    process.exit(1);
  });
