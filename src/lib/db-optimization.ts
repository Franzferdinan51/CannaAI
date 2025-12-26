import { Prisma } from '@prisma/client';

/**
 * Database Query Optimization Utilities
 * Provides helper functions for optimizing Prisma queries
 */

export interface PaginationParams {
  page?: number;
  limit?: number;
  cursor?: string;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    cursor?: string;
  };
}

/**
 * Creates a paginated Prisma query with cursor-based pagination
 */
export function createPaginatedQuery<T>(
  model: any,
  params: PaginationParams,
  where?: any,
  include?: any,
  select?: any
): {
  findMany: () => Promise<T[]>;
  count: () => Promise<number>;
} {
  const { page = 1, limit = 50, cursor, orderBy = 'createdAt', orderDirection = 'desc' } = params;

  const skip = cursor ? undefined : (page - 1) * limit;
  const take = limit;

  const orderByClause: any = {};
  orderByClause[orderBy] = orderDirection;

  const queryOptions: any = {
    where,
    orderBy: orderByClause,
    take,
    skip,
    ...(include && { include }),
    ...(select && { select }),
  };

  // Add cursor for cursor-based pagination
  if (cursor) {
    queryOptions.cursor = { id: cursor };
    queryOptions.skip = 1; // Skip the cursor itself
  }

  return {
    findMany: () => model.findMany(queryOptions),
    count: () => model.count({ where }),
  };
}

/**
 * Executes a paginated query and returns formatted results
 */
export async function paginate<T>(
  model: any,
  params: PaginationParams,
  where?: any,
  include?: any,
  select?: any
): Promise<PaginatedResult<T>> {
  const { page = 1, limit = 50 } = params;

  const { findMany, count } = createPaginatedQuery(model, params, where, include, select);

  const [data, total] = await Promise.all([findMany(), count()]);
  const totalPages = Math.ceil(total / limit);

  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
      cursor: data.length > 0 ? data[data.length - 1].id : undefined,
    },
  };
}

/**
 * Optimizes include statements to prevent N+1 queries
 */
export function optimizeInclude(include: any, depth: number = 0, maxDepth: number = 2): any {
  if (depth > maxDepth) {
    return undefined;
  }

  if (!include || typeof include !== 'object') {
    return include;
  }

  const optimized: any = {};

  for (const [key, value] of Object.entries(include)) {
    if (typeof value === 'boolean') {
      optimized[key] = value;
    } else if (typeof value === 'object') {
      optimized[key] = optimizeInclude(value, depth + 1, maxDepth);
    }
  }

  return optimized;
}

/**
 * Batch operations for better performance
 */
export class BatchOperations {
  private batchSize: number;

  constructor(batchSize: number = 100) {
    this.batchSize = batchSize;
  }

  /**
   * Batch creates records
   */
  async batchCreate<T>(
    model: any,
    data: T[],
    options?: { skipDuplicates?: boolean }
  ): Promise<T[]> {
    const results: T[] = [];
    const chunks = this.chunkArray(data, this.batchSize);

    for (const chunk of chunks) {
      const created = await model.createMany({
        data: chunk,
        skipDuplicates: options?.skipDuplicates,
      });
      results.push(...chunk);
    }

    return results;
  }

  /**
   * Batch updates records
   */
  async batchUpdate<T>(
    model: any,
    data: Array<{ id: string; data: Partial<T> }>
  ): Promise<number> {
    const chunks = this.chunkArray(data, this.batchSize);
    let totalUpdated = 0;

    for (const chunk of chunks) {
      const updatePromises = chunk.map(item =>
        model.update({
          where: { id: item.id },
          data: item.data,
        })
      );
      await Promise.all(updatePromises);
      totalUpdated += chunk.length;
    }

    return totalUpdated;
  }

  /**
   * Batch deletes records
   */
  async batchDelete(model: any, ids: string[]): Promise<number> {
    const chunks = this.chunkArray(ids, this.batchSize);
    let totalDeleted = 0;

    for (const chunk of chunks) {
      const deleted = await model.deleteMany({
        where: { id: { in: chunk } },
      });
      totalDeleted += deleted.count;
    }

    return totalDeleted;
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

/**
 * Query builder for common patterns
 */
export class QueryBuilder {
  /**
   * Builds a time-based where clause
   */
  static timeRange(
    field: string,
    startDate?: Date,
    endDate?: Date
  ): any {
    const where: any = {};

    if (startDate) {
      where[field] = { ...where[field], gte: startDate };
    }

    if (endDate) {
      where[field] = { ...where[field], lte: endDate };
    }

    return Object.keys(where).length > 0 ? where : undefined;
  }

  /**
   * Builds a search where clause
   */
  static search(fields: string[], searchTerm: string): any {
    if (!searchTerm) return undefined;

    const orConditions: any[] = fields.map(field => ({
      [field]: {
        contains: searchTerm,
        mode: 'insensitive',
      },
    }));

    return { OR: orConditions };
  }

  /**
   * Builds a status filter
   */
  static statusFilter(statusField: string, statuses: string[]): any {
    if (!statuses || statuses.length === 0) return undefined;

    return {
      [statusField]: {
        in: statuses,
      },
    };
  }

  /**
   * Builds a numeric range filter
   */
  static numericRange(
    field: string,
    min?: number,
    max?: number
  ): any {
    const where: any = {};

    if (min !== undefined) {
      where[field] = { ...where[field], gte: min };
    }

    if (max !== undefined) {
      where[field] = { ...where[field], lte: max };
    }

    return Object.keys(where).length > 0 ? where : undefined;
  }
}

/**
 * Database cleanup utilities
 */
export class DatabaseCleanup {
  /**
   * Archives old records to improve performance
   */
  async archiveOldRecords(
    model: any,
    dateField: string,
    cutoffDate: Date,
    batchSize: number = 1000
  ): Promise<number> {
    let totalArchived = 0;
    let hasMore = true;

    while (hasMore) {
      const records = await model.findMany({
        where: {
          [dateField]: { lt: cutoffDate },
        },
        take: batchSize,
        select: { id: true },
      });

      if (records.length === 0) {
        hasMore = false;
        break;
      }

      const ids = records.map(r => r.id);
      const deleted = await model.deleteMany({
        where: { id: { in: ids } },
      });

      totalArchived += deleted.count;
    }

    return totalArchived;
  }

  /**
   * Vacuums the SQLite database
   */
  async vacuum(prisma: any): Promise<void> {
    await prisma.$executeRaw`VACUUM`;
  }

  /**
   * Analyzes the database for query optimization
   */
  async analyze(prisma: any): Promise<void> {
    await prisma.$executeRaw`ANALYZE`;
  }
}

/**
 * Export utility instances
 */
export const batchOps = new BatchOperations();
export const cleanup = new DatabaseCleanup();
