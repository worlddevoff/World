import React, { useEffect } from 'react';
import { useGame } from '../store/gameStore';
import type { GameNotification } from '../types/game';

const COLOR: Record<GameNotification['kind'], string> = {
  info: '#5b8cff',
  good: '#37d67a',
  bad: '#ff5c6c',
  research: '#a978ff',
};

const ICON: Record<GameNotification['kind'], string> = {
  info: 'ℹ', good: '✓', bad: '!', research: '✦',
};

export function Notifications() {
  const notifications = useGame((s) => s.notifications) ?? [];
  const dismiss = useGame((s) => s.dismissNotif);

  if (!notifications.length) return null;

  return (
    <div className="absolute top-2 left-1/2 -translate-x-1/2 flex flex-col gap-1 z-40 items-center">
      {notifications.slice(-4).map((n) => (
        <NotifCard key={n.id} n={n} onDismiss={() => dismiss(n.id)} />
      ))}
    </div>
  );
}

function NotifCard({ n, onDismiss }: { n: GameNotification; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 6000);
    return () => clearTimeout(t);
  }, [n.id]);
  return (
    <div
      className="flex items-center gap-3 pl-3 pr-2 py-2 rounded-xl text-sm text-chrome-text shadow-win flash-in border border-white/10"
      style={{ backgroundColor: 'rgba(28,34,48,0.96)' }}
    >
      <span
        className="w-6 h-6 rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0"
        style={{ backgroundColor: COLOR[n.kind] }}
      >
        {ICON[n.kind]}
      </span>
      <span className="font-medium">{n.text}</span>
      <button
        onClick={onDismiss}
        className="w-6 h-6 rounded-md text-chrome-dark hover:text-white hover:bg-white/10 text-xs leading-none transition-colors"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}
