/**
 * AI Library for CannaAI
 *
 * This file exports common AI-related functions used across the application
 */

import { executeAIWithFallback } from './ai-provider-detection';
import { generateAnalysisPromptV2 } from './analysis-prompt-v2';
import { normalizePlantAnalysisResult } from './plant-analysis-report-v2';

export interface PlantHealthAnalysis {
  provider?: string;
  diagnosis: string;
  confidence: number;
  /** Normalized 0-1 health score from the provider report, when available. */
  healthScore?: number;
  recommendations: string[];
  urgency: 'low' | 'medium' | 'high' | 'critical';
  potentialIssues: string[];
  suggestedActions: string[];
  nextSteps: string[];
}

export interface LiveVisionAnalysis {
  plantHealth: {
    overall: 'healthy' | 'stressed' | 'critical';
    issues: string[];
    recommendations: string[];
  };
  detectedElements: {
    pests: string[];
    diseases: string[];
    deficiencies: string[];
  };
  imageAnalysis: {
    clarity: 'clear' | 'acceptable' | 'poor';
    recommendations: string[];
  };
}

/**
 * Analyze plant health from image data and context
 * This is the shared server-side live-vision path. It deliberately uses the
 * same local-first provider chain as `/api/analyze`, so webcam, microscope,
 * and phone captures do not silently return canned data.
 */
export async function analyzePlantHealth(
  imageData: string,
  context: {
    model?: string;
    baseUrl?: string;
    primaryProvider?: string;
    strain?: string;
    growthStage?: string;
    medium?: string;
    temperature?: number;
    humidity?: number;
    phLevel?: number;
    symptoms?: string[];
    observationScope?: 'single-plant' | 'multiple-plants' | 'crop';
    expectedPlantCount?: number;
  }
): Promise<PlantHealthAnalysis> {
  if (!imageData?.trim()) throw new Error('Image data is required for plant health analysis.');

  const prompt = generateAnalysisPromptV2({
    strain: context.strain || 'Unknown',
    leafSymptoms: context.symptoms?.join(', ') || 'No symptoms reported',
    phLevel: context.phLevel,
    temperature: context.temperature,
    humidity: context.humidity,
    medium: context.medium,
    growthStage: context.growthStage,
    urgency: 'medium',
    hasImage: true,
    observationScope: context.observationScope,
    expectedPlantCount: context.expectedPlantCount,
  });
  const result = await executeAIWithFallback([{ role: 'user', content: prompt }], {
    image: imageData,
    model: context.model,
    baseUrl: context.baseUrl,
    primaryProvider: context.primaryProvider,
    requireVision: true,
    // Phone and microscope captures always use vision. Large local models
    // may need several minutes for their first image pass; the old two-minute
    // ceiling caused healthy LM Studio requests to fail before completion.
    timeout: 600000,
  });
  const report = normalizePlantAnalysisResult(result.result ?? result.content, {
    imageAnalysis: true,
    provider: result.provider || 'unknown',
    processingTime: result.processingTime,
    inputParameters: context,
  });
  const recommendations = [
    ...(report.recommendations?.immediate || []),
    ...(report.recommendations?.shortTerm || []),
    ...(report.recommendations?.longTerm || []),
  ];
  const actions = report.priorityActions || recommendations;
  return {
    provider: result.provider,
    diagnosis: report.diagnosis,
    confidence: Math.max(0, Math.min(1, (report.confidence || 0) / 100)),
    healthScore: Math.max(0, Math.min(1, (report.healthScore || 0) / 100)),
    recommendations,
    urgency: report.urgency,
    potentialIssues: (report.detectedIssues || []).map(issue => issue.name),
    suggestedActions: actions,
    nextSteps: report.uncertainties || [],
  };
}

/**
 * Analyze live vision data from webcam/microscope
 * Live vision uses the same real provider-backed plant analysis as the
 * health-analysis helper above.
 */
export async function analyzeLiveVision(
  imageData: string,
  deviceInfo: {
    deviceId: string;
    mode: 'webcam' | 'microscope';
    resolution: { width: number; height: number };
  },
  plantContext?: {
    model?: string;
    baseUrl?: string;
    primaryProvider?: string;
    strain?: string;
    growthStage?: string;
    observationScope?: 'single-plant' | 'multiple-plants' | 'crop';
    expectedPlantCount?: number;
  }
): Promise<LiveVisionAnalysis> {
  const analysis = await analyzePlantHealth(imageData, {
    model: plantContext?.model,
    baseUrl: plantContext?.baseUrl,
    primaryProvider: plantContext?.primaryProvider,
    strain: plantContext?.strain,
    growthStage: plantContext?.growthStage,
    observationScope: plantContext?.observationScope,
    expectedPlantCount: plantContext?.expectedPlantCount,
  });
  const issueNames = (type: string) => analysis.potentialIssues.filter(issue =>
    issue.toLowerCase().includes(type)
  );
  return {
    plantHealth: {
      overall: analysis.urgency === 'critical' || analysis.urgency === 'high' ? 'critical' : analysis.confidence < 0.5 ? 'stressed' : 'healthy',
      issues: analysis.potentialIssues,
      recommendations: analysis.recommendations,
    },
    detectedElements: {
      pests: issueNames('pest'),
      diseases: issueNames('disease'),
      deficiencies: analysis.potentialIssues.filter(issue =>
        !issueNames('pest').includes(issue) && !issueNames('disease').includes(issue)
      ),
    },
    imageAnalysis: { clarity: 'acceptable', recommendations: analysis.nextSteps },
  };
}

/**
 * Get AI configuration and settings
 */
export function getAIConfig() {
  return {
    providers: {
      openrouter: {
        enabled: Boolean(process.env.OPENROUTER_API_KEY),
        baseUrl: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1'
      },
      lmstudio: {
        enabled: true,
        baseUrl: process.env.LM_STUDIO_BASE_URL || 'http://127.0.0.1:1234/v1'
      }
    },
    defaultProvider: 'lmstudio',
    timeout: 120000
  };
}
