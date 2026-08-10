// Pump.fun / PumpPortal launch config.
// Set VITE_TOKEN_MINT before deploy, or paste the CA in the Dev Panel on launch day.
// Token-trade streams require a PumpPortal API key (funded wallet ≥ 0.02 SOL).

const STORAGE_KEY = 'world.tokenMint';

const PUMP_PORTAL_WS_BASE = 'wss://pumpportal.fun/api/data';

/** Fallback SOL/USD used to size world events from trade size. */
export const DEFAULT_SOL_USD = Number(import.meta.env.VITE_SOL_USD) || 150;

/** PumpPortal data API key — required for subscribeTokenTrade. Never log this. */
export function envPumpPortalApiKey(): string {
  return (import.meta.env.VITE_PUMPPORTAL_API_KEY as string | undefined)?.trim() ?? '';
}

/** True when a key is configured (does not expose the value). */
export function hasPumpPortalApiKey(): boolean {
  return envPumpPortalApiKey().length > 0;
}

/** WebSocket URL including API key when present. Do not log the return value. */
export function pumpPortalWsUrl(apiKey = envPumpPortalApiKey()): string {
  if (!apiKey) return PUMP_PORTAL_WS_BASE;
  return `${PUMP_PORTAL_WS_BASE}?api-key=${encodeURIComponent(apiKey)}`;
}

/** Strip secrets from any status / error string before UI or logs. */
export function redactSecrets(text: string): string {
  return text
    .replace(/api-key=[^&\s"']+/gi, 'api-key=***')
    .replace(/VITE_PUMPPORTAL_API_KEY=\S+/gi, 'VITE_PUMPPORTAL_API_KEY=***')
    .replace(/\b[a-z0-9]{80,}\b/gi, '[redacted]');
}

/** @deprecated use pumpPortalWsUrl() — kept so older imports don't break */
export const PUMP_PORTAL_WS = pumpPortalWsUrl();

export function envTokenMint(): string {
  return (import.meta.env.VITE_TOKEN_MINT as string | undefined)?.trim() ?? '';
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

export function shortMint(mint: string): string {
  if (mint.length <= 10) return mint || '—';
  return `${mint.slice(0, 4)}…${mint.slice(-4)}`;
}
