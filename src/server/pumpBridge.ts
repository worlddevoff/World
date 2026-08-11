/**
 * Server-only PumpPortal WebSocket bridge.
 * Keeps PUMPPORTAL_API_KEY off the client; applies fills to the shared organism.
 */

import { buildMarketEvent } from '../engine/evolutionEngine.js'
import { shortWallet } from '../utils/format.js'
import { applyMarketEvent, hasDatabase } from './organismStore.js'

const PUMP_PORTAL_WS_BASE = 'wss://pumpportal.fun/api/data'
/** $RollerCT mint — override with TOKEN_MINT / VITE_TOKEN_MINT on Vercel. */
const DEFAULT_TOKEN_MINT = '2wNSnBhniBHorWTUcSTaTe65JBgYt2w5zcnAWou8pump'
const DEFAULT_SOL_USD = 150

type PumpPortalTrade = {
  signature?: string
  mint?: string
  traderPublicKey?: string
  txType?: string
  tokenAmount?: number
  solAmount?: number
  marketCapSol?: number
  timestamp?: number
  is_buy?: boolean
}

export type BridgeStatus = {
  running: boolean
  connected: boolean
  mint: string
  hasKey: boolean
  tradeCount: number
  lastTradeAt: number | null
  lastError?: string
  detail?: string
}

type BridgeControls = {
  stop: () => void
}

let controls: BridgeControls | null = null
let status: BridgeStatus = {
  running: false,
  connected: false,
  mint: '',
  hasKey: false,
  tradeCount: 0,
  lastTradeAt: null,
}

function serverPumpKey(): string {
  return (
    process.env.PUMPPORTAL_API_KEY?.trim() ||
    (process.env.NODE_ENV !== 'production'
      ? process.env.VITE_PUMPPORTAL_API_KEY?.trim() || ''
      : '')
  )
}

function serverTokenMint(): string {
  return (
    process.env.TOKEN_MINT?.trim() ||
    process.env.VITE_TOKEN_MINT?.trim() ||
    DEFAULT_TOKEN_MINT
  )
}

function solUsd(): number {
  const n = Number(process.env.SOL_USD || process.env.VITE_SOL_USD)
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_SOL_USD
}

function isTradeMessage(msg: unknown): msg is PumpPortalTrade {
  if (!msg || typeof msg !== 'object') return false
  const m = msg as PumpPortalTrade
  const tx = (m.txType ?? '').toLowerCase()
  return tx === 'buy' || tx === 'sell' || typeof m.is_buy === 'boolean'
}

function tradeAmountUsd(trade: PumpPortalTrade): {
  kind: 'buy' | 'sell'
  amount: number
  wallet: string
  signature: string
} | null {
  const txType = (trade.txType ?? '').toLowerCase()
  if (txType === 'create') return null

  let kind: 'buy' | 'sell' | null = null
  if (txType === 'buy') kind = 'buy'
  else if (txType === 'sell') kind = 'sell'
  else if (trade.is_buy === true) kind = 'buy'
  else if (trade.is_buy === false) kind = 'sell'
  if (!kind) return null

  const sol = Number(trade.solAmount ?? 0)
  if (!Number.isFinite(sol) || sol <= 0) return null

  const wallet = trade.traderPublicKey?.trim()
  if (!wallet) return null

  const signature =
    trade.signature?.trim() || `pump_${wallet}_${trade.timestamp ?? Date.now()}`
  const amount = Math.max(1, Math.round(sol * solUsd()))
  return { kind, amount, wallet, signature }
}

async function ingestTrade(trade: PumpPortalTrade): Promise<void> {
  if (!hasDatabase()) return
  const parsed = tradeAmountUsd(trade)
  if (!parsed) return
  const event = buildMarketEvent(
    parsed.kind,
    parsed.amount,
    shortWallet(parsed.wallet),
    parsed.wallet,
  )
  await applyMarketEvent(event, parsed.signature)
  status.tradeCount += 1
  status.lastTradeAt = Date.now()
}

function pumpWsUrl(apiKey: string): string {
  return `${PUMP_PORTAL_WS_BASE}?api-key=${encodeURIComponent(apiKey)}`
}

/** Current bridge status (safe for clients — never includes the key). */
export function getPumpBridgeStatus(): BridgeStatus {
  return {
    ...status,
    hasKey: serverPumpKey().length > 0,
    mint: status.mint || serverTokenMint(),
  }
}

/**
 * Ensure a single in-process PumpPortal connection.
 * Safe to call repeatedly (e.g. from page pings / cron).
 */
export function ensurePumpBridge(): BridgeStatus {
  const apiKey = serverPumpKey()
  const mint = serverTokenMint()
  status.hasKey = apiKey.length > 0
  status.mint = mint

  if (!apiKey) {
    status.running = false
    status.connected = false
    status.lastError = 'PUMPPORTAL_API_KEY not configured'
    status.detail = status.lastError
    return getPumpBridgeStatus()
  }
  if (!mint) {
    status.running = false
    status.connected = false
    status.lastError = 'TOKEN_MINT not configured'
    status.detail = status.lastError
    return getPumpBridgeStatus()
  }
  if (controls) {
    return getPumpBridgeStatus()
  }

  let ws: WebSocket | null = null
  let closed = false
  let fatal = false
  let attempt = 0
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined

  const stop = () => {
    closed = true
    if (reconnectTimer) clearTimeout(reconnectTimer)
    try {
      ws?.close()
    } catch {
      /* ignore */
    }
    ws = null
    controls = null
    status.running = false
    status.connected = false
    status.detail = 'stopped'
  }

  const open = () => {
    if (closed || fatal) return
    status.running = true
    status.detail = 'connecting'
    status.lastError = undefined

    try {
      ws = new WebSocket(pumpWsUrl(apiKey))
    } catch (err) {
      status.connected = false
      status.lastError = err instanceof Error ? err.message : 'WebSocket failed'
      status.detail = status.lastError
      scheduleReconnect()
      return
    }

    ws.addEventListener('open', () => {
      attempt = 0
      status.connected = true
      status.detail = 'subscribed'
      ws?.send(
        JSON.stringify({
          method: 'subscribeTokenTrade',
          keys: [mint],
        }),
      )
    })

    ws.addEventListener('message', (ev) => {
      let data: unknown
      try {
        data = JSON.parse(String((ev as MessageEvent).data))
      } catch {
        return
      }
      if (data && typeof data === 'object') {
        const err =
          (data as { errors?: string }).errors ??
          (data as { error?: string }).error
        if (typeof err === 'string' && err.trim()) {
          status.lastError = err
          status.detail = err
          if (/balance|fund|api.?key|auth|payment|denied|invalid|banned/i.test(err)) {
            fatal = true
            status.connected = false
            try {
              ws?.close()
            } catch {
              /* ignore */
            }
          }
          return
        }
      }
      if (!isTradeMessage(data)) return
      if (data.mint && data.mint !== mint) return
      void ingestTrade(data).catch((err) => {
        status.lastError = err instanceof Error ? err.message : 'ingest failed'
      })
    })

    ws.addEventListener('error', () => {
      status.connected = false
      status.detail = 'socket error'
    })

    ws.addEventListener('close', () => {
      ws = null
      status.connected = false
      if (!closed && !fatal) {
        status.detail = 'reconnecting'
        scheduleReconnect()
      }
    })
  }

  const scheduleReconnect = () => {
    if (closed || fatal) return
    const delay = Math.min(30_000, 1000 * 2 ** attempt)
    attempt += 1
    reconnectTimer = setTimeout(open, delay)
  }

  controls = { stop }
  open()
  return getPumpBridgeStatus()
}

export function stopPumpBridge(): void {
  controls?.stop()
}
