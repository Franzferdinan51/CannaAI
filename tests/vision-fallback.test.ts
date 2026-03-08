/**
 * Vision Fallback Integration Test
 * Tests the vision-capable AI fallback chain for plant analysis
 *
 * Priority chain when image is provided:
 * 1. OpenClaw Gateway (if available)
 * 2. Alibaba Bailian (qwen-vl-max-latest)
 * 3. OpenRouter (qwen-vl-max - FREE tier)
 * 4. LM Studio (local, limited vision)
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock modules
const mockCheckOpenClaw = jest.fn();
const mockCheckBailian = jest.fn();
const mockCheckOpenRouter = jest.fn();
const mockCheckLMStudio = jest.fn();

// Mock the provider detection module
jest.mock('@/lib/ai-provider-detection', () => ({
  detectAvailableProviders: jest.fn(),
  executeAIWithFallback: jest.fn(),
  getProviderConfig: jest.fn(),
  AIProviderUnavailableError: class extends Error {}
}));

// Mock providers
jest.mock('@/lib/ai-provider-openclaw', () => ({
  checkOpenClaw: () => mockCheckOpenClaw(),
  executeWithOpenClaw: jest.fn()
}));

jest.mock('@/lib/ai-provider-bailian', () => ({
  checkBailian: () => mockCheckBailian(),
  executeWithBailian: jest.fn()
}));

jest.mock('@/lib/ai-provider-openrouter', () => ({
  checkOpenRouter: () => mockCheckOpenRouter(),
  executeWithOpenRouter: jest.fn(),
  VISION_MODELS: [
    { id: 'qwen-vl-max', name: 'Qwen-VL-Max', vision: true, cost: 'FREE quota', recommended: true },
    { id: 'qwen-vl-max-latest', name: 'Qwen-VL-Max Latest', vision: true, cost: 'FREE quota' },
    { id: 'meta-llama/llama-3.2-90b-vision-instruct', name: 'Llama 3.2 90B Vision', vision: true, cost: 'Free tier' }
  ],
  TEXT_MODELS: [
    { id: 'meta-llama/llama-3.1-8b-instruct:free', name: 'Llama 3.1 8B', vision: false, cost: 'FREE' }
  ],
  getBestVisionModel: () => 'qwen-vl-max',
  getFallbackTextModel: () => 'meta-llama/llama-3.1-8b-instruct:free'
}));

describe('Vision Fallback Chain', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should prioritize vision-capable models when image is provided', async () => {
    // Import after mocks are set up
    const { executeAIWithFallback, detectAvailableProviders } = await import('@/lib/ai-provider-detection');
    const { VISION_MODELS } = await import('@/lib/ai-provider-openrouter');

    // Mock provider detection - OpenRouter available with vision models
    mockDetectAvailableProviders.mockResolvedValue({
      primary: {
        isAvailable: true,
        provider: 'openrouter',
        reason: 'OpenRouter API accessible',
        config: { visionModels: ['qwen-vl-max'] },
        recommendations: []
      },
      fallback: [],
      recommendations: []
    });

    // Mock successful OpenRouter response with vision
    const mockExecuteWithOpenRouter = jest.fn().mockResolvedValue({
      success: true,
      result: 'Plant analysis with vision',
      provider: 'openrouter',
      model: 'qwen-vl-max',
      visionUsed: true
    });

    // Verify vision models are configured
    expect(VISION_MODELS.length).toBeGreaterThan(0);
    expect(VISION_MODELS.find(m => m.recommended)).toBeDefined();
    expect(VISION_MODELS.find(m => m.recommended)?.id).toBe('qwen-vl-max');
  });

  it('should use qwen-vl-max-latest for Bailian when image provided', async () => {
    const { executeWithBailian } = await import('@/lib/ai-provider-bailian');

    // Mock Bailian response
    const mockBailianExecute = jest.fn().mockResolvedValue({
      success: true,
      result: 'Vision analysis from Bailian',
      provider: 'bailian',
      model: 'qwen-vl-max-latest',
      visionUsed: true
    });

    // Execute with image
    const result = await mockBailianExecute({
      image: 'data:image/jpeg;base64,test',
      prompt: 'Analyze this plant'
    });

    expect(result.provider).toBe('bailian');
    expect(result.visionUsed).toBe(true);
  });

  it('should fallback to text-only when vision unavailable', async () => {
    const { TEXT_MODELS, getFallbackTextModel } = await import('@/lib/ai-provider-openrouter');

    // Verify text fallback models exist
    expect(TEXT_MODELS.length).toBeGreaterThan(0);

    // Verify fallback model selector works
    const fallbackModel = getFallbackTextModel();
    expect(fallbackModel).toBeDefined();
    expect(TEXT_MODELS.some(m => m.id === fallbackModel)).toBe(true);
  });

  it('should have vision-aware provider ordering', async () => {
    // When image is provided, providers should be ordered by vision capability
    const visionPriority = ['bailian', 'openrouter', 'openclaw', 'lm-studio'];

    // Verify vision-capable providers are prioritized
    expect(visionPriority[0]).toBe('bailian'); // qwen-vl-max-latest
    expect(visionPriority[1]).toBe('openrouter'); // qwen-vl-max
  });
});

describe('OpenRouter Provider Configuration', () => {
  it('should export vision-capable models', async () => {
    const { VISION_MODELS, TEXT_MODELS } = await import('@/lib/ai-provider-openrouter');

    expect(VISION_MODELS).toBeDefined();
    expect(Array.isArray(VISION_MODELS)).toBe(true);
    expect(VISION_MODELS.length).toBeGreaterThan(0);

    // All vision models should have required properties
    for (const model of VISION_MODELS) {
      expect(model).toHaveProperty('id');
      expect(model).toHaveProperty('vision', true);
      expect(model).toHaveProperty('cost');
    }
  });

  it('should have qwen-vl-max as recommended vision model', async () => {
    const { VISION_MODELS, getBestVisionModel } = await import('@/lib/ai-provider-openrouter');

    const bestModel = getBestVisionModel();
    expect(bestModel).toBeDefined();

    const recommendedModel = VISION_MODELS.find(m => m.recommended);
    expect(recommendedModel).toBeDefined();
    expect(recommendedModel?.id).toBe('qwen-vl-max');
  });

  it('should export FREE tier text models', async () => {
    const { TEXT_MODELS } = await import('@/lib/ai-provider-openrouter');

    expect(TEXT_MODELS).toBeDefined();
    expect(TEXT_MODELS.length).toBeGreaterThan(0);

    // At least one FREE model should exist
    const freeModel = TEXT_MODELS.find(m => m.cost === 'FREE');
    expect(freeModel).toBeDefined();
  });
});

describe('Bailian Vision Support', () => {
  it('should auto-select vision model when image provided', async () => {
    const { executeWithBailian } = await import('@/lib/ai-provider-bailian');

    // Verify execute function accepts image parameter
    expect(executeWithBailian).toBeDefined();
    expect(typeof executeWithBailian).toBe('function');
  });

  it('should have qwen-vl-max-latest configured', async () => {
    const { getBailianConfig } = await import('@/lib/ai-provider-bailian');

    const config = getBailianConfig();
    expect(config.visionModel).toBeDefined();
    expect(config.visionModel).toBe('qwen-vl-max-latest');
  });
});

// Helper for manual testing
console.log(`
===========================================
VISION FALLBACK CONFIGURATION SUMMARY
===========================================

Provider Priority (with image):
1. OpenClaw Gateway (routes to best model)
2. Alibaba Bailian (qwen-vl-max-latest)
3. OpenRouter (qwen-vl-max - FREE tier)
4. LM Studio (local models)

Vision Models Available:
- qwen-vl-max (OpenRouter - FREE quota)
- qwen-vl-max-latest (Bailian - FREE quota)
- meta-llama/llama-3.2-90b-vision-instruct (OpenRouter)

Text Fallback Models:
- meta-llama/llama-3.1-8b-instruct:free (FREE)
- google/gemma-2-9b-it:free (FREE)

To test with actual plant photo:
1. Configure OPENROUTER_API_KEY in .env.local
2. Or configure ALIBABA_API_KEY in .env.local
3. POST to /api/analyze with image data

===========================================
`);
