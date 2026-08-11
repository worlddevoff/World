import type { MarketEvent, OrganismMemory, OrganismStats } from '../types/experiment.js'
import { randomId } from '../utils/experimentFormat.js'
import { shortWallet } from '../utils/format.js'

const MAX_MEMORIES = 24

export function clampStat(n: number): number {
  return Math.max(0, Math.min(100, n))
}

export function scoreMarketImportance(event: MarketEvent, buyCountForWallet: number): number {
  let score = 0
  score += Math.min(40, Math.log10(Math.max(1, event.amount)) * 12)
  if (event.tier === 'mega') score += 35
  else if (event.tier === 'large') score += 22
  else if (event.tier === 'medium') score += 10
  if (buyCountForWallet >= 3) score += 18
  else if (buyCountForWallet === 2) score += 10
  if (event.kind === 'sell' && event.amount >= 5000) score += 15
  return score
}

export function maybeCreateMemory(
  event: MarketEvent,
  buyCountForWallet: number,
): OrganismMemory | null {
  const importance = scoreMarketImportance(event, buyCountForWallet)
  if (importance < 22) return null

  const wallet = shortWallet(event.walletFull ?? event.wallet)
  let text: string
  if (event.kind === 'buy' && buyCountForWallet >= 3) {
    text = `${wallet} keeps coming back.`
  } else if (event.kind === 'buy' && event.amount >= 10000) {
    text = `A major teaching: ${wallet} brought $${event.amount.toLocaleString()}.`
  } else if (event.kind === 'sell' && event.amount >= 10000) {
    text = `I remember when everyone was here. Then ${wallet} left.`
  } else if (event.kind === 'sell') {
    text = `Something was taken. ${wallet} made me forget.`
  } else {
    text = `The community taught me. ${wallet} — $${event.amount.toLocaleString()}.`
  }

  return {
    id: randomId(),
    text,
    importance,
    kind: event.kind,
    wallet,
    amount: event.amount,
    timestamp: event.timestamp,
  }
}

export function insertMemory(
  memories: OrganismMemory[],
  next: OrganismMemory,
): OrganismMemory[] {
  return [...memories, next]
    .sort((a, b) => b.importance - a.importance || b.timestamp - a.timestamp)
    .slice(0, MAX_MEMORIES)
}

export function forgetMemories(
  memories: OrganismMemory[],
  count: number,
): { memories: OrganismMemory[]; forgotten: OrganismMemory[] } {
  if (count <= 0 || memories.length === 0) {
    return { memories, forgotten: [] }
  }
  // Forget least important first
  const sorted = [...memories].sort(
    (a, b) => a.importance - b.importance || a.timestamp - b.timestamp,
  )
  const forgotten = sorted.slice(0, Math.min(count, sorted.length))
  const ids = new Set(forgotten.map((m) => m.id))
  return {
    memories: memories.filter((m) => !ids.has(m.id)),
    forgotten,
  }
}

export function memoryStatFromPool(memories: OrganismMemory[], pool: number): number {
  const fromEpisodes = Math.min(40, memories.length * 3 + memories.reduce((s, m) => s + m.importance, 0) / 40)
  return clampStat(pool * 0.55 + fromEpisodes)
}

export function blendStatsToward(
  stats: OrganismStats,
  patch: Partial<OrganismStats>,
): OrganismStats {
  const next = { ...stats }
  for (const key of Object.keys(patch) as (keyof OrganismStats)[]) {
    const v = patch[key]
    if (v != null) next[key] = clampStat(v)
  }
  return next
}
