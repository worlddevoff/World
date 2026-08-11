import type { WorldTransaction } from '../types/world';
import { redactSecrets } from '../config/pump';

/** Local default so server imports do not depend on Vite client env. */
const DEFAULT_SOL_USD = 150;

/** Raw trade message from PumpPortal `subscribeTokenTrade`. */
export interface PumpPortalTrade {
  signature?: string;
  mint?: string;
  traderPublicKey?: string;
  txType?: string;
  tokenAmount?: number;
  solAmount?: number;
  marketCapSol?: number;
  timestamp?: number;
  // occasional alternate shapes
  type?: string;
  is_buy?: boolean;
}

export type FeedStatus = 'idle' | 'connecting' | 'live' | 'error' | 'no-mint';

export function isTradeMessage(msg: unknown): msg is PumpPortalTrade {
  if (!msg || typeof msg !== 'object') return false;
  const m = msg as PumpPortalTrade;
  const tx = (m.txType ?? '').toLowerCase();
  return tx === 'buy' || tx === 'sell' || typeof m.is_buy === 'boolean';
}

export function tradeToWorldTransaction(
  trade: PumpPortalTrade,
  solUsd: number = DEFAULT_SOL_USD,
): WorldTransaction | null {
  const txType = (trade.txType ?? '').toLowerCase();
  if (txType === 'create') return null;

  let side: 'BUY' | 'SELL' | null = null;
  if (txType === 'buy') side = 'BUY';
  else if (txType === 'sell') side = 'SELL';
  else if (trade.is_buy === true) side = 'BUY';
  else if (trade.is_buy === false) side = 'SELL';
  if (!side) return null;

  const sol = Number(trade.solAmount ?? 0);
  if (!Number.isFinite(sol) || sol <= 0) return null;

  const wallet = trade.traderPublicKey?.trim();
  if (!wallet) return null;

  const signature = trade.signature?.trim() || `pump_${wallet}_${trade.timestamp ?? Date.now()}`;
  const ts =
    typeof trade.timestamp === 'number'
      ? trade.timestamp < 1e12
        ? trade.timestamp * 1000
        : trade.timestamp
      : Date.now();

  // Event tiers are dollar-shaped; convert SOL → USD.
  const amount = Math.max(1, Math.round(sol * solUsd));

  return {
    type: side,
    amount,
    wallet,
    timestamp: new Date(ts).toISOString(),
    transaction: signature,
  };
}

export interface PumpPortalClientOptions {
  mint: string;
  /** Called per message so SOL/USD can stay fresh without reconnecting. */
  getSolUsd?: () => number;
  solUsd?: number;
  onTrade: (tx: WorldTransaction, raw: PumpPortalTrade) => void;
  onStatus?: (status: FeedStatus, detail?: string) => void;
  wsUrl?: string;
}

/** True when PumpPortal rejected the stream and we should not hammer reconnect. */
function isFatalPumpError(msg: string): boolean {
  return /balance|fund|api.?key|auth|payment|denied|invalid|banned|rate.?limit|timed?\s*out/i.test(
    msg,
  );
}

function humanizePumpError(msg: string): string {
  if (/minimum balance|balance not met/i.test(msg)) {
    return `${msg} Fund the PumpPortal-linked wallet with ≥0.02 SOL, then reconnect.`;
  }
  if (/banned|rate.?limit|many websocket/i.test(msg)) {
    return `${msg} Wait up to an hour, keep a single tab open, then try again.`;
  }
  return msg;
}

/**
 * Browser WebSocket client for PumpPortal token trades.
 * Reconnects with backoff; dedupes by signature.
 */
export function connectPumpPortal(opts: PumpPortalClientOptions): () => void {
  const { mint, onTrade, onStatus, wsUrl = 'wss://pumpportal.fun/api/data' } = opts;
  const resolveSolUsd = () =>
    opts.getSolUsd?.() ?? opts.solUsd ?? DEFAULT_SOL_USD;

  if (!mint) {
    onStatus?.('no-mint');
    return () => undefined;
  }

  let ws: WebSocket | null = null;
  let closed = false;
  let fatal = false;
  let attempt = 0;
  let reconnectTimer: number | undefined;
  const seen = new Set<string>();
  const SEEN_MAX = 400;

  const setStatus = (s: FeedStatus, detail?: string) =>
    onStatus?.(s, detail ? redactSecrets(detail) : detail);

  const remember = (sig: string) => {
    seen.add(sig);
    if (seen.size > SEEN_MAX) {
      const first = seen.values().next().value;
      if (first) seen.delete(first);
    }
  };

  const failFatal = (raw: string) => {
    fatal = true;
    setStatus('error', humanizePumpError(raw));
    try {
      ws?.close();
    } catch {
      /* ignore */
    }
    ws = null;
  };

  const scheduleReconnect = () => {
    if (closed || fatal) return;
    const delay = Math.min(30_000, 1000 * 2 ** attempt);
    attempt += 1;
    setStatus('connecting', `reconnect in ${Math.round(delay / 1000)}s`);
    reconnectTimer = window.setTimeout(open, delay);
  };

  const open = () => {
    if (closed || fatal) return;
    setStatus('connecting');
    try {
      ws = new WebSocket(wsUrl);
    } catch (err) {
      setStatus('error', err instanceof Error ? err.message : 'WebSocket failed');
      scheduleReconnect();
      return;
    }

    ws.onopen = () => {
      attempt = 0;
      setStatus('connecting', 'socket open — subscribing…');
      ws?.send(
        JSON.stringify({
          method: 'subscribeTokenTrade',
          keys: [mint],
        }),
      );
      // Only mark live after a short grace period with no error payload.
      window.setTimeout(() => {
        if (!closed && !fatal && ws?.readyState === WebSocket.OPEN) {
          setStatus('live', 'subscribed — waiting for buys/sells on this mint');
        }
      }, 400);
    };

    ws.onmessage = (ev) => {
      let data: unknown;
      try {
        data = JSON.parse(String(ev.data));
      } catch {
        return;
      }

      if (data && typeof data === 'object') {
        const err =
          (data as { errors?: string }).errors ??
          (data as { error?: string }).error;
        if (typeof err === 'string' && err.trim()) {
          if (isFatalPumpError(err)) {
            failFatal(err);
            return;
          }
          setStatus('error', humanizePumpError(err));
          return;
        }
      }

      if (!isTradeMessage(data)) return;
      // Ignore trades for other mints if the feed ever broadens.
      if (data.mint && data.mint !== mint) return;

      const tx = tradeToWorldTransaction(data, resolveSolUsd());
      if (!tx) return;
      if (seen.has(tx.transaction)) return;
      remember(tx.transaction);
      onTrade(tx, data);
    };

    ws.onerror = () => {
      if (!fatal) setStatus('error', 'socket error');
    };

    ws.onclose = () => {
      ws = null;
      if (!closed && !fatal) scheduleReconnect();
    };
  };

  open();

  return () => {
    closed = true;
    if (reconnectTimer) window.clearTimeout(reconnectTimer);
    ws?.close();
    ws = null;
    setStatus('idle');
  };
}
