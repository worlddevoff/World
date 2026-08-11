/** Collective castle — one build, everyone adds stones. Never finishes. */

export type CastleStageId = string;

export interface CastleStageDef {
  id: CastleStageId;
  name: string;
  emoji: string;
  blurb: string;
  /** Market-cap USD needed to finish this stage (cumulative). */
  targetMc: number;
  /** How many stones fill the stage bar / visual slots. */
  stones: number;
  /** True for the named saga stages; false for endless expansions. */
  core?: boolean;
}

/** Named saga — the story beats. After these, the keep expands forever. */
export const CORE_STAGES: CastleStageDef[] = [
  {
    id: 'foundation',
    name: 'Foundation',
    emoji: '🧱',
    blurb: 'Lay the first stones. Everything rests on this.',
    targetMc: 8_000,
    stones: 28,
    core: true,
  },
  {
    id: 'walls',
    name: 'Walls',
    emoji: '🏰',
    blurb: 'Raise the curtain walls around the keep.',
    targetMc: 25_000,
    stones: 36,
    core: true,
  },
  {
    id: 'towers',
    name: 'Towers',
    emoji: '🗼',
    blurb: 'Watchtowers to see every corner of the realm.',
    targetMc: 60_000,
    stones: 30,
    core: true,
  },
  {
    id: 'bridges',
    name: 'Bridges',
    emoji: '🌉',
    blurb: 'Span the moat — invite the kingdom in.',
    targetMc: 120_000,
    stones: 22,
    core: true,
  },
  {
    id: 'throne',
    name: 'Throne room',
    emoji: '👑',
    blurb: 'The heart of the castle. Crown the keep.',
    targetMc: 250_000,
    stones: 18,
    core: true,
  },
  {
    id: 'dungeon',
    name: 'Secret dungeon',
    emoji: '🐉',
    blurb: 'What lies beneath… only builders know.',
    targetMc: 500_000,
    stones: 24,
    core: true,
  },
];

/** @deprecated use CORE_STAGES — kept so older imports keep working */
export const CASTLE_STAGES = CORE_STAGES;

const EXPANSION_CATALOG: Omit<CastleStageDef, 'id' | 'targetMc' | 'stones'>[] = [
  {
    name: 'Outer bailey',
    emoji: '🛡️',
    blurb: 'A new yard beyond the walls — the realm grows.',
  },
  {
    name: 'Great hall',
    emoji: '🏛️',
    blurb: 'Feasts, councils, and louder legends.',
  },
  {
    name: 'Sky ramparts',
    emoji: '🏯',
    blurb: 'Higher battlements. The horizon shrinks.',
  },
  {
    name: 'Crystal spire',
    emoji: '✨',
    blurb: 'A tower that catches the sun — and attention.',
  },
  {
    name: 'War forges',
    emoji: '⚒️',
    blurb: 'Smoke over the yards. Builders never sleep.',
  },
  {
    name: 'Moon gardens',
    emoji: '🌙',
    blurb: 'Courtyards for the night watch.',
  },
  {
    name: 'Treasury vaults',
    emoji: '💎',
    blurb: 'Deeper stores. Heavier crowns.',
  },
  {
    name: 'Dragon roost',
    emoji: '🔥',
    blurb: 'Something vast claims the highest ledge.',
  },
];

export const CASTLE_GOAL = 'Build the biggest castle in crypto.';

/** Growth after the dungeon — each wing needs more MC than the last. */
export const EXPANSION_GROWTH = 1.65;

export function expansionTargetMc(prevTarget: number): number {
  return Math.max(prevTarget + 50_000, Math.round(prevTarget * EXPANSION_GROWTH));
}

export function makeExpansionStage(index: number, prevTarget: number): CastleStageDef {
  const template = EXPANSION_CATALOG[index % EXPANSION_CATALOG.length];
  const cycle = Math.floor(index / EXPANSION_CATALOG.length);
  const name =
    cycle === 0 ? template.name : `${template.name} ${cycle + 1}`;
  return {
    id: `expansion-${index}`,
    name,
    emoji: template.emoji,
    blurb: template.blurb,
    targetMc: expansionTargetMc(prevTarget),
    stones: 20 + (index % 5) * 4,
    core: false,
  };
}

/**
 * Core saga + enough expansion wings that there is always a next stage.
 * The castle never runs out of roadmap.
 */
export function stageLadderForMc(marketCapUsd: number): CastleStageDef[] {
  const mc = Math.max(0, marketCapUsd);
  const stages: CastleStageDef[] = CORE_STAGES.map((s) => ({ ...s }));
  let prev = stages[stages.length - 1].targetMc;
  let i = 0;

  // Keep generating until we have at least one stage still ahead of MC.
  while (prev <= mc || i < 1) {
    const next = makeExpansionStage(i, prev);
    stages.push(next);
    prev = next.targetMc;
    i += 1;
    if (i > 400) break;
  }

  // Always expose one more locked wing so the roadmap never ends on "Done".
  if (stages[stages.length - 1].targetMc <= mc) {
    const next = makeExpansionStage(i, prev);
    stages.push(next);
  }

  return stages;
}

export interface StageProgress {
  def: CastleStageDef;
  /** 0..1 fill for this stage */
  fill: number;
  stonesPlaced: number;
  status: 'locked' | 'building' | 'complete';
}

/** Derive shared castle progress from market cap so every visitor sees the same keep. */
export function progressFromMarketCap(marketCapUsd: number | null): {
  stages: StageProgress[];
  activeIndex: number;
  totalFill: number;
  /** Always false — the castle never finishes. */
  complete: false;
  /** How many wings past the core saga. */
  expansionLevel: number;
} {
  const mc = Math.max(0, marketCapUsd ?? 0);
  const ladder = stageLadderForMc(mc);
  let prevTarget = 0;
  let activeIndex = 0;
  let foundActive = false;

  const stages: StageProgress[] = ladder.map((def, i) => {
    const span = Math.max(1, def.targetMc - prevTarget);
    const into = mc - prevTarget;
    const fill = Math.max(0, Math.min(1, into / span));
    const stonesPlaced = Math.floor(fill * def.stones);
    let status: StageProgress['status'] = 'locked';
    if (mc >= def.targetMc) {
      status = 'complete';
      activeIndex = Math.min(i + 1, ladder.length - 1);
    } else if (mc >= prevTarget) {
      status = 'building';
      if (!foundActive) {
        activeIndex = i;
        foundActive = true;
      }
    }
    prevTarget = def.targetMc;
    return { def, fill, stonesPlaced, status };
  });

  // Prefer the first non-complete stage as active.
  const buildingIdx = stages.findIndex((s) => s.status === 'building');
  if (buildingIdx >= 0) activeIndex = buildingIdx;

  const completed = stages.filter((s) => s.status === 'complete').length;
  const activeFill = stages[activeIndex]?.fill ?? 0;
  // Open-ended score — can grow past 100% as wings keep coming.
  const totalFill = completed + activeFill;
  const expansionLevel = Math.max(0, completed - CORE_STAGES.length);

  return {
    stages,
    activeIndex,
    totalFill,
    complete: false,
    expansionLevel,
  };
}

/** Stones added by a single buy (theater on top of MC baseline). */
export function stonesForBuy(amountUsd: number): number {
  if (!Number.isFinite(amountUsd) || amountUsd <= 0) return 1;
  if (amountUsd >= 2500) return 8;
  if (amountUsd >= 1000) return 5;
  if (amountUsd >= 250) return 3;
  if (amountUsd >= 40) return 2;
  return 1;
}
