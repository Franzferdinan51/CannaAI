/** @jest-environment node */

describe('analysis provider guidance', () => {
  test('does not advertise Bailian as the primary provider', async () => {
    const source = await import('node:fs/promises');
    const route = await source.readFile('src/app/api/analyze/route.ts', 'utf8');

    expect(route).not.toContain('PRIMARY - qwen3.5-plus');
    expect(route).toContain('Start LM Studio and load a local chat or vision model (recommended)');
  });
});
