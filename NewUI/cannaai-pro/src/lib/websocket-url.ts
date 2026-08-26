/**
 * Resolve a WebSocket endpoint without depending on a bundler runtime.
 *
 * Keeping URL resolution separate from import.meta.env makes the contract
 * reusable by server-side tooling and CommonJS test runners. Vite-specific
 * configuration is supplied by socket.ts at the application boundary.
 */
export function resolveWebSocketUrl(
  endpoint: string,
  baseUrl?: string,
  token?: string,
): string {
  const fallback = typeof window === 'undefined'
    ? 'http://localhost:3000'
    : ['5173', '5174', '5175', '5176'].includes(window.location.port)
      ? `${window.location.protocol}//${window.location.hostname}:3001`
      : window.location.origin;
  const base = baseUrl || (typeof window !== 'undefined' ? window.location.href : fallback);
  const resolved = new URL(endpoint, base);

  if (resolved.protocol === 'http:') resolved.protocol = 'ws:';
  if (resolved.protocol === 'https:') resolved.protocol = 'wss:';
  if (token && !resolved.searchParams.has('token')) resolved.searchParams.set('token', token);

  return resolved.toString();
}
