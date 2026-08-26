/**
 * Resolve the backend origin for both the Vite frontend and the production
 * custom server. Vite's local preview is proxied to port 3001, while the
 * custom server defaults to port 3000 and serves its own API routes.
 */
const configuredOrigin = import.meta.env.VITE_API_URL?.trim();
const viteFrontendPorts = new Set(['5173', '5174', '5175', '5176']);

export const API_ORIGIN = configuredOrigin || (
  typeof window === 'undefined'
    ? 'http://localhost:3000'
    : viteFrontendPorts.has(window.location.port)
      ? `${window.location.protocol}//${window.location.hostname}:3001`
      : window.location.origin
);

export const apiUrl = (path: string): string => (
  `${API_ORIGIN}/api${path.startsWith('/') ? path : `/${path}`}`
);
