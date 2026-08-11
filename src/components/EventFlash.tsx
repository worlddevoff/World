import React, { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useExperiment } from '../contexts/ExperimentContext'

/** Full-screen dramatic overlay for unlocks, thoughts, and market shocks. */
export function EventFlash() {
  const { flash, clearFlash } = useExperiment()

  useEffect(() => {
    if (!flash) return
    const ms = flash.mode === 'thought' ? 3200 : 2200
    const id = setTimeout(() => clearFlash(flash.id), ms)
    return () => clearTimeout(id)
  }, [flash, clearFlash])

  const mode = flash?.mode ?? (flash?.kind === 'sell' ? 'market' : 'market')
  const color =
    flash?.kind === 'thought' || mode === 'thought'
      ? '#38bdf8'
      : mode === 'ability'
        ? '#a78bfa'
        : flash?.kind === 'sell'
          ? '#f43f5e'
          : '#34d399'

  const eyebrow =
    mode === 'thought'
      ? '// cognition'
      : mode === 'ability'
        ? '// emergence'
        : mode === 'mutation'
          ? '// mutation'
          : flash?.kind === 'sell'
            ? '// memory event'
            : '// market event'

  return (
    <AnimatePresence>
      {flash && (
        <motion.div
          key={flash.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
        >
          <div
            className="absolute inset-0"
            style={{ background: `radial-gradient(circle, ${color}22, transparent 60%)` }}
          />
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.1, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 18 }}
            className="relative text-center px-6 max-w-3xl"
          >
            <div
              className="font-mono text-[10px] tracking-[0.4em] uppercase mb-2"
              style={{ color }}
            >
              {eyebrow}
            </div>
            {mode === 'thought' ? (
              <>
                <div className="font-mono text-xs tracking-[0.35em] text-sky-300/80 uppercase mb-3">
                  It thought
                </div>
                <div
                  className="font-display font-bold text-2xl sm:text-4xl italic leading-snug"
                  style={{ color: '#ecfeff' }}
                >
                  &ldquo;{flash.text}&rdquo;
                </div>
              </>
            ) : (
              <div
                className="font-display font-bold text-3xl sm:text-5xl exp-text-glitch"
                style={{ color: '#ecfeff' }}
              >
                {flash.text}
              </div>
            )}
            <div className="font-mono text-xs sm:text-sm text-slate-400 mt-3">
              {flash.sub}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
