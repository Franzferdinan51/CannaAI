import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync, readFileSync } from 'fs';
import { getLMStudioApiKey } from '@/lib/ai-provider-lmstudio';
import { normalizeRemoteModels } from '@/lib/lmstudio-models';
import { prisma } from '@/lib/prisma';

const execAsync = promisify(exec);
const SETTINGS_LOOKUP_TIMEOUT_MS = 2000;

function createTimeoutSignal(timeoutMs: number): AbortSignal {
  const nativeTimeout = (AbortSignal as typeof AbortSignal & {
    timeout?: (milliseconds: number) => AbortSignal;
  }).timeout;
  if (typeof nativeTimeout === 'function') return nativeTimeout(timeoutMs);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  timer.unref?.();
  return controller.signal;
}

async function withSettingsLookupTimeout<T>(operation: Promise<T>): Promise<T | undefined> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<undefined>((resolve) => {
      timer = setTimeout(() => resolve(undefined), SETTINGS_LOOKUP_TIMEOUT_MS);
      timer.unref?.();
    });
    return await Promise.race([operation, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function normalizeLMStudioBaseUrl(value: string): string {
  return value
    .replace(/\/(?:api\/)?v1\/?$/i, '')
    .replace(/\/api\/?$/i, '')
    .replace(/\/$/, '');
}

async function getRemoteLMStudioConfig(urlOverride?: string): Promise<{ baseUrl: string; apiKey?: string; candidates: string[] }> {
  // A URL supplied by the Settings screen is authoritative. Do not wait on
  // the optional Prisma-backed settings record before probing it; a locked or
  // slow local database must not turn a direct LM Studio test into a timeout.
  if (urlOverride?.trim()) {
    return buildLMStudioConfig({
      urlOverride,
      apiKey: process.env.LM_STUDIO_API_KEY || getLMStudioApiKey(),
    });
  }

  let fileUrl = '';
  try {
    const envText = readFileSync(path.join(process.cwd(), '.env.local'), 'utf8');
    fileUrl = envText.match(/^LM_STUDIO_(?:URL|BASE_URL)\s*=\s*["']?([^"'\n]+)["']?/m)?.[1]?.trim() || '';
  } catch { /* optional local env file */ }
  let storedUrl = '';
  let storedApiKey = '';
  try {
    const stored = await withSettingsLookupTimeout(
      prisma.automationSetting.findFirst({ orderBy: { updatedAt: 'desc' } }),
    );
    const storedConfig = stored?.config as { lmStudio?: { url?: unknown; apiKey?: unknown } } | null;
    storedUrl = typeof storedConfig?.lmStudio?.url === 'string' ? storedConfig.lmStudio.url.trim() : '';
    storedApiKey = typeof storedConfig?.lmStudio?.apiKey === 'string' ? storedConfig.lmStudio.apiKey.trim() : '';
  } catch {
    // Settings persistence is optional for static/development installs.
  }

  const configuredUrl = process.env.LM_STUDIO_URL || process.env.LM_STUDIO_BASE_URL || storedUrl || fileUrl;
  const configuredKey = storedApiKey || process.env.LM_STUDIO_API_KEY || getLMStudioApiKey();
  const configPath = process.env.OPENCLAW_CONFIG_PATH ||
    (process.env.HOME ? path.join(process.env.HOME, '.openclaw', 'openclaw.json') : '');

  let providerUrl = '';
  try {
    if (configPath && existsSync(configPath)) {
      const config = JSON.parse(readFileSync(configPath, 'utf8'));
      const provider = config?.models?.providers?.lmstudio;
      providerUrl = provider?.baseUrl || '';
      return buildLMStudioConfig({
        urlOverride,
        configuredUrl,
        fileUrl,
        providerUrl,
        apiKey: configuredKey || provider?.apiKey,
      });
    }
  } catch (error) {
    console.warn('Unable to read LM Studio connection settings:', error);
  }

  return buildLMStudioConfig({ urlOverride, configuredUrl, fileUrl, providerUrl, apiKey: configuredKey });
}

function buildLMStudioConfig(options: {
  urlOverride?: string;
  configuredUrl?: string;
  fileUrl?: string;
  providerUrl?: string;
  apiKey?: string;
}): { baseUrl: string; apiKey?: string; candidates: string[] } {
  const sources = options.urlOverride
    ? [options.urlOverride]
    : [
        options.configuredUrl,
        options.fileUrl,
        'http://127.0.0.1:1234',
        'http://localhost:1234',
        // An agent-managed endpoint is still useful, but should not delay a
        // local LM Studio instance when the agent config contains a stale
        // address.
        options.providerUrl,
      ];
  const candidates = Array.from(new Set(
    sources
      .filter((value): value is string => Boolean(value && value.trim()))
      .map(value => normalizeLMStudioBaseUrl(value.trim())),
  ));
  return {
    baseUrl: candidates[0] || 'http://localhost:1234',
    apiKey: options.apiKey,
    candidates,
  };
}

async function getRemoteModels(urlOverride?: string): Promise<any[] | null> {
  const { apiKey, candidates } = await getRemoteLMStudioConfig(urlOverride);

  for (const candidate of candidates) {
    // LM Studio exposes the OpenAI-compatible catalog at /v1/models and its
    // native catalog at /api/v1/models. Support both so version/configuration
    // differences do not surface as a generic browser network error.
    // Prefer the native catalog because it includes capabilities.vision and
    // loaded-instance metadata; fall back to the OpenAI-compatible catalog
    // for older LM Studio versions that do not expose /api/v1/models.
    for (const endpoint of [`${candidate}/api/v1/models`, `${candidate}/v1/models`]) {
      try {
        const response = await fetch(endpoint, {
          headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
          signal: createTimeoutSignal(2500)
        });
        if (!response.ok) continue;

        const payload = await response.json();
        const models = Array.isArray(payload.models)
          ? payload.models
          : Array.isArray(payload.data)
            ? payload.data
            : [];
        return normalizeRemoteModels(models);
      } catch {
        // Try the next API shape/configured endpoint before falling back to
        // the local disk catalog.
      }
    }
  }

  return null;
}

// Export configuration for dual-mode compatibility
export const dynamic = 'auto';
export const revalidate = false;

// LM Studio model paths for different operating systems
const LM_STUDIO_PATHS = {
  win32: [
    path.join(process.env.USERPROFILE || '', '.lmstudio', 'models'),
    path.join(process.env.LOCALAPPDATA || '', 'LM-Studio', 'models'),
    path.join(process.env.USERPROFILE || '', '.cache', 'lm-studio', 'models'),
    path.join(process.env.USERPROFILE || '', 'AppData', 'Roaming', 'LM-Studio', 'models'),
  ],
  darwin: [
    path.join(process.env.HOME || '', '.lmstudio', 'models'),
    path.join(process.env.HOME || '', 'Library', 'Application Support', 'LM-Studio', 'models'),
    path.join(process.env.HOME || '', '.cache', 'lm-studio', 'models')
  ],
  linux: [
    path.join(process.env.HOME || '', '.lmstudio', 'models'),
    path.join(process.env.HOME || '', '.local', 'share', 'LM-Studio', 'models'),
    path.join(process.env.HOME || '', '.cache', 'lm-studio', 'models')
  ]
};

async function findLMStudioModels(): Promise<any[]> {
  const models: any[] = [];
  const platform = process.platform;
  const paths = LM_STUDIO_PATHS[platform as keyof typeof LM_STUDIO_PATHS] || [];

  console.log(`Checking ${paths.length} potential LM Studio paths for platform ${platform}:`);

  for (const basePath of paths) {
    const exists = fs.existsSync(basePath);
    console.log(`  ${exists ? '✓' : '✗'} ${basePath}`);

    if (exists) {
      console.log(`  → Scanning LM Studio path: ${basePath}`);
      const initialModelCount = models.length;
      await scanDirectory(basePath, models);
      const modelsFound = models.length - initialModelCount;
      console.log(`  → Found ${modelsFound} models in ${basePath}`);
    }
  }

  console.log(`Total models found across all paths: ${models.length}`);
  return models;
}

async function scanDirectory(dirPath: string, models: any[]): Promise<void> {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        await scanDirectory(fullPath, models);
      } else if (entry.name.endsWith('.gguf')) {
        const model = await extractModelInfo(fullPath, dirPath);
        if (model) {
          models.push(model);
        }
      }
    }
  } catch (error) {
    console.warn(`Error scanning directory ${dirPath}:`, error);
  }
}

async function extractModelInfo(filePath: string, basePath: string): Promise<any | null> {
  try {
    const stats = fs.statSync(filePath);
    const fileName = path.basename(filePath, '.gguf');
    const relativePath = path.relative(basePath, filePath);
    const pathParts = relativePath.split(path.sep);

    // Better extraction of model name from nested path structure
    let modelName = fileName;
    let author = 'Unknown';
    let version = '';
    let fullModelPath = '';

    console.log(`Processing model: ${relativePath}, path parts:`, pathParts);

    // Try to extract author, model name, and version from nested path
    if (pathParts.length >= 1) {
      // Handle different nested structures:
      // author/model-name/file.gguf
      // author/model-name/version/file.gguf
      // author/model-name-quantization/file.gguf
      // model-name/file.gguf (no author folder)

      if (pathParts.length === 1) {
        // Just model-name.gguf in root
        modelName = pathParts[0];
        author = 'Local';
      } else if (pathParts.length === 2) {
        // author/model.gguf or model-name/model.gguf
        if (pathParts[0].toLowerCase().includes('gguf') ||
            ['thebloke', 'microsoft', 'meta', 'anthropic', 'google', 'nvidia'].includes(pathParts[0].toLowerCase())) {
          author = pathParts[0];
          modelName = pathParts[1];
        } else {
          author = pathParts[0];
          modelName = pathParts[1];
        }
      } else {
        // author/.../model.gguf - take the last meaningful part as model name
        author = pathParts[0];
        // Find the last directory that's not just a version or quantization
        for (let i = pathParts.length - 2; i >= 1; i--) {
          const part = pathParts[i];
          if (!part.match(/^[0-9.]+$/) && // Not just a version number
              !part.toLowerCase().includes('quant') && // Not quantization folder
              !part.toLowerCase().includes('gguf')) { // Not gguf folder
            modelName = part;
            break;
          }
        }

        // If we didn't find a good model name, use the directory before the file
        if (modelName === fileName) {
          modelName = pathParts[pathParts.length - 2];
        }
      }

      fullModelPath = pathParts.slice(0, -1).join(' / ');
    }

    // Clean up model name
    modelName = modelName
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
      .replace('Gguf', '')
      .replace(/\s+/g, ' ')
      .trim();

    // Clean up author name
    author = author
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, l => l.toLowerCase())
      .replace(' ', '')
      .trim();

    // Determine capabilities
    const capabilities = determineCapabilities(fileName, modelName, fullModelPath);

    // Get model size info
    const sizeGB = (stats.size / (1024 * 1024 * 1024)).toFixed(2);

    const model = {
      id: `${author}_${modelName}`.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase(),
      name: modelName,
      filename: fileName,
      author: author,
      filepath: filePath,
      relativePath: relativePath,
      fullPath: fullModelPath,
      size: stats.size,
      sizeFormatted: sizeGB === '0.00' ? `${(stats.size / (1024 * 1024)).toFixed(1)} MB` : `${sizeGB} GB`,
      sizeGB: parseFloat(sizeGB),
      sizeMB: parseFloat((stats.size / (1024 * 1024)).toFixed(1)),
      modified: stats.mtime.toISOString(),
      provider: 'lmstudio-local',
      type: 'gguf',
      capabilities: capabilities,
      quantization: extractQuantization(fileName),
      contextLength: await estimateContextLength(fileName, stats.size),
      metadata: {
        source: 'LM Studio Local',
        path: filePath,
        platform: process.platform,
        version: version || '1.0.0',
        folderStructure: pathParts,
        baseDirectory: basePath
      }
    };

    console.log(`Extracted model: ${model.name} by ${model.author} (${model.sizeFormatted})`);

    // Try to load additional metadata
    await loadAdditionalMetadata(model, filePath);

    return model;
  } catch (error) {
    console.warn(`Error extracting model info from ${filePath}:`, error);
    return null;
  }
}

function determineCapabilities(fileName: string, modelName: string, fullPath: string = ''): string[] {
  const capabilities = ['text-generation'];
  const lowerFileName = fileName.toLowerCase();
  const lowerModelName = modelName.toLowerCase();
  const lowerFullPath = fullPath.toLowerCase();

  // Vision capabilities
  if (lowerFileName.includes('vision') ||
      lowerFileName.includes('vila') ||
      lowerFileName.includes('llava') ||
      lowerFileName.includes('bakllava') ||
      lowerFileName.includes('cogvlm') ||
      lowerModelName.includes('vision') ||
      lowerFileName.includes('multimodal')) {
    capabilities.push('vision');
    capabilities.push('image-analysis');
  }

  // Plant-specific models
  if (lowerFileName.includes('plant') ||
      lowerFileName.includes('cannai') ||
      lowerFileName.includes('agriculture') ||
      lowerFileName.includes('botany')) {
    capabilities.push('plant-analysis');
    capabilities.push('classification');
  }

  // Classification models
  if (lowerFileName.includes('classifier') ||
      lowerFileName.includes('classification')) {
    capabilities.push('classification');
  }

  // Analysis models
  if (lowerFileName.includes('analysis') ||
      lowerFileName.includes('analyzer') ||
      lowerFileName.includes('expert')) {
    capabilities.push('analysis');
  }

  // Code models
  if (lowerFileName.includes('code') ||
      lowerFileName.includes('codellama')) {
    capabilities.push('code-generation');
  }

  // Long context models
  if (lowerFileName.includes('long') ||
      lowerFileName.includes('32k') ||
      lowerFileName.includes('8k') ||
      lowerFileName.includes('16k')) {
    capabilities.push('long-context');
  }

  return capabilities;
}

function extractQuantization(fileName: string): string {
  const lowerFileName = fileName.toLowerCase();

  if (lowerFileName.includes('q4_0')) return 'Q4_0';
  if (lowerFileName.includes('q4_k_m')) return 'Q4_K_M';
  if (lowerFileName.includes('q4_k_s')) return 'Q4_K_S';
  if (lowerFileName.includes('q5_0')) return 'Q5_0';
  if (lowerFileName.includes('q5_k_m')) return 'Q5_K_M';
  if (lowerFileName.includes('q5_k_s')) return 'Q5_K_S';
  if (lowerFileName.includes('q6_k')) return 'Q6_K';
  if (lowerFileName.includes('q8_0')) return 'Q8_0';
  if (lowerFileName.includes('q2_k')) return 'Q2_K';
  if (lowerFileName.includes('q3_k')) return 'Q3_K';
  if (lowerFileName.includes('f16')) return 'F16';
  if (lowerFileName.includes('f32')) return 'F32';

  return 'Unknown';
}

async function estimateContextLength(fileName: string, fileSize: number): Promise<number> {
  // Estimate context length based on model size and name
  const sizeGB = fileSize / (1024 * 1024 * 1024);
  const lowerFileName = fileName.toLowerCase();

  // Check for explicit context length in filename
  if (lowerFileName.includes('32k')) return 32768;
  if (lowerFileName.includes('16k')) return 16384;
  if (lowerFileName.includes('8k')) return 8192;
  if (lowerFileName.includes('4k')) return 4096;

  // Estimate based on model size
  if (sizeGB > 10) return 32768; // Large models typically have longer context
  if (sizeGB > 5) return 16384;
  if (sizeGB > 2) return 8192;
  if (sizeGB > 1) return 4096;

  return 2048; // Default for smaller models
}

async function loadAdditionalMetadata(model: any, filePath: string): Promise<void> {
  try {
    // Look for companion metadata files
    const baseName = filePath.replace('.gguf', '');
    const dir = path.dirname(filePath);

    const metadataFiles = [
      path.join(dir, 'metadata.json'),
      path.join(dir, 'model_info.json'),
      baseName + '.json',
      baseName + '_metadata.json'
    ];

    for (const metadataFile of metadataFiles) {
      if (fs.existsSync(metadataFile)) {
        try {
          const metadata = JSON.parse(fs.readFileSync(metadataFile, 'utf8'));
          Object.assign(model.metadata, metadata);
          break;
        } catch (e) {
          // Continue if metadata file is invalid
        }
      }
    }
  } catch (error) {
    // Ignore metadata loading errors
  }
}

export async function GET(request: NextRequest) {
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
    console.log('=== LM Studio Model Scan Started ===');
    console.log('Platform:', process.platform);
    console.log('Netlify Detection:', process.env.NETLIFY || 'Not detected');

    // Check if we're running on Netlify or similar serverless platform
    const isNetlify = !!process.env.NETLIFY ||
                     !!process.env.VERCEL ||
                     !!process.env.AWS_LAMBDA_FUNCTION_NAME;

    if (isNetlify) {
      console.log('Running on serverless platform - LM Studio is unavailable');
      return NextResponse.json({
        status: 'unavailable',
        message: 'LM Studio access is not available on serverless platforms.',
        lmStudioRunning: false,
        isServerless: true,
        models: [],
        summary: { total: 0, vision: 0, textOnly: 0, plantAnalysis: 0 },
        timestamp: new Date().toISOString(),
        deploymentInfo: {
          platform: 'Serverless (Netlify/Vercel)',
          limitations: [
            'LM Studio requires local deployment',
            'File system access is not available',
            'Local network connections are restricted',
            'Consider using cloud AI providers instead'
          ],
          alternatives: [
            'OpenRouter API for cloud models',
            'Local deployment with Docker',
            'Self-hosted server with full access'
          ]
        }
      }, { status: 503 });
    }

    console.log('Platform:', process.platform);
    console.log('User Profile:', process.env.USERPROFILE);
    console.log('Local AppData:', process.env.LOCALAPPDATA);

    const { searchParams } = new URL(request.url);
    const urlOverride = searchParams.get('url') || undefined;
    const remoteModels = await getRemoteModels(urlOverride);
    if (remoteModels) {
      return NextResponse.json({
        status: 'success',
        lmStudioRunning: true,
        models: remoteModels,
        summary: {
          total: remoteModels.length,
          vision: remoteModels.filter(model => model.capabilities.includes('vision')).length,
          textOnly: remoteModels.filter(model => !model.capabilities.includes('vision')).length,
          plantAnalysis: remoteModels.filter(model => model.capabilities.includes('plant-analysis')).length
        },
        timestamp: new Date().toISOString(),
        source: 'remote-api'
      });
    }

    // An explicit URL is a connection test, not a request for a full local
    // filesystem scan. Return promptly when that endpoint is unavailable.
    if (urlOverride) {
      return NextResponse.json({
        status: 'unavailable',
        lmStudioRunning: false,
        available: false,
        message: 'LM Studio is not reachable at the configured URL.',
        models: [],
        summary: { total: 0, vision: 0, textOnly: 0, plantAnalysis: 0 },
        timestamp: new Date().toISOString(),
        source: 'remote-api',
      });
    }

    // Scan for local models
    const models = await findLMStudioModels();
    console.log(`Found ${models.length} models total (before deduplication)`);

    // Deduplicate models by ID (keep the first occurrence)
    const uniqueModels = Array.from(
      new Map(models.map(model => [model.id, model])).values()
    );
    console.log(`Found ${uniqueModels.length} unique models after deduplication`);

    // Sort models by name and size
    uniqueModels.sort((a, b) => {
      // Prioritize vision models
      const aHasVision = a.capabilities.includes('vision');
      const bHasVision = b.capabilities.includes('vision');

      if (aHasVision && !bHasVision) return -1;
      if (!aHasVision && bHasVision) return 1;

      // Then sort by size (larger first)
      return b.sizeGB - a.sizeGB;
    });

    const result = {
      // A disk catalog is useful for diagnostics, but it does not prove that
      // LM Studio can accept inference requests. Do not present stale files
      // as a healthy connected provider.
      status: 'unavailable',
      lmStudioRunning: false,
      available: false,
      message: uniqueModels.length > 0
        ? 'LM Studio is not reachable; showing locally discovered model files only.'
        : 'LM Studio is not reachable and no local model files were discovered.',
      models: uniqueModels,
      summary: {
        total: uniqueModels.length,
        vision: uniqueModels.filter(m => m.capabilities.includes('vision')).length,
        textOnly: uniqueModels.filter(m => !m.capabilities.includes('vision')).length,
        plantAnalysis: uniqueModels.filter(m => m.capabilities.includes('plant-analysis')).length
      },
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(result, { status: 503 });

  } catch (error) {
    console.error('Error scanning LM Studio models:', error);

    // Check if the error is due to serverless limitations
    const isServerlessError = error.message.includes('EACCES') ||
                            error.message.includes('EPERM') ||
                            error.message.includes('ENOENT') ||
                            !process.platform;

    if (isServerlessError) {
      return NextResponse.json({
        status: 'serverless_limitation',
        message: 'LM Studio access is not available on this platform',
        error: 'Serverless platform limitations',
        models: [],
        summary: { total: 0, vision: 0, textOnly: 0, plantAnalysis: 0 },
        timestamp: new Date().toISOString(),
        deploymentInfo: {
          platform: 'Serverless',
          limitations: [
            'File system access restricted',
            'Local network access limited'
          ]
        }
      }, { status: 200 }); // Return 200 so frontend can handle gracefully
    }

    return NextResponse.json({
      status: 'error',
      error: error.message,
      models: [],
      summary: { total: 0, vision: 0, textOnly: 0, plantAnalysis: 0 },
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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
    const body = await request.json();
    const { action, modelId } = body;

    if (action === 'refresh') {
      // Force refresh of models
      return GET(request);
    }

    return NextResponse.json({
      status: 'error',
      error: 'Unknown action'
    }, { status: 400 });

  } catch (error) {
    console.error('Error in LM Studio models API:', error);
    return NextResponse.json({
      status: 'error',
      error: error.message
    }, { status: 500 });
  }
}
