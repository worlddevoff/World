import React from 'react';
import { motion } from 'framer-motion';
import { useCastle } from '../../contexts/CastleContext';
import type { CastleStageId } from '../../data/castleStages';

/** Stage list + community vote for what to emphasize next. */
export function CastleRoadmap() {
  const { stages, votes, voteFocus, castVote, activeIndex } = useCastle();

  const voteTotal = Object.values(votes).reduce((a, b) => a + b, 0) || 1;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-xs font-black uppercase tracking-wide text-slate-800">
          Castle roadmap
        </h2>
        <span className="text-[10px] font-bold text-slate-400">
          Community vote
        </span>
      </div>
      <p className="mb-3 text-[10px] leading-snug text-slate-500">
        Buys raise the market — the keep grows forever. There is always a next
        wing. Vote for what the community should push toward.
      </p>

      <ul className="space-y-2">
        {stages.map((st, i) => {
          const pct = Math.round(st.fill * 100);
          const isActive = i === activeIndex && st.status === 'building';
          const lean = voteFocus === st.def.id;
          const voteShare = Math.round(((votes[st.def.id] ?? 0) / voteTotal) * 100);

          return (
            <li key={st.def.id}>
              <button
                type="button"
                onClick={() => castVote(st.def.id as CastleStageId)}
                className={`w-full rounded-xl border px-2.5 py-2 text-left transition ${
                  isActive
                    ? 'border-emerald-400 bg-emerald-50'
                    : lean
                      ? 'border-amber-300 bg-amber-50'
                      : 'border-slate-100 bg-slate-50 hover:border-slate-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">{st.def.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-800">
                        {st.def.name}
                      </span>
                      {st.status === 'complete' && (
                        <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">
                          Built
                        </span>
                      )}
                      {isActive && (
                        <span className="rounded-full bg-emerald-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
                          Building
                        </span>
                      )}
                      {lean && st.status !== 'complete' && (
                        <span className="rounded-full bg-amber-200 px-1.5 py-0.5 text-[9px] font-bold text-amber-900">
                          Leading vote
                        </span>
                      )}
                    </div>
                    <p className="truncate text-[10px] text-slate-500">
                      {st.def.blurb}
                    </p>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200">
                      <motion.div
                        className="h-full rounded-full bg-emerald-500"
                        initial={false}
                        animate={{ width: `${pct}%` }}
                        transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                      />
                    </div>
                    <div className="mt-0.5 flex justify-between text-[9px] font-semibold text-slate-400">
                      <span>
                        {st.stonesPlaced}/{st.def.stones} stones
                      </span>
                      <span>{voteShare}% votes</span>
                    </div>
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
