import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { startOfDay, subDays } from 'date-fns';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') || '7d';
    const plantId = searchParams.get('plantId');

    let startDate: Date;
    let endDate: Date = new Date();

    switch (timeframe) {
      case '7d':
        startDate = startOfDay(subDays(endDate, 7));
        break;
      case '30d':
        startDate = startOfDay(subDays(endDate, 30));
        break;
      case '90d':
        startDate = startOfDay(subDays(endDate, 90));
        break;
      default:
        startDate = startOfDay(subDays(endDate, 7));
    }

    const whereClause: any = {
      timestamp: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (plantId) {
      whereClause.plantId = plantId;
    }

    // Get plant health analytics with minimal data
    const healthData = await prisma.plantHealthAnalytics.findMany({
      where: whereClause,
      select: {
        id: true,
        plantId: true,
        healthScore: true,
        healthStatus: true,
        issues: true,
        recommendations: true,
        timestamp: true,
      },
      orderBy: { timestamp: 'desc' },
      take: 200,
    });

    // Get plant IDs for batch fetching
    const plantIds = [...new Set(healthData.map(h => h.plantId))];

    // Batch fetch plants and strains
    const [plants, strains] = await Promise.all([
      prisma.plant.findMany({
        where: { id: { in: plantIds } },
        select: {
          id: true,
          name: true,
          stage: true,
        },
      }),
      // Only fetch strains if we have plants with strain IDs
      plantIds.length > 0 ? prisma.strain.findMany({
        where: { plants: { some: { id: { in: plantIds } } } },
        select: {
          id: true,
          name: true,
          type: true,
        },
      }) : Promise.resolve([]),
    ]);

    // Create lookup maps for O(1) access
    const plantMap = new Map(plants.map(p => [p.id, p]));
    const strainMap = new Map(strains.map(s => [s.id, s]));

    // Enrich health data with plant and strain info
    const enrichedHealthData = healthData.map(item => ({
      ...item,
      plant: item.plantId ? plantMap.get(item.plantId) : null,
    }));

    // Get distribution of health statuses
    const statusDistribution = healthData.reduce((acc, item) => {
      const status = item.healthStatus;
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Calculate trends over time
    const trendData = await prisma.$queryRaw`
      SELECT
        DATE(timestamp) as date,
        AVG(healthScore) as avgScore,
        MIN(healthScore) as minScore,
        MAX(healthScore) as maxScore,
        COUNT(*) as count
      FROM PlantHealthAnalytics
      WHERE timestamp >= ${startDate} AND timestamp <= ${endDate}
      ${plantId ? prisma.$unsafe(`AND plantId = '${plantId}'`) : prisma.$unsafe('')}
      GROUP BY DATE(timestamp)
      ORDER BY date ASC
    ` as any[];

    // Get average health score
    const avgHealthScore = healthData.length > 0
      ? healthData.reduce((acc, item) => acc + item.healthScore, 0) / healthData.length
      : 0;

    // Get plant-specific health stats if plantId is provided
    let plantStats = null;
    if (plantId) {
      const plant = await prisma.plant.findUnique({
        where: { id: plantId },
        include: {
          strain: true,
          analyses: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
        },
      });

      if (plant) {
        plantStats = {
          plant: {
            id: plant.id,
            name: plant.name,
            stage: plant.stage,
            strain: plant.strain,
          },
          totalAnalyses: plant.analyses.length,
          currentHealth: plant.health,
        };
      }
    }

    // Get top issues
    const issuesCount = healthData.reduce((acc, item) => {
      if (item.issues) {
        const issues = Array.isArray(item.issues) ? item.issues : [item.issues];
        issues.forEach((issue: any) => {
          if (issue.type) {
            acc[issue.type] = (acc[issue.type] || 0) + 1;
          }
        });
      }
      return acc;
    }, {} as Record<string, number>);

    const topIssues = Object.entries(issuesCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([issue, count]) => ({ issue, count }));

    return NextResponse.json({
      success: true,
      data: {
        healthData: enrichedHealthData,
        summary: {
          avgHealthScore,
          totalAnalyses: healthData.length,
          statusDistribution,
          trendData,
        },
        plantStats,
        topIssues,
        timeframe,
        dateRange: {
          start: startDate,
          end: endDate,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching plant health analytics:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch plant health analytics',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { plantId, analysisId, healthScore, healthStatus, issues, recommendations, confidence } = body;

    if (!plantId || healthScore === undefined || !healthStatus) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: plantId, healthScore, healthStatus',
        },
        { status: 400 }
      );
    }

    // Verify plant exists
    const plant = await prisma.plant.findUnique({
      where: { id: plantId },
    });

    if (!plant) {
      return NextResponse.json(
        {
          success: false,
          error: 'Plant not found',
        },
        { status: 404 }
      );
    }

    const analytics = await prisma.plantHealthAnalytics.create({
      data: {
        plantId,
        analysisId,
        healthScore: Number(healthScore),
        healthStatus,
        issues: issues || {},
        recommendations: recommendations || {},
        confidence: confidence ? Number(confidence) : null,
        timestamp: new Date(),
      },
      include: {
        plant: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    console.error('Error creating plant health analytics:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create plant health analytics',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
