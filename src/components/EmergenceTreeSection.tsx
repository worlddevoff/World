import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { XIcon } from 'lucide-react'
import { SectionHeader } from './SectionHeader'
import { useExperiment } from '../contexts/ExperimentContext'
import type { DiscoveryRecord } from '../types/experiment'

const TREE_NODES: {
  id: string
  label: string
  parent?: string
  match: (d: DiscoveryRecord[], abilities: string[]) => boolean
}[] = [
  { id: 'consciousness', label: 'CONSCIOUSNESS', match: () => true },
  {
    id: 'memory',
    label: 'MEMORY',
    parent: 'consciousness',
    match: (d, a) => d.some((x) => x.traitId === 'memory') || a.includes('remember'),
  },
  {
    id: 'emotion',
    label: 'EMOTION',
    parent: 'consciousness',
    match: (d) => d.some((x) => x.category === 'behavioral'),
  },
  {
    id: 'language',
    label: 'LANGUAGE',
    parent: 'memory',
    match: (d, a) => d.some((x) => x.traitId === 'language') || a.includes('speak'),
  },
  {
    id: 'curiosity',
    label: 'CURIOSITY',
    parent: 'emotion',
    match: (d) => d.some((x) => x.traitId === 'curious'),
  },
  {
    id: 'selfaware',
    label: 'SELF-AWARE',
    parent: 'language',
    match: (d) => d.some((x) => x.traitId === 'selfaware'),
  },
  {
    id: 'unknown',
    label: 'UNKNOWN',
    parent: 'curiosity',
    match: () => false,
  },
]

export function EmergenceTreeSection() {
  const { discoveries, abilities } = useExperiment()
  const [selected, setSelected] = useState<DiscoveryRecord | null>(null)

  const nodes = TREE_NODES.map((n) => ({
    ...n,
    revealed: n.id === 'consciousness' || n.match(discoveries, abilities),
  }))

  const discoveryFor = (nodeId: string) =>
    discoveries.find((d) => {
      if (nodeId === 'memory') return d.traitId === 'memory'
      if (nodeId === 'language') return d.traitId === 'language'
      if (nodeId === 'curiosity') return d.traitId === 'curious'
      if (nodeId === 'selfaware') return d.traitId === 'selfaware'
      if (nodeId === 'emotion') return d.category === 'behavioral'
      return false
    })

  return (
    <section className="relative w-full max-w-3xl mx-auto px-4 py-20">
      <SectionHeader
        eyebrow="Emergent structure"
        title="WHAT HAS EMERGED"
        description="Discovered traits become visible. Undiscovered remain hidden. History decides the tree."
      />

      <div className="exp-glass border border-white/5 rounded-2xl p-6 sm:p-10">
        <div className="flex flex-col items-center gap-2 font-mono text-[11px] sm:text-xs tracking-wider">
          {nodes
            .filter((n) => !n.parent)
            .map((root) => (
              <TreeBranch
                key={root.id}
                node={root}
                all={nodes}
                onSelect={(id) => {
                  const disc = discoveryFor(id)
                  if (disc) setSelected(disc)
                }}
              />
            ))}
        </div>

        {discoveries.length === 0 && (
          <p className="text-center font-mono text-[11px] text-slate-600 mt-8 italic">
            Day 1. Nothing has emerged yet. Teach it.
          </p>
        )}
      </div>

      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60"
            onClick={() => setSelected(null)}
          >
            <motion.div
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 16, opacity: 0 }}
              className="exp-glass border border-neural/30 rounded-2xl p-5 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="font-mono text-[10px] text-neural tracking-[0.3em] uppercase">
                    Discovery
                  </div>
                  <div className="font-display font-bold text-xl text-slate-100 mt-1">
                    {selected.label}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="text-slate-500 hover:text-slate-300"
                  aria-label="Close"
                >
                  <XIcon className="w-4 h-4" />
                </button>
              </div>
              <dl className="space-y-3 font-mono text-xs text-slate-400">
                <div>
                  <dt className="text-slate-600 uppercase tracking-widest text-[9px]">When</dt>
                  <dd className="text-slate-300 mt-0.5">
                    {new Date(selected.timestamp).toLocaleString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-600 uppercase tracking-widest text-[9px]">Cause</dt>
                  <dd className="text-slate-300 mt-0.5">{selected.cause}</dd>
                </div>
                <div>
                  <dt className="text-slate-600 uppercase tracking-widest text-[9px]">
                    Category
                  </dt>
                  <dd className="text-slate-300 mt-0.5 uppercase">{selected.category}</dd>
                </div>
              </dl>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

function TreeBranch({
  node,
  all,
  onSelect,
  depth = 0,
}: {
  node: (typeof TREE_NODES)[number] & { revealed: boolean }
  all: ((typeof TREE_NODES)[number] & { revealed: boolean })[]
  onSelect: (id: string) => void
  depth?: number
}) {
  const children = all.filter((n) => n.parent === node.id)
  return (
    <div className="flex flex-col items-center w-full">
      <button
        type="button"
        disabled={!node.revealed || node.id === 'unknown' || node.id === 'consciousness'}
        onClick={() => onSelect(node.id)}
        className={[
          'px-3 py-1.5 rounded-md border transition-colors',
          node.revealed
            ? 'border-neural/40 text-neural hover:bg-neural/10 cursor-pointer'
            : 'border-white/5 text-slate-700 cursor-default',
          node.id === 'unknown' ? 'exp-text-glitch text-signal-psy border-signal-psy/30' : '',
        ].join(' ')}
      >
        {node.revealed ? node.label : '???'}
      </button>
      {children.length > 0 && (
        <>
          <div className="w-px h-4 bg-white/10" />
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8 w-full justify-center">
            {children.map((child) => (
              <div key={child.id} className="flex flex-col items-center">
                <TreeBranch node={child} all={all} onSelect={onSelect} depth={depth + 1} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
