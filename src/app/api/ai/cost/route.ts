/**
 * AI Cost Tracking and Budget Management Endpoint
 * Returns cost summary, trends, and budget status
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUnifiedAI } from '@/lib/ai-providers/unified-ai';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const unifiedAI = getUnifiedAI();
    const costSummary = unifiedAI.getCostSummary();
    const cacheStats = unifiedAI.getCacheStats();

    // Calculate cache savings
    const cacheSavings = (cacheStats.hitCount / (cacheStats.hitCount + cacheStats.missCount)) * 100;
    const estimatedCacheSavings = costSummary.total * (cacheSavings / 100);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        totalCost: `$${costSummary.total.toFixed(4)}`,
        totalRequests: costSummary.totalRequests,
        totalTokens: costSummary.totalTokens,
        cacheSavings: `$${estimatedCacheSavings.toFixed(4)} (${cacheSavings.toFixed(1)}%)`
      },
      byProvider: Object.entries(costSummary.byProvider).map(([provider, cost]) => ({
        provider,
        cost: `$${cost.toFixed(4)}`,
        percentage: ((cost / costSummary.total) * 100).toFixed(1) + '%'
      })),
      byModel: Object.entries(costSummary.byModel).map(([model, cost]) => ({
        model,
        cost: `$${cost.toFixed(4)}`
      })),
      byType: Object.entries(costSummary.byType).map(([type, cost]) => ({
        type,
        cost: `$${cost.toFixed(4)}`,
        percentage: ((cost / costSummary.total) * 100).toFixed(1) + '%'
      })),
      period: {
        daily: `$${costSummary.period.daily.toFixed(4)}`,
        weekly: `$${costSummary.period.weekly.toFixed(4)}`,
        monthly: `$${costSummary.period.monthly.toFixed(4)}`
      },
      optimization: {
        recommendations: generateCostRecommendations(costSummary),
        potentialSavings: `$${(costSummary.total * 0.15).toFixed(4)}` // Estimate 15% savings possible
      }
    });

  } catch (error) {
    console.error('Cost tracking error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

function generateCostRecommendations(summary: any): string[] {
  const recommendations: string[] = [];

  if (summary.total === 0) {
    return ['No costs recorded yet. Start using AI features to track expenses.'];
  }

  // Find most expensive provider
  const topProvider = Object.entries(summary.byProvider).sort((a: any, b: any) => b[1] - a[1])[0];
  if (topProvider && topProvider[1] > summary.total * 0.5) {
    recommendations.push(
      `${topProvider[0]} accounts for ${((topProvider[1] / summary.total) * 100).toFixed(1)}% of costs. Consider load balancing with other providers.`
    );
  }

  // Check if using expensive providers
  const expensiveProviders = ['claude', 'perplexity'];
  const hasExpensive = Object.keys(summary.byProvider).some(p => expensiveProviders.includes(p));
  if (hasExpensive) {
    recommendations.push('Consider using Groq or Gemini for cost savings on simple tasks.');
  }

  // Cache recommendations
  if (summary.total > 1) {
    recommendations.push('Enable response caching to reduce repeated request costs.');
  }

  // Model recommendations
  const freeProviders = summary.byProvider['lm-studio'] || 0;
  if (freeProviders === 0) {
    recommendations.push('Set up LM Studio for local development - completely free for testing and development.');
  }

  return recommendations;
}
