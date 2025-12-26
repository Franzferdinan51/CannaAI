import axios from 'axios';
import {
  Report,
  ReportTemplate,
  AnalyticsData,
  PlantGrowthAnalytics,
  EnvironmentalAnalytics,
  FinancialAnalytics,
  YieldAnalytics,
  ReportParameters,
  ExportOptions,
  ExportFormat,
  ReportsApiResponse
} from './types';

// API Configuration
const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? '/api'
  : 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for authentication
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

// Reports API
export const reportsApi = {
  // Get all reports
  async getReports(params?: {
    page?: number;
    pageSize?: number;
    category?: string;
    type?: string;
    status?: string;
    search?: string;
  }): Promise<{ reports: Report[]; total: number }> {
    try {
      const response = await api.get('/reports', { params });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch reports:', error);
      return { reports: [], total: 0 };
    }
  },

  // Get single report
  async getReport(id: string): Promise<Report | null> {
    try {
      const response = await api.get(`/reports/${id}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch report:', error);
      return null;
    }
  },

  // Create new report
  async createReport(report: Partial<Report>): Promise<Report | null> {
    try {
      const response = await api.post('/reports', report);
      return response.data;
    } catch (error) {
      console.error('Failed to create report:', error);
      return null;
    }
  },

  // Update report
  async updateReport(id: string, updates: Partial<Report>): Promise<Report | null> {
    try {
      const response = await api.put(`/reports/${id}`, updates);
      return response.data;
    } catch (error) {
      console.error('Failed to update report:', error);
      return null;
    }
  },

  // Delete report
  async deleteReport(id: string): Promise<boolean> {
    try {
      await api.delete(`/reports/${id}`);
      return true;
    } catch (error) {
      console.error('Failed to delete report:', error);
      return false;
    }
  },

  // Generate report
  async generateReport(id: string, parameters?: ReportParameters): Promise<boolean> {
    try {
      await api.post(`/reports/${id}/generate`, { parameters });
      return true;
    } catch (error) {
      console.error('Failed to generate report:', error);
      return false;
    }
  },

  // Export report
  async exportReport(id: string, options: ExportOptions): Promise<string | null> {
    try {
      const response = await api.post(`/reports/${id}/export`, options, {
        responseType: 'blob'
      });

      // Create download URL
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      return url;
    } catch (error) {
      console.error('Failed to export report:', error);
      return null;
    }
  },

  // Schedule report
  async scheduleReport(id: string, schedule: any): Promise<boolean> {
    try {
      await api.post(`/reports/${id}/schedule`, schedule);
      return true;
    } catch (error) {
      console.error('Failed to schedule report:', error);
      return false;
    }
  },

  // Duplicate report
  async duplicateReport(id: string, name?: string): Promise<Report | null> {
    try {
      const response = await api.post(`/reports/${id}/duplicate`, { name });
      return response.data;
    } catch (error) {
      console.error('Failed to duplicate report:', error);
      return null;
    }
  },
};

// Report Templates API
export const templatesApi = {
  // Get all templates
  async getTemplates(params?: {
    category?: string;
    type?: string;
    search?: string;
  }): Promise<ReportTemplate[]> {
    try {
      const response = await api.get('/reports/templates', { params });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      return [];
    }
  },

  // Get single template
  async getTemplate(id: string): Promise<ReportTemplate | null> {
    try {
      const response = await api.get(`/reports/templates/${id}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch template:', error);
      return null;
    }
  },

  // Create template from report
  async createTemplate(reportId: string, template: Partial<ReportTemplate>): Promise<ReportTemplate | null> {
    try {
      const response = await api.post(`/reports/templates/from-report/${reportId}`, template);
      return response.data;
    } catch (error) {
      console.error('Failed to create template:', error);
      return null;
    }
  },

  // Update template
  async updateTemplate(id: string, updates: Partial<ReportTemplate>): Promise<ReportTemplate | null> {
    try {
      const response = await api.put(`/reports/templates/${id}`, updates);
      return response.data;
    } catch (error) {
      console.error('Failed to update template:', error);
      return null;
    }
  },

  // Delete template
  async deleteTemplate(id: string): Promise<boolean> {
    try {
      await api.delete(`/reports/templates/${id}`);
      return true;
    } catch (error) {
      console.error('Failed to delete template:', error);
      return false;
    }
  },
};

// Analytics API
export const analyticsApi = {
  // Get overview analytics
  async getOverview(params?: {
    dateRange: { start: Date; end: Date };
    rooms?: string[];
  }): Promise<AnalyticsData | null> {
    try {
      const response = await api.get('/analytics/overview', { params });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch overview analytics:', error);
      return null;
    }
  },

  // Get plant growth analytics
  async getPlantGrowth(params?: {
    plantIds?: string[];
    dateRange: { start: Date; end: Date };
    growthStages?: string[];
  }): Promise<PlantGrowthAnalytics[]> {
    try {
      const response = await api.get('/analytics/plants/growth', { params });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch plant growth analytics:', error);
      return [];
    }
  },

  // Get environmental analytics
  async getEnvironmental(params?: {
    roomIds?: string[];
    dateRange: { start: Date; end: Date };
    metrics?: string[];
  }): Promise<EnvironmentalAnalytics[]> {
    try {
      const response = await api.get('/analytics/environmental', { params });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch environmental analytics:', error);
      return [];
    }
  },

  // Get financial analytics
  async getFinancial(params?: {
    dateRange: { start: Date; end: Date };
    type?: 'monthly' | 'quarterly' | 'yearly';
  }): Promise<FinancialAnalytics | null> {
    try {
      const response = await api.get('/analytics/financial', { params });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch financial analytics:', error);
      return null;
    }
  },

  // Get yield analytics
  async getYield(params?: {
    strainIds?: string[];
    roomIds?: string[];
    dateRange: { start: Date; end: Date };
  }): Promise<YieldAnalytics | null> {
    try {
      const response = await api.get('/analytics/yield', { params });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch yield analytics:', error);
      return null;
    }
  },

  // Get real-time metrics
  async getRealTimeMetrics(): Promise<any> {
    try {
      const response = await api.get('/analytics/realtime');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch real-time metrics:', error);
      return null;
    }
  },

  // Get insights
  async getInsights(params?: {
    type?: string;
    severity?: string;
    dateRange?: { start: Date; end: Date };
  }): Promise<any[]> {
    try {
      const response = await api.get('/analytics/insights', { params });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch insights:', error);
      return [];
    }
  },

  // Get predictions
  async getPredictions(params?: {
    type: string;
    horizon: string;
    confidence?: number;
  }): Promise<any[]> {
    try {
      const response = await api.get('/analytics/predictions', { params });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch predictions:', error);
      return [];
    }
  },
};

// Data Export API
export const exportApi = {
  // Export raw data
  async exportData(params: {
    type: 'plants' | 'sensors' | 'environmental' | 'financial' | 'yield' | 'all';
    format: ExportFormat;
    filters?: any;
    dateRange?: { start: Date; end: Date };
  }): Promise<string | null> {
    try {
      const response = await api.post('/export/data', params, {
        responseType: 'blob'
      });

      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      return url;
    } catch (error) {
      console.error('Failed to export data:', error);
      return null;
    }
  },

  // Get export history
  async getExportHistory(): Promise<any[]> {
    try {
      const response = await api.get('/export/history');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch export history:', error);
      return [];
    }
  },

  // Download previous export
  async downloadExport(exportId: string): Promise<string | null> {
    try {
      const response = await api.get(`/export/${exportId}`, {
        responseType: 'blob'
      });

      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      return url;
    } catch (error) {
      console.error('Failed to download export:', error);
      return null;
    }
  },
};

// Utility functions for generating mock data (development fallback)
export const mockData = {
  // Generate mock reports
  generateMockReports(count: number = 10): Report[] {
    const reports: Report[] = [];
    const categories = ['overview', 'plants', 'sensors', 'environment', 'financial', 'yield'];
    const types = ['summary', 'detailed', 'comparison', 'trend', 'financial', 'growth'];
    const statuses = ['completed', 'scheduled', 'generating', 'failed'];

    for (let i = 0; i < count; i++) {
      const createdDate = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
      reports.push({
        id: `report_${i + 1}`,
        name: `Report ${i + 1}`,
        description: `Sample report ${i + 1} description`,
        type: types[Math.floor(Math.random() * types.length)] as any,
        category: categories[Math.floor(Math.random() * categories.length)] as any,
        createdAt: createdDate,
        updatedAt: createdDate,
        generatedAt: Math.random() > 0.3 ? createdDate : undefined,
        status: statuses[Math.floor(Math.random() * statuses.length)] as any,
        createdBy: 'user_1',
        parameters: {
          dateRange: {
            start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            end: new Date(),
            preset: 'week'
          },
          filters: {
            rooms: ['room_1', 'room_2'],
            plants: [`plant_${i}`]
          },
          format: 'pdf',
          includeCharts: true,
          includeTables: true,
          includeImages: false
        },
        metadata: {
          duration: Math.floor(Math.random() * 30000),
          recordCount: Math.floor(Math.random() * 10000),
          dataSource: 'database',
          version: '1.0',
          tags: ['sample', 'mock'],
          permissions: {
            view: ['user_1'],
            edit: ['user_1'],
            share: true,
            public: false
          }
        }
      });
    }

    return reports;
  },

  // Generate mock analytics data
  generateMockAnalytics(): AnalyticsData {
    const now = Date.now();
    const timeSeries = [];

    // Generate last 30 days of data
    for (let i = 29; i >= 0; i--) {
      const timestamp = new Date(now - i * 24 * 60 * 60 * 1000);
      timeSeries.push({
        timestamp,
        value: 100 + Math.random() * 50,
        metric: 'temperature',
        unit: '°F',
        quality: 'good'
      });
    }

    return {
      timeSeries,
      summary: {
        total: 29,
        average: 125.5,
        minimum: 100.1,
        maximum: 149.9,
        median: 125.2,
        standardDeviation: 14.4,
        trend: {
          direction: 'up',
          percentage: 5.2,
          significance: 'medium'
        },
        growth: {
          absolute: 12.3,
          percentage: 10.8,
          period: '30 days'
        }
      }
    };
  }
};

export default api;