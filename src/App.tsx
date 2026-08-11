import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { PanelsTopLeftIcon, XIcon } from 'lucide-react';
import { WorldProvider } from './contexts/WorldContext';
import { WorldCanvas } from './components/world/WorldCanvas';
import { TopBar } from './components/ui/TopBar';
import { LiveActivity } from './components/ui/LiveActivity';
import { PlayerProfile } from './components/ui/PlayerProfile';
import { Leaderboard } from './components/ui/Leaderboard';
import { DevPanel } from './components/ui/DevPanel';
import { WorldHistory } from './components/ui/WorldHistory';
import { ShareCard } from './components/ui/ShareCard';

/** Dev Control Panel is hidden for launch — open with ?dev=1 */
function useShowDevPanel(): boolean {
  return useMemo(() => {
    try {
      return new URLSearchParams(window.location.search).get('dev') === '1';
    } catch {
      return false;
    }
  }, []);
}

function SidePanels() {
  return (
    <>
      <div className="min-h-[180px] flex-1">
        <LiveActivity />
      </div>
      <PlayerProfile />
      <Leaderboard />
    </>
  );
}

export function App() {
  const showDevPanel = useShowDevPanel();
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);

  // Lock body scroll while the mobile sheet is open.
  useEffect(() => {
    if (!mobilePanelOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobilePanelOpen]);

  return (
    <WorldProvider>
      <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-[#0f2417] font-sans">
        <TopBar />

        <div className="relative flex min-h-0 flex-1 overflow-hidden">
          {/* World always fills the stage — especially on mobile */}
          <main className="relative min-w-0 flex-1">
            <WorldCanvas />

            {/* Mobile: open the rail as a sheet — map stays primary */}
            <button
              type="button"
              onClick={() => setMobilePanelOpen(true)}
              className="absolute bottom-4 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/20 bg-black/55 px-4 py-2.5 text-xs font-bold text-white shadow-lg backdrop-blur md:hidden"
            >
              <PanelsTopLeftIcon size={14} />
              Activity & wallet
            </button>
          </main>

          {/* Desktop right rail */}
          <aside className="z-20 hidden w-80 shrink-0 flex-col gap-3 overflow-y-auto border-l border-black/20 bg-slate-50 p-3 md:flex">
            <SidePanels />
          </aside>
        </div>

        {/* Mobile bottom sheet */}
        <AnimatePresence>
          {mobilePanelOpen && (
            <motion.div
              className="fixed inset-0 z-40 md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <button
                type="button"
                aria-label="Close panel"
                className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
                onClick={() => setMobilePanelOpen(false)}
              />
              <motion.div
                role="dialog"
                aria-modal="true"
                aria-label="Activity and wallet"
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', stiffness: 380, damping: 34 }}
                className="absolute inset-x-0 bottom-0 flex max-h-[82dvh] flex-col rounded-t-3xl bg-slate-50 shadow-2xl"
              >
                <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-slate-800">
                      Your panel
                    </p>
                    <p className="text-[10px] text-slate-500">Activity, wallet, leaderboard</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobilePanelOpen(false)}
                    className="rounded-full bg-slate-200 p-2 text-slate-700 transition hover:bg-slate-300"
                    aria-label="Close"
                  >
                    <XIcon size={16} />
                  </button>
                </div>
                <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                  <SidePanels />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <WorldHistory />
        {showDevPanel && <DevPanel />}
        <ShareCard />
      </div>
    </WorldProvider>
  );
}
