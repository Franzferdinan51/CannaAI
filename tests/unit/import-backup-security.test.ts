import { createHash } from 'node:crypto';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    plantAnalysis: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  },
}));

import {
  BackupManager,
  ImportManager,
  isOpaqueId,
  resolveBackupArtifactPath,
  resolveImportFilePath,
} from '@/lib/export-import-utils';

describe('import and backup security contracts', () => {
  it('accepts only opaque UUID identifiers and keeps them inside managed directories', () => {
    expect(isOpaqueId('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    expect(isOpaqueId('../secrets')).toBe(false);
    expect(() => resolveImportFilePath('../secrets')).toThrow('Invalid identifier');
    expect(() => resolveBackupArtifactPath('/tmp/backup')).toThrow('Invalid identifier');
    expect(resolveImportFilePath('550e8400-e29b-41d4-a716-446655440000')).toContain(
      '/uploads/imports/550e8400-e29b-41d4-a716-446655440000',
    );
  });

  it('does not continue importing after an error when skipErrors is false', async () => {
    const manager = new ImportManager();
    const { prisma } = require('@/lib/prisma');
    const upsert = prisma.plantAnalysis.upsert
      .mockRejectedValueOnce(new Error('database details'))
      .mockResolvedValueOnce({});
    prisma.plantAnalysis.findUnique.mockResolvedValue(null);

    const result = await manager.processImport(
      {
        data: {
          analyses: [
            { id: 'first', data: {} },
            { id: 'second', data: {} },
          ],
        },
      },
      { skipErrors: false },
    );

    expect(result.errors).toBe(1);
    expect(result.imported).toBe(0);
    expect(result.details).toHaveLength(1);
    expect(upsert).toHaveBeenCalledTimes(1);
  });

  it('verifies backup artifacts using their canonical content checksum', async () => {
    const manager = new BackupManager();
    const backupId = '550e8400-e29b-41d4-a716-446655440000';
    const artifact = {
      format: 'cannaai-backup',
      version: 1,
      backupId,
      createdAt: new Date().toISOString(),
      data: { analyses: [] },
    };
    const checksum = createHash('sha256').update(JSON.stringify(artifact)).digest('hex');
    const artifactPath = resolveBackupArtifactPath(backupId);
    mkdirSync(dirname(artifactPath), { recursive: true });
    writeFileSync(artifactPath, JSON.stringify({ ...artifact, checksum }));

    await expect(manager.verifyBackup(backupId)).resolves.toBe(true);
    writeFileSync(artifactPath, JSON.stringify({ ...artifact, checksum: 'tampered' }));
    await expect(manager.verifyBackup(backupId)).rejects.toThrow('Invalid backup artifact');
    expect(artifactPath).toContain(`/backups/${backupId}/backup.json`);
    rmSync(dirname(artifactPath), { recursive: true, force: true });
  });
});
