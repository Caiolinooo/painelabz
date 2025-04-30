// Script para verificar e corrigir o usuário administrador em ambas as tabelas
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// Criar cliente Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Erro: NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_KEY devem estar definidos no arquivo .env');
  process.exit(1);
}

// Criar cliente Supabase com a chave de serviço
console.log('Criando cliente Supabase com URL:', supabaseUrl);
console.log('Chave de serviço presente:', supabaseServiceKey ? 'Sim' : 'Não');

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Criar cliente Prisma
const prisma = new PrismaClient();

// Informações do administrador
const adminEmail = process.env.ADMIN_EMAIL || 'caio.correia@groupabz.com';
const adminPhone = process.env.ADMIN_PHONE_NUMBER || '+5522997847289';
const adminPassword = process.env.ADMIN_PASSWORD || 'Caio@2122@';
const adminFirstName = process.env.ADMIN_FIRST_NAME || 'Caio';
const adminLastName = process.env.ADMIN_LAST_NAME || 'Correia';

async function fixAdminUser() {
  try {
    console.log('Iniciando verificação e correção do usuário administrador...');
    console.log('Email do administrador:', adminEmail);
    console.log('Telefone do administrador:', adminPhone);

    // Verificar se o usuário administrador existe na tabela 'users' do Supabase
    console.log('\n1. Verificando usuário na tabela users do Supabase...');
    let supabaseAdminUser = null;

    // Tentar buscar pelo email
    const { data: userByEmail, error: emailError } = await supabase
      .from('users')
      .select('*')
      .eq('email', adminEmail)
      .single();

    if (emailError) {
      console.log('Usuário não encontrado pelo email:', emailError.message);
    } else {
      console.log('Usuário encontrado pelo email:', userByEmail.id);
      supabaseAdminUser = userByEmail;
    }

    // Se não encontrou pelo email, tentar pelo telefone
    if (!supabaseAdminUser) {
      const { data: userByPhone, error: phoneError } = await supabase
        .from('users')
        .select('*')
        .eq('phone_number', adminPhone)
        .single();

      if (phoneError) {
        console.log('Usuário não encontrado pelo telefone:', phoneError.message);
      } else {
        console.log('Usuário encontrado pelo telefone:', userByPhone.id);
        supabaseAdminUser = userByPhone;
      }
    }

    // Se o usuário não existe no Supabase, criar
    if (!supabaseAdminUser) {
      console.log('Usuário administrador não encontrado no Supabase. Criando...');

      const userId = uuidv4();

      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          id: userId,
          email: adminEmail,
          phone_number: adminPhone,
          first_name: adminFirstName,
          last_name: adminLastName,
          role: 'ADMIN',
          position: 'Administrador do Sistema',
          department: 'TI',
          active: true,
          access_permissions: {
            modules: {
              admin: true,
              dashboard: true,
              manual: true,
              procedimentos: true,
              politicas: true,
              calendario: true,
              noticias: true,
              reembolso: true,
              contracheque: true,
              ponto: true,
              avaliacao: true
            }
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) {
        console.error('Erro ao criar usuário administrador no Supabase:', createError);
      } else {
        console.log('Usuário administrador criado com sucesso no Supabase:', newUser.id);
        supabaseAdminUser = newUser;
      }
    } else {
      // Verificar se o usuário tem papel de administrador
      if (supabaseAdminUser.role !== 'ADMIN') {
        console.log('Usuário encontrado não é administrador, atualizando papel...');

        // Atualizar o papel para ADMIN
        const { error: updateError } = await supabase
          .from('users')
          .update({
            role: 'ADMIN',
            access_permissions: {
              modules: {
                admin: true,
                dashboard: true,
                manual: true,
                procedimentos: true,
                politicas: true,
                calendario: true,
                noticias: true,
                reembolso: true,
                contracheque: true,
                ponto: true,
                avaliacao: true
              }
            }
          })
          .eq('id', supabaseAdminUser.id);

        if (updateError) {
          console.error('Erro ao atualizar papel do usuário para ADMIN:', updateError);
        } else {
          console.log('Papel do usuário atualizado para ADMIN com sucesso');
          supabaseAdminUser.role = 'ADMIN';
        }
      } else {
        console.log('Usuário já tem papel de ADMIN no Supabase');
      }
    }

    // Verificar se o usuário administrador existe na tabela 'User' do Prisma
    console.log('\n2. Verificando usuário na tabela User do Prisma...');
    let prismaAdminUser = null;

    try {
      // Tentar buscar pelo email
      prismaAdminUser = await prisma.user.findUnique({
        where: { email: adminEmail }
      });

      if (prismaAdminUser) {
        console.log('Usuário encontrado pelo email no Prisma:', prismaAdminUser.id);
      } else {
        // Tentar buscar pelo telefone
        prismaAdminUser = await prisma.user.findUnique({
          where: { phoneNumber: adminPhone }
        });

        if (prismaAdminUser) {
          console.log('Usuário encontrado pelo telefone no Prisma:', prismaAdminUser.id);
        } else {
          console.log('Usuário administrador não encontrado no Prisma');
        }
      }
    } catch (prismaError) {
      console.error('Erro ao buscar usuário no Prisma:', prismaError);
    }

    // Se o usuário não existe no Prisma, criar
    if (!prismaAdminUser) {
      console.log('Usuário administrador não encontrado no Prisma. Criando...');

      try {
        // Gerar hash da senha
        const hashedPassword = await bcrypt.hash(adminPassword, 10);

        // Usar o mesmo ID do Supabase se disponível
        const userId = supabaseAdminUser ? supabaseAdminUser.id : uuidv4();

        // Criar usuário no Prisma
        prismaAdminUser = await prisma.user.create({
          data: {
            id: userId,
            phoneNumber: adminPhone,
            firstName: adminFirstName,
            lastName: adminLastName,
            email: adminEmail,
            password: hashedPassword,
            role: 'ADMIN',
            position: 'Administrador do Sistema',
            department: 'TI',
            active: true,
            accessPermissions: {
              modules: {
                admin: true,
                dashboard: true,
                manual: true,
                procedimentos: true,
                politicas: true,
                calendario: true,
                noticias: true,
                reembolso: true,
                contracheque: true,
                ponto: true,
                avaliacao: true
              }
            },
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });

        console.log('Usuário administrador criado com sucesso no Prisma:', prismaAdminUser.id);
      } catch (createError) {
        console.error('Erro ao criar usuário administrador no Prisma:', createError);

        // Tentar com SQL direto se o Prisma falhar
        try {
          console.log('Tentando criar usuário com SQL direto...');

          const userId = supabaseAdminUser ? supabaseAdminUser.id : uuidv4();
          const hashedPassword = await bcrypt.hash(adminPassword, 10);
          const now = new Date();

          const accessPermissions = {
            modules: {
              admin: true,
              dashboard: true,
              manual: true,
              procedimentos: true,
              politicas: true,
              calendario: true,
              noticias: true,
              reembolso: true,
              contracheque: true,
              ponto: true,
              avaliacao: true
            }
          };

          await prisma.$executeRaw`
            INSERT INTO "User" (
              "id",
              "phoneNumber",
              "firstName",
              "lastName",
              "email",
              "password",
              "role",
              "position",
              "department",
              "active",
              "accessPermissions",
              "createdAt",
              "updatedAt"
            ) VALUES (
              ${userId},
              ${adminPhone},
              ${adminFirstName},
              ${adminLastName},
              ${adminEmail},
              ${hashedPassword},
              'ADMIN',
              'Administrador do Sistema',
              'TI',
              true,
              ${JSON.stringify(accessPermissions)}::jsonb,
              ${now},
              ${now}
            )
            ON CONFLICT ("id") DO NOTHING
          `;

          console.log('Usuário administrador criado com SQL direto');
        } catch (sqlError) {
          console.error('Erro ao criar usuário com SQL direto:', sqlError);
        }
      }
    } else {
      // Verificar se o usuário tem papel de administrador
      if (prismaAdminUser.role !== 'ADMIN') {
        console.log('Usuário encontrado no Prisma não é administrador, atualizando papel...');

        try {
          // Atualizar o papel para ADMIN
          await prisma.user.update({
            where: { id: prismaAdminUser.id },
            data: {
              role: 'ADMIN',
              accessPermissions: {
                modules: {
                  admin: true,
                  dashboard: true,
                  manual: true,
                  procedimentos: true,
                  politicas: true,
                  calendario: true,
                  noticias: true,
                  reembolso: true,
                  contracheque: true,
                  ponto: true,
                  avaliacao: true
                }
              }
            }
          });

          console.log('Papel do usuário atualizado para ADMIN com sucesso no Prisma');
        } catch (updateError) {
          console.error('Erro ao atualizar papel do usuário para ADMIN no Prisma:', updateError);
        }
      } else {
        console.log('Usuário já tem papel de ADMIN no Prisma');
      }
    }

    // Verificar se os IDs são iguais em ambas as tabelas
    if (supabaseAdminUser && prismaAdminUser && supabaseAdminUser.id !== prismaAdminUser.id) {
      console.log('\nAtenção: Os IDs do usuário administrador são diferentes nas tabelas:');
      console.log('ID no Supabase:', supabaseAdminUser.id);
      console.log('ID no Prisma:', prismaAdminUser.id);
      console.log('Isso pode causar problemas de autenticação. Considere alinhar os IDs.');
    }

    console.log('\nVerificação e correção do usuário administrador concluída!');

    // Resumo
    console.log('\nResumo:');
    console.log('Usuário no Supabase:', supabaseAdminUser ? 'Encontrado/Criado' : 'Não disponível');
    if (supabaseAdminUser) {
      console.log('  ID:', supabaseAdminUser.id);
      console.log('  Email:', supabaseAdminUser.email);
      console.log('  Telefone:', supabaseAdminUser.phone_number);
      console.log('  Papel:', supabaseAdminUser.role);
    }

    console.log('Usuário no Prisma:', prismaAdminUser ? 'Encontrado/Criado' : 'Não disponível');
    if (prismaAdminUser) {
      console.log('  ID:', prismaAdminUser.id);
      console.log('  Email:', prismaAdminUser.email);
      console.log('  Telefone:', prismaAdminUser.phoneNumber);
      console.log('  Papel:', prismaAdminUser.role);
    }
  } catch (error) {
    console.error('Erro durante a verificação e correção do usuário administrador:', error);
  } finally {
    // Fechar conexão do Prisma
    await prisma.$disconnect();
  }
}

fixAdminUser();
