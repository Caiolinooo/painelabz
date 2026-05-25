import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow up to 60s for large CSV uploads

export async function POST(request: NextRequest) {
  try {
    // 1. Authentication Check
    const authHeader = request.headers.get('authorization');
    let token = extractTokenFromHeader(authHeader || undefined);
    if (!token) {
      const tokenCookie = request.cookies.get('abzToken') || request.cookies.get('token');
      if (tokenCookie) token = tokenCookie.value;
    }
    if (!token) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    const payload = verifyToken(token);
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    // 2. Parse Multipart Form Data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const tabela = formData.get('tabela') as string | null; // 'tabela-27' or 'tabela-50'

    if (!file) {
      return NextResponse.json({ error: 'Arquivo CSV é obrigatório' }, { status: 400 });
    }

    if (!tabela || (tabela !== 'tabela-27' && tabela !== 'tabela-50')) {
      return NextResponse.json({ error: 'Tabela alvo inválida. Deve ser tabela-27 ou tabela-50.' }, { status: 400 });
    }

    const tableName = tabela === 'tabela-27' ? 'esocial_tabela_27' : 'esocial_tabela_50';

    // 3. Read and Parse CSV Content
    const content = await file.text();
    const lines = content.split(/\r?\n/);
    if (lines.length < 2) {
      return NextResponse.json({ error: 'O arquivo CSV está vazio ou possui formato inválido.' }, { status: 400 });
    }

    // Detect delimiter
    const firstLine = lines[0];
    let delimiter = ',';
    if (firstLine.includes('|')) {
      delimiter = '|';
    } else if (firstLine.includes(';')) {
      delimiter = ';';
    }

    const headers = firstLine.split(delimiter).map(h => h.trim().toLowerCase());
    
    // Header position indices matching common column names
    let codeIdx = headers.findIndex(h => h.includes('cod'));
    let descIdx = headers.findIndex(h => h.includes('desc'));
    let startIdx = headers.findIndex(h => h.includes('ini'));
    let endIdx = headers.findIndex(h => h.includes('fim'));

    // Position fallback
    if (codeIdx === -1) codeIdx = 0;
    if (descIdx === -1) descIdx = 1;
    if (startIdx === -1) startIdx = 2;
    if (endIdx === -1) endIdx = 3;

    // Use a Map to deduplicate records in the upload payload itself
    const recordsMap = new Map<string, any>();

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const parts = line.split(delimiter);
      if (parts.length > Math.max(codeIdx, descIdx)) {
        const codigo = parts[codeIdx]?.trim() || '';
        const descricao = parts[descIdx]?.trim() || '';
        const dtInicio = parts[startIdx]?.trim() || null;
        const dtFim = parts[endIdx]?.trim() || null;

        if (codigo && descricao) {
          recordsMap.set(codigo, {
            codigo,
            descricao,
            dt_inicio: dtInicio,
            dt_fim: dtFim,
            updated_at: new Date().toISOString()
          });
        }
      }
    }

    const records = Array.from(recordsMap.values());
    if (records.length === 0) {
      return NextResponse.json({ error: 'Nenhum registro válido pôde ser extraído do CSV.' }, { status: 400 });
    }

    // 4. Batch upsert to database using Supabase Admin Client
    const batchSize = 100;
    let insertedCount = 0;

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const { error: upsertError } = await supabaseAdmin
        .from(tableName)
        .upsert(batch, { onConflict: 'codigo' });

      if (upsertError) {
        console.error(`Erro ao fazer upsert no lote ${i} da tabela ${tableName}:`, upsertError);
        return NextResponse.json({ error: `Erro na importação: ${upsertError.message}` }, { status: 500 });
      }

      insertedCount += batch.length;
    }

    return NextResponse.json({
      success: true,
      message: `Tabela ${tabela} importada/atualizada com sucesso!`,
      totalImported: insertedCount
    });
  } catch (error) {
    console.error('Erro em POST /api/e-social/importar-tabelas:', error);
    return NextResponse.json({ error: 'Erro interno ao processar a importação' }, { status: 500 });
  }
}
