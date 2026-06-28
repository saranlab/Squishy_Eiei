import type { VercelRequest, VercelResponse } from '@vercel/node'

const ALLOWED = new Set([
  'https://squishy.app',
  'https://www.squishy.app',
  'http://localhost:5173',
  'http://localhost:4173',
])

export function cors(req: VercelRequest, res: VercelResponse) {
  const origin = req.headers.origin ?? ''
  res.setHeader('Access-Control-Allow-Origin',  ALLOWED.has(origin) ? origin : 'https://squishy.app')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Vary', 'Origin')
}

export function preflight(res: VercelResponse) {
  res.status(204).end()
}
