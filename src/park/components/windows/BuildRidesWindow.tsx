import React from 'react';
import { Window } from '../Window';
import { useGame } from '../../store/gameStore';
import { RIDE_DEFS } from '../../data/rides';
import { fmtMoney } from '../StatusBar';

export function BuildRidesWindow() {
  const setTool = useGame((s) => s.setTool);
  const tool = useGame((s) => s.tool);
  const payload = useGame((s) => s.toolPayload);
  const cash = useGame((s) => s.cash);

  const flat = RIDE_DEFS.filter((r) => r.category !== 'coaster' && r.researched);

  return (
    <Window id="rides" title="Build Rides" width={280}>
      <p className="text-chrome-dark mb-1">Select a ride, then click a spot next to a path.</p>
      <div className="grid grid-cols-2 gap-1">
        {flat.map((r) => {
          const active = tool === 'ride' && payload === r.id;
          const afford = cash >= r.cost;
          return (
            <button
              key={r.id}
              disabled={!afford}
              onClick={() => setTool('ride', r.id)}
              className={`text-left p-1.5 bg-chrome-face ${active ? 'bevel-in bg-[#b7ae9c]' : 'bevel-out active:bevel-in'} ${!afford ? 'opacity-50' : ''}`}
            >
              <div className="flex items-center gap-1.5">
                <span className="w-6 h-6 shrink-0 bevel-in flex items-center justify-center" style={{ background: r.color }}>
                  <span className="text-white font-display text-xs">{r.name[0]}</span>
                </span>
                <span className="leading-none">{r.name}</span>
              </div>
              <div className="text-rct-money font-bold mt-0.5">{fmtMoney(r.cost)}</div>
              <div className="text-chrome-dark text-base">Ex {r.baseExcitement.toFixed(1)} · In {r.baseIntensity.toFixed(1)}</div>
            </button>
          );
        })}
      </div>
      {RIDE_DEFS.some((r) => r.category !== 'coaster' && !r.researched) && (
        <p className="text-chrome-dark mt-2 text-base">More rides available through research…</p>
      )}
    </Window>
  );
}
