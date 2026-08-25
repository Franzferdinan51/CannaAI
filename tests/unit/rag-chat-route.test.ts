/** @jest-environment node */

jest.mock('@/lib/ai/ragChat', () => ({
  ragChat: jest.fn(async (_query: string, documents: unknown[]) => ({
    response: documents.length ? 'context answer' : 'no-context answer',
    provider: 'lmstudio',
    references: [],
    hasContext: documents.length > 0,
    contextDocs: documents.length,
  })),
  getSuggestedQuestions: jest.fn(() => []),
}));

import { POST } from '@/app/api/rag-chat/route';
import { ragChat } from '@/lib/ai/ragChat';

describe('/api/rag-chat server boundary', () => {
  beforeEach(() => {
    (ragChat as jest.Mock).mockImplementation(async (_query: string, documents: unknown[]) => ({
      response: documents.length ? 'context answer' : 'no-context answer',
      provider: 'lmstudio',
      references: [],
      hasContext: documents.length > 0,
      contextDocs: documents.length,
    }));
  });

  test('does not access browser IndexedDB and accepts request documents', async () => {
    const documents = [{ id: 'doc-1', name: 'plant notes', content: 'healthy' }];
    const result = await POST({
      json: async () => ({ query: 'What did we observe?', config: {}, documents }),
    } as any);

    expect(result.status).toBe(200);
    expect(ragChat).toHaveBeenCalledWith('What did we observe?', documents, [], {});
    await expect(result.json()).resolves.toEqual(expect.objectContaining({
      success: true,
      hasContext: true,
      contextDocs: 1,
    }));
  });

  test('supports a valid no-context request instead of failing on IndexedDB', async () => {
    const result = await POST({
      json: async () => ({ query: 'Give general guidance', config: {} }),
    } as any);

    expect(result.status).toBe(200);
    await expect(result.json()).resolves.toEqual(expect.objectContaining({
      success: true,
      hasContext: false,
      contextDocs: 0,
    }));
  });
});
