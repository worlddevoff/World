import React from 'react';
import { Window } from '../Window';
import { useGame } from '../../store/gameStore';
import { RIDE_DEFS } from '../../data/rides';
import { fmtMoney } from '../StatusBar';

export function CoasterBuilderWindow() {
  const setTool = useGame((s) => s.setTool);
  const tool = useGame((s) => s.tool);
  const payload = useGame((s) => s.toolPayload);
  const cash = useGame((s) => s.cash);
  const building = useGame((s) => s.buildingCoasterId);

  const coasters = RIDE_DEFS.filter((r) => r.isTrackBuilt && r.researched);

  return (
    <Window id="coaster" title="Roller Coasters" width={280}>
      {building ? (
        <div className="sunken p-2 text-chrome-text">
          Building in progress — use the on-screen track controls to lay pieces, then Test or Open.
        </div>
      ) : (
        <>
          <p className="text-chrome-dark mb-1">Pick a coaster type, click the map to drop the station, then build the track piece-by-piece.</p>
          <div className="flex flex-col gap-1">
            {coasters.map((r) => {
              const active = tool === 'coaster' && payload === r.id;
              const afford = cash >= r.cost;
              return (
                <button
                  key={r.id}
                  disabled={!afford}
                  onClick={() => setTool('coaster', r.id)}
                  className={`text-left p-1.5 flex items-center gap-2 bg-chrome-face ${active ? 'bevel-in bg-[#b7ae9c]' : 'bevel-out active:bevel-in'} ${!afford ? 'opacity-50' : ''}`}
                >
                  <span className="w-7 h-7 shrink-0 bevel-in flex items-center justify-center" style={{ background: r.color }}>
                    <span className="text-white font-display text-sm">{r.name.split(' ')[0][0]}</span>
                  </span>
                  <div className="flex-1">
                    <div className="leading-none">{r.name}</div>
                    <div className="text-base text-chrome-dark">Base Ex {r.baseExcitement.toFixed(1)} · In {r.baseIntensity.toFixed(1)}</div>
                  </div>
                  <span className="text-rct-money font-bold">{fmtMoney(r.cost)}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-2 sunken p-1.5 text-base text-chrome-text">
            <b>Tip:</b> Straight builds forward. Left/Right turn the track. Up/Down change height. Add Brakes before the station. Longer tracks with drops & turns = higher excitement.
          </div>
        </>
      )}
    </Window>
  );
}
