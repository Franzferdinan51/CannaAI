/**
 * Return the browser deadline for a chat request.
 *
 * LM Studio vision inference may take several minutes on a cold or large
 * local model. This must stay above the server's ten-minute vision deadline,
 * otherwise the UI cancels a healthy request before the server can answer.
 */
export function getChatRequestTimeoutMs(hasImage: boolean, provider?: string): number {
  const normalizedProvider = provider?.toLowerCase().replace(/[-_]/g, '');
  // The browser may not know which provider wins detection, so any image
  // request gets the long deadline. Cloud providers still enforce their own
  // shorter server-side limit.
  if (hasImage) return 660000;
  if (normalizedProvider === 'lmstudio') return 150000;
  return 180000;
}
