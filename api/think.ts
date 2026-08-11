import type { VercelRequest, VercelResponse } from '@vercel/node'
import { applyEngineAction, hasDatabase, loadOrganism } from '../src/server/organismStore.js'
import {
  canThink,
  generateAiThought,
  thoughtCooldownRemaining,
} from '../src/server/thoughtAi.js'
import {
  allowForceThink,
  cronAuthRejection,
} from '../src/server/requestAuth.js'

/**
 * Generate + persist one organism thought (AI Gateway).
 * Used by cron, client heartbeat, and Dev panel.
 * Query: ?force=1 skips cooldown only when ALLOW_FORCE_THINK=1 and authorized.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, x-experiment-dev-secret',
  )
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const cronReject = cronAuthRejection(req)
  if (cronReject) {
    return res.status(401).json({ error: cronReject })
  }

  const body =
    typeof req.body === 'string'
      ? (JSON.parse(req.body || '{}') as { force?: boolean })
      : ((req.body as { force?: boolean }) ?? {})
  const wantsForce = req.query.force === '1' || body.force === true
  const force = wantsForce && allowForceThink(req)

  if (wantsForce && !force) {
    return res.status(403).json({
      error: 'force think requires ALLOW_FORCE_THINK=1 and authorization',
    })
  }

  if (!hasDatabase()) {
    return res.status(503).json({ error: 'DATABASE_URL not configured' })
  }

  try {
    const { state, version } = await loadOrganism()
    if (!canThink(state)) {
      return res.status(200).json({
        skipped: true,
        reason: 'think_locked',
        state,
        version,
      })
    }

    const cooldown = thoughtCooldownRemaining(state)
    if (cooldown > 0 && !force) {
      return res.status(200).json({
        skipped: true,
        reason: 'cooldown',
        retryInMs: cooldown,
        state,
        version,
      })
    }

    const text = await generateAiThought(state)
    const saved = await applyEngineAction({ type: 'THINK', text })
    return res.status(200).json({
      skipped: false,
      thought: text,
      applied: true,
      ...saved,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Thought failed'
    return res.status(500).json({ error: message })
  }
}
