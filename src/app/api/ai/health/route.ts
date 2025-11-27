/**
 * AI Provider Health Check Endpoint
 * Returns status of all AI providers with metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUnifiedAI } from '@/lib/ai-providers/unified-ai';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const unifiedAI = getUnifiedAI();
    const providerStatus = unifiedAI.getProviderStatus();
    const cacheStats = unifiedAI.getCacheStats();

    // Categorize providers
    const healthy = providerStatus.filter(p => p.health.status === 'healthy');
    const degraded = providerStatus.filter(p => p.health.status === 'degraded');
    const unhealthy = providerStatus.filter(p => p.health.status === 'unhealthy');

    return NextResponse.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      summary: {
        total: providerStatus.length,
        healthy: healthy.length,
        degraded: degraded.length,
        unhealthy: unhealthy.length
      },
      providers: providerStatus.map(p => ({
        name: p.name,
        status: p.health.status,
        latency: p.health.latency,
        successRate: p.health.successRate,
        errorRate: p.health.errorRate,
        totalRequests: p.metrics.totalRequests,
        averageLatency: p.metrics.averageLatency,
        capabilities: {
          vision: p.capabilities.vision,
          streaming: p.capabilities.streaming,
          functionCalling: p.capabilities.functionCalling
        },
        estimatedCost: p.cost,
        lastCheck: p.health.lastCheck
      })),
      cache: {
        entries: cacheStats.entries,
        size: `${cacheStats.size.toFixed(2)} MB`,
        hitRate: `${cacheStats.hitRate.toFixed(2)}%`,
        hitCount: cacheStats.hitCount,
        missCount: cacheStats.missCount
      },
      recommendations: generateRecommendations(healthy, degraded, unhealthy)
    });

  } catch (error) {
    console.error('AI health check error:', error);

    return NextResponse.json(
      {
        success: false,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

function generateRecommendations(
  healthy: any[],
  degraded: any[],
  unhealthy: any[]
): string[] {
  const recommendations: string[] = [];

  if (healthy.length === 0) {
    recommendations.push('No healthy providers available. Please configure at least one AI provider.');
    return recommendations;
  }

  if (unhealthy.length > 0) {
    recommendations.push(`${unhealthy.length} provider(s) are unhealthy and will be skipped.`);
  }

  if (degraded.length > 0) {
    recommendations.push(`${degraded.length} provider(s) are experiencing issues. Monitor closely.`);
  }

  if (healthy.length > 1) {
    recommendations.push(`Multiple healthy providers available for load balancing.`);
  }

  if (healthy.some(p => p.name === 'lm-studio')) {
    recommendations.push('LM Studio detected - excellent for local development with zero API costs.');
  }

  if (healthy.some(p => p.name === 'gemini')) {
    recommendations.push('Google Gemini available - excellent for vision tasks with competitive pricing.');
  }

  if (healthy.some(p => p.name === 'groq')) {
    recommendations.push('Groq available - ultra-fast inference for real-time applications.');
  }

  if (healthy.some(p => p.name === 'claude')) {
    recommendations.push('Anthropic Claude available - superior reasoning for complex analysis.');
  }

  return recommendations;
}
