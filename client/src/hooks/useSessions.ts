import { useState, useEffect, useCallback } from 'react';
import { getTodaySessions } from '../lib/api';
import type { Session } from '../types';

export function useSessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    getTodaySessions()
      .then(setSessions)
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { sessions, loading, refresh };
}
