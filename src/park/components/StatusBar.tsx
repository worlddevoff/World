import React from 'react';
import { useGame } from '../store/gameStore';
import { TOKEN_TICKER, X_URL, TG_URL } from '../../config/brand';
import { pumpFunCoinUrl } from '../../config/pump';
import { formatTokenPrice } from '../../lib/tokenPrice';

/** Bottom bar — every metric is live token / market telemetry. */
export function StatusBar() {
  const s = useGame();
  const ratingLabel =
    s.parkRating > 700 ? 'Excellent' : s.parkRating > 550 ? 'Good' : s.parkRating > 400 ? 'Fair' : 'Poor';
  const buyUrl = pumpFunCoinUrl();
  const net = s.marketBuyUsd - s.marketSellUsd;

  return (
    <div className="bg-[#11151f]/95 border-t border-white/10 text-chrome-text flex items-center gap-2 px-3 h-14 shrink-0 z-30 backdrop-blur overflow-x-auto">
      <Cell
        label="RATING"
        value={`${s.parkRating} · ${ratingLabel}`}
        color={s.parkRating > 550 ? '#37d67a' : '#ff5c6c'}
      />
      <Cell
        label="PRICE"
        value={formatTokenPrice(s.marketPriceUsd > 0 ? s.marketPriceUsd : null)}
        color={s.marketPriceUsd > 0 ? '#e8edf6' : undefined}
      />
      <Cell
        label="HOLDERS"
        value={s.marketHolders > 0 ? s.marketHolders.toLocaleString() : '—'}
        color="#5b8cff"
      />
      <Cell
        label="BUYS"
        value={`${fmtMoney(s.marketBuyUsd)}${s.marketBuyCount ? ` · ${s.marketBuyCount}` : ''}`}
        color="#37d67a"
      />
      <Cell
        label="SELLS"
        value={`${fmtMoney(s.marketSellUsd)}${s.marketSellCount ? ` · ${s.marketSellCount}` : ''}`}
        color="#ff5c6c"
      />
      <Cell label="NET" value={fmtMoney(net)} color={net >= 0 ? '#37d67a' : '#ff5c6c'} />
      <Cell label="MCAP" value={s.marketCapUsd > 0 ? fmtMoney(s.marketCapUsd) : '—'} />
      <Cell
        label="VOL 24H"
        value={s.marketVolume24hUsd > 0 ? fmtMoney(s.marketVolume24hUsd) : '—'}
      />
      <div className="flex items-center gap-1.5 shrink-0 ml-1">
        <a
          href={buyUrl}
          target="_blank"
          rel="noreferrer"
          className="rounded-lg border border-rct-money/40 bg-rct-money/10 px-2.5 py-1.5 text-xs font-semibold text-rct-money hover:bg-rct-money/20"
        >
          Buy {TOKEN_TICKER}
        </a>
        <a
          href={X_URL}
          target="_blank"
          rel="noreferrer"
          className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1.5 text-xs text-chrome-dark hover:text-chrome-text"
        >
          X
        </a>
        <a
          href={TG_URL}
          target="_blank"
          rel="noreferrer"
          className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1.5 text-xs text-chrome-dark hover:text-chrome-text"
        >
          TG
        </a>
      </div>
      <SpeedControl />
    </div>
  );
}

function Cell({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="px-3 py-1.5 flex flex-col justify-center rounded-lg bg-white/[0.04] border border-white/5 shrink-0">
      <span className="text-[10px] leading-none font-medium tracking-wider text-chrome-dark uppercase">
        {label}
      </span>
      <span className="leading-none font-semibold truncate text-sm mt-1" style={{ color }}>
        {value}
      </span>
    </div>
  );
}

function SpeedControl() {
  const speed = useGame((s) => s.speed);
  const setSpeed = useGame((s) => s.setSpeed);
  const opts: { v: 0 | 1 | 2 | 3; label: string }[] = [
    { v: 0, label: '❚❚' },
    { v: 1, label: '▶' },
    { v: 2, label: '▶▶' },
    { v: 3, label: '▶▶▶' },
  ];
  return (
    <div className="ml-auto flex items-center gap-1 px-1 shrink-0">
      <span className="text-[10px] font-medium tracking-wider text-chrome-dark mr-1 uppercase">
        Speed
      </span>
      <div className="flex items-center gap-1 p-1 rounded-lg bg-white/[0.04] border border-white/5">
        {opts.map((o) => (
          <button
            key={o.v}
            onClick={() => setSpeed(o.v)}
            className={`px-2 py-1 rounded-md text-xs leading-none transition-colors ${
              speed === o.v
                ? 'bg-accent text-white shadow-[0_0_12px_rgba(91,140,255,0.5)]'
                : 'text-chrome-dark hover:bg-white/10'
            }`}
            title={o.v === 0 ? 'Pause' : `${o.v}x speed`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function fmtMoney(n: number): string {
  const neg = n < 0;
  const v = Math.abs(Math.round(n));
  if (v >= 1_000_000) return `${neg ? '-' : ''}$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 10_000) return `${neg ? '-' : ''}$${(v / 1_000).toFixed(1)}K`;
  return `${neg ? '-' : ''}$${v.toLocaleString()}`;
}
