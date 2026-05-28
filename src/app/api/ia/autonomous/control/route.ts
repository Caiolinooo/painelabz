import { NextRequest, NextResponse } from 'next/server';
import { verifyRequestToken } from '@/lib/auth';
import { getAvailableTools, executeToolCall } from '@/lib/ia/tools';
import { isFeatureEnabled } from '@/lib/ia/agent-service';

export const dynamic = 'force-dynamic';

/**
 * POST /api/ia/autonomous/control
 * Controla o agente autônomo (iniciar, parar, status, etc.)
 */
export async function POST(request: NextRequest) {
  try {
    const tokenResult = verifyRequestToken(request);
    if (!tokenResult.valid || !tokenResult.payload) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const userId = tokenResult.payload.userId;
    const role = tokenResult.payload.role;
    const body = await request.json();
    const { action, usuario_id, setor_id, config } = body;

    // Verificar se a feature está habilitada
    const featureEnabled = await isFeatureEnabled('autonomous_agent', role);
    if (!featureEnabled) {
      return NextResponse.json(
        { error: 'Agente autônomo não está habilitado para seu perfil' },
        { status: 403 }
      );
    }

    switch (action) {
      case 'start': {
        if (!usuario_id || !setor_id) {
          return NextResponse.json(
            { error: 'usuario_id e setor_id são obrigatórios' },
            { status: 400 }
          );
        }

        // Verificar permissão para iniciar agente para outro usuário
        if (usuario_id !== userId && role !== 'ADMIN' && role !== 'GERENTE') {
          return NextResponse.json(
            { error: 'Você não tem permissão para iniciar o agente para este usuário' },
            { status: 403 }
          );
        }

        // Executar ferramenta de iniciar agente
        const result = await executeToolCall(
          'iniciar_agente_autonomo',
          { usuario_id, setor_id, config },
          role,
          userId
        );

        return NextResponse.json({
          success: true,
          message: result,
          action: 'start',
        });
      }

      case 'stop': {
        if (!usuario_id) {
          return NextResponse.json(
            { error: 'usuario_id é obrigatório' },
            { status: 400 }
          );
        }

        // Verificar permissão
        if (usuario_id !== userId && role !== 'ADMIN' && role !== 'GERENTE') {
          return NextResponse.json(
            { error: 'Você não tem permissão para parar o agente deste usuário' },
            { status: 403 }
          );
        }

        const result = await executeToolCall(
          'parar_agente_autonomo',
          { usuario_id },
          role,
          userId
        );

        return NextResponse.json({
          success: true,
          message: result,
          action: 'stop',
        });
      }

      case 'status': {
        if (!usuario_id) {
          return NextResponse.json(
            { error: 'usuario_id é obrigatório' },
            { status: 400 }
          );
        }

        // Verificar permissão
        if (usuario_id !== userId && role !== 'ADMIN' && role !== 'GERENTE') {
          return NextResponse.json(
            { error: 'Você não tem permissão para ver o status deste agente' },
            { status: 403 }
          );
        }

        const result = await executeToolCall(
          'status_agente_autonomo',
          { usuario_id },
          role,
          userId
        );

        // Parse do resultado JSON
        let statusData;
        try {
          statusData = JSON.parse(result);
        } catch {
          statusData = { raw: result };
        }

        return NextResponse.json({
          success: true,
          status: statusData,
          action: 'status',
        });
      }

      case 'override': {
        if (!usuario_id || !body.acao || !body.parametros || !body.justificativa) {
          return NextResponse.json(
            { error: 'usuario_id, acao, parametros e justificativa são obrigatórios' },
            { status: 400 }
          );
        }

        // Verificar permissão
        if (usuario_id !== userId && role !== 'ADMIN' && role !== 'GERENTE') {
          return NextResponse.json(
            { error: 'Você não tem permissão para sobrescrever ações deste usuário' },
            { status: 403 }
          );
        }

        const result = await executeToolCall(
          'sobrescrever_acao_autonomo',
          {
            usuario_id,
            acao: body.acao,
            parametros: body.parametros,
            justificativa: body.justificativa,
          },
          role,
          userId
        );

        return NextResponse.json({
          success: true,
          message: result,
          action: 'override',
        });
      }

      case 'tools': {
        // Listar ferramentas disponíveis
        const tools = await getAvailableTools(userId, role);
        const autonomousTools = tools.filter(t => 
          t.name?.includes('autonomo') || 
          t.name?.includes('agente') ||
          t.featureToggle === 'autonomous_agent'
        );

        return NextResponse.json({
          success: true,
          tools: autonomousTools,
          allTools: tools,
        });
      }

      default:
        return NextResponse.json(
          { error: 'Ação inválida. Use: start, stop, status, override, ou tools' },
          { status: 400 }
        );
    }
  } catch (err) {
    console.error('[API Autonomous Control]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ia/autonomous/control
 * Consulta status do agente autônomo
 */
export async function GET(request: NextRequest) {
  try {
    const tokenResult = verifyRequestToken(request);
    if (!tokenResult.valid || !tokenResult.payload) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const userId = tokenResult.payload.userId;
    const role = tokenResult.payload.role;
    const searchParams = request.nextUrl.searchParams;
    const usuario_id = searchParams.get('usuario_id') || userId;

    // Verificar permissão
    if (usuario_id !== userId && role !== 'ADMIN' && role !== 'GERENTE') {
      return NextResponse.json(
        { error: 'Você não tem permissão para ver o status deste agente' },
        { status: 403 }
      );
    }

    const result = await executeToolCall(
      'status_agente_autonomo',
      { usuario_id },
      role,
      userId
    );

    let statusData;
    try {
      statusData = JSON.parse(result);
    } catch {
      statusData = { raw: result };
    }

    return NextResponse.json({
      success: true,
      status: statusData,
    });
  } catch (err) {
    console.error('[API Autonomous GET]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
