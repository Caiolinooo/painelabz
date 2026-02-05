import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

interface SearchResult {
  id: string;
  type: 'document' | 'news' | 'user' | 'card' | 'reimbursement' | 'paystub' | 'evaluation' | 'policy' | 'procedure' | 'calendar' | 'academy';
  title: string;
  content: string;
  url: string;
  relevance?: number;
  metadata?: any;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const type = searchParams.get('type'); // Filtro por tipo
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!query || query.trim().length < 2) {
      return NextResponse.json({
        error: 'Query deve ter pelo menos 2 caracteres'
      }, { status: 400 });
    }

    console.log(`🔍 Busca Unificada iniciada (RPC): "${query}" | Tipo: ${type || 'todos'} | Limite: ${limit}`);

    // Call the RPC function for hybrid search (FTS + Partial)
    const { data: searchResults, error, count } = await supabaseAdmin.rpc('search_globally', {
      query_text: query,
      limit_val: limit,
      offset_val: offset
    });

    if (error) {
      console.error('Erro na busca unificada (RPC):', error);
      throw error;
    }

    // Extract total count from the first result (if any)
    const totalCount = searchResults && searchResults.length > 0 ? Number(searchResults[0].total_count) : 0;

    // Mapear para o formato de resposta esperado pelo frontend
    const results: SearchResult[] = (searchResults || []).map((item: any) => {
      // Determinar o tipo para o frontend
      let resultType = 'document'; // default
      // Map DB table names back to frontend types
      if (item.source_table === 'documents') resultType = 'document';
      else if (item.source_table === 'News') resultType = 'news';
      else if (item.source_table === 'users_unified') resultType = 'user';
      else if (item.source_table === 'Reimbursement') resultType = 'reimbursement';
      else if (item.source_table === 'academy_courses') resultType = 'academy';
      else if (item.source_table === 'static_cards') resultType = 'card';
      else if (item.source_table === 'system_pages') resultType = 'card';

      return {
        id: item.original_id || item.id,
        type: resultType as any,
        title: item.title || 'Sem título',
        content: item.content || '',
        url: item.url || '#',
        metadata: item.metadata
      };
    });

    console.log(`✅ Busca concluída: ${results.length} resultados encontrados de ${totalCount} total`);

    return NextResponse.json({
      query,
      type: type || 'all',
      results,
      total: totalCount,
      limit,
      offset,
      hasMore: totalCount > offset + limit
    });

  } catch (error) {
    console.error('❌ Erro na busca:', error);
    return NextResponse.json({
      error: 'Erro interno na busca',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'create_indexes') {
      console.log('🔧 Verificando estrutura das tabelas para busca...');

      // Verificar se as tabelas existem e têm dados
      const tableChecks = [];

      try {
        const { data: documents, error: docError } = await supabaseAdmin
          .from('documents')
          .select('count', { count: 'exact', head: true });
        tableChecks.push({
          table: 'documents',
          status: docError ? 'error' : 'success',
          count: documents || 0,
          error: docError
        });
      } catch (err) {
        tableChecks.push({ table: 'documents', status: 'error', error: err });
      }

      try {
        const { data: news, error: newsError } = await supabaseAdmin
          .from('news')
          .select('count', { count: 'exact', head: true });
        tableChecks.push({
          table: 'news',
          status: newsError ? 'error' : 'success',
          count: news || 0,
          error: newsError
        });
      } catch (err) {
        tableChecks.push({ table: 'news', status: 'error', error: err });
      }

      try {
        const { data: users, error: usersError } = await supabaseAdmin
          .from('users_unified')
          .select('count', { count: 'exact', head: true });
        tableChecks.push({
          table: 'users_unified',
          status: usersError ? 'error' : 'success',
          count: users || 0,
          error: usersError
        });
      } catch (err) {
        tableChecks.push({ table: 'users_unified', status: 'error', error: err });
      }

      try {
        const { data: cards, error: cardsError } = await supabaseAdmin
          .from('dashboard_cards')
          .select('count', { count: 'exact', head: true });
        tableChecks.push({
          table: 'dashboard_cards',
          status: cardsError ? 'error' : 'success',
          count: cards || 0,
          error: cardsError
        });
      } catch (err) {
        tableChecks.push({ table: 'dashboard_cards', status: 'error', error: err });
      }

      try {
        const { data: reimbursements, error: reimbError } = await supabaseAdmin
          .from('Reimbursement')
          .select('count', { count: 'exact', head: true });
        tableChecks.push({
          table: 'Reimbursement',
          status: reimbError ? 'error' : 'success',
          count: reimbursements || 0,
          error: reimbError
        });
      } catch (err) {
        tableChecks.push({ table: 'Reimbursement', status: 'error', error: err });
      }

      return NextResponse.json({
        message: 'Verificação de estrutura de busca concluída',
        note: 'Os índices de busca serão criados automaticamente pelo PostgreSQL conforme necessário',
        tableChecks
      });
    }

    return NextResponse.json({
      error: 'Ação não reconhecida'
    }, { status: 400 });

  } catch (error) {
    console.error('❌ Erro no POST da busca:', error);
    return NextResponse.json({
      error: 'Erro interno',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}
