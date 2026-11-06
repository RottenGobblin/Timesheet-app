import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import type { Readings } from '../engine';
import { asyncStore } from '../storage/asyncStore';
import { cancelReminder } from '../notifications';
import {
  addTest,
  deleteTest,
  listTests,
  loadAnyProgress,
  saveProgress,
  updateTestNotes,
  type KeyValueStore,
  type TestRecord,
} from '../storage';

interface TestsContextValue {
  /** Saved tests, newest first. */
  tests: TestRecord[];
  loading: boolean;
  add(input: { readings: Readings; notes?: string }): Promise<TestRecord>;
  updateNotes(id: string, notes: string): Promise<void>;
  remove(id: string): Promise<void>;
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

  const updateNotes = useCallback(
    async (id: string, notes: string) => {
      await updateTestNotes(store, id, notes);
      setTests(await listTests(store));
    },
    [store],
  );

  const remove = useCallback(
    async (id: string) => {
      await deleteTest(store, id);
      // If this test's plan has a reminder pending, it no longer applies.
      const progress = await loadAnyProgress(store).catch(() => null);
      if (progress?.testId === id && progress.reminderId) {
        await cancelReminder(progress.reminderId);
        await saveProgress(store, { testId: id, ticks: progress.ticks }).catch(() => undefined);
      }
      setTests(await listTests(store));
    },
    [store],
  );

  const value = useMemo(
    () => ({ tests, loading, add, updateNotes, remove }),
    [tests, loading, add, updateNotes, remove],
  );
  return <TestsContext.Provider value={value}>{children}</TestsContext.Provider>;
}

export function useTests(): TestsContextValue {
  const ctx = useContext(TestsContext);
  if (!ctx) throw new Error('useTests must be used inside <TestsProvider>');
  return ctx;
}
