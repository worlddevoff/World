import React, { createContext, useContext, useEffect } from 'react';
import { useWorldEngine, type WorldEngine } from '../hooks/useWorldEngine';
import { usePumpPortal, type PumpFeed } from '../hooks/usePumpPortal';

export type WorldContextValue = WorldEngine & { pump: PumpFeed };

const WorldContext = createContext<WorldContextValue | null>(null);

export function WorldProvider({ children }: { children: React.ReactNode }) {
  const engine = useWorldEngine();
  const pump = usePumpPortal({ submitTransaction: engine.submitTransaction });

  useEffect(() => {
    engine.setMarketCapUsd(pump.marketCapUsd);
  }, [pump.marketCapUsd, engine.setMarketCapUsd]);

  // Population = on-chain token holders.
  useEffect(() => {
    if (pump.holderCount != null) engine.setPopulation(pump.holderCount);
  }, [pump.holderCount, engine.setPopulation]);

  return (
    <WorldContext.Provider value={{ ...engine, pump }}>{children}</WorldContext.Provider>
  );
}

export function useWorld(): WorldContextValue {
  const ctx = useContext(WorldContext);
  if (!ctx) throw new Error('useWorld must be used within WorldProvider');
  return ctx;
}
