import type { IBehavioralSample } from '../types.js';

const SAMPLE_WINDOW_MS = 10_000;

export function computeFocusScore(
  samples: IBehavioralSample[],
  actualDuration: number,
  distractionEvents: number,
  extensionReason: 'flow' | null
): number {
  if (actualDuration === 0) return 0;

  // tabSwitchCount from samples is intentionally unused here — the caller aggregates
  // distraction events separately (server-side) before calling this function.
  const activeSamples = samples.filter(
    (s) => s.activityRate > 0.1 && s.tabFocused
  );
  // Cap activeTime at actualDuration to handle partial sample batches (network drops).
  const activeTime = Math.min(activeSamples.length * SAMPLE_WINDOW_MS, actualDuration);

  let score = (activeTime / actualDuration) * 100;
  score -= distractionEvents * 5;
  if (extensionReason === 'flow') score += 10;

  return Math.max(0, Math.min(100, Math.round(score)));
}
