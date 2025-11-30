import {
  Report,
  ReportParameters,
  ExportOptions,
  ExportFormat,
  AnalyticsData,
  PlantGrowthAnalytics,
  EnvironmentalAnalytics,
  FinancialAnalytics,
  YieldAnalytics,
  TimeSeriesData,
  SummaryMetrics,
  TrendData,
  GrowthData
} from './types';

// Date and Time Utilities
export const dateUtils = {
  // Format date for display
  formatDate(date: Date | string, format: 'short' | 'medium' | 'long' | 'iso' = 'medium'): string {
    const d = typeof date === 'string' ? new Date(date) : date;

    switch (format) {
      case 'short':
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      case 'medium':
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      case 'long':
        return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      case 'iso':
        return d.toISOString();
      default:
        return d.toLocaleDateString();
    }
  },

  // Format datetime for display
  formatDateTime(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  // Get relative time string
  getRelativeTime(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

    return this.formatDate(d, 'medium');
  },

  // Get date range preset
  getDateRangePreset(preset: string): { start: Date; end: Date } {
    const end = new Date();
    const start = new Date();

    switch (preset) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'yesterday':
        start.setDate(start.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        end.setDate(end.getDate() - 1);
        end.setHours(23, 59, 59, 999);
        break;
      case 'week':
        start.setDate(start.getDate() - 7);
        break;
      case 'month':
        start.setMonth(start.getMonth() - 1);
        break;
      case 'quarter':
        start.setMonth(start.getMonth() - 3);
        break;
      case 'year':
        start.setFullYear(start.getFullYear() - 1);
        break;
      default:
        // Default to last 30 days
        start.setDate(start.getDate() - 30);
    }

    return { start, end };
  },

  // Get duration in human readable format
  getDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }
};

// Number and Metric Utilities
export const numberUtils = {
  // Format number with appropriate precision
  formatNumber(num: number, decimals: number = 1, locale: string = 'en-US'): string {
    return num.toLocaleString(locale, { maximumFractionDigits: decimals });
  },

  // Format currency
  formatCurrency(amount: number, currency: string = 'USD', locale: string = 'en-US'): string {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency
    }).format(amount);
  },

  // Format percentage
  formatPercentage(value: number, decimals: number = 1): string {
    return `${value.toFixed(decimals)}%`;
  },

  // Format unit with appropriate abbreviation
  formatUnit(value: number, unit: string): string {
    if (unit === 'bytes' || unit === 'B') {
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(value) / Math.log(1024));
      return `${(value / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
    }

    return `${this.formatNumber(value)} ${unit}`;
  },

  // Get trend icon and color
  getTrendInfo(trend: TrendData) {
    switch (trend.direction) {
      case 'up':
        return { icon: '↑', color: 'text-green-400', label: 'Increasing' };
      case 'down':
        return { icon: '↓', color: 'text-red-400', label: 'Decreasing' };
      default:
        return { icon: '→', color: 'text-gray-400', label: 'Stable' };
    }
  },

  // Calculate growth rate
  calculateGrowthRate(current: number, previous: number): number {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  },

  // Get status color based on value and thresholds
  getStatusColor(value: number, thresholds: { good: number; warning: number }, inverse: boolean = false): string {
    if (inverse) {
      if (value <= thresholds.good) return 'text-green-400';
      if (value <= thresholds.warning) return 'text-yellow-400';
      return 'text-red-400';
    }

    if (value >= thresholds.good) return 'text-green-400';
    if (value >= thresholds.warning) return 'text-yellow-400';
    return 'text-red-400';
  }
};

// Export Utilities
export const exportUtils = {
  // Download file from URL
  downloadFile(url: string, filename: string): void {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up URL
    if (url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  },

  // Generate filename for report
  generateFilename(report: Report, format: ExportFormat): string {
    const timestamp = new Date().toISOString().split('T')[0];
    const name = report.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const extension = this.getFileExtension(format);

    return `${name}_${timestamp}.${extension}`;
  },

  // Get file extension for format
  getFileExtension(format: ExportFormat): string {
    switch (format) {
      case 'pdf':
        return 'pdf';
      case 'csv':
        return 'csv';
      case 'excel':
        return 'xlsx';
      case 'json':
        return 'json';
      case 'png':
        return 'png';
      case 'svg':
        return 'svg';
      default:
        return 'txt';
    }
  },

  // Export data to CSV
  exportToCSV(data: any[], filename: string): void {
    if (data.length === 0) return;

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row =>
        headers.map(header => {
          const value = row[header];
          return typeof value === 'string' && value.includes(',')
            ? `"${value}"`
            : value;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    this.downloadFile(url, `${filename}.csv`);
  },

  // Export data to JSON
  exportToJSON(data: any, filename: string): void {
    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    this.downloadFile(url, `${filename}.json`);
  }
};

// Chart Utilities
export const chartUtils = {
  // Generate color palette
  getColorPalette(count: number): string[] {
    const colors = [
      '#10b981', // emerald
      '#3b82f6', // blue
      '#f59e0b', // amber
      '#ef4444', // red
      '#8b5cf6', // violet
      '#06b6d4', // cyan
      '#84cc16', // lime
      '#f97316', // orange
      '#ec4899', // pink
      '#6366f1', // indigo
      '#14b8a6', // teal
      '#a855f7', // purple
      '#f43f5e', // rose
      '#0ea5e9', // sky
      '#22c55e', // green
    ];

    return Array.from({ length: count }, (_, i) => colors[i % colors.length]);
  },

  // Prepare time series data for charts
  prepareTimeSeriesData(data: TimeSeriesData[], metrics?: string[]): any[] {
    const grouped = data.reduce((acc, item) => {
      const timestamp = item.timestamp.getTime();
      if (!acc[timestamp]) acc[timestamp] = { timestamp: item.timestamp };
      acc[timestamp][item.metric] = item.value;
      return acc;
    }, {} as Record<number, any>);

    return Object.values(grouped).sort((a, b) =>
      a.timestamp.getTime() - b.timestamp.getTime()
    );
  },

  // Aggregate data by time period
  aggregateByPeriod(
    data: TimeSeriesData[],
    period: 'hour' | 'day' | 'week' | 'month',
    aggregation: 'average' | 'sum' | 'min' | 'max' | 'count' = 'average'
  ): TimeSeriesData[] {
    const grouped = data.reduce((acc, item) => {
      const timestamp = new Date(item.timestamp);
      let key: string;

      switch (period) {
        case 'hour':
          key = `${timestamp.getFullYear()}-${timestamp.getMonth()}-${timestamp.getDate()}-${timestamp.getHours()}`;
          break;
        case 'day':
          key = `${timestamp.getFullYear()}-${timestamp.getMonth()}-${timestamp.getDate()}`;
          break;
        case 'week':
          const weekStart = new Date(timestamp);
          weekStart.setDate(timestamp.getDate() - timestamp.getDay());
          key = `${weekStart.getFullYear()}-W${Math.ceil(weekStart.getDate() / 7)}`;
          break;
        case 'month':
          key = `${timestamp.getFullYear()}-${timestamp.getMonth()}`;
          break;
        default:
          key = timestamp.toISOString();
      }

      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {} as Record<string, TimeSeriesData[]>);

    return Object.entries(grouped).map(([key, items]) => {
      const values = items.map(item => item.value);
      let aggregatedValue: number;

      switch (aggregation) {
        case 'sum':
          aggregatedValue = values.reduce((sum, val) => sum + val, 0);
          break;
        case 'min':
          aggregatedValue = Math.min(...values);
          break;
        case 'max':
          aggregatedValue = Math.max(...values);
          break;
        case 'count':
          aggregatedValue = values.length;
          break;
        case 'average':
        default:
          aggregatedValue = values.reduce((sum, val) => sum + val, 0) / values.length;
      }

      return {
        timestamp: new Date(items[0].timestamp),
        value: aggregatedValue,
        metric: items[0].metric,
        unit: items[0].unit,
        quality: items[0].quality
      };
    });
  },

  // Calculate moving average
  calculateMovingAverage(data: number[], window: number): number[] {
    const result = [];
    for (let i = 0; i < data.length; i++) {
      const start = Math.max(0, i - window + 1);
      const end = i + 1;
      const subset = data.slice(start, end);
      const average = subset.reduce((sum, val) => sum + val, 0) / subset.length;
      result.push(average);
    }
    return result;
  }
};

// Report Generation Utilities
export const reportUtils = {
  // Validate report parameters
  validateParameters(params: ReportParameters): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!params.dateRange.start || !params.dateRange.end) {
      errors.push('Date range is required');
    }

    if (params.dateRange.start >= params.dateRange.end) {
      errors.push('Start date must be before end date');
    }

    const rangeDays = (params.dateRange.end.getTime() - params.dateRange.start.getTime()) / (1000 * 60 * 60 * 24);
    if (rangeDays > 365) {
      errors.push('Date range cannot exceed 1 year');
    }

    return { valid: errors.length === 0, errors };
  },

  // Generate report preview
  generatePreview(report: Partial<Report>): string {
    const lines = [
      `# ${report.name}`,
      '',
      `**Description:** ${report.description || 'No description provided'}`,
      '',
      `**Type:** ${report.type}`,
      `**Category:** ${report.category}`,
      `**Status:** ${report.status}`,
      '',
      `## Parameters`,
      `- **Date Range:** ${dateUtils.formatDate(report.parameters?.dateRange.start || new Date())} to ${dateUtils.formatDate(report.parameters?.dateRange.end || new Date())}`,
      `- **Format:** ${report.parameters?.format || 'pdf'}`,
      `- **Include Charts:** ${report.parameters?.includeCharts ? 'Yes' : 'No'}`,
      `- **Include Tables:** ${report.parameters?.includeTables ? 'Yes' : 'No'}`,
      '',
      `## Metadata`,
      `- **Created:** ${dateUtils.formatDateTime(report.createdAt || new Date())}`,
      `- **Updated:** ${dateUtils.formatDateTime(report.updatedAt || new Date())}`,
      `- **Created By:** ${report.createdBy || 'Unknown'}`,
    ];

    return lines.join('\n');
  },

  // Calculate report complexity score
  calculateComplexity(report: Partial<Report>): number {
    let score = 0;

    // Base score by type
    switch (report.type) {
      case 'summary':
        score += 10;
        break;
      case 'detailed':
        score += 25;
        break;
      case 'comparison':
        score += 35;
        break;
      case 'trend':
        score += 30;
        break;
      case 'financial':
        score += 40;
        break;
      case 'custom':
        score += 50;
        break;
    }

    // Add score for date range
    if (report.parameters?.dateRange) {
      const days = (report.parameters.dateRange.end.getTime() - report.parameters.dateRange.start.getTime()) / (1000 * 60 * 60 * 24);
      score += Math.min(days / 10, 50); // Max 50 points for date range
    }

    // Add score for filters
    const filterCount = Object.keys(report.parameters?.filters || {}).length;
    score += filterCount * 5;

    // Add score for includes
    if (report.parameters?.includeCharts) score += 10;
    if (report.parameters?.includeTables) score += 10;
    if (report.parameters?.includeImages) score += 15;

    return Math.min(score, 100); // Cap at 100
  },

  // Get estimated generation time
  getEstimatedGenerationTime(report: Partial<Report>): number {
    const complexity = this.calculateComplexity(report);
    return complexity * 100; // 100ms per complexity point
  }
};

// Data Validation Utilities
export const validationUtils = {
  // Check if value is a valid number
  isValidNumber(value: any): boolean {
    return typeof value === 'number' && !isNaN(value) && isFinite(value);
  },

  // Check if date is valid
  isValidDate(date: any): boolean {
    return date instanceof Date && !isNaN(date.getTime());
  },

  // Sanitize string for display
  sanitizeString(str: string, maxLength: number = 100): string {
    if (!str) return '';
    return str.trim().substring(0, maxLength).replace(/[<>]/g, '');
  },

  // Validate email format
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  // Check if report name is valid
  isValidReportName(name: string): boolean {
    return name && name.trim().length > 0 && name.trim().length <= 100;
  }
};

// Performance Utilities
export const performanceUtils = {
  // Debounce function
  debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  },

  // Throttle function
  throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean;
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  // Format file size
  formatFileSize(bytes: number): string {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }
};

export default {
  dateUtils,
  numberUtils,
  exportUtils,
  chartUtils,
  reportUtils,
  validationUtils,
  performanceUtils
};