import fs from 'node:fs';
import path from 'node:path';

describe('Android LM Studio integration contract', () => {
  test('posts inference to the OpenAI-compatible v1 endpoint', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'android_backend/cannaai_server.py'),
      'utf8',
    );

    expect(source).toContain('f"{LM_STUDIO_URL}/v1/chat/completions"');
    expect(source).not.toContain('f"{LM_STUDIO_URL}/chat/completions"');
  });

  test('accepts phone image aliases without inventing analysis scores', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'android_backend/cannaai_server.py'),
      'utf8',
    );

    expect(source).toContain("data.get('plantImage') or data.get('image')");
    expect(source).toContain("health = None");
    expect(source).toContain("confidence = None");
    expect(source).toContain("return recs");
    expect(source).toContain("tmp_dir = tempfile.gettempdir()");
  });
});
