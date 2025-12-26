import { PlantHealthAnalysis, ModelConfig } from "../../types/plant-analysis";
import { analyzePlantHealth } from "./geminiService";
import { analyzeWithLMStudio } from "./lmstudioService";
import { analyzeWithOpenRouter } from "./openrouterService";

/**
 * Dual-Check Verification Pipeline
 * Fast primary analysis with optional background verification for critical findings
 */

export interface VerificationResult {
  primaryAnalysis: PlantHealthAnalysis;
  verifiedAnalysis?: PlantHealthAnalysis;
  verificationProvider?: string;
  verificationNeeded: boolean;
  verificationStatus: 'none' | 'pending' | 'in_progress' | 'completed' | 'failed';
  criticalFindings: string[];
}

/**
 * Check if verification is needed based on analysis
 */
function needsVerification(analysis: PlantHealthAnalysis): boolean {
  // Verification needed for:
  // 1. Critical sentiment
  // 2. Any flagged issues
  // 3. Low confidence scores
  // 4. Disease or pest entities

  if (analysis.sentiment === 'critical') return true;
  if (analysis.flaggedIssues && analysis.flaggedIssues.length > 0) return true;
  if (analysis.confidenceScore && analysis.confidenceScore < 60) return true;

  const hasPestsOrDisease = analysis.entities.some(e =>
    e.type === 'pest' || e.type === 'disease'
  );
  if (hasPestsOrDisease) return true;

  return false;
}

/**
 * Extract critical findings for verification
 */
function extractCriticalFindings(analysis: PlantHealthAnalysis): string[] {
  const findings: string[] = [];

  if (analysis.flaggedIssues) {
    findings.push(...analysis.flaggedIssues);
  }

  analysis.entities.forEach(e => {
    if (e.type === 'pest' || e.type === 'disease') {
      findings.push(`Potential ${e.type}: ${e.name} - ${e.context}`);
    }
  });

  if (analysis.sentiment === 'critical') {
    findings.push('Critical plant health status detected');
  }

  return findings;
}

/**
 * Run verification using preferred verifier
 */
async function runVerification(
  primaryAnalysis: PlantHealthAnalysis,
  text: string,
  images: string[],
  config: ModelConfig
): Promise<{ analysis: PlantHealthAnalysis; provider: string } | null> {
  const verifier = config.preferredVerifier;

  if (verifier === 'auto') {
    // Auto-select: prefer Gemini for search capability, then local models
    if (config.enabled.gemini && config.geminiKey) {
      const analysis = await analyzePlantHealth(
        text,
        images,
        config.geminiKey,
        config.geminiModel,
        primaryAnalysis.flaggedIssues?.[0], // Verify first critical issue
        true // Use search if available
      );
      return { analysis, provider: 'gemini (with search)' };
    }
  }

  if (verifier === 'gemini' && config.enabled.gemini && config.geminiKey) {
    const analysis = await analyzePlantHealth(
      text,
      images,
      config.geminiKey,
      config.geminiModel,
      primaryAnalysis.flaggedIssues?.[0],
      false
    );
    return { analysis, provider: 'gemini' };
  }

  if (verifier === 'openrouter' && config.enabled.openrouter && config.openRouterKey) {
    const analysis = await analyzeWithOpenRouter(
      text,
      images,
      config.openRouterKey,
      config.openRouterModel,
      primaryAnalysis.flaggedIssues?.[0]
    );
    return { analysis, provider: 'openrouter' };
  }

  if (verifier.startsWith('lmstudio')) {
    const endpoint = verifier === 'lmstudio' ? config.lmStudioEndpoint :
      verifier === 'lmstudio2' ? config.lmStudioEndpoint2 :
      verifier === 'lmstudio3' ? config.lmStudioEndpoint3 :
      config.lmStudioEndpoint4;

    const model = verifier === 'lmstudio' ? config.lmStudioModel :
      verifier === 'lmstudio2' ? config.lmStudioModel2 :
      verifier === 'lmstudio3' ? config.lmStudioModel3 :
      config.lmStudioModel4;

    if (endpoint) {
      const analysis = await analyzeWithLMStudio(
        text,
        images,
        endpoint,
        primaryAnalysis.flaggedIssues?.[0],
        model
      );
      return { analysis, provider: verifier };
    }
  }

  // Fallback to any available provider
  if (config.enabled.gemini && config.geminiKey) {
    const analysis = await analyzePlantHealth(
      text,
      images,
      config.geminiKey,
      config.geminiModel,
      primaryAnalysis.flaggedIssues?.[0],
      false
    );
    return { analysis, provider: 'gemini (fallback)' };
  }

  return null;
}

/**
 * Merge primary and verified analyses
 */
function mergeVerifiedAnalyses(
  primary: PlantHealthAnalysis,
  verified: PlantHealthAnalysis
): PlantHealthAnalysis {
  // If verification confirms primary findings, boost confidence
  const confirmedEntities = primary.entities.filter(pe =>
    verified.entities.some(ve => ve.name === pe.name && ve.type === pe.type)
  ).map(e => ({ ...e, isConfirmed: true }));

  // Add any new findings from verification
  const newEntities = verified.entities.filter(ve =>
    !primary.entities.some(pe => pe.name === ve.name)
  );

  // Merge flagged issues
  const allIssues = [
    ...(primary.flaggedIssues || []),
    ...(verified.flaggedIssues || [])
  ];
  const uniqueIssues = Array.from(new Set(allIssues));

  // Merge recommendations
  const allRecs = [
    ...(primary.recommendations || []),
    ...(verified.recommendations || [])
  ];
  const uniqueRecs = Array.from(new Set(allRecs));

  // Use worst sentiment
  const sentimentPriority = { critical: 3, warning: 2, healthy: 1, unknown: 0 };
  const worstSentiment = [primary.sentiment, verified.sentiment].sort((a, b) =>
    sentimentPriority[b as keyof typeof sentimentPriority] - sentimentPriority[a as keyof typeof sentimentPriority]
  )[0];

  // Average confidence if both agree, otherwise use lower
  const avgConfidence = ((primary.confidenceScore || 0) + (verified.confidenceScore || 0)) / 2;

  return {
    ...primary,
    summary: `[VERIFIED] ${primary.summary}\n\n[VERIFIER NOTE]: ${verified.summary}`,
    entities: [...confirmedEntities, ...newEntities],
    keyInsights: [...primary.keyInsights.slice(0, 5), ...verified.keyInsights.slice(0, 5)].slice(0, 8),
    sentiment: worstSentiment,
    flaggedIssues: uniqueIssues,
    recommendations: uniqueRecs,
    confidenceScore: avgConfidence
  };
}

/**
 * Run dual-check pipeline
 */
export async function runDualCheckPipeline(
  text: string,
  images: string[],
  config: ModelConfig,
  primaryProvider?: string
): Promise<VerificationResult> {
  // Step 1: Run primary analysis
  let primaryAnalysis: PlantHealthAnalysis;

  // Use specified primary provider or first available
  if (!primaryProvider) {
    if (config.enabled.gemini && config.geminiKey) primaryProvider = 'gemini';
    else if (config.enabled.lmstudio && config.lmStudioEndpoint) primaryProvider = 'lmstudio';
    else if (config.enabled.openrouter && config.openRouterKey) primaryProvider = 'openrouter';
    else throw new Error("No AI providers configured");
  }

  // Run primary analysis
  switch (primaryProvider) {
    case 'gemini':
      primaryAnalysis = await analyzePlantHealth(text, images, config.geminiKey, config.geminiModel);
      break;
    case 'openrouter':
      primaryAnalysis = await analyzeWithOpenRouter(text, images, config.openRouterKey, config.openRouterModel) || {
        summary: 'Analysis failed',
        entities: [],
        keyInsights: [],
        sentiment: 'unknown',
        flaggedIssues: []
      };
      break;
    case 'lmstudio':
      primaryAnalysis = await analyzeWithLMStudio(text, images, config.lmStudioEndpoint, undefined, config.lmStudioModel) || {
        summary: 'Analysis failed',
        entities: [],
        keyInsights: [],
        sentiment: 'unknown',
        flaggedIssues: []
      };
      break;
    default:
      throw new Error(`Unknown provider: ${primaryProvider}`);
  }

  // Step 2: Check if verification is needed
  const shouldVerify = config.dualCheckMode && needsVerification(primaryAnalysis);
  const criticalFindings = extractCriticalFindings(primaryAnalysis);

  if (!shouldVerify) {
    return {
      primaryAnalysis,
      verificationNeeded: false,
      verificationStatus: 'none',
      criticalFindings
    };
  }

  // Step 3: Run background verification
  console.log('[DUAL-CHECK] Critical findings detected, starting verification...');

  try {
    const verification = await runVerification(primaryAnalysis, text, images, config);

    if (!verification) {
      return {
        primaryAnalysis,
        verificationNeeded: true,
        verificationStatus: 'failed',
        criticalFindings
      };
    }

    // Step 4: Merge analyses
    const finalAnalysis = mergeVerifiedAnalyses(primaryAnalysis, verification.analysis);

    return {
      primaryAnalysis,
      verifiedAnalysis: finalAnalysis,
      verificationProvider: verification.provider,
      verificationNeeded: true,
      verificationStatus: 'completed',
      criticalFindings
    };
  } catch (error) {
    console.error('[DUAL-CHECK] Verification failed:', error);
    return {
      primaryAnalysis,
      verificationNeeded: true,
      verificationStatus: 'failed',
      criticalFindings
    };
  }
}

/**
 * Mark document as pending verification (for async processing)
 */
export function markForPendingVerification(
  primaryAnalysis: PlantHealthAnalysis,
  docId: string
): VerificationResult {
  return {
    primaryAnalysis,
    verificationNeeded: true,
    verificationStatus: 'pending',
    criticalFindings: extractCriticalFindings(primaryAnalysis)
  };
}
