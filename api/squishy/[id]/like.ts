import type { VercelRequest, VercelResponse } from '@vercel/node'
import { cors, preflight } from '../../_lib/cors'
import { getServiceClient } from '../../_lib/supabase'
import { getStatsService } from '../../_lib/stats'
import type { LikeRequest } from '../../../src/types'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(req, res)
  if (req.method === 'OPTIONS') return preflight(res)
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { id } = req.query as { id: string }
  const { anonymous_id } = req.body as LikeRequest

  if (!id || !anonymous_id) {
    return res.status(400).json({ error: 'id and anonymous_id required' })
  }

  const db  = getServiceClient()
  const svc = getStatsService()

  // Check for existing like
  const { data: existing } = await db
    .from('likes')
    .select('id')
    .eq('squishy_id', id)
    .eq('anonymous_id', anonymous_id)
    .maybeSingle()

  if (existing) {
    // Unlike
    await db.from('likes').delete().eq('id', existing.id)
    await svc.decrementLike(id)
    const s = await svc.getStats(id)
    return res.status(200).json({ data: { liked: false, like_count: s?.like_count ?? 0 } })
  } else {
    // Like
    const { error } = await db.from('likes').insert({ squishy_id: id, anonymous_id })
    if (error) return res.status(500).json({ error: 'Failed to like' })
    await svc.incrementLike(id)
    const s = await svc.getStats(id)
    return res.status(200).json({ data: { liked: true, like_count: s?.like_count ?? 0 } })
  }
}
