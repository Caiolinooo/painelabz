// Script para testar o login com o Supabase diretamente
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

async function main() {
  console.log('Testando login com o Supabase diretamente...');

  const adminEmail = 'caio.correia@groupabz.com';
  const adminPassword = 'Caio@2122@';

  // Criar cliente Supabase
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Variáveis de ambiente do Supabase não definidas');
    process.exit(1);
  }

  console.log('Conectando ao Supabase:', supabaseUrl);
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  try {
    // Verificar se o usuário existe
    console.log('Verificando se o usuário existe:', adminEmail);
    const { data: user, error: userError } = await supabase
      .from('User')
      .select('*')
      .eq('email', adminEmail)
      .single();

    if (userError) {
      console.error('Erro ao buscar usuário:', userError.message);

      // Tentar conexão direta com PostgreSQL
      console.log('Tentando conexão direta com PostgreSQL...');
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL
      });

      try {
        const result = await pool.query(`
          SELECT * FROM "User" WHERE "email" = $1
        `, [adminEmail]);

        if (result.rows.length > 0) {
          console.log('Usuário encontrado via PostgreSQL:', result.rows[0].id);

          // Verificar senha
          const isPasswordValid = await bcrypt.compare(adminPassword, result.rows[0].password);
          console.log('Senha válida:', isPasswordValid);

          if (!isPasswordValid) {
            // Atualizar senha
            console.log('Atualizando senha...');
            const hashedPassword = await bcrypt.hash(adminPassword, 10);

            await pool.query(`
              UPDATE "User"
              SET "password" = $1, "updatedAt" = CURRENT_TIMESTAMP
              WHERE "id" = $2
            `, [hashedPassword, result.rows[0].id]);

            console.log('Senha atualizada com sucesso');
          }
        } else {
          console.log('Usuário não encontrado via PostgreSQL');

          // Criar usuário administrador
          console.log('Criando usuário administrador...');
          const { v4: uuidv4 } = require('uuid');
          const userId = uuidv4();
          const hashedPassword = await bcrypt.hash(adminPassword, 10);

          const adminResult = await pool.query(`
            INSERT INTO "User" (
              "id",
              "email",
              "phoneNumber",
              "firstName",
              "lastName",
              "role",
              "position",
              "department",
              "active",
              "password",
              "passwordLastChanged",
              "accessPermissions",
              "createdAt",
              "updatedAt"
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            RETURNING *
          `, [
            userId,
            adminEmail,
            process.env.ADMIN_PHONE_NUMBER || '+5522997847289',
            process.env.ADMIN_FIRST_NAME || 'Caio',
            process.env.ADMIN_LAST_NAME || 'Correia',
            'ADMIN',
            'Administrador do Sistema',
            'TI',
            true,
            hashedPassword,
            new Date(),
            JSON.stringify({
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
            })
          ]);

          console.log('Usuário administrador criado com sucesso:', adminResult.rows[0].id);
        }

        await pool.end();
      } catch (pgError) {
        console.error('Erro na conexão PostgreSQL:', pgError);
      }

      return;
    }

    console.log('Usuário encontrado via Supabase:', user.id);

    // Verificar senha
    const isPasswordValid = await bcrypt.compare(adminPassword, user.password);
    console.log('Senha válida:', isPasswordValid);

    if (!isPasswordValid) {
      // Atualizar senha via Supabase
      console.log('Atualizando senha via Supabase...');
      const hashedPassword = await bcrypt.hash(adminPassword, 10);

      const { error: updateError } = await supabase
        .from('User')
        .update({ password: hashedPassword })
        .eq('id', user.id);

      if (updateError) {
        console.error('Erro ao atualizar senha:', updateError.message);
      } else {
        console.log('Senha atualizada com sucesso');
      }
    }

    // Testar login com a API
    console.log('Testando login com a API...');
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: adminEmail,
        password: adminPassword,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      console.log('Login bem-sucedido:', data.token ? 'Token gerado' : 'Sem token');
    } else {
      console.error('Erro no login com a API:', response.status);
      const errorData = await response.json();
      console.error('Detalhes do erro:', errorData);
    }

  } catch (error) {
    console.error('Erro geral:', error);
  }
}

main()
  .catch(error => {
    console.error('Erro não tratado:', error);
    process.exit(1);
  });
