import type { IncomingMessage } from 'node:http'

type HeaderSource = {
  headers: IncomingMessage['headers'] | Record<string, string | string[] | undefined>
}

function header(req: HeaderSource, name: string): string {
  const raw = req.headers[name] ?? req.headers[name.toLowerCase()]
  if (Array.isArray(raw)) return String(raw[0] ?? '').trim()
  return String(raw ?? '').trim()
}

/** True when `x-experiment-dev-secret` matches server env. */
export function hasDevSecret(req: HeaderSource): boolean {
  const expected = (process.env.EXPERIMENT_DEV_SECRET || '').trim()
  if (!expected) return false
  return header(req, 'x-experiment-dev-secret') === expected
}

/**
 * Trusted server ingest (PumpPortal bridge / automation).
 * Accepts EXPERIMENT_INGEST_SECRET or the same value as EXPERIMENT_DEV_SECRET.
 */
export function hasIngestSecret(req: HeaderSource): boolean {
  const ingest = (process.env.EXPERIMENT_INGEST_SECRET || '').trim()
  const dev = (process.env.EXPERIMENT_DEV_SECRET || '').trim()
  const provided = header(req, 'x-experiment-ingest-secret')
  if (!provided) return false
  if (ingest && provided === ingest) return true
  if (dev && provided === dev) return true
  return false
}

export function isLocalhostRequest(req: HeaderSource): boolean {
  const host = header(req, 'host').toLowerCase()
  return (
    host.startsWith('localhost:') ||
    host.startsWith('127.0.0.1:') ||
    host.startsWith('[::1]:') ||
    host === 'localhost' ||
    host === '127.0.0.1'
  )
}

/** Dev/sim tools: secret required in prod; localhost may skip when unset. */
export function allowDevTools(req: HeaderSource): boolean {
  if (hasDevSecret(req)) return true
  if (isLocalhostRequest(req) && !(process.env.EXPERIMENT_DEV_SECRET || '').trim()) {
    return true
  }
  return false
}

export function allowForceThink(req: HeaderSource): boolean {
  if (process.env.ALLOW_FORCE_THINK !== '1') return false
  return hasDevSecret(req) || hasCronAuth(req)
}

/** Valid Bearer CRON_SECRET (when configured). */
export function hasCronAuth(req: HeaderSource): boolean {
  const cronSecret = (process.env.CRON_SECRET || '').trim()
  if (!cronSecret) return false
  const auth = header(req, 'authorization')
  return auth === `Bearer ${cronSecret}`
}

/**
 * When CRON_SECRET is set, cron invocations must present it.
 * Browser / anonymous traffic is still allowed for normal think (cooldown applies).
 * Returns an error message when the request should be rejected.
 */
export function cronAuthRejection(req: HeaderSource): string | null {
  const cronSecret = (process.env.CRON_SECRET || '').trim()
  if (!cronSecret) return null
  const isCron = Boolean(header(req, 'x-vercel-cron'))
  if (!isCron) return null
  if (hasCronAuth(req)) return null
  return 'Invalid cron authorization'
}
