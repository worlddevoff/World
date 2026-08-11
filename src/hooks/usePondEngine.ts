import { useCallback, useEffect, useRef, useState } from 'react';
import type { WorldTransaction } from '../types/world';
import {
  POND_H,
  POND_W,
  labelForTier,
  makeFish,
  pickFishForSell,
  type Fish,
  type HookCatch,
} from '../data/pond';
import { shortWallet, uid, randomWallet } from '../utils/format';
import { worldSound } from '../utils/sound';

export interface PondEvent {
  id: string;
  type: 'BUY' | 'SELL';
  amount: number;
  wallet: string;
  label: string;
  emoji: string;
  ts: number;
}

export interface PondAngler {
  wallet: string;
  fishSpawned: number;
  fishHooked: number;
  contributed: number;
}

export interface PondEngine {
  fish: Fish[];
  hook: HookCatch | null;
  events: PondEvent[];
  anglers: PondAngler[];
  marketCapUsd: number | null;
  setMarketCapUsd: (n: number | null) => void;
  holderCount: number | null;
  setHolderCount: (n: number | null) => void;
  muted: boolean;
  setMuted: (v: boolean) => void;
  submitTransaction: (tx: WorldTransaction) => void;
  triggerBuy: (amount: number, mine?: boolean) => void;
  triggerSell: (amount: number) => void;
  triggerSchool: () => void;
}

const HOOK_MS = 1600;

export function usePondEngine(): PondEngine {
  const [fish, setFish] = useState<Fish[]>([]);
  const fishRef = useRef<Fish[]>([]);
  fishRef.current = fish;

  const [hook, setHook] = useState<HookCatch | null>(null);
  const hookRef = useRef<HookCatch | null>(null);
  hookRef.current = hook;

  const [events, setEvents] = useState<PondEvent[]>([]);
  const [anglers, setAnglers] = useState<PondAngler[]>([]);
  const anglersRef = useRef<Record<string, PondAngler>>({});

  const [marketCapUsd, setMarketCapUsd] = useState<number | null>(null);
  const [holderCount, setHolderCount] = useState<number | null>(null);
  const [muted, setMutedState] = useState(() => {
    try {
      return localStorage.getItem('world.muted') === '1';
    } catch {
      return false;
    }
  });

  const setMuted = useCallback((v: boolean) => {
    worldSound.setMuted(v);
    setMutedState(v);
  }, []);

  useEffect(() => {
    worldSound.setMuted(muted);
  }, [muted]);

  // Swim loop
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(48, now - last) / 16.67;
      last = now;

      const hookedId = hookRef.current?.fish.id;
      setFish((prev) => {
        if (prev.length === 0) return prev;
        return prev.map((f) => {
          if (f.id === hookedId) return f;
          let { x, y, vx, vy, facing, wobble } = f;
          // Tail beat — bigger fish swim a touch slower, more glide
          const cruise = (0.55 + 0.2 / f.size) * (0.85 + 0.15 * Math.sin(wobble));
          wobble += (0.14 + f.size * 0.02) * dt;
          x += vx * dt * cruise;
          y += vy * dt + Math.sin(wobble * 1.3) * 0.06 * dt;

          // Stay inside the water ellipse (matches PondCanvas basin)
          const cx = POND_W / 2;
          const cy = POND_H / 2;
          const rx = POND_W * 0.42 - f.size * 1.5;
          const ry = POND_H * 0.37 - f.size * 1.2;
          const nx = (x - cx) / rx;
          const ny = (y - cy) / ry;
          const d2 = nx * nx + ny * ny;
          if (d2 > 1) {
            const d = Math.sqrt(d2) || 1;
            x = cx + (nx / d) * rx * 0.96;
            y = cy + (ny / d) * ry * 0.96;
            vx -= nx * 0.05 * dt;
            vy -= ny * 0.05 * dt;
          }

          // Occasional course change
          if (Math.random() < 0.015 * dt) {
            vx += (Math.random() - 0.5) * 0.12;
            vy += (Math.random() - 0.5) * 0.08;
          }
          const sp = Math.hypot(vx, vy) || 1;
          const max = 0.48;
          const min = 0.12;
          if (sp > max) {
            vx = (vx / sp) * max;
            vy = (vy / sp) * max;
          } else if (sp < min) {
            vx = (vx / sp) * min;
            vy = (vy / sp) * min;
          }
          facing = vx >= 0 ? 1 : -1;
          return { ...f, x, y, vx, vy, facing, wobble };
        });
      });

      // Advance hook animation
      setHook((h) => {
        if (!h) return null;
        const elapsed = now - h.startedAt;
        const t = Math.min(1, elapsed / HOOK_MS);
        let phase: HookCatch['phase'] = 'drop';
        if (t > 0.35 && t <= 0.55) phase = 'grab';
        else if (t > 0.55) phase = 'lift';
        if (t >= 1) return null;
        return { ...h, t, phase };
      });

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const bumpAngler = useCallback(
    (wallet: string, delta: Partial<Omit<PondAngler, 'wallet'>>) => {
      const cur = anglersRef.current[wallet] ?? {
        wallet,
        fishSpawned: 0,
        fishHooked: 0,
        contributed: 0,
      };
      anglersRef.current[wallet] = {
        wallet,
        fishSpawned: cur.fishSpawned + (delta.fishSpawned ?? 0),
        fishHooked: cur.fishHooked + (delta.fishHooked ?? 0),
        contributed: cur.contributed + (delta.contributed ?? 0),
      };
      setAnglers(
        Object.values(anglersRef.current)
          .sort((a, b) => b.contributed - a.contributed)
          .slice(0, 20),
      );
    },
    [],
  );

  const submitTransaction = useCallback(
    (tx: WorldTransaction) => {
      if (tx.type === 'BUY') {
        const f = makeFish(uid('fish'), tx.wallet, tx.amount, POND_W, POND_H);
        setFish((prev) => [...prev, f].slice(-80));
        bumpAngler(tx.wallet, { fishSpawned: 1, contributed: tx.amount });
        worldSound.play(tx.amount >= 250 ? 'coinBig' : 'coin');
        window.setTimeout(
          () => worldSound.play(tx.amount >= 250 ? 'buildBig' : 'build'),
          160,
        );
        setEvents((e) =>
          [
            {
              id: uid('ev'),
              type: 'BUY' as const,
              amount: tx.amount,
              wallet: tx.wallet,
              label: `${shortWallet(tx.wallet)} released a ${labelForTier(f.tier)}`,
              emoji: f.tier === 'whale' ? '🐋' : f.tier === 'tuna' ? '🐟' : '🐠',
              ts: Date.now(),
            },
            ...e,
          ].slice(0, 40),
        );
        return;
      }

      // SELL — hook a fish
      if (hookRef.current) {
        // Already reeling — still log the sell
        worldSound.play('sell');
        setEvents((e) =>
          [
            {
              id: uid('ev'),
              type: 'SELL' as const,
              amount: tx.amount,
              wallet: tx.wallet,
              label: `${shortWallet(tx.wallet)} cast a line — pond busy`,
              emoji: '🎣',
              ts: Date.now(),
            },
            ...e,
          ].slice(0, 40),
        );
        return;
      }

      const victim = pickFishForSell(fishRef.current, tx.amount);
      if (!victim) {
        worldSound.play('sell');
        setEvents((e) =>
          [
            {
              id: uid('ev'),
              type: 'SELL' as const,
              amount: tx.amount,
              wallet: tx.wallet,
              label: `${shortWallet(tx.wallet)} cast into an empty pond`,
              emoji: '🪝',
              ts: Date.now(),
            },
            ...e,
          ].slice(0, 40),
        );
        return;
      }

      const catchId = uid('hook');
      const startedAt = performance.now();
      const catchState: HookCatch = {
        id: catchId,
        fish: victim,
        t: 0,
        phase: 'drop',
        startedAt,
      };
      hookRef.current = catchState;
      setHook(catchState);
      worldSound.play('sell');
      window.setTimeout(() => worldSound.play('collapse'), 500);

      bumpAngler(tx.wallet, { fishHooked: 1 });

      setEvents((e) =>
        [
          {
            id: uid('ev'),
            type: 'SELL' as const,
            amount: tx.amount,
            wallet: tx.wallet,
            label: `${shortWallet(tx.wallet)} hooked a ${labelForTier(victim.tier)}`,
            emoji: '🎣',
            ts: Date.now(),
          },
          ...e,
        ].slice(0, 40),
      );

      // Remove fish when lift finishes
      window.setTimeout(() => {
        setFish((prev) => prev.filter((f) => f.id !== victim.id));
        if (hookRef.current?.id === catchId) {
          hookRef.current = null;
          setHook(null);
        }
      }, HOOK_MS);
    },
    [bumpAngler],
  );

  const triggerBuy = useCallback(
    (amount: number, mine = false) => {
      submitTransaction({
        type: 'BUY',
        amount,
        wallet: mine ? 'DevAngler11111111111111111111111111' : randomWallet(),
        timestamp: new Date().toISOString(),
        transaction: 'sim',
      });
    },
    [submitTransaction],
  );

  const triggerSell = useCallback(
    (amount: number) => {
      submitTransaction({
        type: 'SELL',
        amount,
        wallet: randomWallet(),
        timestamp: new Date().toISOString(),
        transaction: 'sim',
      });
    },
    [submitTransaction],
  );

  const triggerSchool = useCallback(() => {
    for (let i = 0; i < 10; i++) {
      window.setTimeout(
        () => triggerBuy(10 + Math.random() * 400, false),
        i * 220,
      );
    }
  }, [triggerBuy]);

  return {
    fish,
    hook,
    events,
    anglers,
    marketCapUsd,
    setMarketCapUsd,
    holderCount,
    setHolderCount,
    muted,
    setMuted,
    submitTransaction,
    triggerBuy,
    triggerSell,
    triggerSchool,
  };
}
