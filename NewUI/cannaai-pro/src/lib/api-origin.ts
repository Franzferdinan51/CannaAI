/**
 * Resolve the backend origin for both the Vite frontend and the production
 * custom server. Vite's development server proxies same-origin `/api`
 * requests to the backend, while the custom server serves its own API routes.
 */
const configuredOrigin = (() => {
  const value = (
    import.meta.env.VITE_API_URL?.trim() ||
    (globalThis as typeof globalThis & { __VITE_API_URL__?: string }).__VITE_API_URL__?.trim()
  );
  if (!value) return undefined;
  return value.replace(/\/api\/?$/, '').replace(/\/$/, '');
})();

export function resolveApiOrigin(
  explicitOrigin?: string,
  runtimeOrigin?: string,
  server = typeof window === 'undefined',
): string {
  const normalizedExplicit = explicitOrigin?.trim()
    .replace(/\/api\/?$/, '')
    .replace(/\/$/, '');
  if (normalizedExplicit) return normalizedExplicit;
  if (server) return 'http://localhost:3000';

  // The Vite dev/preview server proxies same-origin `/api` requests to the
  // backend. Keeping the browser on its current origin avoids CORS failures
  // and also works when the backend is configured on a non-default port.
  return runtimeOrigin || window.location.origin;
}

export const API_ORIGIN = resolveApiOrigin(configuredOrigin);

export const apiUrl = (path: string): string => (
  `${API_ORIGIN}/api${path.startsWith('/') ? path : `/${path}`}`
);
