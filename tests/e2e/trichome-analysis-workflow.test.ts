/**
 * E2E Tests for Trichome Analysis Workflow
 */

import { test, expect } from '@playwright/test';

test.describe('Trichome Analysis Workflow E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Mock AI provider for trichome analysis
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
            },
            technicalAnalysis: {
              imageQuality: 'excellent',
              magnificationLevel: 'High (400x+)',
              focusQuality: 'sharp',
              lightingCondition: 'optimal'
            },
            recommendations: [
              'Optimal trichome development achieved',
              'Harvest window is now - 0-3 days remaining',
              'Trichome density is excellent'
            ]
          },
          captureInfo: {
            device: {
              deviceType: 'USB Microscope',
              magnification: 400
            },
            analysisTime: Date.now(),
            processingMethod: 'AI-enhanced trichome analysis'
          },
          timestamp: new Date().toISOString()
        })
      });
    });

    await page.goto('/trichome-analysis');
  });

  test('should complete full trichome analysis workflow', async ({ page }) => {
    // Step 1: Verify trichome analysis page loaded
    await expect(page).toHaveTitle(/Trichome Analysis/);
    await expect(page.locator('[data-testid="trichome-analysis-page"]')).toBeVisible();

    // Step 2: Select device type
    await page.click('[data-testid="device-selector"]');
    await page.click('[data-testid="device-usb-microscope"]');

    // Step 3: Configure device settings
    await page.selectOption('[name="magnification"]', '400');
    await page.fill('[name="deviceLabel"]', 'Dino-Lite AM4113');

    // Step 4: Upload trichome image
    const imagePath = 'tests/fixtures/sample-trichome.jpg';
    await page.setInputFiles('input[type="file"][name="trichomeImage"]', imagePath);

    // Wait for image preview
    await expect(page.locator('[data-testid="image-preview"]')).toBeVisible();
    await expect(page.locator('[data-testid="image-metadata"]')).toContainText('Resolution:');

    // Step 5: Configure analysis options
    await page.selectOption('[name="focusArea"]', 'trichomes');
    await page.selectOption('[name="strainType"]', 'hybrid');
    await page.check('[name="enableCounting"]');
    await page.check('[name="enableMaturityAssessment"]');
    await page.check('[name="enableHarvestReadiness"]');

    // Step 6: Submit analysis
    await page.click('[data-testid="analyze-trichomes"]');

    // Step 7: Wait for analysis to complete
    await expect(page.locator('[data-testid="analysis-progress"]')).toBeVisible();
    await expect(page.locator('[data-testid="trichome-results"]')).toBeVisible({ timeout: 30000 });

    // Step 8: Verify trichome analysis results
    await expect(page.locator('[data-testid="maturity-stage"]')).toContainText('cloudy');
    await expect(page.locator('[data-testid="maturity-percentage"]')).toContainText('75%');
    await expect(page.locator('[data-testid="harvest-readiness"]')).toContainText('ready');

    // Step 9: Verify trichome distribution chart
    await expect(page.locator('[data-testid="distribution-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="clear-trichomes"]')).toContainText('15%');
    await expect(page.locator('[data-testid="cloudy-trichomes"]')).toContainText('70%');
    await expect(page.locator('[data-testid="amber-trichomes"]')).toContainText('15%');

    // Step 10: Verify density indicator
    await expect(page.locator('[data-testid="trichome-density"]')).toContainText('heavy');

    // Step 11: Verify metrics
    await expect(page.locator('[data-testid="trichome-density-metric"]')).toContainText('185');
    await expect(page.locator('[data-testid="pistil-health-metric"]')).toContainText('92%');

    // Step 12: Verify harvest timing
    await expect(page.locator('[data-testid="harvest-timing"]')).toContainText('0-3 days');

    // Step 13: Verify technical analysis
    await expect(page.locator('[data-testid="image-quality"]')).toContainText('excellent');
    await expect(page.locator('[data-testid="focus-quality"]')).toContainText('sharp');
    await expect(page.locator('[data-testid="lighting-condition"]')).toContainText('optimal');

    // Step 14: Verify recommendations
    await expect(page.locator('[data-testid="recommendations-list"]')).toContainText('Optimal trichome development');
    await expect(page.locator('[data-testid="recommendations-list"]')).toContainText('Harvest window');
  });

  test('should analyze trichomes from mobile phone', async ({ page }) => {
    // Select mobile phone device
    await page.click('[data-testid="device-selector"]');
    await page.click('[data-testid="device-mobile-phone"]');

    // Configure mobile settings
    await page.selectOption('[name="magnification"]', '100');
    await page.fill('[name="deviceLabel"]', 'iPhone 12 Pro');

    // Upload image
    const imagePath = 'tests/fixtures/sample-mobile-trichome.jpg';
    await page.setInputFiles('input[type="file"][name="trichomeImage"]', imagePath);

    await page.click('[data-testid="analyze-trichomes"]');
    await expect(page.locator('[data-testid="trichome-results"]')).toBeVisible({ timeout: 30000 });

    // Verify mobile-specific analysis
    await expect(page.locator('[data-testid="mobile-warning"]')).toContainText('mobile phone');
  });

  test('should validate device requirements', async ({ page }) => {
    // Try to analyze without selecting device
    const imagePath = 'tests/fixtures/sample-trichome.jpg';
    await page.setInputFiles('input[type="file"][name="trichomeImage"]', imagePath);

    await page.click('[data-testid="analyze-trichomes"]');

    // Should show device selection error
    await expect(page.locator('[data-testid="device-error"]')).toContainText('Device type is required');
  });

  test('should validate image resolution', async ({ page }) => {
    // Select microscope
    await page.click('[data-testid="device-selector"]');
    await page.click('[data-testid="device-usb-microscope"]');

    // Upload low resolution image
    const lowResPath = 'tests/fixtures/low-resolution.jpg';
    await page.setInputFiles('input[type="file"][name="trichomeImage"]', lowResPath);

    await page.click('[data-testid="analyze-trichomes"]');

    // Should show resolution warning
    await expect(page.locator('[data-testid="resolution-warning"]')).toContainText('low resolution');
  });

  test('should display trichome maturity stages correctly', async ({ page }) => {
    // Override mock for different maturity stage
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
              },
              harvestReadiness: {
                ready: false,
                recommendation: 'Too early - wait 2-3 weeks'
              }
            },
            recommendations: [
              'Trichomes are mostly clear - plant needs more time',
              'Monitor daily for cloudy development'
            ]
          }
        })
      });
    });

    await page.click('[data-testid="device-selector"]');
    await page.click('[data-testid="device-usb-microscope"]');

    const imagePath = 'tests/fixtures/sample-trichome.jpg';
    await page.setInputFiles('input[type="file"][name="trichomeImage"]', imagePath);

    await page.click('[data-testid="analyze-trichomes"]');
    await expect(page.locator('[data-testid="trichome-results"]')).toBeVisible({ timeout: 30000 });

    // Verify clear trichome stage
    await expect(page.locator('[data-testid="maturity-stage"]')).toContainText('clear');
    await expect(page.locator('[data-testid="harvest-readiness"]')).toContainText('too early');

    // Verify recommendations for early stage
    await expect(page.locator('[data-testid="recommendations-list"]')).toContainText('needs more time');
  });

  test('should display amber trichome stage', async ({ page }) => {
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
              trichomeDistribution: {
                clear: 5,
                cloudy: 25,
                amber: 70,
                density: 'heavy'
              },
              harvestReadiness: {
                ready: true,
                recommendation: 'Harvest now for maximum CBN'
              }
            },
            recommendations: [
              'Trichomes are mature with high amber content',
              'Harvest immediately for sedative effects'
            ]
          }
        })
      });
    });

    await page.click('[data-testid="device-selector"]');
    await page.click('[data-testid="device-usb-microscope"]');

    const imagePath = 'tests/fixtures/sample-trichome.jpg';
    await page.setInputFiles('input[type="file"][name="trichomeImage"]', imagePath);

    await page.click('[data-testid="analyze-trichomes"]');
    await expect(page.locator('[data-testid="trichome-results"]')).toBeVisible({ timeout: 30000 });

    // Verify amber stage
    await expect(page.locator('[data-testid="maturity-stage"]')).toContainText('amber');
    await expect(page.locator('[data-testid="harvest-readiness"]')).toContainText('harvest now');
  });

  test('should allow comparing multiple trichome images', async ({ page }) => {
    await page.click('[data-testid="device-selector"]');
    await page.click('[data-testid="device-usb-microscope"]');

    // Upload first image
    const imagePath1 = 'tests/fixtures/sample-trichome-1.jpg';
    await page.setInputFiles('input[type="file"][name="trichomeImage"]', imagePath1);

    await page.click('[data-testid="analyze-trichomes"]');
    await expect(page.locator('[data-testid="trichome-results"]')).toBeVisible({ timeout: 30000 });

    // Save analysis
    await page.click('[data-testid="save-analysis"]');

    // Upload second image
    await page.click('[data-testid="analyze-another"]');
    const imagePath2 = 'tests/fixtures/sample-trichome-2.jpg';
    await page.setInputFiles('input[type="file"][name="trichomeImage"]', imagePath2);

    await page.click('[data-testid="analyze-trichomes"]');
    await expect(page.locator('[data-testid="trichome-results"]')).toBeVisible({ timeout: 30000 });

    // Compare with previous
    await page.click('[data-testid="compare-analysis"]');

    // Should show comparison view
    await expect(page.locator('[data-testid="comparison-view"]')).toBeVisible();
    await expect(page.locator('[data-testid="comparison-chart"]')).toBeVisible();
  });

  test('should export trichome analysis report', async ({ page }) => {
    await page.click('[data-testid="device-selector"]');
    await page.click('[data-testid="device-usb-microscope"]');

    const imagePath = 'tests/fixtures/sample-trichome.jpg';
    await page.setInputFiles('input[type="file"][name="trichomeImage"]', imagePath);

    await page.click('[data-testid="analyze-trichomes"]');
    await expect(page.locator('[data-testid="trichome-results"]')).toBeVisible({ timeout: 30000 });

    // Export as PDF
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="export-trichome-pdf"]');
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/trichome-analysis-\d+\.pdf$/);
  });

  test('should save trichome analysis to history', async ({ page }) => {
    await page.click('[data-testid="device-selector"]');
    await page.click('[data-testid="device-usb-microscope"]');

    const imagePath = 'tests/fixtures/sample-trichome.jpg';
    await page.setInputFiles('input[type="file"][name="trichomeImage"]', imagePath);

    await page.click('[data-testid="analyze-trichomes"]');
    await expect(page.locator('[data-testid="trichome-results"]')).toBeVisible({ timeout: 30000 });

    // Save analysis
    await page.click('[data-testid="save-trichome-analysis"]');
    await expect(page.locator('[data-testid="save-success"]')).toContainText('Analysis saved');

    // View history
    await page.click('[data-testid="history-tab"]');
    await expect(page.locator('[data-testid="history-item"]')).toHaveCount(1);
    await expect(page.locator('[data-testid="history-item"]').first()).toContainText('trichome');
  });

  test('should display trichome density visualization', async ({ page }) => {
    await page.click('[data-testid="device-selector"]');
    await page.click('[data-testid="device-usb-microscope"]');

    const imagePath = 'tests/fixtures/sample-trichome.jpg';
    await page.setInputFiles('input[type="file"][name="trichomeImage"]', imagePath);

    await page.click('[data-testid="analyze-trichomes"]');
    await expect(page.locator('[data-testid="trichome-results"]')).toBeVisible({ timeout: 30000 });

    // Verify density visualization
    await expect(page.locator('[data-testid="density-visualization"]')).toBeVisible();
    await expect(page.locator('[data-testid="density-indicator"]')).toContainText('heavy');
  });

  test('should work with different magnification levels', async ({ page }) => {
    await page.click('[data-testid="device-selector"]');
    await page.click('[data-testid="device-usb-microscope"]');

    // Test with 200x magnification
    await page.selectOption('[name="magnification"]', '200');
    const imagePath = 'tests/fixtures/sample-trichome.jpg';
    await page.setInputFiles('input[type="file"][name="trichomeImage"]', imagePath);

    await page.click('[data-testid="analyze-trichomes"]');
    await expect(page.locator('[data-testid="trichome-results"]')).toBeVisible({ timeout: 30000 });

    // Verify magnification is noted
    await expect(page.locator('[data-testid="magnification-note"]')).toContainText('200x');
  });

  test('should validate minimum magnification for microscope', async ({ page }) => {
    await page.click('[data-testid="device-selector"]');
    await page.click('[data-testid="device-usb-microscope"]');

    // Set low magnification
    await page.selectOption('[name="magnification"]', '50');

    const imagePath = 'tests/fixtures/sample-trichome.jpg';
    await page.setInputFiles('input[type="file"][name="trichomeImage"]', imagePath);

    await page.click('[data-testid="analyze-trichomes"]');

    // Should show magnification warning
    await expect(page.locator('[data-testid="magnification-warning"]')).toContainText('minimum');
  });
});

test.describe('Trichome Analysis - Error Handling', () => {
  test('should handle missing image data', async ({ page }) => {
    await page.goto('/trichome-analysis');

    await page.click('[data-testid="device-selector"]');
    await page.click('[data-testid="device-usb-microscope"]');

    // Don't upload image, just submit
    await page.click('[data-testid="analyze-trichomes"]');

    // Should show error
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Image data is required');
  });

  test('should handle invalid image format', async ({ page }) => {
    await page.goto('/trichome-analysis');

    await page.click('[data-testid="device-selector"]');
    await page.click('[data-testid="device-usb-microscope"]');

    // Upload non-image file
    const invalidPath = 'tests/fixtures/invalid-file.txt';
    await page.setInputFiles('input[type="file"][name="trichomeImage"]', invalidPath);

    await page.click('[data-testid="analyze-trichomes"]');

    // Should show error
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid image');
  });

  test('should show setup guide when AI provider unavailable', async ({ page }) => {
    // Mock AI provider unavailable
    await page.route('**/api/trichome-analysis', async route => {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: {
            type: 'ai_provider_unavailable',
            message: 'AI Provider Required'
          }
        })
      });
    });

    await page.goto('/trichome-analysis');

    await page.click('[data-testid="device-selector"]');
    await page.click('[data-testid="device-usb-microscope"]');

    const imagePath = 'tests/fixtures/sample-trichome.jpg';
    await page.setInputFiles('input[type="file"][name="trichomeImage"]', imagePath);

    await page.click('[data-testid="analyze-trichomes"]');

    // Should show setup guide
    await expect(page.locator('[data-testid="setup-guide"]')).toBeVisible();
    await expect(page.locator('[data-testid="setup-guide-title"]')).toContainText('AI Provider');
  });
});
