import {
  getChatResponseText,
  shouldUseAgentEvolver,
} from '@/lib/chat-routing';

describe('chat local routing regressions', () => {
  test('returns the content string instead of the entire result object', () => {
    expect(getChatResponseText({ content: 'local answer', model: 'qwen' }))
      .toBe('local answer');
  });

  test('passes through a plain-string local completion', () => {
    expect(getChatResponseText('local answer')).toBe('local answer');
  });

  test('does not let AgentEvolver bypass LM Studio when local is primary', () => {
    expect(shouldUseAgentEvolver('lmstudio')).toBe(false);
    expect(shouldUseAgentEvolver('lm-studio')).toBe(false);
  });

  test('allows AgentEvolver for non-local primaries', () => {
    expect(shouldUseAgentEvolver('minimax')).toBe(true);
    expect(shouldUseAgentEvolver('openrouter')).toBe(true);
  });
});
