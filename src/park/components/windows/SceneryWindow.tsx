import React from 'react';
import { Window } from '../Window';
import { useGame } from '../../store/gameStore';
import { SCENERY_DEFS } from '../../data/scenery';
import { fmtMoney } from '../StatusBar';

export function SceneryWindow() {
  const setTool = useGame((s) => s.setTool);
  const tool = useGame((s) => s.tool);
  const payload = useGame((s) => s.toolPayload);

  return (
    <Window id="scenery" title="Scenery" width={230}>
      <p className="text-chrome-dark mb-1">Decorate your park to raise its value & guest happiness.</p>
      <div className="grid grid-cols-2 gap-1">
        {SCENERY_DEFS.map((d) => {
          const active = tool === 'scenery' && payload === d.kind;
          return (
            <button
              key={d.kind}
              onClick={() => setTool('scenery', d.kind)}
              className={`text-left p-1.5 bg-chrome-face ${active ? 'bevel-in bg-[#b7ae9c]' : 'bevel-out active:bevel-in'}`}
            >
              <div className="leading-none">{d.name}</div>
              <div className="text-rct-money font-bold">{fmtMoney(d.cost)}</div>
            </button>
          );
        })}
      </div>
    </Window>
  );
}
