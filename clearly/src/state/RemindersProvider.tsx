import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react';

import { planReminders } from '../lib/reminderSchedule';
import { ensurePermission, syncPlannedReminders } from '../notifications';
import { useSettings } from './SettingsProvider';
import { useTests } from './TestsProvider';

interface RemindersContextValue {
  /** Ask for notification permission if needed, then reschedule. Use after a user action. */
  requestAndSync(): Promise<number>;
}

const RemindersContext = createContext<RemindersContextValue | null>(null);

/**
 * Keeps test and overdue reminders in step with settings and the last test. Reschedules
 * quietly (no permission prompt) whenever either changes, including at app start.
 */
export function RemindersProvider({ children }: { children: ReactNode }) {
  const { settings, loading: settingsLoading } = useSettings();
  const { tests, loading: testsLoading } = useTests();
  const lastTestAt = tests[0]?.takenAt ?? null;

  const plan = useCallback(
    () => planReminders({ settings, lastTestAt: lastTestAt ? new Date(lastTestAt) : null, now: new Date() }),
    [settings, lastTestAt],
  );

  // Latest planner, so a permission prompt that resolves later still uses current data.
  const latestPlan = useRef(plan);
  useEffect(() => {
    latestPlan.current = plan;
  }, [plan]);

  useEffect(() => {
    if (settingsLoading || testsLoading) return;
    syncPlannedReminders(plan(), false).catch(() => undefined);
  }, [plan, settingsLoading, testsLoading]);

  const requestAndSync = useCallback(async () => {
    if (!(await ensurePermission())) return 0;
    return syncPlannedReminders(latestPlan.current(), false);
  }, []);
  const value = useMemo(() => ({ requestAndSync }), [requestAndSync]);
  return <RemindersContext.Provider value={value}>{children}</RemindersContext.Provider>;
}

export function useReminders(): RemindersContextValue {
  const ctx = useContext(RemindersContext);
  if (!ctx) throw new Error('useReminders must be used inside <RemindersProvider>');
  return ctx;
}
