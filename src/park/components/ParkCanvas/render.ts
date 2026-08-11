import type { GameState } from '../../store/gameStore';
import type { CoasterSegment, PlacedRide, Guest, Staff } from '../../types/game';
import { gridToScreen, shade, Z_STEP } from '../../utils/iso';
import type { Camera } from '../../utils/iso';
import { getShopDef } from '../../data/rides';

interface RenderOpts {
  hover?: { x: number; y: number } | null;
  ghost?: { x: number; y: number; w: number; h: number; ok: boolean } | null;
  coasterCursor?: CoasterSegment | null;
  buildingRideId?: string;
}

const GRID = 40;

export function renderPark(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  cam: Camera,
  W: number,
  H: number,
  opts: RenderOpts,
) {
  ctx.imageSmoothingEnabled = false;
  // sky/background depends on weather — modern soft gradient
  const bgTop = state.weather === 'thunder' ? '#2a3140'
    : state.weather === 'rain' ? '#3d4a5e'
    : state.weather === 'cloudy' ? '#5f7d97'
    : '#5fa8dd';
  const bgBot = state.weather === 'thunder' ? '#171c26'
    : state.weather === 'rain' ? '#232c3a'
    : state.weather === 'cloudy' ? '#33465a'
    : '#294a6b';
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, bgTop);
  grad.addColorStop(1, bgBot);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  const z = cam.zoom;
  const tw = 32 * z;
  const th = 16 * z;

  // ---- terrain tiles ----
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      const tile = state.grid[y][x];
      const { sx, sy } = gridToScreen(x, y, 0, cam);
      if (sx < -tw || sx > W + tw || sy < -th * 2 || sy > H + th * 4) continue;
      if (tile.kind === 'water') drawTile(ctx, sx, sy, tw, th, '#3f95e0', '#2f7cc4', true);
      else {
        const checker = (x + y) % 2 === 0;
        drawTile(ctx, sx, sy, tw, th, checker ? '#63ab45' : '#58a03b', '#4d8f34');
      }
    }
  }

  // entrance marker
  {
    const { sx, sy } = gridToScreen(state.entrance.x, state.entrance.y, 0, cam);
    drawTile(ctx, sx, sy, tw, th, '#c9b48a', '#a9925f');
    ctx.fillStyle = '#b22222';
    ctx.fillRect(sx - 6 * z, sy - 14 * z, 12 * z, 6 * z);
  }

  // ---- collect drawables for depth sort ----
  type Drawable = { key: number; draw: () => void };
  const items: Drawable[] = [];

  // paths
  state.paths.forEach((k) => {
    const [x, y] = k.split(',').map(Number);
    const { sx, sy } = gridToScreen(x, y, 0, cam);
    items.push({
      key: (x + y) * 1000 - 1,
      draw: () => {
        drawTile(ctx, sx, sy, tw, th, '#cbb488', '#a9925f');
        // subtle path speckle
        ctx.fillStyle = 'rgba(120,95,55,0.5)';
        ctx.fillRect(sx - 3 * z, sy - 1 * z, 2 * z, 2 * z);
        ctx.fillRect(sx + 4 * z, sy + 2 * z, 2 * z, 2 * z);
      },
    });
  });

  // scenery
  state.scenery.forEach((sc) => {
    const { sx, sy } = gridToScreen(sc.x, sc.y, 0, cam);
    items.push({ key: (sc.x + sc.y) * 1000 + 5, draw: () => drawScenery(ctx, sc.kind, sx, sy, z) });
  });

  // shops
  state.shops.forEach((sh) => {
    const { sx, sy } = gridToScreen(sh.x, sh.y, 0, cam);
    const color = getShopDef(sh.defId)?.color ?? '#888';
    items.push({ key: (sh.x + sh.y) * 1000 + 6, draw: () => drawShop(ctx, sh.kind, color, sx, sy, z) });
  });

  // rides
  state.rides.forEach((r) => {
    if (r.category === 'coaster') {
      const wooden = r.defId.includes('wooden');
      const building = r.status === 'building';
      const progress = building
        ? Math.min(r.track.length, r.buildProgress ?? 1)
        : r.track.length;
      const visible = Math.max(1, building ? Math.floor(progress) : r.track.length);
      const partial = building ? progress - Math.floor(progress) : 0;
      const mid = r.track[Math.min(visible - 1, Math.floor(visible / 2))] ?? r.track[0];

      items.push({
        key: mid ? (mid.x + mid.y) * 1000 + mid.z * 2 + 4 : 0,
        draw: () => {
          drawCoaster(ctx, r, cam, z, visible, partial, wooden, state.ticks);
        },
      });

      if (building) {
        const tipIdx = Math.min(r.track.length - 1, Math.max(0, Math.floor(progress)));
        const tip = r.track[tipIdx];
        if (tip) {
          const { sx, sy } = gridToScreen(tip.x, tip.y, tip.z, cam);
          items.push({
            key: (tip.x + tip.y) * 1000 + tip.z * 2 + 19,
            draw: () =>
              drawConstruction(ctx, sx, sy, z, state.ticks, r.color, partial > 0.02 ? partial : 0.6),
          });
        }
      }
    } else if (r.status === 'building') {
      const { sx, sy } = gridToScreen(r.x + (r.w - 1) / 2, r.y + (r.h - 1) / 2, 0, cam);
      const bp = Math.min(1, (r.buildProgress ?? 0) / Math.max(1, r.track.length || 4));
      items.push({
        key: (r.x + r.y + r.w) * 1000 + 7,
        draw: () => {
          ctx.save();
          ctx.globalAlpha = 0.4 + bp * 0.6;
          drawFlatRide(ctx, r, sx, sy - (1 - bp) * 8 * z, z);
          ctx.restore();
          drawConstruction(ctx, sx, sy, z, state.ticks, r.color, bp);
        },
      });
    } else {
      const { sx, sy } = gridToScreen(r.x + (r.w - 1) / 2, r.y + (r.h - 1) / 2, 0, cam);
      items.push({ key: (r.x + r.y + r.w) * 1000 + 7, draw: () => drawFlatRide(ctx, r, sx, sy, z) });
    }
  });

  // guests
  state.guests.forEach((g) => {
    if (g.state === 'riding') return;
    const { sx, sy } = gridToScreen(g.x, g.y, 0, cam);
    if (sx < -20 || sx > W + 20 || sy < -20 || sy > H + 20) return;
    items.push({ key: (g.x + g.y) * 1000 + 20, draw: () => drawGuest(ctx, g, sx, sy, z) });
  });

  // staff
  state.staff.forEach((s) => {
    const { sx, sy } = gridToScreen(s.x, s.y, 0, cam);
    items.push({ key: (s.x + s.y) * 1000 + 21, draw: () => drawStaff(ctx, s, sx, sy, z) });
  });

  items.sort((a, b) => a.key - b.key);
  items.forEach((it) => it.draw());

  // ---- hover highlight ----
  if (opts.hover) {
    const { sx, sy } = gridToScreen(opts.hover.x, opts.hover.y, 0, cam);
    drawTileOutline(ctx, sx, sy, tw, th, 'rgba(255,255,255,0.7)');
  }

  // ---- ghost placement ----
  if (opts.ghost) {
    const gh = opts.ghost;
    for (let dy = 0; dy < gh.h; dy++)
      for (let dx = 0; dx < gh.w; dx++) {
        const { sx, sy } = gridToScreen(gh.x + dx, gh.y + dy, 0, cam);
        drawTile(ctx, sx, sy, tw, th, gh.ok ? 'rgba(90,200,90,0.5)' : 'rgba(220,60,60,0.5)', gh.ok ? '#3a7a3a' : '#8a2a2a');
      }
  }

  // ---- coaster build cursor ----
  if (opts.coasterCursor) {
    const c = opts.coasterCursor;
    const { sx, sy } = gridToScreen(c.x, c.y, c.z, cam);
    const inb = c.x >= 0 && c.y >= 0 && c.x < GRID && c.y < GRID;
    ctx.globalAlpha = 0.7;
    drawTrackGhost(ctx, c, '#ffd23f', sx, sy, z);
    ctx.globalAlpha = 1;
    drawTileOutline(ctx, sx, sy, tw, th, inb ? '#ffd23f' : '#ff3f3f');
  }

  // rain overlay
  if (state.weather === 'rain' || state.weather === 'thunder') {
    ctx.strokeStyle = 'rgba(200,220,255,0.25)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 60; i++) {
      const rx = (i * 137 + (state.ticks * 200) % W) % W;
      const ry = (i * 53 + (state.ticks * 400) % H) % H;
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx - 3, ry + 8);
      ctx.stroke();
    }
  }

  // subtle vignette for a modern, focused look
  const vig = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.32)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);
}

// ---- tile primitives -------------------------------------------------------

function drawTile(ctx: CanvasRenderingContext2D, sx: number, sy: number, tw: number, th: number, top: string, side: string, water = false) {
  const hw = tw / 2, hh = th / 2;
  ctx.beginPath();
  ctx.moveTo(sx, sy - hh);
  ctx.lineTo(sx + hw, sy);
  ctx.lineTo(sx, sy + hh);
  ctx.lineTo(sx - hw, sy);
  ctx.closePath();
  ctx.fillStyle = top;
  ctx.fill();
  if (water) {
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(sx - 2, sy - 1, 3, 1);
  }
  // thin edge
  ctx.strokeStyle = side;
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawTileOutline(ctx: CanvasRenderingContext2D, sx: number, sy: number, tw: number, th: number, color: string) {
  const hw = tw / 2, hh = th / 2;
  ctx.beginPath();
  ctx.moveTo(sx, sy - hh);
  ctx.lineTo(sx + hw, sy);
  ctx.lineTo(sx, sy + hh);
  ctx.lineTo(sx - hw, sy);
  ctx.closePath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();
}

// box helper: draws a chunky iso cuboid rising from tile center
function drawBox(ctx: CanvasRenderingContext2D, sx: number, sy: number, z: number, w: number, h: number, top: string) {
  const hw = w / 2;
  // top face
  ctx.fillStyle = top;
  ctx.beginPath();
  ctx.moveTo(sx, sy - h - hw / 2);
  ctx.lineTo(sx + hw, sy - h);
  ctx.lineTo(sx, sy - h + hw / 2);
  ctx.lineTo(sx - hw, sy - h);
  ctx.closePath();
  ctx.fill();
  // left face
  ctx.fillStyle = shade(top, -0.18);
  ctx.beginPath();
  ctx.moveTo(sx - hw, sy - h);
  ctx.lineTo(sx, sy - h + hw / 2);
  ctx.lineTo(sx, sy + hw / 2);
  ctx.lineTo(sx - hw, sy);
  ctx.closePath();
  ctx.fill();
  // right face
  ctx.fillStyle = shade(top, -0.32);
  ctx.beginPath();
  ctx.moveTo(sx + hw, sy - h);
  ctx.lineTo(sx, sy - h + hw / 2);
  ctx.lineTo(sx, sy + hw / 2);
  ctx.lineTo(sx + hw, sy);
  ctx.closePath();
  ctx.fill();
}

// ---- scenery ---------------------------------------------------------------

function drawScenery(ctx: CanvasRenderingContext2D, kind: string, sx: number, sy: number, z: number) {
  switch (kind) {
    case 'tree': {
      ctx.fillStyle = '#5a3b1e';
      ctx.fillRect(sx - 1 * z, sy - 8 * z, 2 * z, 8 * z);
      ctx.fillStyle = '#2f7d2f';
      ctx.beginPath();
      ctx.arc(sx, sy - 12 * z, 6 * z, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3f9b3f';
      ctx.beginPath();
      ctx.arc(sx - 2 * z, sy - 14 * z, 4 * z, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'bush':
      ctx.fillStyle = '#3f8b3f';
      ctx.beginPath(); ctx.arc(sx, sy - 3 * z, 5 * z, 0, Math.PI * 2); ctx.fill();
      break;
    case 'flower':
      ctx.fillStyle = '#2f7d2f';
      ctx.fillRect(sx - 5 * z, sy - 2 * z, 10 * z, 4 * z);
      ['#e04b8b', '#e0d020', '#e0533b'].forEach((c, i) => {
        ctx.fillStyle = c;
        ctx.fillRect(sx - 4 * z + i * 3 * z, sy - 3 * z, 2 * z, 2 * z);
      });
      break;
    case 'bench':
      ctx.fillStyle = '#8a5a2b';
      ctx.fillRect(sx - 5 * z, sy - 3 * z, 10 * z, 3 * z);
      ctx.fillRect(sx - 5 * z, sy - 6 * z, 10 * z, 2 * z);
      break;
    case 'bin':
      ctx.fillStyle = '#4a4a4a';
      ctx.fillRect(sx - 2 * z, sy - 6 * z, 4 * z, 6 * z);
      ctx.fillStyle = '#666';
      ctx.fillRect(sx - 2 * z, sy - 7 * z, 4 * z, 1 * z);
      break;
    case 'lamp':
      ctx.fillStyle = '#333';
      ctx.fillRect(sx - 1 * z, sy - 12 * z, 2 * z, 12 * z);
      ctx.fillStyle = '#ffe680';
      ctx.beginPath(); ctx.arc(sx, sy - 13 * z, 2.5 * z, 0, Math.PI * 2); ctx.fill();
      break;
    case 'fence':
      ctx.fillStyle = '#b89a6a';
      ctx.fillRect(sx - 6 * z, sy - 5 * z, 12 * z, 2 * z);
      ctx.fillRect(sx - 5 * z, sy - 6 * z, 2 * z, 4 * z);
      ctx.fillRect(sx + 3 * z, sy - 6 * z, 2 * z, 4 * z);
      break;
  }
}

// ---- shop ------------------------------------------------------------------

function drawShop(ctx: CanvasRenderingContext2D, kind: string, color: string, sx: number, sy: number, z: number) {
  drawBox(ctx, sx, sy, 10 * z, 22 * z, 10 * z, color);
  // striped awning
  ctx.fillStyle = '#fff';
  ctx.fillRect(sx - 10 * z, sy - 11 * z, 20 * z, 3 * z);
  ctx.fillStyle = shade(color, -0.1);
  for (let i = 0; i < 5; i++) ctx.fillRect(sx - 10 * z + i * 4 * z, sy - 11 * z, 2 * z, 3 * z);
  // sign glyph
  ctx.fillStyle = '#fff';
  ctx.font = `${Math.max(6, 8 * z)}px VT323, monospace`;
  ctx.textAlign = 'center';
  const glyph = kind === 'food' ? 'F' : kind === 'drink' ? 'D' : kind === 'info' ? 'i' : kind === 'restroom' ? 'WC' : 'S';
  ctx.fillText(glyph, sx, sy - 14 * z);
}

// ---- rides -----------------------------------------------------------------

function drawFlatRide(ctx: CanvasRenderingContext2D, r: PlacedRide, sx: number, sy: number, z: number) {
  const spin = r.status === 'open' && !r.breakdown ? (r.rideProgress || 0) * Math.PI * 2 : 0;
  switch (r.defId) {
    case 'ferris_wheel': {
      ctx.strokeStyle = r.color; ctx.lineWidth = 2 * z;
      ctx.beginPath(); ctx.arc(sx, sy - 18 * z, 16 * z, 0, Math.PI * 2); ctx.stroke();
      for (let i = 0; i < 8; i++) {
        const a = spin + (i / 8) * Math.PI * 2;
        const cx = sx + Math.cos(a) * 16 * z;
        const cy = sy - 18 * z + Math.sin(a) * 16 * z;
        ctx.fillStyle = ['#d94b4b', '#2f8fce', '#3f9b52', '#e0a020'][i % 4];
        ctx.fillRect(cx - 2 * z, cy - 2 * z, 4 * z, 4 * z);
      }
      ctx.fillStyle = '#777'; ctx.fillRect(sx - 2 * z, sy - 18 * z, 4 * z, 18 * z);
      break;
    }
    case 'carousel': {
      drawBox(ctx, sx, sy, 6 * z, 26 * z, 6 * z, shade(r.color, 0.05));
      ctx.fillStyle = r.color;
      ctx.beginPath(); ctx.moveTo(sx, sy - 24 * z); ctx.lineTo(sx + 16 * z, sy - 14 * z);
      ctx.lineTo(sx, sy - 10 * z); ctx.lineTo(sx - 16 * z, sy - 14 * z); ctx.closePath(); ctx.fill();
      for (let i = 0; i < 6; i++) {
        const a = spin + (i / 6) * Math.PI * 2;
        ctx.fillStyle = '#fff';
        ctx.fillRect(sx + Math.cos(a) * 12 * z - 1 * z, sy - 12 * z + Math.sin(a) * 6 * z, 2 * z, 5 * z);
      }
      break;
    }
    default: {
      drawBox(ctx, sx, sy, 8 * z, 26 * z, 8 * z, r.color);
      // small rotating detail for other flat rides
      const a = spin;
      ctx.fillStyle = '#fff';
      ctx.fillRect(sx + Math.cos(a) * 8 * z - 2 * z, sy - 10 * z + Math.sin(a) * 4 * z, 4 * z, 4 * z);
    }
  }
  // status flag
  if (r.breakdown) {
    ctx.fillStyle = '#ffcc00';
    ctx.font = `${10 * z}px VT323`; ctx.textAlign = 'center';
    ctx.fillText('!', sx, sy - 30 * z);
  }
}

/** Screen-space unit along a grid direction (iso). */
function dirAlong(dir: number, zoom: number) {
  const hw = 14 * zoom;
  const hh = 7 * zoom;
  switch (dir) {
    case 0: return { ax: hw, ay: hh };   // +x
    case 1: return { ax: -hw, ay: hh };  // +y
    case 2: return { ax: -hw, ay: -hh }; // -x
    default: return { ax: hw, ay: -hh }; // -y
  }
}

function dirPerp(dir: number, zoom: number) {
  const px = 4 * zoom;
  const py = 2 * zoom;
  switch (dir) {
    case 0: return { ax: -px, ay: py };
    case 1: return { ax: -px, ay: -py };
    case 2: return { ax: px, ay: -py };
    default: return { ax: px, ay: py };
  }
}

function segScreen(seg: CoasterSegment, cam: Camera) {
  return gridToScreen(seg.x, seg.y, seg.z, cam);
}

/** Continuous coaster: supports → connected dual rails → station → train. */
function drawCoaster(
  ctx: CanvasRenderingContext2D,
  ride: PlacedRide,
  cam: Camera,
  zoom: number,
  visibleCount: number,
  partial: number,
  wooden: boolean,
  ticks: number,
) {
  const track = ride.track;
  if (!track.length) return;
  const n = Math.min(visibleCount, track.length);
  const color = ride.color;

  // ---- supports (only under elevated points, sparse so it stays readable) ----
  for (let i = 0; i < n; i++) {
    const seg = track[i]!;
    if (seg.z <= 0 || seg.type === 'station') continue;
    // every other support on long runs keeps the silhouette clean
    if (seg.z < 2 && i % 2 === 1) continue;
    const { sx, sy } = segScreen(seg, cam);
    drawSupport(ctx, sx, sy, seg.z, zoom, wooden, color);
  }

  // ---- continuous rail ribbon between consecutive points ----
  const pts: { sx: number; sy: number; dir: number; type: CoasterSegment['type'] }[] = [];
  for (let i = 0; i < n; i++) {
    const seg = track[i]!;
    const p = segScreen(seg, cam);
    pts.push({ sx: p.sx, sy: p.sy, dir: seg.dir, type: seg.type });
  }
  // growing tip: lerp toward next unbuilt segment
  if (partial > 0.02 && n < track.length) {
    const a = track[n - 1]!;
    const b = track[n]!;
    const pa = segScreen(a, cam);
    const pb = segScreen(b, cam);
    pts.push({
      sx: pa.sx + (pb.sx - pa.sx) * partial,
      sy: pa.sy + (pb.sy - pa.sy) * partial,
      dir: b.dir,
      type: b.type,
    });
  }

  // spine
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = wooden ? '#4a3018' : shade(color, -0.5);
  ctx.lineWidth = Math.max(3, 4.5 * zoom);
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.sx, p.sy) : ctx.lineTo(p.sx, p.sy)));
  ctx.stroke();

  // dual rails
  for (const side of [-1, 1] as const) {
    ctx.strokeStyle = shade(color, side > 0 ? 0.15 : -0.05);
    ctx.lineWidth = Math.max(1.4, 2.2 * zoom);
    ctx.beginPath();
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i]!;
      const prev = pts[i - 1] ?? p;
      const next = pts[i + 1] ?? p;
      // perp from segment heading
      const dx = next.sx - prev.sx || dirAlong(p.dir, zoom).ax;
      const dy = next.sy - prev.sy || dirAlong(p.dir, zoom).ay;
      const len = Math.hypot(dx, dy) || 1;
      const ox = (-dy / len) * 3.2 * zoom * side;
      const oy = (dx / len) * 3.2 * zoom * side;
      if (i === 0) ctx.moveTo(p.sx + ox, p.sy + oy);
      else ctx.lineTo(p.sx + ox, p.sy + oy);
    }
    ctx.stroke();
  }

  // crossties along each edge
  ctx.strokeStyle = wooden ? '#6b4423' : '#2a2a2a';
  ctx.lineWidth = Math.max(1, 1.4 * zoom);
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]!;
    const b = pts[i + 1]!;
    const dx = b.sx - a.sx;
    const dy = b.sy - a.sy;
    const len = Math.hypot(dx, dy) || 1;
    const ox = (-dy / len) * 3.5 * zoom;
    const oy = (dx / len) * 3.5 * zoom;
    for (const t of [0.25, 0.5, 0.75]) {
      const cx = a.sx + dx * t;
      const cy = a.sy + dy * t;
      ctx.beginPath();
      ctx.moveTo(cx - ox, cy - oy);
      ctx.lineTo(cx + ox, cy + oy);
      ctx.stroke();
    }
  }

  // chain lift dashes on climbs
  ctx.setLineDash([2.5 * zoom, 2.5 * zoom]);
  ctx.strokeStyle = 'rgba(230,200,70,0.9)';
  ctx.lineWidth = Math.max(1, 1.2 * zoom);
  ctx.beginPath();
  let lifting = false;
  for (let i = 0; i < n; i++) {
    const seg = track[i]!;
    const p = pts[i]!;
    if (seg.type === 'up') {
      if (!lifting) {
        ctx.moveTo(p.sx, p.sy);
        lifting = true;
      } else ctx.lineTo(p.sx, p.sy);
    } else if (lifting) {
      ctx.lineTo(p.sx, p.sy);
      lifting = false;
    }
  }
  ctx.stroke();
  ctx.setLineDash([]);

  // brakes marker
  for (let i = 0; i < n; i++) {
    if (track[i]!.type !== 'brake') continue;
    const p = pts[i]!;
    ctx.fillStyle = '#ffcc00';
    ctx.fillRect(p.sx - 3 * zoom, p.sy - 4 * zoom, 6 * zoom, 2.5 * zoom);
    ctx.fillStyle = '#ff3b3b';
    ctx.fillRect(p.sx - 2 * zoom, p.sy - 6 * zoom, 1.5 * zoom, 1.5 * zoom);
    ctx.fillRect(p.sx + 0.5 * zoom, p.sy - 6 * zoom, 1.5 * zoom, 1.5 * zoom);
  }

  // station
  const station = track[0]!;
  if (station) {
    const { sx, sy } = segScreen(station, cam);
    drawStation(ctx, sx, sy, zoom, color, station.dir);
  }

  // train
  if (ride.status === 'open' || ride.status === 'testing') {
    drawCoasterTrain(ctx, ride, cam, zoom, ticks);
  }

  ctx.lineCap = 'butt';
  ctx.lineJoin = 'miter';
}

function drawSupport(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  heightLevels: number,
  zoom: number,
  wooden: boolean,
  color: string,
) {
  const groundY = sy + heightLevels * Z_STEP * zoom;
  const drop = groundY - sy;
  if (drop < 2) return;
  if (wooden) {
    const wood = '#5c3a1e';
    ctx.strokeStyle = wood;
    ctx.lineWidth = Math.max(1.2, 1.6 * zoom);
    const spread = 5 * zoom;
    ctx.beginPath();
    ctx.moveTo(sx - spread, groundY);
    ctx.lineTo(sx, sy + 1 * zoom);
    ctx.lineTo(sx + spread, groundY);
    ctx.stroke();
    // one crossbeam mid-height
    const mid = sy + drop * 0.55;
    ctx.beginPath();
    ctx.moveTo(sx - spread * 0.55, mid);
    ctx.lineTo(sx + spread * 0.55, mid);
    ctx.stroke();
  } else {
    ctx.fillStyle = shade(color, -0.4);
    ctx.fillRect(sx - 1.2 * zoom, sy + 1 * zoom, 2.4 * zoom, drop);
  }
}

function drawTrackGhost(
  ctx: CanvasRenderingContext2D,
  seg: CoasterSegment,
  color: string,
  sx: number,
  sy: number,
  zoom: number,
) {
  const along = dirAlong(seg.dir, zoom);
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, 3 * zoom);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(sx - along.ax * 0.45, sy - along.ay * 0.45);
  ctx.lineTo(sx + along.ax * 0.45, sy + along.ay * 0.45);
  ctx.stroke();
  ctx.lineCap = 'butt';
}

/** Crane, sparks, and scaffolding at the active build tip. */
function drawConstruction(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  zoom: number,
  ticks: number,
  color: string,
  partial: number,
) {
  const bob = Math.sin(ticks * 8) * zoom;
  ctx.fillStyle = 'rgba(90,70,40,0.55)';
  ctx.fillRect(sx - 8 * zoom, sy - 2 * zoom, 16 * zoom, 3 * zoom);
  ctx.fillRect(sx - 7 * zoom, sy - 8 * zoom + bob, 2 * zoom, 8 * zoom);
  ctx.fillRect(sx + 5 * zoom, sy - 8 * zoom - bob, 2 * zoom, 8 * zoom);

  ctx.fillStyle = '#c9a227';
  ctx.fillRect(sx + 6 * zoom, sy - 28 * zoom, 2 * zoom, 28 * zoom);
  ctx.strokeStyle = '#e0c040';
  ctx.lineWidth = Math.max(1.5, 2 * zoom);
  ctx.beginPath();
  ctx.moveTo(sx + 7 * zoom, sy - 26 * zoom);
  ctx.lineTo(sx - 4 * zoom, sy - 18 * zoom + bob);
  ctx.stroke();
  ctx.strokeStyle = '#ddd';
  ctx.lineWidth = Math.max(1, 1 * zoom);
  ctx.beginPath();
  ctx.moveTo(sx - 4 * zoom, sy - 18 * zoom + bob);
  ctx.lineTo(sx - 4 * zoom, sy - 8 * zoom - partial * 6 * zoom);
  ctx.stroke();
  ctx.fillStyle = shade(color, -0.1);
  ctx.fillRect(sx - 6 * zoom, sy - 9 * zoom - partial * 6 * zoom, 4 * zoom, 3 * zoom);

  for (let i = 0; i < 5; i++) {
    const a = ticks * 10 + i * 1.7;
    const spark = (Math.sin(a) * 0.5 + 0.5) * partial;
    if (spark < 0.2) continue;
    ctx.fillStyle = i % 2 === 0 ? '#ffe566' : '#ff8a3d';
    const px = sx + Math.cos(a * 1.3) * 6 * zoom * spark;
    const py = sy - 4 * zoom - Math.abs(Math.sin(a)) * 8 * zoom * spark;
    ctx.fillRect(px, py, 1.5 * zoom, 1.5 * zoom);
  }

  ctx.fillStyle = '#f0c090';
  ctx.fillRect(sx + 1 * zoom, sy - 7 * zoom, 2.5 * zoom, 2.5 * zoom);
  ctx.fillStyle = '#e0a020';
  ctx.fillRect(sx + 0.5 * zoom, sy - 5 * zoom, 3.5 * zoom, 4 * zoom);
  ctx.fillStyle = '#ffcc00';
  ctx.fillRect(sx + 0.5 * zoom, sy - 8 * zoom, 3.5 * zoom, 1.5 * zoom);
}

function drawStation(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  zoom: number,
  color: string,
  dir = 0,
) {
  const along = dirAlong(dir, zoom);
  // platform
  drawBox(ctx, sx, sy + 1 * zoom, zoom, 22 * zoom, 4 * zoom, '#a89068');
  // rails through station aligned to direction
  ctx.strokeStyle = shade(color, 0.05);
  ctx.lineWidth = Math.max(1.5, 2.2 * zoom);
  ctx.lineCap = 'round';
  for (const side of [-1, 1]) {
    const perp = dirPerp(dir, zoom);
    ctx.beginPath();
    ctx.moveTo(sx - along.ax * 0.55 + perp.ax * side * 0.7, sy - along.ay * 0.55 + perp.ay * side * 0.7);
    ctx.lineTo(sx + along.ax * 0.55 + perp.ax * side * 0.7, sy + along.ay * 0.55 + perp.ay * side * 0.7);
    ctx.stroke();
  }
  // canopy
  ctx.fillStyle = '#555';
  ctx.fillRect(sx - 10 * zoom, sy - 14 * zoom, 2 * zoom, 12 * zoom);
  ctx.fillRect(sx + 8 * zoom, sy - 14 * zoom, 2 * zoom, 12 * zoom);
  ctx.fillStyle = shade(color, -0.1);
  ctx.beginPath();
  ctx.moveTo(sx - 12 * zoom, sy - 12 * zoom);
  ctx.lineTo(sx, sy - 17 * zoom);
  ctx.lineTo(sx + 12 * zoom, sy - 12 * zoom);
  ctx.lineTo(sx + 12 * zoom, sy - 10 * zoom);
  ctx.lineTo(sx - 12 * zoom, sy - 10 * zoom);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#fff';
  for (let i = -10; i < 10; i += 4) {
    ctx.fillRect(sx + i * zoom, sy - 14 * zoom, 2 * zoom, 3 * zoom);
  }
  // booth
  drawBox(ctx, sx - 9 * zoom, sy + 2 * zoom, zoom, 7 * zoom, 6 * zoom, shade(color, -0.2));
  ctx.fillStyle = '#87ceeb';
  ctx.fillRect(sx - 11 * zoom, sy - 3 * zoom, 3.5 * zoom, 2.5 * zoom);
  ctx.lineCap = 'butt';
}

function sampleTrackPoint(
  track: CoasterSegment[],
  t: number,
  cam: Camera,
): { sx: number; sy: number; dir: number; z: number } {
  const clamped = ((t % 1) + 1) % 1;
  const f = clamped * Math.max(1, track.length - 1);
  const i = Math.min(track.length - 2, Math.floor(f));
  const u = f - i;
  const a = track[i]!;
  const b = track[i + 1] ?? a;
  // ease slightly on drops for drama
  const ease = a.type === 'down' ? u * u : a.type === 'up' ? 1 - (1 - u) * (1 - u) : u;
  const x = a.x + (b.x - a.x) * ease;
  const y = a.y + (b.y - a.y) * ease;
  const zz = a.z + (b.z - a.z) * ease;
  const { sx, sy } = gridToScreen(x, y, zz, cam);
  return { sx, sy, dir: b.dir, z: zz };
}

function drawCoasterTrain(
  ctx: CanvasRenderingContext2D,
  ride: PlacedRide,
  cam: Camera,
  zoom: number,
  ticks: number,
) {
  const track = ride.track;
  if (track.length < 2) return;
  const running =
    (ride.status === 'open' || ride.status === 'testing') && !ride.breakdown;
  if (!running) return;

  const t =
    ride.status === 'testing' || ride.riders.length > 0
      ? ride.rideProgress
      : ((ticks % 520) / 520);

  const carCount = 3;
  for (let c = carCount - 1; c >= 0; c--) {
    const ct = (t - c * 0.045 + 1) % 1;
    const p = sampleTrackPoint(track, ct, cam);
    drawTrainCar(ctx, p.sx, p.sy, ride.color, zoom, p.dir, c === 0);
  }
}

function drawTrainCar(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  color: string,
  zoom: number,
  dir: number,
  isEngine: boolean,
) {
  const along = dirAlong(dir, zoom);
  const perp = dirPerp(dir, zoom);
  // normalize-ish car length
  const len = 0.35;
  const x0 = sx - along.ax * len;
  const y0 = sy - along.ay * len - 3 * zoom;
  const x1 = sx + along.ax * len;
  const y1 = sy + along.ay * len - 3 * zoom;

  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(sx, sy + 2 * zoom, 6 * zoom, 2.5 * zoom, 0, 0, Math.PI * 2);
  ctx.fill();

  // chassis
  ctx.fillStyle = shade(color, -0.15);
  ctx.beginPath();
  ctx.moveTo(x0 - perp.ax * 0.7, y0 - perp.ay * 0.7);
  ctx.lineTo(x1 - perp.ax * 0.7, y1 - perp.ay * 0.7);
  ctx.lineTo(x1 + perp.ax * 0.7, y1 + perp.ay * 0.7 + 3 * zoom);
  ctx.lineTo(x0 + perp.ax * 0.7, y0 + perp.ay * 0.7 + 3 * zoom);
  ctx.closePath();
  ctx.fill();

  // body
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x0 - perp.ax * 0.85, y0 - perp.ay * 0.85 - 2 * zoom);
  ctx.lineTo(x1 - perp.ax * 0.85, y1 - perp.ay * 0.85 - 2 * zoom);
  ctx.lineTo(x1 + perp.ax * 0.85, y1 + perp.ay * 0.85 + 1 * zoom);
  ctx.lineTo(x0 + perp.ax * 0.85, y0 + perp.ay * 0.85 + 1 * zoom);
  ctx.closePath();
  ctx.fill();

  // windows
  ctx.fillStyle = '#b8e0ff';
  const wx = sx - along.ax * 0.08;
  const wy = sy - 5.5 * zoom;
  ctx.fillRect(wx - 2.5 * zoom, wy, 2 * zoom, 2.2 * zoom);
  ctx.fillRect(wx + 0.8 * zoom, wy, 2 * zoom, 2.2 * zoom);

  // nose / engine stripe
  if (isEngine) {
    ctx.fillStyle = shade(color, 0.25);
    ctx.beginPath();
    ctx.moveTo(x1 - perp.ax * 0.5, y1 - perp.ay * 0.5 - 2 * zoom);
    ctx.lineTo(x1 + along.ax * 0.25, y1 + along.ay * 0.25 - 1 * zoom);
    ctx.lineTo(x1 + perp.ax * 0.5, y1 + perp.ay * 0.5 + 1 * zoom);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillRect(sx + along.ax * 0.15 - zoom, sy - 7 * zoom, 2 * zoom, 1.2 * zoom);
  }

  // wheels
  ctx.fillStyle = '#222';
  ctx.beginPath();
  ctx.arc(sx - along.ax * 0.2, sy + 0.5 * zoom, 1.4 * zoom, 0, Math.PI * 2);
  ctx.arc(sx + along.ax * 0.2, sy + 0.5 * zoom, 1.4 * zoom, 0, Math.PI * 2);
  ctx.fill();
}

// ---- characters ------------------------------------------------------------

function drawGuest(ctx: CanvasRenderingContext2D, g: Guest, sx: number, sy: number, z: number) {
  const bob = g.state === 'walking' ? Math.sin(g.x * 4 + g.y * 4) * z : 0;
  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath(); ctx.ellipse(sx, sy + 1, 3 * z, 1.5 * z, 0, 0, Math.PI * 2); ctx.fill();
  // legs
  ctx.fillStyle = g.colorPants;
  ctx.fillRect(sx - 2 * z, sy - 4 * z + bob, 4 * z, 4 * z);
  // body
  ctx.fillStyle = g.colorShirt;
  ctx.fillRect(sx - 2 * z, sy - 8 * z + bob, 4 * z, 4 * z);
  // head
  ctx.fillStyle = '#f0c090';
  ctx.fillRect(sx - 1.5 * z, sy - 11 * z + bob, 3 * z, 3 * z);
  if (g.state === 'vomiting') {
    ctx.fillStyle = '#9acd32';
    ctx.fillRect(sx + 1 * z, sy - 6 * z, 2 * z, 3 * z);
  }
}

function drawStaff(ctx: CanvasRenderingContext2D, s: Staff, sx: number, sy: number, z: number) {
  const colors: Record<string, string> = {
    mechanic: '#2b5aa0', handyman: '#3f9b52', entertainer: '#d8567f', security: '#333',
  };
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath(); ctx.ellipse(sx, sy + 1, 3 * z, 1.5 * z, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(sx - 2 * z, sy - 4 * z, 4 * z, 4 * z);
  ctx.fillStyle = colors[s.kind];
  ctx.fillRect(sx - 2.5 * z, sy - 9 * z, 5 * z, 5 * z);
  ctx.fillStyle = '#f0c090';
  ctx.fillRect(sx - 1.5 * z, sy - 12 * z, 3 * z, 3 * z);
  // hat
  ctx.fillStyle = '#fff';
  ctx.fillRect(sx - 2 * z, sy - 13 * z, 4 * z, 1.5 * z);
}
