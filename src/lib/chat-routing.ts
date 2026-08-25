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
