# Database Connection Pooling Configuration

## Overview

This document describes the production-ready database connection pooling configuration for the CultivAI Pro application.

## Configuration

### Environment Variables

```env
# Pool Settings
DATABASE_MAX_CONNECTIONS=100
DATABASE_CONNECTION_TIMEOUT=30000
DATABASE_IDLE_TIMEOUT=600000
DATABASE_POOL_MIN=10
DATABASE_POOL_MAX=100
DATABASE_POOL_ACQUIRE_TIMEOUT=60000
DATABASE_POOL_IDLE_TIMEOUT=300000
DATABASE_POOL_EVICT_RUN_INTERVAL=60000
DATABASE_POOL_MAX_USAGE_COUNT=0
```

### Prisma Client Configuration

```typescript
// lib/prisma.ts
import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const prismaClientSingleton = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    // Connection pool configuration
    __datasources: {
      db: {
        options: {
          pool: {
            min: parseInt(process.env.DATABASE_POOL_MIN || '10'),
            max: parseInt(process.env.DATABASE_POOL_MAX || '100'),
            acquireTimeoutMillis: parseInt(process.env.DATABASE_POOL_ACQUIRE_TIMEOUT || '60000'),
            createTimeoutMillis: parseInt(process.env.DATABASE_POOL_CREATE_TIMEOUT || '30000'),
            destroyTimeoutMillis: parseInt(process.env.DATABASE_POOL_DESTROY_TIMEOUT || '5000'),
            idleTimeoutMillis: parseInt(process.env.DATABASE_POOL_IDLE_TIMEOUT || '300000'),
            reapIntervalMillis: parseInt(process.env.DATABASE_POOL_EVICT_RUN_INTERVAL || '60000'),
            createRetryIntervalMillis: parseInt(process.env.DATABASE_POOL_CREATE_RETRY_INTERVAL || '200'),
          },
        },
      },
    },
  });
};

export const prisma = globalThis.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma;
```

### PostgreSQL-Specific Configuration

For PostgreSQL, additional tuning in `postgresql.conf`:

```ini
# Connection Settings
max_connections = 200
superuser_reserved_connections = 3

# Memory Settings
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 64MB

# Checkpoint Settings
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100

# Query Planner
random_page_cost = 1.1
effective_io_concurrency = 200
```

## Monitoring

### Metrics to Track

1. **Active Connections**: Number of currently active connections
2. **Idle Connections**: Number of idle connections in the pool
3. **Waiting Queries**: Number of queries waiting for a connection
4. **Connection Time**: Time to acquire a connection from the pool
5. **Query Execution Time**: Time to execute queries

### Health Check Endpoint

```typescript
// /api/db/health
export async function GET() {
  const pool = prisma.$queryRaw`SELECT 1`;

  const stats = {
    activeConnections: /* get from pg_stat_activity */,
    idleConnections: /* calculate */,
    waitingQueries: /* calculate */,
    totalConnections: /* get from settings */,
  };

  return NextResponse.json({
    status: 'healthy',
    pool: stats,
    timestamp: new Date().toISOString(),
  });
}
```

## Best Practices

1. **Pool Sizing**
   - Calculate pool size based on expected concurrent users
   - Formula: (Peak Concurrency × Avg Query Time / 1000) + Buffer
   - Monitor actual usage and adjust accordingly

2. **Connection Management**
   - Always use transactions when needed
   - Don't leave connections open unnecessarily
   - Use connection pooling middleware

3. **Query Optimization**
   - Use indexes on frequently queried columns
   - Optimize N+1 queries with include/select
   - Monitor slow queries and optimize them

4. **Error Handling**
   - Implement retry logic for transient errors
   - Use exponential backoff for failed connections
   - Log connection pool errors

5. **Monitoring**
   - Set up alerts for connection pool exhaustion
   - Monitor connection wait times
   - Track query performance

## Troubleshooting

### Connection Pool Exhaustion

Symptoms:
- Queries timing out
- High connection wait times
- "Too many connections" errors

Solutions:
1. Increase max connections
2. Optimize slow queries
3. Implement query caching
4. Add read replicas

### Connection Leaks

Symptoms:
- Connections never returned to pool
- Growing connection count

Solutions:
1. Use try-with-resources or similar
2. Add connection lifecycle logging
3. Set connection timeout
4. Monitor connection usage patterns

## Performance Tuning

### SQLite Optimization

```sql
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA cache_size = 10000;
PRAGMA temp_store = memory;
PRAGMA mmap_size = 268435456;
PRAGMA foreign_keys = ON;
```

### PostgreSQL Optimization

```sql
-- Set appropriate configuration in postgresql.conf
-- See Configuration section above
```

## Additional Resources

- [Prisma Connection Pool Documentation](https://www.prisma.io/docs/guides/performance-and-optimization/connection-management)
- [PostgreSQL Connection Settings](https://www.postgresql.org/docs/current/runtime-config-connection.html)
- [Connection Pool Best Practices](https://github.com/brettwooldridge/HikariCP/wiki/About-Pool-Sizing)
