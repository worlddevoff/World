import React from 'react';
import { Window } from '../Window';
import { useGame } from '../../store/gameStore';
import type { StaffKind } from '../../types/game';

const KINDS: { kind: StaffKind; name: string; wage: number; desc: string }[] = [
  { kind: 'mechanic', name: 'Mechanic', wage: 80, desc: 'Fixes broken-down rides.' },
  { kind: 'handyman', name: 'Handyman', wage: 45, desc: 'Cleans paths & waters gardens.' },
  { kind: 'entertainer', name: 'Entertainer', wage: 60, desc: 'Keeps waiting guests happy.' },
  { kind: 'security', name: 'Security', wage: 70, desc: 'Stops vandalism.' },
];

export function StaffWindow() {
  const setTool = useGame((s) => s.setTool);
  const tool = useGame((s) => s.tool);
  const payload = useGame((s) => s.toolPayload);
  const staff = useGame((s) => s.staff);

  return (
    <Window id="staff" title="Staff" width={250}>
      <p className="text-chrome-dark mb-1">Select a type, then click a path to place them.</p>
      <div className="flex flex-col gap-1">
        {KINDS.map((k) => {
          const active = tool === 'staff' && payload === k.kind;
          const count = staff.filter((s) => s.kind === k.kind).length;
          return (
            <button
              key={k.kind}
              onClick={() => setTool('staff', k.kind)}
              className={`text-left p-1.5 bg-chrome-face ${active ? 'bevel-in bg-[#b7ae9c]' : 'bevel-out active:bevel-in'}`}
            >
              <div className="flex justify-between leading-none">
                <span>{k.name} <span className="text-chrome-dark">×{count}</span></span>
                <span className="text-rct-red font-bold">${k.wage}/mo</span>
              </div>
              <div className="text-base text-chrome-dark">{k.desc}</div>
            </button>
          );
        })}
      </div>
    </Window>
  );
}
