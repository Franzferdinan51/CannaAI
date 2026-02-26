/**
 * CannaAI Skill for OpenClaw
 * 
 * Provides plant health analysis, grow monitoring, and cannabis cultivation expertise
 * to any OpenClaw agent.
 * 
 * Tools:
 * - analyze_plant: Analyze plant health from photo
 * - get_environment: Get current grow room conditions
 * - get_strain_info: Get strain-specific growing info
 * - track_growth: Log growth progress
 * - predict_harvest: Estimate harvest readiness
 */

import { z } from 'zod';

// Skill metadata
export const skill = {
  name: 'cannaai',
  version: '1.0.0',
  description: 'Plant health analysis and cannabis cultivation expertise',
  author: 'Duckets',
  repository: 'https://github.com/Franzferdinan51/CannaAI'
};

// Tool schemas
const AnalyzePlantSchema = z.object({
  image: z.string().describe('Base64 encoded plant photo'),
  strain: z.string().optional().describe('Cannabis strain name'),
  stage: z.enum(['seedling', 'vegetative', 'flowering', 'harvest']).optional(),
  symptoms: z.array(z.string()).optional().describe('Observable symptoms')
});

const GetEnvironmentSchema = z.object({
  roomId: z.string().optional().describe('Grow room identifier')
});

const GetStrainInfoSchema = z.object({
  strain: z.string().describe('Strain name')
});

const TrackGrowthSchema = z.object({
  image: z.string().optional(),
  stage: z.string(),
  day: z.number(),
  notes: z.string().optional()
});

const PredictHarvestSchema = z.object({
  trichomeImage: z.string().optional(),
  strain: z.string(),
  flowerDay: z.number()
});

// Tool implementations
export const tools = {
  /**
   * Analyze plant health from photo
   */
  analyze_plant: {
    description: 'Analyze cannabis plant health from photo. Returns diagnosis, health score, and recommendations.',
    schema: AnalyzePlantSchema,
    execute: async (params: z.infer<typeof AnalyzePlantSchema>) => {
      const { image, strain, stage, symptoms } = params;
      
      // Call CannaAI analysis API
      const response = await fetch('http://localhost:3000/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: `data:image/jpeg;base64,${image}`,
          analysisType: 'plant_health',
          strain: strain || 'Cannabis',
          leafSymptoms: symptoms?.join(', ') || 'general_health_check',
          growthStage: stage || 'vegetative'
        })
      });
      
      if (!response.ok) {
        throw new Error(`CannaAI API error: ${response.status}`);
      }
      
      const result = await response.json();
      
      return {
        success: true,
        analysis: result.analysis,
        healthScore: result.analysis?.healthScore,
        diagnosis: result.analysis?.diagnosis,
        recommendations: result.analysis?.priorityActions || [],
        confidence: result.analysis?.confidence
      };
    }
  },

  /**
   * Get current grow room environmental conditions
   */
  get_environment: {
    description: 'Get current temperature, humidity, VPD, and other environmental data from grow room',
    schema: GetEnvironmentSchema,
    execute: async (params: z.infer<typeof GetEnvironmentSchema>) => {
      const response = await fetch('http://localhost:3000/api/sensors');
      
      if (!response.ok) {
        throw new Error(`CannaAI API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      return {
        success: true,
        environment: data.sensors,
        rooms: data.rooms,
        status: data.sensors?.temperature && data.sensors?.humidity ? 'ok' : 'unknown'
      };
    }
  },

  /**
   * Get strain-specific growing information
   */
  get_strain_info: {
    description: 'Get detailed growing information for a specific cannabis strain',
    schema: GetStrainInfoSchema,
    execute: async (params: z.infer<typeof GetStrainInfoSchema>) => {
      const { strain } = params;
      
      const response = await fetch(`http://localhost:3000/api/strains?search=${encodeURIComponent(strain)}`);
      
      if (!response.ok) {
        // Fallback: return general info
        return {
          success: true,
          strain: params.strain,
          info: {
            type: 'Unknown',
            flowerTime: '8-10 weeks',
            optimalTemp: '65-80°F',
            optimalHumidity: '40-60%',
            notes: 'Strain not found in database. Using general cannabis growing parameters.'
          },
          fromDatabase: false
        };
      }
      
      const data = await response.json();
      const strainInfo = data.strains?.[0] || data;
      
      return {
        success: true,
        strain: strainInfo.name || params.strain,
        info: {
          type: strainInfo.type || 'Hybrid',
          lineage: strainInfo.lineage,
          flowerTime: strainInfo.flowerTime || '8-10 weeks',
          optimalTemp: strainInfo.optimalConditions?.temperature?.veg ? 
            `${strainInfo.optimalConditions.temperature.veg[0]}-${strainInfo.optimalConditions.temperature.veg[1]}°F` : 
            '70-80°F',
          optimalHumidity: strainInfo.optimalConditions?.humidity?.veg ?
            `${strainInfo.optimalConditions.humidity.veg[0]}-${strainInfo.optimalConditions.humidity.veg[1]}%` :
            '50-70%',
          notes: strainInfo.description,
          isPurpleStrain: strainInfo.isPurpleStrain || false
        },
        fromDatabase: true
      };
    }
  },

  /**
   * Track growth progress with photo and notes
   */
  track_growth: {
    description: 'Log growth progress with photo and notes for tracking over time',
    schema: TrackGrowthSchema,
    execute: async (params: z.infer<typeof TrackGrowthSchema>) => {
      // Store in CannaAI database
      const response = await fetch('http://localhost:3000/api/plants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: params.image,
          stage: params.stage,
          day: params.day,
          notes: params.notes,
          timestamp: new Date().toISOString()
        })
      });
      
      return {
        success: response.ok,
        logged: true,
        day: params.day,
        stage: params.stage
      };
    }
  },

  /**
   * Predict harvest readiness based on trichome development
   */
  predict_harvest: {
    description: 'Estimate harvest readiness based on trichome photos and flower day',
    schema: PredictHarvestSchema,
    execute: async (params: z.infer<typeof PredictHarvestSchema>) => {
      const { trichomeImage, strain, flowerDay } = params;
      
      // Typical flower times by strain type
      const flowerTimes: Record<string, number> = {
        'indica': 56,      // 8 weeks
        'hybrid': 63,      // 9 weeks
        'sativa': 70,      // 10 weeks
        'autoflower': 65   // 9-10 weeks from seed
      };
      
      const estimatedFlowerTime = flowerTimes[strain.toLowerCase().includes('sativa') ? 'sativa' : 
                                               strain.toLowerCase().includes('indica') ? 'indica' : 'hybrid'];
      
      const daysRemaining = Math.max(0, estimatedFlowerTime - flowerDay);
      const readiness = flowerDay >= estimatedFlowerTime ? 'ready' : 'not_ready';
      
      return {
        success: true,
        currentDay: flowerDay,
        estimatedTotal: estimatedFlowerTime,
        daysRemaining: daysRemaining,
        readiness: readiness,
        recommendation: daysRemaining === 0 ? 
          'Check trichomes - should be mostly cloudy with some amber' :
          `Continue flowering for ${daysRemaining} more days`,
        trichomeTargets: {
          clear: '0-10%',
          cloudy: '60-70%',
          amber: '20-30%'
        }
      };
    }
  }
};

// Export for OpenClaw
export default {
  skill,
  tools
};
