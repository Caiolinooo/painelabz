/**
 * Script para gerar um token JWT para o administrador
 */

require('dotenv').config();
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const fs = require('fs');

// Configurações
const DATABASE_URL = process.env.DATABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'caio.correia@groupabz.com';
const ADMIN_PHONE_NUMBER = process.env.ADMIN_PHONE_NUMBER || '+5522997847289';

// Verificar configurações
if (!DATABASE_URL) {
  console.error('Erro: DATABASE_URL deve estar definido no arquivo .env');
  process.exit(1);
}

if (!JWT_SECRET) {
  console.error('Erro: JWT_SECRET deve estar definido no arquivo .env');
  process.exit(1);
}

// Criar pool de conexão
const pool = new Pool({
  connectionString: DATABASE_URL
});

async function generateAdminToken() {
  console.log('Gerando token JWT para o administrador...');

  try {
    // Buscar o usuário administrador
    console.log('Buscando usuário administrador...');

    const result = await pool.query(`
      SELECT * FROM "users_unified"
      WHERE email = $1 OR phone_number = $2
    `, [ADMIN_EMAIL, ADMIN_PHONE_NUMBER]);

    if (result.rows.length === 0) {
      console.error('Usuário administrador não encontrado');
      return null;
    }

    const adminUser = result.rows[0];
    console.log('Usuário administrador encontrado:', adminUser.id);

    // Gerar token JWT
    const payload = {
      userId: adminUser.id,
      email: adminUser.email,
      phoneNumber: adminUser.phone_number,
      role: 'ADMIN',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 dias
    };

    const token = jwt.sign(payload, JWT_SECRET);
    console.log('Token JWT gerado com sucesso');

    // Salvar token em um arquivo
    fs.writeFileSync('.token', token);
    console.log('Token salvo no arquivo .token');

    // Exibir token
    console.log('\nToken JWT:');
    console.log(token);

    return token;
  } catch (error) {
    console.error('Erro ao gerar token JWT:', error);
    throw error;
  } finally {
    // Fechar pool de conexão
    await pool.end();
  }
}

// Executar a função principal
generateAdminToken()
  .then(token => {
    if (token) {
      console.log('\nToken JWT gerado com sucesso!');
      process.exit(0);
    } else {
      console.error('Falha ao gerar token JWT');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Erro não tratado:', error);
    process.exit(1);
  });
