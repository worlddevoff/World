import type { PumpPortalTrade } from './pumpPortal';

/** Pump.fun standard total supply (UI units). */
export const PUMP_SUPPLY = 1_000_000_000;

export interface TokenQuote {
  priceUsd: number;
  /** Fully diluted / circulating MC in USD when available. */
  marketCapUsd: number | null;
}

export function formatTokenPrice(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n) || n <= 0) return '—';
  if (n >= 1) return `$${n.toFixed(2)}`;
  if (n >= 0.01) return `$${n.toFixed(4)}`;
  if (n >= 0.0001) return `$${n.toFixed(6)}`;
  // micro-cap pump prices
  const s = n.toPrecision(4);
  return `$${s}`;
}

/** Spot quote implied by a PumpPortal trade. */
export function quoteFromTrade(
  trade: PumpPortalTrade,
  solUsd: number,
): TokenQuote | null {
  const sol = Number(trade.solAmount ?? 0);
  const tokens = Number(trade.tokenAmount ?? 0);
  const mcapSol = Number(trade.marketCapSol ?? 0);

  let priceUsd: number | null = null;
  if (Number.isFinite(sol) && sol > 0 && Number.isFinite(tokens) && tokens > 0) {
    priceUsd = (sol / tokens) * solUsd;
  } else if (Number.isFinite(mcapSol) && mcapSol > 0) {
    priceUsd = (mcapSol / PUMP_SUPPLY) * solUsd;
  }
  if (priceUsd == null || !Number.isFinite(priceUsd) || priceUsd <= 0) return null;

  let marketCapUsd: number | null = null;
  if (Number.isFinite(mcapSol) && mcapSol > 0) {
    marketCapUsd = mcapSol * solUsd;
  } else {
    marketCapUsd = priceUsd * PUMP_SUPPLY;
  }

  return { priceUsd, marketCapUsd };
}

/** @deprecated use quoteFromTrade */
export function priceUsdFromTrade(
  trade: PumpPortalTrade,
  solUsd: number,
): number | null {
  return quoteFromTrade(trade, solUsd)?.priceUsd ?? null;
}

/** Live SOL/USD via CoinGecko (no key). */
export async function fetchSolUsd(): Promise<number | null> {
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd',
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { solana?: { usd?: number } };
    const p = Number(data.solana?.usd);
    return Number.isFinite(p) && p > 0 ? p : null;
  } catch {
    return null;
  }
}

/** Token quote via DexScreener (works for pump + graduated pools). */
export async function fetchDexScreenerQuote(mint: string): Promise<TokenQuote | null> {
  if (!mint) return null;
  try {
    const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      pairs?: Array<{
        priceUsd?: string;
        fdv?: number;
        marketCap?: number;
        liquidity?: { usd?: number };
      }>;
    };
    const pairs = data.pairs ?? [];
    if (pairs.length === 0) return null;
    // Prefer the deepest USD liquidity pair.
    const best = [...pairs].sort(
      (a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0),
    )[0];
    const priceUsd = Number(best?.priceUsd);
    if (!Number.isFinite(priceUsd) || priceUsd <= 0) return null;

    const mcap = Number(best?.marketCap ?? best?.fdv);
    const marketCapUsd =
      Number.isFinite(mcap) && mcap > 0 ? mcap : priceUsd * PUMP_SUPPLY;

    return { priceUsd, marketCapUsd };
  } catch {
    return null;
  }
}

/** @deprecated use fetchDexScreenerQuote */
export async function fetchDexScreenerPrice(mint: string): Promise<number | null> {
  return (await fetchDexScreenerQuote(mint))?.priceUsd ?? null;
}

function jupBase(): string {
  return typeof window !== 'undefined' ? '/proxy/jup' : 'https://lite-api.jup.ag';
}

function geckoBase(): string {
  return typeof window !== 'undefined' ? '/proxy/gecko' : 'https://api.geckoterminal.com';
}

/** Token holder count — Population mirrors on-chain holders (Jupiter + Gecko). */
export async function fetchHolderCount(mint: string): Promise<number | null> {
  if (!mint) return null;
  const results = await Promise.all([
    fetchJupiterHolderCount(mint),
    fetchGeckoHolderCount(mint),
  ]);
  // Prefer the freshest non-null count; when both exist, take the higher
  // (indexers sometimes lag / exclude dust wallets differently).
  const nums = results.filter((n): n is number => n != null && n > 0);
  if (nums.length === 0) return results.find((n) => n != null) ?? null;
  return Math.max(...nums);
}

async function fetchJupiterHolderCount(mint: string): Promise<number | null> {
  try {
    const res = await fetch(
      `${jupBase()}/tokens/v2/search?query=${encodeURIComponent(mint)}`,
    );
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{ id?: string; holderCount?: number }>;
    if (!Array.isArray(data) || data.length === 0) return null;
    const match =
      data.find((t) => t.id === mint) ??
      data.find((t) => t.id?.toLowerCase() === mint.toLowerCase()) ??
      data[0];
    // Reject wrong-token matches from fuzzy search.
    if (match?.id && match.id !== mint && match.id.toLowerCase() !== mint.toLowerCase()) {
      return null;
    }
    const n = Number(match?.holderCount);
    return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
  } catch {
    return null;
  }
}

async function fetchGeckoHolderCount(mint: string): Promise<number | null> {
  try {
    const res = await fetch(
      `${geckoBase()}/api/v2/networks/solana/tokens/${encodeURIComponent(mint)}/info`,
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      data?: { attributes?: { holders?: { count?: number } } };
    };
    const n = Number(data.data?.attributes?.holders?.count);
    return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
  } catch {
    return null;
  }
}
