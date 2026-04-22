import mongoose, { Schema, Document } from 'mongoose';
import type { IBehavioralSample } from '../types.js';

export interface BehavioralSampleDocument extends IBehavioralSample, Document {}

const BehavioralSampleSchema = new Schema<BehavioralSampleDocument>({
  sessionId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  timestamp: { type: Date, required: true },
  activityRate: { type: Number, required: true },
  tabFocused: { type: Boolean, required: true },
  tabSwitchCount: { type: Number, required: true },
});

export const BehavioralSample = mongoose.model<BehavioralSampleDocument>(
  'BehavioralSample',
  BehavioralSampleSchema
);
