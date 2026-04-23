import { createContext, useContext } from 'react';
import type { Settings } from '../types';

interface SettingsContextValue {
  settings: Settings;
  loading: boolean;
  update: (partial: Partial<Settings>) => Promise<void>;
}

export const SettingsContext = createContext<SettingsContextValue | null>(null);

export function useSettingsContext(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettingsContext used outside SettingsContext.Provider');
  return ctx;
}
