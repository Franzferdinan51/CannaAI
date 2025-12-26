import { NextResponse } from 'next/server';
import { generateDailyReport, aggregateData, cleanupOldData } from '@/lib/analytics-utils';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { task, date } = body;

    switch (task) {
      case 'generate-daily-report':
        const reportDate = date ? new Date(date) : new Date();
        await generateDailyReport(reportDate);
        return NextResponse.json({
          success: true,
          message: `Generated daily report for ${reportDate.toISOString().split('T')[0]}`,
        });

      case 'cleanup-data':
        const retentionDays = body.retentionDays || 90;
        await cleanupOldData(retentionDays);
        return NextResponse.json({
          success: true,
          message: `Cleaned up data older than ${retentionDays} days`,
        });

      case 'aggregate-data':
        const aggPeriod = body.period || 'daily';
        const startDate = body.startDate ? new Date(body.startDate) : new Date();
        const endDate = body.endDate ? new Date(body.endDate) : new Date();
        await aggregateData(aggPeriod as any, startDate, endDate);
        return NextResponse.json({
          success: true,
          message: `Aggregated ${aggPeriod} data from ${startDate.toISOString()} to ${endDate.toISOString()}`,
        });

      case 'run-scheduled-tasks':
        // Generate daily report for yesterday
        await generateDailyReport(new Date(Date.now() - 24 * 60 * 60 * 1000));

        // Aggregate hourly data
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        await aggregateData('hourly', oneHourAgo, new Date());

        // Cleanup old data monthly
        const today = new Date();
        if (today.getDate() === 1) {
          await cleanupOldData(90);
        }

        return NextResponse.json({
          success: true,
          message: 'Scheduled tasks completed successfully',
        });

      default:
        return NextResponse.json(
          {
            success: false,
            error: 'Unknown task. Available tasks: generate-daily-report, cleanup-data, aggregate-data, run-scheduled-tasks',
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error executing task:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to execute task',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    // Health check endpoint
    return NextResponse.json({
      success: true,
      message: 'Scheduled Tasks API is running',
      availableTasks: [
        'generate-daily-report',
        'cleanup-data',
        'aggregate-data',
        'run-scheduled-tasks',
      ],
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to check status',
      },
      { status: 500 }
    );
  }
}
