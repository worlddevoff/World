import React from 'react';
import { Window, RctButton } from '../Window';
import { useGame } from '../../store/gameStore';

export function SaveLoadWindow() {
  const save = useGame((s) => s.saveGame);
  const load = useGame((s) => s.loadGame);
  const close = useGame((s) => s.closeWindow);

  return (
    <Window id="saveload" title="Save / Load" width={220}>
      <p className="text-chrome-dark mb-2">Your park is stored in this browser.</p>
      <div className="flex flex-col gap-2">
        <RctButton className="py-1" onClick={() => save()}>💾 Save Game</RctButton>
        <RctButton className="py-1" onClick={() => { if (load()) close('saveload'); }}>📂 Load Game</RctButton>
      </div>
      <p className="text-base text-chrome-dark mt-2">The game also autosaves progress as you play.</p>
    </Window>
  );
}
