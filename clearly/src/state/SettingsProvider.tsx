import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { asyncStore } from '../storage/asyncStore';
import { DEFAULT_SETTINGS, loadSettings, saveSettings, type AppSettings, type KeyValueStore } from '../storage';
import { palettes, ThemeColoursProvider } from '../theme';

interface SettingsContextValue {
  settings: AppSettings;
  loading: boolean;
  update(change: (current: AppSettings) => AppSettings): Promise<AppSettings>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

/** Holds app settings and applies sun mode to the whole app. */
export function SettingsProvider({ children, store = asyncStore }: { children: ReactNode; store?: KeyValueStore }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const current = useRef(settings);

  useEffect(() => {
    let cancelled = false;
    loadSettings(store)
      .catch(() => DEFAULT_SETTINGS)
      .then((s) => {
        if (cancelled) return;
        current.current = s;
        setSettings(s);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [store]);

  const update = useCallback(
    async (change: (current: AppSettings) => AppSettings) => {
      const next = change(current.current);
      current.current = next;
      setSettings(next);
      return saveSettings(store, next).catch(() => next);
    },
    [store],
  );

  const value = useMemo(() => ({ settings, loading, update }), [settings, loading, update]);
  return (
    <SettingsContext.Provider value={value}>
      <ThemeColoursProvider value={settings.sunMode ? palettes.sun : palettes.normal}>{children}</ThemeColoursProvider>
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside <SettingsProvider>');
  return ctx;
}
