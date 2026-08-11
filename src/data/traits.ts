import { mulberry32, weightedPick } from '../utils/rng.js'

export type TraitCategory = 'physical' | 'behavioral' | 'cognitive' | 'structural'

export interface TraitDef {
  id: string
  category: TraitCategory
  label: string
  /** How many of this part can accumulate (physical only). */
  cap?: number
}

/* ------------------------------------------------------------------ */
/* Trait pools — the space of what the organism CAN become.           */
/* Which of these actually emerge is determined algorithmically.      */
/* ------------------------------------------------------------------ */

export const PHYSICAL_TRAITS: TraitDef[] = [
  { id: 'eye', category: 'physical', label: 'EYE', cap: 5 },
  { id: 'mouth', category: 'physical', label: 'MOUTH', cap: 2 },
  { id: 'arm', category: 'physical', label: 'ARM', cap: 4 },
  { id: 'leg', category: 'physical', label: 'LEG', cap: 4 },
  { id: 'wing', category: 'physical', label: 'WING', cap: 2 },
  { id: 'tentacle', category: 'physical', label: 'TENTACLE', cap: 6 },
  { id: 'horn', category: 'physical', label: 'HORN', cap: 4 },
  { id: 'armor', category: 'physical', label: 'ARMOR', cap: 1 },
  { id: 'spike', category: 'physical', label: 'SPIKES', cap: 8 },
  { id: 'tail', category: 'physical', label: 'TAIL', cap: 2 },
  { id: 'head', category: 'physical', label: 'EXTRA HEAD', cap: 2 },
  { id: 'organ', category: 'physical', label: 'GLOWING ORGAN', cap: 6 },
]

export const BEHAVIORAL_TRAITS: TraitDef[] = [
  { id: 'curious', category: 'behavioral', label: 'CURIOUS' },
  { id: 'aggressive', category: 'behavioral', label: 'AGGRESSIVE' },
  { id: 'scared', category: 'behavioral', label: 'SCARED' },
  { id: 'greedy', category: 'behavioral', label: 'GREEDY' },
  { id: 'playful', category: 'behavioral', label: 'PLAYFUL' },
  { id: 'paranoid', category: 'behavioral', label: 'PARANOID' },
  { id: 'obsessed', category: 'behavioral', label: 'OBSESSED' },
  { id: 'manipulative', category: 'behavioral', label: 'MANIPULATIVE' },
]

export const COGNITIVE_TRAITS: TraitDef[] = [
  { id: 'memory', category: 'cognitive', label: 'MEMORY' },
  { id: 'language', category: 'cognitive', label: 'LANGUAGE' },
  { id: 'pattern', category: 'cognitive', label: 'PATTERN RECOGNITION' },
  { id: 'imagination', category: 'cognitive', label: 'IMAGINATION' },
  { id: 'preferences', category: 'cognitive', label: 'PREFERENCES' },
  { id: 'goals', category: 'cognitive', label: 'GOALS' },
  { id: 'selfaware', category: 'cognitive', label: 'SELF-AWARENESS' },
]

export const TRAIT_BY_ID: Record<string, TraitDef> = [
  ...PHYSICAL_TRAITS,
  ...BEHAVIORAL_TRAITS,
  ...COGNITIVE_TRAITS,
].reduce((acc, t) => ({ ...acc, [t.id]: t }), {} as Record<string, TraitDef>)

/* ------------------------------------------------------------------ */
/* Emergence schedule + threshold ladder.                             */
/* Cumulative buy volume (USD) unlocks the NEXT emergence.            */
/* The first beats are guided; later ones are seeded-random so no     */
/* two experiments grow into the same creature.                       */
/* ------------------------------------------------------------------ */

type EmergenceStep =
  | { kind: 'structural'; sub: 'connection' | 'node' }
  | { kind: 'fixed'; traitId: string }
  | { kind: 'random'; category: TraitCategory }

/** Ordered emergence beats. Index i unlocks at THRESHOLDS[i]. */
export const EMERGENCE_SCHEDULE: EmergenceStep[] = [
  { kind: 'structural', sub: 'connection' }, // $25
  { kind: 'fixed', traitId: 'memory' }, // $100 (also a node)
  { kind: 'structural', sub: 'node' }, // $250
  { kind: 'fixed', traitId: 'organ' }, // $500 sensory organ
  { kind: 'fixed', traitId: 'eye' }, // $2,000 an eye
  { kind: 'fixed', traitId: 'pattern' }, // $5,000
  { kind: 'fixed', traitId: 'mouth' }, // $10,000 a mouth
  { kind: 'fixed', traitId: 'language' }, // $25,000 first word
  { kind: 'random', category: 'behavioral' },
  { kind: 'random', category: 'physical' },
  { kind: 'random', category: 'physical' },
  { kind: 'random', category: 'cognitive' },
  { kind: 'random', category: 'physical' },
  { kind: 'random', category: 'behavioral' },
  { kind: 'random', category: 'physical' },
  { kind: 'fixed', traitId: 'selfaware' },
  { kind: 'random', category: 'physical' },
  { kind: 'random', category: 'behavioral' },
  { kind: 'random', category: 'cognitive' },
  { kind: 'random', category: 'physical' },
  { kind: 'random', category: 'physical' },
  { kind: 'random', category: 'behavioral' },
  { kind: 'random', category: 'cognitive' },
  { kind: 'random', category: 'physical' },
]

/** Cumulative USD required to reach each emergence index. */
export const THRESHOLDS: number[] = [
  25, 100, 250, 500, 2000, 5000, 10000, 25000, 50000, 90000, 150000, 230000,
  340000, 490000, 700000, 1000000, 1400000, 1950000, 2700000, 3700000, 5000000,
  6800000, 9000000, 12000000,
]

export interface EmergedTrait {
  id: string
  traitId: string
  category: TraitCategory
  label: string
  index: number
}

interface HistoryBias {
  buyRatio: number // 0..1 share of buys vs sells
}

/**
 * Resolve which concrete trait emerges at a given schedule index.
 * `random` steps are seeded (seed + index) and weighted by history,
 * so the creature is deterministic per-experiment but diverges across
 * experiments. Returns null for structural steps (handled separately).
 */
export function resolveEmergence(
  index: number,
  seed: number,
  owned: Record<string, number>,
  bias: HistoryBias,
): EmergedTrait | null {
  const step = EMERGENCE_SCHEDULE[Math.min(index, EMERGENCE_SCHEDULE.length - 1)]
  if (step.kind === 'structural') return null

  const rng = mulberry32(seed + index * 7919)

  let traitId: string
  if (step.kind === 'fixed') {
    traitId = step.traitId
  } else {
    const pool =
      step.category === 'physical'
        ? PHYSICAL_TRAITS
        : step.category === 'behavioral'
          ? BEHAVIORAL_TRAITS
          : COGNITIVE_TRAITS

    const candidates = pool
      .filter((t) => {
        const count = owned[t.id] ?? 0
        return count < (t.cap ?? 1)
      })
      .map((t) => {
        let weight = 1
        // History shapes behavior: lots of buys -> bolder, sells -> fearful.
        if (t.category === 'behavioral') {
          if (['curious', 'greedy', 'playful', 'obsessed'].includes(t.id))
            weight *= 0.5 + bias.buyRatio * 1.5
          if (['scared', 'paranoid', 'aggressive'].includes(t.id))
            weight *= 0.5 + (1 - bias.buyRatio) * 1.5
        }
        return { value: t, weight }
      })

    if (candidates.length === 0) {
      // Everything in this category maxed — fall back to any physical slot.
      const fallback = PHYSICAL_TRAITS.find((t) => (owned[t.id] ?? 0) < (t.cap ?? 1))
      traitId = (fallback ?? PHYSICAL_TRAITS[0]).id
    } else {
      traitId = weightedPick(candidates, rng).id
    }
  }

  const def = TRAIT_BY_ID[traitId]
  return {
    id: `${traitId}-${index}-${(owned[traitId] ?? 0) + 1}`,
    traitId,
    category: def.category,
    label: def.label,
    index,
  }
}

/** A first "word" the organism speaks when LANGUAGE emerges (seeded). */
export function firstWord(seed: number): string {
  const words = ['MORE', 'WHY', 'HERE', 'MINE', 'ALIVE', 'HELLO', 'HUNGRY', 'WATCHING']
  return words[seed % words.length]
}
