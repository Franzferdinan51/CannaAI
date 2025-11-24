import { apiClient } from '@/lib/api/client';
import {
  PlantAnalysisRequest,
  PlantAnalysisResponse,
  ApiResponse
} from '@/types/api';

// =============================================================================
// Analysis Service
// =============================================================================

export class AnalysisService {
  private readonly basePath = '/api/analyze';

  /**
   * Analyze plant health with AI
   */
  async analyzePlant(request: PlantAnalysisRequest): Promise<PlantAnalysisResponse> {
    try {
      const response = await apiClient.post<PlantAnalysisResponse>(
        this.basePath,
        request,
        {
          timeout: 120000, // 2 minutes timeout for image analysis
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.success) {
        throw new Error(response.error?.message || 'Analysis failed');
      }

      return response;
    } catch (error) {
      console.error('Plant analysis failed:', error);
      throw error;
    }
  }

  /**
   * Get analysis service status and capabilities
   */
  async getServiceStatus(): Promise<ApiResponse> {
    try {
      const response = await apiClient.get<ApiResponse>(this.basePath);
      return response;
    } catch (error) {
      console.error('Failed to get analysis service status:', error);
      throw error;
    }
  }

  /**
   * Upload and analyze plant image with progress tracking
   */
  async analyzePlantImage(
    file: File,
    analysisData: Omit<PlantAnalysisRequest, 'plantImage'>,
    onProgress?: (progress: number) => void
  ): Promise<PlantAnalysisResponse> {
    try {
      // Convert file to base64
      const base64 = await this.fileToBase64(file);

      const request: PlantAnalysisRequest = {
        ...analysisData,
        plantImage: base64
      };

      return await this.analyzePlant(request);
    } catch (error) {
      console.error('Plant image analysis failed:', error);
      throw error;
    }
  }

  /**
   * Get analysis history (if implemented)
   */
  async getAnalysisHistory(): Promise<ApiResponse> {
    try {
      const response = await apiClient.get<ApiResponse>('/api/history');
      return response;
    } catch (error) {
      console.error('Failed to get analysis history:', error);
      throw error;
    }
  }

  /**
   * Save analysis to history
   */
  async saveToHistory(analysisData: any): Promise<ApiResponse> {
    try {
      const response = await apiClient.post<ApiResponse>('/api/history', analysisData);
      return response;
    } catch (error) {
      console.error('Failed to save analysis to history:', error);
      throw error;
    }
  }

  /**
   * Delete analysis from history
   */
  async deleteFromHistory(id: string): Promise<ApiResponse> {
    try {
      const response = await apiClient.delete<ApiResponse>(`/api/history?id=${id}`);
      return response;
    } catch (error) {
      console.error('Failed to delete analysis from history:', error);
      throw error;
    }
  }

  /**
   * Batch analyze multiple plants
   */
  async batchAnalyze(requests: PlantAnalysisRequest[]): Promise<PlantAnalysisResponse[]> {
    try {
      const promises = requests.map(request => this.analyzePlant(request));
      const results = await Promise.allSettled(promises);

      return results.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          console.error(`Analysis ${index + 1} failed:`, result.reason);
          throw result.reason;
        }
      });
    } catch (error) {
      console.error('Batch analysis failed:', error);
      throw error;
    }
  }

  // =============================================================================
  // Utility Methods
  // =============================================================================

  /**
   * Convert file to base64 string
   */
  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data:image/type;base64, prefix if needed
        const base64 = result.includes(',') ? result.split(',')[1] : result;
        resolve(result); // Keep the full data URL for the API
      };
      reader.onerror = error => reject(error);
    });
  }

  /**
   * Validate analysis request
   */
  validateRequest(request: PlantAnalysisRequest): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!request.strain?.trim()) {
      errors.push('Strain name is required');
    }

    if (!request.leafSymptoms?.trim()) {
      errors.push('Leaf symptoms description is required');
    }

    if (request.temperature !== undefined) {
      const temp = typeof request.temperature === 'string'
        ? parseFloat(request.temperature)
        : request.temperature;

      if (isNaN(temp) || temp < -50 || temp > 150) {
        errors.push('Temperature must be between -50°F and 150°F');
      }
    }

    if (request.humidity !== undefined) {
      const humidity = typeof request.humidity === 'string'
        ? parseFloat(request.humidity)
        : request.humidity;

      if (isNaN(humidity) || humidity < 0 || humidity > 100) {
        errors.push('Humidity must be between 0% and 100%');
      }
    }

    if (request.phLevel !== undefined) {
      const ph = typeof request.phLevel === 'string'
        ? parseFloat(request.phLevel)
        : request.phLevel;

      if (isNaN(ph) || ph < 0 || ph > 14) {
        errors.push('pH level must be between 0 and 14');
      }
    }

    // Validate image if provided
    if (request.plantImage) {
      // Check if it's a valid base64 image
      const base64Pattern = /^data:image\/(jpeg|jpg|png|gif|webp);base64,/i;
      if (!base64Pattern.test(request.plantImage)) {
        errors.push('Invalid image format. Please upload a valid image file.');
      }

      // Rough size check (base64 is ~33% larger than original)
      const base64Size = request.plantImage.length * 0.75;
      const maxSizeInBytes = 50 * 1024 * 1024; // 50MB
      if (base64Size > maxSizeInBytes) {
        errors.push('Image is too large. Please use an image under 50MB.');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get analysis progress (for long-running analyses)
   */
  async getAnalysisProgress(analysisId: string): Promise<{ progress: number; message: string }> {
    try {
      // This would need to be implemented on the backend
      // For now, return a mock response
      return {
        progress: 100,
        message: 'Analysis complete'
      };
    } catch (error) {
      console.error('Failed to get analysis progress:', error);
      throw error;
    }
  }

  /**
   * Cancel ongoing analysis
   */
  async cancelAnalysis(analysisId: string): Promise<ApiResponse> {
    try {
      // This would need to be implemented on the backend
      // For now, return a mock response
      return {
        success: true,
        message: 'Analysis cancelled',
        timestamp: new Date().toISOString(),
        buildMode: 'server'
      };
    } catch (error) {
      console.error('Failed to cancel analysis:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const analysisService = new AnalysisService();

// Export service class for testing
export { AnalysisService };