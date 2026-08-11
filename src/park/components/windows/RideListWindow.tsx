import React from 'react';
import { Window } from '../Window';
import { useGame } from '../../store/gameStore';
import { fmtMoney } from '../StatusBar';

const STATUS_COLOR: Record<string, string> = {
  open: '#0a6b1f', closed: '#8a8172', testing: '#e0a020', broken: '#b22222', building: '#7a53c9',
};

export function RideListWindow() {
  const rides = useGame((s) => s.rides);
  const openWindow = useGame((s) => s.openWindow);

  return (
    <Window id="ridelist" title={`Ride List (${rides.length})`} width={280}>
      <div className="flex flex-col gap-0.5 max-h-80 overflow-auto rct-scroll">
        {rides.length === 0 && <span className="text-chrome-dark">No rides built yet.</span>}
        {rides.map((r) => (
          <button
            key={r.id}
            onClick={() => openWindow('rideinfo', r.id)}
            className="text-left p-1.5 bg-chrome-face bevel-out active:bevel-in flex items-center gap-2"
          >
            <span className="w-5 h-5 shrink-0 bevel-in" style={{ background: r.color }} />
            <div className="flex-1">
              <div className="leading-none">{r.name}</div>
              <div className="text-base text-chrome-dark">
                {r.excitement > 0 ? `Ex ${r.excitement.toFixed(1)} · In ${r.intensity.toFixed(1)}` : 'Not tested'}
              </div>
            </div>
            <div className="text-right">
              <div className="text-base font-bold capitalize" style={{ color: STATUS_COLOR[r.status] }}>{r.status}</div>
              <div className="text-base text-rct-money">{fmtMoney(r.income)}</div>
            </div>
          </button>
        ))}
      </div>
    </Window>
  );
}
