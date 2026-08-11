import type { VercelRequest, VercelResponse } from '@vercel/node'
import type { EventKind } from '../src/types/experiment.js'
import {
  applyEngineAction,
  applyMarketEvent,
  hasDatabase,
  loadOrganism,
} from '../src/server/organismStore.js'
import { buildMarketEvent } from '../src/engine/evolutionEngine.js'
import { shortWallet } from '../src/utils/format.js'
import {
  canThink,
  generateAiThought,
  thoughtCooldownRemaining,
} from '../src/server/thoughtAi.js'
import {
  allowDevTools,
  hasIngestSecret,
} from '../src/server/requestAuth.js'

type Body =
  | {
      action: 'market'
      kind: EventKind
      amount: number
      wallet?: string
      signature?: string
    }
  | {
      action: 'force_mutation' | 'force_evolution' | 'force_memory_loss' | 'reset'
      seed?: number
    }

async function maybeThinkAfterEvent(
  kind: EventKind,
  tier: string,
): Promise<void> {
  try {
    const { state } = await loadOrganism()
    if (!canThink(state)) return
    const cooldown = thoughtCooldownRemaining(state)
    const urgent = tier === 'mega' || tier === 'large'
    if (cooldown > 0 && !urgent) return
    if (cooldown > 25_000 && urgent) return
    const chance =
      tier === 'mega'
        ? 1
        : tier === 'large'
          ? 0.85
          : tier === 'medium'
            ? 0.55
            : kind === 'sell'
              ? 0.4
              : 0.35
    if (Math.random() > chance) return
    const text = await generateAiThought(state)
    await applyEngineAction({ type: 'THINK', text })
  } catch {
    /* non-fatal */
  }
}

function isDevWallet(wallet?: string): boolean {
  if (!wallet) return false
  const w = wallet.toUpperCase()
  return w.includes('DEV') || w.startsWith('DEV_')
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, x-experiment-dev-secret, x-experiment-ingest-secret',
  )
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  if (!hasDatabase()) {
    return res.status(503).json({
      error: 'DATABASE_URL not configured',
      hint: 'Run: vercel integration add neon',
    })
  }

  try {
    const body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) as Body

    if (!body || !body.action) {
      return res.status(400).json({ error: 'Missing action' })
    }

    if (body.action === 'market') {
      const amount = Math.max(1, Math.round(Number(body.amount) || 0))
      if (!amount || (body.kind !== 'buy' && body.kind !== 'sell')) {
        return res.status(400).json({ error: 'Invalid kind/amount' })
      }

      const signature =
        typeof body.signature === 'string' ? body.signature.trim() : ''
      const wallet = body.wallet
      const isSim = !signature || isDevWallet(wallet)

      // Public internet cannot mutate the shared organism.
      // Live fills come from the server PumpPortal bridge (direct store write).
      // Manual / automation posts need ingest or dev secret.
      if (isSim) {
        if (!allowDevTools(req)) {
          return res.status(403).json({
            error: 'Simulated trades are disabled on the shared organism',
          })
        }
      } else if (!hasIngestSecret(req) && !allowDevTools(req)) {
        return res.status(403).json({
          error:
            'Client market posts are disabled — trades are ingested server-side',
        })
      }

      // Never trust a client-supplied MarketEvent payload (amount/tier forgery).
      const event = buildMarketEvent(
        body.kind,
        amount,
        wallet ? shortWallet(wallet) : undefined,
        wallet,
      )
      const result = await applyMarketEvent(event, signature || undefined)
      void maybeThinkAfterEvent(event.kind, event.tier)
      return res.status(200).json(result)
    }

    if (
      body.action === 'force_mutation' ||
      body.action === 'force_evolution' ||
      body.action === 'force_memory_loss' ||
      body.action === 'reset'
    ) {
      if (!allowDevTools(req)) {
        return res.status(403).json({ error: 'Dev actions require EXPERIMENT_DEV_SECRET' })
      }
    }

    if (body.action === 'force_mutation') {
      const result = await applyEngineAction({ type: 'FORCE_MUTATION' })
      return res.status(200).json({ ...result, applied: true })
    }
    if (body.action === 'force_evolution') {
      const result = await applyEngineAction({ type: 'FORCE_EVOLUTION' })
      return res.status(200).json({ ...result, applied: true })
    }
    if (body.action === 'force_memory_loss') {
      const result = await applyEngineAction({ type: 'FORCE_MEMORY_LOSS' })
      return res.status(200).json({ ...result, applied: true })
    }
    if (body.action === 'reset') {
      const seed = body.seed ?? Math.floor(Math.random() * 2_000_000_000)
      const result = await applyEngineAction({ type: 'RESET', seed })
      return res.status(200).json({ ...result, applied: true })
    }

    return res.status(400).json({ error: 'Unknown action' })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to apply event'
    return res.status(500).json({ error: message })
  }
}
