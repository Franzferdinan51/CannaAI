import { z } from 'zod';

// Security constants
export const MAX_STRING_LENGTH = 10000;
export const MAX_SAFE_PH = 14;
export const MIN_SAFE_PH = 0;
export const MAX_SAFE_TEMP = 150;
export const MIN_SAFE_TEMP = -50;
export const MAX_SAFE_HUMIDITY = 100;
export const MIN_SAFE_HUMIDITY = 0;
export const safeBodyLimitBytes = 512 * 1024; // 512KB

// Sanitization functions
const sanitizeString = (str: string): string => {
  if (typeof str !== 'string') return str;

  return str
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .slice(0, MAX_STRING_LENGTH); // Limit length
};

const sanitizeNumberString = (str: string): string => {
  return str.replace(/[^\d.-]/g, '').slice(0, 20);
};

// Enhanced validation schemas
export const analyzeRequestSchema = z.object({
  strain: z.string()
    .min(1, "Strain name cannot be empty")
    .max(100, "Strain name too long")
    .transform(sanitizeString)
    .optional()
    .default("Unknown strain"),

  leafSymptoms: z.string()
    .min(1, "Symptoms description required")
    .max(2000, "Symptoms description too long")
    .transform(sanitizeString)
    .optional()
    .default("General symptoms"),

  phLevel: z.string()
    .max(10, "pH value too long")
    .transform(sanitizeNumberString)
    .refine((val) => {
      if (!val) return true; // Optional
      const num = parseFloat(val);
      return !isNaN(num) && num >= MIN_SAFE_PH && num <= MAX_SAFE_PH;
    }, "pH must be between 0 and 14")
    .optional(),

  temperature: z.union([
    z.string().transform(sanitizeNumberString),
    z.number()
  ]).optional()
  .transform(val => {
    if (typeof val === 'string') {
      const num = parseFloat(val);
      return isNaN(num) ? undefined : num;
    }
    return val;
  })
  .refine((val) => {
    if (val === undefined) return true;
    return val >= MIN_SAFE_TEMP && val <= MAX_SAFE_TEMP;
  }, `Temperature must be between ${MIN_SAFE_TEMP}° and ${MAX_SAFE_TEMP}°`),

  temperatureUnit: z.enum(['C', 'F']).optional(),

  humidity: z.union([
    z.string().transform(sanitizeNumberString),
    z.number()
  ]).optional()
  .transform(val => {
    if (typeof val === 'string') {
      const num = parseFloat(val);
      return isNaN(num) ? undefined : num;
    }
    return val;
  })
  .refine((val) => {
    if (val === undefined) return true;
    return val >= MIN_SAFE_HUMIDITY && val <= MAX_SAFE_HUMIDITY;
  }, `Humidity must be between ${MIN_SAFE_HUMIDITY}% and ${MAX_SAFE_HUMIDITY}%`),

  medium: z.string()
    .max(50, "Medium name too long")
    .transform(sanitizeString)
    .optional(),

  growthStage: z.string()
    .max(50, "Growth stage too long")
    .transform(sanitizeString)
    .optional(),

  // Enhanced diagnostic features
  plantImage: z.string()
    .max(750000000, "Image too large") // ~750MB base64 limit to handle 500MB images with compression overhead
    .refine((val) => {
      if (!val) return true; // Optional
      try {
        // Basic base64 validation for data URLs - support HEIC/HEIF
        return (val.startsWith('data:image/') && val.includes('base64,')) ||
               (val.startsWith('data:application/octet-stream') && val.includes('base64,')) ||
               (val.startsWith('data:file/') && val.includes('heic;base64,')) ||
               (val.startsWith('data:file/') && val.includes('heif;base64,'));
      } catch {
        return false;
      }
    }, "Invalid image format")
    .optional(),

  pestDiseaseFocus: z.enum(['none', 'pests', 'diseases', 'environmental', 'all'])
    .optional()
    .default('all'),

  urgency: z.enum(['low', 'medium', 'high', 'critical'])
    .optional()
    .default('medium'),

  additionalNotes: z.string()
    .max(1000, "Additional notes too long")
    .transform(sanitizeString)
    .optional(),
});

export const autoAnalyzeRequestSchema = z.object({
  sensorData: z.object({
    temperature: z.number()
      .min(MIN_SAFE_TEMP, `Temperature must be >= ${MIN_SAFE_TEMP}`)
      .max(MAX_SAFE_TEMP, `Temperature must be <= ${MAX_SAFE_TEMP}`),
    humidity: z.number()
      .min(MIN_SAFE_HUMIDITY, `Humidity must be >= ${MIN_SAFE_HUMIDITY}`)
      .max(MAX_SAFE_HUMIDITY, `Humidity must be <= ${MAX_SAFE_HUMIDITY}`),
    ph: z.number()
      .min(MIN_SAFE_PH, `pH must be >= ${MIN_SAFE_PH}`)
      .max(MAX_SAFE_PH, `pH must be <= ${MAX_SAFE_PH}`)
      .optional(),
    soilMoisture: z.number().min(0).max(100).optional(),
    lightIntensity: z.number().min(0).max(2000).optional(),
    ec: z.number().min(0).max(10).optional(),
    co2: z.number().min(0).max(2000).optional(),
  }),
  strain: z.string()
    .max(100)
    .transform(sanitizeString)
    .optional(),
  growthStage: z.string()
    .max(50)
    .transform(sanitizeString)
    .optional(),
  room: z.string()
    .max(50)
    .transform(sanitizeString)
    .optional(),
  visualSymptoms: z.string()
    .max(1000)
    .transform(sanitizeString)
    .optional(),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const idParamSchema = z.object({
  id: z.string()
    .min(1, "ID cannot be empty")
    .max(100, "ID too long")
    .regex(/^[a-zA-Z0-9_-]+$/, "ID contains invalid characters")
});

// Type definitions
export type AnalyzeRequest = z.infer<typeof analyzeRequestSchema>;
export type AutoAnalyzeRequest = z.infer<typeof autoAnalyzeRequestSchema>;
export type PaginationParams = z.infer<typeof paginationSchema>;

// Validation middleware
export class ValidationError extends Error {
  constructor(
    message: string,
    public code: string = 'VALIDATION_ERROR',
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function validateRequestBody<T>(schema: z.ZodSchema<T>, body: unknown): T {
  try {
    return schema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError && error.errors && Array.isArray(error.errors)) {
      const details = error.errors.map(err => ({
        field: err.path && Array.isArray(err.path) ? err.path.join('.') : 'unknown',
        message: err.message || 'Unknown validation error',
        code: err.code || 'VALIDATION_ERROR'
      }));

      throw new ValidationError(
        'Validation failed: ' + details.map(d => `${d.field}: ${d.message}`).join('; '),
        'VALIDATION_ERROR',
        400
      );
    }

    // Fallback for other errors or malformed ZodError
    const errorMessage = error instanceof Error ? error.message : 'Unknown validation error';
    throw new ValidationError(
      'Invalid request data: ' + errorMessage,
      'INVALID_DATA',
      400
    );
  }
}

// Rate limiting helper
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();

  constructor(
    private windowMs: number = 60000, // 1 minute
    private maxRequests: number = 60 // 60 requests per minute
  ) {}

  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    if (!this.requests.has(identifier)) {
      this.requests.set(identifier, []);
    }

    const timestamps = this.requests.get(identifier)!;

    // Remove old requests outside the window
    const validTimestamps = timestamps.filter(time => time > windowStart);
    this.requests.set(identifier, validTimestamps);

    // Check if under limit
    if (validTimestamps.length < this.maxRequests) {
      validTimestamps.push(now);
      return true;
    }

    return false;
  }

  cleanup(): void {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    for (const [key, timestamps] of this.requests.entries()) {
      const validTimestamps = timestamps.filter(time => time > windowStart);
      if (validTimestamps.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, validTimestamps);
      }
    }
  }
}

// Global rate limiters
export const apiRateLimiter = new RateLimiter(60000, 100); // 100 requests per minute
export const analysisRateLimiter = new RateLimiter(60000, 20); // 20 analyses per minute

// Ensure the cleanup interval is created only once to avoid leaks in dev/serverless
const globalForRateLimiter = globalThis as typeof globalThis & {
  __rateLimiterCleanupInterval?: ReturnType<typeof setInterval>;
};

if (globalForRateLimiter.__rateLimiterCleanupInterval) {
  clearInterval(globalForRateLimiter.__rateLimiterCleanupInterval);
}

globalForRateLimiter.__rateLimiterCleanupInterval = setInterval(() => {
  apiRateLimiter.cleanup();
  analysisRateLimiter.cleanup();
}, 300000); // Every 5 minutes

