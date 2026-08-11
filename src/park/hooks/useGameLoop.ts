import { useEffect, useRef } from 'react';
import { useGame } from '../store/gameStore';

// Drives the simulation with a fixed timestep accumulator, scaled by sim speed.
export function useGameLoop() {
  const raf = useRef<number>(0);
  const last = useRef<number>(performance.now());
  const acc = useRef<number>(0);

  useEffect(() => {
    const STEP = 1 / 30; // sim seconds per fixed step
    const loop = (now: number) => {
      const state = useGame.getState();
      const speed = state.speed;
      let frameDt = (now - last.current) / 1000;
      last.current = now;
      if (frameDt > 0.25) frameDt = 0.25; // clamp after tab switch

      if (speed > 0) {
        acc.current += frameDt * speed;
        let steps = 0;
        while (acc.current >= STEP && steps < 8) {
          state.tick(STEP);
          acc.current -= STEP;
          steps += 1;
        }
      } else {
        acc.current = 0;
      }
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, []);
}
