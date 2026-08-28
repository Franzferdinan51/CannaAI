/** @jest-environment node */

import { hasUsableLMStudioChatModel } from '@/lib/lmstudio-model-catalog';

describe('LM Studio chat provider probing', () => {
  test('accepts native arbitrary chat models and legacy OpenAI models', () => {
    expect(hasUsableLMStudioChatModel({
      models: [{ key: 'my-local-model', type: 'llm' }],
    })).toBe(true);
    expect(hasUsableLMStudioChatModel({
      data: [{ id: 'my-local-model' }],
    })).toBe(true);
  });

  test('does not treat embedding or reranker catalogs as chat-ready', () => {
    expect(hasUsableLMStudioChatModel({
      models: [
        { key: 'text-embedding-model', type: 'embedding' },
        { key: 'qwen3-reranker-0.6b', type: 'llm' },
      ],
    })).toBe(false);
  });
});
