const mockDetectAvailableProviders = jest.fn();
const mockExecuteAIWithFallback = jest.fn();
const mockExecuteWithOpenClaw = jest.fn();
const mockExecuteWithBailian = jest.fn();
const mockProcessImageForVisionModel = jest.fn();
const mockSharpMetadata = jest.fn();
const mockSharp = jest.fn(() => ({
  metadata: mockSharpMetadata
}));
const mockPrisma = {
  plantAnalysis: {
    create: jest.fn()
  }
};

jest.mock('next/server', () => {
  class MockNextResponse {
    status: number;
    headers: Headers;
    private readonly payload: string;

    constructor(payload: string, init: ResponseInit = {}) {
      this.payload = payload;
      this.status = init.status ?? 200;
      this.headers = new Headers(init.headers);
      if (!this.headers.has('content-type')) {
        this.headers.set('content-type', 'application/json');
      }
    }

    static json(data: unknown, init: ResponseInit = {}) {
      return new MockNextResponse(JSON.stringify(data), init);
    }

    async json() {
      return JSON.parse(this.payload);
    }

    async text() {
      return this.payload;
    }
  }

  return {
    NextRequest: class MockNextRequest {},
    NextResponse: MockNextResponse
  };
});

jest.mock('sharp', () => ({
  __esModule: true,
  default: mockSharp
}));

jest.mock('@/lib/prisma', () => ({
  prisma: mockPrisma
}));

jest.mock('@/lib/image', () => {
  const actual = jest.requireActual('@/lib/image');
  return {
    ...actual,
    processImageForVisionModel: mockProcessImageForVisionModel
  };
});

jest.mock('@/lib/ai-provider-detection', () => {
  const actual = jest.requireActual('@/lib/ai-provider-detection');
  return {
    ...actual,
    detectAvailableProviders: mockDetectAvailableProviders,
    executeAIWithFallback: mockExecuteAIWithFallback,
    getProviderConfig: jest.fn()
  };
});

jest.mock('@/lib/ai-provider-openclaw', () => ({
  executeWithOpenClaw: mockExecuteWithOpenClaw
}));

jest.mock('@/lib/ai-provider-bailian', () => ({
  executeWithBailian: mockExecuteWithBailian
}));

import { POST } from '@/app/api/analyze/route';
import { getExplainabilityFailures } from '../utils/explainability-contract';

function createAnalyzeRequest(body: Record<string, unknown>, ipSuffix: number) {
  return {
    headers: new Headers({ 'content-type': 'application/json' }),
    ip: `10.0.0.${ipSuffix}`,
    json: async () => body
  } as any;
}

function createProviderDetection(provider: string = 'openrouter') {
  return {
    primary: {
      isAvailable: true,
      provider,
      reason: `${provider} available for tests`,
      config: {},
      recommendations: []
    },
    fallback: [],
    recommendations: []
  } as any;
}

function buildStructuredAnalysis(overrides: Record<string, unknown> = {}) {
  return {
    diagnosis: 'Heat stress with early nitrogen deficiency',
    summary: 'The canopy is showing mild heat stress with early lower-canopy nitrogen hunger.',
    confidence: 88,
    severity: 'moderate',
    urgency: 'medium',
    symptomsMatched: [
      'Upper leaves are canoeing under lights-on conditions',
      'Lower leaves are paling before full yellowing'
    ],
    causes: [
      'Canopy temperature is running above the ideal vegetative range',
      'Nitrogen feed is slightly behind current vegetative demand'
    ],
    treatment: [
      'Raise the light slightly or reduce intensity by 5-10 percent',
      'Increase nitrogen slightly on the next irrigation'
    ],
    healthScore: 68,
    healthScoreBreakdown: {
      vigor: {
        score: 72,
        rationale: 'Growth remains active, but canopy stress is reducing peak vigor.'
      },
      leafCondition: {
        score: 61,
        rationale: 'Leaf tacoing and lower-leaf paling indicate active stress.'
      },
      pestFree: {
        score: 92,
        rationale: 'No pest evidence is described in the symptoms or notes.'
      },
      environmentOptimal: {
        score: 58,
        rationale: 'Temperature and humidity are trending outside the preferred vegetative band.'
      },
      growthStageAppropriate: {
        score: 74,
        rationale: 'Plant structure fits vegetative growth, but stress is slowing ideal performance.'
      },
      rootHealth: {
        score: 69,
        rationale: 'No direct root observations were provided, so the score remains cautious.'
      }
    },
    likelyCauses: [
      {
        cause: 'Canopy heat stress',
        confidence: 86,
        evidence: 'Leaf tacoing and elevated canopy temperatures were reported during lights-on.'
      },
      {
        cause: 'Early nitrogen deficiency',
        confidence: 71,
        evidence: 'Lower leaves are paling while new growth remains more intact.'
      }
    ],
    evidenceObservations: [
      'Leaf edges are curling upward near the top of the canopy',
      'Lower fan leaves are losing deep green color first',
      'Environment data shows warm and humid lights-on conditions'
    ],
    uncertainties: [
      'No runoff EC or root-zone pH data was provided',
      'A direct image was not supplied for visual confirmation'
    ],
    recommendations: {
      immediate: [
        'Reduce canopy heat load before the next full lights-on cycle',
        'Improve air movement across the upper canopy'
      ],
      shortTerm: [
        'Increase vegetative nitrogen slightly for the next 2 feedings',
        'Re-check canopy temperature after the light adjustment'
      ],
      longTerm: [
        'Tune AC Infinity automation triggers for tighter vapor pressure control',
        'Capture daily environment snapshots to catch drift earlier'
      ]
    },
    ...overrides
  };
}

describe('/api/analyze integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = 'test';
    process.env.BUILD_MODE = 'server';
    process.env.OPENCLAW_MODEL = 'qwen3.5-plus';

    mockSharp.mockImplementation(() => ({
      metadata: mockSharpMetadata
    }));
    mockSharpMetadata.mockResolvedValue({
      width: 3024,
      height: 4032,
      format: 'jpeg'
    });
    mockDetectAvailableProviders.mockResolvedValue(createProviderDetection('openrouter'));
    mockExecuteAIWithFallback.mockResolvedValue({
      provider: 'openrouter',
      result: buildStructuredAnalysis()
    });
    mockExecuteWithOpenClaw.mockResolvedValue({
      success: true,
      provider: 'openclaw',
      result: buildStructuredAnalysis()
    });
    mockExecuteWithBailian.mockResolvedValue({
      success: true,
      provider: 'bailian',
      result: buildStructuredAnalysis()
    });
    mockProcessImageForVisionModel.mockResolvedValue({
      data: Buffer.from('processed-image'),
      metadata: {
        width: 1200,
        height: 900,
        format: 'jpeg'
      },
      base64: 'processed-image-base64',
      dataUrl: 'data:image/jpeg;base64,cHJvY2Vzc2VkLWltYWdl',
      originalSize: 4096,
      compressedSize: 1536,
      compressionRatio: 0.625
    });
  });

  test('accepts text-only analysis requests that include AC Infinity environment data', async () => {
    const request = createAnalyzeRequest(
      {
        strain: 'Blue Dream',
        leafSymptoms: 'Upper leaves are tacoing and lower leaves are starting to pale.',
        temperature: 82.4,
        humidity: 67,
        growthStage: 'vegetative',
        additionalNotes: [
          'AC Infinity Controller 69 Pro snapshot',
          'Lights-on temp: 82.4F',
          'Humidity: 67%',
          'VPD: 1.61 kPa',
          'CO2: 930 ppm',
          'Exhaust fan held at level 4 overnight'
        ].join('\n')
      },
      1
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.imageInfo).toBeNull();
    expect(data.provider.used).toBe('openrouter');
    expect(data.analysis.imageAnalysis.hasImage).toBe(false);
    expect(mockExecuteAIWithFallback).toHaveBeenCalledTimes(1);
    expect(mockExecuteAIWithFallback.mock.calls[0][0]).toContain('AC Infinity Controller 69 Pro snapshot');
    expect(mockExecuteAIWithFallback.mock.calls[0][0]).toContain('TEXT-BASED ANALYSIS ONLY - No image provided');
    expect(mockPrisma.plantAnalysis.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          request: expect.objectContaining({
            additionalNotes: expect.stringContaining('AC Infinity Controller 69 Pro snapshot')
          })
        })
      })
    );
  });

  test('supports combined image and text analysis requests', async () => {
    mockDetectAvailableProviders.mockResolvedValue(createProviderDetection('openclaw'));
    mockExecuteWithOpenClaw.mockResolvedValue({
      success: true,
      provider: 'openclaw',
      result: buildStructuredAnalysis({
        diagnosis: 'Powdery mildew risk with humidity-driven stress',
        severity: 'high',
        urgency: 'high',
        imageAnalysis: {
          hasImage: true,
          visualFindings: [
            'White speckling is visible on upper leaf surfaces',
            'Leaf posture suggests humidity-related stress'
          ]
        },
        diseasesDetected: [
          {
            name: 'Powdery Mildew',
            severity: 'high',
            confidence: 89,
            symptoms: ['White speckling on fan leaves']
          }
        ]
      })
    });

    const response = await POST(
      createAnalyzeRequest(
        {
          strain: 'Wedding Cake',
          leafSymptoms: 'White flecks are appearing on upper fan leaves and humidity has stayed elevated.',
          humidity: 71,
          growthStage: 'flowering',
          plantImage: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
        },
        2
      )
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.provider.used).toBe('openclaw');
    expect(data.imageInfo).toEqual(
      expect.objectContaining({
        originalSize: 4096,
        compressedSize: 1536,
        dimensions: '1200x900',
        originalDimensions: '3024x4032'
      })
    );
    expect(data.analysis.imageAnalysis.hasImage).toBe(true);
    expect(data.analysis.imageAnalysis.visualFindings).toEqual(
      expect.arrayContaining(['White speckling is visible on upper leaf surfaces'])
    );
    expect(mockProcessImageForVisionModel).toHaveBeenCalledTimes(1);
    expect(mockExecuteWithOpenClaw).toHaveBeenCalledWith(
      expect.objectContaining({
        image: 'processed-image-base64',
        prompt: expect.stringContaining('IMAGE ANALYSIS: High-resolution visual examination of plant provided')
      })
    );
  });

  test('returns explainability fields for successful analyses', async () => {
    mockExecuteAIWithFallback.mockResolvedValue({
      provider: 'openrouter',
      result: `\`\`\`json
{
  "diagnosis": "Nitrogen Deficiency",
  "confidence": 91,
  "severity": "moderate",
  "healthScore": 64,
  "urgency": "high",
  "symptomsMatched": [
    "Lower fan leaves yellowing from the petiole outward",
    "Overall pale canopy tone"
  ],
  "causes": [
    "Insufficient nitrogen in feed schedule",
    "Late-veg demand outpacing available nitrogen"
  ],
  "treatment": [
    "Increase vegetative nitrogen feed to 180 ppm over the next two irrigations",
    "Check runoff EC before the next feeding"
  ],
  "imageAnalysis": {
    "hasImage": false,
    "visualFindings": [
      "Text-only assessment requested by the grower"
    ]
  }
}
\`\`\``
    });

    const response = await POST(
      createAnalyzeRequest(
        {
          strain: 'Blue Dream',
          leafSymptoms: 'Bottom leaves are yellowing and growth has slowed.',
          phLevel: 6.1,
          growthStage: 'vegetative'
        },
        3
      )
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.analysis.urgencyReasons).toEqual(expect.any(Array));
    expect(data.analysis.healthScoreBreakdown).toEqual(expect.any(Array));
    expect(data.analysis.detectedIssues).toEqual(expect.any(Array));
    expect(data.analysis.prioritizedActionPlan).toEqual(
      expect.objectContaining({
        immediate: expect.any(Array),
        within24Hours: expect.any(Array),
        within7Days: expect.any(Array)
      })
    );
    expect(getExplainabilityFailures(data.analysis)).toEqual([]);
  });

  test('returns a 503 setup response when no AI provider is available', async () => {
    mockDetectAvailableProviders.mockResolvedValue({
      primary: {
        isAvailable: false,
        provider: 'fallback',
        reason: 'No AI provider configured',
        config: {},
        recommendations: ['Configure OpenRouter']
      },
      fallback: [],
      recommendations: ['Configure OpenRouter']
    });

    const response = await POST(
      createAnalyzeRequest(
        {
          strain: 'Sour Diesel',
          leafSymptoms: 'Leaves are drooping and clawing slightly.'
        },
        4
      )
    );
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.success).toBe(false);
    expect(data.error).toEqual(
      expect.objectContaining({
        type: 'ai_provider_unavailable',
        message: 'AI Provider Required',
        setupRequired: true
      })
    );
    expect(data.setupGuide).toEqual(
      expect.objectContaining({
        title: 'Configure AI Provider'
      })
    );
    expect(mockExecuteAIWithFallback).not.toHaveBeenCalled();
    expect(mockExecuteWithOpenClaw).not.toHaveBeenCalled();
  });
});
