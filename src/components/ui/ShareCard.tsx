import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorld } from '../../contexts/WorldContext';
import { formatCurrency, formatNumber, shortWallet } from '../../utils/format';
import { TOKEN_TICKER, X_HANDLE_AT } from '../../config/brand';
import { XIcon, Share2Icon } from 'lucide-react';

function tweetFor(m: {
  kind: string;
  subject: string;
  amount: number;
  owner?: string;
  population: number;
  detail?: string;
}): string {
  if (m.kind === 'CITIZEN') {
    return [
      `I'm a citizen of WORLD 🌎`,
      `Holding ${TOKEN_TICKER}${m.owner ? ` · ${shortWallet(m.owner)}` : ''}`,
      `Population ${formatNumber(m.population)}`,
      `${X_HANDLE_AT}`,
    ].join('\n');
  }
  if (m.kind === 'OWNED') {
    return [
      `I built this in WORLD 🌎`,
      `${m.subject}${m.owner ? ` · ${shortWallet(m.owner)}` : ''}`,
      m.amount > 0 ? `On-chain buy ${formatCurrency(m.amount)}` : null,
      `Population ${formatNumber(m.population)}`,
      `${TOKEN_TICKER} ${X_HANDLE_AT}`,
    ]
      .filter(Boolean)
      .join('\n');
  }
  if (m.kind === 'MILESTONE') {
    return [
      `${m.subject} unlocked in WORLD 🌎`,
      m.detail || 'The civilization leveled up.',
      `Population ${formatNumber(m.population)}`,
      `${TOKEN_TICKER} ${X_HANDLE_AT}`,
    ].join('\n');
  }
  if (m.kind === 'DISASTER') {
    return `🚨 ${m.subject} just hit WORLD! ${formatCurrency(m.amount)} SELL 🌎\nWorld population: ${formatNumber(m.population)}\n${TOKEN_TICKER} ${X_HANDLE_AT}`;
  }
  return `${m.subject} in WORLD! ${formatCurrency(m.amount)} BUY 🌎\nWorld population: ${formatNumber(m.population)}\n${TOKEN_TICKER} ${X_HANDLE_AT}`;
}

export function ShareCard() {
  const { shareMoment, dismissShare } = useWorld();

  const onShareToX = () => {
    if (!shareMoment) return;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetFor(shareMoment))}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const isDeed = shareMoment?.kind === 'OWNED';
  const isCitizen = shareMoment?.kind === 'CITIZEN';
  const isMilestone = shareMoment?.kind === 'MILESTONE';

  return (
    <AnimatePresence>
      {shareMoment && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={dismissShare}
        >
          <motion.div
            initial={{ scale: 0.8, y: 30, rotate: -2 }}
            animate={{ scale: 1, y: 0, rotate: 0 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm overflow-hidden rounded-3xl shadow-2xl"
          >
            {isCitizen ? (
              <div
                className="relative p-6 text-white"
                style={{
                  background: 'linear-gradient(165deg, #0f2417 0%, #14532d 50%, #166534 100%)',
                }}
              >
                <button
                  onClick={dismissShare}
                  className="absolute right-3 top-3 z-10 rounded-full bg-white/15 p-1 text-white transition hover:bg-white/25"
                >
                  <XIcon size={16} />
                </button>
                <div className="text-center">
                  <p className="mb-1 text-[10px] font-black uppercase tracking-[0.35em] text-emerald-300/90">
                    Citizenship · {TOKEN_TICKER}
                  </p>
                  <p className="mb-3 text-lg font-black tracking-wide">WORLD</p>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.15, type: 'spring' }}
                    className="mb-2 text-5xl"
                  >
                    🌎
                  </motion.div>
                  <h2 className="mb-1 text-2xl font-black leading-tight">Citizen</h2>
                  <p className="mb-4 text-sm font-semibold text-emerald-100">
                    I hold $WORLD — wherever I bought it
                  </p>
                  <div className="mx-auto mb-3 grid max-w-[240px] gap-1.5 rounded-xl border border-white/15 bg-black/25 px-3 py-2.5 text-left text-xs">
                    <div className="flex justify-between gap-2">
                      <span className="text-white/55">Wallet</span>
                      <span className="font-mono font-bold">
                        {shareMoment.owner ? shortWallet(shareMoment.owner) : 'you'}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-white/55">Population</span>
                      <span className="font-bold">{formatNumber(shareMoment.population)}</span>
                    </div>
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-emerald-300/80">
                    {X_HANDLE_AT}
                  </p>
                </div>
              </div>
            ) : isDeed ? (
              <div
                className="relative p-6 text-[#1c1917]"
                style={{
                  background:
                    'linear-gradient(165deg, #f5e6c8 0%, #e8d4a8 45%, #d4b896 100%)',
                }}
              >
                <div
                  className="pointer-events-none absolute inset-3 rounded-2xl border-2 border-[#8b6914]/40"
                  style={{ boxShadow: 'inset 0 0 0 1px rgba(139,105,20,0.15)' }}
                />
                <button
                  onClick={dismissShare}
                  className="absolute right-3 top-3 z-10 rounded-full bg-[#1c1917]/10 p-1 text-[#1c1917] transition hover:bg-[#1c1917]/20"
                >
                  <XIcon size={16} />
                </button>

                <div className="relative text-center">
                  <p className="mb-1 text-[10px] font-black uppercase tracking-[0.35em] text-[#8b6914]">
                    Title Deed · {TOKEN_TICKER}
                  </p>
                  <p className="mb-3 font-serif text-lg font-bold tracking-wide text-[#5c4a2a]">
                    WORLD
                  </p>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.15, type: 'spring' }}
                    className="mb-2 text-5xl"
                  >
                    {shareMoment.emoji}
                  </motion.div>
                  <h2 className="mb-1 font-serif text-2xl font-black leading-tight text-[#1c1917]">
                    {shareMoment.subject}
                  </h2>
                  <p className="mb-4 text-sm font-semibold text-[#5c4a2a]">
                    Built on-chain in $WORLD
                  </p>

                  <div className="mx-auto mb-3 grid max-w-[240px] gap-1.5 rounded-xl border border-[#8b6914]/30 bg-[#fff8e7]/70 px-3 py-2.5 text-left text-xs">
                    <div className="flex justify-between gap-2">
                      <span className="text-[#78716c]">Builder</span>
                      <span className="font-mono font-bold">
                        {shareMoment.owner ? shortWallet(shareMoment.owner) : 'you'}
                      </span>
                    </div>
                    {shareMoment.amount > 0 && (
                      <div className="flex justify-between gap-2">
                        <span className="text-[#78716c]">Buy size</span>
                        <span className="font-bold">{formatCurrency(shareMoment.amount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between gap-2">
                      <span className="text-[#78716c]">Population</span>
                      <span className="font-bold">{formatNumber(shareMoment.population)}</span>
                    </div>
                  </div>

                  <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#8b6914]/80">
                    {X_HANDLE_AT}
                  </p>
                </div>
              </div>
            ) : (
              <div
                className="p-6 text-white"
                style={{
                  background: isMilestone
                    ? 'linear-gradient(160deg, #1e3a5f, #0ea5e9)'
                    : shareMoment.kind === 'DISASTER'
                      ? 'linear-gradient(160deg, #7f1d1d, #dc2626)'
                      : 'linear-gradient(160deg, #065f46, #10b981)',
                }}
              >
                <button
                  onClick={dismissShare}
                  className="absolute right-3 top-3 rounded-full bg-white/20 p-1 text-white transition hover:bg-white/30"
                >
                  <XIcon size={16} />
                </button>

                <div className="mb-4 text-center">
                  <div className="mb-1 text-3xl">🌎</div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-white/80">
                    {shareMoment.kind === 'DISASTER'
                      ? '🚨 World Disaster'
                      : isMilestone
                        ? '✨ Milestone Unlocked'
                        : '✨ World Event'}
                  </p>
                </div>

                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring' }}
                  className="mb-3 text-center text-6xl"
                >
                  {shareMoment.emoji}
                </motion.div>

                <h2 className="mb-1 text-center text-2xl font-black uppercase leading-tight">
                  {shareMoment.subject}
                </h2>
                <p className="mb-4 text-center text-sm font-semibold text-white/90">
                  {isMilestone
                    ? shareMoment.detail
                    : `${formatCurrency(shareMoment.amount)} ${shareMoment.kind === 'DISASTER' ? 'SELL' : 'BUY'}`}
                </p>

                <div className="rounded-2xl bg-black/20 p-3 text-center">
                  <p className="text-[10px] uppercase tracking-widest text-white/60">World Population</p>
                  <p className="text-2xl font-black">{formatNumber(shareMoment.population)}</p>
                </div>

                <p className="mt-4 text-center text-[10px] uppercase tracking-widest text-white/50">
                  {X_HANDLE_AT} · {TOKEN_TICKER}
                </p>
              </div>
            )}

            <div className="flex gap-2 bg-white p-3">
              <button
                onClick={dismissShare}
                className="flex-1 rounded-xl bg-slate-100 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-200"
              >
                Close
              </button>
              <button
                onClick={onShareToX}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-slate-900 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800"
              >
                <Share2Icon size={15} /> Share to X
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
