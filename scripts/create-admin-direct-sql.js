/**
 * Script para criar o perfil do administrador diretamente no banco de dados
 * usando SQL direto para evitar problemas com a API do Supabase
 */

require('dotenv').config();
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

// Configurações
const DATABASE_URL = process.env.DATABASE_URL;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'caio.correia@groupabz.com';
const ADMIN_PHONE_NUMBER = process.env.ADMIN_PHONE_NUMBER || '+5522997847289';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Caio@2122@';
const ADMIN_FIRST_NAME = process.env.ADMIN_FIRST_NAME || 'Caio';
const ADMIN_LAST_NAME = process.env.ADMIN_LAST_NAME || 'Correia';

// Verificar configurações
if (!DATABASE_URL) {
  console.error('Erro: DATABASE_URL deve estar definido no arquivo .env');
  process.exit(1);
}

// Criar pool de conexão
const pool = new Pool({
  connectionString: DATABASE_URL
});

async function createAdminUser() {
  console.log('Criando usuário administrador diretamente no banco de dados...');

  try {
    // Verificar se o usuário já existe
    console.log('Verificando se o usuário administrador já existe...');

    const checkResult = await pool.query(`
      SELECT * FROM "users_unified"
      WHERE email = $1 OR phone_number = $2
    `, [ADMIN_EMAIL, ADMIN_PHONE_NUMBER]);

    if (checkResult.rows.length > 0) {
      const existingUser = checkResult.rows[0];
      console.log('Usuário administrador já existe:', existingUser.id);

      // Verificar se o usuário tem papel de administrador
      if (existingUser.role !== 'ADMIN') {
        console.log('Atualizando papel do usuário para ADMIN...');

        await pool.query(`
          UPDATE "users_unified"
          SET
            role = 'ADMIN',
            access_permissions = jsonb_set(
              COALESCE(access_permissions, '{}'::jsonb),
              '{modules}',
              jsonb_set(
                COALESCE(access_permissions->'modules', '{}'::jsonb),
                '{admin}',
                'true'
              )
            ),
            updated_at = NOW()
          WHERE id = $1
        `, [existingUser.id]);

        console.log('Papel do usuário atualizado para ADMIN');
      }

      // Verificar se a coluna access_permissions existe
      try {
        console.log('Verificando se a coluna access_permissions existe...');

        const columnCheckResult = await pool.query(`
          SELECT column_name
          FROM information_schema.columns
          WHERE table_name = 'users_unified' AND column_name = 'access_permissions'
        `);

        if (columnCheckResult.rows.length === 0) {
          console.log('Coluna access_permissions não existe, criando...');

          await pool.query(`
            ALTER TABLE "users_unified"
            ADD COLUMN IF NOT EXISTS access_permissions JSONB DEFAULT '{}'::jsonb
          `);

          console.log('Coluna access_permissions criada com sucesso');
        }

        console.log('Atualizando permissões de administrador...');

        await pool.query(`
          UPDATE "users_unified"
          SET
            access_permissions = jsonb_set(
              COALESCE(access_permissions, '{}'::jsonb),
              '{modules}',
              jsonb_set(
                COALESCE(access_permissions->'modules', '{}'::jsonb),
                '{admin}',
                'true'
              )
            ),
            updated_at = NOW()
          WHERE id = $1
        `, [existingUser.id]);

        console.log('Permissões de administrador atualizadas');
      } catch (error) {
        console.error('Erro ao atualizar permissões:', error);
        console.log('Continuando sem atualizar permissões...');
      }

      return existingUser.id;
    }

    // Criar novo usuário administrador
    console.log('Criando novo usuário administrador...');

    // Gerar ID único
    const userId = uuidv4();

    // Gerar hash da senha
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, salt);

    // Verificar se a coluna access_permissions existe
    const columnCheckResult = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users_unified' AND column_name = 'access_permissions'
    `);

    if (columnCheckResult.rows.length === 0) {
      console.log('Coluna access_permissions não existe, criando...');

      await pool.query(`
        ALTER TABLE "users_unified"
        ADD COLUMN IF NOT EXISTS access_permissions JSONB DEFAULT '{}'::jsonb
      `);

      console.log('Coluna access_permissions criada com sucesso');
    }

    // Inserir usuário
    try {
      await pool.query(`
        INSERT INTO "users_unified" (
          id,
          email,
          phone_number,
          first_name,
          last_name,
          role,
          active,
          password,
          access_permissions,
          created_at,
          updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW()
        )
      `, [
        userId,
        ADMIN_EMAIL,
        ADMIN_PHONE_NUMBER,
        ADMIN_FIRST_NAME,
        ADMIN_LAST_NAME,
        'ADMIN',
        true,
        hashedPassword,
        JSON.stringify({ modules: { admin: true } }),
      ]);
    } catch (error) {
      // Se falhar com access_permissions, tentar sem
      if (error.message.includes('access_permissions')) {
        console.log('Erro ao inserir com access_permissions, tentando sem...');

        await pool.query(`
          INSERT INTO "users_unified" (
            id,
            email,
            phone_number,
            first_name,
            last_name,
            role,
            active,
            password,
            created_at,
            updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW()
          )
        `, [
          userId,
          ADMIN_EMAIL,
          ADMIN_PHONE_NUMBER,
          ADMIN_FIRST_NAME,
          ADMIN_LAST_NAME,
          'ADMIN',
          true,
          hashedPassword,
        ]);
      } else {
        throw error;
      }
    }

    console.log('Usuário administrador criado com sucesso:', userId);

    return userId;
  } catch (error) {
    console.error('Erro ao criar usuário administrador:', error);
    throw error;
  } finally {
    // Fechar pool de conexão
    await pool.end();
  }
}

// Executar a função principal
createAdminUser()
  .then(userId => {
    console.log('Usuário administrador criado ou atualizado com sucesso!');
    console.log('ID do usuário:', userId);
    process.exit(0);
  })
  .catch(error => {
    console.error('Erro não tratado:', error);
    process.exit(1);
  });
