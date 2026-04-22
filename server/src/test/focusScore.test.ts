import { describe, it, expect } from 'vitest';
import { computeFocusScore } from '../lib/focusScore.js';
import type { IBehavioralSample } from '../types.js';

function makeSample(overrides: Partial<IBehavioralSample> = {}): IBehavioralSample {
  return {
    sessionId: 'sess1',
    userId: 'user1',
    timestamp: new Date(),
    activityRate: 1.0,
    tabFocused: true,
    tabSwitchCount: 0,
    ...overrides,
  };
}

describe('computeFocusScore', () => {
  it('returns 100 when all samples active, no distractions, no extension', () => {
    const samples = Array(10).fill(null).map(() => makeSample());
    // 10 samples × 10s = 100s active, actualDuration = 100s
    expect(computeFocusScore(samples, 100_000, 0, null)).toBe(100);
  });

  it('returns 90 when all active but 2 distractions', () => {
    const samples = Array(10).fill(null).map(() => makeSample());
    expect(computeFocusScore(samples, 100_000, 2, null)).toBe(90);
  });

  it('returns 50 when half samples are active', () => {
    const active = Array(5).fill(null).map(() => makeSample({ activityRate: 1.0, tabFocused: true }));
    const idle = Array(5).fill(null).map(() => makeSample({ activityRate: 0.0, tabFocused: false }));
    expect(computeFocusScore([...active, ...idle], 100_000, 0, null)).toBe(50);
  });

  it('clamps to 100 when flow bonus pushes over 100', () => {
    const samples = Array(10).fill(null).map(() => makeSample());
    expect(computeFocusScore(samples, 100_000, 0, 'flow')).toBe(100);
  });

  it('awards flow bonus (+10) when base score is 80', () => {
    const active2 = Array(8).fill(null).map(() => makeSample());
    const idle2 = Array(2).fill(null).map(() => makeSample({ activityRate: 0.0, tabFocused: false }));
    expect(computeFocusScore([...active2, ...idle2], 100_000, 0, 'flow')).toBe(90);
  });

  it('clamps to 0 when distractions exceed base score', () => {
    const samples = Array(2).fill(null).map(() => makeSample({ activityRate: 0.05, tabFocused: false }));
    expect(computeFocusScore(samples, 100_000, 10, null)).toBe(0);
  });

  it('returns 0 when actualDuration is 0', () => {
    expect(computeFocusScore([], 0, 0, null)).toBe(0);
  });

  it('treats activityRate exactly at threshold (0.1) as inactive', () => {
    const boundary = [makeSample({ activityRate: 0.1, tabFocused: true })];
    expect(computeFocusScore(boundary, 10_000, 0, null)).toBe(0);
  });

  it('scores correctly when fewer samples than expected (partial batch)', () => {
    // 25-min session, only 5 samples received (network drop), all active
    // activeTime capped at actualDuration → max score before distraction penalty
    const samples = Array(5).fill(null).map(() => makeSample());
    const twentyFiveMin = 25 * 60 * 1000;
    const score = computeFocusScore(samples, twentyFiveMin, 0, null);
    // 5 samples × 10s = 50s active, but actualDuration = 1500s → 50/1500*100 ≈ 3, NOT capped
    // The cap only prevents going over 100, not under-scoring from sparse samples
    // This test documents the known limitation: sparse samples = low score
    expect(score).toBeLessThan(10);
  });
});
