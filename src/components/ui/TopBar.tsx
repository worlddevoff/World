import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useWorld } from '../../contexts/WorldContext';
import { formatCurrency, formatNumber, formatAge } from '../../utils/format';
import { formatTokenPrice } from '../../lib/tokenPrice';
import { TOKEN_TICKER, X_HANDLE_AT, X_URL } from '../../config/brand';
import {
  UsersIcon,
  Building2Icon,
  ClockIcon,
  CoinsIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  Volume2Icon,
  VolumeXIcon,
  RadioIcon,
} from 'lucide-react';
import { worldSound } from '../../utils/sound';

function XIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.727-8.835L1.254 2.25H8.08l4.259 5.686L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
    </svg>
  );
}

/** How fresh the last trade is — used for the price-pill “live” pulse. */
const TRADE_FRESH_MS = 60_000;

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="text-white/60">{icon}</div>
      <div className="leading-tight">
        <div className="text-[10px] font-medium uppercase tracking-wide text-white/50">{label}</div>
        <motion.div
          key={value}
          initial={{ scale: 1.15, color: '#a7f3d0' }}
          animate={{ scale: 1, color: '#ffffff' }}
          className="text-sm font-bold text-white"
        >
          {value}
        </motion.div>
      </div>
    </div>
  );
}

function FeedPill({
  status,
  mint,
  tradeCount,
  hasApiKey,
  detail,
}: {
  status: string;
  mint: string;
  tradeCount: number;
  hasApiKey: boolean;
  detail?: string;
}) {
  const label =
    status === 'live'
      ? tradeCount > 0
        ? 'Live'
        : 'Waiting'
      : status === 'connecting'
        ? 'Connecting'
        : status === 'error'
          ? hasApiKey
            ? 'Feed error'
            : 'Need API key'
          : status === 'no-mint'
            ? 'Set mint'
            : 'Idle';
  const color =
    status === 'live' && tradeCount > 0
      ? 'bg-emerald-400'
      : status === 'live'
        ? 'bg-amber-400'
        : status === 'connecting'
          ? 'bg-amber-400'
          : status === 'error'
            ? 'bg-rose-400'
            : 'bg-slate-400';
  const title =
    detail ||
    (mint ? `PumpPortal · ${mint}` : 'Paste token mint in Dev Panel to go live');
  return (
    <div
      className="flex items-center gap-1.5 rounded-full border border-white/10 bg-black/25 px-2.5 py-1 text-[11px] font-bold text-white/90"
      title={title}
    >
      <span className="relative flex h-2 w-2">
        {status === 'live' && tradeCount > 0 && (
          <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${color} opacity-75`} />
        )}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${color}`} />
      </span>
      Pump {label}
    </div>
  );
}

export function TopBar() {
  const { stats, era, pump, muted, setMuted, spectatorMode, setSpectatorMode } = useWorld();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  const priceLabel = formatTokenPrice(pump.priceUsd);
  const hasPrice = pump.priceUsd != null && pump.priceUsd > 0;
  const up = pump.priceUp;
  // Only show direction after a real move — first DexScreener snapshot defaults "up" and looks fake.
  const showTrend = hasPrice && pump.lastTradeAt != null;
  const tradeFresh =
    pump.lastTradeAt != null && now - pump.lastTradeAt < TRADE_FRESH_MS;
  const priceLive = pump.status === 'live' && tradeFresh;
  const priceDot =
    priceLive
      ? up
        ? 'bg-emerald-500'
        : 'bg-rose-500'
      : hasPrice
        ? 'bg-amber-400'
        : 'bg-slate-500';
  const priceTitle = !pump.mint
    ? 'Set token mint to load live price'
    : !hasPrice
      ? 'Waiting for first DexScreener quote…'
      : priceLive
        ? `Live from trades · ${pump.mint}`
        : `Spot from DexScreener · ${pump.mint} (not a live trade)`;

  const toggleMute = () => {
    worldSound.unlock();
    setMuted(!muted);
  };
  const toggleSpectator = () => {
    worldSound.unlock();
    setSpectatorMode(!spectatorMode);
  };

  return (
    <header className="z-30 flex items-center justify-between gap-4 border-b border-white/10 bg-[#12351f] px-4 py-2.5 shadow-lg">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🌎</span>
          <span className="text-xl font-black tracking-tight text-white" style={{ fontFamily: 'Fredoka, sans-serif' }}>
            {TOKEN_TICKER}
          </span>
          <a
            href={X_URL}
            target="_blank"
            rel="noopener noreferrer"
            title={`Connect on X · ${X_HANDLE_AT}`}
            className="ml-0.5 flex items-center gap-1.5 rounded-full border border-white/15 bg-black/25 px-2.5 py-1 text-[11px] font-bold text-white/90 transition hover:border-sky-300/40 hover:bg-sky-500/20 hover:text-white"
          >
            <XIcon size={12} />
            <span className="hidden sm:inline">Connect</span>
            <span className="font-semibold text-sky-200">{X_HANDLE_AT}</span>
          </a>
          <motion.span
            key={era.name}
            initial={{ scale: 1.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="ml-1 flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[11px] font-bold text-emerald-200 ring-1 ring-emerald-400/40"
            title="The world advances through ages as it grows"
          >
            {era.emoji} {era.name}
          </motion.span>
        </div>
        <div className="hidden items-center gap-6 md:flex">
          <Stat
            icon={<UsersIcon size={18} />}
            label="Holders"
            value={
              pump.holderCount != null
                ? formatNumber(pump.holderCount)
                : stats.population > 0
                  ? formatNumber(stats.population)
                  : '—'
            }
          />
          <Stat
            icon={<Building2Icon size={18} />}
            label="Buildings"
            value={formatNumber(stats.buildings)}
          />
          <Stat icon={<ClockIcon size={18} />} label="World Age" value={formatAge(now - stats.createdAt)} />
          <Stat
            icon={<CoinsIcon size={18} />}
            label="World Value"
            value={
              pump.marketCapUsd != null && pump.marketCapUsd > 0
                ? formatCurrency(pump.marketCapUsd)
                : '—'
            }
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={toggleSpectator}
          title={
            spectatorMode
              ? 'Live cam on — camera locks onto each trader'
              : 'Live cam — follow every buy/sell for launch streams'
          }
          className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[11px] font-bold transition ${
            spectatorMode
              ? 'border-rose-400/50 bg-rose-500/25 text-rose-100'
              : 'border-white/10 bg-black/25 text-white/80 hover:bg-black/40'
          }`}
        >
          <RadioIcon size={13} />
          <span className="hidden sm:inline">{spectatorMode ? 'Live cam' : 'Spectate'}</span>
        </button>
        <button
          type="button"
          onClick={toggleMute}
          title={muted ? 'Unmute sound' : 'Mute sound'}
          aria-label={muted ? 'Unmute' : 'Mute'}
          className="flex items-center justify-center rounded-full border border-white/10 bg-black/25 p-1.5 text-white/80 transition hover:bg-black/40"
        >
          {muted ? <VolumeXIcon size={15} /> : <Volume2Icon size={15} />}
        </button>
        <FeedPill
          status={pump.status}
          mint={pump.mint}
          tradeCount={pump.tradeCount}
          hasApiKey={pump.hasApiKey}
          detail={pump.detail}
        />
        <div
          className="flex items-center gap-2 rounded-full border border-white/10 bg-black/25 px-3 py-1.5"
          title={priceTitle}
        >
          <span className="text-xs font-bold text-emerald-300">{TOKEN_TICKER}</span>
          <motion.span
            key={priceLabel}
            initial={{ scale: 1.08, opacity: 0.7 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-sm font-semibold text-white"
          >
            {priceLabel}
          </motion.span>
          {showTrend && (
            <span className={`flex items-center gap-0.5 text-xs font-semibold ${up ? 'text-emerald-400' : 'text-rose-400'}`}>
              {up ? <TrendingUpIcon size={13} /> : <TrendingDownIcon size={13} />}
            </span>
          )}
          <span className="relative flex h-2 w-2" title={priceLive ? 'Trade feed fresh' : hasPrice ? 'Spot quote only' : 'No quote'}>
            {priceLive && (
              <span
                className={`absolute inline-flex h-full w-full animate-ping rounded-full ${up ? 'bg-emerald-400' : 'bg-rose-400'} opacity-75`}
              />
            )}
            <span className={`relative inline-flex h-2 w-2 rounded-full ${priceDot}`} />
          </span>
        </div>
      </div>
    </header>
  );
}
