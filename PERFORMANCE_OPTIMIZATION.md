# Performance Optimization Guide

## Overview

This document outlines comprehensive performance optimizations implemented for the CultivAI Pro production deployment.

## Key Metrics Targets

- **Page Load Time**: < 2 seconds
- **First Contentful Paint (FCP)**: < 1.5 seconds
- **Largest Contentful Paint (LCP)**: < 2.5 seconds
- **First Input Delay (FID)**: < 100ms
- **Cumulative Layout Shift (CLS)**: < 0.1
- **Time to Interactive (TTI)**: < 3 seconds
- **API Response Time**: < 500ms (95th percentile)

## 1. Build Optimizations

### Bundle Splitting

```typescript
// next.config.ts webpack configuration
config.optimization.splitChunks = {
  chunks: 'all',
  minSize: 20000,
  maxSize: 244000,
  cacheGroups: {
    vendor: {
      test: /[\\/]node_modules[\\/]/,
      name: 'vendors',
      priority: 10,
    },
    common: {
      name: 'common',
      minChunks: 2,
      priority: 5,
      reuseExistingChunk: true,
    },
    react: {
      test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
      name: 'react',
      priority: 20,
    },
  },
};
```

### Tree Shaking

- Enabled in production builds
- Dead code elimination
- Unused export removal

### Code Minification

- JavaScript minification via Terser
- CSS minification
- HTML minification

### Source Maps

```typescript
// Production source maps
if (isProduction) {
  config.devtool = 'source-map';
}
```

## 2. Image Optimization

### Next.js Image Component

```typescript
import Image from 'next/image';

// Optimized image loading
<Image
  src="/plant-image.jpg"
  alt="Plant"
  width={500}
  height={300}
  priority
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,..."
  sizes="(max-width: 768px) 100vw, 50vw"
/>
```

### Image Formats

- WebP (primary)
- AVIF (fallback)
- JPEG (last resort)

### Compression Settings

```typescript
// Sharp configuration
const sharp = require('sharp');
sharp(input)
  .jpeg({ quality: 85, progressive: true })
  .webp({ quality: 85 })
  .avif({ quality: 50 })
  .resize(2048, 2048, { fit: 'inside' })
  .toBuffer();
```

## 3. Caching Strategy

### Browser Caching

```
/static/*        -> Cache-Control: public, max-age=31536000, immutable
/images/*        -> Cache-Control: public, max-age=31536000, immutable
/api/*           -> Cache-Control: public, s-maxage=60, stale-while-revalidate=300
```

### CDN Caching

- Static assets served via CDN
- Geographic distribution
- Edge caching for API responses

### Redis Caching

```typescript
// Cache frequently accessed data
const cachedData = await cache.get(`plants:${plantId}`);

if (!cachedData) {
  const data = await fetchPlantData(plantId);
  await cache.set(`plants:${plantId}`, data, { ttl: 3600 });
  return data;
}

return cachedData;
```

### Database Query Caching

```typescript
// Prisma query optimization
const plants = await prisma.plant.findMany({
  include: {
    images: true,
    sensor: true,
  },
  cache: {
    ttl: 300, // 5 minutes
    tag: ['plants'],
  },
});
```

## 4. API Optimizations

### Response Compression

```typescript
// Enable gzip/brotli compression
const compression = require('compression');
app.use(compression());
```

### API Response Optimization

```typescript
// Return only necessary fields
const getPlant = async (id: string) => {
  const plant = await prisma.plant.findUnique({
    select: {
      id: true,
      name: true,
      strain: true,
      health: true,
      // Only select needed fields
    },
  });

  return plant;
};
```

### Pagination

```typescript
// Implement cursor-based pagination
const getPlants = async (cursor?: string, limit: number = 20) => {
  return await prisma.plant.findMany({
    take: limit + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    orderBy: { id: 'asc' },
  });
};
```

## 5. Database Optimizations

### Connection Pooling

```typescript
// See DATABASE_POOL.md for detailed configuration
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  __datasources: {
    db: {
      options: {
        pool: {
          min: 10,
          max: 100,
          acquireTimeoutMillis: 60000,
        },
      },
    },
  },
});
```

### Query Optimization

```typescript
// Use indexes
CREATE INDEX idx_plant_health ON plants(health);
CREATE INDEX idx_sensor_date ON sensors(created_at);

// Optimize N+1 queries
const plants = await prisma.plant.findMany({
  include: {
    images: true,  // Eager loading instead of N+1
    sensor: {
      take: 1,
      orderBy: { createdAt: 'desc' },
    },
  },
});

// Use batch operations
const createManyPlants = async (plants: Plant[]) => {
  return await prisma.plant.createMany({
    data: plants,
    skipDuplicates: true,
  });
};
```

### Database-Specific Optimizations

#### SQLite

```sql
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA cache_size = 10000;
PRAGMA temp_store = memory;
PRAGMA mmap_size = 268435456;
```

#### PostgreSQL

```ini
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
```

## 6. Frontend Optimizations

### React Performance

```typescript
// Memoization
const PlantCard = React.memo(({ plant }: { plant: Plant }) => {
  return <div>{plant.name}</div>;
});

// useMemo for expensive calculations
const expensiveValue = useMemo(() => {
  return calculateExpensiveValue(plants);
}, [plants]);

// useCallback for event handlers
const handleClick = useCallback((id: string) => {
  onSelect(id);
}, [onSelect]);

// Lazy loading
const LazyComponent = lazy(() => import('./Component'));
```

### State Management

```typescript
// Use Zustand for lightweight state management
const useStore = create<Store>((set) => ({
  plants: [],
  addPlant: (plant) => set((state) => ({ plants: [...state.plants, plant] })),
}));

// Normalize state structure
const normalizedState = useMemo(() => ({
  byId: Object.fromEntries(plants.map(p => [p.id, p])),
  allIds: plants.map(p => p.id),
}), [plants]);
```

### Virtualization

```typescript
// For long lists
import { FixedSizeList as List } from 'react-window';

const VirtualizedList = ({ items }) => (
  <List
    height={600}
    itemCount={items.length}
    itemSize={35}
  >
    {({ index, style }) => (
      <div style={style}>{items[index]}</div>
    )}
  </List>
);
```

## 7. Real-time Optimizations

### WebSocket Management

```typescript
// Connection pooling
const socket = io(serverUrl, {
  transports: ['websocket'],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5,
  timeout: 20000,
});

// Throttle updates
const throttledUpdate = throttle((data) => {
  socket.emit('update', data);
}, 100);
```

### Event Debouncing

```typescript
// Debounce user input
const debouncedSearch = useMemo(
  () => debounce((query: string) => performSearch(query), 300),
  []
);
```

## 8. Monitoring & Profiling

### Performance Monitoring

```typescript
// Web Vitals
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

getCLS(console.log);
getFID(console.log);
getFCP(console.log);
getLCP(console.log);
getTTFB(console.log);

// Custom metrics
import { trackMetric } from '@/lib/analytics';

const startTime = performance.now();
// ... operation
const endTime = performance.now();
trackMetric('operation_duration', endTime - startTime);
```

### Performance Budgets

```json
{
  "budget": [
    {
      "type": "initial",
      "maximumWarning": "2s",
      "maximumError": "5s"
    },
    {
      "resourceSizes": {
        "script": "300kb",
        "style": "50kb",
        "image": "500kb"
      }
    }
  ]
}
```

## 9. Load Testing

### K6 Configuration

```javascript
// tests/performance/load-test.js
import http from 'k6/http';
import { check } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 200 }, // Ramp up to 200 users
    { duration: '5m', target: 200 }, // Stay at 200 users
    { duration: '2m', target: 0 },   // Ramp down
  ],
};

export default function () {
  const response = http.get('https://yourdomain.com/api/health');
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
}
```

## 10. Continuous Optimization

### CI/CD Performance Checks

```yaml
# .github/workflows/performance.yml
- name: Run Lighthouse CI
  uses: treosh/lighthouse-ci-action@v9
  with:
    configPath: './lighthouserc.json'
    uploadArtifacts: true
    temporaryPublicStorage: true
```

### A/B Testing

```typescript
// Experiment framework
const experiment = {
  id: 'image-optimization',
  variants: {
    control: 0.5,
    optimized: 0.5,
  },
};

const variant = getVariant(experiment);
```

## Monitoring Tools

1. **Prometheus**: Metrics collection
2. **Grafana**: Visualization
3. **Lighthouse CI**: Performance auditing
4. **Web Vitals**: Core web metrics
5. **Sentry**: Error tracking
6. **New Relic**: APM

## Performance Checklist

- [ ] Bundle size analysis completed
- [ ] Image optimization implemented
- [ ] Caching strategy configured
- [ ] Database queries optimized
- [ ] Connection pooling configured
- [ ] CDN configured
- [ ] Compression enabled
- [ ] Lazy loading implemented
- [ ] Code splitting configured
- [ ] Monitoring set up
- [ ] Load testing performed
- [ ] Performance budgets defined
- [ ] Core Web Vitals monitored
