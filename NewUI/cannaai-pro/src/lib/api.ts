import axios, { AxiosInstance, AxiosResponse } from 'axios';

export interface ApiError {
  message: string;
  status?: number;
  data?: any;
}

class ApiClient {
  private client: AxiosInstance;

  constructor(baseURL: string = 'http://localhost:3000/api') {
    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add auth token if available
        const token = localStorage.getItem('cannai_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response: AxiosResponse) => response,
      (error) => {
        const apiError: ApiError = {
          message: error.response?.data?.message || error.message || 'An error occurred',
          status: error.response?.status,
          data: error.response?.data,
        };
        return Promise.reject(apiError);
      }
    );
  }

  // Generic request methods
  async get<T>(url: string, params?: any): Promise<T> {
    const response = await this.client.get(url, { params });
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: any): Promise<T> {
    const response = await this.client.post(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.put(url, data);
    return response.data;
  }

  async patch<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.patch(url, data);
    return response.data;
  }

  async delete<T>(url: string): Promise<T> {
    const response = await this.client.delete(url);
    return response.data;
  }

  // File upload method
  async upload<T>(url: string, file: File, additionalData?: Record<string, any>): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);

    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, value as string);
      });
    }

    const response = await this.client.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }
}

// Create singleton instance
export const apiClient = new ApiClient();

// Export individual API methods for specific endpoints
export const api = {
  // Plant Analysis
  analyze: (data: any) => apiClient.post('/analyze', data),
  analyzeSimple: (data: any) => apiClient.post('/analyze-simple', data),
  autoAnalyze: (file: File) => apiClient.upload('/auto-analyze', file),
  trichomeAnalysis: (file: File) => apiClient.upload('/trichome-analysis', file),

  // Chat & AI
  chat: (message: string) => apiClient.post('/chat', { message }),
  lmstudio: {
    chat: (message: string) => apiClient.post('/lmstudio/chat', { message }),
    models: () => apiClient.get('/lmstudio/models'),
    scan: (data: any) => apiClient.post('/debug/lmstudio-scan', data),
  },

  // Data Management
  strains: {
    list: () => apiClient.get('/strains'),
    create: (data: any) => apiClient.post('/strains', data),
    update: (id: string, data: any) => apiClient.put(`/strains/${id}`, data),
    delete: (id: string) => apiClient.delete(`/strains/${id}`),
  },

  history: {
    list: (params?: any) => apiClient.get('/history', params),
    create: (data: any) => apiClient.post('/history', data),
  },

  sensors: {
    data: () => apiClient.get('/sensors'),
    update: (data: any) => apiClient.post('/sensors', data),
  },

  settings: {
    get: () => apiClient.get('/settings'),
    update: (data: any) => apiClient.post('/settings', data),
  },

  // Utility
  health: () => apiClient.get('/health'),
  version: () => apiClient.get('/version'),
  costs: () => apiClient.get('/costs'),
};

export default api;