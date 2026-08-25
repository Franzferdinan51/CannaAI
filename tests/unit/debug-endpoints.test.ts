/** @jest-environment node */

import { GET as getModelDebug } from '@/app/api/debug/models-test/route';
import { GET as getLMStudioScan } from '@/app/api/debug/lmstudio-scan/route';
import { POST as postAnalyzeTest } from '@/app/api/analyze-test/route';

describe('legacy diagnostic endpoints', () => {
  const originalFlag = process.env.CANNAAI_ENABLE_DEBUG_ENDPOINTS;

  beforeEach(() => {
    delete process.env.CANNAAI_ENABLE_DEBUG_ENDPOINTS;
  });

  afterAll(() => {
    if (originalFlag === undefined) delete process.env.CANNAAI_ENABLE_DEBUG_ENDPOINTS;
    else process.env.CANNAAI_ENABLE_DEBUG_ENDPOINTS = originalFlag;
  });

  test.each([
    ['model diagnostics', () => getModelDebug(new Request('http://localhost/api/debug/models-test'))],
    ['LM Studio scan', () => getLMStudioScan(new Request('http://localhost/api/debug/lmstudio-scan'))],
    ['analysis test endpoint', () => postAnalyzeTest(new Request('http://localhost/api/analyze-test', { method: 'POST' }))],
  ])('are unavailable unless explicitly enabled (%s)', async (_name, invoke) => {
    await expect(invoke()).resolves.toMatchObject({ status: 404 });
  });
});
