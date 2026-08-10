import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useWorld } from '../../contexts/WorldContext';
import { formatCurrency, formatNumber, shortWallet, uid } from '../../utils/format';
import { WalletIcon, EyeIcon, LocateFixedIcon, Share2Icon } from 'lucide-react';
import { X_HANDLE_AT, X_URL } from '../../config/brand';

export function PlayerProfile() {
  const {
    profile,
    highlightMine,
    setHighlightMine,
    focusMyTerritory,
    setPlayerWallet,
    objects,
    milestones,
    stats,
    pump,
    openShare,
  } = useWorld();
  const [walletDraft, setWalletDraft] = useState(profile.wallet);
  const [claimNote, setClaimNote] = useState<string | null>(null);

  useEffect(() => {
    setWalletDraft(profile.wallet);
  }, [profile.wallet]);

  const myPlots = objects.filter(
    (o) =>
      !!profile.wallet &&
      o.bornBy === profile.wallet &&
      o.stage !== 'rubble' &&
      o.kind !== 'ROAD',
  ).length;

  const rows: [string, string][] = [
    ['Your plots', formatNumber(myPlots)],
    ['Contribution', formatCurrency(profile.contribution)],
    ['Buildings Created', formatNumber(profile.buildingsCreated)],
    ['Buildings Destroyed', formatNumber(profile.buildingsDestroyed)],
  ];

  const claim = () => {
    const clean = walletDraft.trim();
    if (!clean) {
      setClaimNote('Paste your Solana wallet address first.');
      return;
    }
    setPlayerWallet(clean);
    setHighlightMine(true);
    const found = focusMyTerritory(clean);
    setClaimNote(
      found
        ? `Found your builds — flying to ${shortWallet(clean)}.`
        : 'Wallet claimed. No builds on the map yet — buy on pump.fun to place one.',
    );
  };

  const flyToMine = () => {
    if (!profile.wallet) {
      setClaimNote('Claim your wallet first.');
      return;
    }
    setHighlightMine(true);
    const found = focusMyTerritory(profile.wallet);
    setClaimNote(
      found
        ? `Flying to ${shortWallet(profile.wallet)}.`
        : 'No builds for this wallet yet.',
    );
  };

  const shareCitizen = () => {
    const wallet = profile.wallet || walletDraft.trim();
    openShare({
      id: uid('share'),
      kind: 'CITIZEN',
      headline: 'CITIZEN',
      subject: 'Citizen of WORLD',
      amount: 0,
      detail: 'Holder',
      emoji: '🌎',
      population: pump.holderCount ?? stats.population,
      timestamp: Date.now(),
      owner: wallet || undefined,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
    >
      <div className="mb-2 flex items-center gap-1.5">
        <WalletIcon size={15} className="text-indigo-500" />
        <h2 className="text-xs font-black uppercase tracking-wide text-slate-800">Your World</h2>
        <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[10px] text-slate-600">
          {profile.wallet ? shortWallet(profile.wallet) : 'Not claimed'}
        </span>
      </div>

      <p className="mb-2 text-[10px] leading-snug text-slate-500">
        Paste your wallet and Claim to highlight your plots and fly the map there.
      </p>
      <div className="mb-1.5 flex gap-1.5">
        <input
          value={walletDraft}
          onChange={(e) => {
            setWalletDraft(e.target.value);
            if (claimNote) setClaimNote(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') claim();
          }}
          placeholder="Solana wallet address"
          spellCheck={false}
          className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 font-mono text-[10px] text-slate-800 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none"
        />
        <button
          type="button"
          onClick={claim}
          className="shrink-0 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-[11px] font-bold text-white transition hover:bg-indigo-500"
        >
          Claim
        </button>
      </div>
      {claimNote && (
        <p className="mb-2 text-[10px] leading-snug text-indigo-600">{claimNote}</p>
      )}

      <dl className="space-y-1">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between text-xs">
            <dt className="text-slate-500">{k}</dt>
            <dd className="font-bold text-slate-800">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-3 flex flex-wrap gap-1">
        {milestones.map((m) => (
          <span
            key={m.id}
            title={`${m.title} — ${m.unlockLabel}`}
            className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
              m.unlocked
                ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300'
                : 'bg-slate-100 text-slate-400'
            }`}
          >
            {m.emoji}
          </span>
        ))}
      </div>

      <a
        href={X_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-900 py-2 text-xs font-bold text-white transition hover:bg-slate-800"
      >
        Connect on X · {X_HANDLE_AT}
      </a>

      <button
        type="button"
        onClick={shareCitizen}
        className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2 text-xs font-bold text-white transition hover:bg-emerald-500"
      >
        <Share2Icon size={13} /> Share citizenship
      </button>

      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={() => setHighlightMine(!highlightMine)}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition ${
            highlightMine
              ? 'bg-emerald-500 text-white hover:bg-emerald-600'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <EyeIcon size={13} /> {highlightMine ? 'Showing mine' : 'Highlight mine'}
        </button>
        <button
          type="button"
          onClick={flyToMine}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white transition hover:bg-slate-800"
          title="Zoom to my builds"
        >
          <LocateFixedIcon size={13} />
        </button>
      </div>
    </motion.div>
  );
}
