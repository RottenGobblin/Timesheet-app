import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { asyncStore } from '../storage/asyncStore';
import { loadPool, savePool, type KeyValueStore, type Pool } from '../storage';

interface PoolContextValue {
  /** The saved pool, or null if none has been set up yet. */
  pool: Pool | null;
  /** True until the first load from storage has finished. */
  loading: boolean;
  save(pool: Omit<Pool, 'updatedAt'>): Promise<Pool>;
}

const PoolContext = createContext<PoolContextValue | null>(null);

export function PoolProvider({ children, store = asyncStore }: { children: ReactNode; store?: KeyValueStore }) {
  const [pool, setPool] = useState<Pool | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    loadPool(store)
      .catch(() => null)
      .then((p) => {
        if (cancelled) return;
        setPool(p);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [store]);

  const save = useCallback(
    async (next: Omit<Pool, 'updatedAt'>) => {
      const saved = await savePool(store, next);
      setPool(saved);
      return saved;
    },
    [store],
  );

  const value = useMemo(() => ({ pool, loading, save }), [pool, loading, save]);
  return <PoolContext.Provider value={value}>{children}</PoolContext.Provider>;
}

export function usePool(): PoolContextValue {
  const ctx = useContext(PoolContext);
  if (!ctx) throw new Error('usePool must be used inside <PoolProvider>');
  return ctx;
}
