import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db';

/**
 * Verifica se a tabela Reimbursement existe e adiciona a coluna user_id se necessário
 */
async function checkAndAddUserIdColumn() {
  try {
    // Verificar se a tabela Reimbursement existe tentando acessá-la diretamente
    const { data: testData, error: testError } = await supabaseAdmin
      .from('Reimbursement')
      .select('id')
      .limit(1);

    if (testError) {
      console.error('Erro ao verificar tabela Reimbursement:', testError);
      return { success: false, error: testError.message };
    }

    console.log('Tabela Reimbursement encontrada');

    // Verificar se a coluna user_id já existe usando SQL direto
    const { data: columnCheckData, error: columnCheckError } = await supabaseAdmin.rpc(
      'execute_sql',
      {
        sql: `
          SELECT column_name
          FROM information_schema.columns
          WHERE table_schema = 'public'
          AND table_name = 'Reimbursement'
          AND column_name = 'user_id'
        `
      }
    );

    // Se o RPC falhar, tentar uma abordagem alternativa
    if (columnCheckError) {
      console.error('Erro ao verificar coluna user_id via RPC:', columnCheckError);

      // Tentar verificar a existência da coluna tentando selecionar dados com ela
      try {
        const { data: userIdData, error: userIdError } = await supabaseAdmin
          .from('Reimbursement')
          .select('user_id')
          .limit(1);

        // Se não houver erro, a coluna existe
        if (!userIdError) {
          console.log('Coluna user_id já existe (verificado via select)');
          return { success: true, message: 'Coluna user_id já existe' };
        }

        // Se o erro não for sobre coluna inexistente, propagar o erro
        if (!userIdError.message.includes('column') && !userIdError.message.includes('não existe')) {
          throw userIdError;
        }

        // A coluna não existe, continuar para adicioná-la
      } catch (selectError) {
        console.log('Erro ao verificar coluna via select:', selectError);
        // Continuar para tentar adicionar a coluna
      }
    } else if (columnCheckData && columnCheckData.length > 0) {
      console.log('Coluna user_id já existe (verificado via RPC)');
      return { success: true, message: 'Coluna user_id já existe' };
    }

    console.log('Adicionando coluna user_id à tabela Reimbursement');

    // Adicionar a coluna user_id usando SQL direto via RPC
    const { data: alterTableData, error: alterTableError } = await supabaseAdmin.rpc(
      'execute_sql',
      {
        sql: `
          ALTER TABLE "Reimbursement"
          ADD COLUMN IF NOT EXISTS "user_id" UUID REFERENCES "users_unified"("id") ON DELETE SET NULL;
        `
      }
    );

    if (alterTableError) {
      console.error('Erro ao adicionar coluna user_id via RPC:', alterTableError);

      // Tentar abordagem alternativa com fetch direto
      try {
        // Adicionar a coluna user_id
        const addColumnSQL = `
          ALTER TABLE "Reimbursement"
          ADD COLUMN IF NOT EXISTS "user_id" UUID REFERENCES "users_unified"("id") ON DELETE SET NULL;
        `;

        // Executar o SQL para adicionar a coluna
        const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
            'X-Client-Info': 'supabase-js/2.0.0',
          },
          body: JSON.stringify({
            cmd: 'project.query',
            query: addColumnSQL
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Erro ao adicionar coluna user_id via fetch:', errorData);
          return { success: false, error: 'Falha ao adicionar coluna user_id', details: errorData };
        }
      } catch (fetchError) {
        console.error('Erro ao adicionar coluna via fetch:', fetchError);
        return {
          success: false,
          error: 'Erro ao adicionar coluna user_id',
          details: fetchError instanceof Error ? fetchError.message : 'Erro desconhecido'
        };
      }
    }

    console.log('Coluna user_id adicionada com sucesso');
    return { success: true, message: 'Coluna user_id adicionada com sucesso' };
  } catch (error) {
    console.error('Erro ao adicionar coluna user_id:', error);
    return {
      success: false,
      error: 'Erro interno ao adicionar coluna user_id',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
}

/**
 * Migra dados existentes para usar user_id
 */
async function migrateExistingData() {
  try {
    console.log('Iniciando migração de dados existentes');

    // Verificar primeiro se a coluna user_id existe
    try {
      const { data: userIdData, error: userIdError } = await supabaseAdmin
        .from('Reimbursement')
        .select('user_id')
        .limit(1);

      if (userIdError) {
        console.error('Erro ao verificar coluna user_id:', userIdError);
        return {
          success: false,
          error: 'A coluna user_id não existe ou não está acessível',
          details: userIdError.message
        };
      }
    } catch (error) {
      console.error('Erro ao verificar coluna user_id:', error);
      return {
        success: false,
        error: 'Erro ao verificar coluna user_id',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }

    // Obter todos os reembolsos que não têm user_id definido
    const { data: reimbursements, error: fetchError } = await supabaseAdmin
      .from('Reimbursement')
      .select('id, email')
      .is('user_id', null);

    if (fetchError) {
      console.error('Erro ao buscar reembolsos para migração:', fetchError);
      return { success: false, error: fetchError.message };
    }

    if (!reimbursements || reimbursements.length === 0) {
      console.log('Nenhum reembolso encontrado para migração');
      return { success: true, message: 'Nenhum reembolso encontrado para migração' };
    }

    console.log(`Encontrados ${reimbursements.length} reembolsos para migração`);

    // Para cada reembolso, encontrar o usuário correspondente pelo email
    let migratedCount = 0;
    let failedCount = 0;

    for (const reimbursement of reimbursements) {
      try {
        if (!reimbursement.email) {
          console.log(`Reembolso ${reimbursement.id} não tem email definido, pulando`);
          failedCount++;
          continue;
        }

        const normalizedEmail = reimbursement.email.toLowerCase().trim();

        // Buscar usuário pelo email
        const { data: users, error: userError } = await supabaseAdmin
          .from('users_unified')
          .select('id')
          .eq('email', normalizedEmail);

        if (userError) {
          console.error(`Erro ao buscar usuário para email ${normalizedEmail}:`, userError);
          failedCount++;
          continue;
        }

        if (!users || users.length === 0) {
          console.log(`Nenhum usuário encontrado para email ${normalizedEmail}`);

          // Tentar buscar em user_emails
          const { data: userEmails, error: emailError } = await supabaseAdmin
            .from('user_emails')
            .select('user_id')
            .eq('email', normalizedEmail);

          if (emailError || !userEmails || userEmails.length === 0) {
            console.log(`Nenhum email adicional encontrado para ${normalizedEmail}`);
            failedCount++;
            continue;
          }

          // Atualizar o reembolso com o user_id encontrado
          const { error: updateError } = await supabaseAdmin
            .from('Reimbursement')
            .update({ user_id: userEmails[0].user_id })
            .eq('id', reimbursement.id);

          if (updateError) {
            console.error(`Erro ao atualizar reembolso ${reimbursement.id}:`, updateError);
            failedCount++;
          } else {
            console.log(`Reembolso ${reimbursement.id} atualizado com user_id ${userEmails[0].user_id}`);
            migratedCount++;
          }
        } else {
          // Atualizar o reembolso com o user_id encontrado
          const { error: updateError } = await supabaseAdmin
            .from('Reimbursement')
            .update({ user_id: users[0].id })
            .eq('id', reimbursement.id);

          if (updateError) {
            console.error(`Erro ao atualizar reembolso ${reimbursement.id}:`, updateError);
            failedCount++;
          } else {
            console.log(`Reembolso ${reimbursement.id} atualizado com user_id ${users[0].id}`);
            migratedCount++;
          }
        }
      } catch (error) {
        console.error(`Erro ao migrar reembolso ${reimbursement.id}:`, error);
        failedCount++;
      }
    }

    return {
      success: true,
      message: `Migração concluída: ${migratedCount} reembolsos migrados, ${failedCount} falhas`
    };
  } catch (error) {
    console.error('Erro ao migrar dados existentes:', error);
    return {
      success: false,
      error: 'Erro interno ao migrar dados',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verificar e adicionar a coluna user_id
    const columnResult = await checkAndAddUserIdColumn();

    if (!columnResult.success) {
      return NextResponse.json(columnResult, { status: 500 });
    }

    // Migrar dados existentes
    const migrationResult = await migrateExistingData();

    return NextResponse.json({
      columnResult,
      migrationResult
    });
  } catch (error) {
    console.error('Erro na rota add-user-id-column:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}
