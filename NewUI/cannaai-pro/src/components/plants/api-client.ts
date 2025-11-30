import axios, { AxiosResponse } from 'axios';
import {
  Plant,
  PlantStrain,
  PlantFilter,
  PlantSearchResult,
  PlantFormData,
  StrainFormData,
  PlantInventory,
  AnalysisResult,
  PlantsResponse,
  PlantResponse,
  StrainsResponse,
  AnalysisResponse,
  PlantAPIResponse,
  EnvironmentalData,
  PlantImage,
  PlantTask,
  PlantAction
} from './types';

// API base URL - adjust as needed for your environment
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

class PlantsAPIClient {
  private api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  constructor() {
    // Add request interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('Plants API Error:', error);
        throw this.handleError(error);
      }
    );
  }

  private handleError(error: any): Error {
    if (error.response) {
      // Server responded with error status
      const message = error.response.data?.error || error.response.statusText || 'Server error';
      return new Error(`API Error (${error.response.status}): ${message}`);
    } else if (error.request) {
      // Request was made but no response received
      return new Error('Network error: Unable to connect to server');
    } else {
      // Something else happened
      return new Error(`Request error: ${error.message}`);
    }
  }

  // Plant Management
  async getPlants(filter?: PlantFilter): Promise<PlantSearchResult> {
    try {
      const response: AxiosResponse<PlantsResponse> = await this.api.post('/api/plants/search', filter);

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to fetch plants');
      }

      return {
        plants: response.data.data?.plants || [],
        total: response.data.pagination?.total || 0,
        filters: filter || {},
        facets: response.data.data?.facets || {},
        took: 0
      };
    } catch (error) {
      console.error('Failed to fetch plants:', error);
      throw error instanceof Error ? error : new Error('Unknown error fetching plants');
    }
  }

  async getPlant(id: string): Promise<Plant> {
    try {
      const response: AxiosResponse<PlantResponse> = await this.api.get(`/api/plants/${id}`);

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to fetch plant');
      }

      return response.data.data!;
    } catch (error) {
      console.error('Failed to fetch plant:', error);
      throw error instanceof Error ? error : new Error('Unknown error fetching plant');
    }
  }

  async createPlant(formData: PlantFormData): Promise<Plant> {
    try {
      const formDataPayload = new FormData();

      // Add all plant data
      Object.entries(formData).forEach(([key, value]) => {
        if (key === 'images' && Array.isArray(value)) {
          value.forEach((file, index) => {
            formDataPayload.append(`images[${index}]`, file);
          });
        } else if (Array.isArray(value)) {
          formDataPayload.append(key, JSON.stringify(value));
        } else if (typeof value === 'object' && value !== null) {
          formDataPayload.append(key, JSON.stringify(value));
        } else {
          formDataPayload.append(key, String(value));
        }
      });

      const response: AxiosResponse<PlantResponse> = await this.api.post('/api/plants', formDataPayload, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to create plant');
      }

      return response.data.data!;
    } catch (error) {
      console.error('Failed to create plant:', error);
      throw error instanceof Error ? error : new Error('Unknown error creating plant');
    }
  }

  async updatePlant(id: string, updates: Partial<Plant>): Promise<Plant> {
    try {
      const response: AxiosResponse<PlantResponse> = await this.api.put(`/api/plants/${id}`, updates);

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to update plant');
      }

      return response.data.data!;
    } catch (error) {
      console.error('Failed to update plant:', error);
      throw error instanceof Error ? error : new Error('Unknown error updating plant');
    }
  }

  async deletePlant(id: string): Promise<void> {
    try {
      const response: AxiosResponse<PlantAPIResponse> = await this.api.delete(`/api/plants/${id}`);

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to delete plant');
      }
    } catch (error) {
      console.error('Failed to delete plant:', error);
      throw error instanceof Error ? error : new Error('Unknown error deleting plant');
    }
  }

  async archivePlant(id: string): Promise<Plant> {
    try {
      const response: AxiosResponse<PlantResponse> = await this.api.post(`/api/plants/${id}/archive`);

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to archive plant');
      }

      return response.data.data!;
    } catch (error) {
      console.error('Failed to archive plant:', error);
      throw error instanceof Error ? error : new Error('Unknown error archiving plant');
    }
  }

  async restorePlant(id: string): Promise<Plant> {
    try {
      const response: AxiosResponse<PlantResponse> = await this.api.post(`/api/plants/${id}/restore`);

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to restore plant');
      }

      return response.data.data!;
    } catch (error) {
      console.error('Failed to restore plant:', error);
      throw error instanceof Error ? error : new Error('Unknown error restoring plant');
    }
  }

  // Plant Inventory
  async getPlantInventory(): Promise<PlantInventory> {
    try {
      const response: AxiosResponse<PlantsResponse> = await this.api.get('/api/plants/inventory');

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to fetch plant inventory');
      }

      return response.data.data?.inventory || {
        totalPlants: 0,
        activePlants: 0,
        archivedPlants: 0,
        byStage: {},
        byHealth: {},
        byLocation: {},
        byStrain: {},
        estimatedYield: 0,
        averageHealth: 0,
        upcomingTasks: 0,
        overdueTasks: 0
      };
    } catch (error) {
      console.error('Failed to fetch plant inventory:', error);
      throw error instanceof Error ? error : new Error('Unknown error fetching plant inventory');
    }
  }

  // Strain Management
  async getStrains(): Promise<PlantStrain[]> {
    try {
      const response: AxiosResponse<StrainsResponse> = await this.api.get('/api/strains');

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to fetch strains');
      }

      return response.data.data?.strains || [];
    } catch (error) {
      console.error('Failed to fetch strains:', error);
      throw error instanceof Error ? error : new Error('Unknown error fetching strains');
    }
  }

  async getStrain(id: string): Promise<PlantStrain> {
    try {
      const response: AxiosResponse<PlantAPIResponse> = await this.api.get(`/api/strains/${id}`);

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to fetch strain');
      }

      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch strain:', error);
      throw error instanceof Error ? error : new Error('Unknown error fetching strain');
    }
  }

  async createStrain(formData: StrainFormData): Promise<PlantStrain> {
    try {
      const response: AxiosResponse<PlantAPIResponse> = await this.api.post('/api/strains', formData);

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to create strain');
      }

      return response.data.data;
    } catch (error) {
      console.error('Failed to create strain:', error);
      throw error instanceof Error ? error : new Error('Unknown error creating strain');
    }
  }

  async updateStrain(id: string, updates: Partial<PlantStrain>): Promise<PlantStrain> {
    try {
      const response: AxiosResponse<PlantAPIResponse> = await this.api.put(`/api/strains/${id}`, updates);

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to update strain');
      }

      return response.data.data;
    } catch (error) {
      console.error('Failed to update strain:', error);
      throw error instanceof Error ? error : new Error('Unknown error updating strain');
    }
  }

  async deleteStrain(id: string): Promise<void> {
    try {
      const response: AxiosResponse<PlantAPIResponse> = await this.api.delete(`/api/strains/${id}`);

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to delete strain');
      }
    } catch (error) {
      console.error('Failed to delete strain:', error);
      throw error instanceof Error ? error : new Error('Unknown error deleting strain');
    }
  }

  // Plant Analysis
  async analyzePlant(plantId: string, image?: File, additionalData?: any): Promise<AnalysisResult> {
    try {
      const formDataPayload = new FormData();

      if (image) {
        formDataPayload.append('image', image);
      }

      if (additionalData) {
        formDataPayload.append('data', JSON.stringify(additionalData));
      }

      const response: AxiosResponse<AnalysisResponse> = await this.api.post(`/api/plants/${plantId}/analyze`, formDataPayload, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to analyze plant');
      }

      return response.data.data!.result;
    } catch (error) {
      console.error('Failed to analyze plant:', error);
      throw error instanceof Error ? error : new Error('Unknown error analyzing plant');
    }
  }

  async getPlantAnalyses(plantId: string): Promise<AnalysisResult[]> {
    try {
      const response: AxiosResponse<PlantAPIResponse> = await this.api.get(`/api/plants/${plantId}/analyses`);

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to fetch plant analyses');
      }

      return response.data.data || [];
    } catch (error) {
      console.error('Failed to fetch plant analyses:', error);
      throw error instanceof Error ? error : new Error('Unknown error fetching plant analyses');
    }
  }

  // Environmental Data
  async getEnvironmentalData(plantId: string, startDate?: string, endDate?: string): Promise<EnvironmentalData[]> {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response: AxiosResponse<PlantAPIResponse> = await this.api.get(`/api/plants/${plantId}/environment?${params}`);

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to fetch environmental data');
      }

      return response.data.data || [];
    } catch (error) {
      console.error('Failed to fetch environmental data:', error);
      throw error instanceof Error ? error : new Error('Unknown error fetching environmental data');
    }
  }

  async recordEnvironmentalData(plantId: string, data: EnvironmentalData): Promise<EnvironmentalData> {
    try {
      const response: AxiosResponse<PlantAPIResponse> = await this.api.post(`/api/plants/${plantId}/environment`, data);

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to record environmental data');
      }

      return response.data.data;
    } catch (error) {
      console.error('Failed to record environmental data:', error);
      throw error instanceof Error ? error : new Error('Unknown error recording environmental data');
    }
  }

  // Plant Images
  async uploadPlantImage(plantId: string, file: File, description?: string, type?: string): Promise<PlantImage> {
    try {
      const formDataPayload = new FormData();
      formDataPayload.append('image', file);

      if (description) {
        formDataPayload.append('description', description);
      }

      if (type) {
        formDataPayload.append('type', type);
      }

      const response: AxiosResponse<PlantAPIResponse> = await this.api.post(`/api/plants/${plantId}/images`, formDataPayload, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to upload plant image');
      }

      return response.data.data;
    } catch (error) {
      console.error('Failed to upload plant image:', error);
      throw error instanceof Error ? error : new Error('Unknown error uploading plant image');
    }
  }

  async deletePlantImage(plantId: string, imageId: string): Promise<void> {
    try {
      const response: AxiosResponse<PlantAPIResponse> = await this.api.delete(`/api/plants/${plantId}/images/${imageId}`);

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to delete plant image');
      }
    } catch (error) {
      console.error('Failed to delete plant image:', error);
      throw error instanceof Error ? error : new Error('Unknown error deleting plant image');
    }
  }

  async setPrimaryPlantImage(plantId: string, imageId: string): Promise<PlantImage> {
    try {
      const response: AxiosResponse<PlantAPIResponse> = await this.api.put(`/api/plants/${plantId}/images/${imageId}/primary`);

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to set primary plant image');
      }

      return response.data.data;
    } catch (error) {
      console.error('Failed to set primary plant image:', error);
      throw error instanceof Error ? error : new Error('Unknown error setting primary plant image');
    }
  }

  // Plant Tasks and Actions
  async getPlantTasks(plantId?: string): Promise<PlantTask[]> {
    try {
      const url = plantId ? `/api/plants/${plantId}/tasks` : '/api/tasks';
      const response: AxiosResponse<PlantAPIResponse> = await this.api.get(url);

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to fetch plant tasks');
      }

      return response.data.data || [];
    } catch (error) {
      console.error('Failed to fetch plant tasks:', error);
      throw error instanceof Error ? error : new Error('Unknown error fetching plant tasks');
    }
  }

  async createPlantTask(task: Omit<PlantTask, 'id' | 'createdAt' | 'updatedAt'>): Promise<PlantTask> {
    try {
      const response: AxiosResponse<PlantAPIResponse> = await this.api.post('/api/tasks', task);

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to create plant task');
      }

      return response.data.data;
    } catch (error) {
      console.error('Failed to create plant task:', error);
      throw error instanceof Error ? error : new Error('Unknown error creating plant task');
    }
  }

  async updatePlantTask(id: string, updates: Partial<PlantTask>): Promise<PlantTask> {
    try {
      const response: AxiosResponse<PlantAPIResponse> = await this.api.put(`/api/tasks/${id}`, updates);

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to update plant task');
      }

      return response.data.data;
    } catch (error) {
      console.error('Failed to update plant task:', error);
      throw error instanceof Error ? error : new Error('Unknown error updating plant task');
    }
  }

  async completePlantTask(id: string, notes?: string): Promise<PlantTask> {
    try {
      const response: AxiosResponse<PlantAPIResponse> = await this.api.post(`/api/tasks/${id}/complete`, { notes });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to complete plant task');
      }

      return response.data.data;
    } catch (error) {
      console.error('Failed to complete plant task:', error);
      throw error instanceof Error ? error : new Error('Unknown error completing plant task');
    }
  }

  // Plant Actions (Watering, Feeding, etc.)
  async getPlantActions(plantId?: string): Promise<PlantAction[]> {
    try {
      const url = plantId ? `/api/plants/${plantId}/actions` : '/api/actions';
      const response: AxiosResponse<PlantAPIResponse> = await this.api.get(url);

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to fetch plant actions');
      }

      return response.data.data || [];
    } catch (error) {
      console.error('Failed to fetch plant actions:', error);
      throw error instanceof Error ? error : new Error('Unknown error fetching plant actions');
    }
  }

  async recordPlantAction(action: Omit<PlantAction, 'id' | 'createdAt'>): Promise<PlantAction> {
    try {
      const response: AxiosResponse<PlantAPIResponse> = await this.api.post('/api/actions', action);

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to record plant action');
      }

      return response.data.data;
    } catch (error) {
      console.error('Failed to record plant action:', error);
      throw error instanceof Error ? error : new Error('Unknown error recording plant action');
    }
  }

  // Batch Operations
  async batchUpdatePlants(plantIds: string[], updates: Partial<Plant>): Promise<Plant[]> {
    try {
      const response: AxiosResponse<PlantAPIResponse> = await this.api.post('/api/plants/batch-update', {
        plantIds,
        updates
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to batch update plants');
      }

      return response.data.data;
    } catch (error) {
      console.error('Failed to batch update plants:', error);
      throw error instanceof Error ? error : new Error('Unknown error batch updating plants');
    }
  }

  async batchDeletePlants(plantIds: string[]): Promise<void> {
    try {
      const response: AxiosResponse<PlantAPIResponse> = await this.api.post('/api/plants/batch-delete', {
        plantIds
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to batch delete plants');
      }
    } catch (error) {
      console.error('Failed to batch delete plants:', error);
      throw error instanceof Error ? error : new Error('Unknown error batch deleting plants');
    }
  }

  // Export/Import
  async exportPlants(filter?: PlantFilter, format: 'json' | 'csv' | 'xlsx' = 'json'): Promise<Blob> {
    try {
      const response: AxiosResponse<Blob> = await this.api.post('/api/plants/export', {
        filter,
        format
      }, {
        responseType: 'blob'
      });

      return response.data;
    } catch (error) {
      console.error('Failed to export plants:', error);
      throw error instanceof Error ? error : new Error('Unknown error exporting plants');
    }
  }

  async importPlants(file: File): Promise<{ imported: number; errors: string[] }> {
    try {
      const formDataPayload = new FormData();
      formDataPayload.append('file', file);

      const response: AxiosResponse<PlantAPIResponse> = await this.api.post('/api/plants/import', formDataPayload, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to import plants');
      }

      return response.data.data;
    } catch (error) {
      console.error('Failed to import plants:', error);
      throw error instanceof Error ? error : new Error('Unknown error importing plants');
    }
  }

  // Statistics and Reports
  async getPlantStatistics(filter?: PlantFilter): Promise<any> {
    try {
      const response: AxiosResponse<PlantAPIResponse> = await this.api.post('/api/plants/statistics', filter);

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to fetch plant statistics');
      }

      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch plant statistics:', error);
      throw error instanceof Error ? error : new Error('Unknown error fetching plant statistics');
    }
  }
}

// Create singleton instance
export const plantsAPI = new PlantsAPIClient();
export default plantsAPI;