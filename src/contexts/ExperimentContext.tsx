import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
} from 'react'
import type {
  EngineAction,
  EventKind,
  ExperimentState,
} from '../types/experiment'
import type { AbilityId } from '../data/abilities'
import { ABILITIES, nextLockedAbility, type AbilityDef } from '../data/abilities'
import {
  THRESHOLDS,
  buildMarketEvent,
  createInitialState,
  reduceExperiment,
} from '../engine/evolutionEngine'
import { loadOrganismState, saveOrganismState, clearOrganismState } from '../engine/persist'
import { getExperimentSeed, rerollExperimentSeed } from '../utils/rng'
import { shortWallet } from '../utils/format'
import type { WorldTransaction } from '../types/world'
import { usePumpPortal, type PumpFeed } from '../hooks/usePumpPortal'
import {
  fetchOrganism,
  postEngineAction,
  postMarketEvent,
  postThink,
} from '../lib/organismApi'

export { TIERS, tierForAmount } from '../engine/evolutionEngine'

type SyncMode = 'local' | 'shared' | 'connecting'

interface ExperimentContextValue extends ExperimentState {
  trigger: (kind: EventKind, amount: number, wallet?: string) => void
  clearFlash: (id: string) => void
  forceMutation: () => void
  forceEvolution: () => void
  forceMemoryLoss: () => void
  forceThink: () => void
  resetExperiment: () => void
  nextThreshold: number
  progressToNext: number
  totalStages: number
  nextAbility: AbilityDef | null
  pump: PumpFeed
  /** local = browser-only fallback; shared = Neon is source of truth */
  syncMode: SyncMode
  version: number
  /** True while waiting on AI Gateway for a thought. */
  thinking: boolean
}

const ExperimentContext = createContext<ExperimentContextValue | null>(null)

type LocalAction = EngineAction | { type: 'HYDRATE'; state: ExperimentState }

function reducer(state: ExperimentState, action: LocalAction): ExperimentState {
  if (action.type === 'HYDRATE') {
    // Don't let polls wipe an in-progress cinematic flash
    return {
      ...action.state,
      flash: action.state.flash ?? state.flash,
    }
  }
  return reduceExperiment(state, action)
}

/** Ambient fake market + local-only tooling — Vite DEV only. */
function useShowDevSim(): boolean {
  return import.meta.env.DEV
}

export function ExperimentProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, () =>
    loadOrganismState(getExperimentSeed()),
  )
  const [syncMode, setSyncMode] = useState<SyncMode>('connecting')
  const [version, setVersion] = useState(0)
  const [thinking, setThinking] = useState(false)
  const syncModeRef = useRef<SyncMode>('connecting')
  syncModeRef.current = syncMode
  const showDev = useShowDevSim()
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastThoughtId = useRef<string | null>(null)

  // Boot: prefer shared organism when API + DB are available
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const snap = await fetchOrganism()
      if (cancelled) return
      if (snap?.state) {
        dispatch({ type: 'HYDRATE', state: snap.state })
        setVersion(snap.version)
        setSyncMode('shared')
      } else {
        setSyncMode('local')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Poll shared state so every visitor converges
  useEffect(() => {
    if (syncMode !== 'shared') return
    const id = setInterval(async () => {
      const snap = await fetchOrganism()
      if (!snap?.state) return
      if (snap.version !== version) {
        setVersion(snap.version)
        dispatch({ type: 'HYDRATE', state: snap.state })
      }
    }, 2500)
    return () => clearInterval(id)
  }, [syncMode, version])

  // Local persist only when not on shared brain
  useEffect(() => {
    if (syncMode !== 'local') return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => saveOrganismState(state), 400)
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [state, syncMode])

  const applyShared = useCallback(async (snap: Awaited<ReturnType<typeof postMarketEvent>>) => {
    // Preserve in-flight cinematic flash from this response
    dispatch({ type: 'HYDRATE', state: snap.state })
    setVersion(snap.version)
    setSyncMode('shared')
    if (snap.state.thoughts[0]?.id) {
      lastThoughtId.current = snap.state.thoughts[0].id
    }
  }, [])

  const nudgeThinkFromMarket = useCallback(
    (amount: number) => {
      // Small fills still shape stats/memories; medium+ should make the mind speak.
      if (amount < 80) return
      if (syncModeRef.current === 'shared') {
        window.setTimeout(() => {
          setThinking(true)
          void postThink(false)
            .then((snap) => {
              if (snap.state && !snap.skipped) void applyShared(snap)
            })
            .catch(() => {
              /* server maybeThinkAfterEvent may still land via poll */
            })
            .finally(() => setThinking(false))
        }, 450)
        return
      }
      window.setTimeout(() => dispatch({ type: 'THINK' }), 500)
    },
    [applyShared],
  )

  const trigger = useCallback(
    async (kind: EventKind, amount: number, wallet?: string, signature?: string) => {
      if (syncModeRef.current === 'shared') {
        try {
          const snap = await postMarketEvent({ kind, amount, wallet, signature })
          await applyShared(snap)
          nudgeThinkFromMarket(amount)
          return
        } catch {
          /* fall through to local */
        }
      }
      const event = buildMarketEvent(
        kind,
        amount,
        wallet ? shortWallet(wallet) : undefined,
        wallet,
      )
      dispatch({ type: 'MARKET_EVENT', event })
      nudgeThinkFromMarket(amount)
    },
    [applyShared, nudgeThinkFromMarket],
  )

  const submitTransaction = useCallback(
    (tx: WorldTransaction) => {
      const kind: EventKind = tx.type === 'BUY' ? 'buy' : 'sell'
      void trigger(
        kind,
        Math.max(1, Math.round(tx.amount)),
        tx.wallet,
        tx.transaction,
      )
    },
    [trigger],
  )

  const pump = usePumpPortal({ submitTransaction })

  const clearFlash = useCallback((id: string) => {
    dispatch({ type: 'CLEAR_FLASH', id })
  }, [])

  const forceMutation = useCallback(() => {
    if (syncModeRef.current === 'shared') {
      void postEngineAction('force_mutation').then(applyShared).catch(() => {
        dispatch({ type: 'FORCE_MUTATION' })
      })
      return
    }
    dispatch({ type: 'FORCE_MUTATION' })
  }, [applyShared])

  const forceEvolution = useCallback(() => {
    if (syncModeRef.current === 'shared') {
      void postEngineAction('force_evolution').then(applyShared).catch(() => {
        dispatch({ type: 'FORCE_EVOLUTION' })
      })
      return
    }
    dispatch({ type: 'FORCE_EVOLUTION' })
  }, [applyShared])

  const forceMemoryLoss = useCallback(() => {
    if (syncModeRef.current === 'shared') {
      void postEngineAction('force_memory_loss').then(applyShared).catch(() => {
        dispatch({ type: 'FORCE_MEMORY_LOSS' })
      })
      return
    }
    dispatch({ type: 'FORCE_MEMORY_LOSS' })
  }, [applyShared])

  const forceThink = useCallback(() => {
    if (syncModeRef.current === 'shared') {
      setThinking(true)
      void postThink(true)
        .then((snap) => {
          if (snap.state) void applyShared(snap)
        })
        .catch(() => {
          dispatch({ type: 'THINK' })
        })
        .finally(() => setThinking(false))
      return
    }
    setThinking(true)
    window.setTimeout(() => {
      dispatch({ type: 'THINK' })
      setThinking(false)
    }, 900)
  }, [applyShared])

  const resetExperiment = useCallback(() => {
    const seed = rerollExperimentSeed()
    if (syncModeRef.current === 'shared') {
      void postEngineAction('reset', seed).then(applyShared).catch(() => {
        clearOrganismState()
        dispatch({ type: 'RESET', seed })
      })
      return
    }
    clearOrganismState()
    dispatch({ type: 'RESET', seed })
  }, [applyShared])

  // No ambient fake market in production. Dev-only ambient when feed is idle + local mode.
  useEffect(() => {
    if (!showDev) return
    if (pump.status === 'live') return
    // Shared mode: don't invent fake global history
    if (syncMode === 'shared') return
    let timeout: ReturnType<typeof setTimeout>
    const loop = () => {
      const kind: EventKind = Math.random() > 0.78 ? 'sell' : 'buy'
      const roll = Math.random()
      let amount = 25
      if (roll > 0.97) amount = 28000
      else if (roll > 0.9) amount = 8000
      else if (roll > 0.7) amount = 900
      else if (roll > 0.4) amount = 120
      void trigger(kind, amount)
      timeout = setTimeout(loop, 4000 + Math.random() * 6000)
    }
    timeout = setTimeout(loop, 2500)
    return () => clearTimeout(timeout)
  }, [trigger, pump.status, showDev, syncMode])

  useEffect(() => {
    const canThinkNow =
      state.abilities.includes('think') || state.evolutionPercent >= 18
    if (!canThinkNow) return

    // Shared: server AI thoughts (cron + occasional client nudge)
    if (syncMode === 'shared') {
      let timeout: ReturnType<typeof setTimeout>
      const loop = () => {
        setThinking(true)
        void postThink(false)
          .then((snap) => {
            if (snap.state && !snap.skipped) {
              dispatch({ type: 'HYDRATE', state: snap.state })
              if (typeof snap.version === 'number') setVersion(snap.version)
            }
          })
          .finally(() => setThinking(false))
        timeout = setTimeout(loop, 120_000 + Math.random() * 60_000)
      }
      timeout = setTimeout(loop, 20_000)
      return () => clearTimeout(timeout)
    }

    // Local fallback: deterministic personality engine
    let timeout: ReturnType<typeof setTimeout>
    const loop = () => {
      dispatch({ type: 'THINK' })
      timeout = setTimeout(loop, 12000 + Math.random() * 16000)
    }
    timeout = setTimeout(loop, 8000)
    return () => clearTimeout(timeout)
  }, [state.abilities, state.evolutionPercent, syncMode])

  useEffect(() => {
    if (syncMode === 'shared') return
    const id = setInterval(() => dispatch({ type: 'TICK' }), 4000)
    return () => clearInterval(id)
  }, [syncMode])

  const nextThreshold =
    THRESHOLDS[Math.min(state.emergenceIndex, THRESHOLDS.length - 1)]
  const prevThreshold =
    state.emergenceIndex > 0 ? THRESHOLDS[state.emergenceIndex - 1] : 0
  const progressToNext =
    nextThreshold <= prevThreshold
      ? 1
      : Math.max(
          0,
          Math.min(1, (state.growth - prevThreshold) / (nextThreshold - prevThreshold)),
        )

  const value: ExperimentContextValue = {
    ...state,
    trigger: (kind, amount, wallet) => {
      void trigger(kind, amount, wallet)
    },
    clearFlash,
    forceMutation,
    forceEvolution,
    forceMemoryLoss,
    forceThink,
    resetExperiment,
    nextThreshold,
    progressToNext,
    totalStages: THRESHOLDS.length,
    nextAbility: nextLockedAbility(state.abilities as AbilityId[]),
    pump,
    syncMode,
    version,
    thinking,
  }

  return (
    <ExperimentContext.Provider value={value}>{children}</ExperimentContext.Provider>
  )
}

export function useExperiment(): ExperimentContextValue {
  const ctx = useContext(ExperimentContext)
  if (!ctx) throw new Error('useExperiment must be used within ExperimentProvider')
  return ctx
}

export { ABILITIES, createInitialState }
