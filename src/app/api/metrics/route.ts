/**
 * ========================================
 * Prometheus Metrics Endpoint
 * ========================================
 * Exposes application metrics for Prometheus scraping
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { redis } from '@/redis-client';

export async function GET() {
  try {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    let dbConnections = 0;
    let redisConnections = 0;

    try {
      // Get DB connection pool info
      dbConnections = await prisma.$queryRaw`
        SELECT count(*) as count
        FROM pg_stat_activity
        WHERE state = 'active'
      ` as any;
    } catch (error) {
      // Ignore if can't get DB stats
    }

    try {
      // Get Redis info
      const redisInfo = await redis.info('clients');
      redisConnections = parseInt(redisInfo.match(/connected_clients:(\d+)/)?.[1] || '0');
    } catch (error) {
      // Ignore if can't get Redis stats
    }

    const metrics = `# HELP cannaai_app_info Application information
# TYPE cannaai_app_info gauge
cannaai_app_info{version="${process.env.npm_package_version || '1.0.0'}"} 1

# HELP cannaai_memory_usage_bytes Memory usage in bytes
# TYPE cannaai_memory_usage_bytes gauge
cannaai_memory_usage_bytes{rtype="rss"} ${memUsage.rss}
cannaai_memory_usage_bytes{rtype="heap_total"} ${memUsage.heapTotal}
cannaai_memory_usage_bytes{rtype="heap_used"} ${memUsage.heapUsed}
cannaai_memory_usage_bytes{rtype="external"} ${memUsage.external}

# HELP cannaai_cpu_usage_microseconds CPU usage in microseconds
# TYPE cannaai_cpu_usage_microseconds gauge
cannaai_cpu_usage_microseconds{rtype="user"} ${cpuUsage.user}
cannaai_cpu_usage_microseconds{rtype="system"} ${cpuUsage.system}

# HELP cannaai_uptime_seconds Application uptime in seconds
# TYPE cannaai_uptime_seconds gauge
cannaai_uptime_seconds ${process.uptime()}

# HELP cannaai_database_connections Active database connections
# TYPE cannaai_database_connections gauge
cannaai_database_connections ${Array.isArray(dbConnections) ? dbConnections[0]?.count || 0 : 0}

# HELP cannaai_redis_connections Active Redis connections
# TYPE cannaai_redis_connections gauge
cannaai_redis_connections ${redisConnections}

# HELP cannaai_requests_total Total number of requests
# TYPE cannaai_requests_total counter
cannaai_requests_total 1

# HELP cannaai_requests_in_progress Number of requests in progress
# TYPE cannaai_requests_in_progress gauge
cannaai_requests_in_progress 0

# HELP cannaai_response_time_seconds Response time in seconds
# TYPE cannaai_response_time_seconds histogram
cannaai_response_time_seconds_bucket{le="0.1"} 0
cannaai_response_time_seconds_bucket{le="0.5"} 0
cannaai_response_time_seconds_bucket{le="1"} 0
cannaai_response_time_seconds_bucket{le="5"} 0
cannaai_response_time_seconds_bucket{le="10"} 0
cannaai_response_time_seconds_bucket{le="+Inf"} 0
cannaai_response_time_seconds_sum 0
cannaai_response_time_seconds_count 0

# HELP cannaai_errors_total Total number of errors
# TYPE cannaai_errors_total counter
cannaai_errors_total 0

# HELP cannaai_cache_hits_total Total number of cache hits
# TYPE cannaai_cache_hits_total counter
cannaai_cache_hits_total 0

# HELP cannaai_cache_misses_total Total number of cache misses
# TYPE cannaai_cache_misses_total counter
cannaai_cache_misses_total 0

# HELP cannaai_active_websocket_connections Active WebSocket connections
# TYPE cannaai_active_websocket_connections gauge
cannaai_active_websocket_connections 0

# HELP cannaai_images_processed_total Total number of images processed
# TYPE cannaai_images_processed_total counter
cannaai_images_processed_total 0

# HELP cannaai_ai_requests_total Total number of AI requests
# TYPE cannaai_ai_requests_total counter
cannaai_ai_requests_total 0

# HELP cannaai_ai_request_duration_seconds AI request duration in seconds
# TYPE cannaai_ai_request_duration_seconds histogram
cannaai_ai_request_duration_seconds_bucket{le="1"} 0
cannaai_ai_request_duration_seconds_bucket{le="3"} 0
cannaai_ai_request_duration_seconds_bucket{le="5"} 0
cannaai_ai_request_duration_seconds_bucket{le="10"} 0
cannaai_ai_request_duration_seconds_bucket{le="+Inf"} 0
cannaai_ai_request_duration_seconds_sum 0
cannaai_ai_request_duration_seconds_count 0
`;

    return new NextResponse(metrics, {
      headers: {
        'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      },
    });
  } catch (error) {
    console.error('Metrics endpoint error:', error);
    return NextResponse.json(
      { error: 'Failed to generate metrics' },
      { status: 500 }
    );
  }
}
