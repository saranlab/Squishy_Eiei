import type { VercelRequest, VercelResponse } from '@vercel/node'
import { cors, preflight } from '../_lib/cors'
import { getServiceClient } from '../_lib/supabase'
import type { PublishSquishyRequest } from '../../src/types'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(req, res)
  if (req.method === 'OPTIONS') return preflight(res)
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { squishy_id, creator_id } = req.body as PublishSquishyRequest
  if (!squishy_id || !creator_id) {
    return res.status(400).json({ error: 'squishy_id and creator_id required' })
  }

  const db = getServiceClient()

  // Verify ownership
  const { data: squishy, error: fetchErr } = await db
    .from('squishies')
    .select('id, creator_id')
    .eq('id', squishy_id)
    .single()

  if (fetchErr || !squishy) return res.status(404).json({ error: 'Not found' })
  if (squishy.creator_id !== creator_id) return res.status(403).json({ error: 'Forbidden' })

  const { error } = await db
    .from('squishies')
    .update({ is_published: true, published_at: new Date().toISOString() })
    .eq('id', squishy_id)

  if (error) return res.status(500).json({ error: 'Failed to publish' })

  return res.status(200).json({ data: { published: true } })
}
