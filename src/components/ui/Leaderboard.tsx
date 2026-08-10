import React, { useMemo } from 'react';
import { useWorld } from '../../contexts/WorldContext';
import { shortWallet, formatNumber } from '../../utils/format';
import { TrophyIcon, HammerIcon, SkullIcon, LandmarkIcon, MapIcon } from 'lucide-react';
import type { WalletStat } from '../../types/world';

const ZONE_META: Record<string, { name: string; emoji: string }> = {
  city: { name: 'Downtown', emoji: '🏙️' },
  village: { name: 'Residential', emoji: '🏘️' },
  industrial: { name: 'Industrial Zone', emoji: '🏭' },
  entertainment: { name: 'Waterfront', emoji: '🎡' },
  wilderness: { name: 'The Wilderness', emoji: '🌲' },
};

function topBy(stats: WalletStat[], key: keyof WalletStat): WalletStat | null {
  const sorted = [...stats]
    .filter((s) => (s[key] as number) > 0)
    .sort((a, b) => (b[key] as number) - (a[key] as number));
  return sorted[0] ?? null;
}

export function Leaderboard() {
  const { walletStats, objects, profile } = useWorld();

  // richest district = most standing buildings in a zone
  const topDistrict = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const o of objects) {
      if (o.kind === 'ROAD' || o.stage === 'rubble') continue;
      counts[o.zone] = (counts[o.zone] ?? 0) + 1;
    }
    const entry = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return entry ? { zone: entry[0], count: entry[1] } : null;
  }, [objects]);

  const builder = topBy(walletStats, 'built');
  const villain = topBy(walletStats, 'destroyed');
  const magnate = topBy(walletStats, 'landmarks');

  const you = (w?: string) => Boolean(w && w === profile.wallet);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center gap-1.5">
        <TrophyIcon size={15} className="text-amber-500" />
        <h2 className="text-xs font-black uppercase tracking-wide text-slate-800">Leaderboard</h2>
      </div>

      <ul className="space-y-2">
        <Entry
          icon={<HammerIcon size={14} className="text-emerald-500" />}
          title="Top Builder"
          who={builder ? shortWallet(builder.wallet) : '—'}
          detail={builder ? `${formatNumber(builder.built)} built` : 'No builds yet'}
          mine={you(builder?.wallet)}
        />
        <Entry
          icon={<SkullIcon size={14} className="text-rose-500" />}
          title="The Villain"
          who={villain ? shortWallet(villain.wallet) : '—'}
          detail={villain ? `${formatNumber(villain.destroyed)} destroyed` : 'No sells yet'}
          mine={you(villain?.wallet)}
        />
        <Entry
          icon={<LandmarkIcon size={14} className="text-indigo-500" />}
          title="Landmark Magnate"
          who={magnate ? shortWallet(magnate.wallet) : '—'}
          detail={magnate ? `${formatNumber(magnate.landmarks)} landmarks` : 'None yet'}
          mine={you(magnate?.wallet)}
        />
        <Entry
          icon={<MapIcon size={14} className="text-sky-500" />}
          title="Richest District"
          who={topDistrict ? `${ZONE_META[topDistrict.zone]?.emoji ?? ''} ${ZONE_META[topDistrict.zone]?.name ?? topDistrict.zone}` : '—'}
          detail={topDistrict ? `${formatNumber(topDistrict.count)} buildings` : 'Empty world'}
        />
      </ul>
    </div>
  );
}

function Entry({
  icon,
  title,
  who,
  detail,
  mine,
}: {
  icon: React.ReactNode;
  title: string;
  who: string;
  detail: string;
  mine?: boolean;
}) {
  return (
    <li className="flex items-center gap-2.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{title}</div>
        <div className="flex items-center gap-1.5">
          <span className="truncate font-mono text-sm font-bold text-slate-800">{who}</span>
          {mine && (
            <span className="rounded-full bg-emerald-500 px-1.5 py-0.5 font-sans text-[9px] font-black uppercase text-white">
              You
            </span>
          )}
        </div>
      </div>
      <span className="shrink-0 text-[11px] font-semibold text-slate-500">{detail}</span>
    </li>
  );
}
