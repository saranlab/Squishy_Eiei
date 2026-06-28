import type { VercelRequest, VercelResponse } from '@vercel/node'
import { cors, preflight } from '../_lib/cors'
import { getServiceClient } from '../_lib/supabase'
import type { CreateSquishyRequest } from '../../src/types'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(req, res)
  if (req.method === 'OPTIONS') return preflight(res)
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const body = req.body as CreateSquishyRequest
  if (!body?.title || !body?.creator_id || !body?.config_json) {
    return res.status(400).json({ error: 'title, creator_id, and config_json are required' })
  }

  const db = getServiceClient()

  const { data: squishy, error } = await db
    .from('squishies')
    .insert({
      creator_id:    body.creator_id,
      title:         body.title.slice(0, 80),
      config_json:   body.config_json,
      thumbnail_url: body.thumbnail_url ?? null,
      is_published:  false,
    })
    .select('id, title, created_at')
    .single()

  if (error || !squishy) {
    return res.status(500).json({ error: 'Failed to create squishy' })
  }

  return res.status(201).json({ data: squishy })
}
