/**
 * Shared agent-runtime message normalization.
 *
 * Both the OpenClaw and Hermes providers speak to tool-aware agent runtimes
 * over ACP and receive the same message shapes back. This module keeps the
 * text/image extraction in one place so the two providers can't drift.
 */

export function textFromAgentMessage(message: any): string {
  const content = message?.content;
  if (Array.isArray(content)) {
    const text = content
      .filter((part: any) => part?.type === 'text' && typeof part.text === 'string')
      .map((part: any) => part.text)
      .join('')
      .trim();
    if (text) return text;
  }
  if (typeof content === 'string' && content.trim()) return content.trim();
  return typeof message?.reasoning_content === 'string'
    ? message.reasoning_content.trim()
    : '';
}

export function normalizeAgentMessage(message: any, fallbackImage?: string) {
  const parts = Array.isArray(message?.content) ? message.content : [];
  const content = parts.length > 0
    ? parts
      .filter((part: any) => part?.type === 'text' && typeof part.text === 'string')
      .map((part: any) => part.text)
      .join('\n')
    : typeof message?.content === 'string'
      ? message.content
      : String(message?.text || '');
  const image = message?.image || parts.find((part: any) => (
    (part?.type === 'image_url' && typeof part?.image_url?.url === 'string') ||
    (part?.type === 'image' && typeof part?.image_url === 'string')
  ))?.image_url?.url || parts.find((part: any) => (
    part?.type === 'image' && typeof part?.image_url === 'string'
  ))?.image_url || (message?.role === 'user' ? fallbackImage : undefined);
  return { role: message?.role || 'user', content, image };
}
