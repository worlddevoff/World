/** Deterministic PRNG (mulberry32). Same seed -> same sequence. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Weighted pick from a list of { value, weight } using an rng in [0,1). */
export function weightedPick<T>(
  items: { value: T; weight: number }[],
  rng: () => number,
): T {
  const total = items.reduce((s, i) => s + i.weight, 0)
  let r = rng() * total
  for (const item of items) {
    r -= item.weight
    if (r <= 0) return item.value
  }
  return items[items.length - 1].value
}

const SEED_KEY = 'experiment_seed_v1'

/** A stable per-experiment seed. Persisted so a reload keeps the same creature. */
export function getExperimentSeed(): number {
  try {
    const stored = localStorage.getItem(SEED_KEY)
    if (stored) return parseInt(stored, 10)
    const seed = Math.floor(Math.random() * 2_000_000_000)
    localStorage.setItem(SEED_KEY, String(seed))
    return seed
  } catch {
    return Math.floor(Math.random() * 2_000_000_000)
  }
}

/** Reroll the experiment — a brand new creature will grow from scratch. */
export function rerollExperimentSeed(): number {
  const seed = Math.floor(Math.random() * 2_000_000_000)
  try {
    localStorage.setItem(SEED_KEY, String(seed))
  } catch {
    /* ignore */
  }
  return seed
}
