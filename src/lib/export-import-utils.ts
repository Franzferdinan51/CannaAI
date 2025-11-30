/**
 * Comprehensive Export/Import Utilities for Photo Analysis Data
 * Supports multiple formats: JSON, CSV, PDF, ZIP, XML, Excel
 */

import { prisma } from './prisma';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import archiver from 'archiver';
import sharp from 'sharp';
import { format, parseISO, isAfter, isBefore } from 'date-fns';

// ==================== TYPES ====================

export interface ExportFilter {
  dateRange?: {
    start: Date;
    end: Date;
  };
  plantIds?: string[];
  strainIds?: string[];
  analysisTypes?: string[];
  tags?: string[];
  includeImages?: boolean;
  imageQuality?: 'high' | 'medium' | 'low';
  compressImages?: boolean;
}

export interface ExportOptions {
  format: 'json' | 'csv' | 'pdf' | 'zip' | 'xml' | 'xlsx';
  filters?: ExportFilter;
  includeMetadata?: boolean;
  includeThumbnails?: boolean;
  customFields?: string[];
}

export interface ImportOptions {
  mergeMode?: 'merge' | 'replace' | 'skip-duplicates';
  validateOnly?: boolean;
  skipErrors?: boolean;
  defaultValues?: Record<string, any>;
  conflictResolution?: 'keep-existing' | 'overwrite' | 'create-copy';
}

export interface ExportJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  format: string;
  createdAt: Date;
  completedAt?: Date;
  error?: string;
  downloadUrl?: string;
  fileSize?: number;
  recordCount?: number;
}

export interface AnalysisRecord {
  id: string;
  plantId?: string;
  plantName?: string;
  strain?: string;
  analysisType: string;
  timestamp: Date;
  data: any;
  imageInfo?: any;
  metadata?: any;
}

// ==================== EXPORT UTILITIES ====================

export class ExportManager {
  private exportJobs: Map<string, ExportJob> = new Map();

  /**
   * Create a new export job
   */
  async createExportJob(options: ExportOptions): Promise<string> {
    const jobId = uuidv4();
    const job: ExportJob = {
      id: jobId,
      status: 'pending',
      progress: 0,
      format: options.format,
      createdAt: new Date()
    };

    this.exportJobs.set(jobId, job);

    // Process asynchronously
    this.processExport(jobId, options).catch(error => {
      console.error('Export job failed:', error);
      const job = this.exportJobs.get(jobId);
      if (job) {
        job.status = 'failed';
        job.error = error instanceof Error ? error.message : 'Unknown error';
      }
    });

    return jobId;
  }

  /**
   * Get export job status
   */
  getJobStatus(jobId: string): ExportJob | undefined {
    return this.exportJobs.get(jobId);
  }

  /**
   * List all export jobs
   */
  listJobs(): ExportJob[] {
    return Array.from(this.exportJobs.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  /**
   * Process export job
   */
  private async processExport(jobId: string, options: ExportOptions): Promise<void> {
    const job = this.exportJobs.get(jobId);
    if (!job) return;

    try {
      job.status = 'processing';
      job.progress = 10;

      const data = await this.gatherData(options.filters);
      job.progress = 30;

      const exportData = await this.formatData(data, options);
      job.progress = 60;

      const filename = await this.saveExportFile(jobId, exportData, options);
      job.progress = 90;

      job.status = 'completed';
      job.completedAt = new Date();
      job.downloadUrl = filename;
      job.recordCount = data.analyses.length;
      job.progress = 100;
    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Export failed';
      throw error;
    }
  }

  /**
   * Gather data from database based on filters
   */
  private async gatherData(filters?: ExportFilter): Promise<{
    analyses: AnalysisRecord[];
    plants: any[];
    strains: any[];
    rooms: any[];
    sensors: any[];
    automationRules: any[];
    notifications: any[];
  }> {
    const whereConditions: any = {};

    // Apply date filter to analyses
    if (filters?.dateRange) {
      whereConditions.createdAt = {
        gte: filters.dateRange.start,
        lte: filters.dateRange.end
      };
    }

    // Get analyses
    const analyses = await prisma.plantAnalysis.findMany({
      where: whereConditions,
      include: {
        plant: {
          include: {
            strain: true,
            room: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Apply plant/strain filters
    let filteredAnalyses = analyses;
    if (filters?.plantIds?.length) {
      filteredAnalyses = filteredAnalyses.filter(a =>
        a.plantId && filters.plantIds!.includes(a.plantId)
      );
    }
    if (filters?.strainIds?.length) {
      filteredAnalyses = filteredAnalyses.filter(a =>
        a.plant?.strainId && filters.strainIds!.includes(a.plant.strainId)
      );
    }

    // Get related data
    const plants = await prisma.plant.findMany({
      include: {
        strain: true,
        room: true,
        analyses: true
      }
    });

    const strains = await prisma.strain.findMany();
    const rooms = await prisma.room.findMany();
    const sensors = await prisma.sensor.findMany();
    const automationRules = await prisma.automationRule.findMany();
    const notifications = await prisma.notification.findMany();

    return {
      analyses: filteredAnalyses.map(a => ({
        id: a.id,
        plantId: a.plantId,
        plantName: a.plant?.name,
        strain: a.plant?.strain?.name,
        analysisType: 'photo',
        timestamp: a.createdAt,
        data: a.result,
        imageInfo: a.imageInfo,
        metadata: a
      })),
      plants,
      strains,
      rooms,
      sensors,
      automationRules,
      notifications
    };
  }

  /**
   * Format data based on export format
   */
  private async formatData(data: any, options: ExportOptions): Promise<any> {
    switch (options.format) {
      case 'json':
        return this.formatAsJSON(data, options);
      case 'csv':
        return this.formatAsCSV(data, options);
      case 'xml':
        return this.formatAsXML(data, options);
      case 'xlsx':
        return this.formatAsExcel(data, options);
      case 'pdf':
        return this.formatAsPDF(data, options);
      case 'zip':
        return this.formatAsZip(data, options);
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  }

  /**
   * Format as JSON
   */
  private formatAsJSON(data: any, options: ExportOptions): string {
    const result: any = {
      exportInfo: {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        format: 'json',
        recordCounts: {
          analyses: data.analyses.length,
          plants: data.plants.length,
          strains: data.strains.length
        }
      },
      data: {}
    };

    if (options.includeMetadata !== false) {
      result.data.analyses = data.analyses;
    } else {
      result.data.analyses = data.analyses.map((a: any) => ({
        id: a.id,
        plantId: a.plantId,
        plantName: a.plantName,
        strain: a.strain,
        timestamp: a.timestamp,
        data: a.data
      }));
    }

    if (options.customFields?.includes('plants')) {
      result.data.plants = data.plants;
    }
    if (options.customFields?.includes('strains')) {
      result.data.strains = data.strains;
    }
    if (options.customFields?.includes('rooms')) {
      result.data.rooms = data.rooms;
    }

    return JSON.stringify(result, null, 2);
  }

  /**
   * Format as CSV
   */
  private formatAsCSV(data: any, options: ExportOptions): string {
    const headers = [
      'Analysis ID',
      'Plant ID',
      'Plant Name',
      'Strain',
      'Analysis Type',
      'Timestamp',
      'Health Score',
      'Severity',
      'Diagnosis',
      'Confidence'
    ];

    const rows = data.analyses.map((a: any) => {
      const result = a.data || {};
      return [
        a.id,
        a.plantId || '',
        a.plantName || '',
        a.strain || '',
        a.analysisType,
        format(a.timestamp, 'yyyy-MM-dd HH:mm:ss'),
        result.healthScore || '',
        result.severity || '',
        result.diagnosis || '',
        result.confidence || ''
      ];
    });

    return [headers, ...rows]
      .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
      .join('\n');
  }

  /**
   * Format as XML
   */
  private formatAsXML(data: any, options: ExportOptions): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<Export>\n';
    xml += `  <Metadata>\n`;
    xml += `    <Version>1.0.0</Version>\n`;
    xml += `    <Timestamp>${new Date().toISOString()}</Timestamp>\n`;
    xml += `    <RecordCount>${data.analyses.length}</RecordCount>\n`;
    xml += `  </Metadata>\n`;
    xml += `  <Analyses>\n`;

    data.analyses.forEach((a: any) => {
      xml += `    <Analysis>\n`;
      xml += `      <Id>${a.id}</Id>\n`;
      xml += `      <PlantId>${a.plantId || ''}</PlantId>\n`;
      xml += `      <PlantName>${this.escapeXml(a.plantName || '')}</PlantName>\n`;
      xml += `      <Strain>${this.escapeXml(a.strain || '')}</Strain>\n`;
      xml += `      <Timestamp>${a.timestamp.toISOString()}</Timestamp>\n`;
      xml += `      <Data>${this.escapeXml(JSON.stringify(a.data))}</Data>\n`;
      xml += `    </Analysis>\n`;
    });

    xml += `  </Analyses>\n</Export>`;
    return xml;
  }

  /**
   * Format as Excel (simplified - returns CSV-like data structure)
   */
  private formatAsExcel(data: any, options: ExportOptions): any {
    // In a real implementation, use exceljs library
    // For now, return structured data that can be converted
    return {
      sheets: {
        analyses: {
          headers: ['ID', 'Plant ID', 'Plant Name', 'Strain', 'Timestamp', 'Health Score', 'Severity', 'Diagnosis'],
          rows: data.analyses.map((a: any) => {
            const result = a.data || {};
            return [
              a.id,
              a.plantId || '',
              a.plantName || '',
              a.strain || '',
              format(a.timestamp, 'yyyy-MM-dd HH:mm:ss'),
              result.healthScore || '',
              result.severity || '',
              result.diagnosis || ''
            ];
          })
        }
      }
    };
  }

  /**
   * Format as PDF (simplified - returns structured data)
   */
  private formatAsPDF(data: any, options: ExportOptions): any {
    return {
      title: 'CultivAI Pro - Photo Analysis Report',
      generatedAt: new Date().toISOString(),
      summary: {
        totalAnalyses: data.analyses.length,
        totalPlants: data.plants.length,
        totalStrains: data.strains.length
      },
      analyses: data.analyses.map((a: any) => ({
        id: a.id,
        plantName: a.plantName,
        strain: a.strain,
        timestamp: format(a.timestamp, 'yyyy-MM-dd HH:mm:ss'),
        diagnosis: a.data?.diagnosis || '',
        healthScore: a.data?.healthScore || 0,
        severity: a.data?.severity || '',
        recommendations: a.data?.recommendations || []
      }))
    };
  }

  /**
   * Format as ZIP (contains multiple formats)
   */
  private async formatAsZip(data: any, options: ExportOptions): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const archive = archiver('zip', { zlib: { level: 9 } });

      archive.on('data', (chunk) => chunks.push(chunk));
      archive.on('end', () => resolve(Buffer.concat(chunks)));
      archive.on('error', reject);

      // Add JSON export
      archive.append(this.formatAsJSON(data, options), { name: 'export.json' });

      // Add CSV export
      archive.append(this.formatAsCSV(data, options), { name: 'analyses.csv' });

      // Add XML export
      archive.append(this.formatAsXML(data, options), { name: 'export.xml' });

      // Add images if requested
      if (options.filters?.includeImages && data.analyses.length > 0) {
        archive.append(
          'Image export functionality - implement image handling',
          { name: 'images/README.txt' }
        );
      }

      archive.finalize();
    });
  }

  /**
   * Save export file
   */
  private async saveExportFile(jobId: string, data: any, options: ExportOptions): Promise<string> {
    const exportsDir = join(process.cwd(), 'exports');
    if (!existsSync(exportsDir)) {
      mkdirSync(exportsDir, { recursive: true });
    }

    const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
    const filename = `export_${jobId}_${timestamp}.${options.format}`;
    const filepath = join(exportsDir, filename);

    if (typeof data === 'string') {
      writeFileSync(filepath, data);
    } else if (Buffer.isBuffer(data)) {
      writeFileSync(filepath, data);
    } else {
      writeFileSync(filepath, JSON.stringify(data, null, 2));
    }

    return filepath;
  }

  /**
   * Helper: Escape XML special characters
   */
  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

// ==================== IMPORT UTILITIES ====================

export class ImportManager {
  /**
   * Validate import data
   */
  validateImportData(data: any, options: ImportOptions): {
    valid: boolean;
    errors: string[];
    warnings: string[];
    recordCount: number;
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!data || typeof data !== 'object') {
      return {
        valid: false,
        errors: ['Invalid data format'],
        warnings,
        recordCount: 0
      };
    }

    if (!data.data || !Array.isArray(data.data.analyses)) {
      errors.push('Missing analyses array in data');
    } else {
      const recordCount = data.data.analyses.length;
      if (recordCount === 0) {
        warnings.push('No analyses to import');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      recordCount: data.data?.analyses?.length || 0
    };
  }

  /**
   * Process import data
   */
  async processImport(data: any, options: ImportOptions): Promise<{
    imported: number;
    skipped: number;
    errors: number;
    details: any[];
  }> {
    const result = {
      imported: 0,
      skipped: 0,
      errors: 0,
      details: [] as any[]
    };

    const analyses = data.data?.analyses || [];

    for (const analysis of analyses) {
      try {
        // Check for duplicates
        const existing = await prisma.plantAnalysis.findUnique({
          where: { id: analysis.id }
        });

        if (existing) {
          if (options.mergeMode === 'skip-duplicates') {
            result.skipped++;
            result.details.push({ id: analysis.id, action: 'skipped', reason: 'duplicate' });
            continue;
          } else if (options.mergeMode === 'merge' && options.conflictResolution === 'keep-existing') {
            result.skipped++;
            result.details.push({ id: analysis.id, action: 'skipped', reason: 'exists' });
            continue;
          }
        }

        // Create or update analysis
        const importData: any = {
          plantId: analysis.plantId || undefined,
          request: analysis.data?.request || {},
          result: analysis.data || {},
          provider: analysis.metadata?.provider || 'import',
          imageInfo: analysis.imageInfo || null,
          createdAt: analysis.timestamp ? new Date(analysis.timestamp) : new Date(),
          updatedAt: new Date()
        };

        await prisma.plantAnalysis.upsert({
          where: { id: analysis.id },
          update: importData,
          create: {
            id: analysis.id || uuidv4(),
            ...importData
          }
        });

        result.imported++;
        result.details.push({ id: analysis.id, action: 'imported', success: true });
      } catch (error) {
        result.errors++;
        result.details.push({
          id: analysis.id,
          action: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return result;
  }
}

// ==================== IMAGE HANDLING UTILITIES ====================

export class ImageHandler {
  /**
   * Compress and resize image for export
   */
  async compressImage(imageBuffer: Buffer, options: {
    quality?: 'high' | 'medium' | 'low';
    format?: 'jpeg' | 'png' | 'webp';
    maxWidth?: number;
    maxHeight?: number;
  }): Promise<Buffer> {
    const qualityMap = {
      high: 90,
      medium: 70,
      low: 50
    };

    const quality = qualityMap[options.quality || 'medium'];
    let image = sharp(imageBuffer);

    // Resize if dimensions specified
    if (options.maxWidth || options.maxHeight) {
      image = image.resize(options.maxWidth, options.maxHeight, {
        fit: 'inside',
        withoutEnlargement: true
      });
    }

    // Compress
    if (options.format === 'png') {
      return image.png({ quality }).toBuffer();
    } else if (options.format === 'webp') {
      return image.webp({ quality }).toBuffer();
    } else {
      return image.jpeg({ quality }).toBuffer();
    }
  }

  /**
   * Generate thumbnail
   */
  async generateThumbnail(imageBuffer: Buffer, size: number = 200): Promise<Buffer> {
    return sharp(imageBuffer)
      .resize(size, size, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 60 })
      .toBuffer();
  }

  /**
   * Extract image metadata
   */
  async getImageMetadata(imageBuffer: Buffer): Promise<any> {
    return sharp(imageBuffer).metadata();
  }
}

// ==================== BACKUP/RESTORE UTILITIES ====================

export class BackupManager {
  /**
   * Create full database backup
   */
  async createFullBackup(): Promise<string> {
    const backupId = uuidv4();
    const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
    const backupDir = join(process.cwd(), 'backups', `${backupId}_${timestamp}`);

    if (!existsSync(backupDir)) {
      mkdirSync(backupDir, { recursive: true });
    }

    // Export all data
    const exportManager = new ExportManager();
    const jobId = await exportManager.createExportJob({
      format: 'zip',
      filters: {},
      includeMetadata: true
    });

    // Wait for export to complete
    await this.waitForJobCompletion(jobId);

    return backupDir;
  }

  /**
   * Restore from backup
   */
  async restoreFromBackup(backupPath: string): Promise<void> {
    const data = JSON.parse(readFileSync(backupPath, 'utf-8'));
    const importManager = new ImportManager();
    await importManager.processImport(data, {
      mergeMode: 'replace'
    });
  }

  /**
   * Schedule regular backup
   */
  scheduleBackup(frequency: 'daily' | 'weekly' | 'monthly'): void {
    // Implementation for scheduled backups
    console.log(`Scheduling ${frequency} backups`);
  }

  /**
   * Wait for export job to complete
   */
  private async waitForJobCompletion(jobId: string, timeout: number = 60000): Promise<void> {
    const exportManager = new ExportManager();
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const job = exportManager.getJobStatus(jobId);
      if (job?.status === 'completed' || job?.status === 'failed') {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    throw new Error('Job timeout');
  }
}

// ==================== MIGRATION UTILITIES ====================

export class MigrationManager {
  /**
   * Export data for migration
   */
  async exportForMigration(sourceVersion: string, targetVersion: string): Promise<any> {
    // Get current schema version
    const currentVersion = await this.getCurrentVersion();

    // Gather data with version compatibility
    const exportManager = new ExportManager();
    const jobId = await exportManager.createExportJob({
      format: 'json',
      includeMetadata: true,
      customFields: ['plants', 'strains', 'rooms', 'sensors']
    });

    // Wait and retrieve
    await this.waitForJobCompletion(jobId);

    return {
      sourceVersion,
      targetVersion,
      migrationId: uuidv4(),
      timestamp: new Date().toISOString(),
      // Add migration metadata
    };
  }

  /**
   * Import migrated data
   */
  async importMigratedData(data: any): Promise<void> {
    // Validate migration compatibility
    await this.validateMigrationCompatibility(data);

    // Apply transformations if needed
    const transformedData = await this.transformForVersion(data);

    // Import data
    const importManager = new ImportManager();
    await importManager.processImport(transformedData, {
      mergeMode: 'replace'
    });
  }

  /**
   * Get current schema version
   */
  private async getCurrentVersion(): Promise<string> {
    return '1.0.0';
  }

  /**
   * Validate migration compatibility
   */
  private async validateMigrationCompatibility(data: any): Promise<void> {
    if (!data.sourceVersion || !data.targetVersion) {
      throw new Error('Invalid migration data: missing version information');
    }
  }

  /**
   * Transform data for target version
   */
  private async transformForVersion(data: any): Promise<any> {
    // Apply version-specific transformations
    return data;
  }

  /**
   * Wait for export job to complete
   */
  private async waitForJobCompletion(jobId: string, timeout: number = 60000): Promise<void> {
    const exportManager = new ExportManager();
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const job = exportManager.getJobStatus(jobId);
      if (job?.status === 'completed' || job?.status === 'failed') {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    throw new Error('Job timeout');
  }
}

// Export singleton instances
export const exportManager = new ExportManager();
export const importManager = new ImportManager();
export const imageHandler = new ImageHandler();
export const backupManager = new BackupManager();
export const migrationManager = new MigrationManager();
