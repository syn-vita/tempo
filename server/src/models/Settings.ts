import mongoose, { Schema, Document } from 'mongoose';
import type { ISettings } from '../types.js';

export interface SettingsDocument extends ISettings, Document {}

const SettingsSchema = new Schema<SettingsDocument>({
  userId: { type: String, required: true, unique: true },
  workDuration: { type: Number, default: 25 * 60 * 1000 },
  shortBreak: { type: Number, default: 5 * 60 * 1000 },
  longBreak: { type: Number, default: 15 * 60 * 1000 },
  longBreakInterval: { type: Number, default: 4 },
  flowThreshold: { type: Number, default: 0.5 },
  distractionThreshold: { type: Number, default: 3 },
  hasSeenWelcome: { type: Boolean, default: false },
  distractionOverlayEnabled: { type: Boolean, default: true },
  promptNotificationPermissionOnLoad: { type: Boolean, default: true },
  theme: { type: String, enum: ['dark', 'light', 'system'], default: 'system' },
});

export const Settings = mongoose.model<SettingsDocument>('Settings', SettingsSchema);
