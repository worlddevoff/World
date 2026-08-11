import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useGame } from '../../store/gameStore';
import { renderPark } from './render';
import { screenToGrid, clamp } from '../../utils/iso';
import type { Camera } from '../../utils/iso';
export function ParkCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const camRef = useRef<Camera>({ offsetX: 0, offsetY: 0, zoom: 2 });
  const [, forceRender] = useState(0);
  const hoverRef = useRef<{ x: number; y: number } | null>(null);
  const panRef = useRef<{ dragging: boolean; sx: number; sy: number; ox: number; oy: number } | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 });

  // center camera on entrance initially
  useEffect(() => {
    const st = useGame.getState();
    const c = canvasRef.current;
    if (!c) return;
    camRef.current.offsetX = c.clientWidth / 2 - (st.entrance.x - st.entrance.y) * 16 * camRef.current.zoom;
    camRef.current.offsetY = c.clientHeight / 2 - (st.entrance.x + st.entrance.y) * 8 * camRef.current.zoom - 120;
  }, []);

  // resize
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ro = new ResizeObserver(() => {
      const dpr = 1; // keep pixel-art crisp; integer scale
      c.width = Math.floor(c.clientWidth * dpr);
      c.height = Math.floor(c.clientHeight * dpr);
      sizeRef.current = { w: c.width, h: c.height };
    });
    ro.observe(c);
    return () => ro.disconnect();
  }, []);

  // render loop (separate from sim; just paints)
  useEffect(() => {
    let raf = 0;
    const draw = () => {
      const c = canvasRef.current;
      if (c) {
        const ctx = c.getContext('2d');
        if (ctx) {
          const st = useGame.getState();
          const cam = camRef.current;
          const opts = buildOpts(st, hoverRef.current);
          renderPark(ctx, st, cam, c.width, c.height, opts);
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  const getGrid = useCallback((e: React.MouseEvent) => {
    const c = canvasRef.current!;
    const rect = c.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const g = screenToGrid(sx, sy, camRef.current);
    return { x: Math.floor(g.x + 0.5), y: Math.floor(g.y + 0.5) };
  }, []);

  /** View-only: click guests to inspect. Market builds the park. */
  const inspectAt = useCallback((gx: number, gy: number) => {
    const st = useGame.getState();
    const guest = nearestGuest(st, gx, gy);
    if (guest) st.openWindow('guestinfo', guest.id);
  }, []);

  const onMouseDown = (e: React.MouseEvent) => {
    // Left-drag or right/middle/alt = pan; click = inspect
    if (e.button === 2 || e.button === 1 || e.altKey || e.button === 0) {
      panRef.current = {
        dragging: false,
        sx: e.clientX,
        sy: e.clientY,
        ox: camRef.current.offsetX,
        oy: camRef.current.offsetY,
      };
    }
  };

  const onMouseMove = (e: React.MouseEvent) => {
    const { x, y } = getGrid(e);
    hoverRef.current = { x, y };
    if (!panRef.current) return;
    const dx = e.clientX - panRef.current.sx;
    const dy = e.clientY - panRef.current.sy;
    if (!panRef.current.dragging && Math.hypot(dx, dy) > 4) {
      panRef.current.dragging = true;
    }
    if (panRef.current.dragging) {
      camRef.current.offsetX = panRef.current.ox + dx;
      camRef.current.offsetY = panRef.current.oy + dy;
    }
  };

  const onMouseUp = (e: React.MouseEvent) => {
    if (panRef.current && !panRef.current.dragging && e.button === 0) {
      const { x, y } = getGrid(e);
      inspectAt(x, y);
    }
    panRef.current = null;
  };

  const onWheel = (e: React.WheelEvent) => {
    const cam = camRef.current;
    const rect = canvasRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    // world grid point under the cursor before zoom
    const before = screenToGrid(mx, my, cam);
    const factor = e.deltaY < 0 ? 1.25 : 0.8;
    cam.zoom = clamp(+(cam.zoom * factor).toFixed(3), 1, 6);
    // where that same grid point lands after zoom, then shift offset to keep it under the cursor
    const after = screenToGrid(mx, my, cam);
    const tw = 32 * cam.zoom;
    const th = 16 * cam.zoom;
    cam.offsetX += ((after.x - before.x) - (after.y - before.y)) * (tw / 2);
    cam.offsetY += ((after.x - before.x) + (after.y - before.y)) * (th / 2);
    forceRender((n) => n + 1);
  };

  return (
    <div className="absolute inset-0 overflow-hidden">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={() => {
          panRef.current = null;
        }}
        onWheel={onWheel}
        onContextMenu={(e) => e.preventDefault()}
      />
      <CameraControls camRef={camRef} onChange={() => forceRender((n) => n + 1)} />
    </div>
  );
}

function buildOpts(_st: ReturnType<typeof useGame.getState>, hover: { x: number; y: number } | null) {
  return {
    hover,
    ghost: null,
    coasterCursor: null,
    buildingRideId: undefined,
  };
}

function nearestGuest(st: ReturnType<typeof useGame.getState>, gx: number, gy: number) {
  let best: (typeof st.guests)[number] | null = null;
  let bd = 0.8;
  for (const g of st.guests) {
    const d = Math.hypot(g.x - gx, g.y - gy);
    if (d < bd) { bd = d; best = g; }
  }
  return best;
}

function CameraControls({ camRef, onChange }: { camRef: React.MutableRefObject<Camera>; onChange: () => void }) {
  const zoom = (f: number) => { camRef.current.zoom = clamp(camRef.current.zoom * f, 1, 6); onChange(); };
  const pan = (dx: number, dy: number) => { camRef.current.offsetX += dx; camRef.current.offsetY += dy; onChange(); };
  return (
    <div className="absolute right-3 top-3 flex flex-col gap-2 z-20">
      <div className="grid grid-cols-3 gap-1 rounded-xl border border-white/10 p-1.5" style={{ backgroundColor: 'rgba(17,21,31,0.9)' }}>
        <span />
        <CamBtn onClick={() => pan(0, 60)}>▲</CamBtn>
        <span />
        <CamBtn onClick={() => pan(60, 0)}>◀</CamBtn>
        <CamBtn onClick={() => { camRef.current.zoom = 2; onChange(); }}>◎</CamBtn>
        <CamBtn onClick={() => pan(-60, 0)}>▶</CamBtn>
        <span />
        <CamBtn onClick={() => pan(0, -60)}>▼</CamBtn>
        <span />
      </div>
      <div className="flex gap-1 rounded-xl border border-white/10 p-1.5" style={{ backgroundColor: 'rgba(17,21,31,0.9)' }}>
        <CamBtn onClick={() => zoom(1.25)}>＋</CamBtn>
        <CamBtn onClick={() => zoom(0.8)}>－</CamBtn>
      </div>
    </div>
  );
}

function CamBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-7 h-7 rounded-lg bg-white/[0.05] border border-white/10 hover:bg-accent/20 hover:border-accent/50 text-chrome-text text-sm leading-none flex items-center justify-center transition-colors active:translate-y-px">
      {children}
    </button>
  );
}
