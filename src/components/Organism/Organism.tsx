import React, { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useExperiment } from '../../contexts/ExperimentContext'
import { PERSONALITY_COLOR } from '../../data/seed'
import { CENTER, seeded, PHYSICAL_RENDERERS } from './anatomy'

interface Node {
  x: number
  y: number
  r: number
  depth: number
}

function buildNodes(count: number, seed: number): Node[] {
  const nodes: Node[] = []
  for (let i = 0; i < count; i++) {
    const s = i + seed * 0.001
    const a = seeded(s) * Math.PI * 2
    const radius = 18 + seeded(s + 100) * 70
    nodes.push({
      x: CENTER + Math.cos(a) * radius,
      y: CENTER + Math.sin(a) * radius * 0.92,
      r: 1.6 + seeded(s + 50) * 3,
      depth: seeded(s + 200),
    })
  }
  return nodes
}

export function Organism() {
  const {
    personality,
    mood,
    consciousness,
    events,
    status,
    nodeCount,
    connectionCount,
    traits,
    seed,
    thinking,
    flash,
  } = useExperiment()
  const color = PERSONALITY_COLOR[personality]
  const isThinking = thinking || flash?.mode === 'thought'

  // Neural web grows with the organism (capped for performance / clarity).
  const nodes = useMemo(
    () => buildNodes(Math.min(nodeCount, 40), seed),
    [nodeCount, seed],
  )

  const links = useMemo(() => {
    const l: { a: Node; b: Node; key: string }[] = []
    const target = Math.min(connectionCount, 80)
    for (let i = 0; i < nodes.length && l.length < target; i++) {
      for (let j = i + 1; j < nodes.length && l.length < target; j++) {
        const dx = nodes[i].x - nodes[j].x
        const dy = nodes[i].y - nodes[j].y
        if (Math.hypot(dx, dy) < 70) l.push({ a: nodes[i], b: nodes[j], key: `${i}-${j}` })
      }
    }
    return l
  }, [nodes, connectionCount])

  // Physical anatomy: group by trait id and render each occurrence.
  const anatomy = useMemo(() => {
    const counts: Record<string, number> = {}
    const pieces: React.ReactNode[] = []
    for (const t of traits) {
      const renderer = PHYSICAL_RENDERERS[t.traitId]
      if (!renderer) continue
      const n = counts[t.traitId] ?? 0
      pieces.push(renderer(n, color))
      counts[t.traitId] = n + 1
    }
    return pieces
  }, [traits, color])

  const latest = events[0]
  const pulseKey = latest?.id
  const isForget = latest?.kind === 'sell'
  const isBig = latest?.tier === 'large' || latest?.tier === 'mega'

  const unstable = status === 'UNSTABLE'
  // A bare blob barely moves; a grown creature breathes more.
  const life = Math.min(1, traits.length / 10)
  const breatheScale = 1 + life * 0.04 + mood * 0.02
  const bodyR = 34 + Math.min(traits.length, 12) * 9
  const thinkColor = '#38bdf8'

  return (
    <div className="relative w-full max-w-[520px] aspect-square mx-auto select-none">
      <div
        className="absolute inset-0 rounded-full blur-3xl transition-all duration-1000"
        style={{
          background: `radial-gradient(circle, ${isThinking ? thinkColor : color}55, transparent 65%)`,
          opacity: isThinking ? 0.55 : 0.2 + life * 0.3,
        }}
      />

      <AnimatePresence>
        {isThinking && (
          <motion.div
            key="think-ring"
            initial={{ scale: 0.7, opacity: 0.7 }}
            animate={{ scale: [1, 1.35, 1], opacity: [0.55, 0.15, 0.55] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute inset-[12%] rounded-full border-2 pointer-events-none"
            style={{ borderColor: thinkColor, boxShadow: `0 0 24px ${thinkColor}55` }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {pulseKey && !isThinking && (
          <motion.div
            key={pulseKey}
            initial={{ scale: 0.55, opacity: 0.5 }}
            animate={{ scale: isBig ? 2.2 : 1.5, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: isBig ? 2.2 : 1.4, ease: 'easeOut' }}
            className="absolute inset-0 rounded-full border pointer-events-none"
            style={{ borderColor: isForget ? '#f43f5e' : color }}
          />
        )}
      </AnimatePresence>

      <motion.div
        animate={{
          scale: isThinking
            ? [breatheScale * 1.02, breatheScale * 1.08, breatheScale * 1.02]
            : [breatheScale, breatheScale * 1.03, breatheScale],
          x: unstable ? [0, -3, 3, -2, 0] : 0,
        }}
        transition={{
          scale: {
            duration: isThinking ? 1.4 : 6 - life * 2,
            repeat: Infinity,
            ease: 'easeInOut',
          },
          x: { duration: 0.4, repeat: unstable ? Infinity : 0 },
        }}
        className="absolute inset-0"
      >
        <svg viewBox="0 0 400 400" className="w-full h-full overflow-visible">
          <defs>
            <radialGradient id="orgBody" cx="50%" cy="45%" r="55%">
              <stop offset="0%" stopColor={color} stopOpacity="0.3" />
              <stop offset="55%" stopColor={color} stopOpacity="0.08" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </radialGradient>
            <filter id="orgGlow" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="2.4" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Translucent biological body — grows as traits accumulate */}
          <motion.circle
            cx={CENTER}
            cy={CENTER}
            fill="url(#orgBody)"
            animate={{ r: [bodyR, bodyR + 8, bodyR] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          />
          <circle cx={CENTER} cy={CENTER} r={bodyR * 0.7} fill={color} fillOpacity={0.05} stroke={color} strokeOpacity={0.15} />

          {/* Grown anatomy (behind neural core so the web reads on top) */}
          <g>{anatomy}</g>

          {/* Neural connections */}
          <g filter="url(#orgGlow)">
            {links.map((link, i) => (
              <motion.line
                key={link.key}
                x1={link.a.x}
                y1={link.a.y}
                x2={link.b.x}
                y2={link.b.y}
                stroke={color}
                strokeWidth={0.6}
                initial={{ opacity: 0 }}
                animate={{ opacity: [0.1, 0.5, 0.1] }}
                transition={{ duration: 2.6 + (i % 5), repeat: Infinity, ease: 'easeInOut', delay: (i % 7) * 0.3 }}
              />
            ))}

            {nodes.map((n, i) => (
              <motion.circle
                key={i}
                cx={n.x}
                cy={n.y}
                fill={color}
                initial={{ opacity: 0, r: 0 }}
                animate={{ opacity: [0.4, 1, 0.4], r: [n.r, n.r * 1.5, n.r] }}
                transition={{ duration: 2 + n.depth * 3, repeat: Infinity, ease: 'easeInOut', delay: n.depth * 2 }}
              />
            ))}
          </g>

          {/* Traveling energy pulses only once it's alive enough */}
          {life > 0.15 &&
            [0, 1, 2].map((i) => (
              <motion.circle
                key={`e${i}`}
                r={2.4}
                fill="#ecfeff"
                filter="url(#orgGlow)"
                animate={{
                  cx: [CENTER - 60, CENTER + 60, CENTER - 60],
                  cy: [CENTER + (i - 1) * 24, CENTER - (i - 1) * 24, CENTER + (i - 1) * 24],
                  opacity: [0, 1, 0],
                }}
                transition={{ duration: 3 + i, repeat: Infinity, ease: 'easeInOut', delay: i * 0.8 }}
              />
            ))}
        </svg>
      </motion.div>

      {/* Floating particles scale with how alive it is */}
      {Array.from({ length: 6 + Math.round(life * 14) }).map((_, i) => {
        const left = seeded(i + seed) * 100
        const size = 1 + seeded(i + 3) * 3
        return (
          <motion.span
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${left}%`,
              bottom: '8%',
              width: size,
              height: size,
              background: color,
              boxShadow: `0 0 6px ${color}`,
            }}
            animate={{
              y: [0, -160 - seeded(i + 8) * 120],
              opacity: [0, 0.9, 0],
              x: [0, (seeded(i + 5) - 0.5) * 40],
            }}
            transition={{ duration: 5 + seeded(i + 2) * 5, repeat: Infinity, ease: 'easeOut', delay: seeded(i) * 5 }}
          />
        )
      })}

      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-center">
        <div
          className="font-mono text-[10px] tracking-[0.3em] uppercase transition-colors duration-1000"
          style={{ color: isThinking ? thinkColor : color }}
        >
          {isThinking ? 'forming a thought…' : `${consciousness.toFixed(0)}% coherence`}
        </div>
      </div>
    </div>
  )
}
