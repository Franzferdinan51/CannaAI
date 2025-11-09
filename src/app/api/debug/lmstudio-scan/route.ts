import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Export configuration for dual-mode compatibility
export const dynamic = 'auto';
export const revalidate = false;

// Test the exact path you mentioned
const TEST_PATHS = [
  'C:\\Users\\Ryan\\.lmstudio\\models',
  path.join(process.env.USERPROFILE || '', '.lmstudio', 'models'),
  'C:/Users/Ryan/.lmstudio/models'
];

async function scanDirectory(dirPath: string, depth: number = 0): Promise<any> {
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

    console.log(`Scanning directory: ${dirPath}, found ${entries.length} entries`);

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
        console.log(`  Found GGUF file: ${entry.name} (${(stats.size / (1024 * 1024)).toFixed(1)} MB)`);
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
    const response = await fetch('http://localhost:1234/v1/models', {
      signal: AbortSignal.timeout(3000)
    });

    if (response.ok) {
      const data = await response.json();
      return {
        running: true,
        models: data.data || [],
        count: (data.data || []).length
      };
    } else {
      return {
        running: false,
        error: `${response.status} ${response.statusText}`
      };
    }
  } catch (error) {
    return {
      running: false,
      error: error instanceof Error ? error.message : 'Connection failed'
    };
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('=== LM Studio Debug Scan Started ===');
    console.log('Platform:', process.platform);
    console.log('User Profile:', process.env.USERPROFILE);

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
    console.log('Checking if LM Studio is running...');
    results.lmStudioRunning = await checkLMStudioRunning();
    console.log('LM Studio running:', results.lmStudioRunning.running);

    // Test each path
    for (const testPath of TEST_PATHS) {
      console.log(`\nTesting path: ${testPath}`);

      const pathInfo = {
        path: testPath,
        exists: fs.existsSync(testPath),
        scanResult: null as any
      };

      if (pathInfo.exists) {
        console.log(`  ✓ Path exists, scanning...`);
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

        console.log(`  ✓ Found ${ggufCount} GGUF files in ${dirCount} directories`);

        // Log first few models for debugging
        if (pathInfo.scanResult.ggufFiles.length > 0) {
          console.log(`  First few models:`);
          pathInfo.scanResult.ggufFiles.slice(0, 5).forEach((file: any) => {
            console.log(`    - ${file.name} (${file.sizeFormatted})`);
          });
        }
      } else {
        console.log(`  ✗ Path does not exist`);
      }

      results.paths.push(pathInfo);
      results.summary.totalScanned++;
    }

    console.log('\n=== Final Summary ===');
    console.log(`Paths scanned: ${results.summary.totalScanned}`);
    console.log(`Paths that exist: ${results.summary.pathsExist}`);
    console.log(`Total directories: ${results.summary.totalDirectories}`);
    console.log(`Total GGUF files: ${results.summary.totalGgufFiles}`);
    console.log(`LM Studio running: ${results.lmStudioRunning.running}`);

    return NextResponse.json({
      success: true,
      ...results
    });

  } catch (error) {
    console.error('Debug scan error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}