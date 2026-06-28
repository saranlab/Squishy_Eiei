import type { VercelRequest, VercelResponse } from '@vercel/node'
import { cors, preflight } from './_lib/cors'
import { getStatsService } from './_lib/stats'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(req, res)
  if (req.method === 'OPTIONS') return preflight(res)
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const limit = Math.min(Number(req.query.limit ?? 20), 50)
  const top = await getStatsService().getTopToday(limit)

  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
  return res.status(200).json({ data: top })
}
