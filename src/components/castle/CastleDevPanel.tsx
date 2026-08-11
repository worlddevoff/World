import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { TerminalIcon, XIcon, ChevronUpIcon, RadioIcon } from 'lucide-react';
import { useCastle } from '../../contexts/CastleContext';
import { CORE_STAGES } from '../../data/castleStages';
import { formatCurrency, shortWallet } from '../../utils/format';
import { shortMint } from '../../config/pump';
import { worldSound } from '../../utils/sound';

const BUYS = [10, 40, 100, 250, 1000, 2500];
const SELLS = [40, 100, 250, 1000];
/** Scrub past the saga into endless expansions. */
const MC_MAX = 5_000_000;

export function CastleDevPanel() {
  const {
    triggerBuy,
    triggerSell,
    triggerBuildWave,
    setDevMarketCap,
    clearDevMarketCap,
    devMarketCap,
    marketCapUsd,
    liveMarketCapUsd,
    stages,
    activeIndex,
    pump,
  } = useCastle();

  const [open, setOpen] = useState(true);
  const scrub = Math.round(marketCapUsd ?? 0);
  const active = stages[activeIndex];

  const stageTicks = useMemo(
    () => [
      ...CORE_STAGES.map((s) => ({ id: s.id, emoji: s.emoji, at: s.targetMc })),
      { id: 'mega', emoji: '♾️', at: 2_000_000 },
    ],
    [],
  );

  const ui = (
    <div className="pointer-events-none fixed inset-0 z-[200]">
      {/* Always-visible launcher top-right */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="pointer-events-auto absolute right-3 top-14 z-[210] flex items-center gap-1.5 rounded-full border-2 border-amber-300 bg-amber-400 px-3 py-1.5 text-xs font-black text-stone-950 shadow-lg sm:top-3"
      >
        <TerminalIcon size={13} />
        {open ? 'Hide Dev' : 'Dev Portal'}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ y: 20 }}
            animate={{ y: 0 }}
            exit={{ y: 20 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            className="pointer-events-auto absolute bottom-4 left-3 max-h-[72dvh] w-[min(21rem,calc(100vw-1.5rem))] overflow-y-auto rounded-2xl border-2 border-amber-400 bg-black p-3 text-white shadow-[0_16px_50px_rgba(0,0,0,0.85)] ring-4 ring-amber-400/40"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-amber-300">
                <TerminalIcon size={13} /> Castle Dev Portal
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-stone-400 hover:text-white"
                aria-label="Close"
              >
                <XIcon size={15} />
              </button>
            </div>

            <div className="mb-3 rounded-xl border border-stone-700 bg-stone-900 p-2.5">
              <div className="mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-sky-400">
                  <RadioIcon size={12} /> Feed
                </span>
                <span
                  className={`text-[10px] font-bold ${
                    pump.status === 'live'
                      ? 'text-emerald-400'
                      : pump.status === 'error'
                        ? 'text-rose-400'
                        : 'text-amber-300'
                  }`}
                >
                  {pump.status}
                  {pump.mint ? ` · ${shortMint(pump.mint)}` : ''}
                </span>
              </div>
              <p className="text-[10px] leading-snug text-stone-400">
                Sim buys add stones + nudge MC. Scrub market cap to preview every
                stage. {devMarketCap != null ? 'Dev MC override ON.' : 'Using live MC.'}
              </p>
            </div>

            <div className="mb-3">
              <div className="mb-1 flex items-center justify-between text-[10px] font-bold uppercase text-stone-400">
                <span>Market cap scrub</span>
                <span className="font-mono normal-case text-amber-200">
                  {formatCurrency(scrub)}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={MC_MAX}
                step={500}
                value={scrub}
                onChange={(e) => {
                  worldSound.unlock();
                  setDevMarketCap(Number(e.target.value));
                }}
                className="w-full accent-amber-400"
              />
              <div className="mt-1 flex flex-wrap gap-1">
                {stageTicks.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    title={`${t.emoji} @ ${formatCurrency(t.at)}`}
                    onClick={() => {
                      worldSound.unlock();
                      setDevMarketCap(t.at);
                    }}
                    className="rounded-md bg-stone-800 px-1.5 py-0.5 text-[11px] transition hover:bg-stone-700"
                  >
                    {t.emoji}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => clearDevMarketCap()}
                  className="rounded-md bg-stone-800 px-1.5 py-0.5 text-[10px] font-bold text-stone-300 transition hover:bg-stone-700"
                >
                  Live MC
                </button>
              </div>
              <p className="mt-1.5 text-[10px] text-stone-500">
                Now: {active?.def.emoji} {active?.def.name} · live feed{' '}
                {liveMarketCapUsd != null
                  ? formatCurrency(liveMarketCapUsd)
                  : '—'}
              </p>
            </div>

            <p className="mb-1 text-[10px] font-bold uppercase text-stone-400">
              Simulate buy
            </p>
            <div className="mb-2 flex flex-wrap gap-1">
              {BUYS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => {
                    worldSound.unlock();
                    triggerBuy(n, false);
                  }}
                  className="rounded-lg bg-emerald-600 px-2 py-1 text-[11px] font-bold transition hover:bg-emerald-500"
                >
                  +${n}
                </button>
              ))}
            </div>

            <p className="mb-1 text-[10px] font-bold uppercase text-stone-400">
              Simulate sell
            </p>
            <div className="mb-2 flex flex-wrap gap-1">
              {SELLS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => {
                    worldSound.unlock();
                    triggerSell(n);
                  }}
                  className="rounded-lg bg-rose-700 px-2 py-1 text-[11px] font-bold transition hover:bg-rose-600"
                >
                  −${n}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                worldSound.unlock();
                triggerBuildWave();
              }}
              className="mb-1 w-full rounded-xl bg-amber-500 py-2 text-xs font-black text-stone-950 transition hover:bg-amber-400"
            >
              🧱 Build wave (8 buys)
            </button>
            <button
              type="button"
              onClick={() => {
                worldSound.unlock();
                triggerBuy(100, true);
              }}
              className="flex w-full items-center justify-center gap-1 rounded-xl border border-stone-600 bg-stone-900 py-1.5 text-[11px] font-bold text-stone-200 transition hover:bg-stone-800"
            >
              <ChevronUpIcon size={12} />
              Buy as {shortWallet('DevBuilder1111111111111111111111111')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(ui, document.body);
}
