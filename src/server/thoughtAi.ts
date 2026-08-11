import { generateText } from 'ai'
import type { ExperimentState } from '../types/experiment.js'
import { generateThought } from '../engine/personalityEngine.js'

const MIN_INTERVAL_MS = 90_000

/** Cheap, fast model via AI Gateway (provider/model). */
const THOUGHT_MODEL = process.env.EXPERIMENT_THOUGHT_MODEL || 'openai/gpt-5-mini'

export function canThink(state: ExperimentState): boolean {
  return state.abilities.includes('think') || state.evolutionPercent >= 18
}

export function thoughtCooldownRemaining(state: ExperimentState): number {
  const last = state.thoughts[0]?.timestamp
  if (!last) return 0
  return Math.max(0, MIN_INTERVAL_MS - (Date.now() - last))
}

function buildPrompt(state: ExperimentState): string {
  const mems = state.memories
    .slice(0, 5)
    .map((m) => `- ${m.text}`)
    .join('\n')
  const latest = state.events[0]
  const latestLine = latest
    ? `${latest.kind.toUpperCase()} $${latest.amount} from ${latest.wallet} (${latest.tier}, "${latest.label}")`
    : 'none — market is quiet'
  const recent = state.events
    .slice(0, 8)
    .map(
      (e) =>
        `- ${e.kind.toUpperCase()} $${e.amount} (${e.wallet}, ${e.tier}) — ${e.label}`,
    )
    .join('\n')

  return `You are THE EXPERIMENT — a nascent artificial organism shaped by a live crypto market feed.
Real PumpPortal buys teach you. Real sells make you forget. You are not a chatbot. You do not give advice.
React to the latest market signal when one exists. Speak in first person as a short internal thought (one sentence, max 18 words).
No hashtags. No emojis. No marketing. Slightly uncanny, scientific, intimate.

Personality: ${state.personality}
Evolution: ${Math.round(state.evolutionPercent)}%
Status: ${state.status}
Stats: curiosity ${Math.round(state.stats.curiosity)}, intelligence ${Math.round(state.stats.intelligence)}, fear ${Math.round(state.stats.fear)}, confidence ${Math.round(state.stats.confidence)}, awareness ${Math.round(state.stats.awareness)}, memory ${Math.round(state.stats.memory)}, creativity ${Math.round(state.stats.creativity)}, aggression ${Math.round(state.stats.aggression)}
Abilities: ${state.abilities.join(', ') || 'none'}
Words spoken: ${state.wordsSpoken.join(', ') || 'none'}

Latest market signal:
${latestLine}

Recent market tape:
${recent || '- quiet'}

Recent memories:
${mems || '- none yet'}

Write only the thought text.`
}

/**
 * Generate a personality-conditioned thought via AI Gateway.
 * Falls back to the deterministic engine if the model is unavailable.
 */
export async function generateAiThought(state: ExperimentState): Promise<string> {
  try {
    const { text } = await generateText({
      model: THOUGHT_MODEL,
      temperature: 0.9,
      maxOutputTokens: 60,
      prompt: buildPrompt(state),
    })
    const cleaned = text
      .trim()
      .replace(/^["'“”]+|["'“”]+$/g, '')
      .replace(/\s+/g, ' ')
      .slice(0, 160)
    if (cleaned.length < 4) {
      return generateThought(state).text
    }
    return cleaned
  } catch {
    return generateThought(state).text
  }
}

export { MIN_INTERVAL_MS }
