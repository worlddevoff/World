import type { GameState } from './gameStore';
import { makeGuest } from './gameStore';
import type { Guest, GridPos, PlacedRide, GameNotification, ResearchItem } from '../types/game';
import { findPath, randomWalkable } from '../utils/pathfind';
import { getRideDef, getShopDef } from '../data/rides';
import { RIDE_DEFS, SHOP_DEFS } from '../data/rides';
import { NEED_THOUGHTS, POSITIVE_THOUGHTS } from '../data/names';
import { uid } from '../utils/id';

// One simulation tick. dt is in "sim seconds" (already speed-scaled by the loop).
// We mutate a shallow copy for performance-sensitive arrays.

const GUEST_SPEED = 1.6; // grid units / sec

export function simTick(state: GameState, dt: number): Partial<GameState> {
  const ticks = state.ticks + dt;

  // walkable set (paths + shop/ride-adjacent handled via path)
  const walkable = state.paths;

  // ---- time advancement (1 sim day ~ every 8 real-ish seconds at 1x) ----
  let { day, month, year } = state;
  let dayFloatCarry = (state as unknown as { _dayFloat?: number })._dayFloat ?? 0;
  dayFloatCarry += dt / 6;
  let dayAdvanced = false;
  let monthAdvanced = false;
  while (dayFloatCarry >= 1) {
    dayFloatCarry -= 1;
    day += 1;
    dayAdvanced = true;
    if (day > 31) {
      day = 1;
      month += 1;
      monthAdvanced = true;
      if (month > 7) { month = 0; year += 1; }
    }
  }

  const notifications = [...state.notifications];
  const pushNotif = (kind: GameNotification['kind'], text: string) => {
    notifications.push({ id: uid('n'), kind, text, time: Date.now() });
    if (notifications.length > 7) notifications.shift();
  };

  // ---- weather ----
  let weather = state.weather;
  if (dayAdvanced && Math.random() < 0.18) {
    const opts = ['sunny', 'sunny', 'cloudy', 'cloudy', 'rain', 'thunder'] as const;
    weather = opts[Math.floor(Math.random() * opts.length)];
  }

  // ---- guest spawning (based on rating) ----
  let guests = state.guests.map((g) => ({ ...g }));
  const spawnChance = (state.parkRating / 999) * dt * 0.9;
  const maxGuests = 160;
  if (guests.length < maxGuests && Math.random() < spawnChance && state.paths.size > 0) {
    const g = makeGuest(state.entrance.x, state.entrance.y);
    guests.push(g);
  }

  // ---- ride & shop economy accumulators ----
  let cash = state.cash;
  const finance = { ...state.finance };
  let rides = state.rides.map((r) => ({ ...r, queue: [...r.queue], riders: [...r.riders] }));
  let shops = state.shops.map((sh) => ({ ...sh }));

  const rideById = new Map(rides.map((r) => [r.id, r]));
  const shopById = new Map(shops.map((s) => [s.id, s]));

  // ride cycle progress + breakdown + unload riders
  rides.forEach((r) => {
    // ---- coaster / ride construction: lay track segment-by-segment ----
    if (r.status === 'building') {
      const total = Math.max(1, r.track.length);
      const speed = r.category === 'coaster' ? 2.6 : 1.8; // segments per sim-second
      r.buildProgress = (r.buildProgress ?? 1) + dt * speed;
      if (r.buildProgress >= total) {
        r.buildProgress = total;
        if (r.category === 'coaster' && r.track.length > 2) {
          r.status = 'testing';
          r.rideProgress = 0;
          pushNotif('info', `${r.name}: test run starting…`);
        } else {
          r.status = 'open';
          pushNotif('good', `${r.name} is now open!`);
        }
      }
      return;
    }

    // ---- post-build test run (empty train laps once) ----
    if (r.status === 'testing') {
      r.rideProgress += dt / 5;
      if (r.rideProgress >= 1) {
        r.rideProgress = 0;
        r.status = 'open';
        pushNotif('good', `${r.name} passed inspection — now open!`);
      }
      return;
    }

    // breakdown chance
    if (!r.breakdown && (r.status === 'open') && Math.random() < dt * (100 - r.reliability) * 0.00008) {
      r.breakdown = true;
      r.status = 'broken';
      pushNotif('bad', `${r.name} has broken down!`);
    }
    // mechanic auto-fix over time if any mechanic exists
    if (r.breakdown && state.staff.some((s) => s.kind === 'mechanic')) {
      if (Math.random() < dt * 0.05) {
        r.breakdown = false;
        r.status = 'open';
        r.reliability = Math.min(100, r.reliability + 15);
      }
    }
    if (r.status !== 'open') return;
    r.reliability = Math.max(30, r.reliability - dt * 0.05);

    if (r.riders.length > 0) {
      const cycle = r.category === 'coaster' ? Math.max(4, r.rideTime / 6) : 6;
      r.rideProgress += dt / cycle;
      if (r.rideProgress >= 1) {
        // unload
        r.rideProgress = 0;
        r.riders.forEach((gid) => {
          const g = guests.find((x) => x.id === gid);
          if (g) {
            g.state = 'walking';
            g.busyTimer = 0;
            g.nausea = Math.min(100, g.nausea + r.nausea * 4);
            g.happiness = Math.min(100, g.happiness + Math.max(2, r.excitement * 3 - r.intensity));
            g.energy = Math.max(0, g.energy - 6);
            g.thought = pickThought(g);
            g.thoughtTimer = 30;
            g.targetRideId = undefined;
          }
        });
        r.riders = [];
      }
    }
    // load from queue
    if ((r.status === 'open') && !r.breakdown && r.riders.length === 0 && r.queue.length > 0) {
      const def = getRideDef(r.defId);
      const cap = def?.capacity ?? 12;
      const take = r.queue.splice(0, cap);
      take.forEach((gid) => {
        const g = guests.find((x) => x.id === gid);
        if (g) {
          g.state = 'riding';
          g.money = Math.max(0, g.money - r.price);
          r.income += r.price;
          r.totalRiders += 1;
          finance.rideIncome += r.price;
          cash += r.price;
        }
        r.riders.push(gid);
      });
      r.riders = take;
      r.rideProgress = 0;
    }
  });

  // ---- guest behavior ----
  const openRides = rides.filter((r) => r.status === 'open' && !r.breakdown);
  const shopsByKind = (kind: string) => shops.filter((s) => s.kind === kind);

  guests.forEach((g) => {
    if (!g.inPark) return;
    // needs decay
    g.hunger = Math.min(100, g.hunger + dt * 0.7);
    g.thirst = Math.min(100, g.thirst + dt * 0.9);
    g.energy = Math.max(0, g.energy - dt * 0.35);
    g.nausea = Math.max(0, g.nausea - dt * 0.8);
    g.thoughtTimer -= dt;

    if (g.state === 'riding') return; // handled by ride cycle
    if (g.state === 'buying' || g.state === 'sitting' || g.state === 'vomiting') {
      g.busyTimer -= dt;
      if (g.busyTimer <= 0) {
        g.state = 'walking';
        g.targetShopId = undefined;
      }
      return;
    }
    if (g.state === 'queuing') {
      // check whether ride is gone/closed
      const r = g.targetRideId ? rideById.get(g.targetRideId) : undefined;
      if (!r || r.status === 'closed' || (r.breakdown && Math.random() < dt * 0.2)) {
        if (r) r.queue = r.queue.filter((id) => id !== g.id);
        g.state = 'walking';
        g.targetRideId = undefined;
        g.happiness = Math.max(0, g.happiness - 5);
      }
      return;
    }

    // ---- walking: follow current path ----
    if (g.targetPath && g.pathIndex < g.targetPath.length) {
      const node = g.targetPath[g.pathIndex];
      const dx = node.x - g.x;
      const dy = node.y - g.y;
      const dist = Math.hypot(dx, dy);
      const step = GUEST_SPEED * dt;
      if (dist <= step) {
        g.x = node.x;
        g.y = node.y;
        g.pathIndex += 1;
        if (g.pathIndex >= g.targetPath.length) {
          arriveAtTarget(g, rides, shops, guests, finance, () => { cash += 0; }, pushNotif);
          // record income effect for shops applied inside
          g.targetPath = undefined;
          g.pathIndex = 0;
        }
      } else {
        g.x += (dx / dist) * step;
        g.y += (dy / dist) * step;
      }
      return;
    }

    // ---- decide next goal ----
    decideGoal(g, state, openRides, shops, walkable, pushNotif);
  });

  // Apply shop purchases that happened in arriveAtTarget (income already added to finance/cash via closure won't work,
  // so we re-run a purchase pass): simpler — handle purchases here based on flags set by arrive.
  // (arriveAtTarget mutates guest + shop income + finance + cash through references below.)

  // Recompute cash gains from shop income delta done inside arrive: we tracked on finance.shopIncome + shop.income.
  // To keep cash correct, add the shop income earned this tick.
  const shopIncomeEarned = shops.reduce((sum, sh, i) => sum + (sh.income - (state.shops[i]?.income ?? 0)), 0);
  cash += shopIncomeEarned;

  // ---- staff wandering ----
  const staff = state.staff.map((s) => {
    const ns = { ...s };
    if (!ns.targetPath || ns.pathIndex >= (ns.targetPath?.length ?? 0)) {
      const goal = randomWalkable(walkable);
      if (goal) {
        const path = findPath({ x: Math.round(ns.x), y: Math.round(ns.y) }, goal, walkable);
        if (path) { ns.targetPath = path; ns.pathIndex = 0; }
      }
    }
    if (ns.targetPath && ns.pathIndex < ns.targetPath.length) {
      const node = ns.targetPath[ns.pathIndex];
      const dx = node.x - ns.x, dy = node.y - ns.y;
      const dist = Math.hypot(dx, dy);
      const step = 1.1 * dt;
      if (dist <= step) { ns.x = node.x; ns.y = node.y; ns.pathIndex += 1; }
      else { ns.x += (dx / dist) * step; ns.y += (dy / dist) * step; }
    }
    return ns;
  });

  // handymen slowly clean handled implicitly (no litter model yet)

  // ---- guest leaving / vomit ----
  guests.forEach((g) => {
    if (g.nausea > 82 && g.state === 'walking' && Math.random() < dt * 0.06) {
      g.state = 'vomiting';
      g.busyTimer = 2;
      g.nausea = Math.max(0, g.nausea - 40);
      g.happiness = Math.max(0, g.happiness - 8);
      g.thought = 'I feel sick...';
      g.thoughtTimer = 20;
      if (Math.random() < 0.5) pushNotif('bad', `${g.name} has vomited!`);
    }
    if ((g.happiness < 15 || g.energy < 4) && g.state === 'walking' && !g.targetRideId) {
      g.thought = NEED_THOUGHTS.leaving;
    }
  });

  // remove guests who reached exit while leaving
  guests = guests.filter((g) => {
    if (g.thought === NEED_THOUGHTS.leaving &&
        Math.abs(g.x - state.entrance.x) < 1 && Math.abs(g.y - state.entrance.y) < 1) {
      return false;
    }
    return true;
  });

  // ---- monthly finance / research / rating ----
  let researchProgress = state.researchProgress;
  let research = state.research;
  let discovered = state.discovered;
  let financeHistory = state.financeHistory;
  let parkRating = state.parkRating;
  let parkValue = state.parkValue;

  // research advances over time (needs an info kiosk boosts it)
  const researchSpeed = 0.25 + shopsByKind('info').length * 0.15;
  researchProgress += dt * researchSpeed;
  if (researchProgress >= 100 && research.length > 0) {
    researchProgress = 0;
    const [item, ...rest] = research;
    research = rest;
    discovered = [...discovered, item.refId];
    // mark researched on defs
    const rd = RIDE_DEFS.find((r) => r.id === item.refId);
    if (rd) rd.researched = true;
    pushNotif('research', `New ${item.kind} researched: ${item.name}!`);
    finance.research += 200;
    cash -= 200;
  }

  // staff wages + monthly rollup
  if (monthAdvanced) {
    const wages = state.staff.reduce((s, st) => s + st.wage, 0);
    cash -= wages;
    finance.staffWages += wages;
    const monthProfit =
      finance.rideIncome + finance.shopIncome + finance.admission -
      finance.staffWages - finance.construction - finance.research;
    financeHistory = [...financeHistory.slice(-11), monthProfit];
    // loan interest
    cash -= Math.round(state.loanAmount * 0.01);
  }

  // Rating is market-driven (useParkMarket). Only nudge slightly from park life.
  {
    let nudge = 0;
    nudge += Math.min(30, openRides.length * 2);
    nudge -= rides.filter((r) => r.breakdown).length * 8;
    if (weather === 'thunder') nudge -= 10;
    const target = Math.max(80, Math.min(999, state.parkRating + nudge));
    parkRating = Math.round(parkRating + (target - parkRating) * Math.min(1, dt * 0.05));
  }

  // Prefer market park value when present; else fall back to attractions
  parkValue =
    state.marketCapUsd > 0
      ? Math.floor(Math.min(8_000_000, 8_000 + state.marketCapUsd * 0.02 + state.marketHolders * 120))
      : 15000 +
        rides.reduce((s, r) => s + Math.round(r.excitement * 400), 0) +
        shops.length * 800 +
        state.scenery.length * 40 +
        Math.round(parkRating * 4);

  // rating change notifications
  if (monthAdvanced) {
    if (parkRating > state.parkRating + 20) pushNotif('good', 'Park rating has increased!');
    if (parkRating < state.parkRating - 20) pushNotif('bad', 'Park rating has decreased!');
    if (guests.length > 120) pushNotif('bad', 'Park is getting too crowded!');
  }

  const patch: Partial<GameState> = {
    ticks, day, month, year, weather,
    guests, rides, shops, staff, cash, finance,
    researchProgress, research, discovered, financeHistory,
    parkRating, parkValue, notifications,
  };
  (patch as unknown as { _dayFloat: number })._dayFloat = dayFloatCarry;
  return patch;
}

function pickThought(g: Guest): string {
  if (g.nausea > 60) return NEED_THOUGHTS.nausea;
  if (g.happiness > 75) return POSITIVE_THOUGHTS[Math.floor(Math.random() * POSITIVE_THOUGHTS.length)];
  return "That was fun!";
}

function decideGoal(
  g: Guest,
  state: GameState,
  openRides: PlacedRide[],
  shops: GameState['shops'],
  walkable: Set<string>,
  pushNotif: (k: GameNotification['kind'], t: string) => void,
) {
  const from = { x: Math.round(g.x), y: Math.round(g.y) };
  // priority: leaving > toilet(nausea) > thirst > hunger > tired > ride > wander
  const wantLeave = g.happiness < 15 || g.energy < 4 || (g.money < 3 && g.hunger > 60);
  if (wantLeave) {
    g.thought = NEED_THOUGHTS.leaving;
    const path = findPath(from, state.entrance, walkable);
    if (path) { g.targetPath = path; g.pathIndex = 0; }
    return;
  }

  const tryShop = (kind: string, thought: string): boolean => {
    const list = shops.filter((s) => s.kind === kind);
    if (!list.length) return false;
    const target = nearest(g, list);
    if (!target) return false;
    if (g.money < target.price) { g.thought = NEED_THOUGHTS.price; g.thoughtTimer = 15; return false; }
    const adj = adjacentPathTile(target.x, target.y, walkable);
    if (!adj) return false;
    const path = findPath(from, adj, walkable);
    if (!path) return false;
    g.targetPath = path; g.pathIndex = 0; g.targetShopId = target.id; g.thought = thought; g.thoughtTimer = 20;
    return true;
  };

  if (g.thirst > 70 && tryShop('drink', NEED_THOUGHTS.thirsty)) return;
  if (g.hunger > 70 && tryShop('food', NEED_THOUGHTS.hungry)) return;
  if (g.nausea > 55 && tryShop('restroom', NEED_THOUGHTS.toilet)) return;

  if (g.energy < 30) {
    const bench = state.scenery.filter((sc) => sc.kind === 'bench');
    const b = bench.length ? nearest(g, bench) : null;
    if (b) {
      const adj = adjacentPathTile(b.x, b.y, walkable);
      if (adj) {
        const path = findPath(from, adj, walkable);
        if (path) { g.targetPath = path; g.pathIndex = 0; g.thought = NEED_THOUGHTS.tired; g.state = 'walking'; return; }
      }
    }
  }

  // go on a ride
  if (openRides.length && g.money > 4 && Math.random() < 0.7) {
    const affordable = openRides.filter((r) => r.price <= g.money && r.intensity < 8.5);
    const pick = affordable.length ? affordable[Math.floor(Math.random() * affordable.length)] : null;
    if (pick) {
      const adj = adjacentPathTile(pick.x, pick.y, walkable) ??
        (pick.track.length ? adjacentPathTile(pick.track[0].x, pick.track[0].y, walkable) : null);
      if (adj) {
        const path = findPath(from, adj, walkable);
        if (path) {
          if (pick.queue.length > 40) { g.thought = NEED_THOUGHTS.queue; g.thoughtTimer = 15; }
          else {
            g.targetPath = path; g.pathIndex = 0; g.targetRideId = pick.id;
            g.thought = 'That ride looks great!'; g.thoughtTimer = 20;
            return;
          }
        }
      }
    }
  }

  // wander
  const goal = randomWalkable(walkable);
  if (goal) {
    const path = findPath(from, goal, walkable);
    if (path) { g.targetPath = path; g.pathIndex = 0; }
  }
}

function arriveAtTarget(
  g: Guest,
  rides: PlacedRide[],
  shops: GameState['shops'],
  guests: Guest[],
  finance: GameState['finance'],
  _addCash: () => void,
  pushNotif: (k: GameNotification['kind'], t: string) => void,
) {
  if (g.targetShopId) {
    const shop = shops.find((s) => s.id === g.targetShopId);
    if (shop && g.money >= shop.price) {
      g.money -= shop.price;
      shop.income += shop.price;
      shop.customers += 1;
      finance.shopIncome += shop.price;
      if (shop.kind === 'food') g.hunger = Math.max(0, g.hunger - 70);
      if (shop.kind === 'drink') g.thirst = Math.max(0, g.thirst - 70);
      if (shop.kind === 'restroom') g.nausea = Math.max(0, g.nausea - 50);
      if (shop.kind === 'souvenir') g.happiness = Math.min(100, g.happiness + 4);
      g.happiness = Math.min(100, g.happiness + 3);
      g.state = 'buying';
      g.busyTimer = 1.5;
    }
    g.targetShopId = undefined;
    return;
  }
  if (g.targetRideId) {
    const ride = rides.find((r) => r.id === g.targetRideId);
    if (ride && ride.status === 'open' && !ride.breakdown) {
      ride.queue.push(g.id);
      g.state = 'queuing';
    } else {
      g.state = 'walking';
      g.targetRideId = undefined;
    }
    return;
  }
  // reached a bench?
  g.state = 'sitting';
  g.busyTimer = 2.5;
  g.energy = Math.min(100, g.energy + 35);
}

function nearest<T extends { x: number; y: number }>(g: Guest, list: T[]): T | null {
  let best: T | null = null;
  let bd = Infinity;
  list.forEach((o) => {
    const d = Math.abs(o.x - g.x) + Math.abs(o.y - g.y);
    if (d < bd) { bd = d; best = o; }
  });
  return best;
}

function adjacentPathTile(x: number, y: number, walkable: Set<string>): GridPos | null {
  const cand = [
    { x: x + 1, y }, { x: x - 1, y }, { x, y: y + 1 }, { x, y: y - 1 },
  ];
  for (const c of cand) if (walkable.has(`${c.x},${c.y}`)) return c;
  return null;
}
