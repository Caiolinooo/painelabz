import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db';

/**
 * Verifica se a tabela Reimbursement existe e adiciona a coluna user_id se necessário
 */
async function checkAndAddUserIdColumn() {
  try {
    // Verificar se a tabela Reimbursement existe
    const { data: tables, error: tablesError } = await supabaseAdmin
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'Reimbursement');

    if (tablesError) {
      console.error('Erro ao verificar tabela Reimbursement:', tablesError);
      return { success: false, error: tablesError.message };
    }

    if (!tables || tables.length === 0) {
      console.log('Tabela Reimbursement não encontrada');
      return { success: false, error: 'Tabela Reimbursement não encontrada' };
    }

    console.log('Tabela Reimbursement encontrada');

    // Verificar se a coluna user_id já existe
    const { data: columns, error: columnsError } = await supabaseAdmin
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'Reimbursement')
      .eq('column_name', 'user_id');

    if (columnsError) {
      console.error('Erro ao verificar coluna user_id:', columnsError);
      return { success: false, error: columnsError.message };
    }

    if (columns && columns.length > 0) {
      console.log('Coluna user_id já existe');
      return { success: true, message: 'Coluna user_id já existe' };
    }

    console.log('Adicionando coluna user_id à tabela Reimbursement');

    // Adicionar a coluna user_id
    const addColumnSQL = `
      ALTER TABLE "Reimbursement" 
      ADD COLUMN "user_id" UUID REFERENCES "users_unified"("id") ON DELETE SET NULL;
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
      console.error('Erro ao adicionar coluna user_id:', errorData);
      return { success: false, error: 'Falha ao adicionar coluna user_id', details: errorData };
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
        // Buscar usuário pelo email
        const { data: users, error: userError } = await supabaseAdmin
          .from('users_unified')
          .select('id')
          .eq('email', reimbursement.email.toLowerCase().trim());

        if (userError) {
          console.error(`Erro ao buscar usuário para email ${reimbursement.email}:`, userError);
          failedCount++;
          continue;
        }

        if (!users || users.length === 0) {
          console.log(`Nenhum usuário encontrado para email ${reimbursement.email}`);
          
          // Tentar buscar em user_emails
          const { data: userEmails, error: emailError } = await supabaseAdmin
            .from('user_emails')
            .select('user_id')
            .eq('email', reimbursement.email.toLowerCase().trim());

          if (emailError || !userEmails || userEmails.length === 0) {
            console.log(`Nenhum email adicional encontrado para ${reimbursement.email}`);
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
