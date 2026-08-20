export function normalizeProviderNameForChat(provider?: string): string {
  const normalized = String(provider || '').trim().toLowerCase();
  if (normalized === 'lm-studio' || normalized === 'lm_studio') return 'lmstudio';
  return normalized;
}

/**
 * AgentEvolver is an enhancement layer, but it must not silently replace a
 * local provider that CannaAI just selected as primary. When LM Studio is
 * primary, route directly to the local provider/fallback chain.
 */
export function shouldUseAgentEvolver(primaryProvider?: string): boolean {
  return normalizeProviderNameForChat(primaryProvider) !== 'lmstudio';
}

/**
 * Normalize the various chat result shapes used across CannaAI into the text
 * value expected by the HTTP API response.
 */
export function getChatResponseText(chatResult: any): string {
  if (typeof chatResult === 'string') return chatResult;
  if (typeof chatResult?.content === 'string' && chatResult.content.trim()) {
    return chatResult.content;
  }
  if (typeof chatResult?.result === 'string' && chatResult.result.trim()) {
    return chatResult.result;
  }
  if (typeof chatResult?.response === 'string' && chatResult.response.trim()) {
    return chatResult.response;
  }
  return 'Chat response generated successfully';
}
