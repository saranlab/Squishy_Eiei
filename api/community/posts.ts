import type { VercelRequest, VercelResponse } from '@vercel/node'
import { cors, preflight } from '../_lib/cors'
import { getServiceClient } from '../_lib/supabase'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(req, res)
  if (req.method === 'OPTIONS') return preflight(res)

  if (req.method === 'GET') {
    const db    = getServiceClient()
    const limit = Math.min(Number(req.query.limit ?? 100), 200)

    const { data, error } = await db
      .from('community_posts')
      .select('id, creator_name, toy_data, likes, plays, created_at')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) return res.status(500).json({ error: 'Failed to fetch posts' })

    res.setHeader('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=30')
    return res.status(200).json({ data: data ?? [] })
  }

  if (req.method === 'POST') {
    const { creatorName, toy } = req.body ?? {}
    if (!toy || !toy.name) return res.status(400).json({ error: 'toy.name is required' })

    const db = getServiceClient()

    const { data, error } = await db
      .from('community_posts')
      .insert({
        creator_name: (creatorName?.trim() || 'Anonymous').slice(0, 30),
        toy_data:     toy,
      })
      .select('id, creator_name, toy_data, likes, plays, created_at')
      .single()

    if (error || !data) return res.status(500).json({ error: 'Failed to create post' })

    return res.status(201).json({ data })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
