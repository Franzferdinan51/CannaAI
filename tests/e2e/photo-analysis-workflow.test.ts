/**
 * E2E Tests for Complete Photo Analysis Workflow
 */

import { test, expect } from '@playwright/test';

test.describe('Photo Analysis Workflow E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Mock AI provider
    await page.route('**/api/analyze', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          analysis: {
            diagnosis: 'Healthy Plant',
            confidence: 95,
            severity: 'none',
            symptomsMatched: ['Vigorous growth'],
            causes: ['Optimal growing conditions'],
            treatment: ['Continue current regimen'],
            healthScore: 95,
            imageAnalysis: {
              hasImage: true,
              visualFindings: ['Green healthy leaves']
            }
          },
          timestamp: new Date().toISOString()
        })
      });
    });

    // Navigate to the application
    await page.goto('/');
    await expect(page).toHaveTitle(/CultivAI Pro/);
  });

  test('should complete full photo analysis workflow', async ({ page }) => {
    // Step 1: Navigate to analysis page
    await page.click('[data-testid="analyze-tab"]');
    await expect(page.locator('[data-testid="analysis-form"]')).toBeVisible();

    // Step 2: Fill in plant details
    await page.fill('[name="strain"]', 'Granddaddy Purple');
    await page.fill('[name="leafSymptoms"]', 'Healthy green leaves, vigorous growth');
    await page.fill('[name="phLevel"]', '6.2');
    await page.fill('[name="temperature"]', '75');
    await page.fill('[name="humidity"]', '55');
    await page.selectOption('[name="growthStage"]', 'flowering');
    await page.selectOption('[name="urgency"]', 'low');

    // Step 3: Upload image
    const imagePath = 'tests/fixtures/sample-plant.jpg';
    await page.setInputFiles('input[type="file"][name="plantImage"]', imagePath);

    // Wait for image preview
    await expect(page.locator('[data-testid="image-preview"]')).toBeVisible();

    // Step 4: Submit analysis
    await page.click('[data-testid="submit-analysis"]');

    // Step 5: Wait for analysis to complete
    await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();
    await expect(page.locator('[data-testid="analysis-results"]')).toBeVisible({ timeout: 30000 });

    // Step 6: Verify results
    await expect(page.locator('[data-testid="diagnosis-title"]')).toContainText('Healthy Plant');
    await expect(page.locator('[data-testid="confidence-score"]')).toContainText('95');

    // Verify image analysis results
    await expect(page.locator('[data-testid="visual-findings"]')).toContainText('Green healthy leaves');

    // Step 7: Save analysis
    await page.click('[data-testid="save-analysis"]');
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Analysis saved');

    // Step 8: View analysis history
    await page.click('[data-testid="history-tab"]');
    await expect(page.locator('[data-testid="history-item"]')).toHaveCount(1);
    await expect(page.locator('[data-testid="history-item"]').first()).toContainText('Granddaddy Purple');
  });

  test('should handle invalid input gracefully', async ({ page }) => {
    // Navigate to analysis page
    await page.click('[data-testid="analyze-tab"]');

    // Try to submit without required fields
    await page.click('[data-testid="submit-analysis"]');

    // Should show validation errors
    await expect(page.locator('[data-testid="error-strain"]')).toContainText('required');
    await expect(page.locator('[data-testid="error-symptoms"]')).toContainText('required');

    // Fill in only strain but not symptoms
    await page.fill('[name="strain"]', 'Test Strain');

    await page.click('[data-testid="submit-analysis"]');
    await expect(page.locator('[data-testid="error-symptoms"]')).toContainText('required');
  });

  test('should handle image upload errors', async ({ page }) => {
    // Mock image processing error
    await page.route('**/api/analyze', async route => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: {
            message: 'Invalid image format. Only JPEG, PNG, and HEIC are supported.'
          }
        })
      });
    });

    await page.click('[data-testid="analyze-tab"]');

    // Try to upload an invalid image
    const invalidImagePath = 'tests/fixtures/invalid-file.txt';
    await page.setInputFiles('input[type="file"][name="plantImage"]', invalidImagePath);

    // Submit analysis
    await page.click('[data-testid="submit-analysis"]');

    // Should show error
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid image format');
  });

  test('should display rate limiting message when exceeded', async ({ page }) => {
    // Mock rate limit response
    let requestCount = 0;
    await page.route('**/api/analyze', async route => {
      requestCount++;
      if (requestCount > 20) {
        await route.fulfill({
          status: 429,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Rate limit exceeded. Please try again later.',
            resetTime: Date.now() + 900000
          })
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            analysis: {
              diagnosis: 'Test',
              confidence: 90
            }
          })
        });
      }
    });

    await page.click('[data-testid="analyze-tab"]');

    // Submit multiple requests to trigger rate limit
    for (let i = 0; i < 22; i++) {
      await page.fill('[name="strain"]', `Test Strain ${i}`);
      await page.fill('[name="leafSymptoms"]', 'Test symptoms');
      await page.click('[data-testid="submit-analysis"]');
      await page.waitForTimeout(100);
    }

    // Should show rate limit message
    await expect(page.locator('[data-testid="rate-limit-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="rate-limit-message"]')).toContainText('Rate limit exceeded');
  });

  test('should allow editing analysis results', async ({ page }) => {
    await page.click('[data-testid="analyze-tab"]');
    await page.fill('[name="strain"]', 'Blue Dream');
    await page.fill('[name="leafSymptoms"]', 'Some yellowing on lower leaves');

    const imagePath = 'tests/fixtures/sample-plant.jpg';
    await page.setInputFiles('input[type="file"][name="plantImage"]', imagePath);

    await page.click('[data-testid="submit-analysis"]');
    await expect(page.locator('[data-testid="analysis-results"]')).toBeVisible({ timeout: 30000 });

    // Edit the analysis notes
    await page.click('[data-testid="edit-analysis"]');
    await page.fill('[data-testid="analysis-notes"]', 'Follow-up analysis needed in 3 days');
    await page.click('[data-testid="save-edits"]');

    await expect(page.locator('[data-testid="success-message"]')).toContainText('Analysis updated');
  });

  test('should export analysis results', async ({ page }) => {
    await page.click('[data-testid="analyze-tab"]');
    await page.fill('[name="strain"]', 'Test Strain');
    await page.fill('[name="leafSymptoms"]', 'Test symptoms');

    const imagePath = 'tests/fixtures/sample-plant.jpg';
    await page.setInputFiles('input[type="file"][name="plantImage"]', imagePath);

    await page.click('[data-testid="submit-analysis"]');
    await expect(page.locator('[data-testid="analysis-results"]')).toBeVisible({ timeout: 30000 });

    // Export as PDF
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="export-pdf"]');
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/\.pdf$/);
  });

  test('should share analysis via link', async ({ page }) => {
    await page.click('[data-testid="analyze-tab"]');
    await page.fill('[name="strain"]', 'Shareable Strain');
    await page.fill('[name="leafSymptoms"]', 'Test symptoms');

    const imagePath = 'tests/fixtures/sample-plant.jpg';
    await page.setInputFiles('input[type="file"][name="plantImage"]', imagePath);

    await page.click('[data-testid="submit-analysis"]');
    await expect(page.locator('[data-testid="analysis-results"]')).toBeVisible({ timeout: 30000 });

    // Share analysis
    await page.click('[data-testid="share-analysis"]');

    // Check for share modal
    await expect(page.locator('[data-testid="share-modal"]')).toBeVisible();

    // Copy share link
    await page.click('[data-testid="copy-share-link"]');
    await expect(page.locator('[data-testid="copy-success"]')).toContainText('Copied');
  });

  test('should show loading states during analysis', async ({ page }) => {
    // Mock slow response
    await page.route('**/api/analyze', async route => {
      await new Promise(resolve => setTimeout(resolve, 5000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          analysis: {
            diagnosis: 'Test',
            confidence: 90
          }
        })
      });
    });

    await page.click('[data-testid="analyze-tab"]');
    await page.fill('[name="strain"]', 'Test Strain');
    await page.fill('[name="leafSymptoms"]', 'Test symptoms');

    const imagePath = 'tests/fixtures/sample-plant.jpg';
    await page.setInputFiles('input[type="file"][name="plantImage"]', imagePath);

    await page.click('[data-testid="submit-analysis"]');

    // Show loading spinner immediately
    await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();

    // Show progress indicator
    await expect(page.locator('[data-testid="analysis-progress"]')).toContainText('Processing image');
  });

  test('should display comprehensive analysis details', async ({ page }) => {
    await page.click('[data-testid="analyze-tab"]');
    await page.fill('[name="strain"]', 'Comprehensive Test');
    await page.fill('[name="leafSymptoms"]', 'Yellowing, spots, wilting');

    const imagePath = 'tests/fixtures/sample-plant.jpg';
    await page.setInputFiles('input[type="file"][name="plantImage"]', imagePath);

    await page.click('[data-testid="submit-analysis"]');
    await expect(page.locator('[data-testid="analysis-results"]')).toBeVisible({ timeout: 30000 });

    // Verify all analysis sections are displayed
    await expect(page.locator('[data-testid="section-diagnosis"]')).toBeVisible();
    await expect(page.locator('[data-testid="section-symptoms"]')).toBeVisible();
    await expect(page.locator('[data-testid="section-treatment"]')).toBeVisible();
    await expect(page.locator('[data-testid="section-recommendations"]')).toBeVisible();
    await expect(page.locator('[data-testid="section-preventative"]')).toBeVisible();

    // Check health score display
    await expect(page.locator('[data-testid="health-score"]')).toBeVisible();

    // Check confidence score display
    await expect(page.locator('[data-testid="confidence-score"]')).toBeVisible();
  });

  test('should work on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.click('[data-testid="analyze-tab"]');

    // Verify mobile-friendly UI
    await expect(page.locator('[data-testid="analysis-form"]')).toBeVisible();

    // Test form inputs on mobile
    await page.fill('[name="strain"]', 'Mobile Test');
    await page.fill('[name="leafSymptoms"]', 'Mobile symptoms test');
    await page.fill('[name="phLevel"]', '6.0');

    // Verify keyboard doesn't obscure inputs
    await page.click('[name="temperature"]');
    await expect(page.locator('[name="temperature"]')).toBeFocused();

    // Test file upload on mobile (should open camera)
    // This would require actual device testing, but we can check the UI
    await expect(page.locator('input[type="file"]')).toBeVisible();
  });
});

test.describe('Photo Analysis Workflow - Error Handling', () => {
  test('should handle AI provider unavailable', async ({ page }) => {
    // Mock AI provider unavailable
    await page.route('**/api/analyze', async route => {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: {
            type: 'ai_provider_unavailable',
            message: 'AI Provider Required',
            userMessage: 'An AI provider is required for plant analysis.'
          },
          setupGuide: {
            title: 'Configure AI Provider',
            steps: [
              'Go to Settings → AI Configuration',
              'Configure OpenRouter API key',
              'Test connection'
            ]
          }
        })
      });
    });

    await page.goto('/');
    await page.click('[data-testid="analyze-tab"]');
    await page.fill('[name="strain"]', 'Test Strain');
    await page.fill('[name="leafSymptoms"]', 'Test symptoms');
    await page.click('[data-testid="submit-analysis"]');

    // Should show setup guide
    await expect(page.locator('[data-testid="setup-guide-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="setup-guide-title"]')).toContainText('Configure AI Provider');

    // Should have link to settings
    await expect(page.locator('[data-testid="go-to-settings"]')).toBeVisible();
  });

  test('should handle network timeout', async ({ page }) => {
    // Mock timeout
    await page.route('**/api/analyze', async route => {
      await new Promise(resolve => setTimeout(resolve, 120000));
    });

    await page.goto('/');
    await page.click('[data-testid="analyze-tab"]');
    await page.fill('[name="strain"]', 'Test Strain');
    await page.fill('[name="leafSymptoms"]', 'Test symptoms');
    await page.click('[data-testid="submit-analysis"]');

    // Wait for timeout
    await page.waitForTimeout(3000);

    // Should show timeout message
    await expect(page.locator('[data-testid="timeout-message"]')).toContainText('timeout');
  });

  test('should show retry option on failure', async ({ page }) => {
    let attempt = 0;
    await page.route('**/api/analyze', async route => {
      attempt++;
      if (attempt === 1) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Internal server error'
          })
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            analysis: {
              diagnosis: 'Success on retry',
              confidence: 90
            }
          })
        });
      }
    });

    await page.goto('/');
    await page.click('[data-testid="analyze-tab"]');
    await page.fill('[name="strain"]', 'Test Strain');
    await page.fill('[name="leafSymptoms"]', 'Test symptoms');
    await page.click('[data-testid="submit-analysis"]');

    // Should show error
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();

    // Should show retry button
    await expect(page.locator('[data-testid="retry-analysis"]')).toBeVisible();

    // Retry
    await page.click('[data-testid="retry-analysis"]');
    await expect(page.locator('[data-testid="analysis-results"]')).toBeVisible({ timeout: 30000 });
  });
});
