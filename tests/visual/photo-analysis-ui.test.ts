/**
 * Visual Regression Tests for Photo Analysis UI
 */

import { test, expect } from '@playwright/test';

test.describe('Photo Analysis UI Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should match landing page snapshot', async ({ page }) => {
    await expect(page).toHaveScreenshot('landing-page.png');
  });

  test('should match analysis form layout', async ({ page }) => {
    await page.click('[data-testid="analyze-tab"]');
    await expect(page).toHaveScreenshot('analysis-form.png');
  });

  test('should match form with data entered', async ({ page }) => {
    await page.click('[data-testid="analyze-tab"]');

    await page.fill('[name="strain"]', 'Granddaddy Purple');
    await page.fill('[name="leafSymptoms"]', 'Yellowing lower leaves');
    await page.fill('[name="phLevel"]', '6.2');
    await page.fill('[name="temperature"]', '75');
    await page.fill('[name="humidity"]', '55');

    await expect(page).toHaveScreenshot('form-filled.png');
  });

  test('should match image upload interface', async ({ page }) => {
    await page.click('[data-testid="analyze-tab"]');

    // Mock file chooser
    await page.setInputFiles('input[type="file"][name="plantImage"]', 'tests/fixtures/sample-image.jpg');

    await expect(page).toHaveScreenshot('image-uploaded.png');
  });

  test('should match loading state', async ({ page }) => {
    // Mock slow response
    await page.route('**/api/analyze', async route => {
      await new Promise(resolve => setTimeout(resolve, 3000));
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
    await page.fill('[name="strain"]', 'Test');
    await page.fill('[name="leafSymptoms"]', 'Test');
    await page.click('[data-testid="submit-analysis"]');

    await expect(page).toHaveScreenshot('loading-state.png');
  });

  test('should match analysis results layout', async ({ page }) => {
    // Mock successful analysis
    await page.route('**/api/analyze', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          analysis: {
            diagnosis: 'Nitrogen Deficiency',
            confidence: 92,
            severity: 'moderate',
            symptomsMatched: ['Yellowing leaves', 'Stunted growth'],
            treatment: ['Apply nitrogen fertilizer'],
            healthScore: 65,
            imageAnalysis: {
              hasImage: true,
              visualFindings: ['Visible deficiency symptoms']
            }
          }
        })
      });
    });

    await page.click('[data-testid="analyze-tab"]');
    await page.fill('[name="strain"]', 'Test');
    await page.fill('[name="leafSymptoms"]', 'Yellowing leaves');
    await page.click('[data-testid="submit-analysis"]');

    await expect(page.locator('[data-testid="analysis-results"]')).toBeVisible();
    await expect(page).toHaveScreenshot('analysis-results.png');
  });

  test('should match error state', async ({ page }) => {
    // Mock error response
    await page.route('**/api/analyze', async route => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Invalid request data'
        })
      });
    });

    await page.click('[data-testid="analyze-tab"]');
    await page.click('[data-testid="submit-analysis"]');

    await expect(page).toHaveScreenshot('error-state.png');
  });

  test('should match mobile analysis form', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.click('[data-testid="analyze-tab"]');

    await expect(page).toHaveScreenshot('mobile-analysis-form.png');

    // Test filled form on mobile
    await page.fill('[name="strain"]', 'Mobile Test');
    await page.fill('[name="leafSymptoms"]', 'Mobile symptoms');

    await expect(page).toHaveScreenshot('mobile-form-filled.png');
  });

  test('should match tablet analysis form', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.click('[data-testid="analyze-tab"]');

    await expect(page).toHaveScreenshot('tablet-analysis-form.png');
  });

  test('should match dark mode interface', async ({ page }) => {
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
    });

    await page.click('[data-testid="analyze-tab"]');

    await expect(page).toHaveScreenshot('dark-mode-form.png');
  });

  test('should match validation errors UI', async ({ page }) => {
    await page.click('[data-testid="analyze-tab"]');

    // Try to submit without filling form
    await page.click('[data-testid="submit-analysis"]');

    await expect(page).toHaveScreenshot('validation-errors.png');
  });

  test('should match analysis history page', async ({ page }) => {
    await page.click('[data-testid="history-tab"]');

    await expect(page).toHaveScreenshot('analysis-history.png');
  });

  test('should match settings page', async ({ page }) => {
    await page.goto('/settings');

    await expect(page).toHaveScreenshot('settings-page.png');
  });

  test('should match AI provider configuration', async ({ page }) => {
    await page.goto('/settings');

    await page.click('[data-testid="ai-provider-section"]');

    await expect(page).toHaveScreenshot('ai-provider-config.png');
  });

  test('should match dashboard overview', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(page).toHaveScreenshot('dashboard-overview.png');
  });

  test('should match plant list view', async ({ page }) => {
    await page.goto('/plants');

    await expect(page).toHaveScreenshot('plant-list.png');
  });

  test('should match strain catalog', async ({ page }) => {
    await page.goto('/strains');

    await expect(page).toHaveScreenshot('strain-catalog.png');
  });

  test('should match automation settings', async ({ page }) => {
    await page.goto('/automation');

    await expect(page).toHaveScreenshot('automation-settings.png');
  });
});
