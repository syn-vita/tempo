import mongoose, { Schema, Document } from 'mongoose';

export interface SessionCounterDocument extends Document {
  userId: string;
  dayKey: string;
  lastSessionNumber: number;
}

const SessionCounterSchema = new Schema<SessionCounterDocument>(
  {
    userId: { type: String, required: true },
    dayKey: { type: String, required: true },
    lastSessionNumber: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
);

SessionCounterSchema.index({ userId: 1, dayKey: 1 }, { unique: true });

export const SessionCounter = mongoose.model<SessionCounterDocument>(
  'SessionCounter',
  SessionCounterSchema
);
