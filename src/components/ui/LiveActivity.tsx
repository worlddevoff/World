import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorld } from '../../contexts/WorldContext';
import { formatCurrency, shortWallet } from '../../utils/format';
import type { WorldEvent } from '../../types/world';
import { RadioIcon, MapPinIcon } from 'lucide-react';

function isBuy(e: WorldEvent) {
  return e.type === 'BUILD';
}

function EventRow({ e, onFly }: { e: WorldEvent; onFly: (e: WorldEvent) => void }) {
  const buy = isBuy(e);
  return (
    <motion.li
      layout
      initial={{ opacity: 0, x: 30, height: 0 }}
      animate={{ opacity: 1, x: 0, height: 'auto' }}
      exit={{ opacity: 0 }}
      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
    >
      <button
        onClick={() => onFly(e)}
        className="group w-full border-b border-slate-100 px-3 py-2.5 text-left transition hover:bg-sky-50"
        title="Fly to this spot on the map"
      >
        <div className="flex items-center justify-between">
          <span className={`flex items-center gap-1.5 text-sm font-bold ${buy ? 'text-emerald-600' : 'text-rose-600'}`}>
            <span className={`h-2 w-2 rounded-full ${buy ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            {formatCurrency(e.source.amount)} {buy ? 'BUY' : 'SELL'}
          </span>
          <span className="text-[10px] text-slate-400">{shortWallet(e.source.wallet)}</span>
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-700">
          <span>{e.emoji}</span>
          <span>{e.label}</span>
          <MapPinIcon size={12} className="ml-auto text-slate-300 transition group-hover:text-sky-500" />
        </div>
      </button>
    </motion.li>
  );
}

export function LiveActivity() {
  const { events, focusOn } = useWorld();
  const fly = (e: WorldEvent) => focusOn(e.location, 'center');
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2.5">
        <RadioIcon size={16} className="text-emerald-500" />
        <h2 className="text-sm font-black uppercase tracking-wide text-slate-800">Live World Activity</h2>
        <span className="ml-auto flex h-2 w-2">
          <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
      </div>
      <ul className="flex-1 overflow-y-auto">
        {events.length === 0 && (
          <li className="px-3 py-8 text-center text-sm text-slate-400">
            Waiting for $WORLD activity…
            <br />
            Buys build the map. Sells tear it down.
          </li>
        )}
        <AnimatePresence initial={false}>
          {events.map((e, i) => (
            <EventRow key={`${e.source.timestamp}-${i}`} e={e} onFly={fly} />
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}
