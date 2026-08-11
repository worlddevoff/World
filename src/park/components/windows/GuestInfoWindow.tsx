import React from 'react';
import { Window, Sunken } from '../Window';
import { useGame } from '../../store/gameStore';
import { fmtMoney } from '../StatusBar';

export function GuestInfoWindow() {
  const payload = useGame((s) => s.windows.find((w) => w.id === 'guestinfo')?.payload);
  const guest = useGame((s) => s.guests.find((g) => g.id === payload));

  if (!guest) {
    return (
      <Window id="guestinfo" title="Guest" width={210}>
        <div className="text-chrome-dark">This guest has left the park.</div>
      </Window>
    );
  }

  return (
    <Window id="guestinfo" title={guest.name} width={210}>
      <div className="flex items-center gap-2 mb-2">
        <div className="rounded-lg p-1.5 bg-gradient-to-b from-[#3a5bd0] to-[#294a6b]">
          <div className="w-8 h-10 relative">
            <div className="absolute left-1/2 -translate-x-1/2 top-0 w-3 h-3" style={{ background: '#f0c090' }} />
            <div className="absolute left-1/2 -translate-x-1/2 top-3 w-5 h-4" style={{ background: guest.colorShirt }} />
            <div className="absolute left-1/2 -translate-x-1/2 top-7 w-5 h-3" style={{ background: guest.colorPants }} />
          </div>
        </div>
        <div className="flex-1">
          <div className="sunken px-1.5 py-1 text-base bubble-pop">
            "{guest.thought}"
          </div>
        </div>
      </div>

      <Sunken className="flex flex-col gap-1">
        <Bar label="Happiness" value={guest.happiness} good />
        <Bar label="Energy" value={guest.energy} good />
        <Bar label="Hunger" value={guest.hunger} />
        <Bar label="Thirst" value={guest.thirst} />
        <Bar label="Nausea" value={guest.nausea} />
      </Sunken>

      <div className="flex justify-between mt-2">
        <span className="text-chrome-dark">Cash</span>
        <span className="font-bold text-rct-money">{fmtMoney(guest.money)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-chrome-dark">Status</span>
        <span className="font-bold capitalize">{guest.state}</span>
      </div>
    </Window>
  );
}

function Bar({ label, value, good }: { label: string; value: number; good?: boolean }) {
  const v = Math.round(value);
  // For "good" stats, high is green. For needs (hunger etc), high is bad -> red.
  const color = good
    ? (v > 55 ? '#3f9b52' : v > 30 ? '#e0a020' : '#d94b4b')
    : (v > 65 ? '#d94b4b' : v > 40 ? '#e0a020' : '#3f9b52');
  return (
    <div className="flex items-center gap-1 text-base">
      <span className="w-16 text-chrome-dark">{label}</span>
      <div className="flex-1 sunken h-3">
        <div className="h-full" style={{ width: `${v}%`, background: color }} />
      </div>
      <span className="w-8 text-right">{v}</span>
    </div>
  );
}
