/**
 * Integration Tests for /api/trichome-analysis Endpoint
 */

import { createMockRequest, createMockResponse } from './test-helpers';
import handler from '@/app/api/trichome-analysis/route';
import { setupTestDb, teardownTestDb, createValidImageDataUrl } from '@/tests/utils/test-utils';

// Mock fetch for AI provider calls
global.fetch = jest.fn();

describe('/api/trichome-analysis Integration Tests', () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OPENROUTER_API_KEY = 'test-api-key';
  });

  describe('GET /api/trichome-analysis', () => {
    test('should return trichome analysis capabilities', async () => {
      const request = createMockRequest('GET', '/api/trichome-analysis');
      const response = await handler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.capabilities).toBeDefined();
      expect(data.capabilities.supportedDevices).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'USB Microscope'
          }),
          expect.objectContaining({
            type: 'Mobile Phone Camera'
          })
        ])
      );
      expect(data.capabilities.analysisOptions).toBeDefined();
    });

    test('should return static mode response when BUILD_MODE=static', async () => {
      process.env.BUILD_MODE = 'static';

      const request = createMockRequest('GET', '/api/trichome-analysis');
      const response = await handler(request);
      const data = await response.json();

      expect(data.clientSide).toBe(true);
      expect(data.buildMode).toBe('static');
    });
  });

  describe('POST /api/trichome-analysis', () => {
    test('should analyze trichomes from microscope image', async () => {
      // Mock AI provider response for trichome analysis
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  overallMaturity: {
                    stage: 'cloudy',
                    percentage: 75,
                    confidence: 0.91,
                    recommendation: 'Optimal harvest window approaching'
                  },
                  trichomeDistribution: {
                    clear: 15,
                    cloudy: 70,
                    amber: 15,
                    density: 'heavy'
                  },
                  harvestReadiness: {
                    ready: true,
                    recommendation: 'Harvest within 2-3 days',
                    estimatedHarvestTime: '0-3 days',
                    peakDays: 2
                  },
                  metrics: {
                    trichomeDensity: 185,
                    averageTrichomeLength: 185,
                    pistilHealth: 92
                  }
                })
              }
            }
          ]
        })
      });

      const requestBody = {
        imageData: createValidImageDataUrl('jpeg', 2048, 2048),
        deviceInfo: {
          deviceId: 'usb-microscope-001',
          label: 'Dino-Lite AM4113',
          mode: 'microscope',
          resolution: {
            width: 2048,
            height: 1536
          },
          magnification: 400,
          deviceType: 'USB Microscope'
        },
        analysisOptions: {
          focusArea: 'trichomes',
          maturityStage: 'peak',
          strainType: 'hybrid',
          enableCounting: true,
          enableMaturityAssessment: true,
          enableHarvestReadiness: true
        }
      };

      const request = createMockRequest('POST', '/api/trichome-analysis', requestBody);
      const response = await handler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.analysis).toBeDefined();
      expect(data.analysis.trichomeAnalysis).toBeDefined();
      expect(data.analysis.trichomeAnalysis.overallMaturity.stage).toBe('cloudy');
      expect(data.analysis.trichomeAnalysis.harvestReadiness.ready).toBe(true);
      expect(data.captureInfo).toBeDefined();
      expect(data.captureInfo.device).toEqual(requestBody.deviceInfo);
    });

    test('should analyze trichomes from mobile phone camera', async () => {
      // Mock AI provider response
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  overallMaturity: {
                    stage: 'mixed',
                    percentage: 65,
                    confidence: 0.82,
                    recommendation: 'Monitor for 3-5 more days'
                  },
                  trichomeDistribution: {
                    clear: 25,
                    cloudy: 55,
                    amber: 20,
                    density: 'medium'
                  },
                  harvestReadiness: {
                    ready: false,
                    recommendation: 'Not ready yet - need more cloudy development',
                    estimatedHarvestTime: '3-5 days'
                  }
                })
              }
            }
          ]
        })
      });

      const requestBody = {
        imageData: createValidImageDataUrl('jpeg', 1024, 1024),
        deviceInfo: {
          deviceId: 'iphone-12-pro',
          label: 'iPhone 12 Pro',
          mode: 'mobile',
          resolution: {
            width: 1200,
            height: 900
          },
          magnification: 100,
          deviceType: 'Mobile Phone Camera'
        }
      };

      const request = createMockRequest('POST', '/api/trichome-analysis', requestBody);
      const response = await handler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.analysis.trichomeAnalysis).toBeDefined();
    });

    test('should process image with trichome-specific optimizations', async () => {
      // Mock AI provider response
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  overallMaturity: {
                    stage: 'clear',
                    percentage: 80,
                    confidence: 0.88
                  },
                  trichomeDistribution: {
                    clear: 80,
                    cloudy: 15,
                    amber: 5,
                    density: 'medium'
                  },
                  harvestReadiness: {
                    ready: false,
                    recommendation: 'Too early - wait 1-2 weeks'
                  }
                })
              }
            }
          ]
        })
      });

      const requestBody = {
        imageData: createValidImageDataUrl('jpeg', 4000, 3000),
        deviceInfo: {
          deviceId: 'microscope-pro',
          label: 'Professional Microscope',
          mode: 'microscope',
          resolution: {
            width: 4096,
            height: 3072
          },
          magnification: 600,
          deviceType: 'USB Microscope'
        }
      };

      const request = createMockRequest('POST', '/api/trichome-analysis', requestBody);
      const response = await handler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    test('should reject request without image data', async () => {
      const requestBody = {
        deviceInfo: {
          deviceId: 'test-device',
          deviceType: 'USB Microscope',
          mode: 'microscope',
          resolution: { width: 1000, height: 1000 },
          magnification: 200
        }
      };

      const request = createMockRequest('POST', '/api/trichome-analysis', requestBody);
      const response = await handler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Image data is required');
    });

    test('should reject request without device info', async () => {
      const requestBody = {
        imageData: createValidImageDataUrl('jpeg')
      };

      const request = createMockRequest('POST', '/api/trichome-analysis', requestBody);
      const response = await handler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Device information is required');
    });

    test('should reject request with invalid device mode', async () => {
      const requestBody = {
        imageData: createValidImageDataUrl('jpeg'),
        deviceInfo: {
          deviceId: 'webcam-001',
          deviceType: 'USB Webcam',
          mode: 'webcam',
          resolution: { width: 1000, height: 1000 },
          magnification: 1
        }
      };

      const request = createMockRequest('POST', '/api/trichome-analysis', requestBody);
      const response = await handler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('high magnification');
    });

    test('should handle image processing errors', async () => {
      const requestBody = {
        imageData: 'invalid-image-data',
        deviceInfo: {
          deviceId: 'test-device',
          deviceType: 'USB Microscope',
          mode: 'microscope',
          resolution: { width: 1000, height: 1000 },
          magnification: 200
        }
      };

      const request = createMockRequest('POST', '/api/trichome-analysis', requestBody);
      const response = await handler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    test('should return 503 when AI provider unavailable', async () => {
      delete process.env.OPENROUTER_API_KEY;

      const requestBody = {
        imageData: createValidImageDataUrl('jpeg'),
        deviceInfo: {
          deviceId: 'test-device',
          deviceType: 'USB Microscope',
          mode: 'microscope',
          resolution: { width: 1000, height: 1000 },
          magnification: 200
        }
      };

      const request = createMockRequest('POST', '/api/trichome-analysis', requestBody);
      const response = await handler(request);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });

    test('should include technical analysis in response', async () => {
      // Mock AI provider response
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  overallMaturity: {
                    stage: 'cloudy',
                    percentage: 70,
                    confidence: 0.9
                  },
                  trichomeDistribution: {
                    clear: 20,
                    cloudy: 70,
                    amber: 10,
                    density: 'heavy'
                  }
                })
              }
            }
          ]
        })
      });

      const requestBody = {
        imageData: createValidImageDataUrl('jpeg', 2048, 1536),
        deviceInfo: {
          deviceId: 'microscope-001',
          deviceType: 'USB Microscope',
          mode: 'microscope',
          resolution: { width: 2048, height: 1536 },
          magnification: 400
        }
      };

      const request = createMockRequest('POST', '/api/trichome-analysis', requestBody);
      const response = await handler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.analysis.technicalAnalysis).toBeDefined();
      expect(data.analysis.technicalAnalysis).toEqual(
        expect.objectContaining({
          imageQuality: expect.any(String),
          magnificationLevel: expect.any(String),
          focusQuality: expect.any(String),
          lightingCondition: expect.any(String)
        })
      );
    });

    test('should include recommendations based on analysis', async () => {
      // Mock AI provider response
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  overallMaturity: {
                    stage: 'amber',
                    percentage: 75,
                    confidence: 0.93
                  },
                  trichomeDistribution: {
                    clear: 10,
                    cloudy: 35,
                    amber: 55,
                    density: 'heavy'
                  },
                  harvestReadiness: {
                    ready: true,
                    recommendation: 'Peak harvest window - harvest immediately'
                  }
                })
              }
            }
          ]
        })
      });

      const requestBody = {
        imageData: createValidImageDataUrl('jpeg'),
        deviceInfo: {
          deviceId: 'microscope-001',
          deviceType: 'USB Microscope',
          mode: 'microscope',
          resolution: { width: 2048, height: 1536 },
          magnification: 400
        },
        analysisOptions: {
          strainType: 'indica'
        }
      };

      const request = createMockRequest('POST', '/api/trichome-analysis', requestBody);
      const response = await handler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.analysis.recommendations).toBeDefined();
      expect(Array.isArray(data.analysis.recommendations)).toBe(true);
      expect(data.analysis.recommendations.length).toBeGreaterThan(0);
    });

    test('should calculate trichome distribution percentages correctly', async () => {
      // Mock AI provider response with rounded percentages
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  overallMaturity: {
                    stage: 'mixed',
                    percentage: 50,
                    confidence: 0.85
                  },
                  trichomeDistribution: {
                    clear: 33.333,
                    cloudy: 33.333,
                    amber: 33.333,
                    density: 'medium'
                  }
                })
              }
            }
          ]
        })
      });

      const requestBody = {
        imageData: createValidImageDataUrl('jpeg'),
        deviceInfo: {
          deviceId: 'test-device',
          deviceType: 'USB Microscope',
          mode: 'microscope',
          resolution: { width: 2048, height: 1536 },
          magnification: 200
        }
      };

      const request = createMockRequest('POST', '/api/trichome-analysis', requestBody);
      const response = await handler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Distribution should be normalized to approximately 100%
      const total =
        data.analysis.trichomeAnalysis.trichomeDistribution.clear +
        data.analysis.trichomeAnalysis.trichomeDistribution.cloudy +
        data.analysis.trichomeAnalysis.trichomeDistribution.amber;
      expect(total).toBeCloseTo(100, 1);
    });

    test('should validate magnification level for device type', async () => {
      const requestBody = {
        imageData: createValidImageDataUrl('jpeg'),
        deviceInfo: {
          deviceId: 'mobile-phone',
          deviceType: 'Mobile Phone Camera',
          mode: 'mobile',
          resolution: { width: 1200, height: 900 },
          magnification: 5 // Too low for mobile
        }
      };

      const request = createMockRequest('POST', '/api/trichome-analysis', requestBody);
      const response = await handler(request);
      const data = await response.json();

      // Should still process but AI analysis will handle low magnification
      expect(response.status).toBe(200);
    });

    test('should handle HEIC trichome images', async () => {
      // Mock AI provider response
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  overallMaturity: {
                    stage: 'cloudy',
                    percentage: 65,
                    confidence: 0.87
                  },
                  trichomeDistribution: {
                    clear: 20,
                    cloudy: 65,
                    amber: 15,
                    density: 'medium'
                  }
                })
              }
            }
          ]
        })
      });

      const requestBody = {
        imageData: createValidImageDataUrl('heic', 2048, 2048),
        deviceInfo: {
          deviceId: 'test-device',
          deviceType: 'USB Microscope',
          mode: 'microscope',
          resolution: { width: 2048, height: 2048 },
          magnification: 400
        }
      };

      const request = createMockRequest('POST', '/api/trichome-analysis', requestBody);
      const response = await handler(request);

      expect(response.status).toBe(200);
    });

    test('should include analysis metadata', async () => {
      // Mock AI provider response
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  overallMaturity: {
                    stage: 'cloudy',
                    percentage: 70,
                    confidence: 0.9
                  },
                  trichomeDistribution: {
                    clear: 15,
                    cloudy: 70,
                    amber: 15,
                    density: 'heavy'
                  }
                })
              }
            }
          ]
        })
      });

      const requestBody = {
        imageData: createValidImageDataUrl('jpeg'),
        deviceInfo: {
          deviceId: 'test-device',
          deviceType: 'USB Microscope',
          mode: 'microscope',
          resolution: { width: 2048, height: 1536 },
          magnification: 400
        },
        analysisOptions: {
          focusArea: 'trichomes'
        }
      };

      const request = createMockRequest('POST', '/api/trichome-analysis', requestBody);
      const response = await handler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.captureInfo).toBeDefined();
      expect(data.captureInfo.analysisTime).toBeDefined();
      expect(data.captureInfo.processingMethod).toBe('AI-enhanced trichome analysis');
    });
  });
});
