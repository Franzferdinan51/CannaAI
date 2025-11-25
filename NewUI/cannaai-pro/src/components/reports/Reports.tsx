'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Import sub-components
import { AnalyticsDashboard } from './AnalyticsDashboard';
import { PlantGrowthAnalytics } from './PlantGrowthAnalytics';
import { FinancialAnalytics } from './FinancialAnalytics';
import { ReportBuilder } from './ReportBuilder';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Download,
  Calendar,
  Clock,
  TrendingUp,
  BarChart3,
  PieChart,
  Activity,
  Settings,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Eye,
  Edit,
  Trash2,
  Copy,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  MoreVertical,
  Grid,
  List,
  X,
  Save,
  Printer,
  Share2,
  Schedule,
  Image,
  Database,
  DollarSign,
  Sprout,
  Thermometer,
  Zap,
  Target,
  Award,
  ArrowUp,
  ArrowDown,
  Minus,
  FileSpreadsheet,
  FilePlus,
  FileDown,
  FileImage,
  Archive
} from 'lucide-react';

import {
  Report,
  ReportType,
  ReportCategory,
  ReportStatus,
  ReportParameters,
  ExportOptions,
  ExportFormat,
  AnalyticsData,
  PlantGrowthAnalytics,
  EnvironmentalAnalytics,
  FinancialAnalytics,
  YieldAnalytics
} from './types';

import { reportsApi, analyticsApi, exportApi, mockData } from './api';
import { dateUtils, numberUtils, exportUtils } from './utils';

interface ReportsProps {
  className?: string;
}

export const Reports: React.FC<ReportsProps> = ({ className = '' }) => {
  // State management
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReports, setSelectedReports] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ReportCategory | 'all'>('all');
  const [selectedType, setSelectedType] = useState<ReportType | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<ReportStatus | 'all'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'name' | 'created' | 'updated' | 'type'>('updated');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // New state for tab navigation
  const [activeTab, setActiveTab] = useState<'reports' | 'analytics' | 'plants' | 'financial' | 'builder'>('reports');

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  // Form states
  const [newReport, setNewReport] = useState<Partial<Report>>({
    name: '',
    description: '',
    type: 'summary',
    category: 'overview',
    parameters: {
      dateRange: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: new Date(),
        preset: 'month'
      },
      filters: {},
      format: 'pdf',
      includeCharts: true,
      includeTables: true,
      includeImages: false
    }
  });

  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'pdf',
    includeCharts: true,
    includeRawData: false,
    includeMetadata: true
  });

  // Load reports data
  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setIsLoading(true);
    try {
      const data = await reportsApi.getReports();
      // Fallback to mock data if API returns empty
      const reportData = data.reports.length > 0 ? data.reports : mockData.generateMockReports(15);
      setReports(reportData);
    } catch (error) {
      console.error('Failed to load reports:', error);
      setReports(mockData.generateMockReports(15));
    } finally {
      setIsLoading(false);
    }
  };

  // Filter and sort reports
  const filteredReports = useMemo(() => {
    let filtered = [...reports];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(report =>
        report.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(report => report.category === selectedCategory);
    }

    // Apply type filter
    if (selectedType !== 'all') {
      filtered = filtered.filter(report => report.type === selectedType);
    }

    // Apply status filter
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(report => report.status === selectedStatus);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'created':
          aValue = a.createdAt.getTime();
          bValue = b.createdAt.getTime();
          break;
        case 'updated':
          aValue = a.updatedAt.getTime();
          bValue = b.updatedAt.getTime();
          break;
        case 'type':
          aValue = a.type;
          bValue = b.type;
          break;
        default:
          return 0;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [reports, searchQuery, selectedCategory, selectedType, selectedStatus, sortBy, sortOrder]);

  // Get icon for report type
  const getReportTypeIcon = (type: ReportType) => {
    switch (type) {
      case 'summary':
      case 'detailed':
        return <FileText className="w-5 h-5" />;
      case 'comparison':
        return <BarChart3 className="w-5 h-5" />;
      case 'trend':
        return <TrendingUp className="w-5 h-5" />;
      case 'financial':
        return <DollarSign className="w-5 h-5" />;
      case 'growth':
      case 'yield':
        return <Sprout className="w-5 h-5" />;
      case 'environmental':
        return <Thermometer className="w-5 h-5" />;
      case 'plant_health':
        return <Activity className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  // Get status icon and color
  const getStatusInfo = (status: ReportStatus) => {
    switch (status) {
      case 'completed':
        return { icon: CheckCircle, color: 'text-green-400', bgColor: 'bg-green-400/10' };
      case 'generating':
        return { icon: Loader2, color: 'text-blue-400', bgColor: 'bg-blue-400/10' };
      case 'scheduled':
        return { icon: Clock, color: 'text-yellow-400', bgColor: 'bg-yellow-400/10' };
      case 'failed':
        return { icon: XCircle, color: 'text-red-400', bgColor: 'bg-red-400/10' };
      case 'draft':
        return { icon: FileText, color: 'text-gray-400', bgColor: 'bg-gray-400/10' };
      case 'archived':
        return { icon: Archive, color: 'text-purple-400', bgColor: 'bg-purple-400/10' };
      default:
        return { icon: AlertCircle, color: 'text-gray-400', bgColor: 'bg-gray-400/10' };
    }
  };

  // Get export format icon
  const getFormatIcon = (format: ExportFormat) => {
    switch (format) {
      case 'pdf':
        return <FileText className="w-4 h-4" />;
      case 'csv':
        return <FileSpreadsheet className="w-4 h-4" />;
      case 'excel':
        return <FileSpreadsheet className="w-4 h-4" />;
      case 'json':
        return <Database className="w-4 h-4" />;
      case 'png':
      case 'svg':
        return <FileImage className="w-4 h-4" />;
      default:
        return <FilePlus className="w-4 h-4" />;
    }
  };

  // Handle create report
  const handleCreateReport = async () => {
    try {
      const report = await reportsApi.createReport(newReport);
      if (report) {
        setReports([report, ...reports]);
        setShowCreateModal(false);
        setNewReport({
          name: '',
          description: '',
          type: 'summary',
          category: 'overview',
          parameters: {
            dateRange: {
              start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
              end: new Date(),
              preset: 'month'
            },
            filters: {},
            format: 'pdf',
            includeCharts: true,
            includeTables: true,
            includeImages: false
          }
        });
      }
    } catch (error) {
      console.error('Failed to create report:', error);
    }
  };

  // Handle generate report
  const handleGenerateReport = async (reportId: string) => {
    try {
      const success = await reportsApi.generateReport(reportId);
      if (success) {
        // Update report status
        setReports(reports.map(r =>
          r.id === reportId ? { ...r, status: 'generating' } : r
        ));
      }
    } catch (error) {
      console.error('Failed to generate report:', error);
    }
  };

  // Handle export report
  const handleExportReport = async (reportId: string, options: ExportOptions) => {
    try {
      const report = reports.find(r => r.id === reportId);
      if (!report) return;

      const downloadUrl = await reportsApi.exportReport(reportId, options);
      if (downloadUrl) {
        const filename = exportUtils.generateFilename(report, options.format);
        exportUtils.downloadFile(downloadUrl, filename);
        setShowExportModal(false);
      }
    } catch (error) {
      console.error('Failed to export report:', error);
    }
  };

  // Handle delete report
  const handleDeleteReport = async (reportId: string) => {
    if (!confirm('Are you sure you want to delete this report?')) return;

    try {
      const success = await reportsApi.deleteReport(reportId);
      if (success) {
        setReports(reports.filter(r => r.id !== reportId));
      }
    } catch (error) {
      console.error('Failed to delete report:', error);
    }
  };

  // Handle duplicate report
  const handleDuplicateReport = async (reportId: string) => {
    try {
      const duplicated = await reportsApi.duplicateReport(reportId);
      if (duplicated) {
        setReports([duplicated, ...reports]);
      }
    } catch (error) {
      console.error('Failed to duplicate report:', error);
    }
  };

  // Get statistics
  const statistics = useMemo(() => {
    const total = reports.length;
    const completed = reports.filter(r => r.status === 'completed').length;
    const generating = reports.filter(r => r.status === 'generating').length;
    const failed = reports.filter(r => r.status === 'failed').length;

    return { total, completed, generating, failed };
  }, [reports]);

  return (
    <div className={`flex-1 overflow-y-auto bg-[#0B0D10] ${className}`}>
      {/* Tab Navigation */}
      <div className="bg-[#1A1D23] border-b border-gray-800">
        <div className="flex items-center p-4">
          <h1 className="text-2xl font-bold text-white mr-8">Reports & Analytics</h1>
          <div className="flex gap-2">
            {[
              { id: 'reports', label: 'My Reports', icon: FileText },
              { id: 'analytics', label: 'Analytics', icon: BarChart3 },
              { id: 'plants', label: 'Plant Growth', icon: Sprout },
              { id: 'financial', label: 'Financial', icon: DollarSign },
              { id: 'builder', label: 'Report Builder', icon: Plus }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-emerald-600 text-white'
                    : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="text-sm font-medium">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'reports' && (
          <div>
            {/* Header */}
            <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <FileText className="w-8 h-8 text-emerald-400" />
              Reports & Analytics
            </h1>
            <p className="text-gray-400">
              Generate, customize, and manage comprehensive cultivation reports
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadReports}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Report
            </button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-[#1A1D23] border border-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Reports</p>
                <p className="text-2xl font-bold text-white">{statistics.total}</p>
              </div>
              <FileText className="w-8 h-8 text-emerald-400" />
            </div>
          </div>
          <div className="bg-[#1A1D23] border border-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Completed</p>
                <p className="text-2xl font-bold text-green-400">{statistics.completed}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </div>
          <div className="bg-[#1A1D23] border border-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Generating</p>
                <p className="text-2xl font-bold text-blue-400">{statistics.generating}</p>
              </div>
              <Loader2 className="w-8 h-8 text-blue-400" />
            </div>
          </div>
          <div className="bg-[#1A1D23] border border-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Failed</p>
                <p className="text-2xl font-bold text-red-400">{statistics.failed}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-400" />
            </div>
          </div>
        </div>

        {/* Filters and Controls */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search reports..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[#1A1D23] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as any)}
            className="px-4 py-2 bg-[#1A1D23] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="all">All Categories</option>
            <option value="overview">Overview</option>
            <option value="plants">Plants</option>
            <option value="sensors">Sensors</option>
            <option value="environment">Environment</option>
            <option value="automation">Automation</option>
            <option value="financial">Financial</option>
            <option value="yield">Yield</option>
            <option value="growth">Growth</option>
          </select>

          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as any)}
            className="px-4 py-2 bg-[#1A1D23] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="all">All Types</option>
            <option value="summary">Summary</option>
            <option value="detailed">Detailed</option>
            <option value="comparison">Comparison</option>
            <option value="trend">Trend</option>
            <option value="financial">Financial</option>
            <option value="growth">Growth</option>
            <option value="yield">Yield</option>
            <option value="environmental">Environmental</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as any)}
            className="px-4 py-2 bg-[#1A1D23] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
            <option value="generating">Generating</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="archived">Archived</option>
          </select>

          {/* Sort Controls */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-4 py-2 bg-[#1A1D23] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="updated">Last Updated</option>
            <option value="created">Created</option>
            <option value="name">Name</option>
            <option value="type">Type</option>
          </select>

          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="px-3 py-2 bg-[#1A1D23] border border-gray-700 rounded-lg text-white hover:bg-gray-700 transition-colors"
          >
            {sortOrder === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
          </button>

          {/* View Mode */}
          <div className="flex bg-[#1A1D23] border border-gray-700 rounded-lg">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-2 ${viewMode === 'grid' ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 ${viewMode === 'list' ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Reports Grid/List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No reports found</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            Create Your First Report
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredReports.map((report) => {
            const statusInfo = getStatusInfo(report.status);
            const StatusIcon = statusInfo.icon;

            return (
              <div
                key={report.id}
                className="bg-[#1A1D23] border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition-all duration-200"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                      {getReportTypeIcon(report.type)}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-white mb-1">{report.name}</h3>
                      <p className="text-xs text-gray-400">{report.type} • {report.category}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedReport(report);
                      setShowExportModal(true);
                    }}
                    className="p-1 text-gray-400 hover:text-white transition-colors"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>

                {/* Description */}
                <p className="text-sm text-gray-400 mb-4 line-clamp-2">
                  {report.description}
                </p>

                {/* Status */}
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${statusInfo.bgColor} mb-4`}>
                  <StatusIcon className={`w-4 h-4 ${statusInfo.color} ${report.status === 'generating' ? 'animate-spin' : ''}`} />
                  <span className={`text-xs font-medium capitalize ${statusInfo.color}`}>
                    {report.status}
                  </span>
                </div>

                {/* Metadata */}
                <div className="space-y-2 text-xs text-gray-400 mb-4">
                  <div className="flex justify-between">
                    <span>Created</span>
                    <span>{dateUtils.formatDate(report.createdAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Format</span>
                    <span className="uppercase">{report.parameters?.format || 'pdf'}</span>
                  </div>
                  {report.generatedAt && (
                    <div className="flex justify-between">
                      <span>Generated</span>
                      <span>{dateUtils.formatDate(report.generatedAt)}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  {report.status === 'completed' && (
                    <button
                      onClick={() => {
                        setSelectedReport(report);
                        setShowExportModal(true);
                      }}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-xs"
                    >
                      <Download className="w-3 h-3" />
                      Export
                    </button>
                  )}
                  {(report.status === 'draft' || report.status === 'failed') && (
                    <button
                      onClick={() => handleGenerateReport(report.id)}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs"
                    >
                      <Play className="w-3 h-3" />
                      Generate
                    </button>
                  )}
                  <button
                    onClick={() => handleDuplicateReport(report.id)}
                    className="px-3 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors text-xs"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => handleDeleteReport(report.id)}
                    className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-xs"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-[#1A1D23] border border-gray-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#252A33]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Report</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Generated</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Format</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filteredReports.map((report) => {
                  const statusInfo = getStatusInfo(report.status);
                  const StatusIcon = statusInfo.icon;

                  return (
                    <tr key={report.id} className="hover:bg-[#252A33]/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                            {getReportTypeIcon(report.type)}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-white">{report.name}</div>
                            <div className="text-xs text-gray-400">{report.category}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-300 capitalize">{report.type}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${statusInfo.bgColor} inline-block`}>
                          <StatusIcon className={`w-4 h-4 ${statusInfo.color} ${report.status === 'generating' ? 'animate-spin' : ''}`} />
                          <span className={`text-xs font-medium capitalize ${statusInfo.color}`}>
                            {report.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-300">
                          {dateUtils.formatDate(report.createdAt)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-300">
                          {report.generatedAt ? dateUtils.formatDate(report.generatedAt) : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-300 uppercase">
                          {report.parameters?.format || 'pdf'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {report.status === 'completed' && (
                            <button
                              onClick={() => {
                                setSelectedReport(report);
                                setShowExportModal(true);
                              }}
                              className="p-1 text-emerald-400 hover:text-emerald-300 transition-colors"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          )}
                          {(report.status === 'draft' || report.status === 'failed') && (
                            <button
                              onClick={() => handleGenerateReport(report.id)}
                              className="p-1 text-blue-400 hover:text-blue-300 transition-colors"
                            >
                              <Play className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDuplicateReport(report.id)}
                            className="p-1 text-gray-400 hover:text-gray-300 transition-colors"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteReport(report.id)}
                            className="p-1 text-red-400 hover:text-red-300 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Report Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1A1D23] border border-gray-800 rounded-xl p-6 max-w-lg w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Create New Report</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Report Name
                </label>
                <input
                  type="text"
                  value={newReport.name}
                  onChange={(e) => setNewReport({ ...newReport, name: e.target.value })}
                  placeholder="Enter report name"
                  className="w-full px-4 py-2 bg-[#252A33] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={newReport.description}
                  onChange={(e) => setNewReport({ ...newReport, description: e.target.value })}
                  placeholder="Describe the report..."
                  rows={3}
                  className="w-full px-4 py-2 bg-[#252A33] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Type
                  </label>
                  <select
                    value={newReport.type}
                    onChange={(e) => setNewReport({ ...newReport, type: e.target.value as ReportType })}
                    className="w-full px-4 py-2 bg-[#252A33] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="summary">Summary</option>
                    <option value="detailed">Detailed</option>
                    <option value="comparison">Comparison</option>
                    <option value="trend">Trend</option>
                    <option value="financial">Financial</option>
                    <option value="growth">Growth</option>
                    <option value="yield">Yield</option>
                    <option value="environmental">Environmental</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Category
                  </label>
                  <select
                    value={newReport.category}
                    onChange={(e) => setNewReport({ ...newReport, category: e.target.value as ReportCategory })}
                    className="w-full px-4 py-2 bg-[#252A33] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="overview">Overview</option>
                    <option value="plants">Plants</option>
                    <option value="sensors">Sensors</option>
                    <option value="environment">Environment</option>
                    <option value="automation">Automation</option>
                    <option value="financial">Financial</option>
                    <option value="yield">Yield</option>
                    <option value="growth">Growth</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateReport}
                disabled={!newReport.name}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && selectedReport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1A1D23] border border-gray-800 rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Export Report</h2>
              <button
                onClick={() => setShowExportModal(false)}
                className="p-1 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Export Format
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(['pdf', 'csv', 'excel', 'json'] as ExportFormat[]).map((format) => (
                    <button
                      key={format}
                      onClick={() => setExportOptions({ ...exportOptions, format })}
                      className={`flex flex-col items-center gap-2 p-3 border rounded-lg transition-colors ${
                        exportOptions.format === format
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                          : 'border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-300'
                      }`}
                    >
                      {getFormatIcon(format)}
                      <span className="text-xs capitalize">{format}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-3 text-sm text-gray-300">
                  <input
                    type="checkbox"
                    checked={exportOptions.includeCharts}
                    onChange={(e) => setExportOptions({ ...exportOptions, includeCharts: e.target.checked })}
                    className="rounded border-gray-600 bg-gray-700 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-gray-900"
                  />
                  Include Charts
                </label>

                <label className="flex items-center gap-3 text-sm text-gray-300">
                  <input
                    type="checkbox"
                    checked={exportOptions.includeRawData}
                    onChange={(e) => setExportOptions({ ...exportOptions, includeRawData: e.target.checked })}
                    className="rounded border-gray-600 bg-gray-700 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-gray-900"
                  />
                  Include Raw Data
                </label>

                <label className="flex items-center gap-3 text-sm text-gray-300">
                  <input
                    type="checkbox"
                    checked={exportOptions.includeMetadata}
                    onChange={(e) => setExportOptions({ ...exportOptions, includeMetadata: e.target.checked })}
                    className="rounded border-gray-600 bg-gray-700 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-gray-900"
                  />
                  Include Metadata
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleExportReport(selectedReport.id, exportOptions)}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                Export Report
              </button>
            </div>
          </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <AnalyticsDashboard />
        )}

        {activeTab === 'plants' && (
          <PlantGrowthAnalytics />
        )}

        {activeTab === 'financial' && (
          <FinancialAnalytics />
        )}

        {activeTab === 'builder' && (
          <ReportBuilder />
        )}
      </div>
    </div>
  );
};

export default Reports;