/** ESM-safe replacement for Recharts' CommonJS compat/get entrypoint. */
export default function get(object: unknown, path: unknown, defaultValue?: unknown): unknown {
  if (object == null) return defaultValue;
  const parts = Array.isArray(path)
    ? path
    : typeof path === 'string'
      ? path.split('.').filter(Boolean)
      : [path];
  let current: any = object;
  for (const part of parts) {
    if (current == null || part === '__proto__' || part === 'constructor' || part === 'prototype') {
      return defaultValue;
    }
    current = current[part as any];
  }
  return current === undefined ? defaultValue : current;
}
