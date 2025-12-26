/**
 * Visual Regression Tests for Trichome Analysis UI
 */

import { test, expect } from '@playwright/test';

test.describe('Trichome Analysis UI Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/trichome-analysis');
  });

  test('should match trichome analysis landing page', async ({ page }) => {
    await expect(page).toHaveScreenshot('trichome-landing.png');
  });

  test('should match device selection interface', async ({ page }) => {
    await page.click('[data-testid="device-selector"]');

    await expect(page).toHaveScreenshot('device-selector.png');
  });

  test('should match microscope configuration', async ({ page }) => {
    await page.click('[data-testid="device-selector"]');
    await page.click('[data-testid="device-usb-microscope"]');

    await expect(page).toHaveScreenshot('microscope-config.png');
  });

  test('should match mobile camera configuration', async ({ page }) => {
    await page.click('[data-testid="device-selector"]');
    await page.click('[data-testid="device-mobile-phone"]');

    await expect(page).toHaveScreenshot('mobile-camera-config.png');
  });

  test('should match image upload with preview', async ({ page }) => {
    await page.click('[data-testid="device-selector"]');
    await page.click('[data-testid="device-usb-microscope"]');

    await page.setInputFiles('input[type="file"][name="trichomeImage"]', 'tests/fixtures/sample-trichome.jpg');

    await expect(page).toHaveScreenshot('trichome-image-preview.png');
  });

  test('should match analysis options panel', async ({ page }) => {
    await page.click('[data-testid="device-selector"]');
    await page.click('[data-testid="device-usb-microscope"]');

    await expect(page).toHaveScreenshot('analysis-options.png');
  });

  test('should match trichome results with charts', async ({ page }) => {
    // Mock trichome analysis response
    await page.route('**/api/trichome-analysis', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          analysis: {
            trichomeAnalysis: {
              overallMaturity: {
                stage: 'cloudy',
                percentage: 75,
                confidence: 0.91
              },
              trichomeDistribution: {
                clear: 15,
                cloudy: 70,
                amber: 15,
                density: 'heavy'
              },
              harvestReadiness: {
                ready: true,
                recommendation: 'Harvest in 2-3 days'
              },
              metrics: {
                trichomeDensity: 185,
                pistilHealth: 92
              }
            },
            technicalAnalysis: {
              imageQuality: 'excellent',
              focusQuality: 'sharp'
            },
            recommendations: ['Optimal development', 'Ready soon']
          }
        })
      });
    });

    await page.click('[data-testid="device-selector"]');
    await page.click('[data-testid="device-usb-microscope"]');
    await page.setInputFiles('input[type="file"][name="trichomeImage"]', 'tests/fixtures/sample-trichome.jpg');
    await page.click('[data-testid="analyze-trichomes"]');

    await expect(page.locator('[data-testid="trichome-results"]')).toBeVisible();
    await expect(page).toHaveScreenshot('trichome-results.png');
  });

  test('should match maturity stage indicators', async ({ page }) => {
    await page.route('**/api/trichome-analysis', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          analysis: {
            trichomeAnalysis: {
              overallMaturity: {
                stage: 'clear',
                percentage: 85,
                confidence: 0.88
              },
              trichomeDistribution: {
                clear: 85,
                cloudy: 10,
                amber: 5,
                density: 'medium'
              }
            }
          }
        })
      });
    });

    await page.click('[data-testid="device-selector"]');
    await page.click('[data-testid="device-usb-microscope"]');
    await page.setInputFiles('input[type="file"][name="trichomeImage"]', 'tests/fixtures/sample-trichome.jpg');
    await page.click('[data-testid="analyze-trichomes"]');

    await expect(page.locator('[data-testid="trichome-results"]')).toBeVisible();
    await expect(page).toHaveScreenshot('clear-stage-results.png');
  });

  test('should match distribution chart', async ({ page }) => {
    await page.route('**/api/trichome-analysis', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          analysis: {
            trichomeAnalysis: {
              overallMaturity: {
                stage: 'cloudy',
                percentage: 70,
                confidence: 0.9
              },
              trichomeDistribution: {
                clear: 20,
                cloudy: 60,
                amber: 20,
                density: 'heavy'
              }
            }
          }
        })
      });
    });

    await page.click('[data-testid="device-selector"]');
    await page.click('[data-testid="device-usb-microscope"]');
    await page.setInputFiles('input[type="file"][name="trichomeImage"]', 'tests/fixtures/sample-trichome.jpg');
    await page.click('[data-testid="analyze-trichomes"]');

    await expect(page.locator('[data-testid="distribution-chart"]')).toBeVisible();
    await expect(page).toHaveScreenshot('distribution-chart.png');
  });

  test('should match harvest readiness indicator', async ({ page }) => {
    await page.route('**/api/trichome-analysis', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          analysis: {
            trichomeAnalysis: {
              harvestReadiness: {
                ready: true,
                recommendation: 'Ready to harvest',
                estimatedHarvestTime: '0-2 days'
              }
            }
          }
        })
      });
    });

    await page.click('[data-testid="device-selector"]');
    await page.click('[data-testid="device-usb-microscope"]');
    await page.setInputFiles('input[type="file"][name="trichomeImage"]', 'tests/fixtures/sample-trichome.jpg');
    await page.click('[data-testid="analyze-trichomes"]');

    await expect(page.locator('[data-testid="harvest-readiness"]')).toBeVisible();
    await expect(page).toHaveScreenshot('harvest-readiness.png');
  });

  test('should match technical analysis panel', async ({ page }) => {
    await page.route('**/api/trichome-analysis', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          analysis: {
            trichomeAnalysis: {
              overallMaturity: {
                stage: 'cloudy',
                percentage: 75,
                confidence: 0.91
              }
            },
            technicalAnalysis: {
              imageQuality: 'excellent',
              magnificationLevel: 'High (400x+)',
              focusQuality: 'sharp',
              lightingCondition: 'optimal'
            }
          }
        })
      });
    });

    await page.click('[data-testid="device-selector"]');
    await page.click('[data-testid="device-usb-microscope"]');
    await page.setInputFiles('input[type="file"][name="trichomeImage"]', 'tests/fixtures/sample-trichome.jpg');
    await page.click('[data-testid="analyze-trichomes"]');

    await expect(page.locator('[data-testid="trichome-results"]')).toBeVisible();
    await expect(page).toHaveScreenshot('technical-analysis.png');
  });

  test('should match recommendations panel', async ({ page }) => {
    await page.route('**/api/trichome-analysis', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          analysis: {
            trichomeAnalysis: {
              overallMaturity: {
                stage: 'amber',
                percentage: 80,
                confidence: 0.95
              },
              harvestReadiness: {
                ready: true,
                recommendation: 'Harvest immediately'
              }
            },
            recommendations: [
              'Trichomes are fully mature',
              'High amber content for sedative effects',
              'Harvest now for peak CBN levels'
            ]
          }
        })
      });
    });

    await page.click('[data-testid="device-selector"]');
    await page.click('[data-testid="device-usb-microscope"]');
    await page.setInputFiles('input[type="file"][name="trichomeImage"]', 'tests/fixtures/sample-trichome.jpg');
    await page.click('[data-testid="analyze-trichomes"]');

    await expect(page.locator('[data-testid="trichome-results"]')).toBeVisible();
    await expect(page).toHaveScreenshot('recommendations-panel.png');
  });

  test('should match loading animation', async ({ page }) => {
    await page.route('**/api/trichome-analysis', async route => {
      await new Promise(resolve => setTimeout(resolve, 3000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          analysis: {
            trichomeAnalysis: {
              overallMaturity: {
                stage: 'cloudy',
                percentage: 70,
                confidence: 0.9
              }
            }
          }
        })
      });
    });

    await page.click('[data-testid="device-selector"]');
    await page.click('[data-testid="device-usb-microscope"]');
    await page.setInputFiles('input[type="file"][name="trichomeImage"]', 'tests/fixtures/sample-trichome.jpg');
    await page.click('[data-testid="analyze-trichomes"]');

    await expect(page).toHaveScreenshot('trichome-loading.png');
  });

  test('should match mobile trichome interface', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await expect(page).toHaveScreenshot('mobile-trichome-landing.png');

    await page.click('[data-testid="device-selector"]');
    await page.click('[data-testid="device-mobile-phone"]');

    await expect(page).toHaveScreenshot('mobile-device-config.png');
  });

  test('should match tablet trichome interface', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });

    await expect(page).toHaveScreenshot('tablet-trichome-landing.png');
  });
});
