/**
 * Export Schedule API Endpoint
 * POST /api/export/schedule - Schedule regular exports
 */

import { NextRequest, NextResponse } from 'next/server';
import { backupManager } from '@/lib/export-import-utils';
import { z } from 'zod';

const ScheduleSchema = z.object({
  frequency: z.enum(['daily', 'weekly', 'monthly']),
  format: z.enum(['json', 'csv', 'pdf', 'zip', 'xml', 'xlsx']),
  enabled: z.boolean(),
  filters: z.object({
    dateRange: z.object({
      start: z.string(),
      end: z.string()
    }).optional(),
    plantIds: z.array(z.string()).optional(),
    strainIds: z.array(z.string()).optional(),
    analysisTypes: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    includeImages: z.boolean().optional()
  }).optional()
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = ScheduleSchema.parse(body);

    // Schedule the backup/export
    const scheduleId = await backupManager.scheduleBackup(validatedData.frequency, validatedData);

    return NextResponse.json({
      success: true,
      message: `Export scheduled ${validatedData.frequency}`,
      schedule: {
        frequency: validatedData.frequency,
        format: validatedData.format,
        enabled: validatedData.enabled,
        id: scheduleId
      }
    });
  } catch (error) {
    console.error('Export scheduling failed:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: error.issues
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to schedule export',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    const schedules = await backupManager.listScheduledBackups();
    return NextResponse.json({
      success: true,
      schedules
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve scheduled exports'
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Schedule ID required'
      }, { status: 400 });
    }

    const deleted = await backupManager.deleteScheduledBackup(id);
    if (!deleted) {
      return NextResponse.json({ success: false, error: 'Schedule not found' }, { status: 404 });
    }
    return NextResponse.json({
      success: true,
      message: 'Schedule deleted successfully'
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to delete schedule',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
