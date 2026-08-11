import type { EmergedTrait } from '../data/traits'
import type { AbilityId } from '../data/abilities'

export type Personality =
  | 'UNKNOWN'
  | 'CURIOUS'
  | 'PARANOID'
  | 'GREEDY'
  | 'CHAOTIC'
  | 'FRIENDLY'
  | 'HOSTILE'
  | 'SARCASTIC'
  | 'ARROGANT'
  | 'OBSESSED'
  | 'CONFUSED'

export type EventKind = 'buy' | 'sell'

/** Tier scales the drama of an event. */
export type EventTier = 'micro' | 'small' | 'medium' | 'large' | 'mega'

export interface MarketEvent {
  id: string
  kind: EventKind
  tier: EventTier
  wallet: string
  /** USD size of the transaction. */
  amount: number
  /** Memory delta (positive teach, negative forget). */
  delta: number
  label: string
  timestamp: number
  /** Full wallet when known (for memory scoring). */
  walletFull?: string
}

export interface Thought {
  id: string
  text: string
  timestamp: number
  personality: Personality
}

export interface LogEntry {
  day: number
  title: string
  body: string
}

export interface EvolutionStage {
  level: number
  name: string
  revealed: boolean
}

/** Episodic memory — only important events are kept. */
export interface OrganismMemory {
  id: string
  text: string
  importance: number
  kind: 'buy' | 'sell' | 'mutation' | 'ability' | 'discovery' | 'loss'
  wallet?: string
  amount?: number
  timestamp: number
}

export interface MutationRecord {
  id: string
  label: string
  cause: string
  timestamp: number
}

export interface DiscoveryRecord {
  id: string
  traitId: string
  label: string
  category: string
  cause: string
  unlocked: string[]
  timestamp: number
}

/** Scientific observation feed entries. */
export type ExperimentLogKind =
  | 'buy'
  | 'sell'
  | 'memory'
  | 'memory_loss'
  | 'mutation'
  | 'thought'
  | 'ability'
  | 'evolution'
  | 'devolution'

export interface ExperimentLogEvent {
  id: string
  kind: ExperimentLogKind
  title: string
  body: string
  timestamp: number
}

/** Internal personality / cognition vectors (0–100). */
export interface OrganismStats {
  memory: number
  intelligence: number
  curiosity: number
  awareness: number
  creativity: number
  fear: number
  confidence: number
  aggression: number
}

export interface ExperimentState {
  /** Legacy HUD: derived coherence %. */
  consciousness: number
  /** Scalar memory pool (also mirrored in stats.memory). */
  memory: number
  knowledge: number
  evolutionLevel: number
  /** 0–100 derived progress for hero. */
  evolutionPercent: number
  experience: number
  personality: Personality
  /** -1 (fully forgetting) .. 1 (fully learning) mood balance. */
  mood: number
  status: 'ACTIVE' | 'UNSTABLE' | 'EVOLVING'
  events: MarketEvent[]
  thoughts: Thought[]
  log: ExperimentLogEvent[]
  /** Transient full-screen / cinematic event. Not persisted to Neon. */
  flash: null | {
    kind: EventKind | 'thought'
    text: string
    sub: string
    id: string
    mode?: 'ability' | 'thought' | 'market' | 'mutation'
  }
  hoursAlive: number
  contributors: number

  /* --- growth / genome --- */
  seed: number
  growth: number
  buyCount: number
  sellCount: number
  /** How many emergence schedule steps have been consumed. */
  emergenceIndex: number
  traits: EmergedTrait[]
  nodeCount: number
  connectionCount: number
  wordsSpoken: string[]

  /* --- living experiment --- */
  stats: OrganismStats
  abilities: AbilityId[]
  memories: OrganismMemory[]
  mutations: MutationRecord[]
  discoveries: DiscoveryRecord[]
  /** Repeat-buyer tracking for memory scoring. */
  walletBuyCounts: Record<string, number>
}

export type EngineAction =
  | { type: 'MARKET_EVENT'; event: MarketEvent }
  | { type: 'THINK'; text?: string }
  | { type: 'CLEAR_FLASH'; id: string }
  | { type: 'TICK' }
  | { type: 'RESET'; seed: number }
  | { type: 'FORCE_MUTATION' }
  | { type: 'FORCE_EVOLUTION' }
  | { type: 'FORCE_MEMORY_LOSS' }
