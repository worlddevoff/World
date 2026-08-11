import React, { useRef, useState, useEffect } from 'react';
import { useGame } from '../store/gameStore';
import type { WindowId } from '../types/game';

interface WindowProps {
  id: WindowId;
  title: string;
  width?: number;
  children: React.ReactNode;
}

export function Window({ id, title, width = 260, children }: WindowProps) {
  const win = useGame((s) => s.windows.find((w) => w.id === id));
  const close = useGame((s) => s.closeWindow);
  const focus = useGame((s) => s.focusWindow);
  const move = useGame((s) => s.moveWindow);
  const [pos, setPos] = useState({ x: win?.x ?? 80, y: win?.y ?? 80 });
  const dragRef = useRef<{ dx: number; dy: number } | null>(null);
  const posRef = useRef(pos);
  posRef.current = pos;

  useEffect(() => { if (win) setPos({ x: win.x, y: win.y }); }, [win?.x, win?.y]);

  if (!win || !win.open) return null;

  const onDown = (e: React.MouseEvent) => {
    e.preventDefault();
    focus(id);
    dragRef.current = { dx: e.clientX - posRef.current.x, dy: e.clientY - posRef.current.y };
    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const nx = Math.max(0, Math.min(window.innerWidth - 60, ev.clientX - dragRef.current.dx));
      const ny = Math.max(0, Math.min(window.innerHeight - 120, ev.clientY - dragRef.current.dy));
      setPos({ x: nx, y: ny });
    };
    const onUp = () => {
      dragRef.current = null;
      move(id, posRef.current.x, posRef.current.y);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  return (
    <div
      className="absolute bg-chrome-face rounded-win shadow-win font-pixel text-chrome-text flash-in overflow-hidden backdrop-blur-sm"
      style={{ left: pos.x, top: pos.y, width, zIndex: win.z, backgroundColor: 'rgba(28,34,48,0.96)' }}
      onMouseDown={() => focus(id)}
    >
      <div
        className="text-white flex items-center justify-between px-3 py-2 cursor-move select-none border-b border-white/10"
        onMouseDown={onDown}
      >
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-4 rounded-full bg-accent" />
          <span className="font-semibold text-sm tracking-tight">{title}</span>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); close(id); }}
          className="w-6 h-6 rounded-md text-chrome-dark hover:text-white hover:bg-white/10 text-sm leading-none flex items-center justify-center transition-colors"
          aria-label="Close"
        >
          ✕
        </button>
      </div>
      <div className="p-3 text-[15px] leading-snug max-h-[70vh] overflow-auto rct-scroll">{children}</div>
    </div>
  );
}

// Small shared retro building blocks
export function RctButton({ children, onClick, active, className = '' }: { children: React.ReactNode; onClick?: () => void; active?: boolean; className?: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-lg font-medium text-sm leading-tight text-chrome-text border transition-colors ${
        active
          ? 'bg-accent/20 border-accent/60'
          : 'bg-white/[0.04] border-white/10 hover:bg-accent/10 hover:border-accent/50 active:translate-y-px'
      } ${className}`}
    >
      {children}
    </button>
  );
}

export function StatRow({ label, value, color }: { label: string; value: React.ReactNode; color?: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-chrome-dark">{label}</span>
      <span style={{ color }} className="font-bold">{value}</span>
    </div>
  );
}

export function Sunken({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`sunken p-1.5 ${className}`}>{children}</div>;
}
