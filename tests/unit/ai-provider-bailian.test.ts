describe('Bailian vision requests', () => {
  const originalApiKey = process.env.ALIBABA_API_KEY;
  let executeWithBailian: typeof import('@/lib/ai-provider-bailian').executeWithBailian;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.resetModules();
    process.env.ALIBABA_API_KEY = 'sk-test';
    ({ executeWithBailian } = await import('@/lib/ai-provider-bailian'));
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'healthy plant' } }],
        usage: { total_tokens: 3 },
      }),
    }) as unknown as typeof fetch;
  });

  afterAll(() => {
    if (originalApiKey === undefined) delete process.env.ALIBABA_API_KEY;
    else process.env.ALIBABA_API_KEY = originalApiKey;
  });

  test('keeps the image when the configured qwen3.5-plus vision model is selected', async () => {
    const response = await executeWithBailian({
      image: 'ZmFrZS1pbWFnZQ==',
      prompt: 'Assess this plant',
    });

    expect(response.success).toBe(true);
    const [, request] = (global.fetch as jest.Mock).mock.calls[0];
    const body = JSON.parse(request.body);
    expect(body.model).toBe('qwen3.5-plus');
    expect(body.messages[0].content).toEqual([
      { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,ZmFrZS1pbWFnZQ==' } },
      { type: 'text', text: 'Assess this plant' },
    ]);
  });

  test('refuses to silently discard an image for an explicit text-only model', async () => {
    const response = await executeWithBailian({
      image: 'ZmFrZQ==',
      prompt: 'Assess this plant',
      model: 'qwen3.5-plus-text-only',
    });

    expect(response.success).toBe(false);
    expect(response.error).toContain('refusing to drop the image');
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
