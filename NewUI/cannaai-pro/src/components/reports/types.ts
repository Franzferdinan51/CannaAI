// Reports and Analytics Type Definitions

// Core Report Types
export interface Report {
  id: string;
  name: string;
  description: string;
  type: ReportType;
  category: ReportCategory;
  createdAt: Date;
  updatedAt: Date;
  generatedAt?: Date;
  schedule?: ReportSchedule;
  status: ReportStatus;
  createdBy: string;
  parameters: ReportParameters;
  data?: any;
  metadata: ReportMetadata;
}

export type ReportType =
  | 'summary'
  | 'detailed'
  | 'comparison'
  | 'trend'
  | 'financial'
  | 'growth'
  | 'yield'
  | 'environmental'
  | 'plant_health'
  | 'custom';

export type ReportCategory =
  | 'overview'
  | 'plants'
  | 'sensors'
  | 'environment'
  | 'automation'
  | 'financial'
  | 'yield'
  | 'growth'
  | 'health'
  | 'operational';

export type ReportStatus =
  | 'draft'
  | 'scheduled'
  | 'generating'
  | 'completed'
  | 'failed'
  | 'archived';

export interface ReportSchedule {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';
  nextRun?: Date;
  lastRun?: Date;
  timezone?: string;
  recipients?: string[];
}

export interface ReportParameters {
  dateRange: {
    start: Date;
    end: Date;
    preset?: 'today' | 'yesterday' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
  };
  filters: ReportFilters;
  groupBy?: string[];
  metrics?: string[];
  format: ExportFormat;
  includeCharts: boolean;
  includeTables: boolean;
  includeImages: boolean;
}

export interface ReportFilters {
  rooms?: string[];
  plants?: string[];
  strains?: string[];
  sensors?: string[];
  growthStages?: string[];
  dataSources?: string[];
  customFilters?: Record<string, any>;
}

export interface ReportMetadata {
  duration?: number;
  recordCount?: number;
  dataSource: string;
  version: string;
  tags: string[];
  permissions: ReportPermissions;
}

export interface ReportPermissions {
  view: string[];
  edit: string[];
  share: boolean;
  public: boolean;
}

// Analytics Data Types
export interface AnalyticsData {
  timeSeries: TimeSeriesData[];
  summary: SummaryMetrics;
  comparisons?: ComparisonData[];
  insights?: InsightData[];
  predictions?: PredictionData[];
}

export interface TimeSeriesData {
  timestamp: Date;
  value: number;
  metric: string;
  unit?: string;
  quality: DataQuality;
  metadata?: Record<string, any>;
}

export interface SummaryMetrics {
  total: number;
  average: number;
  minimum: number;
  maximum: number;
  median: number;
  standardDeviation: number;
  trend: TrendData;
  growth: GrowthData;
}

export interface TrendData {
  direction: 'up' | 'down' | 'stable';
  percentage: number;
  significance: 'high' | 'medium' | 'low';
}

export interface GrowthData {
  absolute: number;
  percentage: number;
  period: string;
}

export interface ComparisonData {
  id: string;
  name: string;
  period: string;
  metrics: Record<string, number>;
  change: Record<string, number>;
  changePercentage: Record<string, number>;
}

export interface InsightData {
  type: 'anomaly' | 'pattern' | 'correlation' | 'recommendation' | 'alert';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  impact: string;
  confidence: number;
  timestamp: Date;
  data?: any;
}

export interface PredictionData {
  metric: string;
  horizon: string;
  predictions: PredictionPoint[];
  confidence: number;
  model: string;
}

export interface PredictionPoint {
  timestamp: Date;
  value: number;
  confidenceRange: [number, number];
}

// Plant Growth Analytics
export interface PlantGrowthAnalytics {
  plantId: string;
  strain: string;
  growthStage: PlantGrowthStage;
  measurements: GrowthMeasurement[];
  healthScore: number;
  growthRate: number;
  yieldPrediction: YieldPrediction;
  recommendations: string[];
}

export interface GrowthMeasurement {
  timestamp: Date;
  height: number;
  width: number;
  leafCount: number;
  color: ColorData;
  health: PlantHealth;
  environmental: EnvironmentalConditions;
}

export type PlantGrowthStage =
  | 'germination'
  | 'seedling'
  | 'vegetative'
  | 'flowering'
  | 'ripening'
  | 'harvest';

export interface ColorData {
  dominant: string;
  variance: number;
  chlorophyll: number;
  stress: number;
}

export interface PlantHealth {
  score: number;
  issues: HealthIssue[];
  nutrients: NutrientStatus[];
  pests: PestStatus[];
  diseases: DiseaseStatus[];
}

export interface HealthIssue {
  type: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  recommendation: string;
}

export interface NutrientStatus {
  nutrient: string;
  level: number;
  status: 'deficient' | 'optimal' | 'excessive';
  recommendation?: string;
}

export interface PestStatus {
  pest: string;
  detected: boolean;
  severity: 'low' | 'medium' | 'high';
  treatment?: string;
}

export interface DiseaseStatus {
  disease: string;
  detected: boolean;
  severity: 'low' | 'medium' | 'high';
  treatment?: string;
}

export interface YieldPrediction {
  estimated: number;
  unit: string;
  confidence: number;
  factors: YieldFactor[];
  timeline: Date;
}

export interface YieldFactor {
  factor: string;
  impact: number;
  description: string;
}

// Environmental Analytics
export interface EnvironmentalAnalytics {
  roomId: string;
  timeRange: {
    start: Date;
    end: Date;
  };
  conditions: EnvironmentalConditions[];
  averages: EnvironmentalAverages;
  events: EnvironmentalEvent[];
  efficiency: EnvironmentalEfficiency;
}

export interface EnvironmentalConditions {
  timestamp: Date;
  temperature: number;
  humidity: number;
  co2: number;
  light: LightData;
  air: AirData;
  water: WaterData;
}

export interface LightData {
  intensity: number;
  duration: number;
  spectrum: SpectrumData;
  dli: number;
}

export interface SpectrumData {
  blue: number;
  green: number;
  red: number;
  far_red: number;
  uv: number;
}

export interface AirData {
  vpd: number;
  pressure: number;
  circulation: number;
  quality: AirQuality;
}

export interface AirQuality {
  oxygen: number;
  volatileOrganicCompounds: number;
  particulates: number;
}

export interface WaterData {
  ph: number;
  ec: number;
  temperature: number;
  oxygen: number;
  nutrients: WaterNutrient[];
}

export interface WaterNutrient {
  nutrient: string;
  concentration: number;
  unit: string;
}

export interface EnvironmentalAverages {
  temperature: number;
  humidity: number;
  co2: number;
  lightIntensity: number;
  vpd: number;
  ph: number;
  ec: number;
}

export interface EnvironmentalEvent {
  timestamp: Date;
  type: 'alert' | 'automation' | 'manual' | 'sensor_failure';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  data?: any;
}

export interface EnvironmentalEfficiency {
  energy: EnergyEfficiency;
  water: WaterEfficiency;
  nutrients: NutrientEfficiency;
}

export interface EnergyEfficiency {
  consumption: number;
  cost: number;
  efficiency: number;
  savings: number;
}

export interface WaterEfficiency {
  consumption: number;
  recycling: number;
  efficiency: number;
  savings: number;
}

export interface NutrientEfficiency {
  usage: number;
  waste: number;
  efficiency: number;
  savings: number;
}

// Financial Analytics
export interface FinancialAnalytics {
  period: FinancialPeriod;
  revenue: RevenueData;
  costs: CostData;
  profit: ProfitData;
  metrics: FinancialMetrics;
  forecasts: FinancialForecast[];
  kpis: FinancialKPI[];
}

export interface FinancialPeriod {
  start: Date;
  end: Date;
  type: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
}

export interface RevenueData {
  total: number;
  sources: RevenueSource[];
  growth: number;
  forecast: number;
}

export interface RevenueSource {
  source: string;
  amount: number;
  percentage: number;
  growth: number;
}

export interface CostData {
  total: number;
  categories: CostCategory[];
  breakdown: CostBreakdown;
  savings: number;
}

export interface CostCategory {
  category: string;
  amount: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
}

export interface CostBreakdown {
  energy: number;
  water: number;
  nutrients: number;
  labor: number;
  equipment: number;
  supplies: number;
  other: number;
}

export interface ProfitData {
  gross: number;
  net: number;
  margin: number;
  growth: number;
}

export interface FinancialMetrics {
  roi: number;
  breakEvenPoint: Date;
  costPerUnit: number;
  revenuePerUnit: number;
  operatingMargin: number;
  grossMargin: number;
}

export interface FinancialForecast {
  period: string;
  revenue: number;
  costs: number;
  profit: number;
  confidence: number;
}

export interface FinancialKPI {
  name: string;
  value: number;
  unit: string;
  trend: TrendData;
  target: number;
  status: 'good' | 'warning' | 'critical';
}

// Yield Analytics
export interface YieldAnalytics {
  harvests: HarvestData[];
  yields: YieldData;
  quality: QualityAnalytics;
  predictions: YieldPrediction;
  benchmarks: YieldBenchmark[];
}

export interface HarvestData {
  id: string;
  date: Date;
  strain: string;
  room: string;
  wetWeight: number;
  dryWeight: number;
  quality: QualityData;
  cycleTime: number;
  grade: string;
}

export interface YieldData {
  total: number;
  average: number;
  best: number;
  worst: number;
  growth: number;
  efficiency: number;
}

export interface QualityAnalytics {
  thc: QualityMetric;
  cbd: QualityMetric;
  terpenes: QualityMetric;
  appearance: QualityMetric;
  aroma: QualityMetric;
  overall: QualityMetric;
}

export interface QualityMetric {
  value: number;
  unit?: string;
  grade: string;
  trend: TrendData;
}

export interface QualityData {
  thc: number;
  cbd: number;
  terpenes: TerpeneProfile[];
  appearance: number;
  aroma: number;
  moisture: number;
  grade: string;
}

export interface TerpeneProfile {
  terpene: string;
  percentage: number;
  characteristics: string[];
}

export interface YieldBenchmark {
  metric: string;
  value: number;
  unit: string;
  source: string;
  comparison: number;
}

// Data Quality
export type DataQuality = 'excellent' | 'good' | 'fair' | 'poor' | 'missing';

// Export Types
export type ExportFormat = 'json' | 'csv' | 'excel' | 'pdf' | 'png' | 'svg';

export interface ExportOptions {
  format: ExportFormat;
  includeCharts: boolean;
  includeRawData: boolean;
  includeMetadata: boolean;
  compression?: boolean;
  encryption?: boolean;
  destination?: 'download' | 'email' | 'api' | 'storage';
}

// Report Templates
export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: ReportCategory;
  type: ReportType;
  parameters: ReportParameters;
  layout: ReportLayout;
  isDefault: boolean;
  isCustom: boolean;
}

export interface ReportLayout {
  sections: ReportSection[];
  styling: ReportStyling;
  charts: ChartConfiguration[];
  tables: TableConfiguration[];
}

export interface ReportSection {
  id: string;
  type: 'header' | 'summary' | 'chart' | 'table' | 'text' | 'insights' | 'footer';
  title: string;
  order: number;
  visible: boolean;
  configuration: any;
}

export interface ReportStyling {
  theme: 'light' | 'dark' | 'auto';
  colors: ColorScheme;
  fonts: FontConfiguration;
  logo?: string;
  branding?: BrandingConfiguration;
}

export interface ColorScheme {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  grid: string;
}

export interface FontConfiguration {
  heading: string;
  body: string;
  mono: string;
}

export interface BrandingConfiguration {
  name: string;
  logo: string;
  website?: string;
  contact?: string;
}

// Chart Configuration
export interface ChartConfiguration {
  id: string;
  type: ChartType;
  title: string;
  dataSource: string;
  xAxis: AxisConfiguration;
  yAxis: AxisConfiguration;
  series: SeriesConfiguration[];
  styling: ChartStyling;
  interactions: ChartInteractions;
}

export type ChartType =
  | 'line'
  | 'area'
  | 'bar'
  | 'column'
  | 'pie'
  | 'donut'
  | 'scatter'
  | 'heatmap'
  | 'histogram'
  | 'boxplot'
  | 'candlestick'
  | 'radar'
  | 'polar'
  | 'gauge'
  | 'funnel';

export interface AxisConfiguration {
  type: 'linear' | 'logarithmic' | 'datetime' | 'category';
  label?: string;
  min?: number;
  max?: number;
  format?: string;
  gridLines?: boolean;
  tickMarks?: boolean;
}

export interface SeriesConfiguration {
  name: string;
  dataField: string;
  type?: ChartType;
  color?: string;
  strokeWidth?: number;
  fillOpacity?: number;
  markers?: boolean;
  aggregation?: 'sum' | 'average' | 'min' | 'max' | 'count';
}

export interface ChartStyling {
  colors: string[];
  background: string;
  border: string;
  legend: LegendConfiguration;
  tooltip: TooltipConfiguration;
}

export interface LegendConfiguration {
  visible: boolean;
  position: 'top' | 'bottom' | 'left' | 'right';
  orientation: 'horizontal' | 'vertical';
}

export interface TooltipConfiguration {
  enabled: boolean;
  format: string;
  backgroundColor: string;
  textColor: string;
  borderColor: string;
}

export interface ChartInteractions {
  zoom: boolean;
  pan: boolean;
  crosshair: boolean;
  dataLabels: boolean;
  drilldown: boolean;
}

// Table Configuration
export interface TableConfiguration {
  id: string;
  title: string;
  dataSource: string;
  columns: ColumnConfiguration[];
  sorting: SortingConfiguration;
  filtering: FilteringConfiguration;
  pagination: PaginationConfiguration;
  styling: TableStyling;
}

export interface ColumnConfiguration {
  field: string;
  header: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'custom';
  format?: string;
  sortable?: boolean;
  filterable?: boolean;
  visible?: boolean;
  width?: number;
  aggregation?: 'sum' | 'average' | 'min' | 'max' | 'count';
}

export interface SortingConfiguration {
  enabled: boolean;
  defaultField?: string;
  defaultDirection?: 'asc' | 'desc';
  multiSort?: boolean;
}

export interface FilteringConfiguration {
  enabled: boolean;
  type: 'simple' | 'advanced';
  fields?: string[];
}

export interface PaginationConfiguration {
  enabled: boolean;
  pageSize: number;
  showSizeSelector: boolean;
}

export interface TableStyling {
  striped: boolean;
  bordered: boolean;
  hover: boolean;
  compact: boolean;
  responsive: boolean;
}

// API Response Types
export interface ReportsApiResponse {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
  metadata?: {
    total?: number;
    page?: number;
    pageSize?: number;
    timestamp?: Date;
  };
}

// Real-time Updates
export interface ReportUpdate {
  type: 'status' | 'progress' | 'completion' | 'error';
  reportId: string;
  data: any;
  timestamp: Date;
}

export interface AnalyticsUpdate {
  type: 'metric' | 'alert' | 'insight';
  data: any;
  timestamp: Date;
}