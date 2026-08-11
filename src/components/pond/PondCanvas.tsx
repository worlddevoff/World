import React, { useEffect, useId, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CopyIcon, CheckIcon, XIcon } from 'lucide-react';
import { usePond } from '../../contexts/PondContext';
import {
  POND_GOAL,
  POND_H,
  POND_W,
  labelForTier,
  type Fish,
  type HookCatch,
} from '../../data/pond';
import { formatCurrency, shortWallet } from '../../utils/format';

function darken(hex: string, amount: number): string {
  const n = hex.replace('#', '');
  if (n.length !== 6) return hex;
  const r = Math.max(0, parseInt(n.slice(0, 2), 16) - amount);
  const g = Math.max(0, parseInt(n.slice(2, 4), 16) - amount);
  const b = Math.max(0, parseInt(n.slice(4, 6), 16) - amount);
  return `rgb(${r},${g},${b})`;
}

function FishSprite({
  f,
  caught,
  selected,
  onSelect,
}: {
  f: Fish;
  caught?: boolean;
  selected?: boolean;
  onSelect?: (f: Fish) => void;
}) {
  const uid = useId().replace(/:/g, '');
  const len = 11 * f.size;
  const h = 4.2 * f.size;
  const tilt = caught ? -25 : Math.max(-18, Math.min(18, f.vy * 55));
  const bellyId = `belly-${uid}`;
  const bodyId = `body-${uid}`;

  // Depth cue: lower in pond = slightly dimmer / smaller feel
  const depth = Math.max(0, Math.min(1, f.y / POND_H));
  const depthFade = 1 - depth * 0.22;

  return (
    <g
      transform={`translate(${f.x}, ${f.y}) rotate(${tilt}) scale(${f.facing}, 1)`}
      opacity={(caught ? 1 : depthFade) * (caught ? 1 : 0.92)}
      style={{ cursor: onSelect ? 'pointer' : undefined }}
      onClick={
        onSelect
          ? (e) => {
              e.stopPropagation();
              onSelect(f);
            }
          : undefined
      }
    >
      {/* Generous hit target */}
      {onSelect && (
        <ellipse
          cx={0}
          cy={0}
          rx={len * 0.55}
          ry={h * 0.7}
          fill="#ffffff"
          opacity={0.001}
        />
      )}
      {selected && (
        <ellipse
          cx={0}
          cy={h * 0.15}
          rx={len * 0.55}
          ry={h * 0.55}
          fill="none"
          stroke="#fde68a"
          strokeWidth={0.55}
          opacity={0.95}
        />
      )}
      <defs>
        <linearGradient id={bodyId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={f.accent} />
          <stop offset="35%" stopColor={f.color} />
          <stop offset="100%" stopColor={darken(f.color, 40)} />
        </linearGradient>
        <linearGradient id={bellyId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={f.accent} stopOpacity="0.9" />
          <stop offset="100%" stopColor="#fafaf9" stopOpacity="0.75" />
        </linearGradient>
      </defs>

      {/* soft underwater shadow on bed */}
      {!caught && (
        <ellipse
          cx={0}
          cy={h * 0.85}
          rx={len * 0.42}
          ry={h * 0.22}
          fill="#0c4a6e"
          opacity={0.22 + depth * 0.15}
        />
      )}

      {/* caudal fin (tail) — forked */}
      <path
        d={`M ${-len * 0.38} 0
            L ${-len * 0.72} ${-h * 0.55}
            L ${-len * 0.52} 0
            L ${-len * 0.72} ${h * 0.55} Z`}
        fill={darken(f.color, 25)}
        opacity={0.95}
      />
      <path
        d={`M ${-len * 0.38} 0 L ${-len * 0.62} ${-h * 0.28} L ${-len * 0.62} ${h * 0.28} Z`}
        fill={f.accent}
        opacity={0.45}
      />

      {/* dorsal fin */}
      <path
        d={`M ${-len * 0.05} ${-h * 0.35}
            Q ${len * 0.08} ${-h * 1.05} ${len * 0.22} ${-h * 0.25}
            Q ${len * 0.05} ${-h * 0.45} ${-len * 0.05} ${-h * 0.35} Z`}
        fill={darken(f.color, 15)}
        opacity={0.85}
      />

      {/* main body — tapered fusiform */}
      <path
        d={`M ${len * 0.42} 0
            C ${len * 0.42} ${-h * 0.55} ${len * 0.1} ${-h * 0.72} ${-len * 0.05} ${-h * 0.55}
            C ${-len * 0.28} ${-h * 0.4} ${-len * 0.4} ${-h * 0.2} ${-len * 0.42} 0
            C ${-len * 0.4} ${h * 0.2} ${-len * 0.28} ${h * 0.4} ${-len * 0.05} ${h * 0.55}
            C ${len * 0.1} ${h * 0.72} ${len * 0.42} ${h * 0.55} ${len * 0.42} 0 Z`}
        fill={`url(#${bodyId})`}
      />

      {/* pale belly */}
      <ellipse
        cx={len * 0.02}
        cy={h * 0.18}
        rx={len * 0.28}
        ry={h * 0.28}
        fill={`url(#${bellyId})`}
        opacity={0.7}
      />

      {/* lateral line */}
      <path
        d={`M ${-len * 0.28} 0 Q 0 ${h * 0.06} ${len * 0.28} ${-h * 0.02}`}
        fill="none"
        stroke="#0f172a"
        strokeWidth={0.2 * f.size}
        opacity={0.25}
      />

      {/* scale shimmer rows */}
      {[-0.12, 0, 0.12].map((oy, i) => (
        <path
          key={i}
          d={`M ${-len * 0.2} ${oy * h} Q 0 ${oy * h + 0.15} ${len * 0.18} ${oy * h - 0.1}`}
          fill="none"
          stroke="#ffffff"
          strokeWidth={0.15}
          opacity={0.12 + i * 0.04}
        />
      ))}

      {/* pectoral fin */}
      <path
        d={`M ${len * 0.02} ${h * 0.1}
            Q ${len * 0.12} ${h * 0.55} ${-len * 0.02} ${h * 0.5}
            Q ${len * 0.0} ${h * 0.25} ${len * 0.02} ${h * 0.1} Z`}
        fill={f.accent}
        opacity={0.65}
      />

      {/* gill cover hint */}
      <path
        d={`M ${len * 0.18} ${-h * 0.25} Q ${len * 0.08} 0 ${len * 0.18} ${h * 0.28}`}
        fill="none"
        stroke={darken(f.color, 50)}
        strokeWidth={0.35}
        opacity={0.55}
      />

      {/* eye */}
      <circle cx={len * 0.28} cy={-h * 0.08} r={Math.max(0.55, h * 0.16)} fill="#f8fafc" />
      <circle
        cx={len * 0.3}
        cy={-h * 0.08}
        r={Math.max(0.35, h * 0.1)}
        fill="#0f172a"
      />
      <circle
        cx={len * 0.32}
        cy={-h * 0.11}
        r={Math.max(0.12, h * 0.035)}
        fill="#fff"
        opacity={0.9}
      />

      {/* mouth notch */}
      <path
        d={`M ${len * 0.4} ${h * 0.05} Q ${len * 0.36} ${h * 0.12} ${len * 0.32} ${h * 0.08}`}
        fill="none"
        stroke={darken(f.color, 60)}
        strokeWidth={0.25}
        opacity={0.5}
      />

      {/* koi blotch on larger fish */}
      {(f.tier === 'fish' || f.tier === 'bass') && (
        <ellipse
          cx={-len * 0.02}
          cy={-h * 0.12}
          rx={len * 0.1}
          ry={h * 0.14}
          fill="#fafaf9"
          opacity={0.35}
        />
      )}
      {f.tier === 'whale' && (
        <>
          <ellipse cx={len * 0.05} cy={h * 0.05} rx={len * 0.14} ry={h * 0.12} fill="#000" opacity={0.12} />
          <ellipse cx={-len * 0.1} cy={-h * 0.15} rx={len * 0.08} ry={h * 0.1} fill="#fff" opacity={0.1} />
        </>
      )}
    </g>
  );
}

function LilyPad({ cx, cy, r, rot = 0 }: { cx: number; cy: number; r: number; rot?: number }) {
  return (
    <g transform={`translate(${cx},${cy}) rotate(${rot})`}>
      <path
        d={`M 0 ${-r}
            A ${r} ${r * 0.55} 0 1 1 0 ${r}
            A ${r} ${r * 0.55} 0 1 1 0 ${-r}
            M 0 0 L ${r * 0.15} ${-r * 0.1}`}
        fill="#3f6212"
        opacity={0.9}
      />
      <path
        d={`M 0 ${-r * 0.85}
            A ${r * 0.85} ${r * 0.45} 0 1 1 0 ${r * 0.85}
            A ${r * 0.85} ${r * 0.45} 0 1 1 0 ${-r * 0.85}`}
        fill="#4d7c0f"
        opacity={0.75}
      />
      {/* notch */}
      <path
        d={`M 0 0 L ${r * 0.95} ${-r * 0.12} L ${r * 0.95} ${r * 0.12} Z`}
        fill="#1a2e05"
        opacity={0.35}
      />
    </g>
  );
}

function HookOverlay({ hook }: { hook: HookCatch }) {
  const { fish: f, t, phase } = hook;
  const dropY = phase === 'drop' ? -18 + (f.y + 18) * Math.min(1, t / 0.35) : f.y;
  const liftY =
    phase === 'lift'
      ? f.y - (f.y + 28) * Math.min(1, (t - 0.55) / 0.45)
      : dropY;
  const hookY = phase === 'grab' ? f.y : phase === 'lift' ? liftY : dropY;
  const fishY = phase === 'drop' ? f.y : hookY;
  const shake = phase === 'grab' ? Math.sin(t * 55) * 1.4 : 0;
  const fishX = f.x + shake;

  return (
    <g>
      {/* fishing line */}
      <line
        x1={f.x}
        y1={-22}
        x2={f.x + shake * 0.3}
        y2={hookY}
        stroke="#d6d3d1"
        strokeWidth={0.35}
        strokeLinecap="round"
        opacity={0.9}
      />
      <line
        x1={f.x}
        y1={-22}
        x2={f.x + shake * 0.3}
        y2={hookY}
        stroke="#78716c"
        strokeWidth={0.15}
        opacity={0.5}
      />

      {/* metal hook */}
      <g transform={`translate(${f.x + shake * 0.3}, ${hookY})`}>
        <path
          d="M0 0 L0 2.8 Q0.2 6.2 2.8 6.4 Q5.2 6.4 5.2 3.8"
          fill="none"
          stroke="#a8a29e"
          strokeWidth={0.65}
          strokeLinecap="round"
        />
        <path
          d="M0 0 L0 2.8 Q0.2 6.2 2.8 6.4 Q5.2 6.4 5.2 3.8"
          fill="none"
          stroke="#f5f5f4"
          strokeWidth={0.2}
          opacity={0.7}
        />
        <circle cx={0} cy={0} r={0.7} fill="#e7e5e4" stroke="#78716c" strokeWidth={0.2} />
        {/* barb */}
        <path d="M4.2 5.2 L5.4 4.2" stroke="#a8a29e" strokeWidth={0.35} />
      </g>

      {(phase === 'grab' || phase === 'lift') && (
        <g transform={`translate(${fishX - f.x}, ${fishY - f.y})`}>
          <FishSprite f={{ ...f, facing: f.facing }} caught />
        </g>
      )}

      {/* splash rings on grab */}
      {phase === 'grab' && (
        <>
          <motion.ellipse
            cx={f.x}
            cy={f.y}
            rx={3}
            ry={1.4}
            fill="none"
            stroke="#e0f2fe"
            strokeWidth={0.35}
            initial={{ opacity: 0.7, scale: 0.4 }}
            animate={{ opacity: 0, scale: 2.8 }}
            transition={{ duration: 0.55 }}
          />
          <motion.ellipse
            cx={f.x}
            cy={f.y}
            rx={2}
            ry={0.9}
            fill="none"
            stroke="#bae6fd"
            strokeWidth={0.25}
            initial={{ opacity: 0.6, scale: 0.3 }}
            animate={{ opacity: 0, scale: 2.2 }}
            transition={{ duration: 0.7, delay: 0.05 }}
          />
          {Array.from({ length: 6 }).map((_, i) => {
            const a = (i / 6) * Math.PI * 2;
            return (
              <motion.circle
                key={i}
                cx={f.x}
                cy={f.y}
                r={0.35}
                fill="#e0f2fe"
                initial={{ opacity: 0.8, x: 0, y: 0 }}
                animate={{
                  opacity: 0,
                  x: Math.cos(a) * 4,
                  y: Math.sin(a) * 2 - 1.5,
                }}
                transition={{ duration: 0.5 }}
              />
            );
          })}
        </>
      )}
    </g>
  );
}

function FishInspector({
  fish,
  onClose,
}: {
  fish: Fish;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const copyWallet = async () => {
    try {
      await navigator.clipboard.writeText(fish.wallet);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8 }}
      className="pointer-events-auto absolute bottom-6 left-1/2 z-30 w-[min(22rem,calc(100vw-1.5rem))] -translate-x-1/2 rounded-2xl border border-amber-200/40 bg-[#0f2f35]/95 p-3 text-left shadow-2xl backdrop-blur"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-sky-300/80">
            Fish owner
          </p>
          <p className="text-sm font-black text-white">
            {labelForTier(fish.tier)} · {formatCurrency(fish.amount)} buy
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-white/10 p-1.5 text-white/80 transition hover:bg-white/20"
          aria-label="Close"
        >
          <XIcon size={14} />
        </button>
      </div>

      <div className="rounded-xl border border-white/10 bg-black/35 px-2.5 py-2">
        <p className="mb-1 text-[10px] font-bold uppercase text-white/45">Wallet</p>
        <p className="break-all font-mono text-[11px] font-semibold leading-snug text-amber-100">
          {fish.wallet}
        </p>
        <p className="mt-1 text-[10px] text-white/50">{shortWallet(fish.wallet)}</p>
      </div>

      <button
        type="button"
        onClick={() => void copyWallet()}
        className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl bg-amber-400 py-2 text-xs font-black text-stone-950 transition hover:bg-amber-300"
      >
        {copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
        {copied ? 'Copied' : 'Copy wallet'}
      </button>
    </motion.div>
  );
}

export function PondCanvas() {
  const { fish, hook, pump, events } = usePond();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const hideSwimId =
    hook && (hook.phase === 'grab' || hook.phase === 'lift')
      ? hook.fish.id
      : null;

  const selected = useMemo(
    () => fish.find((f) => f.id === selectedId) ?? null,
    [fish, selectedId],
  );

  // Clear selection if that fish was hooked out
  useEffect(() => {
    if (selectedId && !fish.some((f) => f.id === selectedId)) {
      setSelectedId(null);
    }
  }, [fish, selectedId]);

  const sortedFish = useMemo(
    () =>
      [...fish]
        .filter((f) => f.id !== hideSwimId)
        .sort((a, b) => a.y - b.y),
    [fish, hideSwimId],
  );

  const caustics = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        cx: 18 + ((i * 17) % (POND_W - 36)),
        cy: 16 + ((i * 11) % (POND_H - 32)),
        delay: i * 0.45,
        dur: 3.2 + (i % 3) * 0.6,
      })),
    [],
  );

  const waterRx = POND_W * 0.47;
  const waterRy = POND_H * 0.42;

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#1a3310]">
      {/* Sky */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, #87b7d9 0%, #a8cfe6 14%, #6a9f5a 38%, #3d6b2e 58%, #2a4a1f 100%)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[28%]"
        style={{
          background:
            'radial-gradient(ellipse at 75% 18%, rgba(255,244,214,0.65), transparent 40%)',
        }}
      />

      <svg
        viewBox={`0 0 ${POND_W} ${POND_H}`}
        className="relative z-10 h-full w-full"
        preserveAspectRatio="xMidYMid meet"
        onClick={() => setSelectedId(null)}
      >
        <defs>
          <radialGradient id="pondDeep" cx="45%" cy="40%" r="70%">
            <stop offset="0%" stopColor="#4a8fa8" />
            <stop offset="40%" stopColor="#2a6b7a" />
            <stop offset="75%" stopColor="#1a4a52" />
            <stop offset="100%" stopColor="#0f2f35" />
          </radialGradient>
          <radialGradient id="pondSurface" cx="40%" cy="30%" r="55%">
            <stop offset="0%" stopColor="#c5e4f0" stopOpacity="0.35" />
            <stop offset="50%" stopColor="#7eb8c9" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#1a4a52" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="mudBank" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5c4a32" />
            <stop offset="100%" stopColor="#3d2f1f" />
          </linearGradient>
          <linearGradient id="grassRim" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5a8f3c" />
            <stop offset="100%" stopColor="#3d6b28" />
          </linearGradient>
          <filter id="softBlur" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="0.35" />
          </filter>
          <clipPath id="pondClip">
            <ellipse cx={POND_W / 2} cy={POND_H / 2} rx={waterRx} ry={waterRy} />
          </clipPath>
        </defs>

        {/* Earth / grass around pond */}
        <ellipse
          cx={POND_W / 2}
          cy={POND_H / 2 + 2}
          rx={POND_W * 0.495}
          ry={POND_H * 0.46}
          fill="url(#grassRim)"
        />
        <ellipse
          cx={POND_W / 2}
          cy={POND_H / 2 + 1.5}
          rx={POND_W * 0.48}
          ry={POND_H * 0.44}
          fill="url(#mudBank)"
          opacity={0.85}
        />

        {/* Shore pebbles */}
        {[
          [22, 58],
          [28, 72],
          [140, 54],
          [148, 70],
          [36, 34],
          [132, 82],
          [50, 88],
          [118, 30],
        ].map(([x, y], i) => (
          <ellipse
            key={i}
            cx={x}
            cy={y}
            rx={1.3 + (i % 3) * 0.4}
            ry={0.8 + (i % 2) * 0.3}
            fill={i % 2 === 0 ? '#78716c' : '#a8a29e'}
            opacity={0.7}
            pointerEvents="none"
          />
        ))}

        {/* Water body */}
        <ellipse
          cx={POND_W / 2}
          cy={POND_H / 2}
          rx={waterRx}
          ry={waterRy}
          fill="url(#pondDeep)"
        />

        <g clipPath="url(#pondClip)">
          {/* submerged weeds */}
          {[40, 60, 85, 110, 125].map((x, i) => (
            <path
              key={x}
              d={`M${x} ${POND_H * 0.72}
                  Q${x + (i % 2 === 0 ? 4 : -4)} ${POND_H * 0.55} ${x} ${POND_H * 0.38}
                  Q${x + (i % 2 === 0 ? -3 : 3)} ${POND_H * 0.5} ${x} ${POND_H * 0.72}`}
              fill="#14532d"
              opacity={0.35}
              filter="url(#softBlur)"
              pointerEvents="none"
            />
          ))}

          {/* bed silt mottling */}
          <ellipse cx={60} cy={68} rx={28} ry={12} fill="#0f3d4c" opacity={0.25} pointerEvents="none" />
          <ellipse cx={110} cy={42} rx={22} ry={10} fill="#0f3d4c" opacity={0.2} pointerEvents="none" />

          {/* caustic light */}
          {caustics.map((c, i) => (
            <motion.ellipse
              key={i}
              cx={c.cx}
              cy={c.cy}
              rx={6}
              ry={2.6}
              fill="#e0f2fe"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.14, 0.04, 0.12, 0] }}
              transition={{ duration: c.dur, delay: c.delay, repeat: Infinity }}
              style={{ pointerEvents: 'none' }}
            />
          ))}

          {/* fish — painter's algorithm by y */}
          {sortedFish.map((f) => (
            <FishSprite
              key={f.id}
              f={f}
              selected={f.id === selectedId}
              onSelect={(picked) => setSelectedId(picked.id)}
            />
          ))}
        </g>

        {/* Surface sheen — must not steal clicks */}
        <g pointerEvents="none">
          <ellipse
            cx={POND_W / 2}
            cy={POND_H / 2}
            rx={waterRx}
            ry={waterRy}
            fill="url(#pondSurface)"
          />
          <motion.ellipse
            cx={POND_W / 2 - 12}
            cy={POND_H / 2 - 12}
            rx={32}
            ry={8}
            fill="#ffffff"
            animate={{
              opacity: [0.06, 0.12, 0.06],
              cx: [POND_W / 2 - 14, POND_W / 2 - 6, POND_W / 2 - 14],
            }}
            transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          />

          <ellipse
            cx={POND_W / 2}
            cy={POND_H / 2}
            rx={waterRx}
            ry={waterRy}
            fill="none"
            stroke="#a3b18a"
            strokeWidth={0.7}
            opacity={0.45}
          />
          <ellipse
            cx={POND_W / 2}
            cy={POND_H / 2}
            rx={waterRx + 0.8}
            ry={waterRy + 0.8}
            fill="none"
            stroke="#2d4a22"
            strokeWidth={1.2}
            opacity={0.5}
          />

          <LilyPad cx={28} cy={78} r={5.5} rot={-20} />
          <LilyPad cx={142} cy={32} r={4.5} rot={35} />
          <LilyPad cx={128} cy={80} r={3.8} rot={10} />
          <LilyPad cx={48} cy={36} r={3.2} rot={-8} />
          <circle cx={28} cy={78} r={0.85} fill="#f8fafc" opacity={0.85} />
          <circle cx={28} cy={78} r={0.4} fill="#fbbf24" />

          {[16, 20, 24, 144, 148, 152].map((x, i) => (
            <g key={x}>
              <path
                d={`M${x} ${POND_H - 8}
                    Q${x + (i % 2 === 0 ? 2 : -2)} ${POND_H - 30} ${x} ${POND_H - 48}`}
                fill="none"
                stroke="#3f6212"
                strokeWidth={0.65}
                strokeLinecap="round"
              />
              <ellipse
                cx={x}
                cy={POND_H - 50}
                rx={0.85}
                ry={2.6}
                fill="#78350f"
                opacity={0.9}
              />
            </g>
          ))}
        </g>

        <AnimatePresence>{hook && <HookOverlay hook={hook} />}</AnimatePresence>
      </svg>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-col items-center px-4 pt-4 text-center">
        <p
          className="text-2xl font-black tracking-tight text-[#1a2e05] drop-shadow-sm sm:text-3xl"
          style={{ fontFamily: 'Fredoka, sans-serif' }}
        >
          One pond. Everyone feeds it.
        </p>
        <p className="mt-1 max-w-md text-sm font-semibold text-[#1a2e05]/80">
          {POND_GOAL}
        </p>
        <div className="mt-2 rounded-full border border-white/35 bg-[#0f2f35]/70 px-4 py-1.5 text-xs font-bold text-sky-50 shadow backdrop-blur">
          🐠 {fish.length} fish · tap a fish to see its wallet
          {pump.marketCapUsd != null && pump.marketCapUsd > 0 ? ' · live' : ''}
        </div>
      </div>

      <AnimatePresence>
        {selected && (
          <FishInspector fish={selected} onClose={() => setSelectedId(null)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!selected && events[0] && events[0].ts > Date.now() - 2400 && (
          <motion.div
            key={events[0].id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute bottom-6 left-1/2 z-20 -translate-x-1/2 rounded-2xl border border-sky-200/40 bg-[#0f2f35]/90 px-4 py-2 text-center text-sm font-bold text-sky-50 shadow-lg backdrop-blur"
          >
            {events[0].emoji} {events[0].label}
            <span className="mt-0.5 block text-[10px] font-semibold text-sky-200/80">
              {shortWallet(events[0].wallet)}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
