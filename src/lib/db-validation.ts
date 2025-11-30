import { prisma } from './prisma';

/**
 * Database Validation and Integrity Checker
 * Ensures data consistency and validates constraints
 */

export interface ValidationResult {
  table: string;
  passed: boolean;
  errors: string[];
  warnings: string[];
  stats?: any;
}

export interface DatabaseIntegrityReport {
  timestamp: Date;
  totalChecks: number;
  passed: number;
  failed: number;
  results: ValidationResult[];
}

class DatabaseValidator {
  /**
   * Validates foreign key relationships
   */
  async validateForeignKeys(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    // Validate Sensor -> Room relationship
    const orphanedSensors = await prisma.sensor.findMany({
      where: {
        locationId: { not: null },
        room: null,
      },
      select: { id: true, name: true, locationId: true },
    });

    results.push({
      table: 'Sensor',
      passed: orphanedSensors.length === 0,
      errors: orphanedSensors.map(s => `Sensor ${s.name} (${s.id}) references non-existent Room ${s.locationId}`),
      warnings: [],
      stats: { orphanedCount: orphanedSensors.length },
    });

    // Validate Plant -> Room relationship
    const orphanedPlants = await prisma.plant.findMany({
      where: {
        locationId: { not: null },
        room: null,
      },
      select: { id: true, name: true, locationId: true },
    });

    results.push({
      table: 'Plant',
      passed: orphanedPlants.length === 0,
      errors: orphanedPlants.map(p => `Plant ${p.name} (${p.id}) references non-existent Room ${p.locationId}`),
      warnings: [],
      stats: { orphanedCount: orphanedPlants.length },
    });

    // Validate Plant -> Strain relationship
    const orphanedPlantsFromStrain = await prisma.plant.findMany({
      where: {
        strainId: { not: null },
        strain: null,
      },
      select: { id: true, name: true, strainId: true },
    });

    results.push({
      table: 'Plant',
      passed: orphanedPlantsFromStrain.length === 0,
      errors: orphanedPlantsFromStrain.map(p => `Plant ${p.name} (${p.id}) references non-existent Strain ${p.strainId}`),
      warnings: [],
      stats: { orphanedCount: orphanedPlantsFromStrain.length },
    });

    // Validate SensorReading -> Sensor
    const orphanedReadings = await prisma.sensorReading.findMany({
      where: {
        sensor: null,
      },
      select: { id: true, sensorId: true },
      take: 10,
    });

    results.push({
      table: 'SensorReading',
      passed: orphanedReadings.length === 0,
      errors: orphanedReadings.map(r => `SensorReading ${r.id} references non-existent Sensor ${r.sensorId}`),
      warnings: orphanedReadings.length > 10 ? ['More than 10 orphaned records found'] : [],
      stats: { orphanedCount: orphanedReadings.length, sampleLimit: 10 },
    });

    // Validate SensorAnalytics -> Sensor
    const orphanedAnalytics = await prisma.sensorAnalytics.findMany({
      where: {
        sensor: null,
      },
      select: { id: true, sensorId: true },
      take: 10,
    });

    results.push({
      table: 'SensorAnalytics',
      passed: orphanedAnalytics.length === 0,
      errors: orphanedAnalytics.map(a => `SensorAnalytics ${a.id} references non-existent Sensor ${a.sensorId}`),
      warnings: orphanedAnalytics.length > 10 ? ['More than 10 orphaned records found'] : [],
      stats: { orphanedCount: orphanedAnalytics.length, sampleLimit: 10 },
    });

    // Validate PlantHealthAnalytics -> Plant
    const orphanedHealthAnalytics = await prisma.plantHealthAnalytics.findMany({
      where: {
        plant: null,
      },
      select: { id: true, plantId: true },
      take: 10,
    });

    results.push({
      table: 'PlantHealthAnalytics',
      passed: orphanedHealthAnalytics.length === 0,
      errors: orphanedHealthAnalytics.map(a => `PlantHealthAnalytics ${a.id} references non-existent Plant ${a.plantId}`),
      warnings: orphanedHealthAnalytics.length > 10 ? ['More than 10 orphaned records found'] : [],
      stats: { orphanedCount: orphanedHealthAnalytics.length, sampleLimit: 10 },
    });

    // Validate Task -> Plant
    const orphanedTasks = await prisma.task.findMany({
      where: {
        plantId: { not: null },
        plant: null,
      },
      select: { id: true, title: true, plantId: true },
    });

    results.push({
      table: 'Task',
      passed: orphanedTasks.length === 0,
      errors: orphanedTasks.map(t => `Task ${t.title} (${t.id}) references non-existent Plant ${t.plantId}`),
      warnings: [],
      stats: { orphanedCount: orphanedTasks.length },
    });

    // Validate Action -> Plant
    const orphanedActions = await prisma.action.findMany({
      where: {
        plantId: { not: null },
        plant: null,
      },
      select: { id: true, type: true, plantId: true },
    });

    results.push({
      table: 'Action',
      passed: orphanedActions.length === 0,
      errors: orphanedActions.map(a => `Action ${a.type} (${a.id}) references non-existent Plant ${a.plantId}`),
      warnings: [],
      stats: { orphanedCount: orphanedActions.length },
    });

    // Validate PlantAnalysis -> Plant
    const orphanedAnalyses = await prisma.plantAnalysis.findMany({
      where: {
        plantId: { not: null },
        plant: null,
      },
      select: { id: true, plantId: true },
      take: 10,
    });

    results.push({
      table: 'PlantAnalysis',
      passed: orphanedAnalyses.length === 0,
      errors: orphanedAnalyses.map(a => `PlantAnalysis ${a.id} references non-existent Plant ${a.plantId}`),
      warnings: orphanedAnalyses.length > 10 ? ['More than 10 orphaned records found'] : [],
      stats: { orphanedCount: orphanedAnalyses.length, sampleLimit: 10 },
    });

    return results;
  }

  /**
   * Validates data integrity constraints
   */
  async validateDataIntegrity(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    // Check for null values in required fields
    const requiredFieldChecks = [
      { table: 'Room', field: 'name', query: prisma.room.findMany({ where: { name: null } }) },
      { table: 'Sensor', field: 'name', query: prisma.sensor.findMany({ where: { name: null } }) },
      { table: 'Sensor', field: 'type', query: prisma.sensor.findMany({ where: { type: null } }) },
      { table: 'Plant', field: 'name', query: prisma.plant.findMany({ where: { name: null } }) },
      { table: 'Strain', field: 'name', query: prisma.strain.findMany({ where: { name: null } }) },
      { table: 'Strain', field: 'type', query: prisma.strain.findMany({ where: { type: null } }) },
    ];

    for (const check of requiredFieldChecks) {
      const nullRecords = await check.query;
      results.push({
        table: check.table,
        passed: nullRecords.length === 0,
        errors: nullRecords.length > 0 ? [`Found ${nullRecords.length} records with null ${check.field}`] : [],
        warnings: [],
        stats: { nullCount: nullRecords.length },
      });
    }

    // Check for duplicate names in unique fields
    const duplicateChecks = [
      { table: 'Strain', field: 'name', query: prisma.strain.groupBy({ by: ['name'], having: { name: { _count: { gt: 1 } } } }) },
      { table: 'NotificationTemplate', field: 'name', query: prisma.notificationTemplate.groupBy({ by: ['name'], having: { name: { _count: { gt: 1 } } } }) },
      { table: 'AlertThreshold', field: 'name', query: prisma.alertThreshold.groupBy({ by: ['name'], having: { name: { _count: { gt: 1 } } } }) },
      { table: 'DailyReport', field: 'date', query: prisma.dailyReport.groupBy({ by: ['date'], having: { date: { _count: { gt: 1 } } } }) },
    ];

    for (const check of duplicateChecks) {
      const duplicates = await check.query;
      results.push({
        table: check.table,
        passed: duplicates.length === 0,
        errors: duplicates.length > 0 ? [`Found ${duplicates.length} duplicate ${check.field} values`] : [],
        warnings: [],
        stats: { duplicateCount: duplicates.length },
      });
    }

    // Check numeric ranges
    const numericRangeChecks = [
      {
        table: 'PlantHealthAnalytics',
        field: 'healthScore',
        min: 0,
        max: 100,
        query: prisma.plantHealthAnalytics.findMany({
          where: {
            OR: [
              { healthScore: { lt: 0 } },
              { healthScore: { gt: 100 } },
            ],
          },
        }),
      },
      {
        table: 'SensorAnalytics',
        field: 'anomalyScore',
        min: 0,
        max: 1,
        query: prisma.sensorAnalytics.findMany({
          where: {
            anomalyScore: {
              not: null,
              OR: [
                { anomalyScore: { lt: 0 } },
                { anomalyScore: { gt: 1 } },
              ],
            },
          },
        }),
      },
    ];

    for (const check of numericRangeChecks) {
      const invalidRecords = await check.query;
      results.push({
        table: check.table,
        passed: invalidRecords.length === 0,
        errors: invalidRecords.length > 0 ? [`Found ${invalidRecords.length} records with ${check.field} outside range [${check.min}, ${check.max}]`] : [],
        warnings: [],
        stats: { invalidCount: invalidRecords.length },
      });
    }

    // Check for negative durations/times
    const negativeChecks = [
      {
        table: 'APIPerformanceMetrics',
        field: 'responseTime',
        query: prisma.aPIPerformanceMetrics.findMany({
          where: { responseTime: { lt: 0 } },
        }),
      },
    ];

    for (const check of negativeChecks) {
      const negativeRecords = await check.query;
      results.push({
        table: check.table,
        passed: negativeRecords.length === 0,
        errors: negativeRecords.length > 0 ? [`Found ${negativeRecords.length} records with negative ${check.field}`] : [],
        warnings: [],
        stats: { negativeCount: negativeRecords.length },
      });
    }

    return results;
  }

  /**
   * Validates enum values (status, severity, type, etc.)
   */
  async validateEnumValues(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    // Define allowed values for enum-like fields
    const enumValidations = [
      {
        table: 'SensorAnalytics',
        field: 'status',
        allowedValues: ['normal', 'warning', 'critical'],
        query: prisma.sensorAnalytics.findMany({
          where: {
            status: {
              notIn: ['normal', 'warning', 'critical'],
            },
          },
          select: { id: true, status: true },
          take: 10,
        }),
      },
      {
        table: 'PlantHealthAnalytics',
        field: 'healthStatus',
        allowedValues: ['excellent', 'good', 'fair', 'poor', 'critical'],
        query: prisma.plantHealthAnalytics.findMany({
          where: {
            healthStatus: {
              notIn: ['excellent', 'good', 'fair', 'poor', 'critical'],
            },
          },
          select: { id: true, healthStatus: true },
          take: 10,
        }),
      },
      {
        table: 'WebhookDelivery',
        field: 'status',
        allowedValues: ['pending', 'success', 'failed', 'retry'],
        query: prisma.webhookDelivery.findMany({
          where: {
            status: {
              notIn: ['pending', 'success', 'failed', 'retry'],
            },
          },
          select: { id: true, status: true },
          take: 10,
        }),
      },
      {
        table: 'NotificationDelivery',
        field: 'status',
        allowedValues: ['pending', 'sent', 'delivered', 'failed'],
        query: prisma.notificationDelivery.findMany({
          where: {
            status: {
              notIn: ['pending', 'sent', 'delivered', 'failed'],
            },
          },
          select: { id: true, status: true },
          take: 10,
        }),
      },
      {
        table: 'Alert',
        field: 'severity',
        allowedValues: ['info', 'warning', 'critical'],
        query: prisma.alert.findMany({
          where: {
            severity: {
              notIn: ['info', 'warning', 'critical'],
            },
          },
          select: { id: true, severity: true },
          take: 10,
        }),
      },
      {
        table: 'Task',
        field: 'status',
        allowedValues: ['pending', 'in_progress', 'completed', 'cancelled'],
        query: prisma.task.findMany({
          where: {
            status: {
              notIn: ['pending', 'in_progress', 'completed', 'cancelled'],
            },
          },
          select: { id: true, status: true },
          take: 10,
        }),
      },
      {
        table: 'Action',
        field: 'status',
        allowedValues: ['pending', 'in_progress', 'completed', 'cancelled'],
        query: prisma.action.findMany({
          where: {
            status: {
              notIn: ['pending', 'in_progress', 'completed', 'cancelled'],
            },
          },
          select: { id: true, status: true },
          take: 10,
        }),
      },
    ];

    for (const validation of enumValidations) {
      const invalidRecords = await validation.query;
      results.push({
        table: validation.table,
        passed: invalidRecords.length === 0,
        errors: invalidRecords.length > 0
          ? [`Found ${invalidRecords.length} records with invalid ${validation.field} value. Allowed: ${validation.allowedValues.join(', ')}`]
          : [],
        warnings: invalidRecords.length > 10 ? ['More than 10 invalid records found'] : [],
        stats: {
          invalidCount: invalidRecords.length,
          allowedValues: validation.allowedValues,
          sampleLimit: 10,
        },
      });
    }

    return results;
  }

  /**
   * Validates timestamp consistency
   */
  async validateTimestamps(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    // Check for future timestamps
    const futureDate = new Date();
    futureDate.setHours(futureDate.getHours() + 1); // Allow 1 hour clock skew

    const futureSensorReadings = await prisma.sensorReading.findMany({
      where: {
        timestamp: { gt: futureDate },
      },
      select: { id: true, timestamp: true },
      take: 10,
    });

    results.push({
      table: 'SensorReading',
      passed: futureSensorReadings.length === 0,
      errors: futureSensorReadings.length > 0 ? [`Found ${futureSensorReadings.length} records with future timestamps`] : [],
      warnings: futureSensorReadings.length > 0 ? ['Check system clock synchronization'] : [],
      stats: { futureCount: futureSensorReadings.length, sampleLimit: 10 },
    });

    // Check for createdAt > updatedAt (shouldn't happen)
    const invalidTimestamps = await prisma.plant.findMany({
      where: {
        AND: [
          { createdAt: { not: null } },
          { updatedAt: { not: null } },
          { createdAt: { gt: prisma.$queryRaw`updatedAt` } },
        ],
      },
      select: { id: true, name: true, createdAt: true, updatedAt: true },
      take: 10,
    });

    results.push({
      table: 'Plant',
      passed: invalidTimestamps.length === 0,
      errors: invalidTimestamps.length > 0 ? [`Found ${invalidTimestamps.length} records where createdAt > updatedAt`] : [],
      warnings: [],
      stats: { invalidCount: invalidTimestamps.length, sampleLimit: 10 },
    });

    return results;
  }

  /**
   * Runs all validation checks
   */
  async validateAll(): Promise<DatabaseIntegrityReport> {
    console.log('Starting database validation...');

    const foreignKeyResults = await this.validateForeignKeys();
    const integrityResults = await this.validateDataIntegrity();
    const enumResults = await this.validateEnumValues();
    const timestampResults = await this.validateTimestamps();

    const allResults = [
      ...foreignKeyResults,
      ...integrityResults,
      ...enumResults,
      ...timestampResults,
    ];

    const passed = allResults.filter(r => r.passed).length;
    const failed = allResults.filter(r => !r.passed).length;

    const report: DatabaseIntegrityReport = {
      timestamp: new Date(),
      totalChecks: allResults.length,
      passed,
      failed,
      results: allResults,
    };

    console.log(`Validation complete: ${passed}/${allResults.length} checks passed`);

    return report;
  }

  /**
   * Fixes common data integrity issues
   */
  async autoFix(): Promise<{ fixed: number; errors: string[] }> {
    let fixed = 0;
    const errors: string[] = [];

    try {
      // Note: SQLite doesn't support ON DELETE CASCADE by default
      // In production, manual cleanup would be needed

      console.log('Auto-fix not fully implemented for SQLite');
      console.log('Manual review of orphaned records recommended');
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Unknown error during auto-fix');
    }

    return { fixed, errors };
  }
}

export const dbValidator = new DatabaseValidator();
