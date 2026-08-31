import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { extractTokenFromHeader, verifyToken } from '@/lib/auth';
import { gerarRelatorioEscalaMensal } from '@/lib/gestao-tripulantes/relatorio-escala-generator';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization') || undefined;
    const token = extractTokenFromHeader(authHeader) || request.cookies.get('abzToken')?.value || request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Token de autorização necessário' }, { status: 401 });
    }
    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const mesAno = searchParams.get('mesAno') || new Date().toISOString().slice(0, 7);
    const download = searchParams.get('download') === 'true';

    // Verificar se já existe registro de fechamento para o mês
    const { data: registroExistente } = await supabaseAdmin
      .from('gt_relatorios_aprovacoes')
      .select('*')
      .eq('mes_referencia', mesAno)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const reportResult = await gerarRelatorioEscalaMensal({
      mesAno,
      aprovador: registroExistente?.status === 'aprovado' || registroExistente?.status === 'enviado' ? {
        nome: registroExistente.aprovado_por_nome || 'Gestor Responsável',
        cpf: registroExistente.aprovado_por_cpf,
        dataHora: registroExistente.aprovado_em ? new Date(registroExistente.aprovado_em).toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR'),
        ip: registroExistente.aprovado_ip,
        assinaturaUrl: registroExistente.assinatura_url,
        assinaturaHash: registroExistente.assinatura_hash,
      } : undefined
    });

    if (download) {
      const filename = `relatorio_escala_${mesAno}.xlsx`;
      return new NextResponse(reportResult.buffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      mesAno,
      registro: registroExistente || null,
      totaisConsolidados: reportResult.totaisConsolidados,
      colaboradoresTotais: reportResult.colaboradoresTotais,
      semanas: reportResult.semanas,
    });
  } catch (error: any) {
    console.error('[API RelatorioMensal GET]', error);
    return NextResponse.json({ error: error.message || 'Erro ao obter dados do relatório' }, { status: 500 });
  }
}
