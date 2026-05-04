import { NextApiRequest, NextApiResponse } from 'next'

// MVP: in-memory store for feature toggles. Persist across requests only for the runtime.
let togglesStore: Record<string, boolean> = {
  kpi_analysis: true,
  proactive_notifications: true,
  auto_kpi_targets: false,
  scheduled_tasks: true,
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const method = req.method
  // Simple authorization check via Bearer token (replace with real RBAC check if needed)
  const authHeader = req.headers.authorization
  if (!authHeader) {
    return res.status(401).json({ error: 'Token required' })
  }

  if (method === 'GET') {
    // Return array of toggles in a stable shape
    const list = Object.entries(togglesStore).map(([key, enabled]) => ({
      feature_key: key,
      is_enabled: enabled,
      description: key,
      category: 'default',
      min_role: 'ADMIN'
    }))
    return res.status(200).json(list)
  }

  if (method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
      const key = body?.key || body?.feature_key
      const enabled = typeof body?.enabled === 'boolean' ? body.enabled : undefined
      if (!key || typeof enabled !== 'boolean') {
        return res.status(400).json({ error: 'payload inválido' })
      }
      // Atualiza o toggle no store em memória
      togglesStore[key] = enabled
      const list = Object.entries(togglesStore).map(([k, en]) => ({
        feature_key: k,
        is_enabled: en,
        description: k,
        category: 'default',
        min_role: 'ADMIN'
      }))
      return res.status(200).json({ ok: true, list })
    } catch {
      return res.status(500).json({ error: 'erro internal' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
