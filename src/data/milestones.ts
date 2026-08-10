import type { Milestone, MilestoneEggKind, WorldStats } from '../types/world';

/** Launch-reachable unlocks — volume/buyers/mcap, not arbitrary building counts. */
export const MILESTONE_DEFS: Omit<Milestone, 'unlocked'>[] = [
  {
    id: 'village',
    metric: 'volume',
    threshold: 2_500,
    emoji: '🌱',
    title: 'Village Founded',
    unlockLabel: 'The settlement took root',
  },
  {
    id: 'town',
    metric: 'buyers',
    threshold: 10,
    emoji: '🏘️',
    title: 'Town Charter',
    unlockLabel: 'Ten builders claimed land',
  },
  {
    id: 'city',
    metric: 'volume',
    threshold: 50_000,
    emoji: '🏙️',
    title: 'City Lights',
    unlockLabel: 'The skyline woke up',
  },
  {
    id: 'metropolis',
    metric: 'volume',
    threshold: 250_000,
    emoji: '🌆',
    title: 'Metropolis',
    unlockLabel: 'A true metropolis rose',
  },
  {
    id: 'space',
    metric: 'volume',
    threshold: 1_000_000,
    emoji: '🚀',
    title: 'Space Age',
    unlockLabel: 'Civilization left the ground',
  },
];

export function metricValue(stats: WorldStats, marketCapUsd: number | null, metric: Milestone['metric']): number {
  if (metric === 'volume') return stats.volumeUsd;
  if (metric === 'buyers') return stats.uniqueBuyers;
  return marketCapUsd ?? 0;
}

export function eggKindFor(id: string): MilestoneEggKind {
  if (id === 'village' || id === 'town') return 'village';
  if (id === 'city') return 'city';
  if (id === 'metropolis') return 'metropolis';
  if (id === 'space') return 'space';
  return 'civilization';
}

export function taglineFor(id: string): string {
  switch (id) {
    case 'village':
      return 'First roots. Share the founding.';
    case 'town':
      return 'A crowd of builders. The map is alive.';
    case 'city':
      return 'Night lights. Real skyline energy.';
    case 'metropolis':
      return 'Dense, loud, unstoppable.';
    case 'space':
      return 'Earth was only the beginning.';
    default:
      return 'WORLD leveled up.';
  }
}
