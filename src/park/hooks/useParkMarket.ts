import { useEffect, useRef } from 'react';
import { usePumpPortal } from '../../hooks/usePumpPortal';
import { fetchOrganism } from '../../lib/organismApi';
import { useGame } from '../store/gameStore';
import {
  applyGrowth,
  applyShrink,
  growthStepsForBuy,
  ratingFromMarket,
  reconcileToTargets,
  shrinkStepsForSell,
  targetsFromMarket,
  unlockAllRides,
} from '../market/parkGrowth';

function applyPatch(patch: Record<string, unknown>) {
  useGame.setState((s) => ({
    ...patch,
    paths: (patch.paths as Set<string> | undefined) ?? s.paths,
  }));
}

function syncRating() {
  const s = useGame.getState();
  const parkRating = ratingFromMarket({
    holders: s.marketHolders,
    marketCapUsd: s.marketCapUsd,
    buyUsd: s.marketBuyUsd,
    sellUsd: s.marketSellUsd,
    rideCount: s.rides.length,
    shopCount: s.shops.length,
  });
  useGame.setState({ parkRating });
}

/**
 * Drives the park from live $RollerCT market:
 * buys expand, sells shrink, holders + mcap set the target footprint.
 */
export function useParkMarket() {
  const pump = usePumpPortal({
    submitTransaction: () => {
      /* trades land via server bridge → we poll organism events */
    },
  });

  const lastHolders = useRef<number | null>(null);
  const lastTradeCount = useRef(0);
  const seenEventIds = useRef<Set<string>>(new Set());
  const totalsSeeded = useRef(false);
  const primed = useRef(false);

  useEffect(() => {
    unlockAllRides();
  }, []);

  // Live token quote → status bar + park footprint + rating
  useEffect(() => {
    const holders = pump.holderCount ?? 0;
    const mcap = pump.marketCapUsd ?? 0;
    const price = pump.priceUsd ?? 0;
    const vol = pump.volume24hUsd ?? 0;
    if (!pump.mint) return;

    const targets = targetsFromMarket({
      holders,
      marketCapUsd: mcap,
      priceUsd: pump.priceUsd,
    });

    const prevH = lastHolders.current;
    lastHolders.current = holders;

    useGame.setState((s) => {
      const withMarket = {
        ...s,
        marketHolders: holders,
        marketCapUsd: mcap,
        marketPriceUsd: price,
        marketVolume24hUsd: vol,
        notifications: s.notifications ?? [],
      };
      const patch = reconcileToTargets(withMarket, targets);
      let next: Partial<typeof s> = {
        ...patch,
        marketHolders: holders,
        marketCapUsd: mcap,
        marketPriceUsd: price,
        marketVolume24hUsd: vol,
        paths: (patch.paths as Set<string> | undefined) ?? s.paths,
        notifications: patch.notifications ?? s.notifications ?? [],
      };

      if (prevH != null && holders < prevH) {
        const lost = prevH - holders;
        const shrink = applyShrink({ ...s, ...next } as typeof s, Math.min(20, lost * 2));
        next = {
          ...next,
          ...shrink,
          paths: (shrink.paths as Set<string> | undefined) ?? next.paths,
          notifications: shrink.notifications ?? next.notifications ?? s.notifications ?? [],
        };
      } else if (prevH != null && holders > prevH) {
        const gained = holders - prevH;
        const grow = applyGrowth({ ...s, ...next } as typeof s, Math.min(12, gained));
        next = {
          ...next,
          ...grow,
          paths: (grow.paths as Set<string> | undefined) ?? next.paths,
          notifications: grow.notifications ?? next.notifications ?? s.notifications ?? [],
        };
      }

      const parkRating = ratingFromMarket({
        holders,
        marketCapUsd: mcap,
        buyUsd: s.marketBuyUsd,
        sellUsd: s.marketSellUsd,
        rideCount: (next.rides ?? s.rides).length,
        shopCount: (next.shops ?? s.shops).length,
      });

      return {
        ...next,
        parkRating,
        notifications: next.notifications ?? s.notifications ?? [],
      };
    });

    if (!primed.current && (holders > 0 || mcap > 0 || price > 0)) {
      primed.current = true;
      useGame.getState().notify('info', 'Park linked to live market — buys build, sells demolish.');
    }
  }, [
    pump.holderCount,
    pump.marketCapUsd,
    pump.priceUsd,
    pump.volume24hUsd,
    pump.mint,
  ]);

  // Soft pulse on trade count (direction unknown)
  useEffect(() => {
    if (pump.tradeCount <= lastTradeCount.current) {
      lastTradeCount.current = Math.max(lastTradeCount.current, pump.tradeCount);
      return;
    }
    const delta = pump.tradeCount - lastTradeCount.current;
    lastTradeCount.current = pump.tradeCount;
    if (delta > 0) {
      useGame.setState((s) => {
        const grow = applyGrowth(s, Math.min(3, delta));
        return { ...grow, paths: (grow.paths as Set<string> | undefined) ?? s.paths };
      });
      syncRating();
    }
  }, [pump.tradeCount]);

  // Organism market events → buy/sell USD totals + grow/shrink
  useEffect(() => {
    if (!pump.mint) return;
    let cancelled = false;

    const pull = async () => {
      const snap = await fetchOrganism();
      if (cancelled || !snap?.state?.events) return;
      const events = snap.state.events;

      const buyCount = snap.state.buyCount ?? 0;
      const sellCount = snap.state.sellCount ?? 0;

      if (!totalsSeeded.current) {
        totalsSeeded.current = true;
        let buyUsd = 0;
        let sellUsd = 0;
        let buys = 0;
        let sells = 0;
        for (const e of events) {
          seenEventIds.current.add(e.id);
          if (e.kind === 'buy') {
            buyUsd += e.amount || 0;
            buys += 1;
          }
          if (e.kind === 'sell') {
            sellUsd += e.amount || 0;
            sells += 1;
          }
        }
        useGame.setState({
          marketBuyUsd: buyUsd,
          marketSellUsd: sellUsd,
          marketBuyCount: Math.max(buys, buyCount),
          marketSellCount: Math.max(sells, sellCount),
        });
        syncRating();
        return;
      }

      // Keep trade counts in sync even when no new event ids
      useGame.setState((s) => ({
        marketBuyCount: Math.max(s.marketBuyCount, buyCount),
        marketSellCount: Math.max(s.marketSellCount, sellCount),
      }));

      for (const e of [...events].reverse()) {
        if (seenEventIds.current.has(e.id)) continue;
        seenEventIds.current.add(e.id);
        if (e.kind !== 'buy' && e.kind !== 'sell') continue;
        const amount = e.amount ?? 20;

        if (e.kind === 'buy') {
          useGame.setState((s) => ({
            marketBuyUsd: s.marketBuyUsd + amount,
            marketBuyCount: s.marketBuyCount + 1,
          }));
          const steps = growthStepsForBuy(amount);
          applyPatch(applyGrowth(useGame.getState(), steps));
          useGame.getState().notify('good', `Buy $${Math.round(amount)} — park expands`);
        } else {
          useGame.setState((s) => ({
            marketSellUsd: s.marketSellUsd + amount,
            marketSellCount: s.marketSellCount + 1,
          }));
          const steps = shrinkStepsForSell(amount);
          applyPatch(applyShrink(useGame.getState(), steps));
          useGame.getState().notify('bad', `Sell $${Math.round(amount)} — park loses attractions`);
        }
        syncRating();
      }

      if (seenEventIds.current.size > 400) {
        seenEventIds.current = new Set([...seenEventIds.current].slice(-200));
      }
    };

    void pull();
    const id = window.setInterval(pull, 8_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [pump.mint]);

  return pump;
}
