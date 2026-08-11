import React, { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useCastle } from '../../contexts/CastleContext';
import { CASTLE_GOAL } from '../../data/castleStages';
import { shortWallet } from '../../utils/format';

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

function StoneBrick({
  x,
  y,
  w,
  h,
  shade = 0,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  shade?: number;
}) {
  const base = shade > 0.5 ? '#78716c' : shade > 0 ? '#a8a29e' : '#d6d3d1';
  const edge = shade > 0.5 ? '#44403c' : '#57534e';
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill={base} stroke={edge} strokeWidth={0.6} />
      <rect x={x + 1} y={y + 1} width={w * 0.35} height={h - 2} fill="#ffffff" opacity={0.08} />
    </g>
  );
}

function Flag({
  x,
  y,
  hue,
  delay = 0,
}: {
  x: number;
  y: number;
  hue: string;
  delay?: number;
}) {
  return (
    <g transform={`translate(${x},${y})`}>
      <line x1={0} y1={0} x2={0} y2={28} stroke="#44403c" strokeWidth={1.6} />
      <motion.path
        d="M0 2 L18 7 L0 12 Z"
        fill={hue}
        animate={{ d: ['M0 2 L18 7 L0 12 Z', 'M0 2 L16 5 L0 12 Z', 'M0 2 L18 7 L0 12 Z'] }}
        transition={{ duration: 2.2, repeat: Infinity, delay, ease: 'easeInOut' }}
      />
    </g>
  );
}

function Torch({ x, y, lit }: { x: number; y: number; lit: boolean }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <rect x={-1.5} y={0} width={3} height={10} fill="#78350f" />
      {lit && (
        <>
          <motion.ellipse
            cx={0}
            cy={-2}
            rx={8}
            ry={8}
            fill="#fbbf24"
            animate={{ opacity: [0.15, 0.35, 0.15], scale: [0.9, 1.1, 0.9] }}
            transition={{ duration: 1.4, repeat: Infinity }}
          />
          <motion.path
            d="M0 -8 Q3 -2 0 2 Q-3 -2 0 -8"
            fill="#f97316"
            animate={{ scaleY: [1, 1.15, 0.95, 1], scaleX: [1, 0.9, 1.05, 1] }}
            transition={{ duration: 0.55, repeat: Infinity }}
            style={{ transformOrigin: '0px 0px' }}
          />
          <path d="M0 -6 Q1.5 -3 0 0 Q-1.5 -3 0 -6" fill="#fde68a" />
        </>
      )}
    </g>
  );
}

/** Epic growing keep — stages paint in as market cap fills each bar. */
export function CastleCanvas() {
  const { stages, activeIndex, pulse, totalFill, sessionStones, expansionLevel } =
    useCastle();

  const fill = (id: string) =>
    stages.find((s) => s.def.id === id)?.fill ?? 0;

  const foundation = fill('foundation');
  const walls = fill('walls');
  const towers = fill('towers');
  const bridges = fill('bridges');
  const throne = fill('throne');
  const dungeon = fill('dungeon');

  const active = stages[activeIndex];
  const sagaPastDungeon = dungeon >= 1 || expansionLevel > 0;
  const drama = throne > 0.5 || sagaPastDungeon;
  const night = dungeon > 0.7 || expansionLevel > 0;

  const sky = useMemo(() => {
    if (night) {
      return {
        background: [
          'radial-gradient(ellipse at 70% 12%, rgba(253,224,71,0.35), transparent 32%)',
          'radial-gradient(ellipse at 20% 30%, rgba(56,189,248,0.12), transparent 40%)',
          'linear-gradient(180deg, #020617 0%, #0f172a 38%, #1e293b 62%, #334155 100%)',
        ].join(', '),
      };
    }
    if (drama) {
      return {
        background:
          'linear-gradient(180deg, #7c2d12 0%, #c2410c 22%, #f59e0b 48%, #fde68a 68%, #86efac 100%)',
      };
    }
    return {
      background:
        'linear-gradient(180deg, #0ea5e9 0%, #38bdf8 28%, #7dd3fc 52%, #86efac 78%, #4ade80 100%)',
    };
  }, [night, drama]);

  // Foundation stones appear left→right
  const foundationBricks = Math.floor(lerp(2, 14, foundation));

  return (
    <div className="relative h-full w-full overflow-hidden" style={sky}>
      {/* Atmospheric layers */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 70%, rgba(15,23,42,0.12), transparent 55%)',
        }}
      />
      {!night && (
        <motion.div
          className="pointer-events-none absolute rounded-full"
          style={{
            width: 88,
            height: 88,
            left: '72%',
            top: '10%',
            background:
              'radial-gradient(circle, #fff7cc 0%, #fde047 40%, transparent 70%)',
            boxShadow: '0 0 60px #fde04788',
          }}
          animate={{ y: [0, 4, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
      {night &&
        Array.from({ length: 28 }).map((_, i) => (
          <motion.span
            key={i}
            className="pointer-events-none absolute rounded-full bg-white"
            style={{
              left: `${(i * 37 + 11) % 96}%`,
              top: `${(i * 53 + 7) % 42}%`,
              width: 1 + (i % 3),
              height: 1 + (i % 3),
            }}
            animate={{ opacity: [0.25, 0.95, 0.35] }}
            transition={{
              duration: 2 + (i % 5) * 0.4,
              delay: (i % 7) * 0.2,
              repeat: Infinity,
            }}
          />
        ))}

      {/* Distant hills */}
      <svg
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] w-full"
        viewBox="0 0 400 200"
        preserveAspectRatio="none"
      >
        <path
          d="M0 120 Q60 70 120 100 T240 90 T400 110 L400 200 L0 200 Z"
          fill={night ? '#1e293b' : '#166534'}
          opacity={0.55}
        />
        <path
          d="M0 150 Q80 110 160 140 T320 130 T400 155 L400 200 L0 200 Z"
          fill={night ? '#0f172a' : '#14532d'}
          opacity={0.85}
        />
      </svg>

      <svg
        viewBox="0 0 440 360"
        className="relative z-10 mx-auto h-full w-full max-w-5xl drop-shadow-2xl"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="stoneFace" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#e7e5e4" />
            <stop offset="55%" stopColor="#a8a29e" />
            <stop offset="100%" stopColor="#78716c" />
          </linearGradient>
          <linearGradient id="stoneSide" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#78716c" />
            <stop offset="100%" stopColor="#44403c" />
          </linearGradient>
          <linearGradient id="roofRed" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#7f1d1d" />
          </linearGradient>
          <linearGradient id="moat" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#0369a1" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id="goldGlow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fde68a" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>
          <filter id="softGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Moat with shimmer */}
        <ellipse cx="220" cy="302" rx="168" ry="28" fill="url(#moat)" />
        <motion.ellipse
          cx="220"
          cy="300"
          rx="150"
          ry="18"
          fill="#bae6fd"
          animate={{ opacity: [0.15, 0.35, 0.15], rx: [148, 152, 148] }}
          transition={{ duration: 3.5, repeat: Infinity }}
        />

        {/* Island mound */}
        <ellipse cx="220" cy="286" rx="142" ry="22" fill={night ? '#365314' : '#15803d'} />
        <ellipse
          cx="220"
          cy="282"
          rx="120"
          ry="14"
          fill={night ? '#3f6212' : '#22c55e'}
          opacity={0.45}
        />

        {/* 🐉 Secret dungeon — glowing undercroft + eyes */}
        <g opacity={lerp(0, 1, dungeon)}>
          <motion.ellipse
            cx="220"
            cy="275"
            rx={lerp(20, 55, dungeon)}
            ry={8}
            fill="#7f1d1d"
            filter="url(#softGlow)"
            animate={{ opacity: [0.35, 0.75, 0.35] }}
            transition={{ duration: 2.2, repeat: Infinity }}
          />
          <path
            d="M190 270 Q220 255 250 270 L245 278 Q220 268 195 278 Z"
            fill="#1c1917"
            opacity={0.85}
          />
          {dungeon > 0.35 && (
            <>
              <motion.circle
                cx="208"
                cy="268"
                r="3"
                fill="#f87171"
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1.6, repeat: Infinity }}
              />
              <motion.circle
                cx="232"
                cy="268"
                r="3"
                fill="#f87171"
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1.6, repeat: Infinity, delay: 0.2 }}
              />
            </>
          )}
          {dungeon > 0.75 && (
            <text x="220" y="258" textAnchor="middle" fontSize="16">
              🐉
            </text>
          )}
        </g>

        {/* 🧱 Foundation — stacked stone blocks */}
        <g>
          {Array.from({ length: foundationBricks }).map((_, i) => {
            const row = Math.floor(i / 7);
            const col = i % 7;
            const x = 130 + col * 26 + (row % 2) * 8;
            const y = 252 - row * 12;
            return (
              <motion.g
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <StoneBrick x={x} y={y} w={24} h={11} shade={(i + row) % 3 === 0 ? 0.6 : 0.2} />
              </motion.g>
            );
          })}
          {foundation > 0.05 && foundation < 0.25 && (
            <text x="220" y="248" textAnchor="middle" fontSize="11" opacity={0.7}>
              🧱
            </text>
          )}
        </g>

        {/* 🏰 Curtain walls + gatehouse */}
        <g opacity={walls > 0.02 ? lerp(0.15, 1, walls) : 0}>
          {/* Main wall body with faux depth */}
          <path
            d="M120 252 L120 168 L320 168 L320 252 Z"
            fill="url(#stoneFace)"
            stroke="#44403c"
            strokeWidth={2}
          />
          <path
            d="M320 168 L338 178 L338 258 L320 252 Z"
            fill="url(#stoneSide)"
            stroke="#292524"
            strokeWidth={1.2}
          />
          {/* Masonry lines */}
          {Array.from({ length: 6 }).map((_, i) => (
            <line
              key={`mh${i}`}
              x1={124}
              y1={180 + i * 12}
              x2={316}
              y2={180 + i * 12}
              stroke="#57534e"
              strokeWidth={0.5}
              opacity={0.45}
            />
          ))}
          {Array.from({ length: 10 }).map((_, i) => (
            <line
              key={`mv${i}`}
              x1={140 + i * 18}
              y1={170}
              x2={140 + i * 18}
              y2={250}
              stroke="#57534e"
              strokeWidth={0.4}
              opacity={0.3}
            />
          ))}
          {/* Crenellations */}
          {Array.from({ length: 10 }).map((_, i) => (
            <rect
              key={`c${i}`}
              x={122 + i * 20}
              y={154}
              width={12}
              height={16}
              fill={i % 2 === 0 ? '#d6d3d1' : '#a8a29e'}
              stroke="#44403c"
              strokeWidth={1}
              opacity={walls > i / 10 ? 1 : 0.12}
            />
          ))}
          {/* Gate arch */}
          <path
            d="M198 252 L198 210 Q220 188 242 210 L242 252 Z"
            fill="#1c1917"
            opacity={0.75}
          />
          <path
            d="M202 252 L202 212 Q220 194 238 212 L238 252"
            fill="none"
            stroke="#a8a29e"
            strokeWidth={2}
          />
          {/* Portcullis hints */}
          {walls > 0.4 &&
            [0, 1, 2, 3].map((i) => (
              <line
                key={`pc${i}`}
                x1={206 + i * 8}
                y1={215}
                x2={206 + i * 8}
                y2={252}
                stroke="#78716c"
                strokeWidth={1.2}
                opacity={0.7}
              />
            ))}
          <Torch x={188} y={200} lit={walls > 0.55 || night} />
          <Torch x={252} y={200} lit={walls > 0.55 || night} />
        </g>

        {/* 🗼 Towers */}
        <g opacity={towers > 0.02 ? lerp(0.2, 1, towers) : 0}>
          {/* Left tower */}
          <rect x="96" y="130" width="40" height="124" fill="url(#stoneFace)" stroke="#44403c" strokeWidth={2} />
          <path d="M136 130 L150 140 L150 250 L136 252 Z" fill="url(#stoneSide)" />
          <polygon points="96,130 116,98 136,130" fill="url(#roofRed)" stroke="#7f1d1d" />
          <polygon points="136,130 150,140 130,108 116,98" fill="#991b1b" />
          {/* Right tower */}
          <rect x="304" y="130" width="40" height={124} fill="url(#stoneFace)" stroke="#44403c" strokeWidth={2} />
          <path d="M344 130 L358 140 L358 250 L344 252 Z" fill="url(#stoneSide)" />
          <polygon points="304,130 324,98 344,130" fill="url(#roofRed)" stroke="#7f1d1d" />
          <polygon points="344,130 358,140 338,108 324,98" fill="#991b1b" />
          {/* Keep */}
          <rect
            x="188"
            y="108"
            width="64"
            height="80"
            fill="url(#stoneFace)"
            stroke="#44403c"
            strokeWidth={2}
            opacity={lerp(0.25, 1, towers)}
          />
          <path
            d="M252 108 L268 118 L268 184 L252 188 Z"
            fill="url(#stoneSide)"
            opacity={lerp(0.25, 1, towers)}
          />
          <polygon
            points="188,108 220,72 252,108"
            fill="url(#roofRed)"
            opacity={lerp(0.25, 1, towers)}
          />
          <polygon
            points="252,108 268,118 240,88 220,72"
            fill="#991b1b"
            opacity={lerp(0.25, 1, towers)}
          />
          {/* Windows / arrow slits */}
          {[0, 1, 2].map((i) => (
            <React.Fragment key={i}>
              <rect x={108} y={150 + i * 28} width={8} height={14} rx={1} fill="#0f172a" opacity={towers} />
              <rect x={318} y={150 + i * 28} width={8} height={14} rx={1} fill="#0f172a" opacity={towers} />
            </React.Fragment>
          ))}
          <rect x={208} y={128} width={10} height={16} rx={1} fill="#0f172a" opacity={towers} />
          <rect x={228} y={128} width={10} height={16} rx={1} fill="#0f172a" opacity={towers} />
          {towers > 0.4 && (
            <>
              <Flag x={116} y={90} hue="#dc2626" delay={0} />
              <Flag x={324} y={90} hue="#2563eb" delay={0.4} />
              <Flag x={220} y={64} hue="#fbbf24" delay={0.8} />
            </>
          )}
          <Torch x={106} y={148} lit={towers > 0.5 || night} />
          <Torch x={334} y={148} lit={towers > 0.5 || night} />
        </g>

        {/* 🌉 Drawbridge + causeway */}
        <g opacity={bridges > 0.02 ? lerp(0.15, 1, bridges) : 0}>
          {/* Chains */}
          <line
            x1="242"
            y1="220"
            x2={lerp(248, 300, bridges)}
            y2={lerp(230, 278, bridges)}
            stroke="#a8a29e"
            strokeWidth={1.2}
            strokeDasharray="3 2"
          />
          <line
            x1="198"
            y1="220"
            x2={lerp(192, 300, bridges)}
            y2={lerp(230, 286, bridges)}
            stroke="#a8a29e"
            strokeWidth={1.2}
            strokeDasharray="3 2"
            opacity={0.5}
          />
          {/* Planks */}
          <motion.path
            d={`M210 250 Q${lerp(240, 280, bridges)} ${lerp(260, 275, bridges)} ${lerp(250, 340, bridges)} ${lerp(270, 292, bridges)}`}
            fill="none"
            stroke="#92400e"
            strokeWidth={14}
            strokeLinecap="round"
            initial={false}
          />
          <path
            d={`M210 250 Q${lerp(240, 280, bridges)} ${lerp(260, 275, bridges)} ${lerp(250, 340, bridges)} ${lerp(270, 292, bridges)}`}
            fill="none"
            stroke="#b45309"
            strokeWidth={2}
            strokeDasharray="5 4"
            opacity={0.8}
          />
          {[0.25, 0.5, 0.75].map((t) => (
            <circle
              key={t}
              cx={lerp(210, lerp(250, 340, bridges), t)}
              cy={lerp(250, lerp(270, 292, bridges), t) + 6}
              r={2}
              fill="#78350f"
              opacity={bridges > t ? 0.8 : 0}
            />
          ))}
        </g>

        {/* 👑 Throne room — stained glass + crown aura */}
        <g opacity={throne > 0.02 ? lerp(0.2, 1, throne) : 0}>
          <motion.ellipse
            cx="220"
            cy="100"
            rx={lerp(10, 36, throne)}
            ry={lerp(8, 22, throne)}
            fill="#fbbf24"
            filter="url(#softGlow)"
            animate={{ opacity: [0.2, 0.55, 0.2] }}
            transition={{ duration: 2.4, repeat: Infinity }}
          />
          {/* Rose window */}
          <circle cx="220" cy="142" r={lerp(6, 16, throne)} fill="#1e3a8a" stroke="#fbbf24" strokeWidth={2} />
          <circle cx="220" cy="142" r={lerp(3, 8, throne)} fill="#0ea5e9" opacity={0.75} />
          {[0, 60, 120, 180, 240, 300].map((deg) => {
            const rad = (deg * Math.PI) / 180;
            return (
              <line
                key={deg}
                x1={220}
                y1={142}
                x2={220 + Math.cos(rad) * lerp(5, 14, throne)}
                y2={142 + Math.sin(rad) * lerp(5, 14, throne)}
                stroke="#fde68a"
                strokeWidth={1}
                opacity={throne}
              />
            );
          })}
          {/* Banner */}
          <rect x="212" y="168" width="16" height={lerp(10, 36, throne)} fill="url(#goldGlow)" rx={1} />
          <path
            d={`M212 ${168 + lerp(10, 36, throne)} L220 ${168 + lerp(16, 48, throne)} L228 ${168 + lerp(10, 36, throne)}`}
            fill="#b45309"
          />
          <motion.text
            x="220"
            y="88"
            textAnchor="middle"
            fontSize={lerp(14, 26, throne)}
            animate={throne > 0.4 ? { y: [86, 82, 86] } : { y: 88 }}
            transition={{ duration: 2.2, repeat: Infinity }}
          >
            👑
          </motion.text>
        </g>

        {/* Buy pulse — glowing stones */}
        <AnimatePresence>
          {pulse &&
            Array.from({ length: Math.min(pulse.stones, 7) }).map((_, i) => (
              <motion.g
                key={`${pulse.id}-${i}`}
                initial={{ opacity: 0, x: 160 + i * 16, y: 30 }}
                animate={{
                  opacity: [0, 1, 1, 0],
                  y: [30, 90, 160, 230],
                  x: 160 + i * 16 + (i % 2 === 0 ? 8 : -6),
                }}
                transition={{ duration: 1.5, delay: i * 0.07 }}
              >
                <rect width="12" height="9" rx="1" fill="#a8a29e" stroke="#57534e" />
                <rect width="4" height="7" x="1" y="1" fill="#fff" opacity={0.2} />
              </motion.g>
            ))}
        </AnimatePresence>
      </svg>

      {/* Overlay copy */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-col items-center px-4 pt-5 text-center">
        <p
          className={`text-2xl font-black tracking-tight drop-shadow-md sm:text-3xl ${
            night ? 'text-amber-50' : 'text-slate-900'
          }`}
          style={{ fontFamily: 'Fredoka, sans-serif' }}
        >
          One castle. Everyone builds.
        </p>
        <p
          className={`mt-1 max-w-md text-sm font-semibold ${
            night ? 'text-amber-100/80' : 'text-slate-700/90'
          }`}
        >
          {CASTLE_GOAL}
        </p>
        {active && (
          <motion.div
            key={active.def.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 rounded-full border border-white/30 bg-black/45 px-4 py-1.5 text-xs font-bold text-white shadow-lg backdrop-blur"
          >
            {`${active.def.emoji} Building ${active.def.name} · ${Math.round(active.fill * 100)}%`}
            {expansionLevel > 0 ? ` · Wing ${expansionLevel + 1}` : ''}
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {pulse && (
          <motion.div
            key={pulse.id}
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-6 left-1/2 z-20 -translate-x-1/2 rounded-2xl border border-amber-300/50 bg-stone-950/90 px-4 py-2 text-center text-sm font-bold text-amber-100 shadow-lg backdrop-blur"
          >
            +{pulse.stones} stone{pulse.stones === 1 ? '' : 's'} from{' '}
            {shortWallet(pulse.wallet)}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute bottom-3 right-3 z-20 rounded-full bg-black/50 px-2.5 py-1 text-[10px] font-bold text-white/85 backdrop-blur">
        Size {totalFill.toFixed(1)} · {sessionStones} live stones · never done
      </div>
    </div>
  );
}
