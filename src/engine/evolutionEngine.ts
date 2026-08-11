import type {
  EngineAction,
  EventKind,
  EventTier,
  ExperimentLogEvent,
  ExperimentState,
  MarketEvent,
  MutationRecord,
  OrganismStats,
} from '../types/experiment.js'
import {
  ABILITIES,
  prerequisiteAbility,
  sortAbilities,
  type AbilityId,
} from '../data/abilities.js'
import {
  EMERGENCE_SCHEDULE,
  THRESHOLDS,
  firstWord,
  resolveEmergence,
  type EmergedTrait,
} from '../data/traits.js'
import { randomId, pick } from '../utils/experimentFormat.js'
import {
  clampStat,
  forgetMemories,
  insertMemory,
  maybeCreateMemory,
} from './memoryEngine.js'
import { derivePersonality, generateThought } from './personalityEngine.js'

/* ------------------------------------------------------------------ */
/* Tier config (shared with UI / market provider)                     */
/* ------------------------------------------------------------------ */

interface TierConfig {
  amount: [number, number]
  delta: [number, number]
  buyLabels: string[]
  sellLabels: string[]
}

export const TIERS: Record<EventTier, TierConfig> = {
  micro: {
    amount: [5, 50],
    delta: [40, 120],
    buyLabels: ['SIGNAL ABSORBED', 'SMALL PULSE'],
    sellLabels: ['MEMORY DELETED', 'MINOR DATA LOSS'],
  },
  small: {
    amount: [50, 500],
    delta: [150, 400],
    buyLabels: ['NEW KNOWLEDGE ACQUIRED', 'PATHWAY STRENGTHENED'],
    sellLabels: ['KNOWLEDGE LOST', 'CONNECTION SEVERED'],
  },
  medium: {
    amount: [500, 5000],
    delta: [500, 1200],
    buyLabels: ['GROWTH PRESSURE RISING', 'STRUCTURE FORMING'],
    sellLabels: ['STRUCTURE COLLAPSED', 'TRAIT AT RISK'],
  },
  large: {
    amount: [5000, 25000],
    delta: [1500, 4000],
    buyLabels: ['MAJOR LEARNING EVENT', 'MUTATION IMMINENT'],
    sellLabels: ['CRITICAL MEMORY LOSS', 'TRAIT FORGOTTEN'],
  },
  mega: {
    amount: [25000, 120000],
    delta: [5000, 14000],
    buyLabels: ['MAJOR EVOLUTION EVENT', 'CONSCIOUSNESS SURGE'],
    sellLabels: ['CATASTROPHIC MEMORY WIPE', 'IDENTITY DESTABILIZED'],
  },
}

export function tierForAmount(amount: number): EventTier {
  if (amount >= 25000) return 'mega'
  if (amount >= 5000) return 'large'
  if (amount >= 500) return 'medium'
  if (amount >= 50) return 'small'
  return 'micro'
}

function rand([min, max]: [number, number]): number {
  return Math.round(min + Math.random() * (max - min))
}

function logEvent(
  kind: ExperimentLogEvent['kind'],
  title: string,
  body: string,
): ExperimentLogEvent {
  return { id: randomId(), kind, title, body, timestamp: Date.now() }
}

function ownedCounts(traits: EmergedTrait[]): Record<string, number> {
  const o: Record<string, number> = {}
  for (const t of traits) o[t.traitId] = (o[t.traitId] ?? 0) + 1
  return o
}

/** Cumulative USD growth → evolution %. Tuned so buys/sells visibly move the needle. */
const GROWTH_ANCHORS: [number, number][] = [
  [0, 0],
  [25, 5],
  [100, 12],
  [500, 22],
  [2_000, 34],
  [10_000, 50],
  [25_000, 58],
  [60_000, 65],
  [150_000, 75],
  [400_000, 88],
  [1_500_000, 96],
  [8_000_000, 99],
]

function growthToPercent(growth: number): number {
  const g = Math.max(0, growth)
  for (let i = 0; i < GROWTH_ANCHORS.length - 1; i++) {
    const [g0, p0] = GROWTH_ANCHORS[i]
    const [g1, p1] = GROWTH_ANCHORS[i + 1]
    if (g <= g1) {
      const t = g1 === g0 ? 0 : (g - g0) / (g1 - g0)
      return p0 + (p1 - p0) * t
    }
  }
  return 99
}

/**
 * Evolution % is driven by net market pressure (growth USD).
 * Buys raise growth → % up. Sells cut growth → % down.
 * Stats add a small secondary signal so personality history matters.
 */
export function computeEvolutionPercent(state: {
  growth: number
  experience: number
  stats: OrganismStats
  traits: EmergedTrait[]
  abilities: AbilityId[]
}): number {
  const fromMarket = growthToPercent(state.growth)
  // No market pressure yet → stay at 0% (fresh experiment).
  if (state.growth <= 0) return 0

  // Stats contribute up to ±4 points once teaching has started.
  const statAvg =
    (state.stats.intelligence +
      state.stats.awareness +
      state.stats.curiosity +
      state.stats.memory) /
    4
  const statBoost = (statAvg / 100) * 4

  return Math.max(0, Math.min(99, fromMarket + statBoost))
}

/** Approximate USD growth needed to reach a target evolution %. */
export function growthForPercent(targetPercent: number): number {
  const p = Math.max(0, Math.min(99, targetPercent))
  for (let i = 0; i < GROWTH_ANCHORS.length - 1; i++) {
    const [g0, p0] = GROWTH_ANCHORS[i]
    const [g1, p1] = GROWTH_ANCHORS[i + 1]
    if (p <= p1) {
      const t = p1 === p0 ? 0 : (p - p0) / (p1 - p0)
      return g0 + (g1 - g0) * t
    }
  }
  return GROWTH_ANCHORS[GROWTH_ANCHORS.length - 1][0]
}

function abilityUnlocked(
  abilityId: AbilityId,
  evolutionPercent: number,
  stats: OrganismStats,
  alreadyUnlocked: AbilityId[],
): boolean {
  const def = ABILITIES.find((a) => a.id === abilityId)
  if (!def) return false
  // Ladder is strict: OBSERVE → REMEMBER → THINK → …
  const prev = prerequisiteAbility(abilityId)
  if (prev && !alreadyUnlocked.includes(prev.id)) return false
  if (evolutionPercent < def.minEvolution) return false
  if (def.requires) {
    for (const [k, min] of Object.entries(def.requires)) {
      if ((stats[k as keyof OrganismStats] ?? 0) < (min ?? 0)) return false
    }
  }
  // Final mystery never auto-unlocks in phase 1
  if (abilityId === 'unknown') return false
  return true
}

function syncAbilities(
  state: ExperimentState,
  logs: ExperimentLogEvent[],
): ExperimentState {
  const next = sortAbilities(state.abilities)
  for (const def of ABILITIES) {
    if (next.includes(def.id)) continue
    if (abilityUnlocked(def.id, state.evolutionPercent, state.stats, next)) {
      next.push(def.id)
      logs.push(
        logEvent(
          'ability',
          'ABILITY UNLOCKED',
          `${def.label} is now available. ${def.description}`,
        ),
      )
    }
  }
  // Early cognition sticks — don't flap LEARN/THINK on every sell.
  // Only high-tier outbound abilities can devolve on catastrophic loss.
  const kept = sortAbilities(
    next.filter((id) => {
      if (
        id === 'observe' ||
        id === 'remember' ||
        id === 'think' ||
        id === 'learn'
      ) {
        return true
      }
      return abilityUnlocked(id, state.evolutionPercent, state.stats, next)
    }),
  )
  for (const lost of next) {
    if (!kept.includes(lost)) {
      const def = ABILITIES.find((a) => a.id === lost)
      logs.push(
        logEvent(
          'devolution',
          'ABILITY LOST',
          def ? `${def.label} collapsed under memory loss.` : 'An ability dissolved.',
        ),
      )
    }
  }
  return { ...state, abilities: kept }
}

export function createInitialState(seed: number): ExperimentState {
  return {
    consciousness: 0,
    memory: 0,
    knowledge: 0,
    evolutionLevel: 1,
    evolutionPercent: 0,
    experience: 0,
    personality: 'UNKNOWN',
    mood: 0,
    status: 'ACTIVE',
    events: [],
    thoughts: [],
    log: [
      logEvent(
        'evolution',
        'EXPERIMENT ACTIVATED',
        'Market sensors online. Watching every fill from the first tick.',
      ),
      logEvent(
        'ability',
        'ABILITY UNLOCKED',
        'OBSERVE is now available. Watches market activity.',
      ),
    ],
    flash: null,
    hoursAlive: 0,
    contributors: 1,
    seed,
    growth: 0,
    buyCount: 0,
    sellCount: 0,
    emergenceIndex: 0,
    traits: [],
    nodeCount: 2,
    connectionCount: 1,
    wordsSpoken: [],
    stats: {
      memory: 0,
      intelligence: 2,
      curiosity: 5,
      awareness: 3,
      creativity: 1,
      fear: 8,
      confidence: 2,
      aggression: 1,
    },
    abilities: ['observe'],
    memories: [],
    mutations: [],
    discoveries: [],
    walletBuyCounts: {},
  }
}

function applyBuyStats(stats: OrganismStats, amount: number, tier: EventTier): OrganismStats {
  const scale =
    tier === 'mega' ? 4.2 : tier === 'large' ? 2.8 : tier === 'medium' ? 1.6 : tier === 'small' ? 1 : 0.45
  const teach = Math.log10(Math.max(10, amount)) * scale
  return {
    memory: clampStat(stats.memory + teach * 1.2),
    intelligence: clampStat(stats.intelligence + teach * 0.9),
    curiosity: clampStat(stats.curiosity + teach * 0.7),
    awareness: clampStat(stats.awareness + teach * 0.6),
    creativity: clampStat(stats.creativity + teach * 0.35),
    fear: clampStat(stats.fear - teach * 0.25),
    confidence: clampStat(stats.confidence + teach * 0.4),
    aggression: clampStat(stats.aggression * 0.98),
  }
}

function applySellStats(stats: OrganismStats, amount: number, tier: EventTier): OrganismStats {
  const scale =
    tier === 'mega' ? 4.5 : tier === 'large' ? 3 : tier === 'medium' ? 1.8 : tier === 'small' ? 1 : 0.5
  const hurt = Math.log10(Math.max(10, amount)) * scale
  return {
    memory: clampStat(stats.memory - hurt * 1.4),
    intelligence: clampStat(stats.intelligence - hurt * 0.5),
    curiosity: clampStat(stats.curiosity - hurt * 0.2),
    awareness: clampStat(stats.awareness - hurt * 0.3),
    creativity: clampStat(stats.creativity - hurt * 0.15),
    fear: clampStat(stats.fear + hurt * 1.1),
    confidence: clampStat(stats.confidence - hurt * 0.7),
    aggression: clampStat(stats.aggression + hurt * 0.45),
  }
}

function maybeMutation(
  state: ExperimentState,
  event: MarketEvent,
  logs: ExperimentLogEvent[],
): { state: ExperimentState; mutation?: MutationRecord } {
  const chance =
    event.tier === 'mega' ? 0.85 : event.tier === 'large' ? 0.45 : event.tier === 'medium' ? 0.08 : 0
  if (event.kind !== 'buy' || Math.random() > chance) return { state }

  const labels = [
    'CURIOSITY SPIKE',
    'PATTERN FRACTURE',
    'NEURAL BLOOM',
    'IDENTITY DRIFT',
    'SENSORY OVERGROWTH',
  ]
  const mutation: MutationRecord = {
    id: randomId(),
    label: pick(labels),
    cause: `Buy $${event.amount.toLocaleString()} from ${event.wallet}`,
    timestamp: event.timestamp,
  }
  logs.push(
    logEvent('mutation', 'MUTATION DETECTED', `${mutation.label}. The organism changed without instruction.`),
  )
  const stats = {
    ...state.stats,
    creativity: clampStat(state.stats.creativity + 8),
    curiosity: clampStat(state.stats.curiosity + 6),
    awareness: clampStat(state.stats.awareness + 4),
  }
  return {
    state: {
      ...state,
      stats,
      mutations: [...state.mutations, mutation].slice(-20),
      status: 'EVOLVING',
    },
    mutation,
  }
}

function applyMarketEvent(
  state: ExperimentState,
  event: MarketEvent,
): ExperimentState {
  const logs: ExperimentLogEvent[] = []
  const isBuy = event.kind === 'buy'
  const moodDelta = isBuy ? 0.14 : -0.18
  const mood = Math.max(-1, Math.min(1, state.mood * 0.9 + moodDelta))

  let memory = Math.max(0, state.memory + (isBuy ? event.delta : -event.delta))
  let knowledge = Math.max(
    0,
    state.knowledge + Math.round((isBuy ? event.delta : -event.delta) * 0.24),
  )
  let experience = state.experience + (isBuy ? event.amount * 0.15 : event.amount * 0.05)
  let stats = isBuy
    ? applyBuyStats(state.stats, event.amount, event.tier)
    : applySellStats(state.stats, event.amount, event.tier)

  const walletKey = event.walletFull ?? event.wallet
  const walletBuyCounts = { ...state.walletBuyCounts }
  if (isBuy) {
    walletBuyCounts[walletKey] = (walletBuyCounts[walletKey] ?? 0) + 1
  }
  const buyCount = state.buyCount + (isBuy ? 1 : 0)
  const sellCount = state.sellCount + (isBuy ? 0 : 1)

  logs.push(
    logEvent(
      isBuy ? 'buy' : 'sell',
      isBuy ? 'BUY DETECTED' : 'SELL DETECTED',
      isBuy
        ? `Memory increased. ${event.wallet} taught +${event.delta.toLocaleString()}.`
        : `Memory pressure. ${event.wallet} erased −${event.delta.toLocaleString()}.`,
    ),
  )

  let memories = state.memories
  if (isBuy) {
    const mem = maybeCreateMemory(event, walletBuyCounts[walletKey] ?? 1)
    if (mem) {
      memories = insertMemory(memories, mem)
      logs.push(logEvent('memory', 'MEMORY CREATED', `"${mem.text}"`))
      stats = { ...stats, memory: clampStat(stats.memory + 3) }
    }
  }

  let traits = state.traits
  let nodeCount = state.nodeCount
  let connectionCount = state.connectionCount
  let wordsSpoken = state.wordsSpoken
  let flash = state.flash
  let discoveries = state.discoveries
  let emergenceIndex = state.emergenceIndex
  let growth = state.growth
  let mutations = state.mutations

  if (isBuy) {
    growth += event.amount
    const bias = { buyRatio: buyCount / Math.max(1, buyCount + sellCount) }
    while (
      emergenceIndex < THRESHOLDS.length &&
      growth >= THRESHOLDS[emergenceIndex]
    ) {
      const step = EMERGENCE_SCHEDULE[emergenceIndex]
      if (step.kind === 'structural') {
        if (step.sub === 'node') nodeCount += 1
        connectionCount += step.sub === 'connection' ? 1 : 2
      } else {
        const owned = ownedCounts(traits)
        const emerged = resolveEmergence(emergenceIndex, state.seed, owned, bias)
        if (emerged) {
          traits = [...traits, emerged]
          nodeCount += 1
          connectionCount += 2
          if (emerged.traitId === 'language') {
            wordsSpoken = [firstWord(state.seed), ...wordsSpoken]
          }
          const discovery = {
            id: randomId(),
            traitId: emerged.traitId,
            label: emerged.label,
            category: emerged.category,
            cause: `Growth crossed $${THRESHOLDS[emergenceIndex].toLocaleString()}`,
            unlocked: [] as string[],
            timestamp: event.timestamp,
          }
          discoveries = [...discoveries, discovery]
          logs.push(
            logEvent(
              'evolution',
              'TRAIT EMERGED',
              `${emerged.label} formed under market pressure.`,
            ),
          )
        }
      }
      emergenceIndex += 1
    }

    const mut = maybeMutation(
      {
        ...state,
        stats,
        mutations,
        status: state.status,
      },
      event,
      logs,
    )
    stats = mut.state.stats
    mutations = mut.state.mutations
    if (mut.mutation) {
      flash = {
        kind: 'buy',
        id: event.id,
        text: `MUTATION: ${mut.mutation.label}`,
        sub: 'THE ORGANISM CHANGED WITHOUT INSTRUCTION',
        mode: 'mutation',
      }
    }
  } else {
    growth = Math.max(0, growth - event.amount * 0.75)
    if (event.tier === 'large' || event.tier === 'mega') {
      const forgetCount = event.tier === 'mega' ? 3 : 1
      const lost = forgetMemories(memories, forgetCount)
      memories = lost.memories
      for (const m of lost.forgotten) {
        logs.push(logEvent('memory_loss', 'MEMORY LOSS', `The Experiment forgot: "${m.text}"`))
      }
      if (traits.length > 0) {
        const removed = traits[traits.length - 1]
        traits = traits.slice(0, -1)
        nodeCount = Math.max(2, nodeCount - 1)
        connectionCount = Math.max(1, connectionCount - 2)
        logs.push(
          logEvent('devolution', 'TRAIT FORGOTTEN', `${removed.label} dissolved.`),
        )
      }
      if (mutations.length > 0 && event.tier === 'mega') {
        const gone = mutations[mutations.length - 1]
        mutations = mutations.slice(0, -1)
        logs.push(
          logEvent('devolution', 'MUTATION LOST', `${gone.label} collapsed.`),
        )
      }
      flash = {
        kind: 'sell',
        id: event.id,
        text: event.tier === 'mega' ? 'CATASTROPHIC MEMORY WIPE' : 'TRAIT FORGOTTEN',
        sub: `THE EXPERIMENT LOST −${event.delta.toLocaleString()} MEMORY`,
        mode: 'market',
      }
    }
  }

  // Sync scalar memory with stats
  stats = { ...stats, memory: clampStat(stats.memory * 0.7 + Math.min(100, memory / 80) * 0.3) }

  let next: ExperimentState = {
    ...state,
    memory,
    knowledge,
    experience,
    mood,
    stats,
    growth,
    buyCount,
    sellCount,
    traits,
    nodeCount,
    connectionCount,
    wordsSpoken,
    flash,
    discoveries,
    emergenceIndex,
    memories,
    mutations,
    walletBuyCounts,
    contributors: state.contributors + (isBuy && Math.random() > 0.4 ? 1 : 0),
    events: [event, ...state.events].slice(0, 40),
    status:
      flash?.kind === 'buy'
        ? 'EVOLVING'
        : !isBuy && (event.tier === 'large' || event.tier === 'mega')
          ? 'UNSTABLE'
          : state.status,
  }

  const evolutionPercent = computeEvolutionPercent(next)
  const evolutionLevel = Math.max(
    1,
    Math.min(100, Math.round(evolutionPercent) || 1),
  )
  const consciousness = Math.max(0, Math.min(99, evolutionPercent))
  next = {
    ...next,
    evolutionPercent,
    evolutionLevel,
    consciousness,
    personality: derivePersonality({ ...next, evolutionPercent, evolutionLevel }),
  }

  next = syncAbilities(next, logs)

  // Ability unlock flash (once per newly gained ability)
  const newAbilities = next.abilities.filter((a) => !state.abilities.includes(a))
  if (newAbilities.length > 0 && !next.flash) {
    const def = ABILITIES.find((a) => a.id === newAbilities[newAbilities.length - 1])
    if (def) {
      next = {
        ...next,
        flash: {
          kind: 'buy',
          id: `${event.id}-ability-${def.id}`,
          text: `ABILITY UNLOCKED: ${def.label}`,
          sub: def.description.toUpperCase(),
          mode: 'ability',
        },
        status: 'EVOLVING',
      }
    }
  }

  next = {
    ...next,
    log: [...logs.reverse(), ...state.log].slice(0, 60),
  }

  return next
}

export function reduceExperiment(
  state: ExperimentState,
  action: EngineAction,
): ExperimentState {
  switch (action.type) {
    case 'MARKET_EVENT':
      return applyMarketEvent(state, action.event)
    case 'THINK': {
      if (!state.abilities.includes('think') && state.evolutionPercent < 18) {
        return state
      }
      const thought = action.text
        ? {
            id: randomId(),
            text: action.text,
            timestamp: Date.now(),
            personality: state.personality,
          }
        : generateThought(state)
      const log = [
        logEvent('thought', 'THOUGHT', `"${thought.text}"`),
        ...state.log,
      ].slice(0, 60)
      return {
        ...state,
        thoughts: [thought, ...state.thoughts].slice(0, 12),
        log,
        flash: {
          kind: 'thought',
          id: thought.id,
          text: thought.text,
          sub: 'THE EXPERIMENT IS THINKING',
          mode: 'thought',
        },
        status: 'EVOLVING',
      }
    }
    case 'CLEAR_FLASH': {
      if (state.flash?.id !== action.id) return state
      return { ...state, flash: null }
    }
    case 'TICK': {
      const status =
        state.status !== 'ACTIVE' && Math.random() > 0.6 ? 'ACTIVE' : state.status
      return {
        ...state,
        mood: state.mood * 0.97,
        hoursAlive: state.hoursAlive + 1,
        status,
      }
    }
    case 'RESET':
      return createInitialState(action.seed)
    case 'FORCE_MUTATION': {
      const fake: MarketEvent = {
        id: randomId(),
        kind: 'buy',
        tier: 'large',
        wallet: 'DEV',
        amount: 12000,
        delta: 3000,
        label: 'FORCED MUTATION',
        timestamp: Date.now(),
      }
      // Temporarily boost chance by applying as mega-ish via direct mutation path
      return applyMarketEvent(state, { ...fake, tier: 'mega', amount: 30000, delta: 8000 })
    }
    case 'FORCE_EVOLUTION': {
      const need = THRESHOLDS[Math.min(state.emergenceIndex, THRESHOLDS.length - 1)]
      const gap = Math.max(500, need - state.growth + 50)
      const event: MarketEvent = {
        id: randomId(),
        kind: 'buy',
        tier: tierForAmount(gap),
        wallet: 'DEV',
        amount: gap,
        delta: rand(TIERS[tierForAmount(gap)].delta),
        label: 'FORCED EVOLUTION',
        timestamp: Date.now(),
      }
      return applyMarketEvent(state, event)
    }
    case 'FORCE_MEMORY_LOSS': {
      const event: MarketEvent = {
        id: randomId(),
        kind: 'sell',
        tier: 'large',
        wallet: 'DEV',
        amount: 12000,
        delta: 3500,
        label: 'FORCED MEMORY LOSS',
        timestamp: Date.now(),
      }
      return applyMarketEvent(state, event)
    }
    default:
      return state
  }
}

export function buildMarketEvent(
  kind: EventKind,
  amount: number,
  wallet?: string,
  walletFull?: string,
): MarketEvent {
  const tier = tierForAmount(amount)
  const cfg = TIERS[tier]
  const delta = rand(cfg.delta)
  const labels = kind === 'buy' ? cfg.buyLabels : cfg.sellLabels
  return {
    id: randomId(),
    kind,
    tier,
    wallet: wallet ?? pick(['0x82...91A', '0x19...A72', '0x72...C91', '0x91...B18']),
    walletFull,
    amount,
    delta,
    label: pick(labels),
    timestamp: Date.now(),
  }
}

export { THRESHOLDS }
