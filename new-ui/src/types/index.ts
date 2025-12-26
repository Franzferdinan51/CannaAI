// Re-export types from API service for convenience
export type {
  AnalysisRequest,
  AnalysisResponse,
  ChatMessage,
  ChatResponse,
  SensorData,
  Strain,
  Settings,
} from '../services/api';

// Additional types for UI components

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  image?: string;
  model?: string;
  provider?: string;
  processingTime?: string;
  isTyping?: boolean;
  context?: any;
}

export interface AIModel {
  name: string;
  provider: string;
  hasVision: boolean;
  isAvailable: boolean;
}

export interface PageContext {
  page: string;
  title: string;
  data?: any;
}

export interface Notification {
  id: number;
  type: 'alert' | 'info' | 'success' | 'error';
  message: string;
  time: string;
}

export interface DashboardTab {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
}

export interface EnvironmentalStat {
  label: string;
  value: string;
  icon: React.ComponentType<any>;
  color: string;
  bg: string;
  border: string;
}

export interface ChartDataPoint {
  time: string;
  temp: number;
  hum: number;
}

export interface CannaAIAssistantSidebarProps {
  sensorData: SensorData;
  currentModel?: AIModel;
  initialContext?: PageContext;
  onToggleCollapse?: (collapsed: boolean) => void;
  className?: string;
}

export interface AnalysisFormData {
  strain: string;
  leafSymptoms: string;
  phLevel: string;
  temperature: string;
  humidity: string;
  medium: string;
  growthStage: string;
  plantImage: File | null;
  pestDiseaseFocus: string;
  urgency: string;
  additionalNotes: string;
}

export interface UIState {
  mounted: boolean;
  isLoading: boolean;
  sidePanelOpen: boolean;
  showMobileMenu: boolean;
  aiSidebarOpen: boolean;
  activeDashboard: string;
}

// Theme and style types
export type Theme = 'light' | 'dark' | 'system';

export interface AppConfig {
  theme: Theme;
  autoSave: boolean;
  notifications: boolean;
  compactMode: boolean;
}

// Error types
export interface AppError {
  message: string;
  code?: string;
  status?: number;
  details?: any;
}

// Component prop types
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface LoadingStateProps extends BaseComponentProps {
  isLoading: boolean;
  error?: AppError | null;
}

export interface ButtonProps extends BaseComponentProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}

// Navigation types
export interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  path?: string;
  badge?: string | number;
  children?: NavItem[];
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
  active?: boolean;
}

// Form types
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'file';
  required?: boolean;
  placeholder?: string;
  options?: Array<{ label: string; value: string }>;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    custom?: (value: any) => string | undefined;
  };
}

export interface FormConfig {
  fields: FormField[];
  onSubmit: (data: Record<string, any>) => void | Promise<void>;
  initialValues?: Record<string, any>;
  validation?: {
    mode?: 'onChange' | 'onBlur' | 'onSubmit';
  };
}

// Modal/Dialog types
export interface ModalProps extends BaseComponentProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closeOnOverlayClick?: boolean;
  showCloseButton?: boolean;
}

// Table types
export interface TableColumn<T = any> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: T, index: number) => React.ReactNode;
  width?: string | number;
}

export interface TableConfig<T = any> {
  data: T[];
  columns: TableColumn<T>[];
  loading?: boolean;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
  };
  selection?: {
    selectedRows: T[];
    onSelectionChange: (rows: T[]) => void;
  };
  sorting?: {
    key: keyof T;
    direction: 'asc' | 'desc';
    onSort: (key: keyof T, direction: 'asc' | 'desc') => void;
  };
}

// Chart types
export interface ChartConfig {
  type: 'line' | 'bar' | 'pie' | 'area';
  data: any[];
  xAxis?: string;
  yAxis?: string[];
  colors?: string[];
  height?: number | string;
  responsive?: boolean;
  animation?: boolean;
}

// Search and filter types
export interface FilterOption {
  key: string;
  label: string;
  type: 'select' | 'multiselect' | 'date' | 'daterange' | 'text' | 'number';
  options?: Array<{ label: string; value: any }>;
}

export interface SearchConfig {
  placeholder?: string;
  filters?: FilterOption[];
  onSearch: (query: string, filters: Record<string, any>) => void;
  debounceMs?: number;
}

// File upload types
export interface FileUploadConfig {
  accept?: string;
  multiple?: boolean;
  maxSize?: number;
  maxFiles?: number;
  preview?: boolean;
  onUpload: (files: File[]) => void | Promise<void>;
}

// WebSocket types
export interface WebSocketConfig {
  url: string;
  protocols?: string[];
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onMessage?: (data: any) => void;
  onError?: (error: Event) => void;
}

// Local storage types
export interface StorageConfig<T> {
  key: string;
  defaultValue: T;
  serialize?: (value: T) => string;
  deserialize?: (value: string) => T;
}

// Utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredBy<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Event types
export interface CustomEvent<T = any> {
  type: string;
  detail: T;
  timestamp: Date;
}

// Animation types
export interface AnimationConfig {
  duration?: number;
  easing?: string;
  delay?: number;
  direction?: 'normal' | 'reverse' | 'alternate';
  iterations?: number | 'infinite';
  fill?: 'none' | 'forwards' | 'backwards' | 'both';
}

// Responsive breakpoints
export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface ResponsiveValue<T> {
  xs?: T;
  sm?: T;
  md?: T;
  lg?: T;
  xl?: T;
  '2xl'?: T;
}

// Accessibility types
export interface AriaAttributes {
  role?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  'aria-expanded'?: boolean;
  'aria-selected'?: boolean;
  'aria-disabled'?: boolean;
  'aria-atomic'?: boolean;
  'aria-live'?: 'polite' | 'assertive' | 'off';
}

// Testing types
export interface TestData {
  id: string;
  name: string;
  description?: string;
  mockData?: any;
}

export interface TestConfig {
  beforeEach?: () => void;
  afterEach?: () => void;
  mockData?: Record<string, any>;
}