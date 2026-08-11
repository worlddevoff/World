import type { ExperimentState, EventKind, EngineAction } from '../types/experiment'

export interface OrganismSnapshot {
  state: ExperimentState
  version: number
  applied?: boolean
  duplicate?: boolean
  error?: string
}

async function parseJson(res: Response): Promise<OrganismSnapshot & { error?: string }> {
  const data = (await res.json()) as OrganismSnapshot & { error?: string }
  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}`)
  }
  return data
}

/** Fetch shared organism from the server. Returns null if API unavailable. */
export async function fetchOrganism(): Promise<OrganismSnapshot | null> {
  try {
    const res = await fetch('/api/organism')
    if (res.status === 503) return null
    const ctype = res.headers.get('content-type') || ''
    // Plain Vite without the API plugin serves the .ts source as text/javascript.
    if (!ctype.includes('application/json')) return null
    return await parseJson(res)
  } catch {
    return null
  }
}

export async function postMarketEvent(input: {
  kind: EventKind
  amount: number
  wallet?: string
  signature?: string
}): Promise<OrganismSnapshot> {
  const res = await fetch('/api/market-event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'market', ...input }),
  })
  return parseJson(res)
}

export async function postEngineAction(
  action: 'force_mutation' | 'force_evolution' | 'force_memory_loss' | 'reset',
  seed?: number,
): Promise<OrganismSnapshot> {
  const res = await fetch('/api/market-event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, seed }),
  })
  return parseJson(res)
}

/** Ask the shared organism to think (AI Gateway on server). */
export async function postThink(force = false): Promise<
  OrganismSnapshot & { skipped?: boolean; reason?: string; thought?: string }
> {
  const res = await fetch(`/api/think${force ? '?force=1' : ''}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ force }),
  })
  return parseJson(res)
}

export type { EngineAction }
