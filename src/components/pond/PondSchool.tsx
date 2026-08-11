import React from 'react';
import { TrophyIcon } from 'lucide-react';
import { usePond } from '../../contexts/PondContext';
import { formatCurrency, formatNumber, shortWallet } from '../../utils/format';

export function PondSchool() {
  const { anglers } = usePond();

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center gap-1.5">
        <TrophyIcon size={14} className="text-amber-500" />
        <h2 className="text-xs font-black uppercase tracking-wide text-slate-800">
          Top feeders
        </h2>
      </div>
      {anglers.length === 0 ? (
        <p className="py-4 text-center text-[11px] text-slate-400">
          Buy on pump.fun to stock the pond.
        </p>
      ) : (
        <ol className="space-y-1.5">
          {anglers.slice(0, 8).map((a, i) => (
            <li
              key={a.wallet}
              className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-2 py-1.5 text-[11px]"
            >
              <span className="font-bold text-slate-500">#{i + 1}</span>
              <span className="font-mono font-semibold text-slate-800">
                {shortWallet(a.wallet)}
              </span>
              <span className="text-right text-slate-600">
                {formatNumber(a.fishSpawned)} 🐠
                {a.fishHooked > 0 ? ` · ${a.fishHooked} 🎣` : ''}
                <span className="mt-0.5 block text-[10px] text-slate-400">
                  {formatCurrency(a.contributed)}
                </span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
