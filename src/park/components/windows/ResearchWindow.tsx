import React from 'react';
import { Window, Sunken } from '../Window';
import { useGame } from '../../store/gameStore';

export function ResearchWindow() {
  const research = useGame((s) => s.research);
  const progress = useGame((s) => s.researchProgress);
  const discovered = useGame((s) => s.discovered);
  const next = research[0];

  return (
    <Window id="research" title="Research & Development" width={260}>
      <div className="font-display text-sm mb-1">Currently researching</div>
      <Sunken className="mb-1">
        {next ? (
          <>
            <div className="mb-1">{next.name} <span className="text-chrome-dark">({next.kind})</span></div>
            <div className="sunken h-4 w-full">
              <div className="h-full bg-[#7a53c9]" style={{ width: `${Math.min(100, progress)}%` }} />
            </div>
            <div className="text-base text-chrome-dark mt-0.5">{Math.floor(progress)}% complete</div>
          </>
        ) : (
          <div className="text-chrome-dark">All research complete!</div>
        )}
      </Sunken>
      <div className="text-base text-chrome-dark mb-2">Build an Information Kiosk to research faster.</div>

      <div className="font-display text-sm mb-1">Discovered ({discovered.length})</div>
      <Sunken className="flex flex-col gap-0.5 max-h-32 overflow-auto rct-scroll">
        {discovered.length === 0 && <span className="text-chrome-dark">Nothing yet…</span>}
        {discovered.map((d, i) => (
          <span key={i} className="text-rct-money">✓ {d.replace(/_/g, ' ')}</span>
        ))}
      </Sunken>
    </Window>
  );
}
