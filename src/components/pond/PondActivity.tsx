import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePond } from '../../contexts/PondContext';
import { formatCurrency, shortWallet } from '../../utils/format';

export function PondActivity() {
  const { events, pump } = usePond();

  return (
    <div className="flex min-h-[160px] flex-1 flex-col rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xs font-black uppercase tracking-wide text-slate-800">
          Live casts
        </h2>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
            pump.status === 'live'
              ? 'bg-sky-100 text-sky-700'
              : 'bg-slate-100 text-slate-500'
          }`}
        >
          {pump.status === 'live' ? 'Live' : pump.status === 'connecting' ? '…' : 'Idle'}
        </span>
      </div>
      <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto">
        <AnimatePresence initial={false}>
          {events.length === 0 && (
            <p className="py-6 text-center text-[11px] text-slate-400">
              Waiting for a buy — fish appear when someone feeds the pond.
            </p>
          )}
          {events.map((e) => (
            <motion.div
              key={e.id}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              className={`flex items-start gap-2 rounded-xl px-2 py-1.5 text-[11px] ${
                e.type === 'BUY' ? 'bg-sky-50' : 'bg-rose-50'
              }`}
            >
              <span className="text-sm">{e.emoji}</span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-800">{e.label}</p>
                <p className="text-[10px] text-slate-500">
                  {shortWallet(e.wallet)} · {formatCurrency(e.amount)}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
