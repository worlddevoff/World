import React, { createContext, useContext, useEffect } from 'react';
import { usePondEngine, type PondEngine } from '../hooks/usePondEngine';
import { usePumpPortal, type PumpFeed } from '../hooks/usePumpPortal';

export type PondContextValue = PondEngine & { pump: PumpFeed };

const PondContext = createContext<PondContextValue | null>(null);

export function PondProvider({ children }: { children: React.ReactNode }) {
  const engine = usePondEngine();
  const pump = usePumpPortal({ submitTransaction: engine.submitTransaction });

  useEffect(() => {
    engine.setMarketCapUsd(pump.marketCapUsd);
  }, [pump.marketCapUsd, engine.setMarketCapUsd]);

  useEffect(() => {
    if (pump.holderCount != null) engine.setHolderCount(pump.holderCount);
  }, [pump.holderCount, engine.setHolderCount]);

  return (
    <PondContext.Provider value={{ ...engine, pump }}>
      {children}
    </PondContext.Provider>
  );
}

export function usePond(): PondContextValue {
  const ctx = useContext(PondContext);
  if (!ctx) throw new Error('usePond must be used within PondProvider');
  return ctx;
}
