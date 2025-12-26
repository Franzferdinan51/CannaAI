import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const plantId = searchParams.get('plantId');
    const analysisType = searchParams.get('analysisType');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: any = {};
    if (plantId) where.plantId = plantId;
    if (analysisType) where.analysisType = analysisType;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const history = await prisma.analysisHistory.findMany({
      where,
      include: {
        plant: true
      },
      orderBy: { createdAt: 'asc' },
      take: 500 // Limit to 500 records
    });

    // Calculate trends
    const trends = calculateTrends(history);

    // Get milestones
    const milestones = await prisma.analysisMilestone.findMany({
      where: plantId ? { plantId } : {},
      include: {
        plant: true
      },
      orderBy: { detectedAt: 'desc' },
      take: 50
    });

    return NextResponse.json({
      success: true,
      data: {
        history,
        trends,
        milestones,
        summary: {
          totalAnalyses: history.length,
          dateRange: {
            start: history.length > 0 ? history[0].createdAt : null,
            end: history.length > 0 ? history[history.length - 1].createdAt : null
          }
        }
      }
    });
  } catch (error) {
    console.error('Trends fetch error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch trends',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

function calculateTrends(history: any[]) {
  if (history.length < 2) {
    return {
      healthScoreTrend: 'insufficient_data',
      changesDetected: 0,
      averageInterval: 0,
      pattern: 'no_pattern'
    };
  }

  // Calculate health score trend
  const healthScores = history
    .map(h => {
      const data = h.data as any;
      return data?.healthScore || data?.analysis?.healthScore || null;
    })
    .filter(score => score !== null);

  let healthScoreTrend = 'stable';
  if (healthScores.length >= 2) {
    const firstScore = healthScores[0];
    const lastScore = healthScores[healthScores.length - 1];
    const diff = lastScore - firstScore;

    if (diff > 10) healthScoreTrend = 'improving';
    else if (diff < -10) healthScoreTrend = 'declining';
  }

  // Calculate average interval between analyses
  let averageInterval = 0;
  if (history.length > 1) {
    const intervals: number[] = [];
    for (let i = 1; i < history.length; i++) {
      const diff = new Date(history[i].createdAt).getTime() - new Date(history[i - 1].createdAt).getTime();
      intervals.push(diff);
    }
    averageInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  }

  // Detect changes
  let changesDetected = 0;
  for (let i = 1; i < history.length; i++) {
    const prevData = history[i - 1].data as any;
    const currData = history[i].data as any;

    // Compare health scores
    const prevHealth = prevData?.healthScore || prevData?.analysis?.healthScore;
    const currHealth = currData?.healthScore || currData?.analysis?.healthScore;

    if (prevHealth && currHealth && Math.abs(currHealth - prevHealth) > 10) {
      changesDetected++;
    }
  }

  // Detect patterns
  let pattern = 'irregular';
  if (history.length >= 5) {
    // Check for regular intervals (within 20% variance)
    const intervals: number[] = [];
    for (let i = 1; i < history.length; i++) {
      intervals.push(
        new Date(history[i].createdAt).getTime() - new Date(history[i - 1].createdAt).getTime()
      );
    }

    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((sum, val) => sum + Math.pow(val - avgInterval, 2), 0) / intervals.length;
    const stdDev = Math.sqrt(variance);

    const coefficientOfVariation = stdDev / avgInterval;
    if (coefficientOfVariation < 0.2) {
      pattern = 'regular';
    } else if (coefficientOfVariation < 0.5) {
      pattern = 'somewhat_regular';
    }
  }

  return {
    healthScoreTrend,
    changesDetected,
    averageInterval,
    pattern,
    healthScoreData: healthScores
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { plantId, analysisType, data, metadata } = body;

    const history = await prisma.analysisHistory.create({
      data: {
        plantId,
        analysisType,
        data,
        metadata: metadata || {}
      },
      include: {
        plant: true
      }
    });

    // Check for milestones
    await detectMilestones(history);

    return NextResponse.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('History creation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create history record',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

async function detectMilestones(history: any) {
  try {
    const data = history.data as any;
    const plantId = history.plantId;

    // Check for harvest readiness
    if (data?.trichomeAnalysis?.harvestReadiness?.ready) {
      await prisma.analysisMilestone.create({
        data: {
          plantId,
          type: 'harvest_ready',
          title: 'Harvest Ready',
          description: `Plants are ready for harvest based on trichome analysis`,
          data: data.trichomeAnalysis
        }
      });
    }

    // Check for flowering stage
    if (data?.stage === 'flowering') {
      const existingMilestone = await prisma.analysisMilestone.findFirst({
        where: {
          plantId,
          type: 'flowering_start'
        }
      });

      if (!existingMilestone) {
        await prisma.analysisMilestone.create({
          data: {
            plantId,
            type: 'flowering_start',
            title: 'Flowering Stage Started',
            description: 'Plants have entered the flowering stage',
            data: data
          }
        });
      }
    }

    // Check for trichome peak
    if (data?.trichomeAnalysis?.overallMaturity?.stage === 'cloudy') {
      await prisma.analysisMilestone.create({
        data: {
          plantId,
          type: 'trichome_peak',
          title: 'Trichome Peak Development',
          description: 'Trichomes have reached peak potency',
          data: data.trichomeAnalysis
        }
      });
    }

    // Check for critical issues
    if (data?.severity === 'critical' || data?.healthScore < 50) {
      await prisma.analysisMilestone.create({
        data: {
          plantId,
          type: 'deficiency_detected',
          title: 'Critical Issue Detected',
          description: 'Significant plant health issues detected',
          data: data
        }
      });
    }
  } catch (error) {
    console.error('Milestone detection error:', error);
  }
}
