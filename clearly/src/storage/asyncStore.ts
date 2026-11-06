import AsyncStorage from '@react-native-async-storage/async-storage';

import type { KeyValueStore } from './kv';

/** The on-device store. Kept in its own file so tests never import native code. */
export const asyncStore: KeyValueStore = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  removeItem: (key) => AsyncStorage.removeItem(key),
};
