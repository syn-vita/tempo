import type { AdaptationSummary, SessionMood } from '../types';

export function baseMoodGuidance(mood: SessionMood): string {
  if (mood === 'stressed') return 'Slow your breathing and let your shoulders drop.';
  if (mood === 'tired') return 'Rest your eyes and reduce screen stimulation.';
  if (mood === 'neutral') return 'Reset with a brief stretch and posture check.';
  if (mood === 'good') return 'Take a short reset so you can hold the momentum.';
  return 'Use a quick recharge, then jump back in when ready.';
}

export function tunedMoodGuidance(
  mood: SessionMood | null,
  adaptation: AdaptationSummary | null
): string | null {
  if (!mood) return null;
  if (mood === 'stressed' && adaptation?.tunedGuidanceContext.recentStressBias) {
    return 'You have had several stressed sessions recently. Take a quieter, lower-stimulation break.';
  }
  if (mood === 'tired' && adaptation?.tunedGuidanceContext.recentFatigueBias) {
    return 'Recent tired sessions suggest a restorative break is better than an active reset.';
  }
  return baseMoodGuidance(mood);
}
