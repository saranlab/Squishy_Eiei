import type { VercelRequest, VercelResponse } from '@vercel/node'
import { cors, preflight } from '../../../_lib/cors'
import { getServiceClient } from '../../../_lib/supabase'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(req, res)
  if (req.method === 'OPTIONS') return preflight(res)
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { id } = req.query as { id: string }

  const db = getServiceClient()

  const { data: post, error: fetchErr } = await db
    .from('community_posts')
    .select('plays')
    .eq('id', id)
    .single()

  if (fetchErr || !post) return res.status(404).json({ error: 'Not found' })

  const { error } = await db
    .from('community_posts')
    .update({ plays: post.plays + 1 })
    .eq('id', id)

  if (error) return res.status(500).json({ error: 'Failed to update plays' })

  return res.status(200).json({ data: { plays: post.plays + 1 } })
}
