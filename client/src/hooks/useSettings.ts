import { useState, useEffect } from 'react';
import { getSettings, saveSettings } from '../lib/api';
import { DEFAULT_SETTINGS } from '../types';
import type { Settings } from '../types';

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSettings()
      .then(setSettings)
      .catch(() => setSettings(DEFAULT_SETTINGS))
      .finally(() => setLoading(false));
  }, []);

  const update = async (partial: Partial<Settings>) => {
    const merged = { ...settings, ...partial };
    setSettings(merged);
    await saveSettings(merged);
  };

  return { settings, loading, update };
}
