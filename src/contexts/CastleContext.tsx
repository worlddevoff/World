import React, { createContext, useContext, useEffect } from 'react';
import { useCastleEngine, type CastleEngine } from '../hooks/useCastleEngine';
import { usePumpPortal, type PumpFeed } from '../hooks/usePumpPortal';

export type CastleContextValue = CastleEngine & { pump: PumpFeed };

const CastleContext = createContext<CastleContextValue | null>(null);

export function CastleProvider({ children }: { children: React.ReactNode }) {
  const engine = useCastleEngine();
  const pump = usePumpPortal({ submitTransaction: engine.submitTransaction });

  useEffect(() => {
    engine.setMarketCapUsd(pump.marketCapUsd);
  }, [pump.marketCapUsd, engine.setMarketCapUsd]);

  useEffect(() => {
    if (pump.holderCount != null) engine.setHolderCount(pump.holderCount);
  }, [pump.holderCount, engine.setHolderCount]);

  return (
    <CastleContext.Provider value={{ ...engine, pump }}>
      {children}
    </CastleContext.Provider>
  );
}

export function useCastle(): CastleContextValue {
  const ctx = useContext(CastleContext);
  if (!ctx) throw new Error('useCastle must be used within CastleProvider');
  return ctx;
}
