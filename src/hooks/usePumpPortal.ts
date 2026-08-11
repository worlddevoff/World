import { useCallback, useEffect, useRef, useState } from 'react';
import type { WorldTransaction } from '../types/world';
import {
  DEFAULT_SOL_USD,
  envPumpPortalApiKey,
  hasPumpPortalApiKey,
  pumpPortalWsUrl,
  redactSecrets,
  resolveTokenMint,
  setStoredMint,
} from '../config/pump';
import { connectPumpPortal, type FeedStatus } from '../lib/pumpPortal';
import {
  fetchDexScreenerQuote,
  fetchHolderCount,
  fetchSolUsd,
  quoteFromTrade,
  type TokenQuote,
} from '../lib/tokenPrice';

export interface PumpFeed {
  status: FeedStatus;
  detail?: string;
  mint: string;
  /** True when VITE_PUMPPORTAL_API_KEY is set (required for live token trades). */
  hasApiKey: boolean;
  solUsd: number;
  /** Latest USD spot price for the token, or null before first quote. */
  priceUsd: number | null;
  /** Live market cap in USD (World Value). */
  marketCapUsd: number | null;
  /** On-chain holder count (World Population). */
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

export function usePumpPortal({ submitTransaction }: Options): PumpFeed {
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
  const [holderCount, setHolderCount] = useState<number | null>(null);
  const [priceUp, setPriceUp] = useState(false);

  const submitRef = useRef(submitTransaction);
  submitRef.current = submitTransaction;
  const solUsdRef = useRef(solUsd);
  solUsdRef.current = solUsd;
  const priceRef = useRef<number | null>(null);

  const applyQuote = useCallback((quote: TokenQuote | null) => {
    if (!quote) return;
    const { priceUsd: next, marketCapUsd: mcap } = quote;
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
  }, []);

  const setMint = useCallback((next: string) => {
    const clean = next.trim();
    setStoredMint(clean);
    setMintState(clean || resolveTokenMint(null));
    priceRef.current = null;
    setPriceUsd(null);
    setMarketCapUsd(null);
    setHolderCount(null);
  }, []);

  const clearMint = useCallback(() => {
    setStoredMint('');
    setMintState(resolveTokenMint(null));
    priceRef.current = null;
    setPriceUsd(null);
    setMarketCapUsd(null);
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

  // Live trades from PumpPortal — update price + MC on every fill.
  useEffect(() => {
    if (!mint) {
      setStatus('no-mint');
      setDetail(undefined);
      return;
    }

    const apiKey = envPumpPortalApiKey();
    if (!apiKey) {
      setStatus('error');
      setDetail(
        'PumpPortal key not configured in environment. Price still loads from DexScreener.',
      );
      return;
    }

    setTradeCount(0);
    const disconnect = connectPumpPortal({
      mint,
      getSolUsd: () => solUsdRef.current,
      wsUrl: pumpPortalWsUrl(apiKey),
      onStatus: (s, d) => {
        setStatus(s);
        setDetail(d ? redactSecrets(d) : d);
      },
      onTrade: (tx, raw) => {
        submitRef.current(tx);
        setLastTradeAt(Date.now());
        setTradeCount((n) => n + 1);
        applyQuote(quoteFromTrade(raw, solUsdRef.current));
      },
    });

    return disconnect;
  }, [mint, applyQuote]);

  return {
    status,
    detail,
    mint,
    hasApiKey: hasPumpPortalApiKey(),
    solUsd,
    priceUsd,
    marketCapUsd,
    holderCount,
    priceUp,
    lastTradeAt,
    tradeCount,
    setMint,
    clearMint,
  };
}
