/**
 * Test Utilities and Fixtures for Photo Analysis Testing
 */

import { PrismaClient } from '@prisma/client';
import { Buffer } from 'buffer';

// Create a singleton Prisma client for tests
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const testPrisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['error', 'warn']
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = testPrisma;

// Mock AI Provider Responses
export const mockAIResponses = {
  // Plant analysis response
  plantAnalysis: {
    diagnosis: 'Nitrogen Deficiency Detected',
    scientificName: 'Nitrogen deficiency (N)',
    confidence: 92,
    severity: 'moderate',
    symptomsMatched: [
      'Bottom-up yellowing',
      'Pale leaves',
      'Stunted growth'
    ],
    causes: [
      'Insufficient nitrogen in growing medium',
      'pH lockout preventing nitrogen uptake',
      'Inadequate fertilization schedule'
    ],
    treatment: [
      'Apply nitrogen-rich fertilizer: 1-2ml/L of high-N liquid fertilizer (20-5-5) for 2-3 waterings',
      'Flush soil with pH 6.0-6.5 water if pH is outside optimal range',
      'Increase feeding frequency to every 3-4 days during treatment'
    ],
    healthScore: 65,
    strainSpecificAdvice: 'This indica-dominant strain is particularly sensitive to nitrogen fluctuations. Monitor closely during treatment.',
    reasoning: [
      {
        step: 'Visual symptom analysis',
        explanation: 'Bottom-up yellowing pattern is classic nitrogen deficiency',
        weight: 90,
        evidence: 'Observable symptoms match scientific literature'
      }
    ],
    isPurpleStrain: false,
    purpleAnalysis: {
      isGenetic: false,
      isDeficiency: false,
      analysis: 'No purple coloration detected',
      anthocyaninLevel: 'low',
      recommendedActions: ['Continue normal monitoring']
    },
    pestsDetected: [],
    diseasesDetected: [],
    nutrientDeficiencies: [
      {
        nutrient: 'Nitrogen (N)',
        classification: 'macro',
        severity: 'moderate',
        confidence: 92,
        currentLevel: 'Low',
        optimalLevel: '150-200ppm during veg',
        deficiencyPattern: 'Bottom-up chlorosis',
        affectedPlantParts: ['Lower leaves', 'Older fan leaves'],
        treatment: {
          supplement: 'High-N fertilizer (20-5-5)',
          dosage: '1-2ml/L',
          applicationMethod: 'Soil drench',
          frequency: 'Every 3-4 days for 2 weeks',
          duration: 'Until symptoms improve',
          precautions: 'Do not over-fertilize to avoid burn'
        },
        relatedDeficiencies: [],
        lockoutRisk: false
      }
    ],
    nutrientToxicities: [],
    environmentalFactors: [
      {
        factor: 'pH Level',
        currentValue: '5.8',
        optimalRange: '6.0-7.0',
        severity: 'mild',
        correction: 'Adjust pH to 6.0-6.5 using pH Up solution',
        timeframe: 'Immediate',
        monitoringFrequency: 'Daily'
      }
    ],
    trichomeAnalysis: {
      isVisible: true,
      density: 'medium',
      maturity: {
        clear: 10,
        cloudy: 70,
        amber: 20
      },
      overallStage: 'mid',
      health: {
        intact: 95,
        degraded: 5,
        collapsed: 0
      },
      harvestReadiness: {
        ready: true,
        daysUntilOptimal: 0,
        recommendation: 'Optimal harvest window - harvest now',
        effects: 'Balanced cerebral and body effects'
      },
      confidence: 88
    },
    morphologicalAnalysis: {
      overallVigor: 65,
      growthPattern: 'slightly_stunted',
      symmetry: 'slightly_asymmetrical',
      leafDevelopment: {
        size: 'normal',
        color: 'pale',
        shape: 'normal',
        spots: false,
        lesions: false
      },
      stemHealth: {
        color: 'normal',
        strength: 'strong',
        signsOfStress: true,
        pestDamage: false
      }
    },
    visualChanges: {
      hasPreviousData: true,
      changeDetected: true,
      changeType: 'worsening',
      progressionRate: 'moderate',
      changes: [
        {
          parameter: 'Leaf color',
          previousState: 'Healthy green',
          currentState: 'Yellowing lower leaves',
          changeDescription: 'Progressive yellowing starting from bottom'
        }
      ],
      predictions: [
        'Yellowing will continue upward if not treated',
        'New growth may be affected within 1 week'
      ],
      urgencyAdjustment: 'increase'
    },
    urgency: 'high',
    priorityActions: [
      'Apply nitrogen fertilizer immediately',
      'Check and adjust pH to 6.0-6.5',
      'Monitor for pest presence',
      'Increase feeding frequency'
    ],
    preventativeMeasures: [
      'Establish regular feeding schedule with appropriate NPK ratios',
      'Monitor pH weekly',
      'Inspect plants daily for early symptom detection',
      'Maintain optimal environmental conditions'
    ],
    imageAnalysis: {
      hasImage: true,
      visualFindings: [
        'Yellowing on lower fan leaves',
        'No pest damage visible',
        'Overall plant color pale',
        'No signs of disease'
      ],
      overallConfidence: 92,
      imageQuality: {
        resolution: 'good',
        focus: 'sharp',
        lighting: 'optimal',
        magnification: 'appropriate'
      },
      factorsAffectingAnalysis: [],
      recommendationsForFuture: [
        'Ensure even lighting across canopy',
        'Take multiple angles for comprehensive analysis'
      ]
    },
    recommendations: {
      immediate: [
        'Apply 1-2ml/L high-N fertilizer today',
        'Check and adjust pH to 6.0-6.5',
        'Increase monitoring frequency to daily'
      ],
      shortTerm: [
        'Continue treatment for 2 weeks',
        'Monitor new growth for improvement',
        'Prepare follow-up analysis in 1 week'
      ],
      longTerm: [
        'Establish consistent feeding schedule',
        'Set up automated pH monitoring',
        'Create nutrient deficiency prevention protocol'
      ]
    },
    followUpSchedule: {
      checkAfterDays: 7,
      whatToMonitor: [
        'New leaf color and development',
        'Spread of yellowing',
        'pH levels'
      ],
      successIndicators: [
        'New growth returns to healthy green',
        'Yellowing stops progressing',
        'Overall plant vigor improves'
      ],
      escalationTriggers: [
        'Yellowing spreads to upper canopy',
        'Plant shows additional deficiency symptoms',
        'No improvement after 10 days of treatment'
      ]
    },
    researchReferences: [
      'Cannabis Nutrition Guide - University of Agricultural Sciences',
      'Plant Physiology Journal 2024 - Nitrogen Metabolism in Cannabis'
    ],
    prognosis: {
      expectedOutcome: 'Full recovery expected with proper treatment',
      timeframe: '7-14 days for visible improvement',
      factorsAffectingOutcome: [
        'Treatment compliance',
        'Environmental stability',
        'Plant genetics'
      ],
      fullRecoveryExpected: true
    },
    costEstimates: {
      treatmentCost: '$15-25 for nutrients and pH adjustment',
      preventiveSavings: '$50-100 by preventing crop loss'
    }
  },

  // Trichome analysis response
  trichomeAnalysis: {
    overallMaturity: {
      stage: 'cloudy',
      percentage: 75,
      confidence: 0.91,
      recommendation: 'Excellent cloudy trichome development - peak harvest window approaching'
    },
    trichomeDistribution: {
      clear: 15,
      cloudy: 70,
      amber: 15,
      density: 'heavy'
    },
    harvestReadiness: {
      ready: true,
      recommendation: 'Optimal harvest window - trichomes are at peak potency',
      estimatedHarvestTime: '0-3 days',
      peakDays: 2
    },
    detailedFindings: [
      {
        type: 'trichome',
        description: 'High density of healthy cloudy trichomes with good development',
        severity: 'low',
        confidence: 0.93,
        location: 'Flower surface and calyxes'
      },
      {
        type: 'trichome',
        description: 'Beginning amber development on 15% of trichomes',
        severity: 'low',
        confidence: 0.85,
        location: 'Upper canopy flowers'
      }
    ],
    metrics: {
      trichomeDensity: 185,
      averageTrichomeLength: 185,
      pistilHealth: 92
    },
    strainCharacteristics: {
      morphology: 'Dense capitate-stalked trichomes with bulbous heads',
      trichomeProfile: 'High-density production with excellent development',
      growthPattern: 'Consistent maturation across canopy'
    },
    technicalAnalysis: {
      imageQuality: 'excellent',
      magnificationLevel: 'High (400x+)',
      focusQuality: 'sharp',
      lightingCondition: 'optimal'
    },
    recommendations: [
      'Optimal trichome development achieved',
      'Harvest window is now - 0-3 days remaining',
      'Trichome density is excellent - genetics are optimal',
      'Consider harvesting within 48 hours for peak potency',
      'Weather forecast looks favorable for harvest window'
    ],
    analysisMetadata: {
      deviceInfo: {
        deviceType: 'USB Microscope',
        magnification: 400,
        resolution: { width: 2048, height: 1536 },
        mode: 'microscope'
      },
      enhancedAt: new Date().toISOString(),
      version: '4.0.0-AI-Powered'
    }
  }
};

// Sample Image Buffers for Testing
export const createSampleImage = {
  // 1x1 pixel JPEG
  tiny: Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  ),

  // Small plant image (100x100)
  small: Buffer.from(
    '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k=',
    'base64'
  ),

  // Medium plant image (500x500)
  medium: Buffer.from(
    'large_base64_string_here',
    'base64'
  ),

  // HEIC format mock
  heic: Buffer.from(
    'AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAAIZnJlZQAAAAhtZGF0AAAA',
    'base64'
  )
};

// Test Plant Data
export const createTestPlant = (overrides: any = {}) => ({
  id: 'test-plant-id',
  name: 'Test Plant',
  strainId: 'test-strain-id',
  stage: 'flowering',
  health: { score: 85, status: 'healthy' },
  age: 45,
  plantedDate: new Date(),
  locationId: 'test-room-id',
  isActive: true,
  ...overrides
});

// Test Strain Data
export const createTestStrain = (overrides: any = {}) => ({
  id: 'test-strain-id',
  name: 'Test Strain',
  type: 'indica',
  lineage: 'GDP x OG Kush',
  description: 'Test indica strain',
  isPurpleStrain: false,
  growingDifficulty: 'easy',
  floweringTime: 60,
  ...overrides
});

// Mock API Responses
export const createMockApiResponse = {
  success: (data: any) => ({
    success: true,
    ...data,
    timestamp: new Date().toISOString()
  }),
  error: (message: string, status: number = 400) => ({
    success: false,
    error: {
      message,
      type: 'validation_error',
      timestamp: new Date().toISOString()
    }
  })
};

// Database Test Utilities
export const setupTestDb = async () => {
  await testPrisma.$connect();
  // Reset database
  await testPrisma.plantAnalysis.deleteMany();
  await testPrisma.plant.deleteMany();
  await testPrisma.strain.deleteMany();
};

export const teardownTestDb = async () => {
  await testPrisma.$disconnect();
};

// Rate Limiting Test Helpers
export const simulateRateLimitRequests = async (
  endpoint: string,
  count: number,
  delay: number = 100
) => {
  const results = [];
  for (let i = 0; i < count; i++) {
    try {
      const response = await fetch(endpoint);
      results.push({
        status: response.status,
        ok: response.ok
      });
    } catch (error) {
      results.push({
        error: error.message,
        status: 0
      });
    }
    if (delay > 0 && i < count - 1) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  return results;
};

// Image Processing Test Helpers
export const createValidImageDataUrl = (
  format: 'jpeg' | 'png' | 'webp' | 'heic' = 'jpeg',
  width: number = 100,
  height: number = 100
): string => {
  const formats = {
    jpeg: 'data:image/jpeg;base64,',
    png: 'data:image/png;base64,',
    webp: 'data:image/webp;base64,',
    heic: 'data:image/heic;base64,'
  };
  // In a real implementation, this would generate a proper image
  return formats[format] + 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
};

// AI Provider Mock Helpers
export const mockAIProvider = {
  available: (provider: 'lm-studio' | 'openrouter') => {
    process.env[`${provider.toUpperCase()}_AVAILABLE`] = 'true';
    process.env[`${provider.toUpperCase()}_API_KEY`] = 'test-key';
  },
  unavailable: (provider: 'lm-studio' | 'openrouter') => {
    delete process.env[`${provider.toUpperCase()}_AVAILABLE`];
    delete process.env[`${provider.toUpperCase()}_API_KEY`];
  }
};

// Performance Test Helpers
export const measureExecutionTime = async <T>(
  fn: () => Promise<T>
): Promise<{ result: T; time: number }> => {
  const start = Date.now();
  const result = await fn();
  const time = Date.now() - start;
  return { result, time };
};

export const measureAsyncOperation = async <T>(
  fn: () => Promise<T>,
  iterations: number = 100
): Promise<{ avgTime: number; minTime: number; maxTime: number; results: number[] }> => {
  const results: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const start = Date.now();
    await fn();
    results.push(Date.now() - start);
  }

  return {
    avgTime: results.reduce((a, b) => a + b, 0) / results.length,
    minTime: Math.min(...results),
    maxTime: Math.max(...results),
    results
  };
};

// Validation Test Helpers
export const createInvalidAnalysisRequest = (type: string) => {
  const requests: Record<string, any> = {
    missingStrain: {
      leafSymptoms: 'Yellowing leaves',
      phLevel: '6.0'
    },
    missingSymptoms: {
      strain: 'Test Strain'
    },
    invalidPh: {
      strain: 'Test Strain',
      leafSymptoms: 'Yellowing leaves',
      phLevel: 'not-a-number'
    },
    invalidImage: {
      strain: 'Test Strain',
      leafSymptoms: 'Yellowing leaves',
      plantImage: 'not-an-image'
    },
    emptyRequest: {}
  };

  return requests[type] || requests.emptyRequest;
};

// Export test utilities
export default {
  testPrisma,
  mockAIResponses,
  createSampleImage,
  createTestPlant,
  createTestStrain,
  createMockApiResponse,
  setupTestDb,
  teardownTestDb,
  simulateRateLimitRequests,
  createValidImageDataUrl,
  mockAIProvider,
  measureExecutionTime,
  measureAsyncOperation,
  createInvalidAnalysisRequest
};
