import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorld } from '../../contexts/WorldContext';
import { ScrollTextIcon, ChevronUpIcon } from 'lucide-react';

export function WorldHistory() {
  const { history } = useWorld();
  const [open, setOpen] = useState(false);

  return (
    <div className="pointer-events-auto fixed bottom-4 left-4 z-30 w-80 max-w-[calc(100vw-2rem)]">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-2 max-h-72 overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-2xl backdrop-blur"
          >
            <div className="max-h-72 overflow-y-auto p-1">
              <ul className="relative">
                {history.map((h, i) => (
                  <li key={h.id} className="relative flex gap-3 px-3 py-2">
                    <div className="flex flex-col items-center">
                      <div className={`z-10 flex h-7 w-7 items-center justify-center rounded-full text-sm ${h.major ? 'bg-amber-100' : 'bg-slate-100'}`}>
                        {h.emoji}
                      </div>
                      {i < history.length - 1 && <div className="w-px flex-1 bg-slate-200" />}
                    </div>
                    <div className="pb-1">
                      <p className={`text-sm ${h.major ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                        {h.text}
                      </p>
                      <p className="text-[10px] text-slate-400">{h.date}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 shadow-lg transition hover:bg-slate-50"
      >
        <ScrollTextIcon size={14} className="text-amber-500" />
        World History
        <ChevronUpIcon size={13} className={`transition ${open ? 'rotate-180' : ''}`} />
      </button>
    </div>
  );
}
