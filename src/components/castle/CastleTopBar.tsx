import React from 'react';
import { motion } from 'framer-motion';
import {
  UsersIcon,
  LandmarkIcon,
  CoinsIcon,
  Volume2Icon,
  VolumeXIcon,
  ExternalLinkIcon,
  TrendingUpIcon,
  TrendingDownIcon,
} from 'lucide-react';
import { useCastle } from '../../contexts/CastleContext';
import { TOKEN_TICKER, X_HANDLE_AT, X_URL } from '../../config/brand';
import { pumpFunCoinUrl } from '../../config/pump';
import { formatCurrency, formatNumber } from '../../utils/format';
import { formatTokenPrice } from '../../lib/tokenPrice';
import { worldSound } from '../../utils/sound';

function XIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.727-8.835L1.254 2.25H8.08l4.259 5.686L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
    </svg>
  );
}

export function CastleTopBar() {
  const { pump, stages, activeIndex, totalFill, muted, setMuted, holderCount } =
    useCastle();
  const active = stages[activeIndex];
  const priceLabel = formatTokenPrice(pump.priceUsd);
  const hasPrice = pump.priceUsd != null && pump.priceUsd > 0;

  return (
    <header className="z-30 flex items-center justify-between gap-3 border-b border-white/10 bg-[#1c1917] px-4 py-2.5 shadow-lg">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🏰</span>
          <div className="leading-tight">
            <span
              className="block text-lg font-black tracking-tight text-white"
              style={{ fontFamily: 'Fredoka, sans-serif' }}
            >
              {TOKEN_TICKER}
            </span>
            <span className="hidden text-[10px] font-semibold text-amber-200/80 sm:block">
              The Castle
            </span>
          </div>
        </div>

        <a
          href={pumpFunCoinUrl(pump.mint)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 rounded-full border border-emerald-300/40 bg-emerald-500 px-2.5 py-1 text-[11px] font-black text-white shadow-sm transition hover:bg-emerald-400"
        >
          Buy
          <ExternalLinkIcon size={11} />
        </a>
        <a
          href={X_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="hidden items-center gap-1.5 rounded-full border border-white/15 bg-black/25 px-2.5 py-1 text-[11px] font-bold text-white/90 transition hover:bg-sky-500/20 sm:flex"
        >
          <XIcon size={12} />
          <span className="text-sky-200">{X_HANDLE_AT}</span>
        </a>

        {active && (
          <span className="hidden items-center gap-1 rounded-full bg-amber-500/20 px-2.5 py-1 text-[11px] font-bold text-amber-100 ring-1 ring-amber-400/30 md:flex">
            {active.def.emoji} {active.def.name}
          </span>
        )}
      </div>

      <div className="hidden items-center gap-5 md:flex">
        <div className="flex items-center gap-1.5 text-white/90">
          <UsersIcon size={15} className="text-white/50" />
          <div className="leading-tight">
            <div className="text-[9px] uppercase text-white/45">Holders</div>
            <div className="text-sm font-bold">
              {holderCount != null ? formatNumber(holderCount) : '—'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-white/90">
          <LandmarkIcon size={15} className="text-white/50" />
          <div className="leading-tight">
            <div className="text-[9px] uppercase text-white/45">Castle size</div>
            <div className="text-sm font-bold">{totalFill.toFixed(1)}</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-white/90">
          <CoinsIcon size={15} className="text-white/50" />
          <div className="leading-tight">
            <div className="text-[9px] uppercase text-white/45">Market cap</div>
            <div className="text-sm font-bold">
              {pump.marketCapUsd != null && pump.marketCapUsd > 0
                ? formatCurrency(pump.marketCapUsd)
                : '—'}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            worldSound.unlock();
            setMuted(!muted);
          }}
          className="flex items-center justify-center rounded-full border border-white/10 bg-black/25 p-1.5 text-white/80 transition hover:bg-black/40"
          aria-label={muted ? 'Unmute' : 'Mute'}
        >
          {muted ? <VolumeXIcon size={15} /> : <Volume2Icon size={15} />}
        </button>
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/25 px-3 py-1.5">
          <span className="text-xs font-bold text-amber-200">{TOKEN_TICKER}</span>
          <motion.span
            key={priceLabel}
            initial={{ scale: 1.08, opacity: 0.7 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-sm font-semibold text-white"
          >
            {priceLabel}
          </motion.span>
          {hasPrice && pump.lastTradeAt != null && (
            <span
              className={`flex items-center ${pump.priceUp ? 'text-emerald-400' : 'text-rose-400'}`}
            >
              {pump.priceUp ? (
                <TrendingUpIcon size={13} />
              ) : (
                <TrendingDownIcon size={13} />
              )}
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
