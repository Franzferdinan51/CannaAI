/** Create a timeout signal on both modern and older supported Node runtimes. */
export function createTimeoutSignal(timeoutMs: number): AbortSignal {
  const nativeTimeout = (AbortSignal as typeof AbortSignal & {
    timeout?: (milliseconds: number) => AbortSignal;
  }).timeout;
  if (typeof nativeTimeout === 'function') return nativeTimeout(timeoutMs);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  timer.unref?.();
  return controller.signal;
}
