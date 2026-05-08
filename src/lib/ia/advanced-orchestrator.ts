// =====================================================
// Advanced Orchestrator - Enhanced Decision-Making
// =====================================================

import type { IADashboardLayout, IADashboardWidget } from '@/types/ia';
import type { IAUserContext } from '@/types/ia';
import { generateDashboard } from './dashboard-service';

// Priority levels for decision making
export interface Priority {
  level: 'critical' | 'high' | 'medium' | 'low';
  score: number;
  reason: string;
  source: string;
  weight: number;
}

// Action definition
export interface Action {
  type: string;
  parameters: Record<string, any>;
  expectedOutcome: string;
  fallback?: string;
  priority: number;
}

// Plan step
export interface PlanStep {
  source: string;
  action: string;
  parameters: Record<string, any>;
  justification: string;
  expectedOutcome: string;
  fallback?: string;
  priority: number;
}

// Plan with metadata
export interface Plan {
  steps: PlanStep[];
  justification: string;
  metadata: {
    generatedAt: string;
    confidence: number;
    alternatives: string[];
    estimatedImpact: string;
  };
}

// Gap analysis result
export interface GapAnalysis {
  kpiKey: string;
  kpiLabel: string;
  currentValue: number;
  targetValue: number;
  gap: number;
  unit: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  affectedUsers: string[];
  trend: 'improving' | 'declining' | 'stable';
}

export class AdvancedOrchestrator {
  private decisionHistory: Array<{
    timestamp: string;
    plan: Plan;
    outcome: string;
    confidence: number;
  }> = [];

  /**
   * Generate a comprehensive plan based on gap analysis and context
   */
  async generatePlan(analysis: GapAnalysis[], context: IAUserContext): Promise<Plan> {
    const steps: PlanStep[] = [];
    
    // 1. Calculate priorities for each gap
    const priorities = this.calculatePriorities(analysis, context);
    
    // 2. Generate steps based on priorities
    for (const priority of priorities) {
      const step = await this.createStep(priority, context);
      if (step) {
        steps.push(step);
      }
    }
    
    // 3. Add recovery/fallback steps
    const recoverySteps = this.generateRecoverySteps(steps, context);
    steps.push(...recoverySteps);
    
    // 4. Calculate overall confidence
    const confidence = this.calculateConfidence(steps, context);
    
    // 5. Generate alternatives
    const alternatives = await this.generateAlternatives(steps, context);
    
    // 6. Estimate impact
    const estimatedImpact = this.estimateImpact(steps, analysis);
    
    const plan: Plan = {
      steps,
      justification: this.generateJustification(steps, analysis, context),
      metadata: {
        generatedAt: new Date().toISOString(),
        confidence,
        alternatives,
        estimatedImpact,
      },
    };
    
    // Store in history
    this.decisionHistory.push({
      timestamp: plan.metadata.generatedAt,
      plan,
      outcome: 'pending',
      confidence,
    });
    
    // Keep only last 50 decisions
    if (this.decisionHistory.length > 50) {
      this.decisionHistory = this.decisionHistory.slice(-50);
    }
    
    return plan;
  }

  /**
   * Calculate priorities for each gap
   */
  private calculatePriorities(analysis: GapAnalysis[], context: IAUserContext): Priority[] {
    const priorities: Priority[] = [];
    
    for (const gap of analysis) {
      let score = 0;
      let weight = 1;
      
      // Base score from gap percentage
      score += gap.gap * 0.4;
      
      // Priority level multiplier
      const priorityMultipliers = {
        critical: 3,
        high: 2,
        medium: 1.5,
        low: 1,
      };
      score *= priorityMultipliers[gap.priority];
      
      // User role multiplier (managers/admins see higher priorities)
      if (context.role === 'ADMIN') weight *= 1.2;
      if (context.role === 'GERENTE') weight *= 1.1;
      
      // Affected users multiplier
      if (gap.affectedUsers.length > 0) {
        score += Math.min(gap.affectedUsers.length * 2, 20);
      }
      
      // Trend multiplier (declining trends are more urgent)
      if (gap.trend === 'declining') score *= 1.5;
      if (gap.trend === 'improving') score *= 0.8;
      
      // Department relevance
      if (gap.affectedUsers.length > 0 && context.department) {
        weight *= 1.1;
      }
      
      priorities.push({
        level: gap.priority,
        score: Math.round(score * 100) / 100,
        reason: this.generatePriorityReason(gap),
        source: gap.kpiKey,
        weight,
      });
    }
    
    // Sort by score descending
    return priorities.sort((a, b) => b.score - a.score);
  }

  /**
   * Generate reason for priority
   */
  private generatePriorityReason(gap: GapAnalysis): string {
    const gapPercent = Math.round(gap.gap);
    const reasons = {
      critical: [
        `Crítico: ${gapPercent}% abaixo da meta de ${gap.targetValue}${gap.unit}`,
        `Atenção imediata necessária - ${gap.kpiLabel} está ${gapPercent}% abaixo do esperado`,
      ],
       high: [
         `Alta prioridade: ${gapPercent}% abaixo da meta`,
         `Importante: ${gap.kpiLabel} precisa de intervenção`,
       ],
      medium: [
        `Média prioridade: ${gapPercent}% abaixo da meta`,
        `Monitorar: ${gap.kpiLabel} pode melhorar`,
      ],
      low: [
        `Baixa prioridade: ${gapPercent}% abaixo da meta`,
        `Otimização possível para ${gap.kpiLabel}`,
      ],
    };
    
    const options = reasons[gap.priority];
    return options[Math.floor(Math.random() * options.length)];
  }

  /**
   * Create a plan step from a priority
   */
  private async createStep(priority: Priority, context: IAUserContext): Promise<PlanStep | null> {
    const action = await this.selectAction(priority, context);
    if (!action) return null;
    
    return {
      source: priority.source,
      action: action.type,
      parameters: action.parameters,
      justification: `Prioridade ${priority.level}: ${priority.reason}`,
      expectedOutcome: action.expectedOutcome,
      fallback: action.fallback,
      priority: priority.score,
    };
  }

  /**
   * Select best action for a priority
   */
  private async selectAction(priority: Priority, context: IAUserContext): Promise<Action | null> {
    const actions = this.getAvailableActions(priority, context);
    if (actions.length === 0) return null;
    
    // Score each action
    const scoredActions = actions.map(action => ({
      action,
      score: this.scoreAction(action, priority, context),
    }));
    
    // Select best action
    scoredActions.sort((a, b) => b.score - a.score);
    return scoredActions[0].action;
  }

  /**
   * Get available actions for a priority
   */
  private getAvailableActions(priority: Priority, context: IAUserContext): Action[] {
    const actions: Action[] = [];
    
    // Notification actions
    if (context.role !== 'USER' || priority.level === 'critical') {
      actions.push({
        type: 'send_notification',
        parameters: {
          channels: ['push', 'portal'],
          priority: priority.level,
        },
        expectedOutcome: 'Usuário notificado sobre o problema',
        fallback: 'Enviar email como alternativa',
        priority: 1,
      });
    }
    
    // Email actions for higher priorities
    if (priority.level === 'critical' || priority.level === 'high') {
      actions.push({
        type: 'send_email',
        parameters: {
          template: 'kpi_alert',
          includeDetails: true,
        },
        expectedOutcome: 'Email enviado com detalhes e recomendações',
        fallback: 'Notificação push',
        priority: 2,
      });
    }
    
    // KPI analysis actions
    if (priority.source.startsWith('evaluation') || priority.source.startsWith('kpi')) {
      actions.push({
        type: 'analyze_kpi',
        parameters: {
          kpiKey: priority.source,
          depth: 'detailed',
        },
        expectedOutcome: 'Análise detalhada do KPI com recomendações',
        fallback: 'Análise básica',
        priority: 3,
      });
    }
    
    // Task creation for critical issues
    if (priority.level === 'critical') {
      actions.push({
        type: 'create_task',
        parameters: {
          assignee: context.role === 'ADMIN' ? 'manager' : 'user',
          dueDate: '24h',
          priority: 'high',
        },
        expectedOutcome: 'Tarefa criada para resolver o problema',
        fallback: 'Notificação para ação manual',
        priority: 4,
      });
    }
    
    // Report generation
    if (priority.level === 'critical' || priority.level === 'high') {
      actions.push({
        type: 'generate_report',
        parameters: {
          format: 'pdf',
          includeTrends: true,
          includeRecommendations: true,
        },
        expectedOutcome: 'Relatório detalhado gerado',
        fallback: 'Relatório simples',
        priority: 2,
      });
    }
    
    // Dashboard update
    actions.push({
      type: 'update_dashboard',
      parameters: {
        highlightIssue: true,
        showTrends: true,
      },
      expectedOutcome: 'Dashboard atualizado com destaque para o problema',
      fallback: 'Dashboard padrão',
      priority: 1,
    });
    
    return actions;
  }

  /**
   * Score an action for a given priority
   */
  private scoreAction(action: Action, priority: Priority, context: IAUserContext): number {
    let score = action.priority * 10;
    
    // Adjust based on priority level
    const priorityMultipliers = {
      critical: 2,
      high: 1.5,
      medium: 1,
      low: 0.5,
    };
    score *= priorityMultipliers[priority.level];
    
    // Adjust based on user role
    if (action.type === 'create_task' && context.role === 'USER') {
      score *= 0.8; // Users less likely to create tasks
    }
    
    if (action.type === 'send_email' && context.role === 'ADMIN') {
      score *= 1.2; // Admins more likely to use email
    }
    
    // Adjust based on action complexity
    if (action.fallback) {
      score *= 1.1; // Actions with fallbacks are more robust
    }
    
    return Math.round(score * 100) / 100;
  }

  /**
   * Generate recovery/fallback steps
   */
  private generateRecoverySteps(steps: PlanStep[], context: IAUserContext): PlanStep[] {
    const recoverySteps: PlanStep[] = [];
    
    // Add monitoring step
    recoverySteps.push({
      source: 'system',
      action: 'monitor_outcome',
      parameters: {
        duration: '1h',
        metrics: ['kpi_change', 'user_response'],
      },
      justification: 'Monitorar resultados das ações executadas',
      expectedOutcome: 'Feedback sobre eficácia das ações',
      priority: 1,
    });
    
    // Add escalation step for critical priorities
    if (steps.some(s => s.priority > 80)) {
      recoverySteps.push({
        source: 'system',
        action: 'escalate_if_needed',
        parameters: {
          condition: 'no_improvement_after_2h',
          escalateTo: context.role === 'ADMIN' ? 'super_admin' : 'admin',
        },
        justification: 'Escalonar se não houver melhora',
        expectedOutcome: 'Problema escalado para nível superior',
        priority: 2,
      });
    }
    
    return recoverySteps;
  }

  /**
   * Generate justification for the plan
   */
  private generateJustification(steps: PlanStep[], analysis: GapAnalysis[], context: IAUserContext): string {
    const criticalCount = analysis.filter(a => a.priority === 'critical').length;
    const highCount = analysis.filter(a => a.priority === 'high').length;
    
    let justification = `Plano gerado para ${context.userName} (${context.role})`;
    
    if (criticalCount > 0) {
      justification += `. ${criticalCount} item(ns) crítico(s) identificado(s) - ação imediata recomendada`;
    }
    
    if (highCount > 0) {
      justification += `. ${highCount} item(ns) de alta prioridade`;
    }
    
    justification += `. ${steps.length} passo(s) definido(s) para abordar as questões identificadas.`;
    
    return justification;
  }

  /**
   * Calculate confidence in the plan
   */
  private calculateConfidence(steps: PlanStep[], context: IAUserContext): number {
    if (steps.length === 0) return 0;
    
    let confidence = 50; // Base confidence
    
    // Increase based on number of steps (more comprehensive)
    confidence += Math.min(steps.length * 5, 20);
    
    // Increase based on user role (more data for admins)
    if (context.role === 'ADMIN') confidence += 10;
    if (context.role === 'GERENTE') confidence += 5;
    
    // Increase if steps have fallbacks
    const stepsWithFallbacks = steps.filter(s => s.fallback).length;
    confidence += Math.min(stepsWithFallbacks * 2, 10);
    
    return Math.min(confidence, 95); // Cap at 95%
  }

  /**
   * Generate alternative approaches
   */
  private async generateAlternatives(steps: PlanStep[], context: IAUserContext): Promise<string[]> {
    const alternatives: string[] = [];
    
    // Alternative 1: Minimal approach
    if (steps.length > 3) {
      alternatives.push(
        `Abordagem minimalista: Focar apenas nos ${Math.ceil(steps.length / 2)} itens de maior prioridade`
      );
    }
    
    // Alternative 2: Delegation
    if (context.role === 'ADMIN' && steps.length > 2) {
      alternatives.push(
        'Delegação: Distribuir ações entre membros da equipe com maior expertise'
      );
    }
    
    // Alternative 3: Phased approach
    if (steps.length > 4) {
      alternatives.push(
        'Abordagem faseada: Executar em 2-3 fases para melhor gerenciamento de recursos'
      );
    }
    
    // Alternative 4: Automation focus
    const autoActions = steps.filter(s => 
      s.action.includes('notification') || s.action.includes('update')
    ).length;
    if (autoActions < steps.length) {
      alternatives.push(
        'Foco em automação: Substituir ações manuais por processos automatizados'
      );
    }
    
    return alternatives;
  }

  /**
   * Estimate impact of the plan
   */
  private estimateImpact(steps: PlanStep[], analysis: GapAnalysis[]): string {
    const totalGap = analysis.reduce((sum, a) => sum + a.gap, 0);
    const avgGap = totalGap / analysis.length;
    
    if (avgGap > 50) {
      return 'Impacto alto: Resolução deve melhorar KPIs em 30-50%';
    } else if (avgGap > 25) {
      return 'Impacto médio: Resolução deve melhorar KPIs em 15-30%';
    } else if (avgGap > 10) {
      return 'Impacto moderado: Resolução deve melhorar KPIs em 5-15%';
    }
    
    return 'Impacto baixo: Resolução deve melhorar KPIs em até 5%';
  }

  /**
   * Get decision history
   */
  getDecisionHistory(limit: number = 10) {
    return this.decisionHistory.slice(-limit);
  }

  /**
   * Update decision outcome
   */
  updateDecisionOutcome(decisionId: string, outcome: string, success: boolean) {
    const decision = this.decisionHistory.find(d => d.plan.metadata.generatedAt === decisionId);
    if (decision) {
      decision.outcome = outcome;
      // Adjust confidence based on success
      if (!success) {
        decision.confidence *= 0.8;
      }
    }
  }
}
