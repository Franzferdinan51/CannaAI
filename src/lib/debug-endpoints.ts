/**
 * Legacy diagnostic endpoints (/api/analyze-test, /api/debug/lmstudio-scan,
 * /api/debug/models-test, /api/analyze/triage) inspect the host and probe
 * services, so they stay off unless explicitly enabled with
 * CANNAAI_ENABLE_DEBUG_ENDPOINTS=true. An ambient NODE_ENV must never be
 * what opens them.
 */
export function debugEndpointsEnabled(): boolean {
  return process.env.CANNAAI_ENABLE_DEBUG_ENDPOINTS === 'true';
}
