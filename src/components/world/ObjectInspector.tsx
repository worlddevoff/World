import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { WorldObject } from '../../types/world';
import { shortWallet, uid, formatCurrency } from '../../utils/format';
import { useWorld } from '../../contexts/WorldContext';
import { labelForObject } from '../../utils/buildingLabels';
import { XIcon, WalletIcon, Share2Icon, CopyIcon, CheckIcon } from 'lucide-react';

const ERA_NAME = ['Settlement', 'Town', 'City', 'Metropolis', 'Space Age'];

const ZONE_NAME: Record<string, string> = {
  city: 'Downtown',
  village: 'Residential',
  industrial: 'Industrial Zone',
  entertainment: 'Waterfront District',
  wilderness: 'The Wilderness',
};

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}

function ownerLabel(wallet: string): string {
  if (wallet === 'genesis' || wallet === 'world') return 'The World';
  return shortWallet(wallet);
}

interface Props {
  obj: WorldObject | null;
  onClose: () => void;
}

export function ObjectInspector({ obj, onClose }: Props) {
  const { profile, stats, openShare } = useWorld();
  const [copied, setCopied] = useState(false);
  const isMine = !!obj && obj.bornBy === profile.wallet;
  const isDestroyed = !!obj && (obj.stage === 'rubble' || obj.stage === 'collapsing');
  const canCopy = !!obj && obj.bornBy !== 'genesis' && obj.bornBy !== 'world';

  const kindLabel = obj ? labelForObject(obj) : '';

  const shareThis = () => {
    if (!obj) return;
    const label = kindLabel;
    openShare({
      id: uid('share'),
      kind: 'OWNED',
      headline: 'TITLE DEED',
      subject: label,
      amount: obj.purchaseAmount ?? 0,
      detail: label,
      emoji: '🏙️',
      population: stats.population,
      timestamp: Date.now(),
      owner: obj.bornBy,
    });
  };

  const copyOwner = async () => {
    if (!obj || !canCopy) return;
    try {
      await navigator.clipboard.writeText(obj.bornBy);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      /* ignore */
    }
  };

  return (
    <AnimatePresence>
      {obj && (
        <motion.div
          key={obj.id}
          initial={{ opacity: 0, y: 12, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 340, damping: 26 }}
          className="pointer-events-auto absolute left-4 top-4 z-30 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-2xl backdrop-blur"
        >
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-3 py-2">
            <span className="text-sm font-black text-slate-800">
              {kindLabel}
            </span>
            <button onClick={onClose} className="text-slate-400 transition hover:text-slate-700">
              <XIcon size={15} />
            </button>
          </div>

          <div className="p-3">
            <div className="mb-3 flex items-center gap-2 rounded-xl bg-indigo-50 px-3 py-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-white">
                <WalletIcon size={15} />
              </div>
              <div className="min-w-0 flex-1 leading-tight">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-indigo-400">
                  Plot deed · Owned by
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className="truncate font-mono text-sm font-bold text-slate-800"
                    title={obj.bornBy}
                  >
                    {ownerLabel(obj.bornBy)}
                  </span>
                  {isMine && (
                    <span className="rounded-full bg-emerald-500 px-1.5 py-0.5 font-sans text-[9px] font-black uppercase tracking-wide text-white">
                      You
                    </span>
                  )}
                  {canCopy && (
                    <button
                      onClick={copyOwner}
                      className="ml-auto rounded-md p-1 text-indigo-400 transition hover:bg-indigo-100 hover:text-indigo-600"
                      title="Copy full wallet"
                    >
                      {copied ? <CheckIcon size={13} /> : <CopyIcon size={13} />}
                    </button>
                  )}
                </div>
              </div>
            </div>

            <dl className="space-y-1.5 text-xs">
              <Row k="Zone" v={ZONE_NAME[obj.zone] ?? obj.zone} />
              <Row k="Built in" v={`${ERA_NAME[obj.era] ?? 'Settlement'} Age`} />
              <Row k="Built" v={timeAgo(obj.createdAt)} />
              {obj.purchaseAmount != null && obj.purchaseAmount > 0 && (
                <Row k="Purchase" v={formatCurrency(obj.purchaseAmount)} />
              )}
              <Row
                k="Status"
                v={
                  obj.stage === 'rubble' || obj.stage === 'collapsing'
                    ? 'Destroyed'
                    : obj.stage === 'damaged'
                      ? 'Damaged'
                      : obj.stage === 'built'
                        ? 'Standing'
                        : 'Under construction'
                }
                danger={obj.stage === 'rubble' || obj.stage === 'collapsing' || obj.stage === 'damaged'}
              />
            </dl>

            {isMine && !isDestroyed && (
              <button
                onClick={shareThis}
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-slate-900 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 active:scale-[0.98]"
              >
                <Share2Icon size={15} /> Share to X
              </button>
            )}

            <p className="mt-3 rounded-lg bg-slate-50 px-2.5 py-2 text-[11px] leading-snug text-slate-500">
              {isMine
                ? 'This plot is deeded to your wallet. If you sell $WORLD, your land is damaged or removed — never someone else’s.'
                : 'This plot is deeded to the wallet that bought it. When they sell $WORLD, only their land is hit.'}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Row({ k, v, danger }: { k: string; v: string; danger?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-slate-500">{k}</dt>
      <dd className={`font-bold ${danger ? 'text-rose-600' : 'text-slate-800'}`}>{v}</dd>
    </div>
  );
}
