import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useWorld } from '../../contexts/WorldContext';
import { Terrain } from './Terrain';
import { WorldObjectView } from './WorldObjectView';
import { VehicleView, CritterView, PedestrianView } from './Actors';
import { ObjectInspector } from './ObjectInspector';
import { EventPings } from './EventPings';
import { DistrictAmbience } from './DistrictAmbience';
import { DisasterOverlay, Birds } from './effects';
import { snapshotAt } from '../../utils/replay';
import { objectDepth, gridToScreen } from '../../utils/iso';
import { WORLD_CENTER } from '../../data/zones';
import { clamp } from '../../utils/iso';

/** Irregular high-frequency quake offsets (screen-space, pre-scale). */
const QUAKE_X = [0, -2, 3, -5, 7, -9, 11, -8, 13, -12, 9, -14, 10, -7, 12, -9, 6, -4, 5, -3, 2, -1, 0];
const QUAKE_Y = [0, 1, -2, 2, -3, 4, -3, 5, -4, 3, -5, 4, -2, 3, -4, 2, -2, 1, -1, 2, -1, 0, 0];

// Sky gradient by time of day — Space Age leaves the planet behind.
function skyStyle(timeOfDay: number, lunar: boolean): React.CSSProperties {
  if (lunar) {
    return {
      background:
        'radial-gradient(ellipse at 70% 18%, rgba(96,165,250,0.18), transparent 42%), linear-gradient(to bottom, #020617 0%, #0b1224 55%, #111827 100%)',
      transition: 'background 1.6s ease',
    };
  }
  // 0=midnight .25=dawn .5=noon .75=dusk
  let top = '#87ceeb';
  let bottom = '#c8f0d8';
  if (timeOfDay < 0.2) {
    top = '#0f172a';
    bottom = '#1e293b';
  } else if (timeOfDay < 0.32) {
    top = '#f59e0b';
    bottom = '#fde68a';
  } else if (timeOfDay < 0.68) {
    top = '#7dd3fc';
    bottom = '#bbf7d0';
  } else if (timeOfDay < 0.82) {
    top = '#f97316';
    bottom = '#fca5a5';
  } else {
    top = '#0f172a';
    bottom = '#1e293b';
  }
  return { background: `linear-gradient(to bottom, ${top}, ${bottom})`, transition: 'background 1.6s ease' };
}

/** Stable starfield for the lunar sky. */
const STARS = Array.from({ length: 48 }, (_, i) => ({
  left: `${(i * 37 + 11) % 97}%`,
  top: `${(i * 53 + 7) % 72}%`,
  size: 1 + (i % 3),
  delay: (i % 10) * 0.35,
  dur: 2.2 + (i % 5) * 0.4,
}));

export function WorldCanvas() {
  const {
    objects: liveObjects,
    vehicles,
    critters,
    npcs,
    era,
    revealed: liveRevealed,
    pings,
    focusTarget,
    highlightMine,
    profile,
    scars,
    buildLog,
    replayTime,
    timeOfDay,
    isNight,
    activeDisaster,
    spectatorMode,
    pauseSpectator,
  } = useWorld();

  // In replay mode, reconstruct the world as it stood at `replayTime`.
  const isReplay = replayTime != null;
  const snapshot = useMemo(
    () => (isReplay ? snapshotAt(buildLog, replayTime as number) : null),
    [isReplay, buildLog, replayTime],
  );
  const objects = snapshot ? snapshot.objects : liveObjects;
  const revealed = snapshot ? snapshot.revealed : liveRevealed;
  const containerRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ x: 0, y: 0, scale: 1.6 });
  const viewRef = useRef(view);
  viewRef.current = view;
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const moved = useRef(false);
  const camAnim = useRef<number | null>(null);
  const [centered, setCentered] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const MIN_ZOOM = 0.35;
  const MAX_ZOOM = 3.5;

  // center the map on the world's origin initially, zoomed in on the first plot
  useEffect(() => {
    if (centered || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const c = gridToScreen(WORLD_CENTER.x, WORLD_CENTER.y);
    setView((v) => ({ x: rect.width / 2 - c.x * v.scale, y: rect.height / 2 - c.y * v.scale, scale: v.scale }));
    setCentered(true);
  }, [centered]);

  // fly the camera toward a focus target (nudge / spectator follow / full center)
  useEffect(() => {
    if (!focusTarget || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const cur = viewRef.current;
    const follow = focusTarget.mode === 'follow';
    const targetScale = follow
      ? clamp(focusTarget.zoom ?? 2.1, MIN_ZOOM, MAX_ZOOM)
      : cur.scale;
    const c = gridToScreen(focusTarget.pos.x, focusTarget.pos.y);
    // Live cam fully frames the trader; nudge only drifts a little.
    const blend =
      focusTarget.mode === 'center' || follow ? 1 : 0.18;
    const fullX = rect.width / 2 - c.x * targetScale;
    const fullY = rect.height / 2 - c.y * targetScale;
    const destX = cur.x + (fullX - cur.x) * blend;
    const destY = cur.y + (fullY - cur.y) * blend;
    const destScale = cur.scale + (targetScale - cur.scale) * blend;

    if (camAnim.current) cancelAnimationFrame(camAnim.current);
    const start = performance.now();
    const from = { x: cur.x, y: cur.y, scale: cur.scale };
    // Snappy cut to the person — stream cam shouldn't lag behind trades.
    const dur =
      focusTarget.mode === 'center' ? 650 : follow ? 620 : 320;
    const step = (now: number) => {
      const k = Math.min(1, (now - start) / dur);
      const e = follow
        ? // quick settle, slight ease-out so it doesn't feel teleported
          1 - Math.pow(1 - k, 2.4)
        : 1 - Math.pow(1 - k, 3);
      setView({
        x: from.x + (destX - from.x) * e,
        y: from.y + (destY - from.y) * e,
        scale: from.scale + (destScale - from.scale) * e,
      });
      if (k < 1) camAnim.current = requestAnimationFrame(step);
    };
    camAnim.current = requestAnimationFrame(step);
    return () => {
      if (camAnim.current) cancelAnimationFrame(camAnim.current);
    };
  }, [focusTarget]);

  const cancelCam = () => {
    if (camAnim.current) {
      cancelAnimationFrame(camAnim.current);
      camAnim.current = null;
    }
  };

  const onPointerDown = (e: React.PointerEvent) => {
    cancelCam();
    drag.current = { x: e.clientX, y: e.clientY, ox: view.x, oy: view.y };
    moved.current = false;
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    if (Math.abs(e.clientX - d.x) + Math.abs(e.clientY - d.y) > 5) {
      if (!moved.current && spectatorMode) pauseSpectator(4000);
      moved.current = true;
    }
    const nx = d.ox + (e.clientX - d.x);
    const ny = d.oy + (e.clientY - d.y);
    setView((v) => ({ ...v, x: nx, y: ny }));
  };
  const onPointerUp = () => {
    drag.current = null;
  };
  // clicking empty ground (not an object) clears the selection
  const onBackgroundClick = () => {
    if (!moved.current) setSelectedId(null);
  };
  const selectObject = (o: (typeof objects)[number]) => {
    if (moved.current) return; // this was a pan, not a click
    setSelectedId(o.id);
  };

  /** Zoom keeping the world point under (sx, sy) screen coords fixed. */
  const applyZoom = (sx: number, sy: number, nextScale: number) => {
    if (camAnim.current) {
      cancelAnimationFrame(camAnim.current);
      camAnim.current = null;
    }
    setView((v) => {
      const scale = clamp(nextScale, MIN_ZOOM, MAX_ZOOM);
      if (scale === v.scale) return v;
      const k = scale / v.scale;
      return {
        scale,
        x: sx - (sx - v.x) * k,
        y: sy - (sy - v.y) * k,
      };
    });
  };

  const zoomBy = (factor: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    applyZoom(rect.width / 2, rect.height / 2, viewRef.current.scale * factor);
  };

  // Non-passive wheel listener so we can preventDefault and actually zoom
  // (React's onWheel is passive in modern browsers — scroll never reaches us cleanly).
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      // Trackpad pinch often sends ctrlKey + wheel; treat both as zoom.
      const intensity = e.ctrlKey ? 0.012 : 0.0018;
      const factor = Math.exp(-e.deltaY * intensity);
      const cur = viewRef.current;
      const scale = clamp(cur.scale * factor, MIN_ZOOM, MAX_ZOOM);
      if (scale === cur.scale) return;
      if (camAnim.current) {
        cancelAnimationFrame(camAnim.current);
        camAnim.current = null;
      }
      const k = scale / cur.scale;
      setView({
        scale,
        x: sx - (sx - cur.x) * k,
        y: sy - (sy - cur.y) * k,
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const roads = useMemo(() => objects.filter((o) => o.kind === 'ROAD'), [objects]);

  // Depth-sort so nearer (and multi-tile front edges) paint on top.
  const sorted = useMemo(
    () =>
      [...objects]
        .filter((o) => o.kind !== 'ROAD')
        .sort((a, b) => objectDepth(a) - objectDepth(b)),
    [objects],
  );

  const revealedSet = useMemo(() => new Set(revealed), [revealed]);

  // Guarantee there is always ground beneath anything that exists: union the
  // revealed land with every tile that holds an object. Nothing can float.
  const land = useMemo(() => {
    const s = new Set(revealed);
    for (const o of objects) {
      s.add(`${o.pos.x},${o.pos.y}`);
      if (o.tiles === 2 && o.span) {
        s.add(`${o.pos.x + o.span.x},${o.pos.y + o.span.y}`);
      }
    }
    return Array.from(s);
  }, [revealed, objects]);

  const landSet = useMemo(() => new Set(land), [land]);

  /** Hide greenery stranded on rim tips (no surrounding land → reads as sky trees). */
  const visibleObjects = useMemo(() => {
    const nestled = (x: number, y: number) => {
      let n = 0;
      if (landSet.has(`${x + 1},${y}`)) n++;
      if (landSet.has(`${x - 1},${y}`)) n++;
      if (landSet.has(`${x},${y + 1}`)) n++;
      if (landSet.has(`${x},${y - 1}`)) n++;
      return n >= 2;
    };
    return sorted.filter((o) => {
      if (o.kind !== 'TREE' && o.kind !== 'FLOWER') return true;
      return landSet.has(`${o.pos.x},${o.pos.y}`) && nestled(o.pos.x, o.pos.y);
    });
  }, [sorted, landSet]);

  // resolve the selection live so it clears if the object is ever removed
  const selectedObj = useMemo(
    () => objects.find((o) => o.id === selectedId) ?? null,
    [objects, selectedId],
  );

  const lunar = era.index >= 4;
  const earthLeft = 18 + timeOfDay * 55;
  const earthTop = 10 + Math.sin(timeOfDay * Math.PI) * 6;

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full cursor-grab overflow-hidden active:cursor-grabbing"
      style={skyStyle(timeOfDay, lunar)}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      {/* Space Age: distant Earth. Otherwise: sun by day / moon by night. */}
      {lunar ? (
        <>
          {STARS.map((s, i) => (
            <motion.span
              key={`star-${i}`}
              className="pointer-events-none absolute z-0 rounded-full bg-white"
              style={{ left: s.left, top: s.top, width: s.size, height: s.size }}
              animate={{ opacity: [0.25, 0.95, 0.35, 1, 0.25] }}
              transition={{ duration: s.dur, delay: s.delay, repeat: Infinity, ease: 'easeInOut' }}
            />
          ))}
          {/* soft atmospheric halo behind Earth */}
          <div
            className="pointer-events-none absolute z-0 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-1000"
            style={{
              left: `${earthLeft}%`,
              top: `${earthTop}%`,
              width: 140,
              height: 140,
              background: 'radial-gradient(circle, rgba(125,211,252,0.35), rgba(59,130,246,0.12) 45%, transparent 70%)',
            }}
          />
          <div
            className="pointer-events-none absolute z-0 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-1000"
            style={{
              left: `${earthLeft}%`,
              top: `${earthTop}%`,
              background: [
                'radial-gradient(circle at 28% 32%, rgba(255,255,255,0.95) 0%, transparent 14%)',
                'radial-gradient(circle at 62% 40%, #4ade80 0%, transparent 20%)',
                'radial-gradient(circle at 38% 68%, #22c55e 0%, transparent 18%)',
                'radial-gradient(circle at 72% 58%, #86efac 0%, transparent 14%)',
                'radial-gradient(circle at 48% 48%, #3b82f6 0%, #1d4ed8 55%, #1e3a8a 100%)',
              ].join(','),
              boxShadow:
                '0 0 36px rgba(96,165,250,0.65), 0 0 72px rgba(56,189,248,0.28), inset -14px -10px 22px rgba(15,23,42,0.45)',
            }}
            title="Earth"
          />
        </>
      ) : (
        <div
          className="pointer-events-none absolute z-0 h-16 w-16 rounded-full transition-all duration-1000"
          style={{
            left: `${10 + timeOfDay * 80}%`,
            top: isNight ? '12%' : `${30 - Math.sin(timeOfDay * Math.PI) * 18}%`,
            background: isNight ? 'radial-gradient(circle, #f8fafc, #cbd5e1)' : 'radial-gradient(circle, #fff7cc, #fde047)',
            boxShadow: isNight ? '0 0 30px #e2e8f0' : '0 0 60px #fde047',
            opacity: 0.9,
          }}
        />
      )}

      <svg
        className="relative z-10 h-full w-full select-none"
        style={{ touchAction: 'none' }}
        onClick={onBackgroundClick}
      >
        <defs>
          <linearGradient id="grassGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8fd07a" />
            <stop offset="100%" stopColor="#5fa84b" />
          </linearGradient>
          <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lunar ? '#5a6570' : '#4fb0f0'} />
            <stop offset="100%" stopColor={lunar ? '#2f3640' : '#2a72c4'} />
          </linearGradient>
          <filter id="softShadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow
              dx="1"
              dy="2"
              stdDeviation="1.2"
              floodColor={lunar ? '#0a0a0c' : '#0b2a12'}
              floodOpacity="0.18"
            />
          </filter>
          <radialGradient id="groundShadow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#000000" stopOpacity="0.22" />
            <stop offset="55%" stopColor="#000000" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>
        </defs>
        <g transform={`translate(${view.x}, ${view.y}) scale(${view.scale})`}>
          {/* Quake shakes the world itself — not just a screen vignette */}
          <motion.g
            animate={
              activeDisaster === 'EARTHQUAKE'
                ? { x: QUAKE_X, y: QUAKE_Y }
                : { x: 0, y: 0 }
            }
            transition={
              activeDisaster === 'EARTHQUAKE'
                ? { duration: 3.1, ease: 'linear', times: QUAKE_X.map((_, i) => i / (QUAKE_X.length - 1)) }
                : { duration: 0.2 }
            }
          >
            {!lunar && <Birds />}
            <Terrain
              night={isNight}
              lunar={lunar}
              roads={roads}
              revealed={land}
              scars={isReplay ? [] : scars}
            />
            <DistrictAmbience revealed={land} night={lunar || isNight} />
            {/* No sea life on the lunar maria */}
            {!lunar &&
              critters
                .filter((c) => revealedSet.has(`${Math.round(c.x)},${Math.round(c.y)}`))
                .map((c) => (
                  <CritterView key={c.id} c={c} />
                ))}
            <AnimatePresence>
              {visibleObjects.map((o) => (
                <WorldObjectView
                  key={o.id}
                  obj={o}
                  night={lunar || isNight}
                  worldEra={era.index}
                  selected={!isReplay && o.id === selectedId}
                  onSelect={isReplay ? undefined : selectObject}
                  mine={!isReplay && highlightMine && o.bornBy === profile.wallet}
                  dimmed={!isReplay && highlightMine && o.bornBy !== profile.wallet}
                  seismic={activeDisaster === 'EARTHQUAKE'}
                />
              ))}
            </AnimatePresence>
            {/* Street life paints above buildings so curb traffic stays readable */}
            {!lunar &&
              vehicles
                .filter((v) => revealedSet.has(`${Math.round(v.x)},${Math.round(v.y)}`))
                .map((v) => (
                  <VehicleView key={v.id} v={v} />
                ))}
            {!lunar &&
              npcs
                .filter((n) => revealedSet.has(`${Math.round(n.x)},${Math.round(n.y)}`))
                .map((n) => (
                  <PedestrianView key={n.id} n={n} />
                ))}
            {!isReplay && <EventPings pings={pings} />}
          </motion.g>
        </g>
      </svg>

      {/* night tint — earthshine blue wash once we're on the moon */}
      <div
        className="pointer-events-none absolute inset-0 z-10 transition-opacity duration-1000"
        style={{
          background: lunar ? 'rgba(30,58,95,0.22)' : 'rgba(15,23,42,0.45)',
          opacity: lunar ? 1 : isNight ? 1 : 0,
        }}
      />

      <DisasterOverlay disaster={activeDisaster} />

      {!isReplay && <ObjectInspector obj={selectedObj} onClose={() => setSelectedId(null)} />}

      {/* Spectator stream badge */}
      {spectatorMode && !isReplay && (
        <div className="pointer-events-none absolute left-4 top-4 z-20 flex items-center gap-2 rounded-full border border-rose-400/40 bg-black/55 px-3 py-1.5 text-xs font-bold text-white shadow-lg backdrop-blur">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500" />
          </span>
          {focusTarget?.mode === 'follow' && focusTarget.wallet ? (
            <span>
              Following{' '}
              <span className="font-mono text-rose-100">
                {focusTarget.wallet.length > 10
                  ? `${focusTarget.wallet.slice(0, 4)}…${focusTarget.wallet.slice(-4)}`
                  : focusTarget.wallet}
              </span>
            </span>
          ) : (
            <span>Live cam — waiting for a trader</span>
          )}
        </div>
      )}

      {/* hint */}
      {!isReplay && (
        <>
          <div className="pointer-events-none absolute bottom-20 left-1/2 z-20 hidden -translate-x-1/2 rounded-full bg-black/40 px-3 py-1 text-xs text-white/80 backdrop-blur sm:block md:bottom-6">
            drag to pan · scroll to zoom · click a building to see its owner
          </div>
          <div className="absolute bottom-20 right-3 z-20 flex flex-col gap-1.5 md:bottom-6 md:right-4">
            <button
              type="button"
              aria-label="Zoom in"
              onClick={() => zoomBy(1.25)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-black/50 text-lg font-bold text-white shadow-lg backdrop-blur transition hover:bg-black/70 active:scale-95"
            >
              +
            </button>
            <button
              type="button"
              aria-label="Zoom out"
              onClick={() => zoomBy(1 / 1.25)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-black/50 text-lg font-bold text-white shadow-lg backdrop-blur transition hover:bg-black/70 active:scale-95"
            >
              −
            </button>
          </div>
        </>
      )}
    </div>
  );
}
