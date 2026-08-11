import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { TerminalIcon, XIcon, RadioIcon } from 'lucide-react';
import { usePond } from '../../contexts/PondContext';
import { formatCurrency, shortWallet } from '../../utils/format';
import { shortMint } from '../../config/pump';
import { worldSound } from '../../utils/sound';

const BUYS = [10, 40, 100, 250, 1000, 2500];
const SELLS = [40, 100, 250, 1000, 2500];

export function PondDevPanel() {
  const {
    triggerBuy,
    triggerSell,
    triggerSchool,
    fish,
    pump,
    marketCapUsd,
  } = usePond();
  const [open, setOpen] = useState(true);

  const ui = (
    <div className="pointer-events-none fixed inset-0 z-[200]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="pointer-events-auto absolute right-3 top-14 z-[210] flex items-center gap-1.5 rounded-full border-2 border-sky-300 bg-sky-400 px-3 py-1.5 text-xs font-black text-slate-950 shadow-lg sm:top-3"
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
            className="pointer-events-auto absolute bottom-4 left-3 max-h-[72dvh] w-[min(21rem,calc(100vw-1.5rem))] overflow-y-auto rounded-2xl border-2 border-sky-400 bg-black p-3 text-white shadow-[0_16px_50px_rgba(0,0,0,0.85)] ring-4 ring-sky-400/30"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-sky-300">
                <TerminalIcon size={13} /> Pond Dev Portal
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
                <span className="text-[10px] font-bold text-stone-300">
                  {pump.status}
                  {pump.mint ? ` · ${shortMint(pump.mint)}` : ''}
                </span>
              </div>
              <p className="text-[10px] leading-snug text-stone-400">
                {fish.length} fish swimming
                {marketCapUsd != null ? ` · MC ${formatCurrency(marketCapUsd)}` : ''}.
                Buys spawn fish; sells cast the hook.
              </p>
            </div>

            <p className="mb-1 text-[10px] font-bold uppercase text-stone-400">
              Simulate buy → fish
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
                  className="rounded-lg bg-sky-600 px-2 py-1 text-[11px] font-bold transition hover:bg-sky-500"
                >
                  +${n}
                </button>
              ))}
            </div>

            <p className="mb-1 text-[10px] font-bold uppercase text-stone-400">
              Simulate sell → hook
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
                  🎣 ${n}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                worldSound.unlock();
                triggerSchool();
              }}
              className="mb-1 w-full rounded-xl bg-sky-400 py-2 text-xs font-black text-slate-950 transition hover:bg-sky-300"
            >
              🐠 Stock the pond (10 buys)
            </button>
            <button
              type="button"
              onClick={() => {
                worldSound.unlock();
                triggerBuy(1000, true);
              }}
              className="w-full rounded-xl border border-stone-600 bg-stone-900 py-1.5 text-[11px] font-bold text-stone-200 transition hover:bg-stone-800"
            >
              Big fish as {shortWallet('DevAngler11111111111111111111111111')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(ui, document.body);
}
