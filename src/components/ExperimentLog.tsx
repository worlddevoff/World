import React from 'react'
import { motion } from 'framer-motion'
import { SectionHeader } from './SectionHeader'
import { EXPERIMENT_LOG } from '../data/seed'

export function ExperimentLog() {
  return (
    <section className="relative w-full max-w-3xl mx-auto px-4 py-20">
      <SectionHeader
        eyebrow="Field notes"
        title="EXPERIMENT LOG"
        description="Documented by researchers observing behavior they do not fully understand."
      />

      <div className="relative pl-6">
        {/* Timeline spine */}
        <div className="absolute left-1.5 top-2 bottom-2 w-px bg-gradient-to-b from-neural/60 via-neural/20 to-transparent" />

        <div className="space-y-8">
          {EXPERIMENT_LOG.map((entry, i) => (
            <motion.article
              key={entry.day}
              initial={{ opacity: 0, x: -12 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
              className="relative"
            >
              <span className="absolute -left-[22px] top-1.5 w-2.5 h-2.5 rounded-full bg-neural shadow-[0_0_10px_#2dd4bf]" />
              <div className="font-mono text-[10px] tracking-[0.3em] text-neural uppercase mb-1">
                Day {String(entry.day).padStart(2, '0')} — {entry.title}
              </div>
              <p className="font-mono text-sm text-slate-400 leading-relaxed">{entry.body}</p>
            </motion.article>
          ))}

          {/* Ongoing */}
          <motion.article
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="relative"
          >
            <span className="absolute -left-[22px] top-1.5 w-2.5 h-2.5 rounded-full border border-slate-600 animate-pulse" />
            <div className="font-mono text-[10px] tracking-[0.3em] text-slate-600 uppercase">
              Day 47 — ONGOING
            </div>
            <p className="font-mono text-sm text-slate-600 italic">
              Observation continues. The subject is still changing.
            </p>
          </motion.article>
        </div>
      </div>
    </section>
  )
}
