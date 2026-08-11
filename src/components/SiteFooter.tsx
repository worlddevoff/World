import React from 'react'
import { useExperiment } from '../contexts/ExperimentContext'

export function SiteFooter() {
  const { evolutionLevel } = useExperiment()
  return (
    <footer className="border-t border-white/5 py-8 px-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between flex-wrap gap-3">
        <span className="font-display font-semibold tracking-[0.25em] text-slate-400 text-xs">
          THE EXPERIMENT
        </span>
        <span className="font-mono text-[10px] text-slate-600 uppercase tracking-[0.2em]">
          subject active · evolution level {evolutionLevel} · observation ongoing
        </span>
      </div>
    </footer>
  )
}
