/**
 * Resolve the backend origin for both the Vite frontend and the production
 * custom server. Vite's development server proxies same-origin `/api`
 * requests to the backend, while the custom server serves its own API routes.
 */
const configuredOrigin = (() => {
  const value = import.meta.env.VITE_API_URL?.trim();
  if (!value) return undefined;
  return value.replace(/\/api\/?$/, '').replace(/\/$/, '');
})();

export const API_ORIGIN = configuredOrigin || (
  typeof window === 'undefined'
    ? 'http://localhost:3000'
    : window.location.origin
);

export const apiUrl = (path: string): string => (
  `${API_ORIGIN}/api${path.startsWith('/') ? path : `/${path}`}`
);
