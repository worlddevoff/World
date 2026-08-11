import { neon, type NeonQueryFunction } from '@neondatabase/serverless'
import type { ExperimentState, MarketEvent, EngineAction } from '../types/experiment.js'
import { createInitialState, reduceExperiment, computeEvolutionPercent } from '../engine/evolutionEngine.js'

const ORGANISM_ID = 'main'

function databaseUrl(): string {
  const url =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.NEON_DATABASE_URL ||
    ''
  if (!url) {
    throw new Error('DATABASE_URL is not configured')
  }
  return url
}

let sql: NeonQueryFunction<false, false> | null = null
let schemaReady = false

function getSql() {
  if (!sql) sql = neon(databaseUrl())
  return sql
}

function newSeed(): number {
  const fromEnv = Number(process.env.EXPERIMENT_SEED)
  if (Number.isFinite(fromEnv) && fromEnv > 0) return fromEnv
  return Math.floor(Math.random() * 2_000_000_000)
}

/** Recompute evolution % from growth so UI matches market after formula changes. */
function normalizeState(raw: ExperimentState): ExperimentState {
  const evolutionPercent = computeEvolutionPercent(raw)
  const abilities = raw.abilities?.includes('observe')
    ? raw.abilities
    : ['observe', ...(raw.abilities ?? [])]
  return {
    ...raw,
    flash: null,
    abilities,
    evolutionPercent,
    evolutionLevel: Math.max(1, Math.min(100, Math.round(evolutionPercent) || 1)),
    consciousness: Math.max(0, Math.min(99, evolutionPercent)),
  }
}

export async function ensureSchema(): Promise<void> {
  if (schemaReady) return
  const db = getSql()
  await db`
    CREATE TABLE IF NOT EXISTS organism_state (
      id TEXT PRIMARY KEY,
      state JSONB NOT NULL,
      version BIGINT NOT NULL DEFAULT 1,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  await db`
    CREATE TABLE IF NOT EXISTS processed_txs (
      signature TEXT PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  schemaReady = true
}

export async function loadOrganism(): Promise<{
  state: ExperimentState
  version: number
}> {
  await ensureSchema()
  const db = getSql()
  const rows = await db`
    SELECT state, version FROM organism_state WHERE id = ${ORGANISM_ID} LIMIT 1
  `
  if (rows.length === 0) {
    const state = createInitialState(newSeed())
    await db`
      INSERT INTO organism_state (id, state, version)
      VALUES (${ORGANISM_ID}, ${JSON.stringify(state)}::jsonb, 1)
      ON CONFLICT (id) DO NOTHING
    `
    const again = await db`
      SELECT state, version FROM organism_state WHERE id = ${ORGANISM_ID} LIMIT 1
    `
    return {
      state: normalizeState(again[0].state as ExperimentState),
      version: Number(again[0].version),
    }
  }
  return {
    state: normalizeState(rows[0].state as ExperimentState),
    version: Number(rows[0].version),
  }
}

export async function saveOrganism(
  state: ExperimentState,
  expectedVersion?: number,
): Promise<{ state: ExperimentState; version: number }> {
  await ensureSchema()
  const db = getSql()
  // Flash is ephemeral UI — never persist or polls will replay it forever
  const clean = { ...state, flash: null as ExperimentState['flash'] }

  if (expectedVersion != null) {
    const rows = await db`
      UPDATE organism_state
      SET state = ${JSON.stringify(clean)}::jsonb,
          version = version + 1,
          updated_at = NOW()
      WHERE id = ${ORGANISM_ID} AND version = ${expectedVersion}
      RETURNING state, version
    `
    if (rows.length === 0) {
      return loadOrganism()
    }
    return {
      // Keep ephemeral flash for this response only (not stored in DB)
      state: { ...(rows[0].state as ExperimentState), flash: state.flash },
      version: Number(rows[0].version),
    }
  }

  const rows = await db`
    UPDATE organism_state
    SET state = ${JSON.stringify(clean)}::jsonb,
        version = version + 1,
        updated_at = NOW()
    WHERE id = ${ORGANISM_ID}
    RETURNING state, version
  `
  if (rows.length === 0) {
    await db`
      INSERT INTO organism_state (id, state, version)
      VALUES (${ORGANISM_ID}, ${JSON.stringify(clean)}::jsonb, 1)
    `
    return { state, version: 1 }
  }
  return {
    state: { ...(rows[0].state as ExperimentState), flash: state.flash },
    version: Number(rows[0].version),
  }
}

/** Idempotent apply — signature skips duplicates (PumpPortal fan-in). */
export async function applyMarketEvent(
  event: MarketEvent,
  signature?: string,
): Promise<{
  state: ExperimentState
  version: number
  applied: boolean
  duplicate: boolean
}> {
  await ensureSchema()
  const db = getSql()

  if (signature) {
    try {
      await db`INSERT INTO processed_txs (signature) VALUES (${signature})`
    } catch {
      const current = await loadOrganism()
      return { ...current, applied: false, duplicate: true }
    }
  }

  for (let attempt = 0; attempt < 5; attempt++) {
    const { state, version } = await loadOrganism()
    const next = reduceExperiment(state, { type: 'MARKET_EVENT', event })
    const saved = await saveOrganism(next, version)
    if (saved.version === version + 1 || attempt === 4) {
      return { ...saved, applied: true, duplicate: false }
    }
  }

  const current = await loadOrganism()
  return { ...current, applied: false, duplicate: false }
}

export async function applyEngineAction(action: EngineAction): Promise<{
  state: ExperimentState
  version: number
}> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const { state, version } = await loadOrganism()
    const next = reduceExperiment(state, action)
    const saved = await saveOrganism(next, version)
    if (saved.version === version + 1 || attempt === 4) return saved
  }
  return loadOrganism()
}

export function hasDatabase(): boolean {
  return Boolean(
    process.env.DATABASE_URL ||
      process.env.POSTGRES_URL ||
      process.env.NEON_DATABASE_URL,
  )
}
