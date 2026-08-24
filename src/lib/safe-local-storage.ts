/** Browser storage wrapper that is safe during SSR and when storage is blocked. */
export const safeLocalStorage = {
  getItem(key: string): string | null {
    try {
      return typeof globalThis.localStorage === 'undefined'
        ? null
        : globalThis.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem(key: string, value: string): void {
    try {
      if (typeof globalThis.localStorage !== 'undefined') {
        globalThis.localStorage.setItem(key, value);
      }
    } catch {
      // Storage is optional; callers retain their in-memory state.
    }
  },
  removeItem(key: string): void {
    try {
      if (typeof globalThis.localStorage !== 'undefined') {
        globalThis.localStorage.removeItem(key);
      }
    } catch {
      // Storage is optional.
    }
  }
};
