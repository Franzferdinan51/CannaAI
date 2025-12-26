/**
 * Integration Tests for /api/analyze Endpoint
 */

import { createMockRequest, createMockResponse } from './test-helpers';
import handler from '@/app/api/analyze/route';
import { setupTestDb, teardownTestDb, createValidImageDataUrl } from '@/tests/utils/test-utils';

// Mock fetch for AI provider calls
global.fetch = jest.fn();

describe('/api/analyze Integration Tests', () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OPENROUTER_API_KEY = 'test-api-key';
    process.env.NODE_ENV = 'test';
  });

  describe('GET /api/analyze', () => {
    test('should return service status in server mode', async () => {
      const request = createMockRequest('GET', '/api/analyze');
      const response = await handler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.buildMode).toBe('server');
      expect(data.supportedFeatures).toEqual({
        aiAnalysis: true,
        purpleDetection: true,
        imageProcessing: true,
        multiProviderSupport: true,
        realTimeProcessing: true,
        requiresAIProvider: true
      });
    });

    test('should return static mode response when BUILD_MODE=static', async () => {
      process.env.BUILD_MODE = 'static';

      const request = createMockRequest('GET', '/api/analyze');
      const response = await handler(request);
      const data = await response.json();

      expect(data.buildMode).toBe('static');
      expect(data.clientSide).toBe(true);
    });
  });

  describe('POST /api/analyze', () => {
    test('should analyze plant with minimal data', async () => {
      // Mock AI provider response
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  diagnosis: 'Healthy Plant',
                  confidence: 95,
                  severity: 'none'
                })
              }
            }
          ]
        })
      });

      const requestBody = {
        strain: 'Test Strain',
        leafSymptoms: 'Healthy green leaves'
      };

      const request = createMockRequest('POST', '/api/analyze', requestBody);
      const response = await handler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.analysis).toBeDefined();
      expect(data.analysis.diagnosis).toBe('Healthy Plant');
      expect(data.provider.used).toBeDefined();
      expect(data.rateLimit).toBeDefined();
    });

    test('should analyze plant with image', async () => {
      // Mock AI provider response
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  diagnosis: 'Nitrogen Deficiency',
                  confidence: 92,
                  severity: 'moderate',
                  imageAnalysis: {
                    hasImage: true,
                    visualFindings: ['Yellowing detected']
                  }
                })
              }
            }
          ]
        })
      });

      const imageData = createValidImageDataUrl('jpeg', 1024, 1024);

      const requestBody = {
        strain: 'Purple Haze',
        leafSymptoms: 'Yellowing lower leaves',
        phLevel: 6.0,
        temperature: 75,
        humidity: 50,
        plantImage: imageData
      };

      const request = createMockRequest('POST', '/api/analyze', requestBody);
      const response = await handler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.analysis).toBeDefined();
      expect(data.imageInfo).toBeDefined();
      expect(data.imageInfo.originalSize).toBeGreaterThan(0);
      expect(data.analysis.imageAnalysis.hasImage).toBe(true);
    });

    test('should handle HEIC image conversion', async () => {
      const heicData = createValidImageDataUrl('heic', 2048, 2048);

      // Mock AI provider response
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  diagnosis: 'Test',
                  confidence: 90
                })
              }
            }
          ]
        })
      });

      const requestBody = {
        strain: 'Test Strain',
        leafSymptoms: 'Test symptoms',
        plantImage: heicData
      };

      const request = createMockRequest('POST', '/api/analyze', requestBody);
      const response = await handler(request);

      expect(response.status).toBe(200);
    });

    test('should persist analysis to database', async () => {
      const { prisma } = require('@/lib/prisma');

      // Mock AI provider response
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  diagnosis: 'Test',
                  confidence: 90
                })
              }
            }
          ]
        })
      });

      const requestBody = {
        strain: 'Test Strain',
        leafSymptoms: 'Test symptoms',
        plantId: 'test-plant-id'
      };

      const request = createMockRequest('POST', '/api/analyze', requestBody);
      const response = await handler(request);
      const data = await response.json();

      expect(prisma.plantAnalysis.create).toHaveBeenCalled();
    });

    test('should reject request with missing strain', async () => {
      const requestBody = {
        leafSymptoms: 'Test symptoms'
      };

      const request = createMockRequest('POST', '/api/analyze', requestBody);
      const response = await handler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Strain is required');
    });

    test('should reject request with missing symptoms', async () => {
      const requestBody = {
        strain: 'Test Strain'
      };

      const request = createMockRequest('POST', '/api/analyze', requestBody);
      const response = await handler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Symptoms description is required');
    });

    test('should reject request with invalid pH format', async () => {
      const requestBody = {
        strain: 'Test Strain',
        leafSymptoms: 'Test symptoms',
        phLevel: 'not-a-number'
      };

      const request = createMockRequest('POST', '/api/analyze', requestBody);
      const response = await handler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    test('should reject request with invalid image format', async () => {
      const requestBody = {
        strain: 'Test Strain',
        leafSymptoms: 'Test symptoms',
        plantImage: 'invalid-image-data'
      };

      const request = createMockRequest('POST', '/api/analyze', requestBody);
      const response = await handler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    test('should enforce rate limiting', async () => {
      const requestBody = {
        strain: 'Test Strain',
        leafSymptoms: 'Test symptoms'
      };

      // Make multiple requests to trigger rate limiting
      const responses = [];
      for (let i = 0; i < 21; i++) {
        const request = createMockRequest('POST', '/api/analyze', requestBody);
        const response = await handler(request);
        responses.push(response);
      }

      // At least one request should be rate limited
      const hasRateLimited = responses.some(r => r.status === 429);
      expect(hasRateLimited).toBe(true);
    });

    test('should return 503 when AI provider unavailable', async () => {
      delete process.env.OPENROUTER_API_KEY;

      const requestBody = {
        strain: 'Test Strain',
        leafSymptoms: 'Test symptoms'
      };

      const request = createMockRequest('POST', '/api/analyze', requestBody);
      const response = await handler(request);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.success).toBe(false);
      expect(data.error.type).toBe('ai_provider_unavailable');
      expect(data.setupGuide).toBeDefined();
    });

    test('should handle AI provider timeout', async () => {
      (fetch as jest.Mock).mockImplementationOnce(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      const requestBody = {
        strain: 'Test Strain',
        leafSymptoms: 'Test symptoms'
      };

      const request = createMockRequest('POST', '/api/analyze', requestBody);
      const response = await handler(request);
      const data = await response.json();

      expect(response.status).toBe(504);
      expect(data.success).toBe(false);
    });

    test('should include security headers in response', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  diagnosis: 'Test',
                  confidence: 90
                })
              }
            }
          ]
        })
      });

      const requestBody = {
        strain: 'Test Strain',
        leafSymptoms: 'Test symptoms'
      };

      const request = createMockRequest('POST', '/api/analyze', requestBody);
      const response = await handler(request);

      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
      expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block');
      expect(response.headers.get('X-RateLimit-Limit')).toBeDefined();
    });

    test('should handle different temperature units', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  diagnosis: 'Test',
                  confidence: 90
                })
              }
            }
          ]
        })
      });

      const requestBody = {
        strain: 'Test Strain',
        leafSymptoms: 'Test symptoms',
        temperature: 25,
        temperatureUnit: 'C'
      };

      const request = createMockRequest('POST', '/api/analyze', requestBody);
      const response = await handler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
    });

    test('should validate urgency field', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  diagnosis: 'Test',
                  confidence: 90
                })
              }
            }
          ]
        })
      });

      const requestBody = {
        strain: 'Test Strain',
        leafSymptoms: 'Test symptoms',
        urgency: 'critical'
      };

      const request = createMockRequest('POST', '/api/analyze', requestBody);
      const response = await handler(request);

      expect(response.status).toBe(200);
    });

    test('should sanitize input strings', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  diagnosis: 'Test',
                  confidence: 90
                })
              }
            }
          ]
        })
      });

      const requestBody = {
        strain: '<script>alert("xss")</script>Test Strain',
        leafSymptoms: 'Normal symptoms'
      };

      const request = createMockRequest('POST', '/api/analyze', requestBody);
      const response = await handler(request);

      expect(response.status).toBe(200);
    });

    test('should handle large image files', async () => {
      // Mock AI provider response
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  diagnosis: 'Test',
                  confidence: 90
                })
              }
            }
          ]
        })
      });

      // Create large image data (simulate 5MB image)
      const largeImageData = createValidImageDataUrl('jpeg', 4000, 4000);

      const requestBody = {
        strain: 'Test Strain',
        leafSymptoms: 'Test symptoms',
        plantImage: largeImageData
      };

      const request = createMockRequest('POST', '/api/analyze', requestBody);
      const response = await handler(request);

      expect(response.status).toBe(200);
    });

    test('should handle malformed JSON request', async () => {
      const request = createMockRequest('POST', '/api/analyze', null, {
        parseJson: false
      });

      const response = await handler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    test('should log analysis start and completion', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  diagnosis: 'Test',
                  confidence: 90
                })
              }
            }
          ]
        })
      });

      const requestBody = {
        strain: 'Test Strain',
        leafSymptoms: 'Test symptoms'
      };

      const request = createMockRequest('POST', '/api/analyze', requestBody);
      await handler(request);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Starting enhanced cannabis plant analysis')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Analysis completed successfully')
      );

      consoleSpy.mockRestore();
    });

    test('should include request ID in response', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  diagnosis: 'Test',
                  confidence: 90
                })
              }
            }
          ]
        })
      });

      const requestBody = {
        strain: 'Test Strain',
        leafSymptoms: 'Test symptoms'
      };

      const request = createMockRequest('POST', '/api/analyze', requestBody);
      const response = await handler(request);
      const data = await response.json();

      expect(data.analysis.analysisId).toBeDefined();
    });

    test('should add rate limit headers to response', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  diagnosis: 'Test',
                  confidence: 90
                })
              }
            }
          ]
        })
      });

      const requestBody = {
        strain: 'Test Strain',
        leafSymptoms: 'Test symptoms'
      };

      const request = createMockRequest('POST', '/api/analyze', requestBody);
      const response = await handler(request);

      expect(response.headers.get('X-RateLimit-Limit')).toBe('20');
      expect(response.headers.get('X-RateLimit-Remaining')).toBeDefined();
    });
  });
});
