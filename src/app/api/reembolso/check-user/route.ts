import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db';

// Função auxiliar para verificar se a tabela de reembolsos existe
async function checkReimbursementTableExists() {
  try {
    console.log('Verificando se a tabela de reembolsos existe...');

    // Verificar se a tabela Reimbursement existe usando metadados do Supabase
    const { data: tableExists, error } = await supabaseAdmin
      .from('Reimbursement')
      .select('id')
      .limit(1);

    if (error) {
      console.error('Tabela Reimbursement não encontrada:', error);

      // Tentar com o nome alternativo
      const { data: altTableExists, error: altError } = await supabaseAdmin
        .from('reimbursements')
        .select('id')
        .limit(1);

      if (altError) {
        console.error('Tabela reimbursements também não encontrada:', altError);
        return { exists: false, tableName: null };
      }

      console.log('Tabela reimbursements encontrada');
      return { exists: true, tableName: 'reimbursements' };
    }

    console.log('Tabela Reimbursement encontrada');
    return { exists: true, tableName: 'Reimbursement' };
  } catch (error) {
    console.error('Exceção ao verificar tabela de reembolsos:', error);
    return { exists: false, tableName: null };
  }
}

// GET - Verificar se um usuário tem reembolsos
export async function GET(request: NextRequest) {
  try {
    // Obter parâmetros de consulta
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { error: 'Email é obrigatório' },
        { status: 400 }
      );
    }

    console.log(`Verificando reembolsos para o email: ${email}`);

    // Normalizar o email para busca case-insensitive
    const normalizedEmail = email.toLowerCase().trim();
    console.log(`Email normalizado: ${normalizedEmail}`);

    // Verificar se a tabela de reembolsos existe
    const { exists, tableName } = await checkReimbursementTableExists();

    if (!exists) {
      console.error('Tabela de reembolsos não encontrada');
      return NextResponse.json(
        { error: 'A tabela de reembolsos não existe no banco de dados.' },
        { status: 500 }
      );
    }

    console.log(`Tabela de reembolsos encontrada: ${tableName}`);

    // Buscar reembolsos com email exato
    const { data: exactMatch, error: exactError } = await supabaseAdmin
      .from(tableName)
      .select('*')
      .eq('email', email)
      .order('created_at', { ascending: false });

    if (exactError) {
      console.error('Erro ao buscar reembolsos com email exato:', exactError);
    } else {
      console.log(`Encontrados ${exactMatch?.length || 0} reembolsos com email exato`);
    }

    // Buscar reembolsos com email case insensitive exato
    const { data: caseInsensitiveMatch, error: caseError } = await supabaseAdmin
      .from(tableName)
      .select('*')
      .ilike('email', normalizedEmail)
      .order('created_at', { ascending: false });

    if (caseError) {
      console.error('Erro ao buscar reembolsos com email case insensitive:', caseError);
    } else {
      console.log(`Encontrados ${caseInsensitiveMatch?.length || 0} reembolsos com email case insensitive`);
    }

    // Buscar reembolsos com email parcial (contém)
    const { data: partialMatch, error: partialError } = await supabaseAdmin
      .from(tableName)
      .select('*')
      .ilike('email', `%${normalizedEmail}%`)
      .order('created_at', { ascending: false });

    if (partialError) {
      console.error('Erro ao buscar reembolsos com email parcial:', partialError);
    } else {
      console.log(`Encontrados ${partialMatch?.length || 0} reembolsos com email parcial`);
    }

    // Buscar reembolsos com nome de usuário (parte antes do @)
    const emailParts = normalizedEmail.split('@');
    const username = emailParts[0];

    let usernameMatch = [];

    if (username) {
      const { data: usernameData, error: usernameError } = await supabaseAdmin
        .from(tableName)
        .select('*')
        .ilike('email', `%${username}%`)
        .order('created_at', { ascending: false });

      if (usernameError) {
        console.error('Erro ao buscar reembolsos com nome de usuário:', usernameError);
      } else {
        console.log(`Encontrados ${usernameData?.length || 0} reembolsos com nome de usuário`);
        usernameMatch = usernameData || [];
      }
    }

    // Buscar alguns emails da tabela para comparação
    const { data: sampleEmails, error: sampleError } = await supabaseAdmin
      .from(tableName)
      .select('email')
      .limit(20);

    if (sampleError) {
      console.error('Erro ao buscar amostra de emails:', sampleError);
    } else {
      console.log('Amostra de emails na tabela:', sampleEmails?.map(item => item.email));
    }

    // Processar os resultados para normalizar os dados
    const processResults = (results: any[]) => {
      return (results || []).map(item => ({
        id: item.id,
        protocolo: item.protocolo,
        nome: item.nome,
        email: item.email,
        data: item.data,
        valorTotal: parseFloat(item.valor_total || item.valorTotal || 0),
        tipoReembolso: item.tipo_reembolso || item.tipoReembolso || 'Não especificado',
        status: item.status || 'pendente',
        created_at: item.created_at
      }));
    };

    return NextResponse.json({
      email,
      normalizedEmail,
      exactMatch: processResults(exactMatch || []),
      caseInsensitiveMatch: processResults(caseInsensitiveMatch || []),
      partialMatch: processResults(partialMatch || []),
      usernameMatch: processResults(usernameMatch || []),
      sampleEmails: sampleEmails?.map(item => item.email) || [],
      hasExactMatch: (exactMatch && exactMatch.length > 0) || false,
      hasCaseInsensitiveMatch: (caseInsensitiveMatch && caseInsensitiveMatch.length > 0) || false,
      hasPartialMatch: (partialMatch && partialMatch.length > 0) || false,
      hasUsernameMatch: (usernameMatch && usernameMatch.length > 0) || false,
      // Include emails found for debugging
      emailsFound: [
        ...(exactMatch || []).map(item => item.email),
        ...(caseInsensitiveMatch || []).filter(item => !(exactMatch || []).some(e => e.id === item.id)).map(item => item.email),
        ...(partialMatch || []).filter(item =>
          !(exactMatch || []).some(e => e.id === item.id) &&
          !(caseInsensitiveMatch || []).some(e => e.id === item.id)
        ).map(item => item.email),
        ...(usernameMatch || []).filter(item =>
          !(exactMatch || []).some(e => e.id === item.id) &&
          !(caseInsensitiveMatch || []).some(e => e.id === item.id) &&
          !(partialMatch || []).some(e => e.id === item.id)
        ).map(item => item.email)
      ]
    });
  } catch (error) {
    console.error('Erro ao verificar reembolsos do usuário:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
