import type { ExperimentState } from '../types/experiment.js'
import { createInitialState } from './evolutionEngine.js'

const STORAGE_KEY = 'experiment_organism_v2'

export function loadOrganismState(seedFallback: number): ExperimentState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createInitialState(seedFallback)
    const parsed = JSON.parse(raw) as ExperimentState
    if (!parsed || typeof parsed.seed !== 'number' || !parsed.stats) {
      return createInitialState(seedFallback)
    }
    // Ensure required arrays exist after schema evolution
    return {
      ...createInitialState(parsed.seed),
      ...parsed,
      stats: { ...createInitialState(parsed.seed).stats, ...parsed.stats },
      abilities: (() => {
        const list = parsed.abilities ?? []
        return list.includes('observe') ? list : ['observe', ...list]
      })(),
      memories: parsed.memories ?? [],
      mutations: parsed.mutations ?? [],
      discoveries: parsed.discoveries ?? [],
      log: parsed.log ?? [],
      walletBuyCounts: parsed.walletBuyCounts ?? {},
      emergenceIndex: parsed.emergenceIndex ?? 0,
      evolutionPercent: parsed.evolutionPercent ?? 0,
      experience: parsed.experience ?? 0,
    }
  } catch {
    return createInitialState(seedFallback)
  }
}

export function saveOrganismState(state: ExperimentState): void {
  try {
    const { flash, ...rest } = state
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...rest, flash: null }))
  } catch {
    /* quota / private mode */
  }
}

export function clearOrganismState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}
