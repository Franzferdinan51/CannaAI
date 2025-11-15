import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Export configuration for dual-mode compatibility
export const dynamic = 'auto';
export const revalidate = false;

// LM Studio model paths for different operating systems
const LM_STUDIO_PATHS = {
  win32: [
    path.join(process.env.USERPROFILE || '', '.lmstudio', 'models'),  // Your actual path
    path.join(process.env.LOCALAPPDATA || '', 'LM-Studio', 'models'),
    path.join(process.env.USERPROFILE || '', '.cache', 'lm-studio', 'models'),
    path.join(process.env.USERPROFILE || '', 'AppData', 'Roaming', 'LM-Studio', 'models'),
    'C:\\LM-Studio\\models',
    'D:\\LM-Studio\\models',
    'E:\\LM-Studio\\models'
  ],
  darwin: [
    path.join(process.env.HOME || '', '.lmstudio', 'models'),  // macOS equivalent
    path.join(process.env.HOME || '', 'Library', 'Application Support', 'LM-Studio', 'models'),
    path.join(process.env.HOME || '', '.cache', 'lm-studio', 'models')
  ],
  linux: [
    path.join(process.env.HOME || '', '.lmstudio', 'models'),  // Linux equivalent
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
                     process.env.VERCEL ||
                     !process.platform ||
                     typeof window !== 'undefined';

    if (isNetlify) {
      console.log('Running on serverless platform - returning demo data');
      return NextResponse.json({
        status: 'demo',
        message: 'LM Studio access is not available on serverless platforms. This is demo data.',
        lmStudioRunning: false,
        isServerless: true,
        models: [
          {
            id: 'demo_llava_vision',
            name: 'LLaVA Vision (Demo)',
            filename: 'llava-v1.5-7b-q4_demo.gguf',
            author: 'Demo',
            filepath: '/demo/path/llava-v1.5-7b-q4_demo.gguf',
            relativePath: 'demo/path/llava-v1.5-7b-q4_demo.gguf',
            fullPath: 'demo / path',
            size: 4100000000,
            sizeFormatted: '4.1 GB',
            sizeGB: 4.1,
            sizeMB: 4100.0,
            modified: new Date().toISOString(),
            provider: 'lmstudio-demo',
            type: 'gguf',
            capabilities: ['text-generation', 'vision', 'image-analysis', 'plant-analysis'],
            quantization: 'Q4_K_M',
            contextLength: 4096,
            metadata: {
              source: 'Demo Data - Serverless Platform',
              platform: 'serverless',
              version: '1.0.0',
              note: 'This is demo data. Real LM Studio models require local deployment.'
            }
          },
          {
            id: 'demo_cannabis_expert',
            name: 'Cannabis Expert (Demo)',
            filename: 'cannabis-expert-13b-q5_demo.gguf',
            author: 'Demo',
            filepath: '/demo/path/cannabis-expert-13b-q5_demo.gguf',
            relativePath: 'demo/path/cannabis-expert-13b-q5_demo.gguf',
            fullPath: 'demo / path',
            size: 8500000000,
            sizeFormatted: '8.5 GB',
            sizeGB: 8.5,
            sizeMB: 8500.0,
            modified: new Date().toISOString(),
            provider: 'lmstudio-demo',
            type: 'gguf',
            capabilities: ['text-generation', 'plant-analysis', 'classification', 'analysis'],
            quantization: 'Q5_K_M',
            contextLength: 8192,
            metadata: {
              source: 'Demo Data - Serverless Platform',
              platform: 'serverless',
              version: '1.0.0',
              note: 'This is demo data. Real LM Studio models require local deployment.'
            }
          }
        ],
        summary: {
          total: 2,
          vision: 1,
          textOnly: 1,
          plantAnalysis: 2
        },
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
      });
    }

    console.log('Platform:', process.platform);
    console.log('User Profile:', process.env.USERPROFILE);
    console.log('Local AppData:', process.env.LOCALAPPDATA);

    // First check if LM Studio is running
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url') || 'http://localhost:1234';

    // First check if LM Studio is running
    let lmStudioRunning = false;
    try {
      const response = await fetch(`${url}/v1/models`, {
        signal: AbortSignal.timeout(2000) // 2 second timeout
      });
      lmStudioRunning = response.ok;
      console.log('LM Studio running:', lmStudioRunning);
    } catch (error) {
      lmStudioRunning = false;
      console.log('LM Studio not running:', error.message);
    }

    // Scan for local models
    const models = await findLMStudioModels();
    console.log(`Found ${models.length} models total`);

    // Sort models by name and size
    models.sort((a, b) => {
      // Prioritize vision models
      const aHasVision = a.capabilities.includes('vision');
      const bHasVision = b.capabilities.includes('vision');

      if (aHasVision && !bHasVision) return -1;
      if (!aHasVision && bHasVision) return 1;

      // Then sort by size (larger first)
      return b.sizeGB - a.sizeGB;
    });

    const result = {
      status: 'success',
      lmStudioRunning,
      models,
      summary: {
        total: models.length,
        vision: models.filter(m => m.capabilities.includes('vision')).length,
        textOnly: models.filter(m => !m.capabilities.includes('vision')).length,
        plantAnalysis: models.filter(m => m.capabilities.includes('plant-analysis')).length
      },
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(result);

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