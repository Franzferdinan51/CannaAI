// Optional Redis shim for app routes that only expose diagnostics.
// The full Redis client lives at the repo root and depends on packages that
// are not installed in every local environment.
export const redis = null;
export const cache = null;

export function createRedisClient() {
  throw new Error('Redis client is not available in this build.');
}
