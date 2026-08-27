import { getChatResponseText } from '@/lib/chat-routing';

describe('getChatResponseText', () => {
  test('normalizes OpenAI text parts', () => {
    expect(getChatResponseText({
      content: [
        { type: 'text', text: 'part one' },
        { type: 'image', image_url: 'ignored' },
        { type: 'text', text: ' part two' },
      ],
    })).toBe('part one part two');
  });

  test('uses reasoning content when the visible answer is empty', () => {
    expect(getChatResponseText({ content: '', reasoning_content: 'reasoned answer' }))
      .toBe('reasoned answer');
  });

  test('does not fabricate a success message for empty results', () => {
    expect(getChatResponseText({ content: [] })).toBe('');
    expect(getChatResponseText({})).toBe('');
  });
});
