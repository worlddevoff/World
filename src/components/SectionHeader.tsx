import React from 'react'
import { motion } from 'framer-motion'

interface Props {
  eyebrow: string
  title: string
  description?: string
}

export function SectionHeader({ eyebrow, title, description }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6 }}
      className="mb-8 text-center"
    >
      <div className="font-mono text-[10px] tracking-[0.4em] text-neural uppercase mb-2">
        // {eyebrow}
      </div>
      <h2 className="font-display font-bold text-2xl sm:text-4xl tracking-[0.08em] text-slate-50">
        {title}
      </h2>
      {description && (
        <p className="font-mono text-xs sm:text-sm text-slate-500 mt-3 max-w-xl mx-auto">
          {description}
        </p>
      )}
    </motion.div>
  )
}
