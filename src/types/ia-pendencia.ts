export interface Pendencia {
  id: string
  source: string // teams | emails | calendar | knowledge
  category: string
  type: string
  status: string
  dueDate?: string
  summary: string
  details?: any
  context?: any
  sourceMeta?: any
}
