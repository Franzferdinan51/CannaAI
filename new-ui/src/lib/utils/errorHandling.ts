import { ApiClientError, RateLimitError, NetworkError, TimeoutError, AIProviderError } from '@/lib/api/client';

// =============================================================================
// Error Types
// =============================================================================

export interface ErrorInfo {
  type: string;
  message: string;
  userMessage: string;
  code?: string;
  status?: number;
  timestamp: string;
  context?: Record<string, any>;
  suggestions?: string[];
}

export interface ErrorHandlerContext {
  showError?: (error: ErrorInfo) => void;
  logError?: (error: ErrorInfo) => void;
  reportError?: (error: ErrorInfo) => void;
}

// =============================================================================
// Error Classification
// =============================================================================

export function classifyError(error: Error): ErrorInfo {
  const timestamp = new Date().toISOString();

  if (error instanceof RateLimitError) {
    return {
      type: 'RATE_LIMIT',
      message: 'Rate limit exceeded',
      userMessage: 'You\'ve made too many requests. Please wait a moment before trying again.',
      code: 'RATE_LIMIT_EXCEEDED',
      status: 429,
      timestamp,
      suggestions: [
        'Wait a few minutes before trying again',
        'Check if there are automated requests running',
        'Consider implementing request throttling'
      ]
    };
  }

  if (error instanceof NetworkError) {
    return {
      type: 'NETWORK',
      message: 'Network connection failed',
      userMessage: 'Unable to connect to the server. Please check your internet connection and try again.',
      code: 'NETWORK_ERROR',
      status: 0,
      timestamp,
      suggestions: [
        'Check your internet connection',
        'Try refreshing the page',
        'Check if the server is accessible'
      ]
    };
  }

  if (error instanceof TimeoutError) {
    return {
      type: 'TIMEOUT',
      message: 'Request timed out',
      userMessage: 'The request took too long to complete. Please try again.',
      code: 'TIMEOUT_ERROR',
      status: 408,
      timestamp,
      suggestions: [
        'Try again with a smaller request',
        'Check your internet connection speed',
        'The server might be experiencing high load'
      ]
    };
  }

  if (error instanceof AIProviderError) {
    return {
      type: 'AI_PROVIDER',
      message: 'AI provider error',
      userMessage: error.message || 'The AI service is currently unavailable. Please try again later.',
      code: 'AI_PROVIDER_ERROR',
      status: 503,
      timestamp,
      context: { provider: error.provider },
      suggestions: [
        'Check if the AI provider is configured correctly',
        'Try switching to a different AI provider',
        'Verify your API keys and connection settings'
      ]
    };
  }

  if (error instanceof ApiClientError) {
    return {
      type: 'API_ERROR',
      message: error.message,
      userMessage: error.message,
      code: error.code,
      status: error.status,
      timestamp,
      suggestions: getApiErrorSuggestions(error.status)
    };
  }

  // Generic JavaScript errors
  if (error instanceof TypeError) {
    return {
      type: 'TYPE_ERROR',
      message: error.message,
      userMessage: 'A technical error occurred. Please refresh the page and try again.',
      code: 'TYPE_ERROR',
      timestamp,
      suggestions: [
        'Refresh the page',
        'Check your input data',
        'Contact support if the problem persists'
      ]
    };
  }

  if (error instanceof ReferenceError) {
    return {
      type: 'REFERENCE_ERROR',
      message: error.message,
      userMessage: 'A technical error occurred. Please refresh the page.',
      code: 'REFERENCE_ERROR',
      timestamp,
      suggestions: ['Refresh the page', 'Contact support if the problem persists']
    };
  }

  // Unknown error
  return {
    type: 'UNKNOWN',
    message: error.message || 'An unknown error occurred',
    userMessage: 'An unexpected error occurred. Please try again.',
    code: 'UNKNOWN_ERROR',
    timestamp,
    suggestions: [
      'Refresh the page',
      'Check your internet connection',
      'Contact support if the problem persists'
    ]
  };
}

// =============================================================================
// Error Suggestions
// =============================================================================

function getApiErrorSuggestions(status?: number): string[] {
  switch (status) {
    case 400:
      return [
        'Check your input data',
        'Ensure all required fields are filled',
        'Verify the data format is correct'
      ];
    case 401:
      return [
        'You may need to log in again',
        'Check your authentication credentials',
        'Your session may have expired'
      ];
    case 403:
      return [
        'You don\'t have permission to perform this action',
        'Contact an administrator for access',
        'Check your user permissions'
      ];
    case 404:
      return [
        'The requested resource was not found',
        'Check the URL or resource ID',
        'The resource may have been deleted'
      ];
    case 413:
      return [
        'The file is too large',
        'Try uploading a smaller file',
        'Compress the file before uploading'
      ];
    case 422:
      return [
        'Check your input validation',
        'Ensure all data is in the correct format',
        'Review the error details for specific issues'
      ];
    case 500:
      return [
        'The server encountered an error',
        'Try again in a few moments',
        'Contact support if the problem persists'
      ];
    case 502:
    case 503:
    case 504:
      return [
        'The service is temporarily unavailable',
        'Try again in a few minutes',
        'Check the service status page'
      ];
    default:
      return [
        'Try again later',
        'Check your internet connection',
        'Contact support if the problem persists'
      ];
  }
}

// =============================================================================
// Error Handler Class
// =============================================================================

export class ErrorHandler {
  private context?: ErrorHandlerContext;
  private errorHistory: ErrorInfo[] = [];
  private maxHistorySize = 100;

  constructor(context?: ErrorHandlerContext) {
    this.context = context;
  }

  /**
   * Handle an error
   */
  handleError(error: Error, additionalContext?: Record<string, any>): ErrorInfo {
    const errorInfo = classifyError(error);

    // Add additional context
    if (additionalContext) {
      errorInfo.context = {
        ...errorInfo.context,
        ...additionalContext
      };
    }

    // Add to history
    this.addToHistory(errorInfo);

    // Log error
    this.logError(errorInfo);

    // Show user-friendly message
    if (this.context?.showError) {
      this.context.showError(errorInfo);
    }

    // Report error (in production)
    if (process.env.NODE_ENV === 'production') {
      this.reportError(errorInfo);
    }

    return errorInfo;
  }

  /**
   * Add error to history
   */
  private addToHistory(errorInfo: ErrorInfo): void {
    this.errorHistory.unshift(errorInfo);

    // Keep only the most recent errors
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory = this.errorHistory.slice(0, this.maxHistorySize);
    }
  }

  /**
   * Log error to console
   */
  private logError(errorInfo: ErrorInfo): void {
    if (process.env.NODE_ENV === 'development') {
      console.group(`🚨 ${errorInfo.type} Error`);
      console.error('Message:', errorInfo.message);
      console.error('User Message:', errorInfo.userMessage);
      console.error('Code:', errorInfo.code);
      console.error('Status:', errorInfo.status);
      console.error('Timestamp:', errorInfo.timestamp);
      if (errorInfo.context) {
        console.error('Context:', errorInfo.context);
      }
      if (errorInfo.suggestions) {
        console.info('Suggestions:', errorInfo.suggestions);
      }
      console.groupEnd();
    }
  }

  /**
   * Report error to external service
   */
  private reportError(errorInfo: ErrorInfo): void {
    if (this.context?.reportError) {
      this.context.reportError(errorInfo);
    }

    // In a real app, you would send this to a service like Sentry
    // Example: Sentry.captureException(error, { extra: errorInfo });
  }

  /**
   * Get error history
   */
  getErrorHistory(): ErrorInfo[] {
    return [...this.errorHistory];
  }

  /**
   * Clear error history
   */
  clearHistory(): void {
    this.errorHistory = [];
  }

  /**
   * Get error statistics
   */
  getErrorStats(): Record<string, number> {
    const stats: Record<string, number> = {};

    this.errorHistory.forEach(error => {
      stats[error.type] = (stats[error.type] || 0) + 1;
    });

    return stats;
  }
}

// =============================================================================
// Global Error Handler Instance
// =============================================================================

export const globalErrorHandler = new ErrorHandler();

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Create an error handler function
 */
export function createErrorHandler(
  context?: ErrorHandlerContext
): (error: Error, additionalContext?: Record<string, any>) => ErrorInfo {
  const handler = new ErrorHandler(context);

  return (error, additionalContext) => {
    return handler.handleError(error, additionalContext);
  };
}

/**
 * Handle async function errors
 */
export async function safeAsync<T>(
  asyncFn: () => Promise<T>,
  errorHandler?: (error: Error) => void,
  context?: Record<string, any>
): Promise<[T | null, ErrorInfo | null]> {
  try {
    const result = await asyncFn();
    return [result, null];
  } catch (error) {
    const errorObj = error as Error;
    const errorInfo = globalErrorHandler.handleError(errorObj, context);

    if (errorHandler) {
      errorHandler(errorObj);
    }

    return [null, errorInfo];
  }
}

/**
 * Handle synchronous function errors
 */
export function safeSync<T>(
  syncFn: () => T,
  errorHandler?: (error: Error) => void,
  context?: Record<string, any>
): [T | null, ErrorInfo | null] {
  try {
    const result = syncFn();
    return [result, null];
  } catch (error) {
    const errorObj = error as Error;
    const errorInfo = globalErrorHandler.handleError(errorObj, context);

    if (errorHandler) {
      errorHandler(errorObj);
    }

    return [null, errorInfo];
  }
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelay: number = 1000,
  maxDelay: number = 10000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxAttempts) {
        throw lastError;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);

      console.warn(`Attempt ${attempt} failed, retrying in ${delay}ms:`, lastError);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

/**
 * Debounce function to prevent rapid repeated calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle function to limit the rate of calls
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// =============================================================================
// Error Boundary Integration
// =============================================================================

/**
 * Convert React error to ErrorInfo
 */
export function reactErrorToErrorInfo(error: Error, errorInfo: React.ErrorInfo): ErrorInfo {
  return {
    type: 'REACT_ERROR',
    message: error.message,
    userMessage: 'A component error occurred. Please refresh the page.',
    code: 'COMPONENT_ERROR',
    timestamp: new Date().toISOString(),
    context: {
      componentStack: errorInfo.componentStack,
      errorBoundary: true
    },
    suggestions: [
      'Refresh the page',
      'Check the browser console for details',
      'Contact support if the problem persists'
    ]
  };
}

export default ErrorHandler;