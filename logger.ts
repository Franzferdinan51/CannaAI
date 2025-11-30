/**
 * ========================================
 * Production Logging Configuration
 * ========================================
 * Structured logging with multiple transports
 */

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

// Log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Colors for console
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

// Custom format for production
const productionFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

// Custom format for development
const developmentFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss',
  }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  ),
);

// Determine log level from environment
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'warn';
};

// Create transports array
const transports: winston.transport[] = [];

// Console transport for development
if (process.env.NODE_ENV !== 'production') {
  transports.push(
    new winston.transports.Console({
      format: developmentFormat,
    })
  );
}

// File transports for all environments
const logDir = process.env.LOG_DIR || './logs';
const maxSize = process.env.LOG_MAX_SIZE || '20m';
const maxFiles = process.env.LOG_MAX_FILES || '14d';

transports.push(
  // Error logs
  new DailyRotateFile({
    filename: `${logDir}/error-%DATE%.log`,
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    maxSize,
    maxFiles,
    format: productionFormat,
  }),

  // Combined logs
  new DailyRotateFile({
    filename: `${logDir}/combined-%DATE%.log`,
    datePattern: 'YYYY-MM-DD',
    maxSize,
    maxFiles,
    format: productionFormat,
  }),

  // HTTP logs
  new DailyRotateFile({
    filename: `${logDir}/http-%DATE%.log`,
    datePattern: 'YYYY-MM-DD',
    level: 'http',
    maxSize,
    maxFiles,
    format: productionFormat,
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: level(),
  levels,
  transports,
  exitOnError: false,
});

// Stream for Express.js
logger.stream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
} as any;

// Add request context helper
export interface LogContext {
  requestId?: string;
  userId?: string;
  ip?: string;
  method?: string;
  url?: string;
  userAgent?: string;
  [key: string]: any;
}

export class Logger {
  private logger: winston.Logger;
  private context: LogContext;

  constructor(context: LogContext = {}) {
    this.logger = logger;
    this.context = context;
  }

  private addContext(meta: any = {}) {
    return { ...this.context, ...meta };
  }

  error(message: string, meta?: any) {
    this.logger.error(message, this.addContext(meta));
  }

  warn(message: string, meta?: any) {
    this.logger.warn(message, this.addContext(meta));
  }

  info(message: string, meta?: any) {
    this.logger.info(message, this.addContext(meta));
  }

  http(message: string, meta?: any) {
    this.logger.http(message, this.addContext(meta));
  }

  debug(message: string, meta?: any) {
    this.logger.debug(message, this.addContext(meta));
  }

  // Specialized methods
  logRequest(req: any, res: any, responseTime?: number) {
    this.info('HTTP Request', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      requestId: req.id,
    });
  }

  logError(error: Error, context?: any) {
    this.error(error.message, {
      stack: error.stack,
      ...context,
    });
  }

  logPerformance(operation: string, duration: number, meta?: any) {
    this.info('Performance', {
      operation,
      duration: `${duration}ms`,
      ...meta,
    });
  }

  logSecurity(event: string, meta?: any) {
    this.warn('Security Event', {
      event,
      ...meta,
    });
  }

  logDatabase(query: string, duration: number, meta?: any) {
    this.debug('Database Query', {
      query,
      duration: `${duration}ms`,
      ...meta,
    });
  }

  logCache(operation: string, key: string, hit: boolean, meta?: any) {
    this.debug('Cache Operation', {
      operation,
      key,
      hit,
      ...meta,
    });
  }

  // Create child logger with additional context
  child(additionalContext: LogContext): Logger {
    return new Logger({ ...this.context, ...additionalContext });
  }
}

// Create default logger instance
export default new Logger();

// Export logger factory
export function createLogger(context: LogContext = {}) {
  return new Logger(context);
}

// Express middleware for request logging
export const requestLogger = (req: any, res: any, next: any) => {
  const start = Date.now();
  const requestId = req.headers['x-request-id'] || Math.random().toString(36).substring(7);

  // Add request ID to request object
  req.id = requestId;

  // Create logger instance for this request
  req.logger = new Logger({
    requestId,
    ip: req.ip || req.connection.remoteAddress,
    method: req.method,
    url: req.url,
    userAgent: req.get('user-agent'),
  });

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    req.logger.logRequest(req, res, duration);
  });

  next();
};
