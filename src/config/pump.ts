// Pump.fun / PumpPortal launch config.
// Set VITE_TOKEN_MINT before deploy, or paste the CA in the Dev Panel on launch day.
// Live token-trade ingest uses server-only PUMPPORTAL_API_KEY (never VITE_).

const STORAGE_KEY = 'world.tokenMint';

/**
 * Fallback mint when env / localStorage unset.
 * Empty until $Experiment launches — set VITE_TOKEN_MINT / TOKEN_MINT on Vercel.
 */
export const DEFAULT_TOKEN_MINT = '';

/** Fallback SOL/USD used to size world events from trade size. */
export const DEFAULT_SOL_USD =
  Number(
    (typeof import.meta !== 'undefined' &&
      import.meta.env &&
      import.meta.env.VITE_SOL_USD) ||
      150,
  ) || 150;

/** Strip secrets from any status / error string before UI or logs. */
export function redactSecrets(text: string): string {
  return text
    .replace(/api-key=[^&\s"']+/gi, 'api-key=***')
    .replace(/VITE_PUMPPORTAL_API_KEY=\S+/gi, 'VITE_PUMPPORTAL_API_KEY=***')
    .replace(/PUMPPORTAL_API_KEY=\S+/gi, 'PUMPPORTAL_API_KEY=***')
    .replace(/\b[a-z0-9]{80,}\b/gi, '[redacted]');
}

export function envTokenMint(): string {
  const fromEnv =
    typeof import.meta !== 'undefined' && import.meta.env
      ? (import.meta.env.VITE_TOKEN_MINT as string | undefined)?.trim()
      : '';
  return fromEnv || DEFAULT_TOKEN_MINT;
}

export function getStoredMint(): string {
  try {
    return localStorage.getItem(STORAGE_KEY)?.trim() ?? '';
  } catch {
    return '';
  }
}

export function setStoredMint(mint: string): void {
  const clean = mint.trim();
  try {
    if (clean) localStorage.setItem(STORAGE_KEY, clean);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore quota / private mode */
  }
}

/** Active mint: runtime override wins, then env. */
export function resolveTokenMint(override?: string | null): string {
  const fromOverride = override?.trim();
  if (fromOverride) return fromOverride;
  return getStoredMint() || envTokenMint();
}

/** pump.fun coin page for a mint (Buy CTA). Board home if mint not set yet. */
export function pumpFunCoinUrl(mint?: string): string {
  const m = (mint ?? resolveTokenMint()).trim() || DEFAULT_TOKEN_MINT;
  if (!m) return 'https://pump.fun';
  return `https://pump.fun/coin/${encodeURIComponent(m)}`;
}

export function shortMint(mint: string): string {
  if (mint.length <= 10) return mint || '—';
  return `${mint.slice(0, 4)}…${mint.slice(-4)}`;
}
