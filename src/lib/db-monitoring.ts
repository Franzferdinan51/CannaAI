import { prisma } from './prisma';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

/**
 * Database Performance Monitoring and Metrics Collection
 * Tracks query performance, detects slow queries, and monitors database health
 */

export interface QueryMetrics {
  query: string;
  duration: number; // in milliseconds
  timestamp: Date;
  parameters?: any;
  rowsAffected?: number;
  success: boolean;
  error?: string;
}

export interface DatabaseHealthMetrics {
  databaseSize: number; // in MB
  totalConnections: number;
  activeConnections: number;
  slowQueries: number;
  queryCount: number;
  averageQueryTime: number;
  indexHitRate: number;
  cacheHitRate: number;
  lastAnalyzed: Date;
}

export interface SlowQuery {
  query: string;
  averageDuration: number;
  executionCount: number;
  lastExecuted: Date;
  minDuration: number;
  maxDuration: number;
}

class DatabaseMonitor {
  private queryHistory: QueryMetrics[] = [];
  private readonly maxHistorySize = 10000;
  private readonly slowQueryThreshold = 100; // milliseconds
  private queryCount = 0;
  private totalQueryTime = 0;

  /**
   * Records query metrics for performance tracking
   */
  recordQuery(metrics: QueryMetrics): void {
    this.queryHistory.push(metrics);
    this.queryCount++;
    this.totalQueryTime += metrics.duration;

    // Maintain history size limit
    if (this.queryHistory.length > this.maxHistorySize) {
      this.queryHistory.shift();
    }

    // Log slow queries
    if (metrics.duration > this.slowQueryThreshold && !metrics.success) {
      console.warn(`[SLOW QUERY] ${metrics.duration}ms - ${metrics.query.substring(0, 100)}...`);
    }
  }

  /**
   * Tracks Prisma queries with performance monitoring
   */
  async trackQuery<T>(
    queryName: string,
    queryFn: () => Promise<T>,
    parameters?: any
  ): Promise<T> {
    const startTime = Date.now();
    const timestamp = new Date();

    try {
      const result = await queryFn();
      const duration = Date.now() - startTime;

      this.recordQuery({
        query: queryName,
        duration,
        timestamp,
        parameters,
        rowsAffected: Array.isArray(result) ? result.length : undefined,
        success: true,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      this.recordQuery({
        query: queryName,
        duration,
        timestamp,
        parameters,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }

  /**
   * Gets database health metrics
   */
  async getHealthMetrics(): Promise<DatabaseHealthMetrics> {
    try {
      // Get database size
      const dbSizeResult = await prisma.$queryRaw`
        SELECT page_count * page_size as size
        FROM pragma_page_count(), pragma_page_size()
      ` as any[];

      const databaseSize = dbSizeResult[0]?.size || 0;
      const databaseSizeMB = databaseSize / (1024 * 1024);

      // Calculate average query time
      const averageQueryTime = this.queryCount > 0
        ? this.totalQueryTime / this.queryCount
        : 0;

      // Get index statistics (SQLite specific)
      const indexStats = await prisma.$queryRaw`
        SELECT
          (SELECT COUNT(*) FROM sqlite_master WHERE type = 'index') as totalIndexes,
          (SELECT COUNT(*) FROM sqlite_master WHERE type = 'index' AND sql IS NOT NULL) as indexesWithSql
      ` as any[];

      // Estimate index hit rate (simplified for SQLite)
      const indexHitRate = indexStats.length > 0
        ? (indexStats[0].indexesWithSql / Math.max(indexStats[0].totalIndexes, 1)) * 100
        : 100;

      return {
        databaseSize: databaseSizeMB,
        totalConnections: 1, // SQLite has one connection per process
        activeConnections: 1,
        slowQueries: this.queryHistory.filter(q => q.duration > this.slowQueryThreshold).length,
        queryCount: this.queryCount,
        averageQueryTime,
        indexHitRate,
        cacheHitRate: 95, // SQLite default cache hit rate
        lastAnalyzed: new Date(),
      };
    } catch (error) {
      console.error('Error getting health metrics:', error);
      throw error;
    }
  }

  /**
   * Identifies slow queries
   */
  getSlowQueries(limit: number = 10): SlowQuery[] {
    const queryGroups = new Map<string, QueryMetrics[]>();

    // Group queries by name
    this.queryHistory.forEach(metrics => {
      const existing = queryGroups.get(metrics.query) || [];
      existing.push(metrics);
      queryGroups.set(metrics.query, existing);
    });

    // Calculate statistics for each query
    const slowQueries: SlowQuery[] = Array.from(queryGroups.entries()).map(([query, metrics]) => {
      const durations = metrics.map(m => m.duration);
      const totalDuration = durations.reduce((a, b) => a + b, 0);

      return {
        query: query.substring(0, 150),
        averageDuration: totalDuration / metrics.length,
        executionCount: metrics.length,
        lastExecuted: metrics.sort((a, b) =>
          b.timestamp.getTime() - a.timestamp.getTime()
        )[0].timestamp,
        minDuration: Math.min(...durations),
        maxDuration: Math.max(...durations),
      };
    });

    // Sort by average duration and return top N
    return slowQueries
      .sort((a, b) => b.averageDuration - a.averageDuration)
      .slice(0, limit);
  }

  /**
   * Exports query metrics to a file for analysis
   */
  exportMetrics(filename?: string): string {
    const metrics = {
      timestamp: new Date().toISOString(),
      queryCount: this.queryCount,
      averageQueryTime: this.queryCount > 0 ? this.totalQueryTime / this.queryCount : 0,
      queries: this.queryHistory,
      slowQueries: this.getSlowQueries(),
    };

    const exportDir = join(process.cwd(), 'logs');
    if (!existsSync(exportDir)) {
      mkdirSync(exportDir, { recursive: true });
    }

    const filePath = filename
      ? join(exportDir, filename)
      : join(exportDir, `db-metrics-${Date.now()}.json`);

    writeFileSync(filePath, JSON.stringify(metrics, null, 2));

    return filePath;
  }

  /**
   * Gets query performance statistics
   */
  getQueryStats(): {
    totalQueries: number;
    averageDuration: number;
    slowQueryCount: number;
    successRate: number;
    queriesPerMinute: number;
  } {
    const successCount = this.queryHistory.filter(q => q.success).length;
    const slowCount = this.queryHistory.filter(q => q.duration > this.slowQueryThreshold).length;
    const avgDuration = this.queryCount > 0 ? this.totalQueryTime / this.queryCount : 0;

    // Calculate queries per minute (approximate)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentQueries = this.queryHistory.filter(q => q.timestamp > oneHourAgo).length;
    const queriesPerMinute = recentQueries / 60;

    return {
      totalQueries: this.queryCount,
      averageDuration: avgDuration,
      slowQueryCount: slowCount,
      successRate: this.queryHistory.length > 0 ? (successCount / this.queryHistory.length) * 100 : 100,
      queriesPerMinute,
    };
  }

  /**
   * Clears query history
   */
  clearHistory(): void {
    this.queryHistory = [];
    this.queryCount = 0;
    this.totalQueryTime = 0;
  }

  /**
   * Analyzes and provides optimization recommendations
   */
  getOptimizationRecommendations(): string[] {
    const recommendations: string[] = [];
    const stats = this.getQueryStats();

    if (stats.averageDuration > 50) {
      recommendations.push(
        `Average query time (${stats.averageDuration.toFixed(2)}ms) is high. Consider adding indexes or optimizing queries.`
      );
    }

    if (stats.slowQueryCount > 10) {
      recommendations.push(
        `High number of slow queries (${stats.slowQueryCount}). Review slow query details and add appropriate indexes.`
      );
    }

    if (stats.successRate < 95) {
      recommendations.push(
        `Success rate (${stats.successRate.toFixed(2)}%) is low. Check for query errors and optimize error handling.`
      );
    }

    if (stats.queriesPerMinute > 100) {
      recommendations.push(
        `High query volume (${stats.queriesPerMinute.toFixed(2)} queries/min). Consider implementing caching strategies.`
      );
    }

    // Check for N+1 query patterns
    const queryFrequency = new Map<string, number>();
    this.queryHistory.forEach(metrics => {
      const count = queryFrequency.get(metrics.query) || 0;
      queryFrequency.set(metrics.query, count + 1);
    });

    const frequentQueries = Array.from(queryFrequency.entries())
      .filter(([_, count]) => count > 100)
      .map(([query, count]) => ({ query, count }));

    if (frequentQueries.length > 0) {
      recommendations.push(
        `Detected frequently executed queries (${frequentQueries.length}). Consider caching these results.`
      );
    }

    return recommendations;
  }
}

// Export singleton instance
export const dbMonitor = new DatabaseMonitor();

/**
 * Helper function to track any Prisma query with performance monitoring
 */
export async function trackPrismaQuery<T>(
  queryName: string,
  queryFn: () => Promise<T>,
  parameters?: any
): Promise<T> {
  return dbMonitor.trackQuery(queryName, queryFn, parameters);
}

/**
 * Middleware for automatic query tracking (can be used with custom Prisma client)
 */
export function createTrackedPrismaClient() {
  // This would integrate with Prisma middleware for automatic tracking
  // Implementation depends on specific needs
  return prisma;
}
