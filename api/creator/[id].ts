import type { VercelRequest, VercelResponse } from '@vercel/node'
import { cors, preflight } from '../_lib/cors'
import { getServiceClient } from '../_lib/supabase'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(req, res)
  if (req.method === 'OPTIONS') return preflight(res)
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { id } = req.query as { id: string }
  if (!id) return res.status(400).json({ error: 'id required' })

  const db = getServiceClient()

  const { data: creator, error } = await db
    .from('creators')
    .select('id, display_name, avatar_url, total_squishies, total_likes, created_at')
    .eq('id', id)
    .single()

  if (error || !creator) return res.status(404).json({ error: 'Not found' })

  const { data: squishies } = await db
    .from('squishies')
    .select('id, name, created_at, squishy_stats(play_count, like_count)')
    .eq('creator_id', id)
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(20)

  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=600')
  return res.status(200).json({ data: { ...creator, squishies: squishies ?? [] } })
}
