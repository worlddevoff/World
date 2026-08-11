import React from 'react'
import { useExperiment } from '../contexts/ExperimentContext'
import { PERSONALITY_COLOR } from '../data/seed'
import { TOKEN_TICKER, X_URL, X_HANDLE_AT } from '../config/brand'
import { pumpFunCoinUrl } from '../config/pump'
import { formatNumber } from '../utils/experimentFormat'

export function SiteHeader() {
  const { status, personality, pump } = useExperiment()
  const color = PERSONALITY_COLOR[personality]
  const hasMint = Boolean(pump.mint?.trim())
  const buyUrl = pumpFunCoinUrl(pump.mint)
  const holders =
    pump.holderCount != null && pump.holderCount >= 0
      ? formatNumber(pump.holderCount)
      : '—'

  return (
    <header className="fixed top-0 inset-x-0 z-40">
      <div className="exp-glass border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className="w-2 h-2 rounded-full animate-pulse transition-colors duration-1000 shrink-0"
              style={{ background: color, boxShadow: `0 0 8px ${color}` }}
            />
            <span className="font-display font-semibold tracking-[0.25em] text-slate-100 text-sm truncate">
              THE EXPERIMENT
            </span>
            <span className="hidden sm:inline font-mono text-[10px] text-slate-600 tracking-widest">
              {TOKEN_TICKER}
            </span>
          </div>
          <div className="flex items-center gap-3 sm:gap-4 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500 shrink-0">
            <span className="hidden md:inline">status:</span>
            <span
              style={{
                color:
                  status === 'UNSTABLE'
                    ? '#f43f5e'
                    : status === 'EVOLVING'
                      ? '#a78bfa'
                      : '#34d399',
              }}
            >
              {status}
            </span>
            <span
              className="hidden sm:inline text-neural tabular-nums"
              title="On-chain token holders (via pump feed)"
            >
              holders {holders}
            </span>
            <a
              href={X_URL}
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline hover:text-slate-300 transition-colors"
            >
              {X_HANDLE_AT}
            </a>
            {hasMint ? (
              <a
                href={buyUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-md border border-signal-teach/30 bg-signal-teach/10 px-2.5 py-1 text-signal-teach hover:bg-signal-teach/20 transition-colors"
              >
                Buy {TOKEN_TICKER}
              </a>
            ) : (
              <span
                className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-slate-500"
                title="Mint CA pending launch — set VITE_TOKEN_MINT / TOKEN_MINT on Vercel"
              >
                {TOKEN_TICKER} soon
              </span>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
