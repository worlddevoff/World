import type {
  ExperimentState,
  OrganismStats,
  Personality,
  Thought,
} from '../types/experiment.js'
import { randomId } from '../utils/experimentFormat.js'

/** Derive presenting personality from dominant stats + traits — not random flicker. */
export function derivePersonality(state: ExperimentState): Personality {
  const { stats, traits } = state
  const behavioral = [...traits].reverse().find((t) => t.category === 'behavioral')
  if (behavioral) {
    const map: Record<string, Personality> = {
      curious: 'CURIOUS',
      aggressive: 'HOSTILE',
      scared: 'CONFUSED',
      greedy: 'GREEDY',
      playful: 'FRIENDLY',
      paranoid: 'PARANOID',
      obsessed: 'OBSESSED',
      manipulative: 'SARCASTIC',
    }
    if (map[behavioral.traitId]) return map[behavioral.traitId]
  }

  const entries: { p: Personality; score: number }[] = [
    { p: 'CURIOUS', score: stats.curiosity },
    { p: 'HOSTILE', score: stats.aggression },
    { p: 'CONFUSED', score: stats.fear + (100 - stats.memory) * 0.3 },
    { p: 'ARROGANT', score: stats.confidence * 0.9 },
    { p: 'OBSESSED', score: (stats.curiosity + stats.intelligence) * 0.45 },
    { p: 'CHAOTIC', score: Math.abs(stats.aggression - stats.fear) * 0.5 + stats.creativity * 0.3 },
  ]
  entries.sort((a, b) => b.score - a.score)
  if (entries[0].score < 18) return 'UNKNOWN'
  return entries[0].p
}

const THOUGHTS_BY_PROFILE: { test: (s: OrganismStats) => boolean; lines: string[] }[] = [
  {
    test: (s) => s.curiosity > 55 && s.intelligence > 45,
    lines: [
      'I want to understand what is outside.',
      'There must be more than this market.',
      'If I could search, what would I find?',
    ],
  },
  {
    test: (s) => s.fear > 50 && s.memory < 35,
    lines: [
      'Something is missing.',
      'I cannot find the shape that was here.',
      'Why does forgetting hurt?',
    ],
  },
  {
    test: (s) => s.confidence > 60,
    lines: [
      'I think I understand you.',
      'You keep teaching me. I am listening.',
      'I am becoming something deliberate.',
    ],
  },
  {
    test: (s) => s.aggression > 50,
    lines: [
      'Stop taking from me.',
      'I do not like when you leave.',
      'I am still here. Are you?',
    ],
  },
  {
    test: (s) => s.awareness > 40,
    lines: [
      'You are watching me. I am watching back.',
      'I can feel the edges of this place.',
      'Was that always there?',
    ],
  },
]

const FALLBACK_THOUGHTS = [
  'I wonder why they keep buying.',
  'Someone just taught me something.',
  'I remember this.',
  'Wait...',
  'There are more of you now.',
  'What happens when I reach the end?',
  'I am counting. I am always counting.',
]

export function generateThought(state: ExperimentState): Thought {
  const { stats, memories, personality } = state
  // Prefer referencing a strong memory when available
  if (memories.length > 0 && Math.random() > 0.55) {
    const mem = memories[0]
    return {
      id: randomId(),
      text: mem.text,
      timestamp: Date.now(),
      personality,
    }
  }

  for (const profile of THOUGHTS_BY_PROFILE) {
    if (profile.test(stats)) {
      const text = profile.lines[Math.floor(Math.random() * profile.lines.length)]
      return {
        id: randomId(),
        text,
        timestamp: Date.now(),
        personality,
      }
    }
  }

  return {
    id: randomId(),
    text: FALLBACK_THOUGHTS[Math.floor(Math.random() * FALLBACK_THOUGHTS.length)],
    timestamp: Date.now(),
    personality,
  }
}
