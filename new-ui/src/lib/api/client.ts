import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { ApiResponse, ApiError } from '@/types/api';

// =============================================================================
// Configuration
// =============================================================================

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'ws://localhost:3000';
const DEFAULT_TIMEOUT = 60000; // 60 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// =============================================================================
// Custom Error Classes
// =============================================================================

export class ApiClientError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string,
    public response?: any,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

export class RateLimitError extends ApiClientError {
  constructor(
    public resetTime: number,
    public remaining: number,
    response?: any
  ) {
    super('Rate limit exceeded', 429, 'RATE_LIMIT_EXCEEDED', response);
    this.name = 'RateLimitError';
  }
}

export class NetworkError extends ApiClientError {
  constructor(message: string, originalError?: Error) {
    super(message, 0, 'NETWORK_ERROR', undefined, originalError);
    this.name = 'NetworkError';
  }
}

export class TimeoutError extends ApiClientError {
  constructor(timeout: number) {
    super(`Request timeout after ${timeout}ms`, 0, 'TIMEOUT_ERROR');
    this.name = 'TimeoutError';
  }
}

export class AIProviderError extends ApiClientError {
  constructor(message: string, public provider?: string, response?: any) {
    super(message, 503, 'AI_PROVIDER_ERROR', response);
    this.name = 'AIProviderError';
  }
}

// =============================================================================
// Request Interceptor
// =============================================================================

const requestInterceptor = (config: AxiosRequestConfig): AxiosRequestConfig => {
  // Add request timestamp
  config.metadata = { startTime: new Date() };

  // Add headers
  if (!config.headers) {
    config.headers = {};
  }

  // Add user-agent if not present
  if (!config.headers['User-Agent']) {
    config.headers['User-Agent'] = 'CannaAI-Frontend/1.0';
  }

  // Add request ID for tracking
  config.headers['X-Request-ID'] = generateRequestId();

  // Add client version
  config.headers['X-Client-Version'] = process.env.REACT_APP_VERSION || '1.0.0';

  // Add content-type if not present and we have data
  if (config.data && !config.headers['Content-Type']) {
    config.headers['Content-Type'] = 'application/json';
  }

  // Add security headers
  config.headers['X-Content-Type-Options'] = 'nosniff';

  // Log request in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`, {
      data: config.data,
      params: config.params,
      headers: config.headers
    });
  }

  return config;
};

// =============================================================================
// Response Interceptor
// =============================================================================

const responseInterceptor = (response: AxiosResponse): AxiosResponse => {
  // Calculate request duration
  const endTime = new Date();
  const duration = endTime.getTime() - response.config.metadata?.startTime?.getTime();

  // Log response in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`, {
      status: response.status,
      duration: `${duration}ms`,
      data: response.data
    });
  }

  // Handle rate limiting headers
  const rateLimitHeaders = {
    limit: response.headers['x-ratelimit-limit'],
    remaining: response.headers['x-ratelimit-remaining'],
    reset: response.headers['x-ratelimit-reset'],
    retryAfter: response.headers['retry-after']
  };

  if (rateLimitHeaders.remaining === '0') {
    console.warn('⚠️ Rate limit approaching:', rateLimitHeaders);
  }

  // Add metadata to response
  response.metadata = {
    duration,
    rateLimit: rateLimitHeaders
  };

  return response;
};

// =============================================================================
// Error Interceptor
// =============================================================================

const errorInterceptor = async (error: AxiosError): Promise<never> => {
  const originalRequest = error.config as any;

  // Calculate request duration
  const duration = new Date().getTime() - originalRequest?.metadata?.startTime?.getTime();

  // Log error in development
  if (process.env.NODE_ENV === 'development') {
    console.error(`❌ API Error: ${originalRequest?.method?.toUpperCase()} ${originalRequest?.url}`, {
      status: error.response?.status,
      duration: duration ? `${duration}ms` : 'unknown',
      message: error.message,
      data: error.response?.data,
      code: error.code
    });
  }

  // Handle network errors
  if (!error.response) {
    if (error.code === 'ECONNABORTED') {
      throw new TimeoutError(originalRequest?.timeout || DEFAULT_TIMEOUT);
    }
    throw new NetworkError(
      'Network connection failed. Please check your internet connection.',
      error
    );
  }

  const { status, data, headers } = error.response;
  const responseData = data as any;

  // Handle specific error types
  switch (status) {
    case 429:
      // Rate limiting
      const resetTime = parseInt(headers['x-ratelimit-reset'] || '0');
      const remaining = parseInt(headers['x-ratelimit-remaining'] || '0');
      throw new RateLimitError(resetTime, remaining, responseData);

    case 503:
      // Service unavailable - check if it's AI provider related
      if (responseData.error?.type === 'ai_provider_unavailable') {
        throw new AIProviderError(
          responseData.error.userMessage || responseData.error.message,
          responseData.provider,
          responseData
        );
      }
      break;

    case 401:
      // Unauthorized - would handle token refresh here
      if (!originalRequest._retry) {
        originalRequest._retry = true;
        // In a real app, you would refresh the token here
        throw new ApiClientError(
          'Authentication required',
          status,
          'UNAUTHORIZED',
          responseData
        );
      }
      break;

    case 403:
      // Forbidden
      throw new ApiClientError(
        'Access forbidden',
        status,
        'FORBIDDEN',
        responseData
      );

    case 404:
      // Not found
      throw new ApiClientError(
        'Resource not found',
        status,
        'NOT_FOUND',
        responseData
      );

    case 413:
      // Request entity too large
      throw new ApiClientError(
        'Request too large. Please reduce the size of your request.',
        status,
        'PAYLOAD_TOO_LARGE',
        responseData
      );

    case 422:
      // Validation error
      throw new ApiClientError(
        responseData.error?.details || responseData.error?.message || 'Validation failed',
        status,
        'VALIDATION_ERROR',
        responseData
      );

    case 500:
      // Internal server error
      throw new ApiClientError(
        'Internal server error. Please try again later.',
        status,
        'INTERNAL_ERROR',
        responseData
      );

    case 502:
    case 504:
      // Gateway/Proxy errors
      throw new ApiClientError(
        'Service temporarily unavailable. Please try again in a few minutes.',
        status,
        'SERVICE_UNAVAILABLE',
        responseData
      );
  }

  // Default error handling
  const message = responseData?.error?.userMessage ||
                  responseData?.error?.message ||
                  responseData?.message ||
                  'An unexpected error occurred';

  throw new ApiClientError(
    message,
    status,
    responseData?.error?.type || 'UNKNOWN_ERROR',
    responseData,
    error
  );
};

// =============================================================================
// Utility Functions
// =============================================================================

function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function shouldRetryRequest(error: AxiosError): boolean {
  const { code, response } = error;

  // Don't retry if it's a client error (4xx) except for rate limiting
  if (response?.status && response.status >= 400 && response.status < 500 && response.status !== 429) {
    return false;
  }

  // Retry on network errors and timeouts
  if (!response && (code === 'ECONNABORTED' || code === 'ECONNRESET')) {
    return true;
  }

  // Retry on 5xx errors
  if (response?.status && response.status >= 500) {
    return true;
  }

  return false;
}

function createRetryInterceptor() {
  return async (error: AxiosError): Promise<AxiosResponse> => {
    const config = error.config as any;

    if (!config || !shouldRetryRequest(error)) {
      return Promise.reject(error);
    }

    config._retryCount = config._retryCount || 0;

    if (config._retryCount >= MAX_RETRIES) {
      return Promise.reject(error);
    }

    config._retryCount += 1;

    // Calculate delay with exponential backoff
    const delay = RETRY_DELAY * Math.pow(2, config._retryCount - 1);

    console.log(`🔄 Retrying request (${config._retryCount}/${MAX_RETRIES}) after ${delay}ms:`, {
      url: config.url,
      method: config.method,
      error: error.message
    });

    await new Promise(resolve => setTimeout(resolve, delay));

    return config.httpApi ? config.httpApi(config) : axios(config);
  };
}

// =============================================================================
// Main API Client Class
// =============================================================================

export class ApiClient {
  private client: AxiosInstance;
  private retryInterceptor: number;

  constructor(baseURL: string = API_BASE_URL, timeout: number = DEFAULT_TIMEOUT) {
    this.client = axios.create({
      baseURL,
      timeout,
      withCredentials: false, // Change to true if using cookies for auth
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    // Add interceptors
    this.client.interceptors.request.use(requestInterceptor);
    this.client.interceptors.response.use(responseInterceptor, errorInterceptor);

    // Add retry interceptor
    this.retryInterceptor = this.client.interceptors.response.use(
      (response) => response,
      createRetryInterceptor()
    );

    // Store reference for retry interceptor
    this.client.defaults.httpApi = this.client;
  }

  // =============================================================================
  // HTTP Methods
  // =============================================================================

  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.patch<T>(url, data, config);
    return response.data;
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }

  // =============================================================================
  // Specialized Methods
  // =============================================================================

  /**
   * Upload a file with progress tracking
   */
  async uploadFile<T = any>(
    url: string,
    file: File,
    onProgress?: (progress: number) => void,
    additionalData?: Record<string, any>
  ): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);

    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, String(value));
      });
    }

    const response = await this.client.post<T>(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      }
    });

    return response.data;
  }

  /**
   * Stream response for real-time data
   */
  async *stream(url: string, config?: AxiosRequestConfig): AsyncGenerator<any> {
    const response = await this.client.get(url, {
      ...config,
      responseType: 'stream'
    });

    const stream = response.data;
    const decoder = new TextDecoder();

    for await (const chunk of stream) {
      const text = decoder.decode(chunk);
      const lines = text.split('\n').filter(line => line.trim());

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') return;

          try {
            yield JSON.parse(data);
          } catch (e) {
            console.warn('Failed to parse streaming data:', data);
          }
        }
      }
    }
  }

  // =============================================================================
  // Utility Methods
  // =============================================================================

  /**
   * Cancel all pending requests
   */
  cancelAllRequests(): void {
    // In a real implementation, you'd maintain a list of CancelTokens
    // and cancel them here
    console.warn('Cancel all requests not implemented yet');
  }

  /**
   * Get client instance for advanced usage
   */
  getAxiosInstance(): AxiosInstance {
    return this.client;
  }

  /**
   * Update base URL
   */
  setBaseURL(baseURL: string): void {
    this.client.defaults.baseURL = baseURL;
  }

  /**
   * Update timeout
   */
  setTimeout(timeout: number): void {
    this.client.defaults.timeout = timeout;
  }

  /**
   * Add default headers
   */
  setDefaultHeaders(headers: Record<string, string>): void {
    Object.assign(this.client.defaults.headers, headers);
  }

  /**
   * Remove interceptors
   */
  destroy(): void {
    this.client.interceptors.request.eject(this.client.interceptors.request.handlers.length - 1);
    this.client.interceptors.response.eject(this.client.interceptors.response.handlers.length - 1);
    this.client.interceptors.response.eject(this.retryInterceptor);
  }
}

// =============================================================================
// Global API Client Instance
// =============================================================================

export const apiClient = new ApiClient();

// Export utilities
export * from './client';
export { generateRequestId };