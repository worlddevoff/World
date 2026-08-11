import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useExperiment } from '../contexts/ExperimentContext'
import { PERSONALITY_COLOR, PERSONALITY_LINE } from '../data/seed'

export function ThoughtFeed() {
  const { thoughts, personality, thinking, flash } = useExperiment()
  const color = PERSONALITY_COLOR[personality]
  const latest = thoughts[0]
  const showThinking = thinking || flash?.mode === 'thought'

  return (
    <div className="min-h-[72px] flex flex-col items-center justify-center px-4 text-center gap-2">
      <AnimatePresence mode="wait">
        {thinking ? (
          <motion.div
            key="thinking"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="flex flex-col items-center"
          >
            <div
              className="font-mono text-[10px] tracking-[0.4em] uppercase mb-2"
              style={{ color }}
            >
              Thinking
            </div>
            <div className="flex items-center gap-1.5 h-6">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: color, boxShadow: `0 0 8px ${color}` }}
                  animate={{ opacity: [0.2, 1, 0.2], y: [0, -4, 0] }}
                  transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.18 }}
                />
              ))}
            </div>
          </motion.div>
        ) : latest ? (
          <motion.p
            key={latest.id}
            initial={{ opacity: 0, y: 8, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
            transition={{ duration: 0.6 }}
            className="font-mono text-sm sm:text-base italic text-slate-300 max-w-lg"
          >
            <span style={{ color }} className="mr-1">
              &gt;
            </span>
            &ldquo;{latest.text}&rdquo;
          </motion.p>
        ) : (
          <motion.p
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="font-mono text-sm text-slate-600 tracking-[0.2em] uppercase"
          >
            {PERSONALITY_LINE[personality]}
          </motion.p>
        )}
      </AnimatePresence>
      {showThinking && !thinking && latest && (
        <span className="font-mono text-[9px] tracking-[0.3em] text-sky-400/70 uppercase">
          cognition event
        </span>
      )}
    </div>
  )
}
