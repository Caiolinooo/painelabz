import { NextApiRequest, NextApiResponse } from 'next';
// Placeholder adapter for Teams pendencias. In a real integration, this would call Microsoft Graph API.

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only GET for MVP
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  // Basic token check (placeholder). In production, use verifyTokenFromRequest like other endpoints.
  const auth = req.headers['authorization'];
  if (!auth) return res.status(401).json({ error: 'Token required' });

  // For MVP, return an empty list (no pendencias) to allow end-to-end tests to run.
  return res.status(200).json({ pendencias: [] });
}
