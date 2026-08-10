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
      `🌎 CITIZEN OF $WORLD`,
      `I hold ${TOKEN_TICKER} — passport stamped.`,
      m.owner && m.owner.length >= 32 ? `Wallet ${shortWallet(m.owner)}` : null,
      m.population > 0 ? `Civilization pop ${formatNumber(m.population)}` : null,
      `${X_HANDLE_AT}`,
    ]
      .filter(Boolean)
      .join('\n');
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
                className="relative overflow-hidden px-6 pb-7 pt-6 text-white"
                style={{
                  background:
                    'radial-gradient(120% 80% at 50% -10%, rgba(250,204,21,0.22), transparent 55%), linear-gradient(165deg, #06140c 0%, #0c2e1a 42%, #14532d 100%)',
                }}
              >
                {/* Atmosphere */}
                <motion.div
                  aria-hidden
                  className="pointer-events-none absolute -left-16 top-8 h-40 w-40 rounded-full bg-amber-300/15 blur-3xl"
                  animate={{ opacity: [0.35, 0.7, 0.35], scale: [1, 1.15, 1] }}
                  transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
                />
                <motion.div
                  aria-hidden
                  className="pointer-events-none absolute -right-10 bottom-0 h-36 w-36 rounded-full bg-emerald-400/20 blur-3xl"
                  animate={{ opacity: [0.25, 0.55, 0.25] }}
                  transition={{ duration: 5.2, repeat: Infinity, ease: 'easeInOut' }}
                />
                {/* Shimmer sweep */}
                <motion.div
                  aria-hidden
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background:
                      'linear-gradient(105deg, transparent 40%, rgba(253,224,71,0.14) 50%, transparent 60%)',
                  }}
                  animate={{ x: ['-40%', '40%'] }}
                  transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1.4 }}
                />
                {/* Passport edge */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-3 rounded-2xl border border-amber-200/25"
                  style={{ boxShadow: 'inset 0 0 0 1px rgba(16,185,129,0.15)' }}
                />

                <button
                  onClick={dismissShare}
                  className="absolute right-3 top-3 z-10 rounded-full bg-white/10 p-1 text-white/80 transition hover:bg-white/20"
                >
                  <XIcon size={16} />
                </button>

                <div className="relative text-center">
                  <motion.p
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-2 text-[10px] font-bold uppercase tracking-[0.42em] text-amber-200/90"
                  >
                    Official passport · {TOKEN_TICKER}
                  </motion.p>

                  <motion.h2
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.05, type: 'spring', stiffness: 260, damping: 18 }}
                    className="mb-1 text-[2.75rem] leading-none tracking-tight text-white"
                    style={{ fontFamily: '"Archivo Black", Fredoka, sans-serif' }}
                  >
                    $WORLD
                  </motion.h2>

                  <motion.div
                    initial={{ scale: 0, rotate: -12 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.12, type: 'spring', stiffness: 320, damping: 16 }}
                    className="relative mx-auto mb-3 mt-3 flex h-24 w-24 items-center justify-center"
                  >
                    <span
                      className="absolute inset-0 rounded-full"
                      style={{
                        background:
                          'conic-gradient(from 210deg, #fde68a, #14532d, #6ee7b7, #fbbf24, #fde68a)',
                        padding: 2,
                        opacity: 0.95,
                      }}
                    />
                    <span className="absolute inset-[3px] rounded-full bg-[#0a1f14]" />
                    <span className="relative text-5xl drop-shadow-[0_4px_12px_rgba(0,0,0,0.45)]">
                      🌎
                    </span>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-amber-300/40 bg-amber-400/15 px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-amber-100"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-300 shadow-[0_0_8px_rgba(252,211,77,0.9)]" />
                    Verified citizen
                  </motion.div>

                  <p
                    className="mb-5 text-lg font-black leading-snug text-white"
                    style={{ fontFamily: 'Fredoka, sans-serif' }}
                  >
                    I hold $WORLD.
                    <span className="block text-sm font-semibold text-emerald-100/90">
                      Exchange or chain — still a citizen.
                    </span>
                  </p>

                  <div className="mx-auto mb-4 grid max-w-[260px] grid-cols-2 gap-2 text-left">
                    <div className="rounded-2xl border border-white/10 bg-black/30 px-3 py-2.5">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-white/45">
                        Wallet
                      </p>
                      <p className="truncate font-mono text-sm font-bold text-amber-50">
                        {shareMoment.owner &&
                        shareMoment.owner !== '7xKQ9d2' &&
                        shareMoment.owner !== 'citizen'
                          ? shortWallet(shareMoment.owner)
                          : 'Holder'}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/30 px-3 py-2.5">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-white/45">
                        Population
                      </p>
                      <p className="text-sm font-black text-white">
                        {shareMoment.population > 0
                          ? formatNumber(shareMoment.population)
                          : '—'}
                      </p>
                    </div>
                  </div>

                  <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-emerald-200/85">
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

            <div
              className={`flex gap-2 p-3 ${
                isCitizen
                  ? 'bg-[#06140c]'
                  : 'bg-white'
              }`}
            >
              <button
                onClick={dismissShare}
                className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition ${
                  isCitizen
                    ? 'bg-white/10 text-white/85 hover:bg-white/15'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Close
              </button>
              <button
                onClick={onShareToX}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-black transition ${
                  isCitizen
                    ? 'bg-gradient-to-r from-amber-300 to-yellow-200 text-[#0a1f14] shadow-[0_0_24px_rgba(250,204,21,0.35)] hover:from-amber-200 hover:to-yellow-100'
                    : 'bg-slate-900 text-white hover:bg-slate-800'
                }`}
              >
                <Share2Icon size={15} /> {isCitizen ? 'Flex on X' : 'Share to X'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
