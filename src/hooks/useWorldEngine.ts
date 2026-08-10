import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  WorldObject,
  WorldTransaction,
  WorldEvent,
  Vehicle,
  Critter,
  Npc,
  WorldEra,
  EventPing,
  FocusTarget,
  WalletStat,
  Scar,
  BuildLogEntry,
  GridPos,
  HistoryEntry,
  ShareMoment,
  Milestone,
  PlayerProfile,
  DisasterKind,
  Season,
  WorldStats,
} from '../types/world';
import {
  seedWorld,
  ensurePlacement,
  revealAround,
  pickVictim,
  ensureMinimumSkyline,
  countStandingBuildings,
  contractEmptyFrontier,
  keyOf,
  heightFor,
  WORLD_CENTER,
  uniqueObjects,
  occupyTiles,
  footprintPositions,
  ensureConnectedRoads,
  ensureBridgesNear,
  sanitizeOccupancy,
  canPlaceAt,
  evictObject,
} from '../utils/worldState';
import { transactionToEvent, disasterTransaction } from '../utils/eventEngine';
import { zoneAt } from '../data/zones';
import { EARTH_W, EARTH_H, isEarthWater } from '../data/earth';
import { uid, randomWallet } from '../utils/format';
import {
  collectRoadCells,
  collectParks,
  makeCar,
  makePedestrian,
  stepOnRoads,
  stepPedestrian,
  retargetCar,
} from '../utils/cityLife';
import { worldSound } from '../utils/sound';
import { labelForObject } from '../utils/buildingLabels';
import { MILESTONE_DEFS, metricValue } from '../data/milestones';

const WORLD_EPOCH = Date.now(); // the world is born now and grows from one plot

// Ages track cumulative buy volume — reachable as the coin trades.
const ERAS: { threshold: number; name: string; emoji: string }[] = [
  { threshold: 0, name: 'Settlement Age', emoji: '🌱' },
  { threshold: 10_000, name: 'Town Age', emoji: '🏘️' },
  { threshold: 50_000, name: 'City Age', emoji: '🏙️' },
  { threshold: 250_000, name: 'Metropolis Age', emoji: '🌆' },
  { threshold: 1_000_000, name: 'Space Age', emoji: '🚀' },
];

function eraForVolume(volumeUsd: number): WorldEra {
  let idx = 0;
  for (let i = 0; i < ERAS.length; i++) {
    if (volumeUsd >= ERAS[i].threshold) idx = i;
  }
  return { index: idx, name: ERAS[idx].name, emoji: ERAS[idx].emoji };
}

const FISH_COLORS = ['#f59e0b', '#ef4444', '#38bdf8', '#a78bfa', '#f472b6'];

function makeCritter(kind: 'fish' | 'whale'): Critter {
  // Drift in the Atlantic west of the European seed
  return {
    id: uid('crit'),
    x: WORLD_CENTER.x - 30 + Math.random() * 20,
    y: WORLD_CENTER.y + 6 + Math.random() * 10,
    kind,
    speed: kind === 'whale' ? 0.006 : 0.02 + Math.random() * 0.02,
    color: kind === 'whale' ? '#4a6fa5' : FISH_COLORS[Math.floor(Math.random() * FISH_COLORS.length)],
    phase: Math.random() * Math.PI * 2,
  };
}

function makeBoatVehicle(): Vehicle {
  return {
    id: uid('veh'),
    x: WORLD_CENTER.x - 25,
    y: WORLD_CENTER.y + 10,
    tx: WORLD_CENTER.x + 25,
    ty: WORLD_CENTER.y + 10,
    speed: 0.02,
    kind: 'boat',
    color: '#0ea5e9',
  };
}

export interface WorldEngine {
  objects: WorldObject[];
  vehicles: Vehicle[];
  critters: Critter[];
  npcs: Npc[];
  era: WorldEra;
  pings: EventPing[];
  focusTarget: FocusTarget | null;
  walletStats: WalletStat[];
  highlightMine: boolean;
  setHighlightMine: (v: boolean) => void;
  /** Mute toggle for light SFX / night ambience. */
  muted: boolean;
  setMuted: (v: boolean) => void;
  /** Launch-day stream camera — eases to the latest big buy/sell. */
  spectatorMode: boolean;
  setSpectatorMode: (v: boolean) => void;
  /** Brief pause after the user pans the map. */
  pauseSpectator: (ms?: number) => void;
  /** Claim a Solana wallet so "your" plots match live buys. */
  setPlayerWallet: (wallet: string) => void;
  focusOn: (
    pos: GridPos,
    mode?: 'nudge' | 'center' | 'follow',
    opts?: { wallet?: string; zoom?: number },
  ) => void;
  /** Fly to builds for the claimed wallet (or an override address). */
  focusMyTerritory: (wallet?: string) => boolean;
  scars: Scar[];
  buildLog: BuildLogEntry[];
  replayTime: number | null;
  setReplayTime: (t: number | null) => void;
  events: WorldEvent[];
  history: HistoryEntry[];
  stats: WorldStats;
  /** Live market cap from Pump/DexScreener. */
  marketCapUsd: number | null;
  setMarketCapUsd: (n: number | null) => void;
  /** Sync live token holder count into World Population. */
  setPopulation: (n: number) => void;
  profile: PlayerProfile;
  season: Season;
  timeOfDay: number; // 0..1
  isNight: boolean;
  activeDisaster: DisasterKind | null;
  revealed: string[];
  shareMoment: ShareMoment | null;
  milestones: Milestone[];
  submitTransaction: (tx: WorldTransaction) => void;
  triggerBuy: (amount: number, mine?: boolean) => void;
  triggerSell: (amount: number) => void;
  triggerDisaster: (d: DisasterKind) => void;
  triggerCityExpansion: () => void;
  dismissShare: () => void;
  openShare: (m: ShareMoment) => void;
}

export function useWorldEngine(): WorldEngine {
  const seed = useRef(seedWorld());
  const objectsRef = useRef<Map<string, WorldObject>>(seed.current.objects);
  const revealedRef = useRef<Set<string>>(seed.current.revealed);
  const objectsSnapRef = useRef<WorldObject[]>([]);
  const [objects, setObjects] = useState<WorldObject[]>(() => {
    const list = uniqueObjects(objectsRef.current);
    objectsSnapRef.current = list;
    return list;
  });
  const [revealed, setRevealed] = useState<string[]>(() =>
    Array.from(revealedRef.current),
  );
  const vehiclesRef = useRef<Vehicle[]>([makeBoatVehicle()]);
  const [vehicles, setVehicles] = useState<Vehicle[]>(vehiclesRef.current);
  const crittersRef = useRef<Critter[]>([]);
  const [critters, setCritters] = useState<Critter[]>([]);
  const npcsRef = useRef<Npc[]>([]);
  const [npcs, setNpcs] = useState<Npc[]>([]);
  const [events, setEvents] = useState<WorldEvent[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>(() => seedHistory());
  const [stats, setStats] = useState<WorldStats>(() => ({
    population: 0,
    buildings: seed.current.buildings,
    worldValue: seed.current.buildings * 400,
    volumeUsd: 0,
    uniqueBuyers: 0,
    createdAt: WORLD_EPOCH,
  }));
  const volumeRef = useRef(0);
  const buyersRef = useRef<Set<string>>(new Set());
  const [marketCapUsd, setMarketCapUsd] = useState<number | null>(null);
  const marketCapRef = useRef<number | null>(null);
  marketCapRef.current = marketCapUsd;
  const setPopulation = useCallback((n: number) => {
    if (!Number.isFinite(n) || n < 0) return;
    const next = Math.round(n);
    setStats((s) => (s.population === next ? s : { ...s, population: next }));
  }, []);
  const [profile, setProfile] = useState<PlayerProfile>(() => ({
    wallet: loadPlayerWallet(),
    contribution: 0,
    buildingsCreated: 0,
    buildingsDestroyed: 0,
    population: 0,
    territory: 'Northlands',
  }));
  // ref mirror so callbacks can read the current wallet without re-binding
  const profileRef = useRef(profile);
  profileRef.current = profile;

  const setPlayerWallet = useCallback((wallet: string) => {
    const clean = wallet.trim();
    if (!clean) return;
    savePlayerWallet(clean);
    profileRef.current = { ...profileRef.current, wallet: clean };
    setProfile((p) => ({ ...p, wallet: clean }));
  }, []);
  const [timeOfDay, setTimeOfDay] = useState(estDayFraction);
  const [shareMoment, setShareMoment] = useState<ShareMoment | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>(() =>
    MILESTONE_DEFS.map((m) => ({ ...m, unlocked: false })),
  );
  const unlockedRef = useRef<Set<string>>(new Set());
  const [activeDisaster, setActiveDisaster] = useState<DisasterKind | null>(null);
  const [pings, setPings] = useState<EventPing[]>([]);
  const [focusTarget, setFocusTarget] = useState<FocusTarget | null>(null);
  const [highlightMine, setHighlightMine] = useState(false);
  const [muted, setMutedState] = useState(() => {
    try {
      return localStorage.getItem('world.muted') === '1';
    } catch {
      return false;
    }
  });
  const [spectatorMode, setSpectatorModeState] = useState(false);
  const spectatorRef = useRef(false);
  const spectatorPausedUntil = useRef(0);
  const walletStatsRef = useRef<Record<string, WalletStat>>({});
  const [walletStats, setWalletStats] = useState<WalletStat[]>([]);
  const [scars, setScars] = useState<Scar[]>([]);
  const buildLogRef = useRef<BuildLogEntry[]>([]);
  const [buildLog, setBuildLog] = useState<BuildLogEntry[]>([]);
  const [replayTime, setReplayTime] = useState<number | null>(null);

  const SCAR_LIFE = 95000; // ~95s for scorched land to regrow

  const addScar = useCallback((pos: GridPos) => {
    const scar: Scar = { id: uid('scar'), pos, bornAt: Date.now(), life: SCAR_LIFE };
    setScars((prev) => [...prev.filter((s) => keyOf(s.pos) !== keyOf(pos)), scar]);
    window.setTimeout(() => {
      setScars((prev) => prev.filter((s) => s.id !== scar.id));
    }, SCAR_LIFE + 500);
  }, []);

  const clearScar = useCallback((pos: GridPos) => {
    setScars((prev) => prev.filter((s) => keyOf(s.pos) !== keyOf(pos)));
  }, []);

  const markDestroyed = useCallback((id: string) => {
    const entry = buildLogRef.current.find((e) => e.id === id && !e.destroyedAt);
    if (entry) {
      entry.destroyedAt = Date.now();
      setBuildLog([...buildLogRef.current]);
    }
  }, []);

  const season: Season = 'summer';
  const isNight = timeOfDay < 0.22 || timeOfDay > 0.78;
  const era = eraForVolume(stats.volumeUsd);

  const syncObjects = useCallback(() => {
    sanitizeOccupancy(objectsRef.current);
    const list = uniqueObjects(objectsRef.current);
    objectsSnapRef.current = list;
    setObjects(list);
  }, []);

  const syncRevealed = useCallback(() => {
    setRevealed(Array.from(revealedRef.current));
  }, []);

  // ----- camera focus (fly-to) -----
  // Nudges are throttled; Live cam always cuts to the latest trader.
  const lastNudgeAt = useRef(0);
  const NUDGE_COOLDOWN_MS = 2800;

  const setMuted = useCallback((v: boolean) => {
    worldSound.setMuted(v);
    setMutedState(v);
  }, []);

  const setSpectatorMode = useCallback((v: boolean) => {
    spectatorRef.current = v;
    setSpectatorModeState(v);
    if (v) spectatorPausedUntil.current = 0;
  }, []);

  const pauseSpectator = useCallback((ms = 4000) => {
    if (!spectatorRef.current) return;
    spectatorPausedUntil.current = Date.now() + ms;
  }, []);

  const focusOn = useCallback(
    (
      pos: GridPos,
      mode: 'nudge' | 'center' | 'follow' = 'center',
      opts?: { wallet?: string; zoom?: number },
    ) => {
      const now = Date.now();
      if (mode === 'nudge') {
        if (now - lastNudgeAt.current < NUDGE_COOLDOWN_MS) return;
        lastNudgeAt.current = now;
      }
      setFocusTarget({
        pos,
        ts: now,
        mode,
        wallet: opts?.wallet,
        zoom: opts?.zoom,
      });
    },
    [],
  );

  const focusMyTerritory = useCallback(
    (wallet?: string): boolean => {
      const target = (wallet ?? profileRef.current.wallet).trim();
      if (!target) return false;
      const mine = uniqueObjects(objectsRef.current).filter(
        (o) =>
          o.bornBy === target &&
          o.stage !== 'rubble' &&
          o.kind !== 'ROAD' &&
          o.kind !== 'DECORATION',
      );
      // Prefer real buildings; fall back to any non-road plot from that wallet.
      const plots =
        mine.length > 0
          ? mine
          : uniqueObjects(objectsRef.current).filter(
              (o) =>
                o.bornBy === target &&
                o.stage !== 'rubble' &&
                o.kind !== 'ROAD',
            );
      if (plots.length === 0) return false;
      const cx =
        plots.reduce((s, o) => s + o.pos.x + (o.span?.x ?? 0) * 0.5, 0) /
        plots.length;
      const cy =
        plots.reduce((s, o) => s + o.pos.y + (o.span?.y ?? 0) * 0.5, 0) /
        plots.length;
      focusOn(
        { x: Math.round(cx), y: Math.round(cy) },
        'follow',
        { wallet: target, zoom: plots.length === 1 ? 2.4 : 2.1 },
      );
      return true;
    },
    [focusOn],
  );

  // ----- transient event pings (coin drop + ghost) -----
  const addPing = useCallback((ping: EventPing) => {
    setPings((prev) => [...prev.slice(-7), ping]);
    window.setTimeout(() => {
      setPings((prev) => prev.filter((p) => p.id !== ping.id));
    }, 3200);
  }, []);

  const openShare = useCallback((m: ShareMoment) => {
    setShareMoment(m);
  }, []);

  // ----- per-wallet tallies for leaderboards -----
  const bumpWallet = useCallback(
    (wallet: string, delta: Partial<Omit<WalletStat, 'wallet'>>) => {
      const cur = walletStatsRef.current[wallet] ?? {
        wallet,
        built: 0,
        destroyed: 0,
        landmarks: 0,
        contributed: 0,
      };
      walletStatsRef.current[wallet] = {
        wallet,
        built: cur.built + (delta.built ?? 0),
        destroyed: cur.destroyed + (delta.destroyed ?? 0),
        landmarks: cur.landmarks + (delta.landmarks ?? 0),
        contributed: cur.contributed + (delta.contributed ?? 0),
      };
      setWalletStats(Object.values(walletStatsRef.current));
    },
    [],
  );

  // ----- lifecycle: advance a specific object through its stages -----
  const stageTimers = useRef<Set<number>>(new Set());
  const armTimer = useCallback((fn: () => void, delay: number) => {
    const id = window.setTimeout(() => {
      stageTimers.current.delete(id);
      fn();
    }, delay);
    stageTimers.current.add(id);
    return id;
  }, []);

  useEffect(
    () => () => {
      for (const id of stageTimers.current) window.clearTimeout(id);
      stageTimers.current.clear();
    },
    [],
  );

  const scheduleStage = useCallback(
    (id: string, stage: WorldObject['stage'], delay: number) => {
      armTimer(() => {
        const o = objectsRef.current.get(idToKey(objectsRef.current, id));
        if (!o || o.id !== id) return;
        // Don't revive / re-stage something already past this lifecycle.
        if (o.stage === 'rubble' && stage !== 'rubble') return;
        if (o.stage === 'collapsing' && (stage === 'warning' || stage === 'incoming')) return;
        o.stage = stage;
        // Destroyed building scars the land, then wreckage clears so lots heal.
        if (stage === 'rubble') {
          for (const p of footprintPositions(o)) addScar(p);
          markDestroyed(o.id);
          const clearId = o.id;
          armTimer(() => {
            const still = objectsRef.current.get(idToKey(objectsRef.current, clearId));
            if (!still || still.id !== clearId) return;
            evictObject(objectsRef.current, clearId);
            syncObjects();
          }, 2400);
        }
        syncObjects();
      }, delay);
    },
    [syncObjects, addScar, markDestroyed, armTimer],
  );

  const addHistory = useCallback((emoji: string, text: string, major: boolean) => {
    setHistory((h) =>
      [
        {
          id: uid('hist'),
          date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
          emoji,
          text,
          major,
          timestamp: Date.now(),
        },
        ...h,
      ].slice(0, 40),
    );
  }, []);

  /** Unlock milestones quietly — badges + history, no share popup. */
  const checkMilestones = useCallback(
    (nextStats: WorldStats) => {
      const freshly: Milestone[] = [];
      for (const def of MILESTONE_DEFS) {
        if (unlockedRef.current.has(def.id)) continue;
        if (metricValue(nextStats, marketCapRef.current, def.metric) < def.threshold) continue;
        unlockedRef.current.add(def.id);
        freshly.push({ ...def, unlocked: true });
      }
      if (freshly.length === 0) return;

      setMilestones((prev) =>
        prev.map((m) => (unlockedRef.current.has(m.id) ? { ...m, unlocked: true } : m)),
      );

      const top = freshly[freshly.length - 1];
      worldSound.play('coinBig');
      addHistory(top.emoji, `${top.title} — ${top.unlockLabel}`, true);
    },
    [addHistory],
  );

  // ----- process one transaction end-to-end -----
  const submitTransaction = useCallback(
    (tx: WorldTransaction) => {
      const partial = transactionToEvent(
        tx,
        eraForVolume(volumeRef.current).index,
      );
      let eventLocation: GridPos | null = null;

      if (partial.type === 'BUILD') {
        const kind = partial.object as WorldObject['kind'];
        const tiles: 1 | 2 = partial.tiles === 2 ? 2 : 1;
        // Never drop a buy — expand the map until a lot exists.
        let placeKind = kind;
        let placeTiles: 1 | 2 = tiles;
        let placement = ensurePlacement(
          objectsRef.current,
          revealedRef.current,
          placeKind,
          placeTiles,
        );
        if (!placement) {
          placeKind = 'HOUSE';
          placeTiles = 1;
          placement = ensurePlacement(
            objectsRef.current,
            revealedRef.current,
            placeKind,
            placeTiles,
          );
        }
        if (placement) {
          const { pos, span } = placement;
          eventLocation = pos;
          const obj: WorldObject = {
            id: uid('obj'),
            kind: placeKind,
            pos,
            zone: zoneAt(pos),
            stage: 'incoming',
            createdAt: Date.now(),
            bornBy: tx.wallet,
            purchaseAmount: tx.amount,
            variant: partial.variant ?? Math.floor(Math.random() * 4),
            height: heightFor(placeKind, placeTiles),
            era: eraForVolume(volumeRef.current).index,
            tiles: placeTiles,
            span: placeTiles === 2 ? span : undefined,
          };
          if (placeTiles === 2 && !span) {
            obj.tiles = 1;
            obj.height = heightFor(placeKind, 1) + 0.35;
          }
          let cells = footprintPositions(obj);
          if (!canPlaceAt(objectsRef.current, cells)) {
            const retry = ensurePlacement(
              objectsRef.current,
              revealedRef.current,
              'HOUSE',
              1,
            );
            if (retry) {
              obj.kind = 'HOUSE';
              obj.pos = retry.pos;
              obj.tiles = 1;
              obj.span = undefined;
              obj.height = heightFor('HOUSE', 1);
              obj.zone = zoneAt(retry.pos);
              cells = footprintPositions(obj);
              eventLocation = retry.pos;
            }
          }
          if (canPlaceAt(objectsRef.current, cells)) {
            occupyTiles(objectsRef.current, obj);
            for (const p of cells) clearScar(p);
            if (obj.kind !== 'ROAD') {
              const entry: BuildLogEntry = {
                id: obj.id,
                kind: obj.kind,
                pos: obj.pos,
                zone: obj.zone,
                variant: obj.variant,
                height: obj.height,
                era: obj.era,
                bornBy: obj.bornBy,
                purchaseAmount: obj.purchaseAmount,
                createdAt: obj.createdAt,
                tiles: obj.tiles,
                span: obj.span,
              };
              buildLogRef.current.push(entry);
              setBuildLog([...buildLogRef.current]);
            }

            const footprint = cells;
            let bridgeTiles: GridPos[] = [];
            if (obj.kind !== 'ROAD') {
              const meta = {
                wallet: tx.wallet,
                amount: tx.amount,
                era: eraForVolume(volumeRef.current).index,
                idFactory: () => uid('obj'),
              };
              const paved = ensureConnectedRoads(
                objectsRef.current,
                revealedRef.current,
                footprint,
                meta,
              );
              bridgeTiles = ensureBridgesNear(
                objectsRef.current,
                revealedRef.current,
                [...footprint, ...paved],
                meta,
                1,
              );
            }

            for (const p of footprint) {
              revealAround(revealedRef.current, p, obj.kind === 'LANDMARK' ? 2 : 1);
            }
            syncRevealed();
            syncObjects();
            const bigBuild =
              (obj.tiles ?? 1) === 2 ||
              (partial.magnitude ?? 0) >= 3 ||
              obj.kind === 'LANDMARK' ||
              obj.kind === 'TOWER' ||
              obj.kind === 'STADIUM' ||
              obj.kind === 'FACTORY' ||
              obj.kind === 'SHOP' ||
              obj.kind === 'RESTAURANT';
            scheduleStage(obj.id, 'constructing', bigBuild ? 350 : 400);
            scheduleStage(obj.id, 'built', bigBuild ? 2400 : 1400);

            if (bridgeTiles.length > 0) {
              addHistory('🌉', 'A bridge reached new land across the water', true);
            }

            bumpWallet(tx.wallet, {
              built: 1,
              contributed: tx.amount,
              landmarks: obj.kind === 'LANDMARK' ? 1 : 0,
            });
            volumeRef.current += tx.amount;
            buyersRef.current.add(tx.wallet);
            const buildingCount = countStandingBuildings(objectsRef.current);
            const nextStats: WorldStats = {
              population: 0,
              buildings: buildingCount,
              worldValue: 0,
              volumeUsd: volumeRef.current,
              uniqueBuyers: buyersRef.current.size,
              createdAt: WORLD_EPOCH,
            };
            setStats((s) => {
              const updated: WorldStats = {
                ...s,
                buildings: buildingCount,
                worldValue: s.worldValue + Math.round(tx.amount * (1.4 + Math.random())),
                volumeUsd: volumeRef.current,
                uniqueBuyers: buyersRef.current.size,
              };
              nextStats.population = updated.population;
              nextStats.buildings = updated.buildings;
              nextStats.worldValue = updated.worldValue;
              nextStats.createdAt = updated.createdAt;
              window.setTimeout(() => checkMilestones(updated), 0);
              return updated;
            });

            const isMine = tx.wallet === profileRef.current.wallet;
            const shareWorthy =
              isMine &&
              obj.kind !== 'ROAD' &&
              obj.kind !== 'DECORATION' &&
              obj.kind !== 'TREE' &&
              obj.kind !== 'FLOWER' &&
              (tx.amount >= 1000 || obj.kind === 'LANDMARK');
            if (shareWorthy) {
              const label = labelForObject(obj);
              const delay =
                tx.amount >= 2500 ? 4800 : bigBuild ? 2200 : 1200;
              window.setTimeout(() => {
                openShare({
                  id: uid('share'),
                  kind: 'OWNED',
                  headline: 'TITLE DEED',
                  subject: label,
                  amount: tx.amount,
                  detail: label,
                  emoji: partial.emoji,
                  population: nextStats.population,
                  timestamp: Date.now(),
                  owner: tx.wallet,
                });
              }, delay);
            }
          }
        }
      } else {
        // DESTROY / DISASTER — prefer the seller's own deeds; never erase genesis.
        const isDisaster = partial.type === 'DISASTER';
        const victims = Math.max(
          1,
          Math.min(isDisaster ? partial.magnitude + 1 : partial.magnitude || 1, 8),
        );
        let destroyed = 0;
        const isQuake = isDisaster && partial.object === 'EARTHQUAKE';
        const victimMode = isDisaster || tx.amount >= 1000 ? 'disaster' : 'soft';
        for (let i = 0; i < victims; i++) {
          const v = pickVictim(objectsRef.current, true, tx.wallet, victimMode);
          if (!v) break;
          if (i === 0) eventLocation = v.pos;
          const vid = v.id;
          const stagger = isQuake ? i * 160 + Math.floor(Math.random() * 90) : 0;
          // Mark collapsing now so Buildings count drops with the sell.
          v.stage = 'warning';
          scheduleStage(vid, 'collapsing', 200 + stagger);
          scheduleStage(vid, 'rubble', 1000 + stagger);
          // Greenery trims shouldn't move the Buildings counter.
          if (v.kind !== 'TREE' && v.kind !== 'DECORATION' && v.kind !== 'FLOWER') {
            destroyed++;
          }
        }
        syncObjects();
        if (isDisaster) {
          setActiveDisaster(partial.object as DisasterKind);
          const hold = partial.object === 'FLOOD' ? 5200 : 3200;
          armTimer(() => setActiveDisaster(null), hold);
        }
        bumpWallet(tx.wallet, { destroyed });
        setStats((s) => ({
          ...s,
          // Standing count ignores collapsing/rubble; warn briefly then sync.
          buildings: Math.max(0, countStandingBuildings(objectsRef.current) - destroyed),
          worldValue: Math.max(0, s.worldValue - Math.round(tx.amount * (0.8 + Math.random()))),
        }));
        armTimer(() => {
          setStats((s) => ({
            ...s,
            buildings: countStandingBuildings(objectsRef.current),
          }));
        }, 400);

        // Big dumps / disasters: retract empty fringe so the map contracts.
        if (destroyed > 0 && (tx.amount >= 250 || isDisaster)) {
          const intensity: 1 | 2 = tx.amount >= 1000 || isDisaster ? 2 : 1;
          armTimer(() => {
            const n = contractEmptyFrontier(
              objectsRef.current,
              revealedRef.current,
              intensity,
            );
            if (n > 0) {
              syncRevealed();
              syncObjects();
              if (intensity === 2) {
                addHistory('🌑', 'Empty districts faded as the city contracted', true);
              }
            }
          }, 1800);
        }

        // Heal ghost-town frames after a sell wave (roads left, skyline gone).
        armTimer(() => {
          const planted = ensureMinimumSkyline(objectsRef.current, revealedRef.current);
          if (planted > 0) {
            syncRevealed();
            syncObjects();
            setStats((s) => ({
              ...s,
              buildings: countStandingBuildings(objectsRef.current),
            }));
          }
        }, 2800);
      }

      const event: WorldEvent = { ...partial, location: eventLocation ?? WORLD_CENTER };
      setEvents((e) => [event, ...e].slice(0, 30));

      // cause -> effect: drop a coin/ghost on the exact tile; SFX + camera follow.
      if (eventLocation) {
        addPing({
          id: uid('ping'),
          pos: eventLocation,
          emoji: partial.emoji,
          amount: tx.amount,
          kind: tx.type,
          ts: Date.now(),
        });

        if (partial.type === 'BUILD') {
          const bigBuy = tx.amount >= 250 || partial.magnitude >= 3;
          worldSound.play(bigBuy ? 'coinBig' : 'coin');
          window.setTimeout(
            () => worldSound.play(bigBuy ? 'buildBig' : 'build'),
            bigBuy ? 280 : 180,
          );
        } else if (partial.type === 'DESTROY' || partial.type === 'DISASTER') {
          worldSound.play('sell');
          window.setTimeout(() => worldSound.play('collapse'), 700);
        } else {
          worldSound.play('sell');
        }

        // Dev Panel buys (`transaction: 'sim'`) must not nudge the camera
        // unless Live cam is on (so you can rehearse the stream).
        const isSim = tx.transaction === 'sim';
        const spectating =
          spectatorRef.current && Date.now() >= spectatorPausedUntil.current;
        if (spectating) {
          // Follow every trader — cut to their tile and hold through the build/collapse.
          const zoom = tx.amount >= 1000 ? 2.35 : tx.amount >= 100 ? 2.15 : 2.0;
          focusOn(eventLocation, 'follow', { wallet: tx.wallet, zoom });
          const holdAt = eventLocation;
          const holdWallet = tx.wallet;
          // Re-lock while scaffolding / collapse plays so the cam stays on them.
          window.setTimeout(() => {
            if (
              spectatorRef.current &&
              Date.now() >= spectatorPausedUntil.current
            ) {
              focusOn(holdAt, 'follow', { wallet: holdWallet, zoom });
            }
          }, 850);
          window.setTimeout(() => {
            if (
              spectatorRef.current &&
              Date.now() >= spectatorPausedUntil.current
            ) {
              focusOn(holdAt, 'follow', { wallet: holdWallet, zoom: zoom * 0.96 });
            }
          }, 2100);
        } else if (!isSim) {
          const notable =
            partial.type === 'DISASTER' ||
            partial.magnitude >= 3 ||
            tx.wallet === profileRef.current.wallet;
          if (notable) focusOn(eventLocation, 'nudge');
        }
      }

      // history for meaningful events
      if (partial.magnitude >= 3 || partial.type === 'DISASTER') {
        addHistory(partial.emoji, historyText(event), partial.magnitude >= 4 || partial.type === 'DISASTER');
      }

      // profile updates — real credit when it's the player's own wallet
      const mine = tx.wallet === profileRef.current.wallet;
      if (tx.type === 'BUY') {
        setProfile((p) => ({
          ...p,
          contribution: p.contribution + (mine ? tx.amount : Math.round(tx.amount * 0.15)),
          buildingsCreated: p.buildingsCreated + (mine || Math.random() > 0.6 ? 1 : 0),
        }));
      } else {
        setProfile((p) => ({
          ...p,
          buildingsDestroyed: p.buildingsDestroyed + (mine || Math.random() > 0.6 ? 1 : 0),
        }));
      }
    },
    [
      addHistory,
      scheduleStage,
      syncObjects,
      syncRevealed,
      addPing,
      focusOn,
      bumpWallet,
      clearScar,
      checkMilestones,
      openShare,
      armTimer,
    ],
  );

  const triggerBuy = useCallback(
    (amount: number, mine = true) =>
      submitTransaction({
        type: 'BUY',
        amount,
        wallet: mine ? profileRef.current.wallet : randomWallet(),
        timestamp: new Date().toISOString(),
        transaction: 'sim',
      }),
    [submitTransaction],
  );
  const triggerSell = useCallback(
    (amount: number) =>
      // Dev Panel sells cash out the claimed wallet's own deeds.
      submitTransaction({
        type: 'SELL',
        amount,
        wallet: profileRef.current.wallet,
        timestamp: new Date().toISOString(),
        transaction: 'sim',
      }),
    [submitTransaction],
  );
  const triggerDisaster = useCallback(
    (d: DisasterKind) => {
      // Dev Panel: aim at a wallet that actually owns plots so the spectacle has targets.
      const counts = new Map<string, number>();
      objectsRef.current.forEach((o) => {
        if (o.stage === 'rubble' || o.stage === 'collapsing' || o.kind === 'ROAD') return;
        if (o.bornBy === 'genesis' || o.bornBy === 'world') return;
        counts.set(o.bornBy, (counts.get(o.bornBy) ?? 0) + 1);
      });
      let wallet = profileRef.current.wallet;
      let best = counts.get(wallet) ?? 0;
      counts.forEach((n, w) => {
        if (n > best) {
          best = n;
          wallet = w;
        }
      });
      if (best === 0) wallet = randomWallet();
      submitTransaction(disasterTransaction(d, wallet));
    },
    [submitTransaction],
  );

  const triggerCityExpansion = useCallback(() => {
    for (let i = 0; i < 10; i++) {
      window.setTimeout(() => triggerBuy(40 + Math.random() * 220, false), i * 260);
    }
    addHistory('🏙️', 'A wave of construction expanded the city', true);
  }, [triggerBuy, addHistory]);

  // ----- sea life + street life scale with the city's growth -----
  useEffect(() => {
    const targetFish = Math.min(12, Math.floor(stats.volumeUsd / 8_000));
    const targetWhales =
      stats.volumeUsd >= 100_000 ? Math.min(2, Math.floor(stats.volumeUsd / 500_000)) : 0;
    const fish = crittersRef.current.filter((c) => c.kind === 'fish');
    const whales = crittersRef.current.filter((c) => c.kind === 'whale');
    let critterChanged = false;
    while (fish.length < targetFish) {
      fish.push(makeCritter('fish'));
      critterChanged = true;
    }
    while (whales.length < targetWhales) {
      whales.push(makeCritter('whale'));
      critterChanged = true;
    }
    if (critterChanged) {
      crittersRef.current = [...fish, ...whales];
      setCritters([...crittersRef.current]);
    }

    const roads = collectRoadCells(objectsSnapRef.current.length ? objectsSnapRef.current : objects);
    const parks = collectParks(objectsSnapRef.current.length ? objectsSnapRef.current : objects);
    const buildings = stats.buildings;

    // Cars prefer arterials; grow with the skyline
    const targetCars = Math.min(20, roads.length < 8 ? 0 : 2 + Math.floor(buildings / 6));
    const boats = vehiclesRef.current.filter((v) => v.kind === 'boat');
    let cars = vehiclesRef.current.filter((v) => v.kind === 'car');
    let vehChanged = false;
    if (boats.length === 0) {
      boats.push(makeBoatVehicle());
      vehChanged = true;
    }
    while (cars.length < targetCars) {
      const car = makeCar(roads);
      if (!car) break;
      cars.push(car);
      vehChanged = true;
    }
    if (cars.length > targetCars) {
      cars = cars.slice(0, targetCars);
      vehChanged = true;
    }
    if (vehChanged) {
      vehiclesRef.current = [...boats, ...cars];
      setVehicles([...vehiclesRef.current]);
    }

    // Pedestrians on curbs + plaza crowds around parks
    const targetWalkers = Math.min(18, roads.length < 6 ? 0 : 2 + Math.floor(buildings / 5));
    const targetCrowd = Math.min(10, parks.length * 3);
    let walkers = npcsRef.current.filter((n) => n.kind !== 'visitor');
    let crowd = npcsRef.current.filter((n) => n.kind === 'visitor');
    let npcChanged = false;
    while (walkers.length < targetWalkers) {
      const p = makePedestrian(roads, parks, false);
      if (!p) break;
      walkers.push(p);
      npcChanged = true;
    }
    while (crowd.length < targetCrowd) {
      const p = makePedestrian(roads, parks, true);
      if (!p) break;
      crowd.push(p);
      npcChanged = true;
    }
    if (walkers.length > targetWalkers) {
      walkers = walkers.slice(0, targetWalkers);
      npcChanged = true;
    }
    if (crowd.length > targetCrowd) {
      crowd = crowd.slice(0, targetCrowd);
      npcChanged = true;
    }
    if (npcChanged) {
      npcsRef.current = [...walkers, ...crowd];
      setNpcs([...npcsRef.current]);
    }
  }, [stats.volumeUsd, stats.buildings, objects]);

  // ----- ambient loop: traffic, pedestrians, boats, sea life -----
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(48, now - last);
      last = now;
      const roads = collectRoadCells(objectsSnapRef.current);
      const parks = collectParks(objectsSnapRef.current);

      vehiclesRef.current = vehiclesRef.current.map((v) => {
        if (v.kind === 'boat') {
          let nx = v.x + v.speed * (dt / 16);
          if (nx > EARTH_W) nx = 0;
          if (nx < 0) nx = EARTH_W - 1;
          let ny = v.y;
          if (!isEarthWater(Math.floor(nx), Math.floor(ny))) {
            ny = Math.min(EARTH_H - 2, WORLD_CENTER.y + 14);
          }
          return { ...v, x: nx, y: ny };
        }
        // Cars follow the paved street graph (committed waypoint per hop)
        if (roads.length === 0) return v;
        const stepped = stepOnRoads(v.x, v.y, v.tx, v.ty, v.speed, dt, roads, v.wx, v.wy);
        if (stepped.arrived) {
          if (Math.random() < 0.22) worldSound.play('car');
          return retargetCar(
            { ...v, x: stepped.x, y: stepped.y, wx: stepped.wx, wy: stepped.wy },
            roads,
          );
        }
        return { ...v, x: stepped.x, y: stepped.y, wx: stepped.wx, wy: stepped.wy };
      });
      setVehicles([...vehiclesRef.current]);

      if (npcsRef.current.length > 0) {
        npcsRef.current = npcsRef.current.map((n) => stepPedestrian(n, dt, roads, parks));
        setNpcs([...npcsRef.current]);
      }

      if (crittersRef.current.length > 0) {
        crittersRef.current = crittersRef.current.map((c) => {
          let nx = c.x + c.speed * (dt / 16);
          if (nx > EARTH_W + 1) nx = WORLD_CENTER.x - 40;
          let ny = c.y + Math.sin(c.phase + nx * 0.4) * 0.02;
          if (!isEarthWater(Math.floor(nx), Math.floor(ny))) {
            ny = WORLD_CENTER.y + 8;
          }
          return { ...c, x: nx, y: ny };
        });
        setCritters([...crittersRef.current]);
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // ----- day/night follows real Eastern Time (not a fast loop) -----
  useEffect(() => {
    const sync = () => setTimeOfDay(estDayFraction());
    sync();
    const id = window.setInterval(sync, 20000); // refresh every 20s
    return () => window.clearInterval(id);
  }, []);

  // Soft night hum when muted is off
  useEffect(() => {
    worldSound.setNightAmbience(isNight && !muted);
  }, [isNight, muted]);

  return {
    objects,
    vehicles,
    critters,
    npcs,
    era,
    pings,
    focusTarget,
    walletStats,
    highlightMine,
    setHighlightMine,
    muted,
    setMuted,
    spectatorMode,
    setSpectatorMode,
    pauseSpectator,
    setPlayerWallet,
    focusOn,
    focusMyTerritory,
    scars,
    buildLog,
    replayTime,
    setReplayTime,
    events,
    history,
    stats,
    marketCapUsd,
    setMarketCapUsd,
    setPopulation,
    profile,
    season,
    timeOfDay,
    isNight,
    activeDisaster,
    revealed,
    shareMoment,
    milestones,
    submitTransaction,
    triggerBuy,
    triggerSell,
    triggerDisaster,
    triggerCityExpansion,
    dismissShare: () => setShareMoment(null),
    openShare,
  };
}

// ---- helpers ----
const PLAYER_WALLET_KEY = 'world.playerWallet';

function loadPlayerWallet(): string {
  try {
    const w = localStorage.getItem(PLAYER_WALLET_KEY)?.trim();
    // Ignore the old demo placeholder that used to ship as a fake default.
    if (w && w !== '7xKQ9d2') return w;
  } catch {
    /* ignore */
  }
  return '';
}

function savePlayerWallet(wallet: string): void {
  try {
    localStorage.setItem(PLAYER_WALLET_KEY, wallet);
  } catch {
    /* ignore */
  }
}

// Fraction of the day (0 = midnight, 0.5 = noon) in US Eastern Time, so the
// world's sky matches real EST regardless of the viewer's local timezone.
function estDayFraction(): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  let h = get('hour');
  if (h === 24) h = 0; // some environments report midnight as 24
  return (h * 3600 + get('minute') * 60 + get('second')) / 86400;
}

function idToKey(map: Map<string, WorldObject>, id: string): string {
  for (const [k, v] of map) if (v.id === id) return k;
  return '';
}

function historyText(e: WorldEvent): string {
  if (e.type === 'BUILD') return e.label;
  return e.label;
}

function seedHistory(): HistoryEntry[] {
  const base = Date.now();
  const mk = (daysAgo: number, emoji: string, text: string, major: boolean): HistoryEntry => ({
    id: uid('hist'),
    date: new Date(base - daysAgo * 86400000).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    emoji,
    text,
    major,
    timestamp: base - daysAgo * 86400000,
  });
  return [mk(0, '🌱', 'WORLD CREATED', true)];
}
