// localStorage polyfill for Node.js - MUST be loaded before any other module
// Use Object.defineProperty to prevent overwriting

const store = new Map();

const storage = {
  getItem: (key) => {
    const val = store.get(key);
    return val !== undefined ? String(val) : null;
  },
  setItem: (key, value) => {
    store.set(key, String(value));
  },
  removeItem: (key) => { store.delete(key); },
  clear: () => { store.clear(); },
  get length() { return store.size; },
  key: (index) => [...store.keys()][index] ?? null,
};

// Install on ALL globals using Object.defineProperty (non-writable)
const install = (target) => {
  if (target) {
    Object.defineProperty(target, 'localStorage', {
      value: storage,
      writable: false,
      configurable: false,
      enumerable: true
    });
  }
};

if (typeof global !== 'undefined') install(global);
if (typeof globalThis !== 'undefined') install(globalThis);

// And override Module._load to inject localStorage into any module that requires it
const OriginalLoad = typeof Module !== 'undefined' ? Module._load : null;
if (typeof Module !== 'undefined' && Module._load) {
  Module._load = function(request, parent, isMain) {
    const m = OriginalLoad.apply(this, arguments);
    return m;
  };
}
