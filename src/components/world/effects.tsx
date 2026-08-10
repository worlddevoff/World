import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { DisasterKind } from '../../types/world';

// Full-canvas disaster overlays.
export function DisasterOverlay({ disaster }: { disaster: DisasterKind | null }) {
  return (
    <AnimatePresence>
      {disaster && (
        <motion.div
          key={disaster}
          className="pointer-events-none absolute inset-0 z-20"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {disaster === 'EARTHQUAKE' && (
            <>
              {/* dusty atmosphere that builds with the main shock then settles */}
              <motion.div
                className="absolute inset-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.35, 0.55, 0.4, 0.6, 0.35, 0.15] }}
                transition={{ duration: 3.1, times: [0, 0.12, 0.3, 0.5, 0.68, 0.85, 1], ease: 'linear' }}
                style={{
                  background:
                    'radial-gradient(ellipse at 50% 72%, rgba(92,68,42,0.55), rgba(55,38,22,0.28) 42%, transparent 72%)',
                }}
              />
              {/* punched vignette — reads as dust choking the edges */}
              <motion.div
                className="absolute inset-0"
                animate={{ opacity: [0.25, 0.55, 0.35, 0.75, 0.45, 0.65, 0.2] }}
                transition={{ duration: 3.1, ease: 'linear' }}
                style={{ boxShadow: 'inset 0 0 140px rgba(35,22,10,0.7)' }}
              />
              {/* concentric ground waves */}
              {[0, 0.28, 0.55].map((delay, i) => (
                <motion.div
                  key={`wave-${i}`}
                  className="absolute left-1/2 top-[58%] h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full"
                  style={{
                    border: `${3 - i}px solid rgba(210, 180, 130, ${0.75 - i * 0.15})`,
                    boxShadow: '0 0 24px rgba(160,120,70,0.25)',
                  }}
                  initial={{ scale: 0.15, opacity: 0.85 }}
                  animate={{ scale: 9 + i * 1.5, opacity: 0 }}
                  transition={{ duration: 1.55, ease: 'easeOut', delay }}
                />
              ))}
              {/* horizontal dust sheets sweeping across */}
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={`sheet-${i}`}
                  className="absolute h-10 w-[140%]"
                  style={{
                    top: `${28 + i * 22}%`,
                    left: '-20%',
                    background:
                      'linear-gradient(90deg, transparent, rgba(180,150,110,0.22), rgba(140,110,75,0.18), transparent)',
                    filter: 'blur(6px)',
                  }}
                  initial={{ x: i % 2 === 0 ? '-8%' : '8%', opacity: 0 }}
                  animate={{ x: i % 2 === 0 ? '12%' : '-12%', opacity: [0, 0.8, 0.5, 0] }}
                  transition={{ duration: 2.4, delay: 0.1 + i * 0.18, ease: 'easeInOut' }}
                />
              ))}
              {/* airborne grit */}
              {Array.from({ length: 22 }).map((_, i) => {
                const left = 4 + ((i * 37) % 92);
                const top = 20 + ((i * 53) % 60);
                return (
                  <motion.span
                    key={`grit-${i}`}
                    className="absolute rounded-full"
                    style={{
                      left: `${left}%`,
                      top: `${top}%`,
                      width: 2 + (i % 3),
                      height: 2 + (i % 3),
                      background: i % 2 === 0 ? '#c4a574' : '#8b7355',
                    }}
                    initial={{ opacity: 0, y: 0 }}
                    animate={{
                      opacity: [0, 0.9, 0],
                      y: [0, -18 - (i % 5) * 8, -40 - (i % 4) * 10],
                      x: [0, (i % 2 === 0 ? 1 : -1) * (10 + (i % 6) * 4)],
                    }}
                    transition={{
                      duration: 1.3 + (i % 4) * 0.2,
                      delay: (i % 8) * 0.08,
                      repeat: 1,
                      ease: 'easeOut',
                    }}
                  />
                );
              })}
            </>
          )}
          {disaster === 'FIRE' && (
            <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 50% 60%, rgba(239,68,68,0.28), transparent 60%)' }} />
          )}
          {disaster === 'FLOOD' && <FloodEffect />}
          {disaster === 'STORM' && (
            <motion.div
              className="absolute inset-0 bg-slate-900/40"
              animate={{ opacity: [0.2, 0.5, 0.2] }}
              transition={{ duration: 0.35, repeat: 8 }}
            />
          )}
          {disaster === 'METEOR' && (
            <>
              {/* falling streak */}
              <motion.div
                className="absolute h-1.5 w-48 origin-left rounded-full"
                style={{ background: 'linear-gradient(90deg, transparent, #fff, #f97316)', rotate: 38 }}
                initial={{ left: '10%', top: '-10%', opacity: 0 }}
                animate={{ left: '48%', top: '48%', opacity: [0, 1, 1, 0] }}
                transition={{ duration: 0.9, ease: 'easeIn' }}
              />
              {/* impact flash */}
              <motion.div
                className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [0, 0, 9], opacity: [0, 0.95, 0] }}
                transition={{ duration: 1.6, times: [0, 0.55, 1] }}
                style={{ background: 'radial-gradient(circle, #fff, #f97316 40%, transparent 70%)' }}
              />
              {/* white screen flash on impact */}
              <motion.div
                className="absolute inset-0 bg-white"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0, 0.7, 0] }}
                transition={{ duration: 1.4, times: [0, 0.5, 0.6, 1] }}
              />
            </>
          )}

          {/* meteor keeps a crisp white shockwave; quake uses earthy rings above */}
          {disaster === 'METEOR' && (
            <motion.div
              className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white/70"
              initial={{ scale: 0.2, opacity: 0.8 }}
              animate={{ scale: 7, opacity: 0 }}
              transition={{ duration: 1.4, ease: 'easeOut', delay: 0.55 }}
            />
          )}

          <motion.div
            className="absolute left-1/2 top-8 -translate-x-1/2 rounded-full bg-black/75 px-6 py-2.5 text-xl font-black tracking-wide text-white shadow-2xl"
            initial={{ y: -40, opacity: 0, scale: 0.8 }}
            animate={
              disaster === 'EARTHQUAKE'
                ? { y: [0, -2, 2, -1, 1, 0], opacity: 1, scale: 1, x: [0, -3, 3, -2, 2, 0] }
                : { y: 0, opacity: 1, scale: 1 }
            }
            transition={
              disaster === 'EARTHQUAKE'
                ? { duration: 0.45, repeat: 5, ease: 'linear' }
                : { type: 'spring', stiffness: 320, damping: 18 }
            }
          >
            {disaster === 'EARTHQUAKE' && '🌍 EARTHQUAKE'}
            {disaster === 'FIRE' && '🔥 FIRE'}
            {disaster === 'FLOOD' && '🌊 FLOOD'}
            {disaster === 'STORM' && '⛈️ STORM'}
            {disaster === 'METEOR' && '☄️ METEOR STRIKE'}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Rising flood: layered water, animated surface, foam, rain, and murk. */
function FloodEffect() {
  return (
    <>
      {/* Atmospheric murk — sky goes wet and heavy */}
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          background:
            'linear-gradient(180deg, rgba(15,23,42,0.35) 0%, rgba(30,58,95,0.2) 40%, transparent 70%)',
        }}
      />

      {/* Rain */}
      {Array.from({ length: 36 }).map((_, i) => (
        <motion.span
          key={`rain-${i}`}
          className="absolute w-px rounded-full bg-sky-100/50"
          style={{
            left: `${(i * 17 + 3) % 100}%`,
            height: 14 + (i % 5) * 4,
            top: '-8%',
          }}
          initial={{ y: 0, opacity: 0 }}
          animate={{ y: '120vh', opacity: [0, 0.7, 0] }}
          transition={{
            duration: 0.55 + (i % 4) * 0.12,
            delay: (i % 10) * 0.05,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      ))}

      {/* Rising water body */}
      <motion.div
        className="absolute inset-x-0 bottom-0 overflow-hidden"
        initial={{ height: '0%' }}
        animate={{ height: '52%' }}
        exit={{ height: '0%' }}
        transition={{ duration: 1.8, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Deep water */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to top, rgba(8,47,73,0.92) 0%, rgba(12,74,110,0.78) 35%, rgba(14,116,144,0.55) 70%, rgba(56,189,248,0.28) 100%)',
          }}
        />

        {/* Caustic / shimmer bands under the surface */}
        <motion.div
          className="absolute inset-x-0 top-0 h-2/3 opacity-40"
          style={{
            background:
              'repeating-linear-gradient(105deg, transparent 0px, transparent 18px, rgba(255,255,255,0.07) 19px, transparent 28px)',
          }}
          animate={{ x: ['-8%', '8%', '-8%'] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Animated SVG wave surface */}
        <div className="absolute inset-x-0 top-0 -translate-y-[70%]">
          <svg
            className="block w-[200%]"
            viewBox="0 0 1200 80"
            preserveAspectRatio="none"
            style={{ height: 56 }}
          >
            <motion.g
              animate={{ x: [0, -600] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: 'linear' }}
            >
              <path
                d="M0,40 C150,10 250,70 400,40 C550,10 650,70 800,40 C950,10 1050,70 1200,40 L1200,80 L0,80 Z"
                fill="rgba(125,211,252,0.55)"
              />
              <path
                d="M1200,40 C1350,10 1450,70 1600,40 C1750,10 1850,70 2000,40 C2150,10 2250,70 2400,40 L2400,80 L1200,80 Z"
                fill="rgba(125,211,252,0.55)"
              />
            </motion.g>
            <motion.g
              animate={{ x: [0, -600] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: 'linear' }}
            >
              <path
                d="M0,48 C120,28 220,68 360,48 C500,28 600,68 740,48 C880,28 1000,68 1200,48 L1200,80 L0,80 Z"
                fill="rgba(186,230,253,0.45)"
              />
              <path
                d="M1200,48 C1320,28 1420,68 1560,48 C1700,28 1800,68 1940,48 C2080,28 2200,68 2400,48 L2400,80 L1200,80 Z"
                fill="rgba(186,230,253,0.45)"
              />
            </motion.g>
          </svg>

          {/* Foam crest along the leading edge */}
          <motion.div
            className="absolute inset-x-0 top-[42%] h-2"
            style={{
              background:
                'linear-gradient(90deg, transparent, rgba(255,255,255,0.75), transparent, rgba(255,255,255,0.55), transparent)',
              filter: 'blur(0.5px)',
            }}
            animate={{ opacity: [0.45, 0.9, 0.45], x: ['-4%', '4%', '-4%'] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        {/* Bubbles rising through the water column */}
        {Array.from({ length: 14 }).map((_, i) => (
          <motion.span
            key={`bub-${i}`}
            className="absolute rounded-full border border-sky-100/40 bg-sky-200/25"
            style={{
              left: `${8 + (i * 7) % 84}%`,
              bottom: '4%',
              width: 4 + (i % 3) * 3,
              height: 4 + (i % 3) * 3,
            }}
            initial={{ y: 0, opacity: 0 }}
            animate={{ y: -180 - (i % 5) * 40, opacity: [0, 0.8, 0] }}
            transition={{
              duration: 2.2 + (i % 4) * 0.4,
              delay: (i % 7) * 0.2,
              repeat: Infinity,
              ease: 'easeOut',
            }}
          />
        ))}

        {/* Debris / driftwood flecks on the surface */}
        {[18, 42, 67, 81].map((left, i) => (
          <motion.div
            key={`debris-${i}`}
            className="absolute top-[8%] h-1 rounded-full bg-amber-900/50"
            style={{ left: `${left}%`, width: 10 + i * 4 }}
            animate={{ x: [0, 12, -6, 0], y: [0, -2, 1, 0] }}
            transition={{ duration: 3 + i * 0.4, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}
      </motion.div>

      {/* Wet glass vignette at the edges */}
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.55 }}
        style={{
          boxShadow: 'inset 0 -120px 80px rgba(8,47,73,0.45), inset 0 0 100px rgba(14,116,144,0.2)',
        }}
      />
    </>
  );
}

// Floating birds drifting across the sky.
export function Birds() {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <motion.g
          key={i}
          initial={{ x: -200 - i * 120, y: -240 - i * 40 }}
          animate={{ x: 900 }}
          transition={{ duration: 26 + i * 6, repeat: Infinity, ease: 'linear', delay: i * 4 }}
        >
          {[0, 14, 28].map((dx) => (
            <path key={dx} d={`M ${dx} 0 q 3 -3 6 0 q 3 -3 6 0`} stroke="#334155" strokeWidth={1.4} fill="none" />
          ))}
        </motion.g>
      ))}
    </>
  );
}
