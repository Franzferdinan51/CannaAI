/**
 * Integration Tests for Database Operations
 */

import { testPrisma, setupTestDb, teardownTestDb, createTestPlant, createTestStrain } from '@/tests/utils/test-utils';

describe('Database Operations', () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    // Clean up database before each test
    await testPrisma.plantAnalysis.deleteMany();
    await testPrisma.plant.deleteMany();
    await testPrisma.strain.deleteMany();
    jest.clearAllMocks();
  });

  describe('Plant Model', () => {
    test('should create a plant', async () => {
      const strain = await testPrisma.strain.create({
        data: createTestStrain({ name: 'Test Indica' })
      });

      const plant = await testPrisma.plant.create({
        data: createTestPlant({
          name: 'Plant Alpha',
          strainId: strain.id
        })
      });

      expect(plant.id).toBeDefined();
      expect(plant.name).toBe('Plant Alpha');
      expect(plant.strainId).toBe(strain.id);
      expect(plant.stage).toBe('flowering');
      expect(plant.isActive).toBe(true);
    });

    test('should retrieve a plant by ID', async () => {
      const strain = await testPrisma.strain.create({
        data: createTestStrain({ name: 'Test Sativa' })
      });

      const createdPlant = await testPrisma.plant.create({
        data: createTestPlant({
          name: 'Plant Beta',
          strainId: strain.id
        })
      });

      const retrievedPlant = await testPrisma.plant.findUnique({
        where: { id: createdPlant.id },
        include: { strain: true }
      });

      expect(retrievedPlant).toBeDefined();
      expect(retrievedPlant?.name).toBe('Plant Beta');
      expect(retrievedPlant?.strain?.name).toBe('Test Sativa');
    });

    test('should update a plant', async () => {
      const strain = await testPrisma.strain.create({
        data: createTestStrain({ name: 'Test Hybrid' })
      });

      const plant = await testPrisma.plant.create({
        data: createTestPlant({
          name: 'Plant Gamma',
          strainId: strain.id
        })
      });

      const updatedPlant = await testPrisma.plant.update({
        where: { id: plant.id },
        data: {
          stage: 'harvest',
          notes: 'Ready for harvest',
          health: {
            score: 95,
            status: 'excellent'
          }
        }
      });

      expect(updatedPlant.stage).toBe('harvest');
      expect(updatedPlant.notes).toBe('Ready for harvest');
      expect(updatedPlant.health?.score).toBe(95);
    });

    test('should delete a plant', async () => {
      const plant = await testPrisma.plant.create({
        data: createTestPlant({ name: 'Plant To Delete' })
      });

      await testPrisma.plant.delete({
        where: { id: plant.id }
      });

      const deletedPlant = await testPrisma.plant.findUnique({
        where: { id: plant.id }
      });

      expect(deletedPlant).toBeNull();
    });

    test('should query plants by status', async () => {
      await testPrisma.plant.create({
        data: createTestPlant({ name: 'Active Plant 1', isActive: true })
      });

      await testPrisma.plant.create({
        data: createTestPlant({ name: 'Active Plant 2', isActive: true })
      });

      await testPrisma.plant.create({
        data: createTestPlant({ name: 'Inactive Plant', isActive: false })
      });

      const activePlants = await testPrisma.plant.findMany({
        where: { isActive: true }
      });

      expect(activePlants).toHaveLength(2);
      expect(activePlants.every(p => p.isActive)).toBe(true);
    });

    test('should query plants by strain', async () => {
      const strain = await testPrisma.strain.create({
        data: createTestStrain({ name: 'Purple Kush' })
      });

      await testPrisma.plant.create({
        data: createTestPlant({ name: 'Plant 1', strainId: strain.id })
      });

      await testPrisma.plant.create({
        data: createTestPlant({ name: 'Plant 2', strainId: strain.id })
      });

      const plantsByStrain = await testPrisma.plant.findMany({
        where: { strainId: strain.id },
        include: { strain: true }
      });

      expect(plantsByStrain).toHaveLength(2);
      expect(plantsByStrain.every(p => p.strain?.name === 'Purple Kush')).toBe(true);
    });

    test('should query plants by growth stage', async () => {
      await testPrisma.plant.create({
        data: createTestPlant({ name: 'Veg Plant', stage: 'vegetative' })
      });

      await testPrisma.plant.create({
        data: createTestPlant({ name: 'Flower Plant', stage: 'flowering' })
      });

      const vegetativePlants = await testPrisma.plant.findMany({
        where: { stage: 'vegetative' }
      });

      expect(vegetativePlants).toHaveLength(1);
      expect(vegetativePlants[0].name).toBe('Veg Plant');
    });
  });

  describe('Strain Model', () => {
    test('should create a strain', async () => {
      const strain = await testPrisma.strain.create({
        data: createTestStrain({
          name: 'Granddaddy Purple',
          type: 'indica',
          isPurpleStrain: true,
          floweringTime: 60
        })
      });

      expect(strain.id).toBeDefined();
      expect(strain.name).toBe('Granddaddy Purple');
      expect(strain.type).toBe('indica');
      expect(strain.isPurpleStrain).toBe(true);
    });

    test('should retrieve all strains', async () => {
      await testPrisma.strain.create({
        data: createTestStrain({ name: 'Blue Dream', type: 'hybrid' })
      });

      await testPrisma.strain.create({
        data: createTestStrain({ name: 'Sour Diesel', type: 'sativa' })
      });

      const strains = await testPrisma.strain.findMany();

      expect(strains).toHaveLength(2);
    });

    test('should update strain properties', async () => {
      const strain = await testPrisma.strain.create({
        data: createTestStrain({ name: 'OG Kush', growingDifficulty: 'moderate' })
      });

      const updatedStrain = await testPrisma.strain.update({
        where: { id: strain.id },
        data: {
          thcLevel: 20.5,
          cbdLevel: 0.5,
          description: 'Classic indica-dominant hybrid'
        }
      });

      expect(updatedStrain.thcLevel).toBe(20.5);
      expect(updatedStrain.cbdLevel).toBe(0.5);
    });

    test('should store JSON data for strain characteristics', async () => {
      const characteristics = {
        appearance: 'Dense purple buds',
        aroma: 'Grape and berry',
        effects: ['Relaxed', 'Euphoric', 'Happy']
      };

      const strain = await testPrisma.strain.create({
        data: createTestStrain({
          name: 'Purple Punch',
          characteristics
        })
      });

      const retrievedStrain = await testPrisma.strain.findUnique({
        where: { id: strain.id }
      });

      expect(retrievedStrain?.characteristics).toEqual(characteristics);
    });
  });

  describe('PlantAnalysis Model', () => {
    test('should create a plant analysis record', async () => {
      const plant = await testPrisma.plant.create({
        data: createTestPlant({ name: 'Analysis Test Plant' })
      });

      const analysisData = {
        strain: 'Test Strain',
        leafSymptoms: 'Yellowing leaves',
        phLevel: 5.8,
        temperature: 75,
        humidity: 55
      };

      const result = {
        diagnosis: 'Nitrogen deficiency',
        confidence: 92,
        severity: 'moderate'
      };

      const analysis = await testPrisma.plantAnalysis.create({
        data: {
          plantId: plant.id,
          request: analysisData,
          result,
          provider: 'openrouter',
          imageInfo: {
            originalSize: 1024000,
            compressedSize: 512000,
            format: 'jpeg'
          }
        }
      });

      expect(analysis.id).toBeDefined();
      expect(analysis.plantId).toBe(plant.id);
      expect(analysis.provider).toBe('openrouter');
      expect(analysis.result.diagnosis).toBe('Nitrogen deficiency');
    });

    test('should retrieve analyses by plant ID', async () => {
      const plant = await testPrisma.plant.create({
        data: createTestPlant({ name: 'Multi Analysis Plant' })
      });

      // Create multiple analyses
      for (let i = 1; i <= 3; i++) {
        await testPrisma.plantAnalysis.create({
          data: {
            plantId: plant.id,
            request: { strain: 'Test Strain' },
            result: { diagnosis: `Diagnosis ${i}` },
            provider: 'openrouter'
          }
        });
      }

      const analyses = await testPrisma.plantAnalysis.findMany({
        where: { plantId: plant.id },
        orderBy: { createdAt: 'desc' }
      });

      expect(analyses).toHaveLength(3);
      expect(analyses[0].result.diagnosis).toBe('Diagnosis 1');
    });

    test('should query analyses by provider', async () => {
      const plant = await testPrisma.plant.create({
        data: createTestPlant({ name: 'Provider Test Plant' })
      });

      await testPrisma.plantAnalysis.create({
        data: {
          plantId: plant.id,
          request: { strain: 'Test Strain' },
          result: { diagnosis: 'Test 1' },
          provider: 'openrouter'
        }
      });

      await testPrisma.plantAnalysis.create({
        data: {
          plantId: plant.id,
          request: { strain: 'Test Strain' },
          result: { diagnosis: 'Test 2' },
          provider: 'lm-studio'
        }
      });

      const openRouterAnalyses = await testPrisma.plantAnalysis.findMany({
        where: { provider: 'openrouter' }
      });

      expect(openRouterAnalyses).toHaveLength(1);
      expect(openRouterAnalyses[0].provider).toBe('openrouter');
    });

    test('should store and retrieve image metadata', async () => {
      const plant = await testPrisma.plant.create({
        data: createTestPlant({ name: 'Image Test Plant' })
      });

      const imageInfo = {
        originalSize: 5242880,
        compressedSize: 1048576,
        dimensions: '2048x1536',
        format: 'jpeg',
        qualityLevel: 90,
        compressionEfficiency: '80.0',
        megapixels: '3.1'
      };

      const analysis = await testPrisma.plantAnalysis.create({
        data: {
          plantId: plant.id,
          request: { strain: 'Test Strain' },
          result: { diagnosis: 'Test diagnosis' },
          imageInfo
        }
      });

      const retrievedAnalysis = await testPrisma.plantAnalysis.findUnique({
        where: { id: analysis.id }
      });

      expect(retrievedAnalysis?.imageInfo).toEqual(imageInfo);
    });

    test('should delete analysis records', async () => {
      const plant = await testPrisma.plant.create({
        data: createTestPlant({ name: 'Delete Test Plant' })
      });

      const analysis = await testPrisma.plantAnalysis.create({
        data: {
          plantId: plant.id,
          request: { strain: 'Test Strain' },
          result: { diagnosis: 'Test diagnosis' }
        }
      });

      await testPrisma.plantAnalysis.delete({
        where: { id: analysis.id }
      });

      const deletedAnalysis = await testPrisma.plantAnalysis.findUnique({
        where: { id: analysis.id }
      });

      expect(deletedAnalysis).toBeNull();
    });
  });

  describe('Complex Queries', () => {
    test('should perform transaction operations', async () => {
      const result = await testPrisma.$transaction(async (tx) => {
        const strain = await tx.strain.create({
          data: createTestStrain({ name: 'Transaction Strain' })
        });

        const plant = await tx.plant.create({
          data: createTestPlant({
            name: 'Transaction Plant',
            strainId: strain.id
          })
        });

        const analysis = await tx.plantAnalysis.create({
          data: {
            plantId: plant.id,
            request: { strain: 'Transaction Strain' },
            result: { diagnosis: 'Transaction test' },
            provider: 'openrouter'
          }
        });

        return { strain, plant, analysis };
      });

      expect(result.strain.id).toBeDefined();
      expect(result.plant.id).toBeDefined();
      expect(result.analysis.id).toBeDefined();
    });

    test('should handle bulk inserts', async () => {
      const strains = Array.from({ length: 5 }, (_, i) =>
        createTestStrain({ name: `Bulk Strain ${i + 1}` })
      );

      const createdStrains = await testPrisma.$transaction(
        strains.map(data => testPrisma.strain.create({ data }))
      );

      expect(createdStrains).toHaveLength(5);
      expect(createdStrains[0].name).toBe('Bulk Strain 1');
      expect(createdStrains[4].name).toBe('Bulk Strain 5');
    });

    test('should query with multiple filters', async () => {
      const strain = await testPrisma.strain.create({
        data: createTestStrain({ name: 'Filtered Strain', type: 'indica' })
      });

      await testPrisma.plant.create({
        data: createTestPlant({
          name: 'Filtered Plant 1',
          strainId: strain.id,
          stage: 'flowering',
          isActive: true
        })
      });

      await testPrisma.plant.create({
        data: createTestPlant({
          name: 'Filtered Plant 2',
          strainId: strain.id,
          stage: 'flowering',
          isActive: true
        })
      });

      await testPrisma.plant.create({
        data: createTestPlant({
          name: 'Inactive Plant',
          strainId: strain.id,
          stage: 'flowering',
          isActive: false
        })
      });

      const filteredPlants = await testPrisma.plant.findMany({
        where: {
          strainId: strain.id,
          stage: 'flowering',
          isActive: true
        },
        include: { strain: true }
      });

      expect(filteredPlants).toHaveLength(2);
      expect(filteredPlants.every(p => p.isActive)).toBe(true);
      expect(filteredPlants.every(p => p.stage === 'flowering')).toBe(true);
    });

    test('should use indexes for performance', async () => {
      const startTime = Date.now();

      await testPrisma.plant.create({
        data: createTestPlant({
          name: 'Index Test Plant',
          stage: 'flowering'
        })
      });

      // Query using indexed field
      const plants = await testPrisma.plant.findMany({
        where: { stage: 'flowering' }
      });

      const endTime = Date.now();
      const queryTime = endTime - startTime;

      expect(plants).toHaveLength(1);
      expect(queryTime).toBeLessThan(1000); // Should complete within 1 second
    });

    test('should handle concurrent operations', async () => {
      const operations = Array.from({ length: 10 }, (_, i) =>
        testPrisma.strain.create({
          data: createTestStrain({ name: `Concurrent Strain ${i + 1}` })
        })
      );

      const results = await Promise.all(operations);

      expect(results).toHaveLength(10);
      const allStrains = await testPrisma.strain.findMany();
      expect(allStrains).toHaveLength(10);
    });
  });
});
