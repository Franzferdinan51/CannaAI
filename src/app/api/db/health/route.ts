import { NextResponse } from 'next/server';
import { dbMonitor, getHealthMetrics } from '@/lib/db-monitoring';
import { cleanup } from '@/lib/db-optimization';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'metrics';

    switch (action) {
      case 'metrics': {
        const metrics = await getHealthMetrics();
        const stats = dbMonitor.getQueryStats();
        const slowQueries = dbMonitor.getSlowQueries(10);
        const recommendations = dbMonitor.getOptimizationRecommendations();

        return NextResponse.json({
          success: true,
          data: {
            health: metrics,
            performance: stats,
            slowQueries,
            recommendations,
            timestamp: new Date().toISOString(),
          },
        });
      }

      case 'stats': {
        const stats = dbMonitor.getQueryStats();
        return NextResponse.json({
          success: true,
          data: stats,
        });
      }

      case 'slow-queries': {
        const limit = parseInt(searchParams.get('limit') || '10');
        const slowQueries = dbMonitor.getSlowQueries(limit);
        return NextResponse.json({
          success: true,
          data: slowQueries,
        });
      }

      case 'recommendations': {
        const recommendations = dbMonitor.getOptimizationRecommendations();
        return NextResponse.json({
          success: true,
          data: recommendations,
        });
      }

      case 'export': {
        const filename = searchParams.get('filename') || `db-metrics-${Date.now()}.json`;
        const filePath = dbMonitor.exportMetrics(filename);
        return NextResponse.json({
          success: true,
          data: {
            message: 'Metrics exported successfully',
            filePath,
            filename,
          },
        });
      }

      case 'clear-history': {
        dbMonitor.clearHistory();
        return NextResponse.json({
          success: true,
          data: {
            message: 'Query history cleared',
          },
        });
      }

      case 'vacuum': {
        if (process.env.NODE_ENV === 'production') {
          return NextResponse.json(
            {
              success: false,
              error: 'VACUUM operation not allowed in production',
            },
            { status: 403 }
          );
        }

        await cleanup.vacuum(prisma);
        return NextResponse.json({
          success: true,
          data: {
            message: 'Database vacuumed successfully',
          },
        });
      }

      case 'analyze': {
        if (process.env.NODE_ENV === 'production') {
          return NextResponse.json(
            {
              success: false,
              error: 'ANALYZE operation not allowed in production',
            },
            { status: 403 }
          );
        }

        await cleanup.analyze(prisma);
        return NextResponse.json({
          success: true,
          data: {
            message: 'Database analyzed successfully',
          },
        });
      }

      default:
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid action. Supported actions: metrics, stats, slow-queries, recommendations, export, clear-history, vacuum, analyze',
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Database health check error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to perform database health check',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, params } = body;

    switch (action) {
      case 'archive-old-records': {
        const { modelName, dateField, cutoffDate } = params;

        if (!modelName || !dateField || !cutoffDate) {
          return NextResponse.json(
            {
              success: false,
              error: 'Missing required parameters: modelName, dateField, cutoffDate',
            },
            { status: 400 }
          );
        }

        const model = (prisma as any)[modelName];
        if (!model) {
          return NextResponse.json(
            {
              success: false,
              error: `Model ${modelName} not found`,
            },
            { status: 404 }
          );
        }

        const archived = await cleanup.archiveOldRecords(
          model,
          dateField,
          new Date(cutoffDate)
        );

        return NextResponse.json({
          success: true,
          data: {
            message: `${archived} records archived successfully`,
            archived,
          },
        });
      }

      default:
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid action',
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Database maintenance error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to perform database maintenance',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
