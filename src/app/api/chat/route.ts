import { NextRequest, NextResponse } from 'next/server';

// Default settings
let currentSettings = {
  aiProvider: 'lm-studio',
  lmStudio: {
    url: 'http://localhost:1234',
    apiKey: '',
    model: 'llama-3-8b-instruct'
  },
  openRouter: {
    apiKey: '',
    model: 'meta-llama/llama-3.1-8b-instruct:free',
    baseUrl: 'https://openrouter.ai/api/v1'
  }
};

// Image validation constants
const MAX_IMAGE_SIZE = 20 * 1024 * 1024; // 20MB
const SUPPORTED_IMAGE_FORMATS = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const VISION_MODEL_KEYWORDS = ['vision', 'vila', 'llava', 'multimodal', 'image', 'visual', 'clip', 'siglip', 'vl', 'vision-language', 'mmproj', 'mm'];
const LM_STUDIO_VISION_MODELS = [
  'llava-v1.5-7b',
  'llava-v1.5-13b',
  'llava-v1.6-mistral-7b',
  'llava-v1.6-vicuna-13b',
  'vila-7b',
  'vila-13b',
  'cogvlm',
  'deepseek-vl',
  'qwen-vl',
  'qwen2-vl',
  'qwen3-vl',
  'qwen2.5-vl',
  'qwen-vl-chat',
  'qwen2-vl-chat',
  'qwen3-vl-chat',
  'qwen2.5-vl-chat',
  'qwen/qwen2-vl',
  'qwen/qwen3-vl',
  'qwen/qwen2.5-vl',
  'qwen/qwen-vl-chat',
  'qwen/qwen2-vl-chat',
  'qwen/qwen3-vl-chat',
  'qwen/qwen2.5-vl-chat',
  'internvl-chat',
  'internvl2',
  'internvl2.5',
  'minicpm-v',
  'minicpm-2.6',
  'gemma-2-it-vision',
  'llama-3.2-11b-vision-instruct',
  'llama-3.2-90b-vision-instruct',
  'lfm2-vl',
  'llava-next',
  'llava-next-34b',
  'moondream2',
  'phi3-vision',
  'phi3.5-vision'
];

// Utility functions for image processing
function validateImageFormat(imageDataUrl: string): { isValid: boolean; mimeType?: string; error?: string } {
  try {
    // Extract MIME type from data URL
    const matches = imageDataUrl.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*$/);
    if (!matches || !matches[1]) {
      return { isValid: false, error: 'Invalid data URL format' };
    }

    const mimeType = matches[1];
    if (!SUPPORTED_IMAGE_FORMATS.includes(mimeType)) {
      return {
        isValid: false,
        error: `Unsupported image format: ${mimeType}. Supported formats: ${SUPPORTED_IMAGE_FORMATS.join(', ')}`
      };
    }

    return { isValid: true, mimeType };
  } catch (error) {
    return { isValid: false, error: 'Failed to parse image format' };
  }
}

function validateImageSize(base64Data: string): { isValid: boolean; sizeBytes: number; error?: string } {
  try {
    // Remove data URL prefix to get pure base64 data
    const base64Content = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');
    const sizeBytes = Math.ceil(base64Content.length * 0.75); // Base64 is ~33% larger than binary

    if (sizeBytes > MAX_IMAGE_SIZE) {
      return {
        isValid: false,
        sizeBytes,
        error: `Image size (${Math.round(sizeBytes / 1024 / 1024)}MB) exceeds maximum allowed size (${Math.round(MAX_IMAGE_SIZE / 1024 / 1024)}MB)`
      };
    }

    return { isValid: true, sizeBytes };
  } catch (error) {
    return { isValid: false, sizeBytes: 0, error: 'Failed to calculate image size' };
  }
}

function normalizeImageDataUrl(imageDataUrl: string): { normalized: string; mimeType: string; sizeBytes: number } {
  // Extract MIME type and base64 data
  const matches = imageDataUrl.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);

  if (!matches || !matches[1] || !matches[2]) {
    throw new Error('Invalid data URL format');
  }

  const mimeType = matches[1];
  const base64Data = matches[2];

  // Normalize base64 (remove whitespace if any)
  const cleanBase64 = base64Data.replace(/\s/g, '');

  // Calculate size
  const sizeBytes = Math.ceil(cleanBase64.length * 0.75);

  return {
    normalized: `data:${mimeType};base64,${cleanBase64}`,
    mimeType,
    sizeBytes
  };
}

// Enhanced vision capability detection
function detectVisionCapabilities(modelId: string, provider: string): {
  hasVision: boolean;
  confidence: number;
  detectedKeywords: string[];
  modelType: string;
  isKnownVisionModel: boolean;
} {
  const modelLower = modelId.toLowerCase();
  const detectedKeywords: string[] = [];
  let confidence = 0;
  let modelType = 'text';

  // Check against known vision models (highest confidence)
  const isKnownVisionModel = LM_STUDIO_VISION_MODELS.some(knownModel =>
    modelLower.includes(knownModel.toLowerCase())
  );

  if (isKnownVisionModel) {
    confidence = 100;
    detectedKeywords.push('known-vision-model');
    modelType = 'vision';
  }

  // Check for vision keywords with higher weight for 'vl'
  VISION_MODEL_KEYWORDS.forEach(keyword => {
    if (modelLower.includes(keyword)) {
      detectedKeywords.push(keyword);
      // Give extra weight to 'vl' as it's a strong vision indicator
      confidence += keyword === 'vl' ? 25 : 15;
    }
  });

  // Enhanced pattern matching for modern vision models

  // Qwen VL models (including variants with thinking/extended)
  if (modelLower.includes('qwen') && modelLower.includes('vl')) {
    detectedKeywords.push('qwen-vl-pattern');
    confidence += 40;
    modelType = 'vision';
  }

  // Specific model version patterns
  if (modelLower.includes('3-vl') || modelLower.includes('2-vl') || modelLower.includes('2.5-vl')) {
    detectedKeywords.push('qwen-version-vl');
    confidence += 35;
    modelType = 'vision';
  }

  // LFM2 VL models
  if (modelLower.includes('lfm2') && modelLower.includes('vl')) {
    detectedKeywords.push('lfm2-vl');
    confidence += 40;
    modelType = 'vision';
  }

  // LLaVA Next models
  if (modelLower.includes('llava-next') || modelLower.includes('llava next')) {
    detectedKeywords.push('llava-next');
    confidence += 35;
    modelType = 'vision';
  }

  // InternVL variants
  if (modelLower.includes('internvl') || modelLower.includes('intern vl')) {
    detectedKeywords.push('internvl');
    confidence += 35;
    modelType = 'vision';
  }

  // MiniCPM vision models
  if (modelLower.includes('minicpm') && (modelLower.includes('v') || modelLower.includes('vision'))) {
    detectedKeywords.push('minicpm-vision');
    confidence += 35;
    modelType = 'vision';
  }

  // Phi vision models
  if (modelLower.includes('phi') && (modelLower.includes('vision') || modelLower.includes('v'))) {
    detectedKeywords.push('phi-vision');
    confidence += 30;
    modelType = 'vision';
  }

  // Additional pattern matching for vision models
  if (modelLower.includes('3.2') && (modelLower.includes('11b') || modelLower.includes('90b'))) {
    detectedKeywords.push('llama-3.2-vision');
    confidence += 30;
    modelType = 'vision';
  }

  // Gemma vision models
  if (modelLower.includes('gemma') && modelLower.includes('vision')) {
    detectedKeywords.push('gemma-vision');
    confidence += 30;
    modelType = 'vision';
  }

  if (modelLower.includes('instruct') && detectedKeywords.length > 0) {
    detectedKeywords.push('instruct-vision');
    confidence += 10;
  }

  // Provider-specific adjustments
  if (provider === 'lm-studio') {
    // LM Studio models often have detailed names with vision indicators
    if (modelLower.includes('mmproj') || modelLower.includes('mm')) {
      detectedKeywords.push('mmproj');
      confidence += 20;
      modelType = 'vision';
    }

    // Additional LM Studio specific patterns
    if (modelLower.includes('-vl') || modelLower.includes('_vl') || modelLower.includes('vl-')) {
      detectedKeywords.push('vl-separator');
      confidence += 30;
      modelType = 'vision';
    }
  }

  // Special case: models ending with vision indicators
  if (modelLower.endsWith('-vl') || modelLower.endsWith('-v') || modelLower.endsWith('-vision')) {
    detectedKeywords.push('vision-suffix');
    confidence += 25;
    modelType = 'vision';
  }

  // Determine final vision capability
  const hasVision = confidence >= 25 || isKnownVisionModel; // Lowered threshold for better detection

  if (hasVision && modelType === 'text') {
    modelType = 'vision';
  }

  return {
    hasVision,
    confidence: Math.min(confidence, 100),
    detectedKeywords,
    modelType,
    isKnownVisionModel
  };
}

// LM Studio model information fetching
async function getLMStudioModelInfo(lmStudioUrl: string): Promise<{
  available: boolean;
  models: any[];
  visionModels: any[];
  error?: string;
}> {
  try {
    const response = await fetch(`${lmStudioUrl}/v1/models`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });

    if (!response.ok) {
      throw new Error(`LM Studio API responded with ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const models = data.data || [];

    // Identify vision models
    const visionModels = models.filter(model => {
      const visionInfo = detectVisionCapabilities(model.id, 'lm-studio');
      return visionInfo.hasVision;
    });

    console.log(`LM Studio: Found ${models.length} total models, ${visionModels.length} vision models`);

    if (visionModels.length > 0) {
      console.log('Available vision models:', visionModels.map(m => m.id));
    }

    return {
      available: true,
      models,
      visionModels
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.warn('Failed to fetch LM Studio models:', errorMessage);
    return {
      available: false,
      models: [],
      visionModels: [],
      error: errorMessage
    };
  }
}

async function getSettings() {
  try {
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/settings`);
    const data = await response.json();
    if (data.success) {
      currentSettings = { ...currentSettings, ...data.settings };
    }
  } catch (error) {
    console.warn('Failed to load settings, using defaults:', error);
  }
  return currentSettings;
}

async function callLMStudio(messages: any[], modelId: string): Promise<{
  content: string;
  model: string;
  usage?: any;
  provider: string;
  debugInfo?: any;
}> {
  const startTime = Date.now();
  const debugInfo = {
    url: currentSettings.lmStudio.url,
    modelId,
    messagesCount: messages.length,
    hasImageContent: false,
    requestSize: 0,
    responseTime: 0,
    statusCode: null,
    errorMessage: null
  };

  try {
    // Check for image content in messages
    debugInfo.hasImageContent = messages.some(msg =>
      Array.isArray(msg.content) && msg.content.some((part: any) => part.type === 'image_url')
    );

    const requestBody = {
      model: modelId,
      messages: messages,
      temperature: 0.7,
      max_tokens: debugInfo.hasImageContent ? 1200 : 800, // More tokens for image analysis
      stream: false
    };

    debugInfo.requestSize = JSON.stringify(requestBody).length;

    console.log(`LM Studio Request:`, {
      model: modelId,
      hasImage: debugInfo.hasImageContent,
      messagesCount: debugInfo.messagesCount,
      requestSize: `${Math.round(debugInfo.requestSize / 1024)}KB`
    });

    const response = await fetch(`${currentSettings.lmStudio.url}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(currentSettings.lmStudio.apiKey && { 'Authorization': `Bearer ${currentSettings.lmStudio.apiKey}` })
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(60000) // 60 second timeout
    });

    debugInfo.responseTime = Date.now() - startTime;
    debugInfo.statusCode = response.status;

    if (!response.ok) {
      const errorText = await response.text();
      debugInfo.errorMessage = errorText;

      // Specific error handling for common issues
      if (response.status === 413) {
        throw new Error(`LM Studio: Request payload too large. Try reducing image size or using a smaller image (${Math.round(debugInfo.requestSize / 1024)}KB sent)`);
      } else if (response.status === 400) {
        if (errorText.includes('image') || errorText.includes('vision')) {
          throw new Error(`LM Studio: Model does not support images or image format is invalid. Error: ${errorText}`);
        } else {
          throw new Error(`LM Studio: Invalid request format. Error: ${errorText}`);
        }
      } else if (response.status === 404) {
        throw new Error(`LM Studio: Model "${modelId}" not found. Available models can be checked at ${currentSettings.lmStudio.url}/v1/models`);
      } else if (response.status === 429) {
        throw new Error(`LM Studio: Model is busy or rate limited. Please try again in a moment.`);
      } else if (response.status >= 500) {
        throw new Error(`LM Studio server error (${response.status}): The model may have crashed or be out of memory. Try restarting LM Studio or using a smaller model.`);
      } else {
        throw new Error(`LM Studio error (${response.status}): ${response.statusText} - ${errorText}`);
      }
    }

    const result = await response.json();

    // Validate response structure
    if (!result.choices || !result.choices[0] || !result.choices[0].message) {
      throw new Error('LM Studio returned invalid response structure');
    }

    const content = result.choices[0].message.content;
    if (!content) {
      throw new Error('LM Studio returned empty content');
    }

    console.log(`LM Studio Success:`, {
      model: result.model || modelId,
      responseTime: `${debugInfo.responseTime}ms`,
      tokens: result.usage?.total_tokens || 'unknown',
      hasImage: debugInfo.hasImageContent
    });

    return {
      content,
      model: result.model || modelId,
      usage: result.usage,
      provider: 'lm-studio',
      debugInfo
    };

  } catch (error) {
    debugInfo.responseTime = Date.now() - startTime;
    debugInfo.errorMessage = error instanceof Error ? error.message : 'Unknown error';

    console.error('LM Studio Error:', {
      model: modelId,
      error: debugInfo.errorMessage,
      responseTime: `${debugInfo.responseTime}ms`,
      hasImage: debugInfo.hasImageContent,
      requestSize: `${Math.round(debugInfo.requestSize / 1024)}KB`
    });

    throw new Error(`LM Studio communication failed: ${debugInfo.errorMessage}`);
  }
}

async function callOpenRouter(messages: any[], modelId: string) {
  try {
    if (!currentSettings.openRouter.apiKey) {
      throw new Error('OpenRouter API key not configured');
    }

    const response = await fetch(`${currentSettings.openRouter.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${currentSettings.openRouter.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXTAUTH_URL || 'http://localhost:3000',
        'X-Title': 'CannaAI Pro'
      },
      body: JSON.stringify({
        model: modelId,
        messages: messages,
        temperature: 0.7,
        max_tokens: 800
      })
    });

    if (!response.ok) {
      throw new Error(`OpenRouter error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    return {
      content: result.choices[0].message.content,
      model: result.model,
      usage: result.usage,
      provider: 'openrouter'
    };
  } catch (error) {
    throw new Error(`OpenRouter communication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let imageProcessingInfo = {
    originalSize: 0,
    processedSize: 0,
    format: '',
    validationErrors: [],
    wasProcessed: false,
    fallbackUsed: false
  };

  try {
    const body = await request.json();
    const { message, model, sensorData, image } = body;

    // Validate required fields
    if (!message) {
      return NextResponse.json(
        { error: 'Missing required field: message' },
        { status: 400 }
      );
    }

    // Load current settings
    const settings = await getSettings();
    const selectedProvider = model || settings.aiProvider;
    let selectedModel = '';
    let lmStudioModelInfo = null;

    // Get the appropriate model based on provider
    if (selectedProvider === 'lm-studio') {
      selectedModel = settings.lmStudio.model;
      // Get detailed model info for LM Studio
      lmStudioModelInfo = await getLMStudioModelInfo(settings.lmStudio.url);
    } else if (selectedProvider === 'openrouter') {
      selectedModel = settings.openRouter.model;
    } else if (selectedProvider === 'lm-studio-local') {
      // For local models, try to get from LM Studio running instance
      lmStudioModelInfo = await getLMStudioModelInfo(settings.lmStudio.url);
      if (lmStudioModelInfo.available && lmStudioModelInfo.models.length > 0) {
        // Prefer vision models if image is provided
        if (image && lmStudioModelInfo.visionModels.length > 0) {
          selectedModel = lmStudioModelInfo.visionModels[0].id;
          console.log('Auto-selected vision model:', selectedModel);
        } else {
          selectedModel = lmStudioModelInfo.models[0].id;
        }
      }
    }

    if (!selectedModel) {
      return NextResponse.json(
        {
          error: 'No model selected or available',
          debug: lmStudioModelInfo ? {
            lmStudioAvailable: lmStudioModelInfo.available,
            totalModels: lmStudioModelInfo.models.length,
            visionModels: lmStudioModelInfo.visionModels.length
          } : null
        },
        { status: 400 }
      );
    }

    // Enhanced vision capability detection
    const visionInfo = detectVisionCapabilities(selectedModel, selectedProvider);
    console.log('Vision detection:', {
      model: selectedModel,
      provider: selectedProvider,
      hasVision: visionInfo.hasVision,
      confidence: visionInfo.confidence,
      keywords: visionInfo.detectedKeywords,
      isKnownVisionModel: visionInfo.isKnownVisionModel
    });

    // Process and validate image if provided
    let processedImage = null;
    if (image) {
      try {
        console.log('Processing image for vision analysis...');

        // Validate image format
        const formatValidation = validateImageFormat(image);
        if (!formatValidation.isValid) {
          imageProcessingInfo.validationErrors.push(formatValidation.error!);
          throw new Error(formatValidation.error);
        }

        // Validate image size
        const sizeValidation = validateImageSize(image);
        if (!sizeValidation.isValid) {
          imageProcessingInfo.validationErrors.push(sizeValidation.error!);
          throw new Error(sizeValidation.error);
        }

        // Normalize image data URL
        const normalized = normalizeImageDataUrl(image);
        processedImage = normalized.normalized;
        imageProcessingInfo.originalSize = image.length;
        imageProcessingInfo.processedSize = normalized.sizeBytes;
        imageProcessingInfo.format = normalized.mimeType;
        imageProcessingInfo.wasProcessed = true;

        console.log('Image processed successfully:', {
          format: normalized.mimeType,
          size: `${Math.round(normalized.sizeBytes / 1024)}KB`,
          visionModel: visionInfo.hasVision
        });

      } catch (error) {
        console.error('Image processing failed:', error);
        imageProcessingInfo.validationErrors.push(error instanceof Error ? error.message : 'Unknown processing error');

        // Fallback: try to use the image without processing if it was originally a valid data URL
        if (image.startsWith('data:image/')) {
          console.warn('Using original image without processing as fallback');
          processedImage = image;
          imageProcessingInfo.fallbackUsed = true;
        } else {
          processedImage = null;
        }
      }
    }

    // Create context-aware prompt with sensor data
    let contextPrompt = `You are CultivAI Assistant, an expert cannabis cultivation AI. You provide helpful, accurate advice about plant care, nutrients, environmental conditions, and troubleshooting.

Current environmental conditions:
- Temperature: ${sensorData?.temperature ? Math.round((sensorData.temperature * 9/5) + 32) : 'N/A'}°F (${sensorData?.temperature || 'N/A'}°C)
- Humidity: ${sensorData?.humidity || 'N/A'}%
- pH Level: ${sensorData?.ph || 'N/A'}
- Soil Moisture: ${sensorData?.soilMoisture || 'N/A'}%
- Light Intensity: ${sensorData?.lightIntensity || 'N/A'} μmol
- EC Level: ${sensorData?.ec || 'N/A'} mS/cm

User question: ${message}

Please provide a helpful, concise response. If the user asks about specific readings, reference the current sensor data. Use Fahrenheit for temperature measurements in your response. Keep responses under 200 words and focus on actionable advice.`;

    // Create message array for the AI model
    let messages = [
      {
        role: 'system',
        content: 'You are a helpful cannabis cultivation assistant. Provide accurate, practical advice based on the current sensor data and user questions.'
      }
    ];

    // Add image to messages if available and model supports vision
    if (processedImage && visionInfo.hasVision) {
      try {
        messages.push({
          role: 'user',
          content: [
            {
              type: 'text',
              text: contextPrompt
            },
            {
              type: 'image_url',
              image_url: {
                url: processedImage,
                detail: 'high' // Request high detail analysis
              }
            }
          ]
        });
        console.log('Image included in message for vision analysis');
      } catch (error) {
        console.error('Failed to create vision message:', error);
        // Fallback to text-only
        messages.push({
          role: 'user',
          content: contextPrompt
        });
        imageProcessingInfo.fallbackUsed = true;
      }
    } else {
      // Text-only message
      messages.push({
        role: 'user',
        content: contextPrompt
      });

      // If image was provided but can't be used, explain why
      if (processedImage && !visionInfo.hasVision) {
        messages.push({
          role: 'user',
          content: `\n\nNote: An image was provided but the selected AI model "${selectedModel}" does not appear to support vision capabilities (confidence: ${visionInfo.confidence}%). The analysis will be based on the text description and sensor data only. Consider switching to a vision-capable model like LLaVA or a multimodal model.`
        });
      } else if (image && !processedImage) {
        messages.push({
          role: 'user',
          content: `\n\nNote: An image was provided but could not be processed due to validation errors: ${imageProcessingInfo.validationErrors.join(', ')}. The analysis will be based on the text description and sensor data only.`
        });
      }
    }

    let response;
    let lastError = null;

    // Try the primary provider first
    try {
      if (selectedProvider === 'lm-studio' || selectedProvider === 'lm-studio-local') {
        response = await callLMStudio(messages, selectedModel);
      } else if (selectedProvider === 'openrouter') {
        response = await callOpenRouter(messages, selectedModel);
      } else {
        throw new Error(`Unknown provider: ${selectedProvider}`);
      }
    } catch (error) {
      lastError = error;
      console.warn(`Primary provider ${selectedProvider} failed, attempting fallback:`, error);

      // Fallback strategies
      if (processedImage && visionInfo.hasVision) {
        // If vision request failed, try without image
        console.log('Attempting fallback: text-only request after vision failure');
        const textOnlyMessages = [
          messages[0], // System message
          {
            role: 'user',
            content: contextPrompt + '\n\nNote: An image was provided but the vision model failed to process it. Please provide general advice based on the description and sensor data.'
          }
        ];

        try {
          if (selectedProvider === 'lm-studio' || selectedProvider === 'lm-studio-local') {
            response = await callLMStudio(textOnlyMessages, selectedModel);
          } else if (selectedProvider === 'openrouter') {
            response = await callOpenRouter(textOnlyMessages, selectedModel);
          }
          imageProcessingInfo.fallbackUsed = true;
        } catch (fallbackError) {
          console.warn('Text-only fallback also failed:', fallbackError);
          lastError = fallbackError;
        }
      }

      // No Z-AI fallback; if still no response, bubble the last error
    }

    if (!response) {
      throw new Error(`All AI providers failed. Last error: ${lastError instanceof Error ? lastError.message : 'Unknown error'}`);
    }

    const totalTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      response: response.content,
      model: response.model,
      provider: response.provider,
      usage: response.usage,
      timestamp: new Date().toISOString(),
      processingTime: `${totalTime}ms`,
      imageProcessing: imageProcessingInfo,
      visionInfo: visionInfo,
      debugInfo: response.debugInfo || null,
      fallbackUsed: response.fallbackUsed || false
    });

  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error('Chat API error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime: `${totalTime}ms`,
      imageProcessing: imageProcessingInfo
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString(),
        processingTime: `${totalTime}ms`,
        imageProcessing: imageProcessingInfo
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const settings = await getSettings();

    // Get detailed LM Studio model information
    const lmStudioInfo = await getLMStudioModelInfo(settings.lmStudio.url);

    // Analyze current model vision capabilities
    let currentModelVisionInfo = null;
    if (settings.lmStudio.model) {
      currentModelVisionInfo = detectVisionCapabilities(settings.lmStudio.model, 'lm-studio');
    }

    return NextResponse.json({
      success: true,
      currentProvider: settings.aiProvider,
      availableProviders: ['lm-studio', 'lm-studio-local', 'openrouter'],
      settings: {
        lmStudio: {
          url: settings.lmStudio.url,
          model: settings.lmStudio.model,
          hasApiKey: !!settings.lmStudio.apiKey,
          visionInfo: currentModelVisionInfo
        },
        openRouter: {
          baseUrl: settings.openRouter.baseUrl,
          model: settings.openRouter.model,
          hasApiKey: !!settings.openRouter.apiKey
        }
      },
      lmStudioDetails: {
        available: lmStudioInfo.available,
        totalModels: lmStudioInfo.models.length,
        visionModels: lmStudioInfo.visionModels.length,
        allModels: lmStudioInfo.models.map(model => ({
          id: model.id,
          hasVision: detectVisionCapabilities(model.id, 'lm-studio').hasVision,
          visionConfidence: detectVisionCapabilities(model.id, 'lm-studio').confidence
        })),
        visionModelsList: lmStudioInfo.visionModels.map(model => ({
          id: model.id,
          visionInfo: detectVisionCapabilities(model.id, 'lm-studio')
        })),
        error: lmStudioInfo.error
      },
      supportedImageFormats: SUPPORTED_IMAGE_FORMATS,
      maxImageSize: `${Math.round(MAX_IMAGE_SIZE / 1024 / 1024)}MB`,
      knownVisionModels: LM_STUDIO_VISION_MODELS
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get settings',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}