import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  ensurePumpBridge,
  getPumpBridgeStatus,
} from '../src/server/pumpBridge.js'

export const maxDuration = 60

/**
 * Keep the server-side PumpPortal ingest warm.
 * Safe for clients — status never includes secrets.
 * Open tabs / cron should ping this so fills keep landing in Neon.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const statusOnly =
    req.query.status === '1' ||
    (typeof req.body === 'object' &&
      req.body &&
      (req.body as { status?: boolean }).status === true)

  if (statusOnly) {
    return res.status(200).json(getPumpBridgeStatus())
  }

  const status = ensurePumpBridge()

  // Hold the serverless invocation open so the in-process WS can receive fills.
  const holdMs = Math.min(
    55_000,
    Math.max(5_000, Number(req.query.holdMs) || 45_000),
  )
  await new Promise((resolve) => setTimeout(resolve, holdMs))

  return res.status(200).json(getPumpBridgeStatus() ?? status)
}
