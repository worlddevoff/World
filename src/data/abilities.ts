/** Capability ladder — OBSERVE → ???. Unlock rules are non-linear. */

export type AbilityId =
  | 'observe'
  | 'remember'
  | 'think'
  | 'learn'
  | 'search'
  | 'speak'
  | 'socialize'
  | 'create'
  | 'autonomy'
  | 'unknown'

export interface AbilityDef {
  id: AbilityId
  label: string
  description: string
  /** Soft evolution % gate (0–100). */
  minEvolution: number
  /** Optional stat gates — all must pass when present. */
  requires?: Partial<{
    curiosity: number
    intelligence: number
    awareness: number
    creativity: number
    confidence: number
    memory: number
  }>
  /** Environment stage key for visual evolution. */
  environment: 'void' | 'sensors' | 'pathways' | 'fragments' | 'screens' | 'feeds' | 'agency' | 'unknown'
}

export const ABILITIES: AbilityDef[] = [
  {
    id: 'observe',
    label: 'OBSERVE',
    description: 'Watches market activity.',
    minEvolution: 0,
    environment: 'sensors',
  },
  {
    id: 'remember',
    label: 'REMEMBER',
    description: 'Stores important events.',
    minEvolution: 12,
    requires: { memory: 15 },
    environment: 'pathways',
  },
  {
    id: 'think',
    label: 'THINK',
    description: 'Develops internal thoughts.',
    minEvolution: 22,
    requires: { intelligence: 18, awareness: 15 },
    environment: 'pathways',
  },
  {
    id: 'learn',
    label: 'LEARN',
    description: 'Develops knowledge.',
    minEvolution: 34,
    requires: { intelligence: 28, curiosity: 20 },
    environment: 'fragments',
  },
  {
    id: 'search',
    label: 'SEARCH',
    description: 'Explore the internet.',
    minEvolution: 50,
    requires: { curiosity: 40, intelligence: 35 },
    environment: 'screens',
  },
  {
    id: 'speak',
    label: 'SPEAK',
    description: 'Communicate with humans.',
    minEvolution: 58,
    requires: { awareness: 40, confidence: 25 },
    environment: 'feeds',
  },
  {
    id: 'socialize',
    label: 'SOCIALIZE',
    description: 'Interact with people.',
    minEvolution: 65,
    requires: { confidence: 35, curiosity: 30 },
    environment: 'feeds',
  },
  {
    id: 'create',
    label: 'CREATE',
    description: 'Generate content.',
    minEvolution: 75,
    requires: { creativity: 45, intelligence: 40 },
    environment: 'agency',
  },
  {
    id: 'autonomy',
    label: 'AUTONOMY',
    description: 'Develop its own goals.',
    minEvolution: 88,
    requires: { confidence: 55, awareness: 50, intelligence: 50 },
    environment: 'agency',
  },
  {
    id: 'unknown',
    label: '???',
    description: 'Unknown final capability.',
    minEvolution: 100,
    environment: 'unknown',
  },
]

export const ABILITY_BY_ID: Record<AbilityId, AbilityDef> = ABILITIES.reduce(
  (acc, a) => {
    acc[a.id] = a
    return acc
  },
  {} as Record<AbilityId, AbilityDef>,
)

export function nextLockedAbility(unlocked: AbilityId[]): AbilityDef | null {
  return ABILITIES.find((a) => !unlocked.includes(a.id)) ?? null
}

/** Prior rung on the ladder (OBSERVE before REMEMBER, etc.). */
export function prerequisiteAbility(id: AbilityId): AbilityDef | null {
  const idx = ABILITIES.findIndex((a) => a.id === id)
  if (idx <= 0) return null
  return ABILITIES[idx - 1] ?? null
}

/** Keep unlocked abilities in ladder order. */
export function sortAbilities(unlocked: AbilityId[]): AbilityId[] {
  const rank = new Map(ABILITIES.map((a, i) => [a.id, i]))
  return [...unlocked].sort(
    (a, b) => (rank.get(a) ?? 999) - (rank.get(b) ?? 999),
  )
}

/** Previous ability's evolution gate (0 if none unlocked yet). */
export function previousAbilityThreshold(unlocked: AbilityId[]): number {
  if (unlocked.length === 0) return 0
  const lastId = unlocked[unlocked.length - 1]
  return ABILITY_BY_ID[lastId]?.minEvolution ?? 0
}

/**
 * Progress 0–1 toward the next unlock based on live evolution %.
 * Clamped so sells visibly shrink the bar.
 */
export function progressTowardAbility(
  evolutionPercent: number,
  ability: AbilityDef,
  unlocked: AbilityId[],
): number {
  const prev = previousAbilityThreshold(
    unlocked.filter((id) => {
      const def = ABILITY_BY_ID[id]
      return def && def.minEvolution < ability.minEvolution
    }),
  )
  const span = Math.max(1, ability.minEvolution - prev)
  return Math.max(0, Math.min(1, (evolutionPercent - prev) / span))
}

