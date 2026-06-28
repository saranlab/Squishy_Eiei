import type { VercelRequest, VercelResponse } from '@vercel/node'
import { cors, preflight } from '../../_lib/cors'
import { getStatsService } from '../../_lib/stats'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(req, res)
  if (req.method === 'OPTIONS') return preflight(res)
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { id } = req.query as { id: string }
  if (!id) return res.status(400).json({ error: 'id required' })

  await getStatsService().incrementShare(id)
  return res.status(200).json({ data: { ok: true } })
}
