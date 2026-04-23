import mongoose, { Schema, Document } from 'mongoose';
import type { ISession } from '../types.js';

export interface SessionDocument extends ISession, Document {}

const SessionSchema = new Schema<SessionDocument>(
  {
    userId: { type: String, required: true, index: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, default: null },
    plannedDuration: { type: Number, required: true },
    actualDuration: { type: Number, default: 0 },
    state: {
      type: String,
      enum: ['active', 'completed', 'abandoned', 'extended'],
      default: 'active',
    },
    extensionReason: { type: String, enum: ['flow'], default: null },
    distractionEvents: { type: Number, default: 0 },
    focusScore: { type: Number, default: 0 },
    avgActivityRate: { type: Number, default: 0 },
    sessionNumber: { type: Number, required: true },
    moodOverrideDuration: { type: Number, default: null },
  },
  { timestamps: true }
);

export const Session = mongoose.model<SessionDocument>('Session', SessionSchema);
