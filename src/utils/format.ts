// Formatting helpers shared across the UI.

export function formatCurrency(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 10_000) return `$${(n / 1000).toFixed(1)}k`;
  if (n >= 1000) return `$${(n / 1000).toFixed(2)}k`;
  return `$${Math.round(n).toLocaleString()}`;
}

export function formatNumber(n: number): string {
  return Math.round(n).toLocaleString();
}

export function formatAge(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function shortWallet(w: string): string {
  if (!w) return '—';
  // Solana base58 addresses are ~32–44 chars
  if (w.length >= 32) return `${w.slice(0, 4)}…${w.slice(-4)}`;
  if (w.length <= 8) return w;
  return `${w.slice(0, 3)}…${w.slice(-3)}`;
}

let idCounter = 0;
export function uid(prefix = 'id'): string {
  idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${idCounter}`;
}

export function randomWallet(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ123456789';
  let s = '';
  for (let i = 0; i < 6; i++)
    s += chars[Math.floor(Math.random() * chars.length)];
  return `${s.slice(0, 3)}${s.slice(3)}`;
}
