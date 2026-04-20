// Minimal polyfill - MUST be loaded before tsx compiles any modules
const store = new Map();
const localStorage = {
  getItem: (k) => (store.has(k) ? String(store.get(k)) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
  get length() { return store.size; },
  key: (i) => [...store.keys()][i] ?? null,
};
globalThis.localStorage = localStorage;
