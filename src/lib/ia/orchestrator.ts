import type { Pendencia } from '@/types/ia-pendencia'

// Simple agentic orchestrator skeleton
export type PlanStep = {
  source: string
  action: string
  pendencia?: Pendencia
  justification?: string
}

export type Plan = {
  steps: PlanStep[]
  justification: string
}

// Very naive decision: choose the source with most pendencias available, else knowledge as fallback
export function decidePlan(overview: any, context: any): Plan {
  const sources = ['teams','emails','calendar','knowledge'] as const
  let bestSource: string | null = null
  let bestCount = -1
  for (const s of sources) {
    const item = overview?.[s]
    const pend = Array.isArray(item?.pendentes) ? item.pendentes.length : typeof item?.pendentes === 'number' ? item.pendentes : 0
    if (pend > bestCount) {
      bestCount = pend
      bestSource = s
    }
  }

  const steps: PlanStep[] = []
  if (bestSource) {
    steps.push({ source: bestSource, action: 'consult', justification: `Escolhido pela maior contagem de pendências (${bestCount})` })
  } else {
    steps.push({ source: 'knowledge', action: 'consult', justification: 'Fallback para Knowledge' })
  }

  return {
    steps,
    justification: 'Decisão baseada na contagem de pendências por fonte (mvp simple).'
  }
}
