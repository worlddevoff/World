import React from 'react';
import { Window } from '../Window';
import { useGame } from '../../store/gameStore';
import { SHOP_DEFS } from '../../data/rides';
import { fmtMoney } from '../StatusBar';

export function ShopsWindow() {
  const setTool = useGame((s) => s.setTool);
  const tool = useGame((s) => s.tool);
  const payload = useGame((s) => s.toolPayload);
  const discovered = useGame((s) => s.discovered);

  const available = SHOP_DEFS.filter((s) => s.kind !== 'souvenir' || discovered.includes(s.id));

  return (
    <Window id="shops" title="Shops & Stalls" width={260}>
      <p className="text-chrome-dark mb-1">Place next to a path so guests can reach it.</p>
      <div className="flex flex-col gap-1">
        {available.map((s) => {
          const active = tool === 'shop' && payload === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setTool('shop', s.id)}
              className={`text-left p-1.5 flex items-center gap-2 bg-chrome-face ${active ? 'bevel-in bg-[#b7ae9c]' : 'bevel-out active:bevel-in'}`}
            >
              <span className="w-6 h-6 shrink-0 bevel-in flex items-center justify-center" style={{ background: s.color }}>
                <span className="text-white font-display text-xs">{s.kind === 'restroom' ? 'WC' : s.name[0]}</span>
              </span>
              <span className="flex-1 leading-none">{s.name}</span>
              <span className="text-rct-money font-bold">{fmtMoney(s.cost)}</span>
            </button>
          );
        })}
      </div>
    </Window>
  );
}
