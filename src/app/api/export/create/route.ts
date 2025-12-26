/**
 * Export Create API Endpoint
 * POST /api/export/create - Create export job
 */

import { NextRequest, NextResponse } from 'next/server';
import { exportManager, ExportOptions } from '@/lib/export-import-utils';
import { z } from 'zod';

const ExportRequestSchema = z.object({
  format: z.enum(['json', 'csv', 'pdf', 'zip', 'xml', 'xlsx']),
  filters: z.object({
    dateRange: z.object({
      start: z.string(),
      end: z.string()
    }).optional(),
    plantIds: z.array(z.string()).optional(),
    strainIds: z.array(z.string()).optional(),
    analysisTypes: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    includeImages: z.boolean().optional(),
    imageQuality: z.enum(['high', 'medium', 'low']).optional(),
    compressImages: z.boolean().optional()
  }).optional(),
  includeMetadata: z.boolean().optional(),
  includeThumbnails: z.boolean().optional(),
  customFields: z.array(z.string()).optional(),
  scheduleExport: z.object({
    frequency: z.enum(['daily', 'weekly', 'monthly']),
    enabled: z.boolean()
  }).optional()
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = ExportRequestSchema.parse(body);

    // Parse date range if provided
    const filters = validatedData.filters;
    if (filters?.dateRange) {
      filters.dateRange = {
        start: new Date(filters.dateRange.start),
        end: new Date(filters.dateRange.end)
      };
    }

    const options: ExportOptions = {
      format: validatedData.format,
      filters,
      includeMetadata: validatedData.includeMetadata !== false,
      includeThumbnails: validatedData.includeThumbnails,
      customFields: validatedData.customFields
    };

    // Create export job
    const jobId = await exportManager.createExportJob(options);

    return NextResponse.json({
      success: true,
      jobId,
      message: 'Export job created successfully',
      status: 'pending'
    });
  } catch (error) {
    console.error('Export creation failed:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to create export job',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    // Return supported formats and options
    const supportedFormats = [
      { value: 'json', label: 'JSON', description: 'Full structured data with all metadata' },
      { value: 'csv', label: 'CSV', description: 'Spreadsheet-compatible format' },
      { value: 'pdf', label: 'PDF', description: 'Formatted reports with charts' },
      { value: 'zip', label: 'ZIP', description: 'Complete backup with images' },
      { value: 'xml', label: 'XML', description: 'Alternative structured format' },
      { value: 'xlsx', label: 'Excel (.xlsx)', description: 'Business-friendly format' }
    ];

    const filterOptions = {
      analysisTypes: ['photo', 'trichome', 'health', 'pest', 'disease'],
      imageQualities: ['high', 'medium', 'low'],
      customFields: ['plants', 'strains', 'rooms', 'sensors', 'automationRules', 'notifications']
    };

    return NextResponse.json({
      success: true,
      supportedFormats,
      filterOptions
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve export options'
    }, { status: 500 });
  }
}
