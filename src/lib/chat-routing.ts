/**
 * Normalize the various chat result shapes used across CannaAI into the text
 * value expected by the HTTP API response.
 */
export function getChatResponseText(chatResult: any): string {
  if (typeof chatResult === 'string') return chatResult;
  if (Array.isArray(chatResult)) {
    return chatResult
      .filter((part: any) => part?.type === 'text' && typeof part.text === 'string')
      .map((part: any) => part.text)
      .join('')
      .trim();
  }
  if (typeof chatResult?.content === 'string' && chatResult.content.trim()) {
    return chatResult.content;
  }
  if (Array.isArray(chatResult?.content)) {
    const text = getChatResponseText(chatResult.content);
    if (text) return text;
  }
  if (typeof chatResult?.result === 'string' && chatResult.result.trim()) {
    return chatResult.result;
  }
  if (Array.isArray(chatResult?.result)) {
    const text = getChatResponseText(chatResult.result);
    if (text) return text;
  }
  if (typeof chatResult?.response === 'string' && chatResult.response.trim()) {
    return chatResult.response;
  }
  if (typeof chatResult?.reasoning_content === 'string' && chatResult.reasoning_content.trim()) {
    return chatResult.reasoning_content.trim();
  }
  return '';
}
