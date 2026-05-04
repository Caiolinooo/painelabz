/**
 * API: /api/ia/cron/execute
 * Endpoint invocado pelo pg_cron para executar tarefas agendadas da IA
 * Autenticado via CRON_SECRET header
 */
import { NextRequest, NextResponse } from 'next/server';
import { chatCompletion } from '@/lib/ia/client';
import { buildUserContext, buildSystemPrompt } from '@/lib/ia/context-builder';
import {
  getPendingTasks,
  markTaskExecuted,
  logAgentAction,
  sendProactiveReminder,
  analyzeKPIs,
} from '@/lib/ia/agent-service';
import { buildKnowledgeContext } from '@/lib/ia/knowledge-base';

const CRON_SECRET = process.env.CRON_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const maxDuration = 300; // 5 minutos

export async function POST(request: NextRequest) {
  try {
    // Validar autenticação do cron
    const authHeader = request.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');

    if (!CRON_SECRET || token !== CRON_SECRET) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Buscar tarefas pendentes
    const tasks = await getPendingTasks();

    if (tasks.length === 0) {
      return NextResponse.json({ message: 'Nenhuma tarefa pendente', executed: 0 });
    }

    const results: any[] = [];

    for (const task of tasks) {
      try {
        console.log(`[Cron] Executando tarefa: ${task.task_name} (${task.id})`);

        if (task.task_type === 'kpi_check') {
          // Análise automática de KPIs
          const analyses = await analyzeKPIs();

          for (const analysis of analyses) {
            if (analysis.priority === 'high' || analysis.priority === 'critical') {
              // Enviar lembretes para usuários afetados
              for (const affectedUserId of analysis.affectedUsers.slice(0, 10)) {
                await sendProactiveReminder(
                  affectedUserId,
                  `⚠️ ${analysis.kpiLabel}`,
                  `${analysis.suggestedAction}. Valor atual: ${analysis.currentValue}${analysis.unit === 'percent' ? '%' : ''} (meta: ${analysis.targetValue}${analysis.unit === 'percent' ? '%' : ''})`,
                  task.notification_channels,
                  { priority: analysis.priority, taskId: task.id }
                );
              }
            }
          }

          await logAgentAction({
            taskId: task.id,
            actionType: 'kpi_analyzed',
            description: `Analisados ${analyses.length} KPIs`,
            details: { analyses: analyses.map(a => ({ kpi: a.kpiKey, gap: a.gap, priority: a.priority })) },
            kpiSnapshot: { total: analyses.length, critical: analyses.filter(a => a.priority === 'critical').length },
            success: true,
          });

          results.push({ taskId: task.id, type: 'kpi_check', analysesCount: analyses.length, success: true });

        } else if (task.task_type === 'reminder') {
          // Lembrete direto
          const targetUsers = task.target_users || [];
          for (const targetUserId of targetUsers) {
            await sendProactiveReminder(
              targetUserId,
              task.task_name,
              task.prompt,
              task.notification_channels,
              { taskId: task.id }
            );
          }

          results.push({ taskId: task.id, type: 'reminder', sent: targetUsers.length, success: true });

        } else if (task.task_type === 'custom') {
          // Prompt customizado - executar via chatCompletion
          const userContext = await buildUserContext(task.user_id);
          if (userContext) {
            const systemPrompt = buildSystemPrompt(userContext);
            const kbContext = await buildKnowledgeContext(task.user_id, userContext.role, userContext.department);

            const messages = [
              { role: 'system' as const, content: systemPrompt + kbContext },
              { role: 'user' as const, content: task.prompt },
            ];

            const response = await chatCompletion(messages, undefined, {
              role: userContext.role,
              userId: task.user_id,
            });

            const content = response?.choices?.[0]?.message?.content || '';

            await logAgentAction({
              taskId: task.id,
              userId: task.user_id,
              actionType: 'custom_prompt',
              description: `Executado prompt customizado: ${task.task_name}`,
              details: { prompt: task.prompt, responseLength: content.length },
              success: true,
            });

            results.push({ taskId: task.id, type: 'custom', success: true });
          }
        }

        // Marcar como executada
        await markTaskExecuted(task.id, true);

      } catch (taskErr) {
        const errorMsg = taskErr instanceof Error ? taskErr.message : 'Erro desconhecido';
        console.error(`[Cron] Erro na tarefa ${task.id}:`, errorMsg);
        await markTaskExecuted(task.id, false, errorMsg);

        await logAgentAction({
          taskId: task.id,
          actionType: 'execution_error',
          description: `Erro ao executar: ${task.task_name}`,
          details: { error: errorMsg },
          success: false,
          error: errorMsg,
        });

        results.push({ taskId: task.id, success: false, error: errorMsg });
      }
    }

    return NextResponse.json({
      message: `Executadas ${results.length} tarefas`,
      executed: results.length,
      results,
    });
  } catch (err) {
    console.error('[Cron API] Error:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

/**
 * GET — Status do sistema de cron
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');

    if (!CRON_SECRET || token !== CRON_SECRET) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const tasks = await getPendingTasks();
    return NextResponse.json({ pending: tasks.length, tasks: tasks.map(t => ({ id: t.id, name: t.task_name, nextRun: t.next_run })) });
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
