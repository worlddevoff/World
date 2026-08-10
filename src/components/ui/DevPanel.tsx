import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorld } from '../../contexts/WorldContext';
import { shortMint } from '../../config/pump';
import { TerminalIcon, XIcon, ChevronDownIcon, RadioIcon } from 'lucide-react';
import type { DisasterKind } from '../../types/world';

const BUYS = [10, 40, 100, 250, 1000, 2500];
const SELLS = [10, 40, 100, 250, 1000, 2500];
const DISASTERS: { d: DisasterKind; label: string; emoji: string }[] = [
  { d: 'EARTHQUAKE', label: 'Earthquake', emoji: '🌍' },
  { d: 'METEOR', label: 'Meteor', emoji: '☄️' },
  { d: 'FLOOD', label: 'Flood', emoji: '🌊' },
  { d: 'FIRE', label: 'Fire', emoji: '🔥' },
];

function statusLabel(status: string): string {
  switch (status) {
    case 'live':
      return 'Live on PumpPortal';
    case 'connecting':
      return 'Connecting…';
    case 'error':
      return 'Connection error';
    case 'no-mint':
      return 'Waiting for token mint';
    default:
      return 'Idle';
  }
}

export function DevPanel() {
  const {
    triggerBuy,
    triggerSell,
    triggerDisaster,
    triggerCityExpansion,
    pump,
  } = useWorld();

  const [open, setOpen] = useState(true);
  const [mintDraft, setMintDraft] = useState(pump.mint);

  useEffect(() => {
    setMintDraft(pump.mint);
  }, [pump.mint]);

  const applyMint = () => {
    pump.setMint(mintDraft);
  };

  return (
    <div className="pointer-events-auto fixed bottom-4 right-4 z-40 w-72">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            className="mb-2 overflow-hidden rounded-2xl border border-slate-700 bg-slate-900/95 p-3 text-white shadow-2xl backdrop-blur"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-emerald-400">
                <TerminalIcon size={13} /> Dev Control Panel
              </span>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white">
                <XIcon size={15} />
              </button>
            </div>

            <div className="mb-3 rounded-xl border border-slate-700 bg-slate-950/70 p-2.5">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-sky-400">
                  <RadioIcon size={12} /> Pump.fun feed
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
                  {statusLabel(pump.status)}
                </span>
              </div>
              <p className="mb-1.5 text-[10px] leading-snug text-slate-400">
                Paste the pump.fun CA, then wait for real buys — houses only appear when trades hit.
                {!pump.hasApiKey && (
                  <>
                    {' '}
                    <span className="text-amber-300">
                      PumpPortal key missing from environment.
                    </span>
                  </>
                )}
                {pump.hasApiKey && (
                  <> Key configured — wallet must hold ≥0.02 SOL.</>
                )}
                {pump.mint ? ` Watching ${shortMint(pump.mint)}.` : ''}
                {pump.tradeCount > 0
                  ? ` ${pump.tradeCount} trades applied.`
                  : pump.status === 'live'
                    ? ' No trades yet — quiet mint or still waiting.'
                    : ''}
              </p>
              <input
                value={mintDraft}
                onChange={(e) => setMintDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') applyMint();
                }}
                placeholder="Token mint address"
                spellCheck={false}
                className="mb-1.5 w-full rounded-lg border border-slate-600 bg-slate-900 px-2 py-1.5 font-mono text-[11px] text-white placeholder:text-slate-500 focus:border-sky-500 focus:outline-none"
              />
              <div className="flex gap-1.5">
                <button
                  onClick={applyMint}
                  className="flex-1 rounded-lg bg-sky-600 py-1.5 text-[11px] font-bold transition hover:bg-sky-500 active:scale-95"
                >
                  Connect
                </button>
                <button
                  onClick={() => {
                    setMintDraft('');
                    pump.clearMint();
                  }}
                  className="rounded-lg bg-slate-700 px-2.5 py-1.5 text-[11px] font-semibold transition hover:bg-slate-600 active:scale-95"
                >
                  Clear
                </button>
              </div>
              {pump.detail && (
                <p className="mt-1.5 text-[10px] text-slate-500">{pump.detail}</p>
              )}
            </div>

            <p className="mb-1.5 text-[10px] font-bold uppercase text-emerald-500">Buy · Build</p>
            <div className="mb-2 grid grid-cols-2 gap-1.5">
              {BUYS.map((amt) => (
                <button
                  key={amt}
                  onClick={() => triggerBuy(amt)}
                  className="rounded-lg bg-emerald-600 py-1.5 text-xs font-bold transition hover:bg-emerald-500 active:scale-95"
                >
                  + ${amt.toLocaleString()}
                </button>
              ))}
            </div>

            <p className="mb-1.5 text-[10px] font-bold uppercase text-rose-500">Sell · Destroy</p>
            <div className="mb-2 grid grid-cols-2 gap-1.5">
              {SELLS.map((amt) => (
                <button
                  key={amt}
                  onClick={() => triggerSell(amt)}
                  className="rounded-lg bg-rose-600 py-1.5 text-xs font-bold transition hover:bg-rose-500 active:scale-95"
                >
                  − ${amt.toLocaleString()}
                </button>
              ))}
            </div>

            <p className="mb-1.5 text-[10px] font-bold uppercase text-amber-500">World Events</p>
            <div className="grid grid-cols-2 gap-1.5">
              {DISASTERS.map((d) => (
                <button
                  key={d.d}
                  onClick={() => triggerDisaster(d.d)}
                  className="rounded-lg bg-slate-700 py-1.5 text-xs font-semibold transition hover:bg-slate-600 active:scale-95"
                >
                  {d.emoji} {d.label}
                </button>
              ))}
              <button
                onClick={triggerCityExpansion}
                className="col-span-2 rounded-lg bg-indigo-600 py-1.5 text-xs font-bold transition hover:bg-indigo-500 active:scale-95"
              >
                🏙️ City Expansion
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setOpen((o) => !o)}
        className="ml-auto flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-bold text-white shadow-lg transition hover:bg-slate-800"
      >
        <TerminalIcon size={13} className="text-emerald-400" />
        {open ? 'Hide' : 'Dev Panel'}
        <ChevronDownIcon size={13} className={`transition ${open ? '' : 'rotate-180'}`} />
      </button>
    </div>
  );
}
