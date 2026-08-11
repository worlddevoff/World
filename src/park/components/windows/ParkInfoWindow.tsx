import React from 'react';
import { Window, StatRow, Sunken } from '../Window';
import { useGame } from '../../store/gameStore';
import { fmtMoney } from '../StatusBar';

export function ParkInfoWindow() {
  const s = useGame();
  const ratingLabel = s.parkRating > 700 ? 'Excellent' : s.parkRating > 550 ? 'Good' : s.parkRating > 400 ? 'Fair' : 'Poor';
  const openRides = s.rides.filter((r) => r.status === 'open').length;
  const avgHappy = s.guests.length ? Math.round(s.guests.reduce((a, g) => a + g.happiness, 0) / s.guests.length) : 0;

  return (
    <Window id="parkinfo" title="Park Information" width={240}>
      <div className="font-display text-base text-center title-stripes text-white py-0.5 mb-2">{s.parkName}</div>
      <Sunken className="flex flex-col gap-0.5">
        <StatRow label="Park rating" value={`${s.parkRating} (${ratingLabel})`} color={s.parkRating > 550 ? '#0a6b1f' : '#b22222'} />
        <StatRow label="Park value" value={fmtMoney(s.parkValue)} />
        <StatRow label="Guests in park" value={String(s.guests.length)} />
        <StatRow label="Avg. happiness" value={`${avgHappy}%`} color={avgHappy > 55 ? '#0a6b1f' : '#b22222'} />
        <StatRow label="Open rides" value={String(openRides)} />
        <StatRow label="Shops" value={String(s.shops.length)} />
        <StatRow label="Staff" value={String(s.staff.length)} />
        <StatRow label="Admission" value={s.admissionPrice > 0 ? fmtMoney(s.admissionPrice) : 'Free (rides pay)'} />
      </Sunken>
      <RatingBar rating={s.parkRating} />
    </Window>
  );
}

function RatingBar({ rating }: { rating: number }) {
  const pct = Math.min(100, (rating / 999) * 100);
  return (
    <div className="mt-2">
      <div className="text-base text-chrome-dark mb-0.5">Rating</div>
      <div className="sunken h-4 w-full relative">
        <div className="h-full" style={{ width: `${pct}%`, background: rating > 550 ? '#3f9b52' : '#d94b4b' }} />
      </div>
    </div>
  );
}
