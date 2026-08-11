import React from 'react';
import { TrophyIcon } from 'lucide-react';
import { useCastle } from '../../contexts/CastleContext';
import { formatCurrency, formatNumber, shortWallet } from '../../utils/format';

export function CastleBuilders() {
  const { builders } = useCastle();

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center gap-1.5">
        <TrophyIcon size={14} className="text-amber-500" />
        <h2 className="text-xs font-black uppercase tracking-wide text-slate-800">
          Top builders
        </h2>
      </div>
      {builders.length === 0 ? (
        <p className="py-4 text-center text-[11px] text-slate-400">
          Buy on pump.fun to claim a place on the wall.
        </p>
      ) : (
        <ol className="space-y-1.5">
          {builders.slice(0, 8).map((b, i) => (
            <li
              key={b.wallet}
              className="flex items-center justify-between rounded-lg bg-slate-50 px-2 py-1.5 text-[11px]"
            >
              <span className="font-bold text-slate-500">#{i + 1}</span>
              <span className="font-mono font-semibold text-slate-800">
                {shortWallet(b.wallet)}
              </span>
              <span className="text-slate-600">
                {formatNumber(b.stones)} 🧱 · {formatCurrency(b.contributed)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
