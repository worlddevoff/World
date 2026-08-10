import React, { useMemo } from 'react';
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

export function App() {
  const showDevPanel = useShowDevPanel();

  return (
    <WorldProvider>
      <div className="flex h-screen w-full flex-col overflow-hidden bg-[#0f2417] font-sans">
        <TopBar />

        <div className="relative flex flex-1 overflow-hidden">
          {/* The world is the product — it takes the majority of the screen */}
          <main className="relative flex-1">
            <WorldCanvas />
          </main>

          {/* Right rail: live activity + world panels */}
          <aside className="z-20 flex w-80 shrink-0 flex-col gap-3 overflow-y-auto border-l border-black/20 bg-slate-50 p-3">
            <div className="min-h-[220px] flex-1">
              <LiveActivity />
            </div>
            <PlayerProfile />
            <Leaderboard />
          </aside>
        </div>

        {/* Floating overlays */}
        <WorldHistory />
        {showDevPanel && <DevPanel />}
        <ShareCard />
      </div>
    </WorldProvider>
  );
}
