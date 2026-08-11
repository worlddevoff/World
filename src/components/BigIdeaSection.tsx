import React from 'react'
import { motion } from 'framer-motion'

const LINES = [
  { a: 'BUY IT', b: 'TEACH IT', color: '#34d399' },
  { a: 'SELL IT', b: 'MAKE IT FORGET', color: '#f43f5e' },
  { a: 'KEEP WATCHING', b: 'SEE WHAT IT BECOMES', color: '#2dd4bf' },
]

export function BigIdeaSection() {
  return (
    <section className="relative w-full py-24 px-4 overflow-hidden">
      <div className="absolute inset-0 exp-grid-bg opacity-20 pointer-events-none" />
      <div className="relative max-w-3xl mx-auto text-center">
        <div className="space-y-6 mb-14">
          {LINES.map((line, i) => (
            <motion.div
              key={line.a}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ delay: i * 0.12, duration: 0.6 }}
              className="flex items-center justify-center gap-4 flex-wrap"
            >
              <span className="font-display font-bold text-xl sm:text-3xl text-slate-500">
                {line.a}
              </span>
              <span style={{ color: line.color }} className="font-mono text-lg">
                →
              </span>
              <span
                className="font-display font-bold text-xl sm:text-3xl"
                style={{ color: line.color }}
              >
                {line.b}
              </span>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1 }}
          className="font-display font-bold text-2xl sm:text-4xl text-slate-50 leading-tight exp-flicker"
        >
          What happens when it becomes
          <br />
          <span className="text-signal-psy exp-text-glitch">autonomous</span>?
        </motion.p>
        <p className="font-mono text-xs text-slate-500 mt-6 tracking-[0.2em] uppercase">
          Come back tomorrow. Wonder what it learned.
        </p>
      </div>
    </section>
  )
}
