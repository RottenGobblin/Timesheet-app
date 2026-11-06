import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import type { Readings } from '../engine';
import { asyncStore } from '../storage/asyncStore';
import { addTest, listTests, type KeyValueStore, type TestRecord } from '../storage';

interface TestsContextValue {
  /** Saved tests, newest first. */
  tests: TestRecord[];
  loading: boolean;
  add(input: { readings: Readings; notes?: string }): Promise<TestRecord>;
}

const TestsContext = createContext<TestsContextValue | null>(null);

export function TestsProvider({ children, store = asyncStore }: { children: ReactNode; store?: KeyValueStore }) {
  const [tests, setTests] = useState<TestRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    listTests(store)
      .catch(() => [])
      .then((t) => {
        if (cancelled) return;
        setTests(t);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [store]);

  const add = useCallback(
    async (input: { readings: Readings; notes?: string }) => {
      const saved = await addTest(store, input);
      setTests(await listTests(store));
      return saved;
    },
    [store],
  );

  const value = useMemo(() => ({ tests, loading, add }), [tests, loading, add]);
  return <TestsContext.Provider value={value}>{children}</TestsContext.Provider>;
}

export function useTests(): TestsContextValue {
  const ctx = useContext(TestsContext);
  if (!ctx) throw new Error('useTests must be used inside <TestsProvider>');
  return ctx;
}
