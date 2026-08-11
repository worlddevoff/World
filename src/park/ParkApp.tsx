import React, { useEffect } from 'react';
import { useGame } from './store/gameStore';
import { useGameLoop } from './hooks/useGameLoop';
import { useParkMarket } from './hooks/useParkMarket';
import { ParkCanvas } from './components/ParkCanvas/ParkCanvas';
import { StatusBar } from './components/StatusBar';
import { Toolbar } from './components/Toolbar';
import { Notifications } from './components/Notifications';
import { ParkInfoWindow } from './components/windows/ParkInfoWindow';
import { GuestInfoWindow } from './components/windows/GuestInfoWindow';

import { createStarterPark } from './data/starterPark';

export function ParkApp() {
  useGameLoop();
  useParkMarket();

  useEffect(() => {
    useGame.getState().setTool('inspect');
    useGame.getState().closeWindow('rideinfo');
    if (!useGame.getState().notifications) {
      useGame.setState({ notifications: [] });
    }

    // Repair self-overlapping coaster tracks from older layouts
    const st = useGame.getState();
    const bad = st.rides.some((r) => {
      if (r.category !== 'coaster') return false;
      const seen = new Set<string>();
      for (const seg of r.track) {
        const k = `${seg.x},${seg.y}`;
        if (seen.has(k)) return true;
        seen.add(k);
      }
      return false;
    });
    if (bad) {
      const starter = createStarterPark(st.entrance);
      useGame.setState({
        paths: starter.paths,
        rides: starter.rides,
        shops: starter.shops,
        scenery: starter.scenery,
        staff: starter.staff,
        guests: starter.guests,
        parkValue: Math.max(st.parkValue, starter.parkValue),
        notifications: [
          ...(st.notifications ?? []).slice(-5),
          {
            id: `n_parkfix_${Date.now()}`,
            kind: 'info',
            text: 'Coaster rebuilt — track no longer overlaps itself.',
            time: Date.now(),
          },
        ],
      });
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '3') {
        useGame.getState().setSpeed(Number(e.key) as 0 | 1 | 2 | 3);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="w-full h-full flex flex-col bg-[#2a2a2a] overflow-hidden">
      <Toolbar />
      <div className="relative flex-1 overflow-hidden">
        <ParkCanvas />
        <Notifications />
        <ParkInfoWindow />
        <GuestInfoWindow />
      </div>
      <StatusBar />
    </div>
  );
}
