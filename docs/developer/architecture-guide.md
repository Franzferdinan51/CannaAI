# Photo Analysis System - Developer Architecture Guide

## Table of Contents

1. [System Architecture Overview](#system-architecture-overview)
2. [Core Components](#core-components)
3. [API Architecture](#api-architecture)
4. [AI Provider Integration](#ai-provider-integration)
5. [Image Processing Pipeline](#image-processing-pipeline)
6. [Database Schema](#database-schema)
7. [Security Architecture](#security-architecture)
8. [Development Workflow](#development-workflow)
9. [Extension Guide](#extension-guide)
10. [Performance Considerations](#performance-considerations)
11. [Deployment Guide](#deployment-guide)

## System Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Photo Analysis System                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    │
│  │   Frontend   │    │  Backend API │    │ AI Providers │    │
│  │  (Next.js)   │◄──►│   (Routes)   │◄──►│   (AI/ML)    │    │
│  └──────────────┘    └──────────────┘    └──────────────┘    │
│          │                   │                   │            │
│          │                   │                   │            │
│          └───────────────────┼───────────────────┘            │
│                              │                                │
│                    ┌─────────▼─────────┐                      │
│                    │  Image Processing │                      │
│                    │     Library       │                      │
│                    └─────────┬─────────┘                      │
│                              │                                │
│                    ┌─────────▼─────────┐                      │
│                    │   Database        │                      │
│                    │   (Prisma/SQLite) │                      │
│                    └───────────────────┘                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Key Features

- **Multi-modal AI Analysis**: Combines image analysis with text-based diagnosis
- **Multi-provider Support**: Supports both cloud (OpenRouter) and local (LM Studio) AI providers
- **Advanced Image Processing**: Automatic optimization, compression, and format conversion
- **Comprehensive Diagnosis**: Detects pests, diseases, nutrient deficiencies, and environmental stress
- **Trichome Analysis**: Specialized analysis for harvest timing determination
- **Real-time Processing**: Sub-5 second analysis turnaround
- **Rate Limiting**: Built-in protection against abuse
- **Security Hardened**: Input validation, sanitization, and security headers

## Core Components

### 1. Analysis Engine (`src/app/api/analyze/route.ts`)

**Purpose**: Primary endpoint for comprehensive plant health analysis

**Key Responsibilities**:
- Request validation and sanitization
- Rate limiting enforcement
- Image processing and optimization
- AI provider detection and execution
- Response enhancement and validation
- Database persistence

**Key Features**:
- Zod schema validation for request body
- Adaptive image compression based on resolution
- Multi-provider AI execution with fallback
- Comprehensive error handling
- Security headers and input sanitization
- Rate limit tracking with IP hashing

**Analysis Prompt Structure**:
```typescript
const prompt = `
🌿 EXPERT CANNABIS/HEMP DIAGNOSTIC SYSTEM v4.0 🌿

📊 COMPLETE ANALYSIS PARAMETERS:
🔬 Strain: ${strain}
⚠️ Primary Symptoms: ${leafSymptoms}
🧪 pH Level: ${phLevel}
🌡️ Temperature: ${temperatureCelsius}°C
💧 Humidity: ${humidity}%
🪴 Growing Medium: ${medium}
🌱 Growth Stage: ${growthStage}
🎯 Diagnostic Focus: ${pestDiseaseFocus}
⚡ Urgency Level: ${urgency}
📸 IMAGE ANALYSIS: ${imageBase64ForAI ? 'Visual examination included' : 'Text-based analysis'}

[Detailed diagnostic prompt with scientific knowledge base...]
`;
```

**Response Structure**:
```typescript
{
  success: true,
  analysis: {
    diagnosis: string,
    confidence: number,
    severity: 'mild' | 'moderate' | 'severe' | 'critical',
    symptomsMatched: string[],
    causes: string[],
    treatment: string[],
    healthScore: number,
    // ... comprehensive results
  },
  imageInfo: ImageProcessingInfo,
  metadata: AnalysisMetadata,
  provider: AIProviderInfo,
  rateLimit: RateLimitInfo
}
```

### 2. Trichome Analysis Engine (`src/app/api/trichome-analysis/route.ts`)

**Purpose**: Specialized analysis for determining harvest readiness

**Key Responsibilities**:
- High-resolution image processing
- Trichome maturity detection
- Harvest timing calculation
- Device capability validation
- Magnification assessment

**Trichome Maturity Science**:
- **Clear trichomes** (0-10% amber): Too early, low THC
- **Cloudy trichomes** (Peak THC): Optimal potency window
- **Amber trichomes** (70-100%): CBN production, sedative effects

**Requirements**:
- Minimum 100x magnification
- Sharp focus on trichome heads
- Even lighting without glare
- High resolution (2MP minimum)

### 3. AI Provider Detection (`src/lib/ai-provider-detection.ts`)

**Purpose**: Manage multiple AI provider configurations and execution

**Supported Providers**:

#### OpenRouter (Cloud-based)
- **Configuration**: API key required
- **Models**: meta-llama/llama-3.1-8b-instruct:free (default)
- **Timeout**: 30 seconds default
- **Use Case**: Production deployments, serverless environments
- **Pros**: Reliable, scalable, no infrastructure required
- **Cons**: Ongoing costs, internet dependency

#### LM Studio (Local)
- **Configuration**: Local server at http://localhost:1234
- **Models**: granite-4.0-micro (default)
- **Timeout**: 120 seconds default
- **Use Case**: Local development, privacy-focused deployments
- **Pros**: Free, private, offline capable
- **Cons**: Requires local setup, not serverless-compatible

**Provider Detection Flow**:
```typescript
async function detectAvailableProviders() {
  // Check LM Studio
  const lmStudioResult = await checkLMStudio();

  // Check OpenRouter
  const openRouterResult = await checkOpenRouter();

  // Select primary provider
  const primary = selectPrimaryProvider([lmStudioResult, openRouterResult]);

  return { primary, fallback: unavailableProviders };
}
```

### 4. Image Processing Library (`src/lib/image.ts`)

**Purpose**: Comprehensive image processing and optimization

**Core Functions**:

#### Image Optimization
```typescript
async function processImageForVisionModel(
  inputBuffer: Buffer,
  options: ImageProcessingOptions
): Promise<ProcessedImageResult>
```

**Processing Pipeline**:
1. **Format Detection**: Automatic format detection (JPEG, PNG, WEBP, HEIC, TIFF)
2. **HEIC Conversion**: Automatic conversion to JPEG using heic-convert
3. **Metadata Extraction**: Width, height, density, channels
4. **Adaptive Resizing**:
   - Ultra-high res (>20MP): 1600x1600 @ 90% quality
   - High res (8-20MP): 1200x1200 @ 90% quality
   - Medium res (2-8MP): 1000x1000 @ 90% quality
   - Standard res (<2MP): 800x800 @ 90% quality
5. **Format Conversion**: JPEG output for maximum AI compatibility
6. **Compression**: Optimized for vision model input

**Supported Formats**:
- Input: JPEG, PNG, WEBP, AVIF, GIF, TIFF, HEIC, HEIF
- Output: JPEG (with quality settings)

**Error Handling**:
- `ImageProcessingError`: General processing errors
- `HeicConversionError`: HEIC conversion failures
- `UnsupportedFormatError`: Invalid format
- `ImageSizeError`: File size validation errors

## API Architecture

### RESTful Endpoint Design

```
/api/analyze                    - Plant health analysis
  ├─ GET    : Service status
  └─ POST   : Submit analysis request

/api/trichome-analysis          - Trichome maturity analysis
  ├─ GET    : Capabilities info
  └─ POST   : Submit trichome analysis

/api/plants/{id}/analyses       - Plant-specific history
  └─ GET    : Retrieve plant analysis history

/api/analytics/plant-health     - Health analytics
  ├─ GET    : Retrieve analytics
  └─ POST   : Create analytics record

/api/history                    - Global analysis history
  ├─ GET    : List all analyses
  ├─ POST   : Save analysis
  └─ DELETE : Remove analysis
```

### Request/Response Pattern

**Standard Success Response**:
```typescript
{
  success: true,
  data: Any,              // Primary response data
  metadata: Metadata,     // Processing metadata
  timestamp: string,      // ISO 8601 timestamp
  requestId: string       // Unique request identifier
}
```

**Standard Error Response**:
```typescript
{
  success: false,
  error: {
    type: string,         // Error classification
    message: string,      // Error message
    userMessage: string,  // User-friendly message
    details?: string,     // Detailed error info
    timestamp: string,    // ISO 8601 timestamp
    requestId: string     // Unique request identifier
  },
  alternatives?: object   // Alternative solutions
}
```

### Error Classification

| Type | HTTP Code | Description |
|------|-----------|-------------|
| `validation_error` | 400 | Invalid request format or parameters |
| `image_error` | 413 | Image processing or validation failure |
| `rate_limit_error` | 429 | Rate limit exceeded |
| `ai_provider_unavailable` | 503 | No AI providers configured |
| `timeout_error` | 504 | Analysis timeout |
| `network_error` | 503 | Connectivity issues |
| `internal_error` | 500 | Server-side errors |

## Database Schema

### Core Models

#### PlantAnalysis Model
```prisma
model PlantAnalysis {
  id         String   @id @default(cuid())
  plantId    String?          // Optional plant linkage
  plant      Plant?   @relation(fields: [plantId], references: [id])
  request    Json?            // Original request data
  result     Json?            // AI analysis results
  provider   String?          // AI provider used
  imageInfo  Json?            // Image processing metadata
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@index([plantId])
  @@index([provider])
  @@index([createdAt])
}
```

#### PlantHealthAnalytics Model
```prisma
model PlantHealthAnalytics {
  id              String   @id @default(cuid())
  plantId         String
  plant           Plant    @relation(fields: [plantId], references: [id])
  analysisId      String?
  healthScore     Float    // 0-100
  healthStatus    String   // 'excellent', 'good', 'fair', 'poor', 'critical'
  issues          Json?
  recommendations Json?
  confidence      Float?   // AI confidence 0-1
  timestamp       DateTime @default(now())

  @@index([plantId, timestamp])
  @@index([healthStatus, timestamp])
}
```

#### AnalysisHistory Model
```prisma
model AnalysisHistory {
  id          String   @id @default(cuid())
  plantId     String
  plant       Plant    @relation(fields: [plantId], references: [id])
  analysisType String  @db.VarChar(100)
  analysisId  String?
  data        Json
  metadata    Json?
  createdAt   DateTime @default(now())

  @@index([plantId, createdAt])
  @@index([analysisType, createdAt])
}
```

### Schema Relationships

```
Plant (1) ──< (N) PlantAnalysis
Plant (1) ──< (N) PlantHealthAnalytics
Plant (1) ──< (N) AnalysisHistory
Plant (1) ──< (N) AnalysisScheduler
Plant (1) ──< (N) AnalysisMilestone
```

## Security Architecture

### Input Validation & Sanitization

**Zod Schema Validation**:
```typescript
const AnalysisRequestSchema = z.object({
  strain: z.string().min(1).max(100).transform(val => val.trim()),
  leafSymptoms: z.string().max(1000).transform(val => val.trim()),
  phLevel: z.union([
    z.string().regex(/^\d*\.?\d*$/).transform(val => parseFloat(val)),
    z.number()
  ]).optional(),
  // ... additional validations
});
```

**Input Sanitization**:
```typescript
function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '')        // Remove HTML tags
    .replace(/javascript:/gi, '') // Remove JS protocols
    .replace(/on\w+=/gi, '')     // Remove event handlers
    .trim();
}
```

### Rate Limiting

**Implementation**:
```typescript
const RATE_LIMIT_WINDOW = 15 * 60 * 1000;  // 15 minutes
const MAX_REQUESTS_PER_WINDOW = 20;
const requestTracker = new Map<string, { count: number; resetTime: number }>();
```

**IP Hashing**:
```typescript
const hashedIP = crypto.createHash('sha256')
  .update(clientIP)
  .digest('hex')
  .substring(0, 16);
```

### Security Headers

**Applied to All Responses**:
```typescript
function addSecurityHeaders(response: NextResponse) {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  return response;
}
```

### Image Security

**Validation**:
- File type verification (MIME type checking)
- File size limits (50MB maximum)
- Format support validation
- Malicious file detection

**Processing**:
- HEIC conversion in secure environment
- Automatic orientation correction
- Metadata stripping for privacy
- Quality optimization

## Development Workflow

### Local Development Setup

1. **Clone Repository**:
```bash
git clone https://github.com/cultivaipro/cultivai-pro.git
cd cultivai-pro
```

2. **Install Dependencies**:
```bash
npm install
```

3. **Configure Environment**:
```bash
cp .env.example .env
```

4. **Set Up Database**:
```bash
npx prisma migrate dev
npx prisma generate
```

5. **Configure AI Provider**:

**Option A: OpenRouter (Recommended)**
```bash
export OPENROUTER_API_KEY=your_api_key_here
export OPENROUTER_MODEL=meta-llama/llama-3.1-8b-instruct:free
```

**Option B: LM Studio**
```bash
# Download and install LM Studio
# Start local server on port 1234
export LM_STUDIO_URL=http://localhost:1234
export LM_STUDIO_MODEL=granite-4.0-micro
```

6. **Start Development Server**:
```bash
npm run dev
```

### Testing

**Run Tests**:
```bash
# All tests
npm test

# API endpoint tests
npm test -- analyze.test.ts

# With coverage
npm test -- --coverage
```

**Manual Testing**:
```bash
# Test analysis endpoint
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d @test-data/sample-analysis.json

# Test trichome endpoint
curl -X POST http://localhost:3000/api/trichome-analysis \
  -H "Content-Type: application/json" \
  -d @test-data/sample-trichome.json
```

### Code Style

**TypeScript Configuration**:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": false,
    "noImplicitAny": false,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve"
  }
}
```

**Linting**:
```bash
npm run lint          # Check code quality
npm run lint:fix      # Auto-fix issues
```

### Debugging

**Enable Debug Logging**:
```bash
export DEBUG=photo-analysis:*
```

**Common Issues**:

1. **AI Provider Not Available**
   - Check provider configuration
   - Verify API keys
   - Test connectivity

2. **Image Processing Failures**
   - Check image format
   - Verify file size
   - Test with known good images

3. **Analysis Timeouts**
   - Increase timeout value
   - Check provider status
   - Optimize image size

## Extension Guide

### Adding New AI Providers

**Step 1: Implement Provider Detection**
```typescript
// src/lib/ai-provider-detection.ts

async function checkNewProvider(): Promise<ProviderDetectionResult> {
  const config = {
    apiKey: process.env.NEW_PROVIDER_API_KEY,
    // ... other config
  };

  try {
    // Test provider availability
    const response = await fetch(/* test endpoint */);
    return {
      isAvailable: response.ok,
      provider: 'new-provider',
      reason: response.ok ? 'Available' : 'Unavailable',
      config,
      recommendations: []
    };
  } catch (error) {
    return {
      isAvailable: false,
      provider: 'new-provider',
      reason: `Error: ${error.message}`,
      config,
      recommendations: []
    };
  }
}
```

**Step 2: Add to Provider Detection List**
```typescript
export async function detectAvailableProviders() {
  const results = [];

  // Existing providers...
  const newProviderResult = await checkNewProvider();
  results.push(newProviderResult);

  // ... rest of logic
}
```

**Step 3: Implement Provider Execution**
```typescript
async function callAIProvider(
  provider: 'lm-studio' | 'openrouter' | 'new-provider',
  prompt: string,
  imageBase64: string | undefined,
  config: any,
  timeout: number
): Promise<any> {
  switch (provider) {
    case 'new-provider':
      return callNewProvider(prompt, imageBase64, config, timeout);
    // ... other cases
  }
}
```

### Adding New Analysis Types

**Step 1: Create New Endpoint**
```typescript
// src/app/api/new-analysis/route.ts

export async function POST(request: NextRequest) {
  // Validation
  // Processing
  // AI execution
  // Response
}
```

**Step 2: Update OpenAPI Specification**
```yaml
# Add new endpoint to openapi-specification.md
```

**Step 3: Add Database Models (if needed)**
```prisma
model NewAnalysis {
  id        String   @id @default(cuid())
  // ... fields
  createdAt DateTime @default(now())
}
```

**Step 4: Update Frontend Integration**
```typescript
// src/lib/api/client.ts

export async function newAnalysis(data: NewAnalysisRequest): Promise<NewAnalysisResponse> {
  return apiClient.post('/api/new-analysis', data);
}
```

### Custom Analysis Prompts

**Creating Custom Prompts**:
```typescript
function createCustomPrompt(parameters: CustomParameters): string {
  return `
🌿 CUSTOM ANALYSIS SYSTEM 🌿

[Custom prompt structure based on specific requirements]

Parameters: ${JSON.stringify(parameters)}

[Detailed analysis instructions...]

Return valid JSON with this structure:
{
  "customResult": "...",
  "confidence": number
}
`;
}
```

## Performance Considerations

### Image Processing Optimization

**Adaptive Compression**:
- Ultra-high res (>20MP): 1600x1600 @ 90% quality → ~500KB
- High res (8-20MP): 1200x1200 @ 90% quality → ~300KB
- Medium res (2-8MP): 1000x1000 @ 90% quality → ~200KB
- Standard res (<2MP): 800x800 @ 90% quality → ~150KB

**Processing Pipeline**:
1. HEIC conversion: ~200-500ms
2. Metadata extraction: ~50-100ms
3. Resize & compression: ~100-300ms
4. Base64 encoding: ~50-100ms
**Total**: ~400-1000ms (varies with image size)

### AI Provider Performance

**OpenRouter**:
- Network latency: 200-500ms
- Processing time: 2-5 seconds
- Timeout: 30 seconds default
- **Total**: 3-6 seconds

**LM Studio**:
- Network latency: <10ms (local)
- Processing time: 2-30 seconds (depends on model)
- Timeout: 120 seconds default
- **Total**: 2-31 seconds

### Caching Strategy

**Analysis Results**:
- Cache successful analyses for 24 hours
- Use plantId + request hash as key
- Reduce redundant API calls

**Provider Status**:
- Cache provider availability for 5 minutes
- Reduce unnecessary health checks
- Improve response time

### Database Optimization

**Indexes**:
```prisma
@@index([plantId])
@@index([provider])
@@index([createdAt])
@@index([healthStatus, timestamp])
```

**Query Optimization**:
- Use `take` to limit results
- Select only needed fields
- Order by createdAt desc for recent data
- Use aggregation for analytics

### Rate Limiting Impact

**Current Limits**:
- 20 requests per 15 minutes
- Adequate for most use cases
- Prevents abuse without hindering legitimate use

**Adjusting Limits**:
```typescript
const RATE_LIMIT_WINDOW = 15 * 60 * 1000;  // 15 minutes
const MAX_REQUESTS_PER_WINDOW = 20;
```

## Deployment Guide

### Environment Variables

**Required**:
```bash
# Database
DATABASE_URL="file:./dev.db"

# OpenRouter (for production)
OPENROUTER_API_KEY="sk-or-v1-..."

# LM Studio (for development)
LM_STUDIO_URL="http://localhost:1234"
LM_STUDIO_MODEL="granite-4.0-micro"
```

**Optional**:
```bash
# Provider timeouts
OPENROUTER_TIMEOUT=30000
LM_STUDIO_TIMEOUT=120000

# Model configuration
OPENROUTER_MODEL="meta-llama/llama-3.1-8b-instruct:free"
LM_STUDIO_MAX_TOKENS=2000
OPENROUTER_MAX_TOKENS=2000

# Build mode
BUILD_MODE="server"  # or "static"
```

### Production Deployment

**Vercel**:
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Configure environment variables
vercel env add OPENROUTER_API_KEY production
```

**Netlify**:
```bash
# Install Netlify CLI
npm i -g netlify-cli

# Build
npm run build

# Deploy
netlify deploy --prod
```

**Docker**:
```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

**Server/VPS**:
```bash
# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone repository
git clone https://github.com/cultivaipro/cultivai-pro.git
cd cultivai-pro

# Install dependencies
npm ci

# Build
npm run build

# Start with PM2
npm install -g pm2
pm2 start npm --name "cultivai-pro" -- start
pm2 save
pm2 startup
```

### Monitoring

**Health Checks**:
```bash
# Check service status
curl https://api.cultivaipro.com/api/analyze

# Expected response:
{
  "success": true,
  "message": "Plant analysis service is running",
  "buildMode": "server"
}
```

**Logging**:
```typescript
console.log('🚀 Starting enhanced cannabis plant analysis...');
console.log(`📊 Analysis parameters: ${strain}, Stage: ${growthStage}`);
console.log(`📡 AI provider detected: ${providerDetection.primary.provider}`);
console.log(`✅ Analysis completed successfully`);
```

**Metrics to Monitor**:
- Response times (target: <5 seconds)
- Error rates (target: <1%)
- AI provider availability
- Rate limit hits
- Database performance
- Image processing times

### Backup & Recovery

**Database Backup**:
```bash
# SQLite backup
cp prisma/dev.db backups/db-$(date +%Y%m%d).db

# Automated backup script
#!/bin/bash
BACKUP_DIR="/backups/cultivai-pro"
DATE=$(date +%Y%m%d_%H%M%S)
cp prisma/dev.db $BACKUP_DIR/db-$DATE.db
```

**Configuration Backup**:
- Store environment variables securely
- Use secrets management (AWS Secrets Manager, etc.)
- Document all configuration changes
- Version control non-sensitive configs

## Support & Resources

**Documentation**:
- API Reference: `/docs/api/openapi-specification.md`
- User Guide: `/docs/photo-analysis/user-guide.md`
- Integration Guide: `/docs/developer/integration-guide.md`

**Community**:
- GitHub: https://github.com/cultivaipro/cultivai-pro
- Discussions: https://github.com/cultivaipro/cultivai-pro/discussions
- Issues: https://github.com/cultivaipro/cultivai-pro/issues

**Support**:
- Email: support@cultivaipro.com
- Documentation: https://docs.cultivaipro.com
- Community Forum: https://community.cultivaipro.com

## Conclusion

The Photo Analysis System is built with extensibility, security, and performance in mind. This architecture guide provides the foundation for understanding, maintaining, and extending the system. For specific implementation details, refer to the source code and inline documentation.
