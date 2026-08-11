import { useCallback, useEffect, useRef, useState } from 'react';
import type { WorldTransaction } from '../types/world';
import {
  DEFAULT_SOL_USD,
  redactSecrets,
  resolveTokenMint,
  setStoredMint,
} from '../config/pump';
import type { FeedStatus } from '../lib/pumpPortal';
import {
  fetchDexScreenerQuote,
  fetchHolderCount,
  fetchSolUsd,
  type TokenQuote,
} from '../lib/tokenPrice';

export interface PumpFeed {
  status: FeedStatus;
  detail?: string;
  mint: string;
  /** True when the server reports PUMPPORTAL_API_KEY is configured. */
  hasApiKey: boolean;
  solUsd: number;
  /** Latest USD spot price for the token, or null before first quote. */
  priceUsd: number | null;
  /** Live market cap in USD. */
  marketCapUsd: number | null;
  /** 24h USD volume from DexScreener when available. */
  volume24hUsd: number | null;
  /** On-chain holder count. */
  holderCount: number | null;
  /** True when the last price move was up. */
  priceUp: boolean;
  lastTradeAt: number | null;
  tradeCount: number;
  setMint: (mint: string) => void;
  clearMint: () => void;
}

interface Options {
  submitTransaction: (tx: WorldTransaction) => void;
}

type BridgeStatusResponse = {
  running?: boolean;
  connected?: boolean;
  hasKey?: boolean;
  tradeCount?: number;
  lastTradeAt?: number | null;
  detail?: string;
  lastError?: string;
  mint?: string;
};

/**
 * Client market feed: DexScreener quotes + server PumpPortal bridge keep-alive.
 * The API key never touches the browser.
 */
export function usePumpPortal({ submitTransaction: _submitTransaction }: Options): PumpFeed {
  const [mint, setMintState] = useState(() => resolveTokenMint());
  const [status, setStatus] = useState<FeedStatus>(() =>
    resolveTokenMint() ? 'connecting' : 'no-mint',
  );
  const [detail, setDetail] = useState<string | undefined>();
  const [lastTradeAt, setLastTradeAt] = useState<number | null>(null);
  const [tradeCount, setTradeCount] = useState(0);
  const [solUsd, setSolUsd] = useState(DEFAULT_SOL_USD);
  const [priceUsd, setPriceUsd] = useState<number | null>(null);
  const [marketCapUsd, setMarketCapUsd] = useState<number | null>(null);
  const [volume24hUsd, setVolume24hUsd] = useState<number | null>(null);
  const [holderCount, setHolderCount] = useState<number | null>(null);
  const [priceUp, setPriceUp] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const priceRef = useRef<number | null>(null);

  const applyQuote = useCallback((quote: TokenQuote | null) => {
    if (!quote) return;
    const { priceUsd: next, marketCapUsd: mcap, volume24hUsd: vol } = quote;
    if (!Number.isFinite(next) || next <= 0) return;
    const prev = priceRef.current;
    if (prev != null && next !== prev) {
      setPriceUp(next > prev);
    }
    priceRef.current = next;
    setPriceUsd(next);
    if (mcap != null && Number.isFinite(mcap) && mcap > 0) {
      setMarketCapUsd(mcap);
    } else {
      setMarketCapUsd(next * 1_000_000_000);
    }
    if (vol != null && Number.isFinite(vol) && vol > 0) {
      setVolume24hUsd(vol);
    }
  }, []);

  const setMint = useCallback((next: string) => {
    const clean = next.trim();
    setStoredMint(clean);
    setMintState(clean || resolveTokenMint(null));
    priceRef.current = null;
    setPriceUsd(null);
    setMarketCapUsd(null);
    setVolume24hUsd(null);
    setHolderCount(null);
  }, []);

  const clearMint = useCallback(() => {
    setStoredMint('');
    setMintState(resolveTokenMint(null));
    priceRef.current = null;
    setPriceUsd(null);
    setMarketCapUsd(null);
    setVolume24hUsd(null);
    setHolderCount(null);
  }, []);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'world.tokenMint') {
        setMintState(resolveTokenMint());
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const pull = async () => {
      const p = await fetchSolUsd();
      if (!cancelled && p) setSolUsd(p);
    };
    void pull();
    const id = window.setInterval(pull, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  // Baseline + poll from DexScreener (covers quiet periods / graduation).
  useEffect(() => {
    if (!mint) return;
    let cancelled = false;
    const pull = async () => {
      const q = await fetchDexScreenerQuote(mint);
      if (!cancelled) applyQuote(q);
    };
    void pull();
    const id = window.setInterval(pull, 15_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [mint, applyQuote]);

  // Holder count → Population / Holders (must match pump.fun).
  useEffect(() => {
    if (!mint) {
      setHolderCount(null);
      return;
    }
    let cancelled = false;
    const pull = async () => {
      const n = await fetchHolderCount(mint);
      if (!cancelled && n != null) setHolderCount(n);
    };
    void pull();
    const id = window.setInterval(pull, 12_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [mint]);

  // Keep server PumpPortal bridge warm; never receive the API key in the browser.
  useEffect(() => {
    if (!mint) {
      setStatus('no-mint');
      setDetail(undefined);
      return;
    }

    let cancelled = false;
    let holdController: AbortController | null = null;

    const applyBridge = (data: BridgeStatusResponse) => {
      setHasApiKey(Boolean(data.hasKey));
      if (typeof data.tradeCount === 'number') setTradeCount(data.tradeCount);
      if (data.lastTradeAt) setLastTradeAt(data.lastTradeAt);
      if (!data.hasKey) {
        setStatus('error');
        setDetail(
          'Server PumpPortal key not configured. Price still loads from DexScreener; set PUMPPORTAL_API_KEY on the host.',
        );
        return;
      }
      if (data.connected || data.running) {
        setStatus('live');
        setDetail(
          data.detail
            ? redactSecrets(data.detail)
            : 'server ingest listening for buys/sells',
        );
        return;
      }
      setStatus('connecting');
      setDetail(
        data.lastError
          ? redactSecrets(data.lastError)
          : data.detail
            ? redactSecrets(data.detail)
            : 'starting server ingest…',
      );
    };

    const ping = async () => {
      holdController?.abort();
      holdController = new AbortController();
      try {
        const res = await fetch('/api/pump-bridge?status=1', {
          method: 'GET',
          signal: holdController.signal,
        });
        const ctype = res.headers.get('content-type') || '';
        if (!ctype.includes('application/json')) {
          if (!cancelled) {
            setStatus('error');
            setDetail('Pump bridge API unavailable');
            setHasApiKey(false);
          }
          return;
        }
        const data = (await res.json()) as BridgeStatusResponse;
        if (!cancelled) applyBridge(data);

        // Keep a serverless hold open whenever we have a key but aren't live.
        // (running+reconnecting still needs a warm invocation — don't wait for stopped.)
        if (data.hasKey && !data.connected) {
          void fetch('/api/pump-bridge?holdMs=45000', { method: 'POST' }).catch(
            () => undefined,
          );
        }
      } catch (err) {
        if (cancelled || (err instanceof DOMException && err.name === 'AbortError')) {
          return;
        }
        if (!cancelled) {
          setStatus('error');
          setDetail('Pump bridge unreachable');
        }
      }
    };

    setStatus('connecting');
    void ping();
    const id = window.setInterval(ping, 12_000);
    return () => {
      cancelled = true;
      holdController?.abort();
      window.clearInterval(id);
    };
  }, [mint]);

  return {
    status,
    detail,
    mint,
    hasApiKey,
    solUsd,
    priceUsd,
    marketCapUsd,
    volume24hUsd,
    holderCount,
    priceUp,
    lastTradeAt,
    tradeCount,
    setMint,
    clearMint,
  };
}
