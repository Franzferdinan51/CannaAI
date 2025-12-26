import { PlantHealthAnalysis, ModelConfig } from "../../types/plant-analysis";
import { analyzePlantHealth } from "./geminiService";
import { analyzeWithLMStudio } from "./lmstudioService";
import { analyzeWithOpenRouter } from "./openrouterService";

/**
 * AI Swarm Orchestrator for Plant Health Analysis
 * Coordinates multiple AI providers in two modes:
 * - CONSENSUS: All models analyze the same document, results are merged
 * - DISTRIBUTED: Workload is split across models for speed
 */

export interface SwarmResult {
  finalAnalysis: PlantHealthAnalysis;
  providerResults: {
    provider: string;
    analysis: PlantHealthAnalysis;
    confidence: number;
  }[];
  consensusLevel: number; // 0-1, higher = more agreement
  processingTime: number;
  mode: 'consensus' | 'distributed';
}

/**
 * Get active providers based on config
 */
function getActiveProviders(config: ModelConfig): string[] {
  const providers: string[] = [];

  if (config.enabled.gemini && config.geminiKey) providers.push('gemini');
  if (config.enabled.openrouter && config.openRouterKey) providers.push('openrouter');
  if (config.enabled.lmstudio && config.lmStudioEndpoint) providers.push('lmstudio');
  if (config.enabled.lmstudio2 && config.lmStudioEndpoint2) providers.push('lmstudio2');
  if (config.enabled.lmstudio3 && config.lmStudioEndpoint3) providers.push('lmstudio3');
  if (config.enabled.lmstudio4 && config.lmStudioEndpoint4) providers.push('lmstudio4');

  // Sort by priority
  return providers.sort((a, b) => {
    const aIndex = config.priority.indexOf(a as any);
    const bIndex = config.priority.indexOf(b as any);
    return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
  });
}

/**
 * Run analysis on a single provider
 */
async function runProviderAnalysis(
  provider: string,
  text: string,
  images: string[],
  config: ModelConfig
): Promise<{ provider: string; analysis: PlantHealthAnalysis; confidence: number }> {
  try {
    let analysis: PlantHealthAnalysis | null = null;

    switch (provider) {
      case 'gemini':
        analysis = await analyzePlantHealth(
          text,
          images,
          config.geminiKey,
          config.geminiModel,
          undefined,
          false
        );
        break;

      case 'openrouter':
        analysis = await analyzeWithOpenRouter(
          text,
          images,
          config.openRouterKey,
          config.openRouterModel
        );
        break;

      case 'lmstudio':
        analysis = await analyzeWithLMStudio(
          text,
          images,
          config.lmStudioEndpoint,
          undefined,
          config.lmStudioModel
        );
        break;

      case 'lmstudio2':
        analysis = await analyzeWithLMStudio(
          text,
          images,
          config.lmStudioEndpoint2,
          undefined,
          config.lmStudioModel2
        );
        break;

      case 'lmstudio3':
        analysis = await analyzeWithLMStudio(
          text,
          images,
          config.lmStudioEndpoint3,
          undefined,
          config.lmStudioModel3
        );
        break;

      case 'lmstudio4':
        analysis = await analyzeWithLMStudio(
          text,
          images,
          config.lmStudioEndpoint4,
          undefined,
          config.lmStudioModel4
        );
        break;

      default:
        throw new Error(`Unknown provider: ${provider}`);
    }

    if (!analysis) {
      throw new Error(`Provider ${provider} returned null analysis`);
    }

    return {
      provider,
      analysis,
      confidence: analysis.confidenceScore || 0
    };
  } catch (error) {
    console.error(`Provider ${provider} failed:`, error);
    // Return fallback analysis
    return {
      provider,
      analysis: {
        summary: `${provider} analysis failed`,
        entities: [],
        keyInsights: [],
        sentiment: 'unknown',
        flaggedIssues: []
      },
      confidence: 0
    };
  }
}

/**
 * Merge multiple analyses into consensus result
 */
function mergeAnalyses(results: { provider: string; analysis: PlantHealthAnalysis; confidence: number }[]): PlantHealthAnalysis {
  if (results.length === 0) {
    return {
      summary: "No analyses available",
      entities: [],
      keyInsights: [],
      sentiment: "unknown",
      flaggedIssues: []
    };
  }

  if (results.length === 1) {
    return results[0].analysis;
  }

  // Weight results by confidence
  const totalConfidence = results.reduce((sum, r) => sum + r.confidence, 0);

  // Merge entities (count occurrences)
  const entityMap = new Map<string, { entity: any; count: number; confidenceSum: number }>();
  results.forEach(r => {
    r.analysis.entities.forEach(e => {
      const key = `${e.name}-${e.type}`;
      if (entityMap.has(key)) {
        const existing = entityMap.get(key)!;
        existing.count++;
        existing.confidenceSum += r.confidence;
      } else {
        entityMap.set(key, {
          entity: { ...e, isConfirmed: r.confidence > 70 },
          count: 1,
          confidenceSum: r.confidence
        });
      }
    });
  });

  const consensusEntities = Array.from(entityMap.values())
    .filter(e => e.count >= Math.ceil(results.length / 2)) // Majority
    .map(e => ({
      ...e.entity,
      isConfirmed: e.count >= results.length // All agree = confirmed
    }));

  // Merge flagged issues
  const issueSet = new Set<string>();
  results.forEach(r => {
    r.analysis.flaggedIssues?.forEach(issue => issueSet.add(issue));
  });

  // Merge recommendations
  const recommendationSet = new Set<string>();
  results.forEach(r => {
    r.analysis.recommendations?.forEach(rec => recommendationSet.add(rec));
  });

  // Determine sentiment (worst case)
  const sentimentPriority = { critical: 3, warning: 2, healthy: 1, unknown: 0 };
  const worstSentiment = results
    .map(r => r.analysis.sentiment)
    .sort((a, b) => sentimentPriority[b as keyof typeof sentimentPriority] - sentimentPriority[a as keyof typeof sentimentPriority])[0];

  // Average confidence
  const avgConfidence = totalConfidence / results.length;

  // Build consensus summary
  const providerNames = results.map(r => r.provider).join(', ');
  const consensusSummary = `[SWARM ANALYSIS] Analyzed by: ${providerNames}. ` +
    (consensusEntities.length > 0 ? `${consensusEntities.length} confirmed findings. ` : '') +
    `Consensus confidence: ${Math.round(avgConfidence)}%.`;

  return {
    summary: results[0].analysis.summary.startsWith('[SWARM]')
      ? results[0].analysis.summary
      : consensusSummary,
    entities: consensusEntities,
    keyInsights: results.flatMap(r => r.analysis.keyInsights).slice(0, 10),
    sentiment: worstSentiment,
    analysisDate: results[0].analysis.analysisDate,
    flaggedIssues: Array.from(issueSet),
    recommendations: Array.from(recommendationSet),
    locations: results[0].analysis.locations,
    visualObjects: results[0].analysis.visualObjects,
    issueType: results[0].analysis.issueType,
    confidenceScore: avgConfidence,
    timelineEvents: results[0].analysis.timelineEvents,
    strainInfo: results[0].analysis.strainInfo,
    environmentalConditions: results[0].analysis.environmentalConditions
  };
}

/**
 * Calculate consensus level (0-1)
 */
function calculateConsensusLevel(results: { provider: string; analysis: PlantHealthAnalysis; confidence: number }[]): number {
  if (results.length < 2) return 1.0;

  let agreementCount = 0;
  let totalComparisons = 0;

  for (let i = 0; i < results.length; i++) {
    for (let j = i + 1; j < results.length; j++) {
      const r1 = results[i].analysis;
      const r2 = results[j].analysis;

      // Check sentiment agreement
      if (r1.sentiment === r2.sentiment) agreementCount++;

      // Check flagged issues overlap
      const commonIssues = r1.flaggedIssues?.filter(i => r2.flaggedIssues?.includes(i)) || [];
      if (commonIssues.length > 0) agreementCount++;

      // Check entity overlap
      const entityNames1 = new Set(r1.entities.map(e => e.name));
      const commonEntities = r2.entities.filter(e => entityNames1.has(e.name));
      if (commonEntities.length > 0) agreementCount++;

      totalComparisons += 3;
    }
  }

  return totalComparisons > 0 ? agreementCount / totalComparisons : 0;
}

/**
 * Run consensus mode - all providers analyze same document
 */
export async function runConsensusMode(
  text: string,
  images: string[],
  config: ModelConfig
): Promise<SwarmResult> {
  const startTime = Date.now();
  const providers = getActiveProviders(config);

  if (providers.length === 0) {
    throw new Error("No active providers configured");
  }

  console.log(`[SWARM CONSENSUS] Running ${providers.length} providers in parallel...`);

  // Run all providers in parallel
  const results = await Promise.all(
    providers.map(provider => runProviderAnalysis(provider, text, images, config))
  );

  const finalAnalysis = mergeAnalyses(results);
  const consensusLevel = calculateConsensusLevel(results);

  console.log(`[SWARM CONSENSUS] Complete. Consensus: ${Math.round(consensusLevel * 100)}%`);

  return {
    finalAnalysis,
    providerResults: results,
    consensusLevel,
    processingTime: Date.now() - startTime,
    mode: 'consensus'
  };
}

/**
 * Run distributed mode - split workload across providers
 * For plant analysis, we can have different providers analyze different images
 */
export async function runDistributedMode(
  text: string,
  images: string[],
  config: ModelConfig
): Promise<SwarmResult> {
  const startTime = Date.now();
  const providers = getActiveProviders(config);

  if (providers.length === 0) {
    throw new Error("No active providers configured");
  }

  console.log(`[SWARM DISTRIBUTED] Distributing workload across ${providers.length} providers...`);

  // Strategy: Each provider gets all images but we process in a round-robin
  // In a real batch scenario, you'd split documents across providers
  // For single document analysis, this behaves like consensus but with failover

  const results: { provider: string; analysis: PlantHealthAnalysis; confidence: number }[] = [];

  // Try providers in priority order until one succeeds
  for (const provider of providers) {
    try {
      const result = await runProviderAnalysis(provider, text, images, config);
      results.push(result);

      // In distributed mode, we can stop at first success if we just want speed
      // But for quality, let's use multiple if available
      if (results.length >= Math.min(3, providers.length)) {
        break; // Use up to 3 providers for balance
      }
    } catch (error) {
      console.error(`Provider ${provider} failed in distributed mode, trying next...`);
      continue;
    }
  }

  if (results.length === 0) {
    throw new Error("All providers failed in distributed mode");
  }

  // Merge results for best quality
  const finalAnalysis = mergeAnalyses(results);
  const consensusLevel = calculateConsensusLevel(results);

  console.log(`[SWARM DISTRIBUTED] Complete. Used ${results.length} providers.`);

  return {
    finalAnalysis,
    providerResults: results,
    consensusLevel,
    processingTime: Date.now() - startTime,
    mode: 'distributed'
  };
}

/**
 * Main entry point - runs swarm based on config
 */
export async function runSwarmAnalysis(
  text: string,
  images: string[],
  config: ModelConfig
): Promise<SwarmResult> {
  if (config.swarmMode === 'consensus') {
    return runConsensusMode(text, images, config);
  } else {
    return runDistributedMode(text, images, config);
  }
}
