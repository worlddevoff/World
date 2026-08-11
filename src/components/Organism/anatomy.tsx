import React from 'react'
import { motion } from 'framer-motion'

export const CENTER = 200

export function seeded(i: number): number {
  const x = Math.sin(i * 127.1) * 43758.5453
  return x - Math.floor(x)
}

interface PartProps {
  /** 0-based occurrence index (1st eye, 2nd eye...). */
  n: number
  color: string
}

/* Each physical trait renders as an animated SVG piece placed around
   the core body. Multiple occurrences fan out so the creature reads as
   genuinely growing more of that part. */

function angleFor(n: number, spread: number, base: number): number {
  const dir = n % 2 === 0 ? 1 : -1
  const step = Math.ceil(n / 2)
  return base + dir * step * spread
}

export function Eye({ n, color }: PartProps) {
  const a = angleFor(n, 0.5, -Math.PI / 2)
  const r = 40 + (n % 2) * 10
  const cx = CENTER + Math.cos(a) * r
  const cy = CENTER + Math.sin(a) * r
  return (
    <g>
      <ellipse cx={cx} cy={cy} rx={12} ry={9} fill="#04070a" stroke={color} strokeWidth={1.3} />
      <motion.circle
        cx={cx}
        cy={cy}
        r={4.5}
        fill={color}
        animate={{ cx: [cx - 3, cx + 3, cx], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: n }}
      />
      <circle cx={cx} cy={cy} r={1.6} fill="#04070a" />
    </g>
  )
}

export function Mouth({ n, color }: PartProps) {
  const cy = CENTER + 42 + n * 14
  return (
    <motion.path
      d={`M${CENTER - 22} ${cy} Q ${CENTER} ${cy + 14} ${CENTER + 22} ${cy}`}
      stroke={color}
      strokeWidth={2}
      fill="none"
      strokeLinecap="round"
      animate={{ d: [
        `M${CENTER - 22} ${cy} Q ${CENTER} ${cy + 14} ${CENTER + 22} ${cy}`,
        `M${CENTER - 22} ${cy} Q ${CENTER} ${cy + 2} ${CENTER + 22} ${cy}`,
        `M${CENTER - 22} ${cy} Q ${CENTER} ${cy + 14} ${CENTER + 22} ${cy}`,
      ] }}
      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
    />
  )
}

function Limb({ n, color, length, width, base }: PartProps & { length: number; width: number; base: number }) {
  const a = angleFor(n, 0.55, base)
  const sx = CENTER + Math.cos(a) * 90
  const sy = CENTER + Math.sin(a) * 90
  const ex = CENTER + Math.cos(a) * (90 + length)
  const ey = CENTER + Math.sin(a) * (90 + length)
  return (
    <motion.line
      x1={sx}
      y1={sy}
      x2={ex}
      y2={ey}
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
      animate={{ x2: [ex, ex + Math.cos(a + 0.4) * 8, ex], y2: [ey, ey + Math.sin(a + 0.4) * 8, ey] }}
      transition={{ duration: 3 + n, repeat: Infinity, ease: 'easeInOut' }}
    />
  )
}

export const Arm = (p: PartProps) => <Limb {...p} length={55} width={3} base={0.2} />
export const Leg = (p: PartProps) => <Limb {...p} length={65} width={4} base={Math.PI / 2} />

export function Tentacle({ n, color }: PartProps) {
  const a = angleFor(n, 0.5, Math.PI / 2)
  const sx = CENTER + Math.cos(a) * 80
  const sy = CENTER + Math.sin(a) * 80
  const mx = CENTER + Math.cos(a) * 130
  const my = CENTER + Math.sin(a) * 130
  const ex = CENTER + Math.cos(a) * 170
  const ey = CENTER + Math.sin(a) * 170
  return (
    <motion.path
      d={`M${sx} ${sy} Q ${mx + 20} ${my} ${ex} ${ey}`}
      stroke={color}
      strokeWidth={2.4}
      fill="none"
      strokeLinecap="round"
      animate={{ d: [
        `M${sx} ${sy} Q ${mx + 20} ${my} ${ex} ${ey}`,
        `M${sx} ${sy} Q ${mx - 20} ${my} ${ex - 10} ${ey + 10}`,
        `M${sx} ${sy} Q ${mx + 20} ${my} ${ex} ${ey}`,
      ] }}
      transition={{ duration: 4 + n, repeat: Infinity, ease: 'easeInOut' }}
    />
  )
}

export function Wing({ n, color }: PartProps) {
  const dir = n % 2 === 0 ? 1 : -1
  const bx = CENTER + dir * 60
  return (
    <motion.path
      d={`M${bx} ${CENTER - 10} Q ${bx + dir * 90} ${CENTER - 80} ${bx + dir * 40} ${CENTER + 40} Z`}
      fill={color}
      fillOpacity={0.12}
      stroke={color}
      strokeWidth={1}
      style={{ transformOrigin: `${bx}px ${CENTER}px` }}
      animate={{ scaleY: [1, 0.7, 1] }}
      transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
    />
  )
}

export function Horn({ n, color }: PartProps) {
  const a = angleFor(n, 0.4, -Math.PI / 2)
  const sx = CENTER + Math.cos(a) * 75
  const sy = CENTER + Math.sin(a) * 75
  const ex = CENTER + Math.cos(a) * 115
  const ey = CENTER + Math.sin(a) * 115
  return <line x1={sx} y1={sy} x2={ex} y2={ey} stroke={color} strokeWidth={4} strokeLinecap="round" />
}

export function Spike({ n, color }: PartProps) {
  const a = (n / 8) * Math.PI * 2
  const sx = CENTER + Math.cos(a) * 80
  const sy = CENTER + Math.sin(a) * 80
  const ex = CENTER + Math.cos(a) * 100
  const ey = CENTER + Math.sin(a) * 100
  return <line x1={sx} y1={sy} x2={ex} y2={ey} stroke={color} strokeWidth={2} strokeLinecap="round" opacity={0.8} />
}

export function Tail({ n, color }: PartProps) {
  const dir = n % 2 === 0 ? 1 : -1
  return (
    <motion.path
      d={`M${CENTER} ${CENTER + 80} Q ${CENTER + dir * 40} ${CENTER + 140} ${CENTER + dir * 10} ${CENTER + 175}`}
      stroke={color}
      strokeWidth={3}
      fill="none"
      strokeLinecap="round"
      animate={{ d: [
        `M${CENTER} ${CENTER + 80} Q ${CENTER + dir * 40} ${CENTER + 140} ${CENTER + dir * 10} ${CENTER + 175}`,
        `M${CENTER} ${CENTER + 80} Q ${CENTER - dir * 40} ${CENTER + 140} ${CENTER + dir * 20} ${CENTER + 175}`,
        `M${CENTER} ${CENTER + 80} Q ${CENTER + dir * 40} ${CENTER + 140} ${CENTER + dir * 10} ${CENTER + 175}`,
      ] }}
      transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
    />
  )
}

export function Head({ n, color }: PartProps) {
  const dir = n % 2 === 0 ? 1 : -1
  const cx = CENTER + dir * 70
  const cy = CENTER - 40
  return (
    <g>
      <circle cx={cx} cy={cy} r={22} fill="#06090d" stroke={color} strokeWidth={1.2} />
      <circle cx={cx} cy={cy} r={5} fill={color} />
    </g>
  )
}

export function Organ({ n, color }: PartProps) {
  const a = (n / 6) * Math.PI * 2 + 0.6
  const cx = CENTER + Math.cos(a) * 55
  const cy = CENTER + Math.sin(a) * 55
  return (
    <motion.circle
      cx={cx}
      cy={cy}
      r={6}
      fill={color}
      style={{ filter: `drop-shadow(0 0 6px ${color})` }}
      animate={{ opacity: [0.4, 1, 0.4], r: [5, 8, 5] }}
      transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: n * 0.4 }}
    />
  )
}

export function Armor({ color }: { color: string }) {
  return (
    <circle
      cx={CENTER}
      cy={CENTER}
      r={95}
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeDasharray="10 8"
      opacity={0.5}
    />
  )
}

export const PHYSICAL_RENDERERS: Record<
  string,
  (n: number, color: string) => React.ReactNode
> = {
  eye: (n, c) => <Eye key={`eye${n}`} n={n} color={c} />,
  mouth: (n, c) => <Mouth key={`mouth${n}`} n={n} color={c} />,
  arm: (n, c) => <Arm key={`arm${n}`} n={n} color={c} />,
  leg: (n, c) => <Leg key={`leg${n}`} n={n} color={c} />,
  wing: (n, c) => <Wing key={`wing${n}`} n={n} color={c} />,
  tentacle: (n, c) => <Tentacle key={`tent${n}`} n={n} color={c} />,
  horn: (n, c) => <Horn key={`horn${n}`} n={n} color={c} />,
  spike: (n, c) => <Spike key={`spike${n}`} n={n} color={c} />,
  tail: (n, c) => <Tail key={`tail${n}`} n={n} color={c} />,
  head: (n, c) => <Head key={`head${n}`} n={n} color={c} />,
  organ: (n, c) => <Organ key={`organ${n}`} n={n} color={c} />,
  armor: (_n, c) => <Armor key="armor" color={c} />,
}
