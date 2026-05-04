import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const auth = req.headers['authorization'];
  if (!auth) return res.status(401).json({ error: 'Token required' });
  res.status(200).json({ pendencias: [] });
}
