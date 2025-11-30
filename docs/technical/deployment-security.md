# Technical Documentation - Architecture, Security & Deployment

## Table of Contents

### Part I: System Architecture
1. [Architecture Overview](#architecture-overview)
2. [Component Diagram](#component-diagram)
3. [Data Flow](#data-flow)
4. [Technology Stack](#technology-stack)
5. [Scalability Considerations](#scalability-considerations)

### Part II: Security
6. [Security Overview](#security-overview)
7. [Authentication & Authorization](#authentication--authorization)
8. [Data Protection](#data-protection)
9. [Input Validation](#input-validation)
10. [Rate Limiting](#rate-limiting)
11. [Security Headers](#security-headers)
12. [Privacy Compliance](#privacy-compliance)

### Part III: Deployment
13. [Deployment Guide](#deployment-guide)
14. [Environment Configuration](#environment-configuration)
15. [Docker Deployment](#docker-deployment)
16. [Cloud Deployment (Vercel/Netlify)](#cloud-deployment-vercelnetlify)
17. [VPS/Server Deployment](#vpsserver-deployment)
18. [Continuous Integration](#continuous-integration)

### Part IV: Monitoring & Maintenance
19. [Monitoring & Alerting](#monitoring--alerting)
20. [Logging Strategy](#logging-strategy)
21. [Performance Tuning](#performance-tuning)
22. [Backup & Recovery](#backup--recovery)

### Part V: Operations
23. [Database Management](#database-management)
24. [Update Procedures](#update-procedures)
25. [Troubleshooting](#troubleshooting)
26. [Maintenance Checklist](#maintenance-checklist)

---

# Part I: System Architecture

## Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            CULTIVAI PRO SYSTEM                              │
│                                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                  │
│  │   FRONTEND   │    │  BACKEND API │    │  AI LAYER    │                  │
│  │              │◄──►│              │◄──►│              │                  │
│  │  Next.js 15  │    │   Routes     │    │  Providers   │                  │
│  │   TypeScript │    │  Security    │    │  (AI/ML)     │                  │
│  └──────────────┘    └──────────────┘    └──────────────┘                  │
│           │                   │                   │                        │
│           │                   │                   │                        │
│           └───────────────────┼───────────────────┘                        │
│                               │                                            │
│                    ┌──────────▼─────────┐                                   │
│                    │   DATA LAYER       │                                   │
│                    │                    │                                   │
│                    │  ┌─────────────┐   │                                   │
│                    │  │ Image Proc. │   │                                   │
│                    │  │ Lib (Sharp) │   │                                   │
│                    │  └─────────────┘   │                                   │
│                    │                    │                                   │
│                    │  ┌─────────────┐   │                                   │
│                    │  │   Database  │   │                                   │
│                    │  │ (Prisma/    │   │                                   │
│                    │  │  SQLite)    │   │                                   │
│                    │  └─────────────┘   │                                   │
│                    └────────────────────┘                                   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                        SUPPORTING SERVICES                           │  │
│  │                                                                       │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌──────────────┐   │  │
│  │  │   Webhook  │  │  Analytics │  │ Monitoring │  │   Cache       │   │  │
│  │  │   System   │  │  Engine    │  │  & Logs    │  │  Layer       │   │  │
│  │  └────────────┘  └────────────┘  └────────────┘  └──────────────┘   │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Architectural Principles

#### 1. **Separation of Concerns**
- Frontend handles UI/UX
- Backend handles business logic
- AI Layer handles analysis
- Data Layer manages persistence

#### 2. **Security First**
- Input validation at all layers
- Authentication required
- Rate limiting enforced
- Data encryption

#### 3. **Performance Optimized**
- Image processing pipeline
- Caching strategies
- Lazy loading
- Optimized queries

#### 4. **Scalability Ready**
- Stateless API design
- Horizontal scaling capable
- Load balancer compatible
- Auto-scaling ready

#### 5. **Developer Friendly**
- TypeScript for type safety
- Comprehensive documentation
- Easy deployment
- Local development setup

---

## Component Diagram

```
                                USER
                                  │
                                  ▼
                    ┌──────────────────────────┐
                    │     FRONTEND LAYER        │
                    │                          │
                    │  ┌────────────────────┐  │
                    │  │  Next.js 15 App    │  │
                    │  │  - Dashboard       │  │
                    │  │  - Analysis Form   │  │
                    │  │  - Results View    │  │
                    │  │  - Settings        │  │
                    │  └────────────────────┘  │
                    └────────────┬─────────────┘
                                 │
                                 │ HTTPS/WSS
                                 ▼
                    ┌──────────────────────────┐
                    │      API GATEWAY          │
                    │                          │
                    │  ┌────────────────────┐  │
                    │  │  Next.js API       │  │
                    │  │  Route Handlers    │  │
                    │  └────────────────────┘  │
                    └────────────┬─────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │     MIDDLEWARE           │
                    │                          │
                    │  ┌────────────────────┐  │
                    │  │  Authentication    │  │
                    │  │  Rate Limiting     │  │
                    │  │  Validation        │  │
                    │  │  Security Headers  │  │
                    │  └────────────────────┘  │
                    └────────────┬─────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │   BUSINESS LOGIC        │
                    │                          │
                    │  ┌────────────────────┐  │
                    │  │  analyze/          │  │
                    │  │  trichome/         │  │
                    │  │  plants/           │  │
                    │  │  analytics/        │  │
                    │  │  history/          │  │
                    │  └────────────────────┘  │
                    └────────────┬─────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │   EXTERNAL SERVICES     │
                    │                          │
                    │  ┌────────────────────┐  │
                    │  │  AI Providers      │  │
                    │  │  - OpenRouter API  │  │
                    │  │  - LM Studio       │  │
                    │  └────────────────────┘  │
                    └────────────┬─────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │    DATA SERVICES        │
                    │                          │
                    │  ┌────────────────────┐  │
                    │  │  Image Processing  │  │
                    │  │  - Sharp           │  │
                    │  │  - HEIC Convert    │  │
                    │  └────────────────────┘  │
                    │                          │
                    │  ┌────────────────────┐  │
                    │  │  Database (SQLite) │  │
                    │  │  - Prisma ORM      │  │
                    │  │  - Migrations      │  │
                    │  └────────────────────┘  │
                    └──────────────────────────┘
```

---

## Data Flow

### Photo Analysis Flow

```
1. USER UPLOADS PHOTO
   │
   ▼
2. FRONTEND
   - Validates file format
   - Shows upload progress
   - Compresses if needed
   │
   ▼
3. API ROUTE (/api/analyze)
   - Receives multipart/form-data
   - Rate limit check
   - Extract base64 from file
   │
   ▼
4. IMAGE PROCESSING (lib/image.ts)
   - Convert HEIC to JPEG
   - Extract metadata
   - Resize/compress
   - Generate data URL
   │
   ▼
5. VALIDATION (Zod)
   - Validate request body
   - Sanitize inputs
   - Check required fields
   │
   ▼
6. AI PROVIDER DETECTION
   - Check OpenRouter
   - Check LM Studio
   - Select available provider
   │
   ▼
7. AI ANALYSIS
   - Build comprehensive prompt
   - Send to AI provider
   - Handle timeout/retry
   - Parse response
   │
   ▼
8. RESPONSE ENHANCEMENT
   - Validate AI response
   - Add metadata
   - Calculate confidence
   - Format results
   │
   ▼
9. DATABASE PERSISTENCE
   - Save analysis record
   - Store metadata
   - Update history
   │
   ▼
10. RESPONSE TO USER
    - JSON response
    - Security headers
    - Rate limit headers
    - Success/error status
```

### Data Persistence Flow

```
ANALYSIS CREATED
       │
       ▼
┌──────────────┐
│  Prisma      │
│  Model:      │
│  PlantAnalysis│
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Prisma Client│
│   (SQLite)   │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  SQLite DB   │
│  db/custom.db│
└──────────────┘
```

---

## Technology Stack

### Core Technologies

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Frontend | Next.js | 15.x | React framework, SSR |
| Language | TypeScript | 5.x | Type safety |
| Styling | Tailwind CSS | 4.x | Utility-first CSS |
| API | Next.js API Routes | - | Serverless functions |
| Database | SQLite | 3.x | Embedded database |
| ORM | Prisma | 5.x | Type-safe database client |
| Image Proc | Sharp | - | High-performance image processing |
| HEIC | heic-convert | - | HEIC to JPEG conversion |
| Validation | Zod | - | Schema validation |
| AI Integration | Native Fetch | - | HTTP client for AI APIs |

### Supporting Libraries

```json
{
  "core": {
    "next": "15.x",
    "react": "18.x",
    "typescript": "5.x"
  },
  "data": {
    "@prisma/client": "5.x",
    "prisma": "5.x",
    "sqlite3": "5.x"
  },
  "image": {
    "sharp": "latest",
    "heic-convert": "latest"
  },
  "validation": {
    "zod": "latest"
  },
  "ui": {
    "tailwindcss": "4.x",
    "framer-motion": "latest"
  }
}
```

---

## Scalability Considerations

### Current Limitations

#### Single Instance (SQLite)
- **Limitation**: SQLite is single-writer
- **Impact**: Concurrent write operations block
- **Mitigation**: Read-mostly workload, async processing

#### Local Storage
- **Limitation**: Filesystem-based storage
- **Impact**: Not suitable for multi-server
- **Solution**: Migrate to PostgreSQL for production

### Scaling Strategies

#### Horizontal Scaling

**Phase 1: Load Balancing**
```
Load Balancer
      │
      ├── Server 1 (Primary)
      ├── Server 2 (Replica)
      └── Server 3 (Replica)
```

**Requirements**:
- Shared database (PostgreSQL)
- Distributed cache (Redis)
- Session storage

**Phase 2: Microservices**
```
API Gateway
     │
     ├── Analysis Service
     ├── Image Service
     ├── AI Proxy Service
     └── Notification Service
```

#### Vertical Scaling

**Current Setup**:
- CPU: 2-4 cores minimum
- RAM: 4GB minimum, 8GB recommended
- Storage: 50GB minimum

**Scaling Up**:
- CPU: 8-16 cores
- RAM: 16-32GB
- Storage: SSD recommended
- Network: High bandwidth

### Performance Optimization

#### Image Processing
- ✓ Adaptive compression (already implemented)
- ✓ Format conversion (HEIC → JPEG)
- ✓ Metadata extraction
- → **Future**: CDN for static images

#### Database Optimization
- ✓ Indexed queries (implemented)
- ✓ Connection pooling
- → **Future**: Query optimization
- → **Future**: Read replicas

#### Caching Strategy
```typescript
// Current: In-memory (basic)
// Future: Redis distributed cache

interface CacheStrategy {
  analysis: {
    ttl: 24 * 60 * 60 * 1000, // 24 hours
    strategy: "plantId + hash"
  };
  provider: {
    ttl: 5 * 60 * 1000, // 5 minutes
    strategy: "provider health"
  };
  images: {
    ttl: 7 * 24 * 60 * 60 * 1000, // 7 days
    strategy: "checksum based"
  };
}
```

---

# Part II: Security

## Security Overview

### Security Principles

1. **Defense in Depth**: Multiple security layers
2. **Zero Trust**: Verify everything
3. **Least Privilege**: Minimal access needed
4. **Fail Secure**: Secure defaults
5. **Privacy First**: Minimal data collection

### Security Layers

```
┌─────────────────────────────────────────────────────────┐
│                    USER BROWSER                          │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  HTTPS/TLS 1.3 - Encrypted in transit           │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                API GATEWAY & MIDDLEWARE                  │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Rate Limiting - Prevent abuse                  │   │
│  │  CORS - Cross-origin control                    │   │
│  │  Security Headers - XSS, CSRF protection       │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                  APPLICATION LAYER                       │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Input Validation - Zod schemas                 │   │
│  │  Sanitization - Clean all inputs                │   │
│  │  Authentication - Verify identity               │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                    DATA LAYER                            │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Encryption at rest - Database encryption       │   │
│  │  Access Control - Role-based permissions        │   │
│  │  Audit Logging - Track all access              │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Threat Model

#### Identified Threats

1. **Injection Attacks**
   - SQL injection (mitigated by Prisma)
   - NoSQL injection (SQLite, parameterized queries)
   - XSS (sanitization in place)

2. **Authentication Threats**
   - Weak authentication (not applicable - no auth system)
   - Session hijacking (no sessions)
   - Credential stuffing (no login)

3. **Authorization Threats**
   - Privilege escalation (single-user app)
   - Unauthorized access (rate limiting)

4. **Data Exposure**
   - Sensitive data in logs (redacted)
   - Data leakage (encrypted at rest)
   - Privacy violations (minimal collection)

5. **Infrastructure**
   - DDoS (rate limiting)
   - Server-side request forgery (URL validation)
   - Unvalidated redirects (none used)

#### Risk Assessment

| Threat | Likelihood | Impact | Risk Level | Mitigation |
|--------|------------|--------|-----------|------------|
| DDoS | Medium | Medium | Medium | Rate limiting |
| XSS | Low | High | Medium | Sanitization |
| Injection | Low | High | Medium | ORM, validation |
| Data leak | Low | High | Medium | Encryption |
| Brute force | Low | Low | Low | Rate limiting |

---

## Authentication & Authorization

### Current State

**No Authentication System**: The current implementation is a single-user application without authentication or authorization.

**Why?**
- Designed for personal/small team use
- AI providers handle their own auth
- Simplifies deployment
- Reduces attack surface

**Implications**:
- Anyone with URL can access
- No user data isolation
- Suitable for trusted environments
- Not suitable for multi-tenant SaaS

### Future Authentication

For multi-user deployments:

#### Option 1: NextAuth.js
```typescript
// NextAuth configuration
import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

export default NextAuth({
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        // Validate against database
      }
    })
  ],
  callbacks: {
    async session({ session, token }) {
      // Add user info to session
      return session;
    }
  }
});
```

#### Option 2: Auth0
```typescript
// Auth0 integration
import { initAuth0 } from '@auth0/nextjs-auth0';

export default initAuth0({
  secret: process.env.AUTH0_SECRET,
  issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL,
  baseURL: process.env.AUTH0_BASE_URL,
  session: {
    rollingDuration: 24 * 60 * 60, // 24 hours
  }
});
```

#### Option 3: Custom JWT
```typescript
// Custom JWT implementation
import jwt from 'jsonwebtoken';

interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

function generateToken(user: User): string {
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET!,
    { expiresIn: '24h' }
  );
}
```

### Row-Level Security (Future)

For multi-user scenarios with Prisma:

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  plants    Plant[]
  analyses  PlantAnalysis[]
}

model Plant {
  id        String   @id @default(cuid())
  userId    String   // Foreign key
  user      User     @relation(fields: [userId], references: [id])
  // ... other fields

  @@index([userId])
}

model PlantAnalysis {
  id        String   @id @default(cuid())
  userId    String   // Foreign key
  user      User     @relation(fields: [userId], references: [id])
  plantId   String?  // Foreign key
  plant     Plant?   @relation(fields: [plantId], references: [id])
  // ... other fields

  @@index([userId])
  @@index([plantId])
}
```

---

## Data Protection

### Data Classification

#### Public Data
- Analysis results (non-sensitive)
- Anonymized statistics
- Public documentation

#### Internal Data
- User preferences (future)
- System configuration
- Performance metrics

#### Confidential Data
- Plant photos
- Grow room details
- Cultivation practices

#### Restricted Data
- API keys (OpenRouter, etc.)
- Personal information (if added)

### Encryption

#### In Transit
```typescript
// HTTPS/TLS 1.3 enforced
// All API endpoints require HTTPS
const isSecure = process.env.NODE_ENV === 'production';

// HSTS headers
response.headers.set(
  'Strict-Transport-Security',
  'max-age=31536000; includeSubDomains; preload'
);
```

#### At Rest
```typescript
// SQLite database encryption (optional)
// Use encrypted filesystem (LUKS, BitLocker)
// Or migrate to PostgreSQL with TDE

// Environment variables
// Store sensitive config in environment
// Never commit to version control
const config = {
  databaseUrl: process.env.DATABASE_URL,
  openrouterKey: process.env.OPENROUTER_API_KEY,
  // ... other sensitive config
};
```

#### Application Level
```typescript
// Hash sensitive data before storage
import crypto from 'crypto';

function hashIP(ip: string): string {
  return crypto
    .createHash('sha256')
    .update(ip)
    .digest('hex')
    .substring(0, 16); // Truncate for rate limiting
}

// Anonymize logs
function sanitizeLogData(data: any): any {
  const sanitized = { ...data };
  // Remove or mask sensitive fields
  delete sanitized.plantImage;
  delete sanitized.apiKeys;
  return sanitized;
}
```

### Data Retention

```typescript
// Data retention policy
const retentionPolicy = {
  analyses: {
    retention: '2 years',
    archiveAfter: '6 months',
    deleteAfter: '2 years'
  },
  images: {
    retention: '1 year',
    compressAfter: '3 months',
    deleteAfter: '1 year'
  },
  logs: {
    retention: '30 days',
    archiveAfter: '7 days',
    deleteAfter: '30 days'
  },
  cache: {
    ttl: '24 hours',
    cleanup: 'daily'
  }
};
```

### Privacy by Design

#### Minimal Data Collection
- Only collect necessary data
- Clear purpose for each field
- No hidden data collection
- User control over data

```typescript
// Data minimization
interface MinimalAnalysisRequest {
  strain: string; // Required for analysis
  leafSymptoms: string; // Required for analysis
  plantImage?: string; // Optional, improves accuracy
  // No unnecessary fields collected
}
```

#### Purpose Limitation
- Data used only for stated purpose
- No secondary use without consent
- Clear data boundaries

#### User Rights (Future)
```typescript
// Right to access
async function exportUserData(userId: string): Promise<ExportFile> {
  // Export all user data
}

// Right to rectification
async function updateUserData(userId: string, data: any): Promise<void> {
  // Update user data
}

// Right to erasure
async function deleteUserData(userId: string): Promise<void> {
  // Permanently delete all user data
}
```

---

## Input Validation

### Validation Strategy

#### Layer 1: Client-Side (TypeScript)
```typescript
// Type guards for runtime validation
function isAnalysisRequest(data: any): data is AnalysisRequest {
  return (
    typeof data.strain === 'string' &&
    typeof data.leafSymptoms === 'string' &&
    (data.phLevel === undefined || typeof data.phLevel === 'number')
  );
}
```

#### Layer 2: API Route (Zod)
```typescript
// Comprehensive Zod schema
const AnalysisRequestSchema = z.object({
  strain: z.string().min(1).max(100).transform(val => val.trim()),
  leafSymptoms: z.string().min(1).max(1000).transform(val => val.trim()),
  phLevel: z.union([
    z.string().regex(/^\d*\.?\d*$/).transform(val => parseFloat(val)),
    z.number()
  ]).optional(),
  // ... comprehensive validation
});
```

#### Layer 3: Sanitization
```typescript
// Input sanitization
function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '')        // Remove HTML tags
    .replace(/javascript:/gi, '') // Remove JS protocols
    .replace(/on\w+=/gi, '')     // Remove event handlers
    .trim();
}

// Image validation
function validateImage(base64: string): void {
  // Check data URL format
  const match = base64.match(/^data:(.+?);base64,(.+)$/);
  if (!match) {
    throw new Error('Invalid image format');
  }

  // Check MIME type
  const mimeType = match[1];
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
  if (!allowedTypes.includes(mimeType)) {
    throw new Error('Unsupported image type');
  }

  // Check size
  const size = (match[2].length * 0.75) - 2; // Approximate size
  if (size > 50 * 1024 * 1024) { // 50MB
    throw new Error('Image too large');
  }
}
```

#### Layer 4: Database (Prisma)
```prisma
// Prisma schema with constraints
model PlantAnalysis {
  id           String   @id @default(cuid())
  strain       String   @db.VarChar(100)  // Length constraint
  leafSymptoms String   @db.Text         // Type constraint
  phLevel      Float?                   // Optional
  // ... validated by Prisma
}
```

### Validation Rules

#### String Validation
```typescript
z.string()
  .min(1)                    // Minimum length
  .max(100)                  // Maximum length
  .regex(/^[a-zA-Z0-9\s\-_.]+$/) // Allowed characters
  .trim()                    // Remove whitespace
  .transform(val => val.toLowerCase()) // Normalize
```

#### Number Validation
```typescript
z.number()
  .min(0)                    // Minimum value
  .max(14)                   // Maximum value (for pH)
  .finite()                  // Not Infinity
  .refine(val => !isNaN(val)) // Valid number
```

#### Array Validation
```typescript
z.array(z.string()).min(1).max(10).refine(
  arr => arr.every(item => item.length > 0),
  'All items must be non-empty'
)
```

---

## Rate Limiting

### Implementation

```typescript
// In-memory rate limiter
const RATE_LIMIT_WINDOW = 15 * 60 * 1000;  // 15 minutes
const MAX_REQUESTS_PER_WINDOW = 20;
const requestTracker = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(request: Request): RateLimitResult {
  const clientIP = getClientIP(request);
  const hashedIP = hashIP(clientIP);
  const now = Date.now();

  // Cleanup expired entries
  for (const [key, value] of requestTracker.entries()) {
    if (now > value.resetTime) {
      requestTracker.delete(key);
    }
  }

  const tracker = requestTracker.get(hashedIP);

  if (!tracker || now > tracker.resetTime) {
    requestTracker.set(hashedIP, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW
    });
    return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - 1 };
  }

  if (tracker.count >= MAX_REQUESTS_PER_WINDOW) {
    return {
      allowed: false,
      resetTime: tracker.resetTime,
      remaining: 0
    };
  }

  tracker.count++;
  return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - tracker.count };
}
```

### Rate Limit Headers

```typescript
// Add rate limit headers to response
function addRateLimitHeaders(
  response: Response,
  rateLimitResult: RateLimitResult
): Response {
  if (!rateLimitResult.allowed) {
    response.headers.set('Retry-After', '900'); // 15 minutes
  }

  response.headers.set('X-RateLimit-Limit', MAX_REQUESTS_PER_WINDOW.toString());
  response.headers.set(
    'X-RateLimit-Remaining',
    rateLimitResult.remaining.toString()
  );
  response.headers.set(
    'X-RateLimit-Reset',
    rateLimitResult.resetTime?.toString() || ''
  );

  return response;
}
```

### Tiered Rate Limiting (Future)

```typescript
// Different limits for different plans
const rateLimits = {
  free: {
    requests: 10,
    window: 60 * 60 * 1000, // 1 hour
    concurrent: 2
  },
  premium: {
    requests: 100,
    window: 60 * 60 * 1000, // 1 hour
    concurrent: 10
  },
  enterprise: {
    requests: 1000,
    window: 60 * 60 * 1000, // 1 hour
    concurrent: 50
  }
};
```

### Distributed Rate Limiting

For multi-server deployments, use Redis:

```typescript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

async function checkDistributedRateLimit(
  userId: string
): Promise<RateLimitResult> {
  const key = `ratelimit:${userId}`;
  const now = Date.now();
  const window = 15 * 60 * 1000;
  const limit = 20;

  const current = await redis.incr(key);

  if (current === 1) {
    await redis.expire(key, window / 1000);
  }

  const ttl = await redis.ttl(key);

  if (current > limit) {
    return { allowed: false, resetTime: now + ttl * 1000 };
  }

  return { allowed: true, remaining: limit - current };
}
```

---

## Security Headers

### Implemented Headers

```typescript
// Security headers middleware
function addSecurityHeaders(response: Response): Response {
  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');

  // Prevent framing (clickjacking)
  response.headers.set('X-Frame-Options', 'DENY');

  // XSS protection
  response.headers.set('X-XSS-Protection', '1; mode=block');

  // Referrer policy
  response.headers.set(
    'Referrer-Policy',
    'strict-origin-when-cross-origin'
  );

  // Content Security Policy
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "connect-src 'self' https://openrouter.ai",
      "font-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; ')
  );

  // HSTS (HTTPS Strict Transport Security)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }

  // Cache control
  response.headers.set(
    'Cache-Control',
    'no-store, no-cache, must-revalidate, proxy-revalidate'
  );

  return response;
}
```

### Additional Headers (Future)

```typescript
// Permissions Policy
response.headers.set(
  'Permissions-Policy',
  'camera=(), microphone=(), geolocation=()'
);

// Cross-Origin Resource Policy
response.headers.set(
  'Cross-Origin-Resource-Policy',
  'same-site'
);

// Cross-Origin Embedder Policy
response.headers.set(
  'Cross-Origin-Embedder-Policy',
  'require-corp'
);
```

---

## Privacy Compliance

### GDPR Compliance (If Applicable)

#### Lawful Basis
- **Legitimate Interest**: Provide plant analysis service
- **Consent**: For marketing communications (future)

#### Data Subject Rights

**Right to Access (Article 15)**
```typescript
// User can request all their data
async function getUserData(userId: string): Promise<UserDataExport> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      plants: true,
      analyses: true
    }
  });

  return formatUserData(user);
}
```

**Right to Rectification (Article 16)**
```typescript
// User can correct their data
async function updateUserData(
  userId: string,
  updates: Partial<UserData>
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: updates
  });
}
```

**Right to Erasure (Article 17)**
```typescript
// User can delete their account and data
async function deleteUserData(userId: string): Promise<void> {
  await prisma.$transaction([
    prisma.plantAnalysis.deleteMany({ where: { userId } }),
    prisma.plant.deleteMany({ where: { userId } }),
    prisma.user.delete({ where: { id: userId } })
  ]);
}
```

**Right to Portability (Article 20)**
```typescript
// User can export their data
async function exportUserData(userId: string): Promise<ExportFile> {
  const data = await getUserData(userId);

  return {
    format: 'json',
    data: JSON.stringify(data, null, 2),
    filename: `cultivai-export-${Date.now()}.json`
  };
}
```

**Right to Object (Article 21)**
```typescript
// User can object to processing
async function objectToProcessing(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { processingRestricted: true }
  });
}
```

#### Data Protection Impact Assessment (DPIA)

**When Required**: High-risk processing

**Assessment Areas**:
1. Nature of processing
2. Scope of processing
3. Context and purposes
4. Necessity and proportionality
5. Risks to individuals

**DPIA Template**:
```typescript
interface DataProtectionImpactAssessment {
  processingDescription: string;
  purpose: string;
  dataCategories: string[];
  dataSubjects: string[];
  legalBasis: string;
  risks: RiskAssessment[];
  mitigations: Mitigation[];
  residualRisk: string;
  approved: boolean;
  approvedBy: string;
  approvedAt: Date;
}
```

#### Data Breach Response

**Detection**:
```typescript
// Monitor for anomalies
function detectBreach(logs: LogEntry[]): BreachAlert | null {
  // Check for:
  // - Unusual access patterns
  // - Large data exports
  // - Failed authentication attempts
  // - Unexpected API calls

  return breachDetected ? {
    severity: 'high',
    type: 'unauthorized_access',
    timestamp: new Date(),
    affectedRecords: count
  } : null;
}
```

**Response Process**:
1. **Detect**: Automated monitoring
2. **Assess**: Severity and impact
3. **Contain**: Stop the breach
4. **Investigate**: Root cause analysis
5. **Notify**: Supervisory authority (72 hours)
6. **Communicate**: Affected individuals
7. **Remediate**: Fix vulnerabilities
8. **Review**: Lessons learned

**Breach Notification Template**:
```typescript
interface BreachNotification {
  incidentId: string;
  description: string;
  dataCategories: string[];
  affectedIndividuals: number;
  consequences: string;
  measuresTaken: string;
  contactInfo: string;
  reportedAt: Date;
}
```

---

# Part III: Deployment

## Deployment Guide

### Pre-Deployment Checklist

#### Code Quality
- [ ] All tests passing
- [ ] TypeScript compilation successful
- [ ] ESLint warnings resolved
- [ ] No console.log in production code
- [ ] Environment variables configured

#### Security
- [ ] Security headers configured
- [ ] Rate limiting tested
- [ ] Input validation complete
- [ ] Dependencies audited (npm audit)
- [ ] No secrets in code

#### Performance
- [ ] Image optimization working
- [ ] Database queries indexed
- [ ] Caching strategy implemented
- [ ] Bundle size optimized

#### Database
- [ ] Migrations tested
- [ ] Backup strategy in place
- [ ] Seed data created (if needed)
- [ ] Connection pooling configured

### Environment Setup

#### Development Environment
```bash
# Clone repository
git clone https://github.com/cultivaipro/cultivai-pro.git
cd cultivai-pro

# Install dependencies
npm install

# Set up environment
cp .env.example .env

# Configure environment variables
cat > .env << EOF
DATABASE_URL="file:./prisma/dev.db"
OPENROUTER_API_KEY="your_openrouter_key_here"
LM_STUDIO_URL="http://localhost:1234"
NODE_ENV="development"
EOF

# Set up database
npx prisma migrate dev
npx prisma generate

# Start development server
npm run dev
```

#### Production Environment

**Required Environment Variables**:
```bash
# Database
DATABASE_URL="file:./prisma/prod.db"

# AI Providers
OPENROUTER_API_KEY="sk-or-v1-your-key"

# Security
NODE_ENV="production"

# Optional: Custom Configuration
OPENROUTER_MODEL="meta-llama/llama-3.1-8b-instruct:free"
LM_STUDIO_URL="http://localhost:1234"

# Timeouts
OPENROUTER_TIMEOUT="30000"
LM_STUDIO_TIMEOUT="120000"
```

**Security Best Practices**:
```bash
# Use secrets management (AWS Secrets Manager, etc.)
aws secretsmanager create-secret \
  --name "cultivai-pro/openrouter-key" \
  --secret-string '{"OPENROUTER_API_KEY":"your_key"}'

# Or use environment files (never commit!)
echo "OPENROUTER_API_KEY=your_key" >> .env.production
echo ".env.production" >> .gitignore
```

---

## Environment Configuration

### Configuration Management

#### Development
```typescript
// config/development.ts
export const config = {
  env: 'development',
  debug: true,
  database: {
    url: process.env.DATABASE_URL || 'file:./prisma/dev.db'
  },
  ai: {
    openrouter: {
      enabled: true,
      timeout: 60000
    },
    lmstudio: {
      enabled: true,
      url: 'http://localhost:1234',
      timeout: 120000
    }
  }
};
```

#### Production
```typescript
// config/production.ts
export const config = {
  env: 'production',
  debug: false,
  database: {
    url: process.env.DATABASE_URL!,
    connectionLimit: 10
  },
  ai: {
    openrouter: {
      enabled: true,
      timeout: 30000,
      maxRetries: 3
    },
    lmstudio: {
      enabled: false // Not suitable for production
    }
  },
  security: {
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 20
    },
    cors: {
      origin: process.env.ALLOWED_ORIGINS?.split(',') || []
    }
  }
};
```

### Environment-Specific Features

```typescript
// Auto-configuration based on environment
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';
const isServerless = !!process.env.VERCEL || !!process.env.NETLIFY;

// Feature flags
const features = {
  analytics: isProduction,
  debug: isDevelopment,
  lmStudio: isDevelopment,
  openrouter: true,
  rateLimit: isProduction
};

// Dynamic provider selection
const getAIPProvider = () => {
  if (isServerless) {
    return 'openrouter'; // LM Studio doesn't work serverless
  }
  if (isDevelopment && process.env.LM_STUDIO_URL) {
    return 'lm-studio';
  }
  return 'openrouter';
};
```

---

## Docker Deployment

### Dockerfile

```dockerfile
# Use official Node.js runtime
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build application
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Set permissions
USER nextjs

# Expose port
EXPOSE 3000

# Set environment variables
ENV PORT 3000
ENV NODE_ENV production

# Start application
CMD ["node", "server.js"]
```

### Docker Compose (Development)

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=file:./prisma/dev.db
    volumes:
      - ./prisma:/app/prisma
      - ./public:/app/public
    depends_on:
      - redis
      - postgres

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data

  postgres:
    image: postgres:15-alpine
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_USER=cultivai
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=cultivai
    volumes:
      - postgres-data:/var/lib/postgresql/data

volumes:
  redis-data:
  postgres-data:
```

### Docker Compose (Production)

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.prod
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:pass@postgres:5432/db
    depends_on:
      - postgres
      - redis
    restart: unless-stopped
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_DB=${DB_NAME}
    volumes:
      - postgres-data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis-data:/data
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    restart: unless-stopped

volumes:
  postgres-data:
  redis-data:
```

---

## Cloud Deployment (Vercel/Netlify)

### Vercel Deployment

#### vercel.json Configuration
```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/$1"
    }
  ],
  "env": {
    "DATABASE_URL": "@database-url",
    "OPENROUTER_API_KEY": "@openrouter-key"
  },
  "build": {
    "env": {
      "NODE_ENV": "production"
    }
  },
  "regions": ["iad1"]
}
```

#### Deployment Steps
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Set environment variables
vercel env add OPENROUTER_API_KEY
vercel env add DATABASE_URL

# Deploy
vercel

# Deploy to production
vercel --prod
```

#### Vercel Limitations
- **No persistent filesystem**: Use Vercel Postgres or external DB
- **No LM Studio**: Serverless incompatible
- **Cold starts**: First request slower
- **Timeout**: 10 seconds max for serverless functions
- **Local files**: Can't write to disk

#### Vercel-Specific Code
```typescript
// pages/api/analyze.ts
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb'
    },
    responseLimit: false
  }
};

// Use Edge Runtime for better performance
export const runtime = 'edge';

// Or Node.js runtime
export const runtime = 'nodejs';
```

### Netlify Deployment

#### netlify.toml Configuration
```toml
[build]
  command = "npm run build"
  publish = ".next"

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200

[functions]
  node_bundler = "esbuild"
  included_files = ["prisma/**"]
```

#### Netlify Functions
```typescript
// netlify/functions/analyze.ts
import { Handler } from '@netlify/functions';

export const handler: Handler = async (event, context) => {
  // Your analysis logic here
  return {
    statusCode: 200,
    body: JSON.stringify({ success: true })
  };
};
```

---

## VPS/Server Deployment

### Server Requirements

#### Minimum Requirements
- **CPU**: 2 cores
- **RAM**: 4GB
- **Storage**: 20GB SSD
- **OS**: Ubuntu 20.04+ / CentOS 8+

#### Recommended Requirements
- **CPU**: 4 cores
- **RAM**: 8GB
- **Storage**: 50GB SSD
- **OS**: Ubuntu 22.04 LTS

### Deployment Script

```bash
#!/bin/bash
# deploy.sh

set -e

echo "🚀 Starting deployment..."

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install Nginx
sudo apt install -y nginx

# Clone repository
cd /var/www
sudo git clone https://github.com/cultivaipro/cultivai-pro.git
sudo chown -R $USER:$USER cultivai-pro
cd cultivai-pro

# Install dependencies
npm ci

# Set up environment
cp .env.example .env
nano .env  # Edit environment variables

# Build application
npm run build

# Set up database
npx prisma migrate deploy
npx prisma generate

# Configure Nginx
sudo cp nginx.conf /etc/nginx/sites-available/cultivai-pro
sudo ln -s /etc/nginx/sites-available/cultivai-pro /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Start application with PM2
pm2 start npm --name "cultivai-pro" -- start
pm2 save
pm2 startup

echo "✅ Deployment complete!"
echo "📊 Monitor: pm2 monit"
echo "📝 Logs: pm2 logs"
```

### Nginx Configuration

```nginx
# /etc/nginx/sites-available/cultivai-pro
server {
    listen 80;
    server_name your-domain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL Configuration
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Static files
    location /_next/static {
        alias /var/www/cultivai-pro/.next/static;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }

    # API routes
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Main application
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## Continuous Integration

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Install dependencies
        run: npm ci

      - name: Type check
        run: npm run type-check

      - name: Lint
        run: npm run lint

      - name: Run tests
        run: npm test

      - name: Build application
        run: npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'

    steps:
      - uses: actions/checkout@v3

      - name: Deploy to server
        uses: appleboy/ssh-action@v0.1.5
        with:
          host: ${{ secrets.HOST }}
          username: ${{ secrets.USERNAME }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /var/www/cultivai-pro
            git pull origin main
            npm ci
            npm run build
            npx prisma migrate deploy
            pm2 restart cultivai-pro
```

### GitLab CI/CD

```yaml
# .gitlab-ci.yml
stages:
  - test
  - deploy

variables:
  NODE_VERSION: "18"

test:
  stage: test
  image: node:$NODE_VERSION
  script:
    - npm ci
    - npm run lint
    - npm test
    - npm run build

deploy:
  stage: deploy
  image: alpine:latest
  script:
    - apk add --no-cache openssh
    - ssh $SSH_USER@$SSH_HOST "cd /var/www/cultivai-pro && git pull && npm ci && npm run build && npx prisma migrate deploy && pm2 restart cultivai-pro"
  only:
    - main
```

---

# Part IV: Monitoring & Maintenance

## Monitoring & Alerting

### Key Metrics

#### Application Metrics
```typescript
// metrics/application-metrics.ts
interface ApplicationMetrics {
  // Performance
  responseTime: number;          // Average response time
  throughput: number;            // Requests per second
  errorRate: number;             // Percentage of errors

  // Business
  analysesCompleted: number;     // Total analyses today
  activeUsers: number;           // Current active users
  providerStatus: ProviderStatus; // AI provider health

  // System
  memoryUsage: number;           // RAM usage %
  cpuUsage: number;              // CPU usage %
  diskSpace: number;             // Available disk space
}

// Collect metrics
function collectMetrics(): ApplicationMetrics {
  return {
    responseTime: calculateAverageResponseTime(),
    throughput: getRequestsPerSecond(),
    errorRate: getErrorPercentage(),
    analysesCompleted: getTodayAnalysisCount(),
    activeUsers: getActiveUsers(),
    providerStatus: checkProviderStatus(),
    memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024,
    cpuUsage: process.cpuUsage(),
    diskSpace: getDiskSpace()
  };
}
```

#### Alert Thresholds
```typescript
// alerts/thresholds.ts
const alertThresholds = {
  responseTime: {
    warning: 2000,    // 2 seconds
    critical: 5000    // 5 seconds
  },
  errorRate: {
    warning: 5,       // 5%
    critical: 10      // 10%
  },
  memoryUsage: {
    warning: 80,      // 80%
    critical: 95      // 95%
  },
  diskSpace: {
    warning: 10,      // 10GB free
    critical: 5       // 5GB free
  },
  providerStatus: {
    error: 'unavailable'
  }
};
```

### Monitoring Setup

#### Prometheus + Grafana

```yaml
# docker-compose.monitoring.yml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus

  grafana:
    image: grafana/grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana-data:/var/lib/grafana

  node-exporter:
    image: prom/node-exporter
    ports:
      - "9100:9100"

volumes:
  prometheus-data:
  grafana-data:
```

#### Prometheus Configuration

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'cultivai-pro'
    static_configs:
      - targets: ['localhost:3000']

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']
```

### Alerting

```typescript
// alerts/alert-manager.ts
interface Alert {
  severity: 'info' | 'warning' | 'critical';
  service: string;
  message: string;
  metric?: string;
  value?: number;
  threshold?: number;
  timestamp: Date;
}

async function checkAlerts(): Promise<Alert[]> {
  const alerts: Alert[] = [];
  const metrics = await collectMetrics();

  // Response time alerts
  if (metrics.responseTime > alertThresholds.responseTime.critical) {
    alerts.push({
      severity: 'critical',
      service: 'application',
      message: `Response time critical: ${metrics.responseTime}ms`,
      metric: 'responseTime',
      value: metrics.responseTime,
      threshold: alertThresholds.responseTime.critical,
      timestamp: new Date()
    });
  }

  // Error rate alerts
  if (metrics.errorRate > alertThresholds.errorRate.critical) {
    alerts.push({
      severity: 'critical',
      service: 'application',
      message: `Error rate critical: ${metrics.errorRate}%`,
      metric: 'errorRate',
      value: metrics.errorRate,
      threshold: alertThresholds.errorRate.critical,
      timestamp: new Date()
    });
  }

  // Memory usage alerts
  if (metrics.memoryUsage > alertThresholds.memoryUsage.critical) {
    alerts.push({
      severity: 'critical',
      service: 'system',
      message: `Memory usage critical: ${metrics.memoryUsage}%`,
      metric: 'memoryUsage',
      value: metrics.memoryUsage,
      threshold: alertThresholds.memoryUsage.critical,
      timestamp: new Date()
    });
  }

  return alerts;
}

// Send alerts
async function sendAlert(alert: Alert): Promise<void> {
  // Email notification
  if (alert.severity === 'critical') {
    await sendEmail({
      to: 'admin@cultivaipro.com',
      subject: `[CRITICAL] ${alert.service}: ${alert.message}`,
      body: JSON.stringify(alert, null, 2)
    });
  }

  // Slack notification
  await sendSlack({
    channel: '#alerts',
    message: `${alert.severity.toUpperCase()}: ${alert.message}`
  });

  // Webhook notification
  await fetch(process.env.WEBHOOK_URL!, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(alert)
  });
}
```

---

## Logging Strategy

### Log Levels

```typescript
// logging/levels.ts
enum LogLevel {
  ERROR = 0,    // Errors that need immediate attention
  WARN = 1,     // Warnings that should be reviewed
  INFO = 2,     // General information
  DEBUG = 3,    // Detailed information for debugging
  TRACE = 4     // Very detailed, trace-level information
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  service: string;
  message: string;
  metadata?: Record<string, any>;
  requestId?: string;
  userId?: string;
  error?: {
    name: string;
    message: string;
    stack: string;
  };
}
```

### Structured Logging

```typescript
// logging/logger.ts
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.prettyPrint()
  ),
  transports: [
    // Write to all logs with level `info` and below to `combined.log`
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error'
    }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

// If we're not in production then log to the `console`
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

export default logger;

// Usage
logger.info('Analysis started', {
  requestId: req.id,
  plantId: plantId,
  strain: strain
});

logger.error('Analysis failed', {
  requestId: req.id,
  error: error.message,
  stack: error.stack
});
```

### Log Aggregation

```typescript
// ELK Stack (Elasticsearch, Logstash, Kibana)
const logConfig = {
  logstash: {
    host: 'localhost',
    port: 5000,
    protocol: 'tcp'
  },
  elasticsearch: {
    node: 'http://localhost:9200',
    index: 'cultivai-pro-%{+YYYY.MM.DD}'
  },
  kibana: {
    url: 'http://localhost:5601'
  }
};

// Fluentd alternative
const fluentdConfig = {
  host: 'localhost',
  port: 24224,
  tag: 'cultivai.production'
};
```

---

## Performance Tuning

### Database Optimization

#### Query Optimization
```sql
-- Add indexes for common queries
CREATE INDEX idx_plant_analyses_plant_id ON PlantAnalysis(plantId);
CREATE INDEX idx_plant_analyses_created_at ON PlantAnalysis(createdAt);
CREATE INDEX idx_plant_analyses_provider ON PlantAnalysis(provider);

-- Composite index for complex queries
CREATE INDEX idx_plant_analyses_plant_date ON PlantAnalysis(plantId, createdAt);

-- Query plan analysis
EXPLAIN QUERY PLAN SELECT * FROM PlantAnalysis WHERE plantId = 'plant_123' ORDER BY createdAt DESC;
```

#### Connection Pooling
```typescript
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")

  // Connection pool configuration
  relationMode = "prisma"
}

// In application code
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  },
  // Connection pool settings
  log: ['query', 'info', 'warn', 'error'],
});
```

### Image Processing Optimization

```typescript
// Sharp optimization
const sharp = require('sharp');

const optimizedSharpConfig = {
  // Use libvips (faster than ImageMagick)
  // Default in Sharp v3+

  // Adaptive resizing based on image characteristics
  resize: {
    withoutEnlargement: true,
    fastShrinkOnLoad: true // Faster but lower quality
  },

  // JPEG optimization
  jpeg: {
    quality: 90,
    progressive: true,       // Faster decode
    mozjpeg: true,           // Better compression
    trellisQuantisation: true,
    overshootDeringing: true,
    optimiseScans: true
  },

  // PNG optimization
  png: {
    compressionLevel: 9,     // Maximum compression
    adaptiveFiltering: true,
    forceQuantization: true
  },

  // WebP optimization
  webp: {
    quality: 90,
    effort: 6,               // 0-9, higher = better compression but slower
    smartSubsample: true,
    preset: 'photo'
  }
};
```

### Caching Strategy

#### Application-Level Cache
```typescript
// cache/application-cache.ts
import NodeCache from 'node-cache';

const cache = new NodeCache({
  stdTTL: 3600,        // 1 hour default
  checkperiod: 120,    // Check for expired keys every 2 minutes
  useClones: false     // Don't clone objects
});

// Cache analysis results
const cacheKey = `analysis:${plantId}:${hash(JSON.stringify(request))}`;
const cached = cache.get(cacheKey);

if (cached) {
  return cached;
}

const result = await performAnalysis(request);
cache.set(cacheKey, result, 24 * 60 * 60); // 24 hours

return result;
```

#### Database Query Cache
```typescript
// cache/query-cache.ts
import LRU from 'lru-cache';

const queryCache = new LRU<string, any>({
  max: 500,              // Maximum 500 cached queries
  ttl: 1000 * 60 * 60,   // 1 hour TTL
  allowStale: false
});

async function getCachedQuery<T>(
  key: string,
  queryFn: () => Promise<T>
): Promise<T> {
  const cached = queryCache.get(key);

  if (cached) {
    return cached;
  }

  const result = await queryFn();
  queryCache.set(key, result);

  return result;
}

// Usage
const analyses = await getCachedQuery(
  `plant-analyses:${plantId}:${dateRange}`,
  () => prisma.plantAnalysis.findMany({
    where: { plantId },
    orderBy: { createdAt: 'desc' }
  })
);
```

---

## Backup & Recovery

### Database Backup

```bash
#!/bin/bash
# scripts/backup-database.sh

BACKUP_DIR="/backups/cultivai-pro"
DATE=$(date +%Y%m%d_%H%M%S)
DB_PATH="prisma/dev.db"

# Create backup directory
mkdir -p $BACKUP_DIR

# Create backup
cp $DB_PATH $BACKUP_DIR/db-$DATE.db

# Compress backup
gzip $BACKUP_DIR/db-$DATE.db

# Keep only last 30 backups
find $BACKUP_DIR -name "db-*.db.gz" -type f -mtime +30 -delete

# Sync to remote storage (optional)
# aws s3 cp $BACKUP_DIR/db-$DATE.db.gz s3://my-backup-bucket/

echo "✅ Database backup completed: db-$DATE.db.gz"
```

### Automated Backup Script

```bash
#!/bin/bash
# scripts/scheduled-backup.sh

# Add to crontab: 0 2 * * * /var/www/cultivai-pro/scripts/scheduled-backup.sh

set -e

BACKUP_DIR="/backups/cultivai-pro"
LOG_FILE="/var/log/backup.log"

# Log function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a $LOG_FILE
}

log "Starting database backup..."

# Create backup
cp prisma/dev.db /tmp/backup-$(date +%Y%m%d).db

# Compress
gzip /tmp/backup-$(date +%Y%m%d).db

# Move to backup directory
mv /tmp/backup-$(date +%Y%m%d).db.gz $BACKUP_DIR/

# Upload to S3 (if configured)
if [ -n "$AWS_S3_BUCKET" ]; then
    log "Uploading to S3..."
    aws s3 cp $BACKUP_DIR/backup-$(date +%Y%m%d).db.gz \
        s3://$AWS_S3_BUCKET/cultivai-pro/
    log "✅ Uploaded to S3"
fi

# Clean up old backups
find $BACKUP_DIR -name "backup-*.db.gz" -type f -mtime +30 -delete

log "✅ Backup completed successfully"
```

### Recovery Procedure

```bash
#!/bin/bash
# scripts/restore-database.sh

BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup-file>"
    exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
    echo "Error: Backup file not found: $BACKUP_FILE"
    exit 1
fi

# Create backup of current database
cp prisma/dev.db prisma/dev.db.backup.$(date +%Y%m%d_%H%M%S)

# Restore from backup
if [[ $BACKUP_FILE == *.gz ]]; then
    gunzip -c $BACKUP_FILE > prisma/dev.db
else
    cp $BACKUP_FILE prisma/dev.db
fi

# Regenerate Prisma client
npx prisma generate

echo "✅ Database restored from: $BACKUP_FILE"
```

### Disaster Recovery Plan

#### Recovery Time Objectives (RTO)
- **Maximum downtime**: 4 hours
- **Data loss tolerance**: 24 hours
- **Recovery procedure**: Documented and tested

#### Recovery Steps

1. **Assess the incident**
   - Identify affected systems
   - Determine cause
   - Estimate impact

2. **Activate recovery team**
   - Notify stakeholders
   - Assemble team
   - Assign roles

3. **Restore from backup**
   - Follow restore procedure
   - Verify data integrity
   - Test functionality

4. **Validate recovery**
   - Run health checks
   - Test critical features
   - Monitor for issues

5. **Return to normal operations**
   - Monitor closely
   - Document lessons learned
   - Update procedures

---

# Part V: Operations

## Database Management

### Migrations

```bash
# Create new migration
npx prisma migrate dev --name add_plant_health_score

# Deploy migrations to production
npx prisma migrate deploy

# Reset database (development only!)
npx prisma migrate reset

# View migration history
npx prisma migrate status

# Generate Prisma client
npx prisma generate
```

### Migration Best Practices

```prisma
// Good migration example
-- CreatePlantHealthAnalytics
CREATE TABLE PlantHealthAnalytics (
    id String PRIMARY KEY,
    plantId String NOT NULL,
    healthScore Float NOT NULL,
    healthStatus String NOT NULL,
    createdAt DateTime DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (plantId) REFERENCES Plant(id)
);

-- Add indexes
CREATE INDEX idx_plant_health_analytics_plant_id ON PlantHealthAnalytics(plantId);
CREATE INDEX idx_plant_health_analytics_created_at ON PlantHealthAnalytics(createdAt);
```

### Database Maintenance

```sql
-- Vacuum SQLite database
VACUUM;

-- Analyze query performance
EXPLAIN QUERY PLAN SELECT * FROM PlantAnalysis WHERE plantId = '123';

-- Check database integrity
PRAGMA integrity_check;

-- Get database info
PRAGMA database_list;
PRAGMA table_info(PlantAnalysis);
```

### Schema Versioning

```typescript
// migrations/version-check.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkSchemaVersion() {
  const version = await prisma.$queryRaw`
    SELECT * FROM _prisma_migrations ORDER BY applied_at DESC LIMIT 1
  `;

  const expectedVersion = '20231126120000_add_plant_health_score';

  if (version.migration_name !== expectedVersion) {
    throw new Error(
      `Schema version mismatch. Expected: ${expectedVersion}, Found: ${version.migration_name}`
    );
  }
}
```

---

## Update Procedures

### Rolling Update Process

```bash
#!/bin/bash
# scripts/rolling-update.sh

set -e

echo "🚀 Starting rolling update..."

# 1. Pull latest code
git pull origin main

# 2. Install dependencies
npm ci

# 3. Run migrations
npx prisma migrate deploy

# 4. Build application
npm run build

# 5. Health check before updating
npm run health-check

# 6. Update PM2
pm2 reload cultiva-pro

# 7. Health check after update
sleep 5
npm run health-check

# 8. Verify API
curl -f http://localhost:3000/api/analyze || exit 1

echo "✅ Update completed successfully"
```

### Blue-Green Deployment

```yaml
# docker-compose.blue-green.yml
version: '3.8'

services:
  blue:
    build: .
    environment:
      - NODE_ENV=production
    expose:
      - "3000"

  green:
    build: .
    environment:
      - NODE_ENV=production
    expose:
      - "3001"

  nginx:
    image: nginx:alpine
    volumes:
      - ./nginx-blue-green.conf:/etc/nginx/nginx.conf
    depends_on:
      - blue
      - green
    ports:
      - "80:80"
```

### Database Migration During Updates

```typescript
// scripts/pre-deploy-check.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function preDeployCheck() {
  // 1. Check database connectivity
  try {
    await prisma.$connect();
    console.log('✅ Database connected');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }

  // 2. Check pending migrations
  const pendingMigrations = await prisma.$queryRaw`
    SELECT COUNT(*) as count FROM _prisma_migrations WHERE applied_at IS NULL
  `;

  if (pendingMigrations.count > 0) {
    console.error('❌ Pending migrations detected');
    process.exit(1);
  }

  // 3. Verify data integrity
  const tables = await prisma.$queryRaw`
    SELECT name FROM sqlite_master WHERE type='table'
  `;

  console.log('✅ Pre-deploy checks passed');
}
```

---

## Troubleshooting

### Common Issues

#### Issue 1: High Memory Usage

**Symptoms:**
- Server running out of memory
- Application becoming slow
- OOM (Out of Memory) errors

**Diagnosis:**
```bash
# Check memory usage
free -h
ps aux --sort=-%mem | head

# Check Node.js memory
node -e "console.log(process.memoryUsage())"

# Monitor in real-time
watch -n 1 'free -h'
```

**Solutions:**
```typescript
// 1. Increase Node.js max memory
node --max-old-space-size=4096 server.js

// 2. Implement memory monitoring
setInterval(() => {
  const used = process.memoryUsage();
  const percentage = (used.heapUsed / used.heapTotal) * 100;

  if (percentage > 80) {
    console.warn(`Memory usage high: ${percentage.toFixed(2)}%`);
  }
}, 60000);

// 3. Clear cache periodically
setInterval(() => {
  if (cache) {
    cache.flushAll();
  }
}, 3600000); // Every hour
```

#### Issue 2: Database Lock Timeouts

**Symptoms:**
- Queries timing out
- "database is locked" errors
- Slow performance

**Diagnosis:**
```sql
-- Check for long-running queries
SELECT * FROM pragma_database_list();

-- Check database connections
PRAGMA database_list;

-- Check for locks
SELECT * FROM pragma_lock_status();
```

**Solutions:**
```typescript
// 1. Add connection timeout
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  },
  log: ['query', 'info', 'warn', 'error'],
});

// 2. Optimize queries
const analyses = await prisma.plantAnalysis.findMany({
  where: { plantId },
  take: 20,              // Limit results
  orderBy: { createdAt: 'desc' },
  select: {              // Select only needed fields
    id: true,
    diagnosis: true,
    createdAt: true
  }
});

// 3. Use indexes
-- Add indexes for frequently queried columns
CREATE INDEX idx_plant_analyses_plant_id ON PlantAnalysis(plantId);
```

#### Issue 3: Image Processing Failures

**Symptoms:**
- Images fail to process
- "ImageProcessingError" messages
- Corrupted image output

**Diagnosis:**
```typescript
// Add detailed error logging
try {
  const result = await processImage(buffer);
} catch (error) {
  console.error('Image processing failed:', {
    error: error.message,
    stack: error.stack,
    imageSize: buffer.length,
    format: await getImageFormat(buffer)
  });

  throw new ImageProcessingError(
    `Failed to process image: ${error.message}`,
    error
  );
}
```

**Solutions:**
```typescript
// 1. Validate image before processing
async function validateImage(buffer: Buffer): Promise<void> {
  // Check format
  const format = await getImageFormat(buffer);
  if (!isFormatSupported(`image/${format}`)) {
    throw new Error(`Unsupported format: ${format}`);
  }

  // Check size
  if (buffer.length > 50 * 1024 * 1024) {
    throw new Error('Image too large');
  }

  // Check dimensions
  const metadata = await sharp(buffer).metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error('Invalid image dimensions');
  }
}

// 2. Add retry logic
async function processImageWithRetry(
  buffer: Buffer,
  options: ImageProcessingOptions,
  maxRetries: number = 3
): Promise<ProcessedImageResult> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await processImage(buffer, options);
    } catch (error) {
      lastError = error;
      if (attempt === maxRetries) {
        throw error;
      }

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }

  throw lastError!;
}
```

---

## Maintenance Checklist

### Daily Tasks

- [ ] Check system health (CPU, Memory, Disk)
- [ ] Review error logs
- [ ] Monitor AI provider status
- [ ] Check backup completion
- [ ] Review application metrics

### Weekly Tasks

- [ ] Update dependencies (`npm audit`)
- [ ] Review performance metrics
- [ ] Analyze error patterns
- [ ] Test backup restoration
- [ ] Review security alerts
- [ ] Clean up old logs

### Monthly Tasks

- [ ] Apply security patches
- [ ] Update Node.js (if needed)
- [ ] Review and optimize database queries
- [ ] Test disaster recovery procedure
- [ ] Review and rotate logs
- [ ] Update documentation

### Quarterly Tasks

- [ ] Full security audit
- [ ] Performance testing
- [ ] Disaster recovery drill
- [ ] Review and update procedures
- [ ] Capacity planning review
- [ ] Technology stack review

### Automated Maintenance

```bash
#!/bin/bash
# scripts/automated-maintenance.sh

# Daily maintenance
0 2 * * * /var/www/cultivai-pro/scripts/automated-maintenance.sh daily

# Weekly maintenance
0 3 * * 0 /var/www/cultivai-pro/scripts/automated-maintenance.sh weekly

# Monthly maintenance
0 4 1 * * /var/www/cultivai-pro/scripts/automated-maintenance.sh monthly
```

---

## Conclusion

This technical documentation provides comprehensive guidance for deploying, securing, and maintaining the CultivAI Pro Photo Analysis System. It covers:

- **Architecture**: System design and component interactions
- **Security**: Multi-layer security implementation
- **Deployment**: Multiple deployment strategies
- **Monitoring**: Metrics, alerting, and logging
- **Operations**: Maintenance, troubleshooting, and best practices

For additional support:
- Documentation: https://docs.cultivaipro.com
- GitHub: https://github.com/cultivaipro/cultivai-pro
- Email: dev@cultivaipro.com

**Happy deploying!** 🚀
