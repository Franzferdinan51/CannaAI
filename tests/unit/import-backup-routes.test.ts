/** @jest-environment node */

import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { NextRequest } from 'next/server';

const processImport = jest.fn();
const verifyBackup = jest.fn();
const restoreFromBackup = jest.fn();
const createFullBackup = jest.fn();

jest.mock('@/lib/export-import-utils', () => ({
  MAX_IMPORT_FILE_SIZE: 10 * 1024 * 1024,
  isOpaqueId: (id: unknown) => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id),
  resolveImportFilePath: (id: string) => {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      throw new Error('Invalid identifier');
    }
    return `${process.cwd()}/uploads/imports/${id}`;
  },
  importManager: { processImport },
  backupManager: { verifyBackup, restoreFromBackup, createFullBackup },
}));

import { POST as upload } from '@/app/api/import/upload/route';
import { POST as execute } from '@/app/api/import/execute/route';
import { POST as createBackup } from '@/app/api/backup/create/route';
import { POST as restore } from '@/app/api/backup/restore/route';

const validId = '550e8400-e29b-41d4-a716-446655440000';

function jsonRequest(url: string, body: unknown): NextRequest {
  return new NextRequest(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('import and backup API boundaries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    processImport.mockResolvedValue({ imported: 0, skipped: 0, errors: 0, details: [] });
    verifyBackup.mockResolvedValue(true);
    restoreFromBackup.mockResolvedValue(undefined);
    createFullBackup.mockResolvedValue(validId);
  });

  it('rejects uploads above the bounded size before writing them', async () => {
    const form = new FormData();
    form.append('file', new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'nested/large.json', {
      type: 'application/json',
    }));

    const response = await upload(new NextRequest('http://localhost/api/import/upload', {
      method: 'POST',
      body: form,
    }));

    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({
      success: false,
      error: 'File exceeds the maximum upload size',
    });
  });

  it('rejects traversal input without touching the importer', async () => {
    const response = await execute(jsonRequest('http://localhost/api/import/execute', {
      fileId: '../outside',
    }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ success: false, error: 'Invalid file ID' });
    expect(processImport).not.toHaveBeenCalled();
  });

  it('preserves an explicit false skipErrors option and reports a failed import safely', async () => {
    const importPath = `${process.cwd()}/uploads/imports/${validId}`;
    mkdirSync(`${process.cwd()}/uploads/imports`, { recursive: true });
    writeFileSync(importPath, JSON.stringify({ data: { analyses: [] } }));
    processImport.mockResolvedValue({ imported: 0, skipped: 0, errors: 1, details: [{ error: 'Import failed' }] });

    const response = await execute(jsonRequest('http://localhost/api/import/execute', {
      fileId: validId,
      options: { skipErrors: false },
    }));

    expect(response.status).toBe(422);
    expect(processImport).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ skipErrors: false }));
    const body = await response.json();
    expect(body).toEqual(expect.objectContaining({ success: false, errors: 1 }));
    expect(JSON.stringify(body)).not.toContain('database');
    rmSync(`${process.cwd()}/uploads`, { recursive: true, force: true });
  });

  it('returns opaque backup IDs and verifies before restore without exposing paths', async () => {
    const createResponse = await createBackup(jsonRequest('http://localhost/api/backup/create', {}));
    const createBody = await createResponse.json();
    expect(createBody).toEqual(expect.objectContaining({ success: true, backupId: validId }));
    expect(createBody.backupPath).toBeUndefined();

    const restoreResponse = await restore(jsonRequest('http://localhost/api/backup/restore', {
      backupId: validId,
      verifyOnly: true,
    }));
    expect(restoreResponse.status).toBe(200);
    expect(verifyBackup).toHaveBeenCalledWith(validId);
    expect(restoreFromBackup).not.toHaveBeenCalled();
  });
});
