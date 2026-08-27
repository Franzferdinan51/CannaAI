import { getChatRequestTimeoutMs } from '../../NewUI/cannaai-pro/src/lib/chat-request-timeout';

describe('chat request timeout policy', () => {
  test('allows slow LM Studio vision inference to finish', () => {
    expect(getChatRequestTimeoutMs(true, 'lm-studio')).toBe(660000);
  });

  test('keeps local text requests bounded without using the vision deadline', () => {
    expect(getChatRequestTimeoutMs(false, 'lmstudio')).toBe(150000);
  });

  test('uses the standard deadline for cloud or unspecified providers', () => {
    expect(getChatRequestTimeoutMs(false, 'openrouter')).toBe(180000);
    expect(getChatRequestTimeoutMs(true, undefined)).toBe(660000);
  });
});
