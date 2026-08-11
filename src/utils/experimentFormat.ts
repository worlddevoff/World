export function formatNumber(n: number): string {
  return Math.round(n).toLocaleString('en-US')
}

export function formatUsd(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`
  return `$${n}`
}

export function randomId(): string {
  return Math.random().toString(36).slice(2, 10)
}

export function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}
