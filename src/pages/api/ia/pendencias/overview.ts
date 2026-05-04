import { NextApiRequest, NextApiResponse } from 'next'
import { verifyTokenFromRequest } from '@/lib/auth'
import { Pendencia } from '@/types/ia-pendencia'
import { decidePlan } from '@/lib/ia/orchestrator'

type SourceOverview = {
  source: string
  total: number
  pendentes: number
  details: Pendencia[]
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const authHeader = req.headers.authorization
  if (!authHeader) return res.status(401).json({ error: 'Token required' })

  // Placeholder: no real data yet, return empty pendencias per source
  const overview: SourceOverview[] = [
    { source: 'teams', total: 0, pendentes: 0, details: [] },
    { source: 'emails', total: 0, pendentes: 0, details: [] },
    { source: 'calendar', total: 0, pendentes: 0, details: [] },
    { source: 'knowledge', total: 0, pendentes: 0, details: [] },
  ]

  // Em uma implementação real, consolidar pendencias dos adapters e usar o orchestrator
  const plan = decidePlan({ overview }, {})

  res.status(200).json({ overview, plan })
}
