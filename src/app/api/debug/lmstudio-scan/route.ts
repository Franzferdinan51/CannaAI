import { NextResponse } from 'next/server';
import { debugEndpointsEnabled } from '@/lib/debug-endpoints';
import fs from 'fs';
import path from 'path';
import { getLMStudioApiKey } from '@/lib/ai-provider-lmstudio';
import { createTimeoutSignal } from '@/lib/abort-signal';
import { withRequest, getLogger } from '@/lib/logger';

// Export configuration for dual-mode compatibility
// This endpoint inspects the host filesystem and a live LM Studio service.
// It must never run during a production build or be served as a frozen page.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = false;

// Test paths for LM Studio
const TEST_PATHS = [
  path.join(process.env.HOME || process.env.USERPROFILE || '', '.lmstudio', 'models'),
  path.join(process.env.LOCALAPPDATA || '', 'LM-Studio', 'models'),
  path.join(process.env.HOME || '', 'Library', 'Application Support', 'LM-Studio', 'models'),
  path.join(process.env.HOME || '', '.local', 'share', 'LM-Studio', 'models'),
];

async function scanDirectory(dirPath: string, depth: number = 0): Promise<any> {
  const log = getLogger();
  const maxDepth = 5;
  if (depth > maxDepth) {
    return { error: 'Max depth reached' };
  }

  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    const result: any = {
      path: dirPath,
      exists: true,
      directories: [],
      files: [],
      ggufFiles: [],
      totalFiles: 0
    };

    log.debug('debug.lmstudio_scan_directory', { path: dirPath, entries: entries.length });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        const subResult = await scanDirectory(fullPath, depth + 1);
        result.directories.push({
          name: entry.name,
          path: fullPath,
          ...subResult
        });
      } else if (entry.isFile() && entry.name.endsWith('.gguf')) {
        const stats = fs.statSync(fullPath);
        result.ggufFiles.push({
          name: entry.name,
          path: fullPath,
          size: stats.size,
          sizeFormatted: `${(stats.size / (1024 * 1024)).toFixed(1)} MB`,
          modified: stats.mtime.toISOString()
        });
        log.debug('debug.lmstudio_scan_gguf_found', { name: entry.name, sizeMb: Number((stats.size / (1024 * 1024)).toFixed(1)) });
      } else if (entry.isFile()) {
        result.files.push({
          name: entry.name,
          path: fullPath,
          extension: path.extname(entry.name)
        });
      }
    }

    result.totalFiles = result.directories.length + result.files.length + result.ggufFiles.length;
    return result;

  } catch (error) {
    return {
      path: dirPath,
      exists: false,
      error: error.message,
      errorCode: error.code
    };
  }
}

async function checkLMStudioRunning() {
  try {
    const baseUrl = (process.env.LM_STUDIO_BASE_URL || process.env.LM_STUDIO_URL || 'http://localhost:1234')
      .replace(/\/(?:api\/)?v1\/?$/i, '')
      .replace(/\/api\/?$/i, '')
      .replace(/\/$/, '');
    const apiKey = getLMStudioApiKey();
    for (const apiPath of ['/api/v1/models', '/v1/models']) {
      try {
        const response = await fetch(`${baseUrl}${apiPath}`, {
          signal: createTimeoutSignal(3000),
          headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {}
        });
        if (!response.ok) continue;
        const data = await response.json();
        const models = Array.isArray(data.models) ? data.models : data.data || [];
        return { running: true, models, count: models.length };
      } catch {
        // A failed native probe should not prevent the legacy endpoint probe.
      }
    }
    return { running: false, error: 'LM Studio model endpoints returned no successful response' };
  } catch (error) {
    return {
      running: false,
      error: error instanceof Error ? error.message : 'Connection failed'
    };
  }
}

export async function GET(_request: Request) {
  const log = withRequest(_request);
  if (!debugEndpointsEnabled()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // For static export, provide client-side compatibility response
  const isStaticExport = process.env.BUILD_MODE === 'static';
  if (isStaticExport) {
    return NextResponse.json({
      success: false,
      message: 'This API is handled client-side in static export mode.',
      clientSide: true,
      buildMode: 'static'
    });
  }

  try {
    log.info('debug.lmstudio_scan_started', { platform: process.platform, userProfile: process.env.USERPROFILE ?? null });

    const results = {
      timestamp: new Date().toISOString(),
      environment: {
        platform: process.platform,
        userProfile: process.env.USERPROFILE,
        nodeVersion: process.version,
        workingDirectory: process.cwd()
      },
      paths: [],
      lmStudioRunning: null as any,
      summary: {
        totalScanned: 0,
        pathsExist: 0,
        totalGgufFiles: 0,
        totalDirectories: 0
      }
    };

    // Test LM Studio connection
    log.info('debug.lmstudio_scan_checking_lmstudio');
    results.lmStudioRunning = await checkLMStudioRunning();
    log.info('debug.lmstudio_scan_lmstudio_status', { running: results.lmStudioRunning.running });

    // Test each path
    for (const testPath of TEST_PATHS) {
      log.info('debug.lmstudio_scan_path', { path: testPath });

      const pathInfo = {
        path: testPath,
        exists: fs.existsSync(testPath),
        scanResult: null as any
      };

      if (pathInfo.exists) {
        log.debug('debug.lmstudio_scan_path_exists', { path: testPath });
        results.summary.pathsExist++;
        pathInfo.scanResult = await scanDirectory(testPath);

        // Count total files and directories
        const countFiles = (scanResult: any) => {
          let count = scanResult.ggufFiles ? scanResult.ggufFiles.length : 0;
          if (scanResult.directories) {
            for (const subDir of scanResult.directories) {
              count += countFiles(subDir);
            }
          }
          return count;
        };

        const countDirs = (scanResult: any) => {
          let count = scanResult.directories ? scanResult.directories.length : 0;
          if (scanResult.directories) {
            for (const subDir of scanResult.directories) {
              count += countDirs(subDir);
            }
          }
          return count;
        };

        const ggufCount = countFiles(pathInfo.scanResult);
        const dirCount = countDirs(pathInfo.scanResult);

        results.summary.totalGgufFiles += ggufCount;
        results.summary.totalDirectories += dirCount;

        log.info('debug.lmstudio_scan_path_result', { path: testPath, ggufCount, dirCount });

        // Log first few models for debugging
        if (pathInfo.scanResult.ggufFiles.length > 0) {
          log.debug('debug.lmstudio_scan_first_models', {
            path: testPath,
            models: pathInfo.scanResult.ggufFiles.slice(0, 5).map((file: any) => ({ name: file.name, sizeFormatted: file.sizeFormatted })),
          });
        }
      } else {
        log.info('debug.lmstudio_scan_path_missing', { path: testPath });
      }

      results.paths.push(pathInfo);
      results.summary.totalScanned++;
    }

    log.info('debug.lmstudio_scan_summary', {
      totalScanned: results.summary.totalScanned,
      pathsExist: results.summary.pathsExist,
      totalDirectories: results.summary.totalDirectories,
      totalGgufFiles: results.summary.totalGgufFiles,
      lmStudioRunning: results.lmStudioRunning.running,
    });

    return NextResponse.json({
      success: true,
      ...results
    });

  } catch (error) {
    log.error('debug.lmstudio_scan_error', { error: error instanceof Error ? error.message : 'unknown' });
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
