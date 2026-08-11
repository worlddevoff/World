import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SectionHeader } from './SectionHeader'
import { useExperiment } from '../contexts/ExperimentContext'
import { PERSONALITY_COLOR, PERSONALITY_LINE } from '../data/seed'
import type { ExperimentLogKind, OrganismMemory, Thought } from '../types/experiment'

const KIND_META: Record<
  ExperimentLogKind,
  { mark: string; color: string; label: string }
> = {
  buy: { mark: '●', color: '#34d399', label: 'market' },
  sell: { mark: '●', color: '#f43f5e', label: 'market' },
  memory: { mark: '◈', color: '#38bdf8', label: 'engram' },
  memory_loss: { mark: '⚠', color: '#fbbf24', label: 'decay' },
  mutation: { mark: '⬡', color: '#a78bfa', label: 'genome' },
  thought: { mark: '›', color: '#94a3b8', label: 'cognition' },
  ability: { mark: '◆', color: '#2dd4bf', label: 'ability' },
  evolution: { mark: '▲', color: '#5eead4', label: 'emergence' },
  devolution: { mark: '▼', color: '#f43f5e', label: 'collapse' },
}

function timeLabel(ts: number) {
  return new Date(ts).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function CognitionPanel({
  thoughts,
  thinking,
  accent,
  personalityLine,
}: {
  thoughts: Thought[]
  thinking: boolean
  accent: string
  personalityLine: string
}) {
  const latest = thoughts[0]
  const trail = thoughts.slice(1, 4)

  return (
    <div
      className="relative overflow-hidden rounded-xl border border-white/5 exp-glass"
      style={{
        boxShadow: thinking ? `0 0 40px ${accent}22` : undefined,
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background: `radial-gradient(ellipse at 20% 0%, ${accent}28, transparent 55%)`,
        }}
      />

      <div className="relative px-4 sm:px-5 py-4 border-b border-white/5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className="font-mono text-[10px] tracking-[0.35em] uppercase"
            style={{ color: accent }}
          >
            inner monologue
          </span>
          {thinking && (
            <span className="font-mono text-[9px] tracking-[0.25em] uppercase text-sky-300/80">
              synthesizing
            </span>
          )}
        </div>
        <span className="font-mono text-[9px] tracking-[0.2em] text-slate-600 uppercase">
          {thoughts.length} thoughts retained
        </span>
      </div>

      <div className="relative px-4 sm:px-5 py-6 min-h-[148px] flex flex-col justify-center">
        <AnimatePresence mode="wait">
          {thinking ? (
            <motion.div
              key="thinking"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex flex-col items-start gap-3"
            >
              <div
                className="font-mono text-[10px] tracking-[0.4em] uppercase"
                style={{ color: accent }}
              >
                Forming a thought
              </div>
              <div className="flex items-center gap-1.5 h-6">
                {[0, 1, 2, 3].map((i) => (
                  <motion.span
                    key={i}
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: accent, boxShadow: `0 0 10px ${accent}` }}
                    animate={{ opacity: [0.2, 1, 0.2], scale: [0.85, 1.15, 0.85] }}
                    transition={{ duration: 0.85, repeat: Infinity, delay: i * 0.14 }}
                  />
                ))}
              </div>
            </motion.div>
          ) : latest ? (
            <motion.div
              key={latest.id}
              initial={{ opacity: 0, y: 10, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
              transition={{ duration: 0.55 }}
            >
              <p
                className="font-display text-xl sm:text-2xl leading-snug text-slate-100 italic"
                style={{ textShadow: `0 0 28px ${accent}33` }}
              >
                <span style={{ color: accent }} className="not-italic mr-2">
                  &gt;
                </span>
                &ldquo;{latest.text}&rdquo;
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] text-slate-500 uppercase tracking-widest">
                <span style={{ color: accent }}>{latest.personality}</span>
                <span className="text-slate-700">·</span>
                <span>{timeLabel(latest.timestamp)}</span>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-2"
            >
              <p className="font-mono text-sm text-slate-500 tracking-[0.18em] uppercase">
                {personalityLine}
              </p>
              <p className="font-mono text-xs text-slate-600">
                Cognition unlocks as the experiment learns. Buys teach. Thoughts follow.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {trail.length > 0 && (
        <div className="relative border-t border-white/5 divide-y divide-white/5">
          {trail.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.55 - i * 0.1 }}
              className="px-4 sm:px-5 py-2.5 flex items-start gap-3"
            >
              <span className="font-mono text-xs shrink-0 mt-0.5" style={{ color: accent }}>
                ›
              </span>
              <p className="font-mono text-xs text-slate-400 italic leading-relaxed min-w-0">
                &ldquo;{t.text}&rdquo;
              </p>
              <span className="ml-auto shrink-0 font-mono text-[9px] text-slate-700">
                {timeLabel(t.timestamp)}
              </span>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

function MemoryEngrams({
  memories,
  accent,
}: {
  memories: OrganismMemory[]
  accent: string
}) {
  const shown = memories.slice(0, 8)

  return (
    <div className="h-full rounded-xl border border-white/5 exp-glass overflow-hidden flex flex-col min-h-[320px]">
      <div className="px-4 py-2.5 border-b border-white/5 flex items-center justify-between">
        <span className="font-mono text-[10px] tracking-[0.3em] text-sky-400/80 uppercase">
          memory engrams
        </span>
        <span className="font-mono text-[9px] text-slate-600 tabular-nums">
          {memories.length}/24
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        <AnimatePresence initial={false}>
          {shown.length === 0 ? (
            <div className="h-full min-h-[260px] flex items-center justify-center px-6 text-center">
              <p className="font-mono text-[11px] text-slate-600 leading-relaxed">
                No persistent memories yet.
                <br />
                Important buys become engrams.
              </p>
            </div>
          ) : (
            shown.map((m, i) => (
              <motion.article
                key={m.id}
                layout
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.35, delay: Math.min(i, 4) * 0.03 }}
                className="px-4 py-3 border-b border-white/5 last:border-b-0"
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="font-mono text-[9px] tracking-[0.25em] uppercase text-sky-400/70">
                    {m.kind}
                  </span>
                  <span className="font-mono text-[9px] text-slate-600 tabular-nums">
                    imp {Math.round(m.importance)}
                  </span>
                </div>
                <p className="font-mono text-xs text-slate-300 italic leading-relaxed">
                  &ldquo;{m.text}&rdquo;
                </p>
                <div
                  className="mt-2 h-px"
                  style={{
                    background: `linear-gradient(90deg, ${accent}66, transparent)`,
                    opacity: 0.35 + Math.min(0.55, m.importance / 80),
                  }}
                />
              </motion.article>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export function LiveExperimentFeed() {
  const {
    log,
    thoughts,
    memories,
    thinking,
    personality,
    pump,
    syncMode,
    stats,
  } = useExperiment()
  const accent = PERSONALITY_COLOR[personality]
  const shown = log.slice(0, 14)
  const live = pump.status === 'live'
  const statusLabel = live
    ? 'market linked'
    : syncMode === 'shared'
      ? 'shared brain'
      : 'awaiting signal'
  const statusTone = live
    ? 'text-signal-teach'
    : syncMode === 'shared'
      ? 'text-neural'
      : 'text-slate-600'
  const statusDot = live
    ? 'bg-signal-teach animate-pulse'
    : syncMode === 'shared'
      ? 'bg-neural animate-pulse'
      : 'bg-slate-600'

  return (
    <section className="relative w-full max-w-6xl mx-auto px-4 py-20">
      <SectionHeader
        eyebrow="Observation deck"
        title="LIVE EXPERIMENT"
        description="Watch the shared mind think. Market pressure writes memories. Cognition answers back."
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[10px] tracking-[0.2em] uppercase text-slate-500">
          <span style={{ color: accent }}>{personality}</span>
          <span className="text-slate-700">·</span>
          <span>mem {Math.round(stats.memory)}</span>
          <span className="text-slate-700">·</span>
          <span>iq {Math.round(stats.intelligence)}</span>
          <span className="text-slate-700">·</span>
          <span>{memories.length} engrams</span>
          <span className="text-slate-700">·</span>
          <span>{thoughts.length} thoughts</span>
        </div>
        <span className={['flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest', statusTone].join(' ')}>
          <span className={['w-1.5 h-1.5 rounded-full', statusDot].join(' ')} />
          {statusLabel}
        </span>
      </div>

      <div className="space-y-4">
        <CognitionPanel
          thoughts={thoughts}
          thinking={thinking}
          accent={accent}
          personalityLine={PERSONALITY_LINE[personality]}
        />

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.2fr)] gap-4">
          <MemoryEngrams memories={memories} accent={accent} />

          <div className="rounded-xl border border-white/5 exp-glass overflow-hidden flex flex-col min-h-[320px]">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5">
              <span className="font-mono text-[10px] tracking-[0.25em] text-slate-500 uppercase">
                field notes
              </span>
              <span className="font-mono text-[9px] text-slate-600 uppercase tracking-widest">
                experiment.observe
              </span>
            </div>

            <div className="divide-y divide-white/5 flex-1 overflow-y-auto max-h-[520px]">
              <AnimatePresence initial={false}>
                {shown.map((e) => {
                  const meta = KIND_META[e.kind] ?? KIND_META.evolution
                  const isThought = e.kind === 'thought'
                  const isMemory = e.kind === 'memory' || e.kind === 'memory_loss'
                  const isMutation =
                    e.kind === 'mutation' ||
                    e.kind === 'evolution' ||
                    e.kind === 'devolution' ||
                    e.kind === 'ability'

                  return (
                    <motion.div
                      key={e.id}
                      layout
                      initial={{
                        opacity: 0,
                        x: -12,
                        backgroundColor: `${meta.color}22`,
                      }}
                      animate={{
                        opacity: 1,
                        x: 0,
                        backgroundColor: isThought
                          ? `${accent}10`
                          : isMemory
                            ? 'rgba(56,189,248,0.06)'
                            : 'rgba(0,0,0,0)',
                      }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.45 }}
                      className={[
                        'flex items-start gap-3 px-4 py-3.5',
                        isThought ? 'border-l-2' : '',
                      ].join(' ')}
                      style={isThought ? { borderLeftColor: accent } : undefined}
                    >
                      <span
                        className="font-mono text-sm leading-none mt-0.5 shrink-0"
                        style={{ color: isThought ? accent : meta.color }}
                      >
                        {meta.mark}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div
                            className="font-mono text-[10px] tracking-[0.2em] uppercase"
                            style={{ color: isThought ? accent : meta.color }}
                          >
                            {e.title}
                          </div>
                          {(isThought || isMemory || isMutation) && (
                            <span
                              className="font-mono text-[8px] tracking-[0.2em] uppercase px-1.5 py-0.5 rounded border"
                              style={{
                                color: isThought ? accent : meta.color,
                                borderColor: `${isThought ? accent : meta.color}44`,
                                background: `${isThought ? accent : meta.color}14`,
                              }}
                            >
                              {meta.label}
                            </span>
                          )}
                        </div>
                        <p
                          className={[
                            'font-mono text-xs sm:text-sm mt-0.5 leading-relaxed',
                            isThought
                              ? 'text-slate-200 italic'
                              : isMemory
                                ? 'text-sky-100/80 italic'
                                : 'text-slate-300',
                          ].join(' ')}
                        >
                          {e.body}
                        </p>
                      </div>
                      <span className="hidden sm:inline font-mono text-[9px] text-slate-600 shrink-0">
                        {timeLabel(e.timestamp)}
                      </span>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
              {shown.length === 0 && (
                <div className="flex items-center justify-center h-[320px] font-mono text-xs text-slate-600 uppercase tracking-widest">
                  awaiting first observation...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
