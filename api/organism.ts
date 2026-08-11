import type { VercelRequest, VercelResponse } from '@vercel/node'
import { hasDatabase, loadOrganism } from '../src/server/organismStore.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  if (!hasDatabase()) {
    return res.status(503).json({
      error: 'DATABASE_URL not configured',
      hint: 'Run: vercel integration add neon',
    })
  }

  try {
    const { state, version } = await loadOrganism()
    return res.status(200).json({ state, version })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load organism'
    return res.status(500).json({ error: message })
  }
}
