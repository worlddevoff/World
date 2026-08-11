import React from 'react';
import { Window } from '../Window';
import { useGame } from '../../store/gameStore';

export function GuestsWindow() {
  const guests = useGame((s) => s.guests);
  const openWindow = useGame((s) => s.openWindow);

  return (
    <Window id="guests" title={`Guests (${guests.length})`} width={250}>
      <div className="flex flex-col gap-0.5 max-h-80 overflow-auto rct-scroll">
        {guests.length === 0 && <span className="text-chrome-dark">No guests in the park yet.</span>}
        {guests.map((g) => (
          <button
            key={g.id}
            onClick={() => openWindow('guestinfo', g.id)}
            className="text-left p-1 bg-chrome-face bevel-out active:bevel-in flex items-center gap-2"
          >
            <span className="w-3 h-4 shrink-0" style={{ background: g.colorShirt }} />
            <span className="flex-1 leading-none">{g.name}</span>
            <span className="text-base" style={{ color: g.happiness > 55 ? '#0a6b1f' : '#b22222' }}>
              {Math.round(g.happiness)}%
            </span>
          </button>
        ))}
      </div>
    </Window>
  );
}
