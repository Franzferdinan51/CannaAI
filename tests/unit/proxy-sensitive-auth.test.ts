/** @jest-environment node */

import { isSensitiveMutation } from '@/proxy';

describe('sensitive API mutation classification', () => {
  test.each([
    '/api/backup/create',
    '/api/backup/restore',
    '/api/db/health',
    '/api/automation/engine',
    '/api/import/execute',
    '/api/migration/import',
  ])('requires auth for mutating %s requests', (pathname) => {
    expect(isSensitiveMutation(pathname, 'POST')).toBe(true);
  });

  test('does not gate ordinary reads or unrelated routes', () => {
    expect(isSensitiveMutation('/api/backup/restore', 'GET')).toBe(false);
    expect(isSensitiveMutation('/api/health', 'POST')).toBe(false);
  });
});
