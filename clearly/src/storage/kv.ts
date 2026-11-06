/**
 * Minimal key-value interface. On device this is AsyncStorage (see asyncStore.ts);
 * in tests it's the in-memory store below, so repositories never touch native code.
 */
export interface KeyValueStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export interface MemoryStore extends KeyValueStore {
  /** Raw contents, for tests. */
  snapshot(): Record<string, string>;
}

export function createMemoryStore(initial: Record<string, string> = {}): MemoryStore {
  const data = new Map(Object.entries(initial));
  return {
    async getItem(key) {
      return data.get(key) ?? null;
    },
    async setItem(key, value) {
      data.set(key, value);
    },
    async removeItem(key) {
      data.delete(key);
    },
    snapshot() {
      return Object.fromEntries(data);
    },
  };
}
