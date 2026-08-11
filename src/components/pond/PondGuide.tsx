import React from 'react';

const ROWS: { emoji: string; title: string; body: string }[] = [
  {
    emoji: '🐠',
    title: 'Buys add fish',
    body: 'Every purchase drops a new fish into the pond.',
  },
  {
    emoji: '🐋',
    title: 'Bigger buy → bigger fish',
    body: 'Minnows, bass, tuna, whales — size tracks the buy.',
  },
  {
    emoji: '🎣',
    title: 'Sells get hooked',
    body: 'A line drops, the hook grabs a fish, and it’s reeled out.',
  },
];

export function PondGuide() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <h2 className="mb-2 text-xs font-black uppercase tracking-wide text-slate-800">
        How the pond works
      </h2>
      <ul className="space-y-2">
        {ROWS.map((r) => (
          <li key={r.title} className="flex gap-2 rounded-xl bg-sky-50/80 px-2.5 py-2">
            <span className="text-base">{r.emoji}</span>
            <div>
              <p className="text-xs font-bold text-slate-800">{r.title}</p>
              <p className="text-[10px] leading-snug text-slate-500">{r.body}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
