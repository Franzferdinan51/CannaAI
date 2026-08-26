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
  // Vite proxies the websocket path alongside `/api`; keep browser-local
  // connections same-origin so they use that proxy instead of bypassing it.
  const fallback = typeof window === 'undefined' ? 'http://localhost:3000' : window.location.origin;
  const base = baseUrl || (typeof window !== 'undefined' ? window.location.href : fallback);
  const resolved = new URL(endpoint, base);

  if (resolved.protocol === 'http:') resolved.protocol = 'ws:';
  if (resolved.protocol === 'https:') resolved.protocol = 'wss:';
  if (token && !resolved.searchParams.has('token')) resolved.searchParams.set('token', token);

  return resolved.toString();
}
