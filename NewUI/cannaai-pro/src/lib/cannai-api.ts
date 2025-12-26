import axios from 'axios';

// API base URL - adjust this to match your backend
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

// Types for API responses
interface AnalysisRequest {
  strain: string;
  leafSymptoms: string;
  phLevel?: string;
  temperature?: string;
  humidity?: string;
  medium?: string;
  growthStage?: string;
  plantImage?: string;
  pestDiseaseFocus?: string;
  urgency?: string;
  additionalNotes?: string;
}

interface AnalysisResponse {
  analysis: {
    diagnosis?: string;
    urgency?: string;
    confidence?: number;
    healthScore?: number;
    causes?: string[];
    strainSpecificAdvice?: string;
    reasoning?: Array<{
      step: string;
      weight: number;
      explanation: string;
    }>;
    recommendations?: string[] | {
      immediate?: string[];
      shortTerm?: string[];
      longTerm?: string[];
    };
  };
  metadata?: {
    provider: string;
    fallbackUsed?: boolean;
    fallbackReason?: string;
  };
}

interface Strain {
  id: string;
  name: string;
  type: string;
  lineage?: string;
  description?: string;
  isPurpleStrain?: boolean;
  optimalConditions?: {
    ph: { range: [number, number]; medium: string };
    temperature: { veg: [number, number]; flower: [number, number] };
    humidity: { veg: [number, number]; flower: [number, number] };
    light: { veg: string; flower: string };
  };
  commonDeficiencies?: string[];
}

interface StrainsResponse {
  strains: Strain[];
}

interface ChatMessage {
  message: string;
  context?: any;
}

interface ChatResponse {
  response: string;
  metadata?: {
    provider: string;
    model?: string;
    tokens?: number;
  };
}

interface SensorData {
  temperature?: number;
  humidity?: number;
  soilMoisture?: number;
  lightIntensity?: number;
  ph?: number;
  ec?: number;
  co2?: number;
  vpd?: number;
}

interface AutomationCommand {
  deviceId: string;
  action: 'on' | 'off' | 'adjust';
  parameters?: Record<string, any>;
}

// API client with error handling
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 second timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging
apiClient.interceptors.request.use(
  (config) => {
    console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('❌ API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('❌ API Response Error:', error);

    // Handle network errors
    if (!error.response) {
      throw new Error('Network error. Please check your connection and try again.');
    }

    // Handle API errors
    const { status, data } = error.response;
    let message = 'An unexpected error occurred';

    switch (status) {
      case 400:
        message = data.error || 'Invalid request. Please check your input and try again.';
        break;
      case 401:
        message = 'Unauthorized. Please check your credentials.';
        break;
      case 404:
        message = 'The requested resource was not found.';
        break;
      case 429:
        message = 'Too many requests. Please try again later.';
        break;
      case 500:
        message = 'Server error. Please try again later.';
        break;
      default:
        message = data.error || `HTTP ${status}: ${message}`;
    }

    throw new Error(message);
  }
);

// Plant Analysis API
export const analyzePlant = async (data: AnalysisRequest): Promise<AnalysisResponse> => {
  try {
    const response = await apiClient.post<AnalysisResponse>('/api/analyze', data);
    return response.data;
  } catch (error) {
    console.error('Plant analysis failed:', error);
    throw error;
  }
};

// Strain Management API
export const getStrains = async (): Promise<Strain[]> => {
  try {
    const response = await apiClient.get<StrainsResponse>('/api/strains');
    return response.data.strains;
  } catch (error) {
    console.error('Failed to fetch strains:', error);
    throw error;
  }
};

export const addStrain = async (strain: Omit<Strain, 'id'>): Promise<Strain> => {
  try {
    const response = await apiClient.post<Strain>('/api/strains', strain);
    return response.data;
  } catch (error) {
    console.error('Failed to add strain:', error);
    throw error;
  }
};

export const updateStrain = async (id: string, strain: Partial<Strain>): Promise<Strain> => {
  try {
    const response = await apiClient.put<Strain>(`/api/strains/${id}`, strain);
    return response.data;
  } catch (error) {
    console.error('Failed to update strain:', error);
    throw error;
  }
};

export const deleteStrain = async (id: string): Promise<void> => {
  try {
    await apiClient.delete(`/api/strains/${id}`);
  } catch (error) {
    console.error('Failed to delete strain:', error);
    throw error;
  }
};

// AI Chat API
export const sendChatMessage = async (data: ChatMessage): Promise<ChatResponse> => {
  try {
    const response = await apiClient.post<ChatResponse>('/api/chat', data);
    return response.data;
  } catch (error) {
    console.error('Chat message failed:', error);
    throw error;
  }
};

// Sensor Data API
export const getSensorData = async (): Promise<SensorData> => {
  try {
    const response = await apiClient.get<SensorData>('/api/sensors');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch sensor data:', error);
    throw error;
  }
};

export const updateSensorData = async (data: SensorData): Promise<void> => {
  try {
    await apiClient.post('/api/sensors', data);
  } catch (error) {
    console.error('Failed to update sensor data:', error);
    throw error;
  }
};

// Automation API
export const controlDevice = async (command: AutomationCommand): Promise<void> => {
  try {
    await apiClient.post('/api/automation', command);
  } catch (error) {
    console.error('Device control failed:', error);
    throw error;
  }
};

// Analysis History API
export const getAnalysisHistory = async (limit: number = 50): Promise<any[]> => {
  try {
    const response = await apiClient.get<any[]>(`/api/history?limit=${limit}`);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch analysis history:', error);
    throw error;
  }
};

// Settings API
export const getSettings = async (): Promise<any> => {
  try {
    const response = await apiClient.get('/api/settings');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch settings:', error);
    throw error;
  }
};

export const updateSettings = async (settings: any): Promise<void> => {
  try {
    await apiClient.post('/api/settings', settings);
  } catch (error) {
    console.error('Failed to update settings:', error);
    throw error;
  }
};

// Utility functions
export const validateImageUrl = (url: string): boolean => {
  try {
    new URL(url);
    return url.match(/\.(jpeg|jpg|gif|png|webp)$/i) !== null;
  } catch {
    return false;
  }
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const debounce = <T extends (...args: any[]) => void>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export default {
  analyzePlant,
  getStrains,
  addStrain,
  updateStrain,
  deleteStrain,
  sendChatMessage,
  getSensorData,
  updateSensorData,
  controlDevice,
  getAnalysisHistory,
  getSettings,
  updateSettings,
  validateImageUrl,
  formatFileSize,
  debounce,
};