import { apiClient } from '@/lib/api/client';
import {
  Strain,
  CreateStrainRequest,
  UpdateStrainRequest,
  StrainsResponse,
  ApiResponse
} from '@/types/api';

// =============================================================================
// Strains Service
// =============================================================================

export class StrainsService {
  private readonly basePath = '/api/strains';

  /**
   * Get all strains
   */
  async getAllStrains(): Promise<StrainsResponse> {
    try {
      const response = await apiClient.get<StrainsResponse>(this.basePath);

      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to fetch strains');
      }

      return response;
    } catch (error) {
      console.error('Failed to fetch strains:', error);
      throw error;
    }
  }

  /**
   * Get strain by ID
   */
  async getStrainById(id: string): Promise<Strain | null> {
    try {
      const response = await this.getAllStrains();
      const strain = response.strains.find(s => s.id === id);
      return strain || null;
    } catch (error) {
      console.error(`Failed to fetch strain ${id}:`, error);
      throw error;
    }
  }

  /**
   * Create new strain
   */
  async createStrain(strainData: CreateStrainRequest): Promise<Strain> {
    try {
      const response = await apiClient.post<ApiResponse<{ strain: Strain }>>(
        this.basePath,
        strainData,
        {
          timeout: 30000, // 30 seconds timeout
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to create strain');
      }

      return response.data!.strain;
    } catch (error) {
      console.error('Failed to create strain:', error);
      throw error;
    }
  }

  /**
   * Update existing strain
   */
  async updateStrain(strainData: UpdateStrainRequest): Promise<Strain> {
    try {
      const response = await apiClient.put<ApiResponse<{ strain: Strain }>>(
        this.basePath,
        strainData,
        {
          timeout: 30000,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to update strain');
      }

      return response.data!.strain;
    } catch (error) {
      console.error(`Failed to update strain ${strainData.id}:`, error);
      throw error;
    }
  }

  /**
   * Delete strain
   */
  async deleteStrain(id: string): Promise<Strain> {
    try {
      const response = await apiClient.delete<ApiResponse<{ strain: Strain }>>(
        `${this.basePath}?id=${id}`,
        {
          timeout: 30000
        }
      );

      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to delete strain');
      }

      return response.data!.strain;
    } catch (error) {
      console.error(`Failed to delete strain ${id}:`, error);
      throw error;
    }
  }

  // =============================================================================
  // Search and Filter Methods
  // =============================================================================

  /**
   * Search strains by name or description
   */
  async searchStrains(query: string): Promise<Strain[]> {
    try {
      const response = await this.getAllStrains();
      const searchTerm = query.toLowerCase().trim();

      if (!searchTerm) {
        return response.strains;
      }

      return response.strains.filter(strain =>
        strain.name.toLowerCase().includes(searchTerm) ||
        strain.type.toLowerCase().includes(searchTerm) ||
        strain.lineage.toLowerCase().includes(searchTerm) ||
        strain.description.toLowerCase().includes(searchTerm)
      );
    } catch (error) {
      console.error(`Failed to search strains with query "${query}":`, error);
      throw error;
    }
  }

  /**
   * Filter strains by type
   */
  async filterStrainsByType(type: string): Promise<Strain[]> {
    try {
      const response = await this.getAllStrains();
      return response.strains.filter(strain =>
        strain.type.toLowerCase().includes(type.toLowerCase())
      );
    } catch (error) {
      console.error(`Failed to filter strains by type "${type}":`, error);
      throw error;
    }
  }

  /**
   * Get purple strains only
   */
  async getPurpleStrains(): Promise<Strain[]> {
    try {
      const response = await this.getAllStrains();
      return response.strains.filter(strain => strain.isPurpleStrain);
    } catch (error) {
      console.error('Failed to get purple strains:', error);
      throw error;
    }
  }

  /**
   * Get strains by growing medium
   */
  async getStrainsByMedium(medium: 'soil' | 'hydroponic' | 'aeroponic' | 'all'): Promise<Strain[]> {
    try {
      const response = await this.getAllStrains();

      if (medium === 'all') {
        return response.strains;
      }

      return response.strains.filter(strain =>
        strain.optimalConditions.ph.medium === medium
      );
    } catch (error) {
      console.error(`Failed to get strains for medium "${medium}":`, error);
      throw error;
    }
  }

  /**
   * Get recommended strains for growing conditions
   */
  async getRecommendedStrains(conditions: {
    temperature?: number;
    humidity?: number;
    medium?: string;
    experience?: 'beginner' | 'intermediate' | 'advanced';
  }): Promise<Strain[]> {
    try {
      const response = await this.getAllStrains();
      let strains = response.strains;

      // Filter by medium if specified
      if (conditions.medium) {
        strains = strains.filter(strain =>
          strain.optimalConditions.ph.medium === conditions.medium
        );
      }

      // Filter by temperature if specified
      if (conditions.temperature !== undefined) {
        strains = strains.filter(strain => {
          const { veg, flower } = strain.optimalConditions.temperature;
          return conditions.temperature! >= Math.min(...veg, ...flower) &&
                 conditions.temperature! <= Math.max(...veg, ...flower);
        });
      }

      // Filter by humidity if specified
      if (conditions.humidity !== undefined) {
        strains = strains.filter(strain => {
          const { veg, flower } = strain.optimalConditions.humidity;
          return conditions.humidity! >= Math.min(...veg, ...flower) &&
                 conditions.humidity! <= Math.max(...veg, ...flower);
        });
      }

      // Rank by experience level (simplified logic)
      if (conditions.experience) {
        const difficultyScores = {
          beginner: 1,
          intermediate: 2,
          advanced: 3
        };

        // Simple scoring based on common deficiencies and special notes
        strains = strains.sort((a, b) => {
          const scoreA = a.commonDeficiencies.length + (a.specialNotes.length > 100 ? 1 : 0);
          const scoreB = b.commonDeficiencies.length + (b.specialNotes.length > 100 ? 1 : 0);
          return scoreA - scoreB;
        });
      }

      return strains.slice(0, 10); // Return top 10 recommendations
    } catch (error) {
      console.error('Failed to get recommended strains:', error);
      throw error;
    }
  }

  // =============================================================================
  // Analytics and Insights
  // =============================================================================

  /**
   * Get strain statistics
   */
  async getStrainStatistics(): Promise<{
    total: number;
    byType: Record<string, number>;
    purpleCount: number;
    averageOptimalTemp: { veg: number; flower: number };
    averageOptimalHumidity: { veg: number; flower: number };
    commonDeficiencies: Record<string, number>;
  }> {
    try {
      const response = await this.getAllStrains();
      const strains = response.strains;

      const byType: Record<string, number> = {};
      const commonDeficiencies: Record<string, number> = {};

      let totalVegTemp = 0;
      let totalFlowerTemp = 0;
      let totalVegHumidity = 0;
      let totalFlowerHumidity = 0;

      strains.forEach(strain => {
        // Count by type
        byType[strain.type] = (byType[strain.type] || 0) + 1;

        // Count common deficiencies
        strain.commonDeficiencies.forEach(def => {
          commonDeficiencies[def] = (commonDeficiencies[def] || 0) + 1;
        });

        // Sum temperature ranges
        const [vegTempMin, vegTempMax] = strain.optimalConditions.temperature.veg;
        const [flowerTempMin, flowerTempMax] = strain.optimalConditions.temperature.flower;
        totalVegTemp += (vegTempMin + vegTempMax) / 2;
        totalFlowerTemp += (flowerTempMin + flowerTempMax) / 2;

        // Sum humidity ranges
        const [vegHumidMin, vegHumidMax] = strain.optimalConditions.humidity.veg;
        const [flowerHumidMin, flowerHumidMax] = strain.optimalConditions.humidity.flower;
        totalVegHumidity += (vegHumidMin + vegHumidMax) / 2;
        totalFlowerHumidity += (flowerHumidMin + flowerHumidMax) / 2;
      });

      return {
        total: strains.length,
        byType,
        purpleCount: strains.filter(s => s.isPurpleStrain).length,
        averageOptimalTemp: {
          veg: Math.round((totalVegTemp / strains.length) * 10) / 10,
          flower: Math.round((totalFlowerTemp / strains.length) * 10) / 10
        },
        averageOptimalHumidity: {
          veg: Math.round((totalVegHumidity / strains.length)),
          flower: Math.round((totalFlowerHumidity / strains.length))
        },
        commonDeficiencies
      };
    } catch (error) {
      console.error('Failed to get strain statistics:', error);
      throw error;
    }
  }

  /**
   * Compare strains
   */
  async compareStrains(strainIds: string[]): Promise<Strain[]> {
    try {
      const strains = await Promise.all(
        strainIds.map(id => this.getStrainById(id))
      );

      return strains.filter((strain): strain is Strain => strain !== null);
    } catch (error) {
      console.error('Failed to compare strains:', error);
      throw error;
    }
  }

  /**
   * Get strain compatibility for growing together
   */
  async getCompatibleStrains(strainId: string): Promise<Strain[]> {
    try {
      const mainStrain = await this.getStrainById(strainId);
      if (!mainStrain) {
        throw new Error(`Strain ${strainId} not found`);
      }

      const allStrains = await this.getAllStrains();
      const otherStrains = allStrains.strains.filter(s => s.id !== strainId);

      // Simple compatibility logic based on similar optimal conditions
      return otherStrains.filter(strain => {
        const tempSimilarity = Math.abs(
          mainStrain.optimalConditions.temperature.veg[0] -
          strain.optimalConditions.temperature.veg[0]
        ) < 5;

        const humiditySimilarity = Math.abs(
          mainStrain.optimalConditions.humidity.veg[0] -
          strain.optimalConditions.humidity.veg[0]
        ) < 10;

        const sameMedium = mainStrain.optimalConditions.ph.medium === strain.optimalConditions.ph.medium;

        return tempSimilarity && humiditySimilarity && sameMedium;
      });
    } catch (error) {
      console.error(`Failed to get compatible strains for ${strainId}:`, error);
      throw error;
    }
  }

  // =============================================================================
  // Utility Methods
  // =============================================================================

  /**
   * Validate strain data
   */
  validateStrainData(data: CreateStrainRequest): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.name?.trim()) {
      errors.push('Strain name is required');
    }

    if (data.name && data.name.length > 100) {
      errors.push('Strain name must be less than 100 characters');
    }

    if (data.type && data.type.length > 100) {
      errors.push('Strain type must be less than 100 characters');
    }

    if (data.lineage && data.lineage.length > 200) {
      errors.push('Lineage must be less than 200 characters');
    }

    if (data.description && data.description.length > 1000) {
      errors.push('Description must be less than 1000 characters');
    }

    // Validate optimal conditions if provided
    if (data.optimalConditions) {
      const { ph, temperature, humidity } = data.optimalConditions;

      // Validate pH
      if (ph.range.length !== 2 || ph.range[0] < 0 || ph.range[1] > 14 || ph.range[0] >= ph.range[1]) {
        errors.push('Invalid pH range (must be between 0-14 and min < max)');
      }

      // Validate temperature
      ['veg', 'flower'].forEach(stage => {
        const temps = temperature[stage as keyof typeof temperature];
        if (temps.length !== 2 || temps[0] < 0 || temps[0] >= temps[1] || temps[1] > 40) {
          errors.push(`Invalid temperature range for ${stage} stage`);
        }
      });

      // Validate humidity
      ['veg', 'flower'].forEach(stage => {
        const humidities = humidity[stage as keyof typeof humidity];
        if (humidities.length !== 2 || humidities[0] < 0 || humidities[0] >= humidities[1] || humidities[1] > 100) {
          errors.push(`Invalid humidity range for ${stage} stage`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Export strains data
   */
  async exportStrains(format: 'json' | 'csv' = 'json'): Promise<Blob> {
    try {
      const response = await this.getAllStrains();

      if (format === 'json') {
        return new Blob([JSON.stringify(response.strains, null, 2)], {
          type: 'application/json'
        });
      } else {
        // CSV export
        const csv = this.convertStrainsToCSV(response.strains);
        return new Blob([csv], {
          type: 'text/csv'
        });
      }
    } catch (error) {
      console.error('Failed to export strains:', error);
      throw error;
    }
  }

  /**
   * Import strains from data
   */
  async importStrains(file: File): Promise<{ success: number; errors: string[] }> {
    try {
      const text = await file.text();
      let strains: any[];

      if (file.name.endsWith('.json')) {
        strains = JSON.parse(text);
      } else if (file.name.endsWith('.csv')) {
        strains = this.parseCSVToStrains(text);
      } else {
        throw new Error('Unsupported file format. Please use JSON or CSV.');
      }

      let successCount = 0;
      const errors: string[] = [];

      for (const strainData of strains) {
        try {
          const validation = this.validateStrainData(strainData);
          if (!validation.isValid) {
            errors.push(`Skipped "${strainData.name || 'Unknown'}": ${validation.errors.join(', ')}`);
            continue;
          }

          await this.createStrain(strainData);
          successCount++;
        } catch (error) {
          errors.push(`Failed to import "${strainData.name || 'Unknown'}": ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      return { success: successCount, errors };
    } catch (error) {
      console.error('Failed to import strains:', error);
      throw error;
    }
  }

  // =============================================================================
  // Private Helper Methods
  // =============================================================================

  private convertStrainsToCSV(strains: Strain[]): string {
    const headers = [
      'Name', 'Type', 'Lineage', 'Description', 'Is Purple Strain',
      'PH Min', 'PH Max', 'Medium',
      'Veg Temp Min', 'Veg Temp Max', 'Veg Humidity Min', 'Veg Humidity Max', 'Veg Light',
      'Flower Temp Min', 'Flower Temp Max', 'Flower Humidity Min', 'Flower Humidity Max', 'Flower Light',
      'Common Deficiencies', 'Special Notes', 'Created At'
    ];

    const rows = strains.map(strain => [
      strain.name,
      strain.type,
      strain.lineage,
      strain.description,
      strain.isPurpleStrain,
      ...strain.optimalConditions.ph.range,
      strain.optimalConditions.ph.medium,
      ...strain.optimalConditions.temperature.veg,
      ...strain.optimalConditions.humidity.veg,
      strain.optimalConditions.light.veg,
      ...strain.optimalConditions.temperature.flower,
      ...strain.optimalConditions.humidity.flower,
      strain.optimalConditions.light.flower,
      strain.commonDeficiencies.join('; '),
      strain.specialNotes,
      strain.createdAt || ''
    ]);

    return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  }

  private parseCSVToStrains(csvText: string): Partial<Strain>[] {
    const lines = csvText.split('\n');
    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());

    return lines.slice(1).filter(line => line.trim()).map(line => {
      const values = line.split(',').map(v => v.replace(/"/g, '').trim());

      const strain: Partial<Strain> = {
        name: values[0],
        type: values[1],
        lineage: values[2],
        description: values[3],
        isPurpleStrain: values[4] === 'true',
        optimalConditions: {
          ph: {
            range: [parseFloat(values[5]), parseFloat(values[6])],
            medium: values[7] as any
          },
          temperature: {
            veg: [parseFloat(values[8]), parseFloat(values[9])],
            flower: [parseFloat(values[12]), parseFloat(values[13])]
          },
          humidity: {
            veg: [parseFloat(values[10]), parseFloat(values[11])],
            flower: [parseFloat(values[14]), parseFloat(values[15])]
          },
          light: {
            veg: values[16],
            flower: values[17]
          }
        },
        commonDeficiencies: values[18] ? values[18].split('; ').filter(Boolean) : [],
        specialNotes: values[19],
        createdAt: values[20]
      };

      return strain;
    });
  }
}

// Export singleton instance
export const strainsService = new StrainsService();

// Export service class for testing
export { StrainsService };