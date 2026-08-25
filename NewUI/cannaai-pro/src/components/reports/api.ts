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
const API_BASE_URL = `${import.meta.env.VITE_API_URL || (typeof window !== 'undefined'
  ? `${window.location.protocol}//${window.location.hostname}:3001`
  : 'http://localhost:3001')}/api`;

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

const normalizeReport = (report: any): Report => ({
  ...report,
  createdAt: new Date(report.createdAt),
  updatedAt: new Date(report.updatedAt),
  generatedAt: report.generatedAt ? new Date(report.generatedAt) : undefined,
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
      return { reports: (response.data.reports || []).map(normalizeReport), total: response.data.total || 0 };
    } catch (error) {
      console.error('Failed to fetch reports:', error);
      return { reports: [], total: 0 };
    }
  },

  // Get single report
  async getReport(id: string): Promise<Report | null> {
    try {
      const response = await api.get(`/reports/${id}`);
      return normalizeReport(response.data);
    } catch (error) {
      console.error('Failed to fetch report:', error);
      return null;
    }
  },

  // Create new report
  async createReport(report: Partial<Report>): Promise<Report | null> {
    try {
      const response = await api.post('/reports', report);
      return normalizeReport(response.data);
    } catch (error) {
      console.error('Failed to create report:', error);
      return null;
    }
  },

  // Update report
  async updateReport(id: string, updates: Partial<Report>): Promise<Report | null> {
    try {
      const response = await api.put(`/reports/${id}`, updates);
      return normalizeReport(response.data);
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
  async generateReport(id: string, parameters?: ReportParameters): Promise<Report | null> {
    try {
      const response = await api.post(`/reports/${id}/generate`, { parameters });
      return normalizeReport(response.data);
    } catch (error) {
      console.error('Failed to generate report:', error);
      return null;
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
      return normalizeReport(response.data);
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
    strainIds?: string[];
    roomIds?: string[];
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

export default api;
