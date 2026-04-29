import mongoose, { Schema, Document } from 'mongoose';
import type { IMoodAdaptation } from '../types.js';

export interface MoodAdaptationDocument extends IMoodAdaptation, Document {}

export const moodCountDefaults = {
  stressed: 0,
  tired: 0,
  neutral: 0,
  good: 0,
  energized: 0,
};

export function createMoodAdaptationDefaults(userId: string) {
  return {
    userId,
    lastMood: null,
    recentMoodCounts: { ...moodCountDefaults },
    recentMoodStreak: { mood: null, count: 0 },
    rollingSummary: {
      last7Days: { ...moodCountDefaults },
    },
    activeTemporaryOverride: null,
  };
}

const MoodCountSchema = new Schema(
  {
    stressed: { type: Number, required: true, default: 0 },
    tired: { type: Number, required: true, default: 0 },
    neutral: { type: Number, required: true, default: 0 },
    good: { type: Number, required: true, default: 0 },
    energized: { type: Number, required: true, default: 0 },
  },
  { _id: false }
);

const TemporaryOverrideSchema = new Schema(
  {
    workDurationOverride: { type: Number, default: undefined },
    shortBreakOverride: { type: Number, default: undefined },
    longBreakOverride: { type: Number, default: undefined },
    reason: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { _id: false }
);

const MoodAdaptationSchema = new Schema<MoodAdaptationDocument>(
  {
    userId: { type: String, required: true, unique: true, index: true },
    lastMood: {
      type: String,
      enum: ['stressed', 'tired', 'neutral', 'good', 'energized'],
      default: null,
    },
    recentMoodCounts: {
      type: MoodCountSchema,
      default: () => ({ ...moodCountDefaults }),
    },
    recentMoodStreak: {
      mood: {
        type: String,
        enum: ['stressed', 'tired', 'neutral', 'good', 'energized'],
        default: null,
      },
      count: { type: Number, default: 0 },
    },
    rollingSummary: {
      last7Days: {
        type: MoodCountSchema,
        default: () => ({ ...moodCountDefaults }),
      },
    },
    activeTemporaryOverride: {
      type: TemporaryOverrideSchema,
      default: null,
    },
  },
  { timestamps: true }
);

export const MoodAdaptation = mongoose.model<MoodAdaptationDocument>(
  'MoodAdaptation',
  MoodAdaptationSchema
);
