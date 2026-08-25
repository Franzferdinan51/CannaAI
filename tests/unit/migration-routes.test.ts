/** @jest-environment node */

const mockMigrationManager = {
  exportForMigration: jest.fn(),
  importMigratedData: jest.fn(),
};

jest.mock('@/lib/export-import-utils', () => ({ migrationManager: mockMigrationManager }));

import { POST as exportMigration } from '@/app/api/migration/export/route';
import { GET as migrationStatus, POST as importMigration } from '@/app/api/migration/import/route';

describe('migration API routes', () => {
  beforeEach(() => jest.clearAllMocks());

  test('returns a real export job handle for download', async () => {
    mockMigrationManager.exportForMigration.mockResolvedValue({
      migrationId: 'migration-1',
      exportJobId: 'job-1',
      timestamp: '2026-08-25T00:00:00.000Z',
    });

    const response = await exportMigration(new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ sourceVersion: '1.0.0', targetVersion: '1.0.0' }),
      headers: { 'content-type': 'application/json' },
    }) as any);

    await expect(response.json()).resolves.toEqual(expect.objectContaining({
      success: true,
      exportJobId: 'job-1',
      downloadUrl: '/api/export/job-1',
    }));
  });

  test('reports import counts and errors instead of unconditional success', async () => {
    mockMigrationManager.importMigratedData.mockResolvedValue({
      imported: 2,
      skipped: 1,
      errors: 1,
      details: [{ action: 'failed' }],
    });

    const response = await importMigration(new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ data: { sourceVersion: '1.0.0', targetVersion: '1.0.0' } }),
      headers: { 'content-type': 'application/json' },
    }) as any);

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual(expect.objectContaining({
      success: false,
      imported: 2,
      skipped: 1,
      errors: 1,
    }));
  });

  test('does not claim migration completion without persisted status', async () => {
    const response = await migrationStatus(new Request('http://localhost/api/migration/import?migrationId=migration-1') as any);

    expect(response.status).toBe(501);
    await expect(response.json()).resolves.toEqual(expect.objectContaining({ success: false }));
  });
});
