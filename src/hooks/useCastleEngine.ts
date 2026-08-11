import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { WorldTransaction } from '../types/world';
import {
  CASTLE_STAGES,
  CORE_STAGES,
  progressFromMarketCap,
  stonesForBuy,
  type CastleStageId,
  type StageProgress,
} from '../data/castleStages';
import { shortWallet, uid, randomWallet } from '../utils/format';
import { worldSound } from '../utils/sound';

export interface CastleEvent {
  id: string;
  type: 'BUY' | 'SELL';
  amount: number;
  wallet: string;
  stones: number;
  stageId: CastleStageId;
  label: string;
  emoji: string;
  ts: number;
}

export interface CastleBuilder {
  wallet: string;
  stones: number;
  contributed: number;
}

export interface CastlePulse {
  id: string;
  stones: number;
  wallet: string;
  ts: number;
}

export interface CastleEngine {
  stages: StageProgress[];
  activeIndex: number;
  totalFill: number;
  /** Always false — the castle never finishes. */
  complete: false;
  expansionLevel: number;
  /** Session stones from live buys (animation juice). */
  sessionStones: number;
  events: CastleEvent[];
  builders: CastleBuilder[];
  pulse: CastlePulse | null;
  /** Community vote tallies for the next focus stage. */
  votes: Record<CastleStageId, number>;
  voteFocus: CastleStageId | null;
  castVote: (stageId: CastleStageId) => void;
  /** Effective MC used for castle progress (dev override wins when set). */
  marketCapUsd: number | null;
  /** Live feed MC (ignores dev scrub). */
  liveMarketCapUsd: number | null;
  setMarketCapUsd: (n: number | null) => void;
  /** Pin MC for demos — blocks live feed overwrites until cleared. */
  setDevMarketCap: (n: number | null) => void;
  clearDevMarketCap: () => void;
  devMarketCap: number | null;
  holderCount: number | null;
  setHolderCount: (n: number | null) => void;
  muted: boolean;
  setMuted: (v: boolean) => void;
  submitTransaction: (tx: WorldTransaction) => void;
  triggerBuy: (amount: number, mine?: boolean) => void;
  triggerSell: (amount: number) => void;
  triggerBuildWave: () => void;
}

const VOTE_KEY = 'castle.votes';
const MY_VOTE_KEY = 'castle.myVote';

function loadVotes(): Record<CastleStageId, number> {
  const empty = Object.fromEntries(
    CASTLE_STAGES.map((s) => [s.id, 0]),
  ) as Record<CastleStageId, number>;
  try {
    const raw = localStorage.getItem(VOTE_KEY);
    if (!raw) return empty;
    return { ...empty, ...JSON.parse(raw) };
  } catch {
    return empty;
  }
}

function loadMyVote(): CastleStageId | null {
  try {
    const v = localStorage.getItem(MY_VOTE_KEY)?.trim();
    if (
      v &&
      (CORE_STAGES.some((s) => s.id === v) || v.startsWith('expansion-'))
    ) {
      return v;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function useCastleEngine(): CastleEngine {
  const [liveMarketCapUsd, setLiveMarketCapUsd] = useState<number | null>(null);
  const [devMarketCap, setDevMarketCapState] = useState<number | null>(null);
  const [holderCount, setHolderCount] = useState<number | null>(null);
  const [sessionStones, setSessionStones] = useState(0);
  const [events, setEvents] = useState<CastleEvent[]>([]);
  const [builders, setBuilders] = useState<CastleBuilder[]>([]);
  const buildersRef = useRef<Record<string, CastleBuilder>>({});
  const [pulse, setPulse] = useState<CastlePulse | null>(null);
  const [votes, setVotes] = useState<Record<CastleStageId, number>>(loadVotes);
  const [myVote, setMyVote] = useState<CastleStageId | null>(loadMyVote);
  const [muted, setMutedState] = useState(() => {
    try {
      return localStorage.getItem('world.muted') === '1';
    } catch {
      return false;
    }
  });

  const marketCapUsd = devMarketCap ?? liveMarketCapUsd;
  const marketCapRef = useRef(marketCapUsd);
  marketCapRef.current = marketCapUsd;

  const setMarketCapUsd = useCallback((n: number | null) => {
    // Live feed updates — ignored while a dev scrub is active.
    if (devMarketCap != null) return;
    setLiveMarketCapUsd(n);
  }, [devMarketCap]);

  const setDevMarketCap = useCallback((n: number | null) => {
    setDevMarketCapState(n);
  }, []);

  const clearDevMarketCap = useCallback(() => {
    setDevMarketCapState(null);
  }, []);

  const derived = useMemo(
    () => progressFromMarketCap(marketCapUsd),
    [marketCapUsd],
  );

  const setMuted = useCallback((v: boolean) => {
    worldSound.setMuted(v);
    setMutedState(v);
  }, []);

  const castVote = useCallback((stageId: CastleStageId) => {
    setMyVote((prevVote) => {
      if (prevVote === stageId) return prevVote;
      setVotes((prev) => {
        const next = { ...prev };
        if (prevVote) next[prevVote] = Math.max(0, (next[prevVote] ?? 0) - 1);
        next[stageId] = (next[stageId] ?? 0) + 1;
        try {
          localStorage.setItem(VOTE_KEY, JSON.stringify(next));
          localStorage.setItem(MY_VOTE_KEY, stageId);
        } catch {
          /* ignore */
        }
        return next;
      });
      return stageId;
    });
  }, []);

  const voteFocus = useMemo(() => {
    let best: CastleStageId | null = null;
    let n = 0;
    for (const s of CASTLE_STAGES) {
      const v = votes[s.id] ?? 0;
      if (v > n) {
        n = v;
        best = s.id;
      }
    }
    return best;
  }, [votes]);

  const submitTransaction = useCallback((tx: WorldTransaction) => {
    const mc = marketCapRef.current;
    const { stages, activeIndex } = progressFromMarketCap(mc);
    const stage = stages[activeIndex]?.def ?? CASTLE_STAGES[0];
    const stones = tx.type === 'BUY' ? stonesForBuy(tx.amount) : 0;

    if (tx.type === 'BUY') {
      setSessionStones((n) => n + stones);
      const cur = buildersRef.current[tx.wallet] ?? {
        wallet: tx.wallet,
        stones: 0,
        contributed: 0,
      };
      buildersRef.current[tx.wallet] = {
        wallet: tx.wallet,
        stones: cur.stones + stones,
        contributed: cur.contributed + tx.amount,
      };
      setBuilders(
        Object.values(buildersRef.current)
          .sort((a, b) => b.contributed - a.contributed)
          .slice(0, 20),
      );

      // Sim buys nudge MC so the keep visibly grows while scrubbing.
      if (tx.transaction === 'sim') {
        setDevMarketCapState((prev) => {
          const base = prev ?? mc ?? 0;
          return base + tx.amount * 12;
        });
      }

      const pulseId = uid('pulse');
      setPulse({ id: pulseId, stones, wallet: tx.wallet, ts: Date.now() });
      window.setTimeout(() => {
        setPulse((p) => (p?.id === pulseId ? null : p));
      }, 2200);

      worldSound.play(tx.amount >= 250 ? 'coinBig' : 'coin');
      window.setTimeout(
        () => worldSound.play(tx.amount >= 250 ? 'buildBig' : 'build'),
        200,
      );
    } else {
      if (tx.transaction === 'sim') {
        setDevMarketCapState((prev) => {
          const base = prev ?? mc ?? 0;
          return Math.max(0, base - tx.amount * 10);
        });
      }
      worldSound.play('sell');
    }

    const label =
      tx.type === 'BUY'
        ? `${shortWallet(tx.wallet)} added ${stones} stone${stones === 1 ? '' : 's'} to ${stage.name}`
        : `${shortWallet(tx.wallet)} shook the battlements`;

    setEvents((e) =>
      [
        {
          id: uid('ev'),
          type: tx.type,
          amount: tx.amount,
          wallet: tx.wallet,
          stones,
          stageId: stage.id,
          label,
          emoji: tx.type === 'BUY' ? stage.emoji : '💥',
          ts: Date.now(),
        },
        ...e,
      ].slice(0, 40),
    );
  }, []);

  const triggerBuy = useCallback(
    (amount: number, mine = false) => {
      submitTransaction({
        type: 'BUY',
        amount,
        wallet: mine ? 'DevBuilder1111111111111111111111111' : randomWallet(),
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

  const triggerBuildWave = useCallback(() => {
    for (let i = 0; i < 8; i++) {
      window.setTimeout(
        () => triggerBuy(40 + Math.random() * 400, false),
        i * 280,
      );
    }
  }, [triggerBuy]);

  // Keep sound mute in sync on mount
  useEffect(() => {
    worldSound.setMuted(muted);
  }, [muted]);

  return {
    stages: derived.stages,
    activeIndex: derived.activeIndex,
    totalFill: derived.totalFill,
    complete: false,
    expansionLevel: derived.expansionLevel,
    sessionStones,
    events,
    builders,
    pulse,
    votes,
    voteFocus,
    castVote,
    marketCapUsd,
    liveMarketCapUsd,
    setMarketCapUsd,
    setDevMarketCap,
    clearDevMarketCap,
    devMarketCap,
    holderCount,
    setHolderCount,
    muted,
    setMuted,
    submitTransaction,
    triggerBuy,
    triggerSell,
    triggerBuildWave,
  };
}
