import type { VercelRequest, VercelResponse } from '@vercel/node'
import { cors, preflight } from '../../_lib/cors'
import { getServiceClient } from '../../_lib/supabase'
import { getStatsService } from '../../_lib/stats'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(req, res)
  if (req.method === 'OPTIONS') return preflight(res)
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { id } = req.query as { id: string }
  if (!id) return res.status(400).json({ error: 'id required' })

  const [db, stats] = [getServiceClient(), getStatsService()]

  const { data: squishy, error } = await db
    .from('squishies')
    .select('id, name, config, created_at, creators(id, display_name)')
    .eq('id', id)
    .eq('is_published', true)
    .single()

  if (error || !squishy) return res.status(404).json({ error: 'Not found' })

  const squishyStats = await stats.getStats(id)

  res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=300')
  return res.status(200).json({ data: { ...squishy, stats: squishyStats } })
}
