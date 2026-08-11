import React from 'react';
import { useGame } from '../store/gameStore';
import { PixelIcon } from './PixelIcon';
import { SITE_NAME, TOKEN_TICKER } from '../../config/brand';

interface ToolBtn {
  icon: Parameters<typeof PixelIcon>[0]['name'];
  label: string;
  onClick: () => void;
}

/** View-only toolbar — park builds itself from the market. */
export function Toolbar() {
  const openWindow = useGame((s) => s.openWindow);

  const buttons: ToolBtn[] = [
    { icon: 'parkinfo', label: 'Park Information', onClick: () => openWindow('parkinfo') },
  ];

  return (
    <div className="bg-[#11151f]/95 border-b border-white/10 flex items-center gap-1.5 px-3 py-2 shrink-0 z-30 overflow-x-auto backdrop-blur">
      <div className="flex items-center gap-2 pr-3 mr-1 border-r border-white/10">
        <span className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center text-white font-extrabold text-sm shadow-[0_0_16px_rgba(91,140,255,0.5)]">
          R
        </span>
        <div className="hidden sm:block leading-tight">
          <div className="font-semibold text-chrome-text text-sm tracking-tight">{SITE_NAME}</div>
          <div className="text-[10px] text-chrome-dark uppercase tracking-wider">
            {TOKEN_TICKER} builds the park
          </div>
        </div>
      </div>
      {buttons.map((b) => (
        <ToolbarButton key={b.label} btn={b} />
      ))}
      <span className="ml-2 text-[11px] text-chrome-dark hidden md:inline">
        Drag to pan · Scroll to zoom · Buys expand · Sells demolish
      </span>
    </div>
  );
}

function ToolbarButton({ btn }: { btn: ToolBtn }) {
  return (
    <div className="relative group">
      <button
        onClick={btn.onClick}
        className="w-10 h-10 flex items-center justify-center rounded-xl border transition-all bg-white/[0.04] border-white/10 hover:bg-white/[0.09] hover:border-white/20 active:translate-y-px"
        aria-label={btn.label}
      >
        <PixelIcon name={btn.icon} size={22} />
      </button>
      <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-12 whitespace-nowrap bg-[#0b0f16] text-chrome-text border border-white/10 font-medium text-xs px-2 py-1 rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-50">
        {btn.label}
      </span>
    </div>
  );
}
