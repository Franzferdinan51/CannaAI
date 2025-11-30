import { PlantStrain, Plant, GrowthStage, HealthStatus } from './types';

// Default strain database with comprehensive information
export const defaultStrains: PlantStrain[] = [
  {
    id: 'strain_001',
    name: 'Blue Dream',
    type: 'hybrid',
    lineage: 'Blueberry x Haze',
    description: 'Popular hybrid known for balanced effects and resilience. Great for beginners and experienced growers alike.',
    isPurpleStrain: false,
    optimalConditions: {
      ph: { range: [6.0, 6.5], medium: 'soil' },
      temperature: { veg: [22, 26], flower: [20, 24] },
      humidity: { veg: [60, 70], flower: [40, 50] },
      light: { veg: '18/6', flower: '12/12' },
      ec: { range: [1.2, 1.6] },
      vpd: { range: [0.8, 1.2] }
    },
    commonDeficiencies: ['Magnesium', 'Calcium', 'Nitrogen'],
    characteristics: {
      growthPattern: 'Balanced hybrid growth with moderate stretching',
      plantSize: 'medium',
      floweringTime: 63,
      yield: 'high',
      resistance: {
        mold: 'medium',
        pests: 'medium',
        disease: 'medium'
      },
      climate: ['temperate', 'mediterranean']
    },
    images: [],
    growingDifficulty: 'beginner',
    floweringTime: 63,
    thcLevel: 18,
    cbdLevel: 0.5,
    effects: ['Relaxed', 'Happy', 'Euphoric', 'Creative'],
    medicalUses: ['Stress', 'Depression', 'Pain', 'Fatigue'],
    flavors: ['Berry', 'Blueberry', 'Sweet'],
    aroma: ['Blueberry', 'Sweet', 'Earthy'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'strain_002',
    name: 'Granddaddy Purple',
    type: 'indica',
    lineage: 'Purple Urkle x Big Bud',
    description: 'Classic indica strain known for its deep purple coloration and relaxing effects. Perfect for evening use.',
    isPurpleStrain: true,
    optimalConditions: {
      ph: { range: [6.2, 6.8], medium: 'soil' },
      temperature: { veg: [20, 24], flower: [18, 22] },
      humidity: { veg: [55, 65], flower: [40, 50] },
      light: { veg: '18/6', flower: '12/12' },
      ec: { range: [1.4, 1.8] },
      vpd: { range: [0.8, 1.0] }
    },
    commonDeficiencies: ['Magnesium', 'Calcium', 'Phosphorus'],
    characteristics: {
      growthPattern: 'Compact bushy growth with short internodes',
      plantSize: 'medium',
      floweringTime: 60,
      yield: 'high',
      resistance: {
        mold: 'high',
        pests: 'medium',
        disease: 'medium'
      },
      climate: ['temperate', 'continental']
    },
    images: [],
    growingDifficulty: 'intermediate',
    floweringTime: 60,
    thcLevel: 23,
    cbdLevel: 0.3,
    effects: ['Relaxed', 'Sleepy', 'Happy', 'Euphoric'],
    medicalUses: ['Insomnia', 'Pain', 'Stress', 'Muscle Spasms'],
    flavors: ['Grape', 'Berry', 'Sweet'],
    aroma: ['Grape', 'Berry', 'Earthy'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'strain_003',
    name: 'Green Crack',
    type: 'sativa',
    lineage: 'Skunk #1 x Unknown Indica',
    description: 'Energizing sativa strain perfect for daytime use. Known for its sharp flavor and focus-enhancing effects.',
    isPurpleStrain: false,
    optimalConditions: {
      ph: { range: [6.0, 6.5], medium: 'hydroponic' },
      temperature: { veg: [24, 28], flower: [22, 26] },
      humidity: { veg: [50, 60], flower: [35, 45] },
      light: { veg: '20/4', flower: '12/12' },
      ec: { range: [1.6, 2.0] },
      vpd: { range: [1.0, 1.4] }
    },
    commonDeficiencies: ['Nitrogen', 'Calcium', 'Iron'],
    characteristics: {
      growthPattern: 'Tall, stretchy growth with long branches',
      plantSize: 'large',
      floweringTime: 56,
      yield: 'medium',
      resistance: {
        mold: 'low',
        pests: 'medium',
        disease: 'medium'
      },
      climate: ['tropical', 'mediterranean']
    },
    images: [],
    growingDifficulty: 'intermediate',
    floweringTime: 56,
    thcLevel: 20,
    cbdLevel: 0.2,
    effects: ['Energetic', 'Focused', 'Happy', 'Creative'],
    medicalUses: ['Fatigue', 'Depression', 'ADHD', 'Stress'],
    flavors: ['Citrus', 'Tropical', 'Sweet'],
    aroma: ['Citrus', 'Mango', 'Earthy'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'strain_004',
    name: 'Girl Scout Cookies',
    type: 'hybrid',
    lineage: 'OG Kush x Durban Poison',
    description: 'Award-winning hybrid with exceptional flavor and potent effects. Popular among both recreational and medical users.',
    isPurpleStrain: false,
    optimalConditions: {
      ph: { range: [6.2, 6.8], medium: 'soil' },
      temperature: { veg: [22, 26], flower: [20, 24] },
      humidity: { veg: [50, 60], flower: [40, 50] },
      light: { veg: '18/6', flower: '12/12' },
      ec: { range: [1.4, 1.8] },
      vpd: { range: [0.8, 1.2] }
    },
    commonDeficiencies: ['Calcium', 'Magnesium', 'Potassium'],
    characteristics: {
      growthPattern: 'Balanced growth with dense bud formation',
      plantSize: 'medium',
      floweringTime: 63,
      yield: 'high',
      resistance: {
        mold: 'medium',
        pests: 'medium',
        disease: 'high'
      },
      climate: ['temperate', 'mediterranean', 'maritime']
    },
    images: [],
    growingDifficulty: 'intermediate',
    floweringTime: 63,
    thcLevel: 25,
    cbdLevel: 0.4,
    effects: ['Happy', 'Relaxed', 'Euphoric', 'Creative'],
    medicalUses: ['Stress', 'Pain', 'Depression', 'Appetite Loss'],
    flavors: ['Sweet', 'Earthy', 'Spicy'],
    aroma: ['Sweet', 'Earthy', 'Peppery'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'strain_005',
    name: 'Northern Lights',
    type: 'indica',
    lineage: 'Afghan x Thai',
    description: 'Classic indica strain known for its resilience, fast flowering, and relaxing effects. Perfect for beginners.',
    isPurpleStrain: false,
    optimalConditions: {
      ph: { range: [6.0, 6.5], medium: 'soil' },
      temperature: { veg: [18, 24], flower: [16, 22] },
      humidity: { veg: [50, 60], flower: [40, 50] },
      light: { veg: '18/6', flower: '12/12' },
      ec: { range: [1.2, 1.6] },
      vpd: { range: [0.7, 1.0] }
    },
    commonDeficiencies: ['Nitrogen', 'Phosphorus', 'Potassium'],
    characteristics: {
      growthPattern: 'Compact, bushy growth with minimal stretching',
      plantSize: 'small',
      floweringTime: 47,
      yield: 'medium',
      resistance: {
        mold: 'very-high',
        pests: 'high',
        disease: 'very-high'
      },
      climate: ['temperate', 'continental', 'arctic']
    },
    images: [],
    growingDifficulty: 'beginner',
    floweringTime: 47,
    thcLevel: 16,
    cbdLevel: 0.6,
    effects: ['Relaxed', 'Sleepy', 'Happy', 'Euphoric'],
    medicalUses: ['Insomnia', 'Pain', 'Stress', 'Anxiety'],
    flavors: ['Sweet', 'Spicy', 'Herbal'],
    aroma: ['Earthy', 'Sweet', 'Spicy'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// Mock plant data for testing
export const mockPlants: Plant[] = [
  {
    id: 'plant_001',
    name: 'Blue Dream #1',
    strainId: 'strain_001',
    strain: defaultStrains[0],
    stage: 'flowering',
    health: {
      score: 85,
      status: 'good',
      lastAnalysis: new Date().toISOString(),
      issues: [],
      recommendations: ['Monitor humidity levels', 'Check for signs of nutrient burn'],
      warnings: [],
      nextCheckDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      history: []
    },
    age: 45,
    plantedDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    location: {
      id: 'room_1',
      name: 'Grow Room 1',
      type: 'room',
      environment: {
        idealTemperature: { min: 20, max: 24 },
        idealHumidity: { min: 40, max: 50 },
        idealPH: { min: 6.0, max: 6.5 },
        idealEC: { min: 1.2, max: 1.6 },
        lightSchedule: {
          vegetativeHours: 18,
          floweringHours: 12,
          currentSchedule: 12,
          lastChanged: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
        },
        medium: 'soil'
      }
    },
    images: [],
    notes: 'Responding well to nutrients. Starting to show bud formation.',
    tags: ['premium', 'main-ligh'],
    isActive: true,
    metadata: {
      source: 'clone',
      isMotherPlant: false,
      expectedYield: 500,
      quality: 'A',
      medium: 'soil'
    },
    createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'plant_002',
    name: 'GDP Clone A',
    strainId: 'strain_002',
    strain: defaultStrains[1],
    stage: 'vegetative',
    health: {
      score: 92,
      status: 'excellent',
      lastAnalysis: new Date().toISOString(),
      issues: [],
      recommendations: ['Continue current feeding schedule'],
      warnings: [],
      nextCheckDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      history: []
    },
    age: 21,
    plantedDate: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
    location: {
      id: 'room_1',
      name: 'Grow Room 1',
      type: 'room',
      environment: {
        idealTemperature: { min: 20, max: 24 },
        idealHumidity: { min: 40, max: 50 },
        idealPH: { min: 6.2, max: 6.8 },
        idealEC: { min: 1.4, max: 1.8 },
        lightSchedule: {
          vegetativeHours: 18,
          floweringHours: 12,
          currentSchedule: 18
        },
        medium: 'soil'
      }
    },
    images: [],
    notes: 'Vigorous growth, ready to flip to flower next week.',
    tags: ['clone', 'vegetative'],
    isActive: true,
    metadata: {
      source: 'clone',
      isMotherPlant: false,
      expectedYield: 600,
      quality: 'A+',
      medium: 'soil'
    },
    createdAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'plant_003',
    name: 'Green Crack #3',
    strainId: 'strain_003',
    strain: defaultStrains[2],
    stage: 'flowering',
    health: {
      score: 65,
      status: 'fair',
      lastAnalysis: new Date().toISOString(),
      issues: [
        {
          id: 'issue_001',
          type: 'nutrient',
          severity: 'medium',
          description: 'Early signs of nitrogen deficiency',
          symptoms: ['Yellowing lower leaves', 'Slower growth'],
          possibleCauses: ['Low nitrogen levels', 'pH imbalance'],
          recommendations: ['Increase nitrogen feeding', 'Check pH levels', 'Monitor new growth'],
          detectedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          images: []
        }
      ],
      recommendations: ['Increase nitrogen in next feeding', 'Check runoff pH'],
      warnings: [
        {
          id: 'warning_001',
          type: 'health',
          message: 'Plant showing signs of nutrient deficiency',
          level: 'warning',
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
        }
      ],
      nextCheckDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
      history: []
    },
    age: 35,
    plantedDate: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
    location: {
      id: 'room_2',
      name: 'Grow Room 2',
      type: 'room',
      environment: {
        idealTemperature: { min: 22, max: 26 },
        idealHumidity: { min: 35, max: 45 },
        idealPH: { min: 6.0, max: 6.5 },
        idealEC: { min: 1.6, max: 2.0 },
        lightSchedule: {
          vegetativeHours: 20,
          floweringHours: 12,
          currentSchedule: 12,
          lastChanged: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
        },
        medium: 'hydroponic'
      }
    },
    images: [],
    notes: 'Showing slight yellowing on lower leaves. Needs attention.',
    tags: ['attention-needed', 'hydro'],
    isActive: true,
    metadata: {
      source: 'seed',
      isMotherPlant: false,
      expectedYield: 400,
      quality: 'B+',
      medium: 'hydroponic'
    },
    createdAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// Mock environmental data
export const mockEnvironmentalData = {
  temperature: 24.5,
  humidity: 52,
  soilMoisture: 65,
  lightIntensity: 850,
  ph: 6.2,
  ec: 1.4,
  co2: 1200,
  vpd: 1.1,
  timestamp: new Date().toISOString()
};

// Utility functions for plant management
export const calculatePlantAge = (plantedDate: string): number => {
  const planted = new Date(plantedDate);
  const now = new Date();
  return Math.ceil((now.getTime() - planted.getTime()) / (1000 * 60 * 60 * 24));
};

export const getGrowthStageDuration = (stage: GrowthStage): number => {
  const durations: Record<GrowthStage, number> = {
    germination: 7,
    seedling: 14,
    vegetative: 30,
    'pre-flowering': 7,
    flowering: 56,
    ripening: 14,
    harvesting: 3,
    cured: 21,
    archived: 0
  };
  return durations[stage];
};

export const getHealthScoreColor = (score: number): string => {
  if (score >= 80) return 'text-emerald-400';
  if (score >= 60) return 'text-yellow-400';
  if (score >= 40) return 'text-orange-400';
  return 'text-red-400';
};

export const getHealthStatusColor = (status: HealthStatus): string => {
  const colors = {
    excellent: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    good: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    fair: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
    poor: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
    critical: 'text-red-400 bg-red-500/10 border-red-500/30'
  };
  return colors[status];
};

export const generatePlantId = (): string => {
  return `plant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const generateStrainId = (): string => {
  return `strain_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};