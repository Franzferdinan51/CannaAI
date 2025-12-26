/**
 * E2E Tests for Batch Analysis Workflow
 */

import { test, expect } from '@playwright/test';

test.describe('Batch Analysis Workflow E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Mock batch analysis API
    await page.route('**/api/automation/batch**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          batchId: 'batch-test-id-123',
          status: 'pending',
          totalCount: 5,
          completedCount: 0,
          failedCount: 0
        })
      });
    });

    await page.route('**/api/plants/batch-update**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          updatedCount: 5
        })
      });
    });

    await page.goto('/');
  });

  test('should create and execute batch analysis', async ({ page }) => {
    // Navigate to batch analysis
    await page.click('[data-testid="batch-analysis-tab"]');
    await expect(page.locator('[data-testid="batch-analysis-page"]')).toBeVisible();

    // Step 1: Select plants for batch analysis
    await page.click('[data-testid="select-all-plants"]');
    await expect(page.locator('[data-testid="plant-checkbox"]')).toHaveCount(5);

    // Step 2: Configure batch settings
    await page.selectOption('[name="analysisType"]', 'photo');
    await page.check('[name="includeImageAnalysis"]');
    await page.check('[name="saveResults"]');
    await page.selectOption('[name="priority"]', 'normal');

    // Step 3: Set schedule (immediate)
    await page.click('[data-testid="schedule-immediate"]');

    // Step 4: Start batch analysis
    await page.click('[data-testid="start-batch-analysis"]');

    // Step 5: Verify batch started
    await expect(page.locator('[data-testid="batch-progress-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="batch-status"]')).toContainText('pending');
    await expect(page.locator('[data-testid="batch-progress-bar"]')).toBeVisible();

    // Step 6: Monitor progress
    await expect(page.locator('[data-testid="total-count"]')).toContainText('5');
    await expect(page.locator('[data-testid="pending-count"]')).toContainText('5');

    // Mock progress updates
    await page.route('**/api/automation/batch/**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          batchId: 'batch-test-id-123',
          status: 'running',
          totalCount: 5,
          completedCount: 3,
          failedCount: 0,
          results: [
            { plantId: 'plant-1', status: 'completed', analysis: { diagnosis: 'Healthy' } },
            { plantId: 'plant-2', status: 'completed', analysis: { diagnosis: 'Nitrogen deficiency' } },
            { plantId: 'plant-3', status: 'completed', analysis: { diagnosis: 'Healthy' } }
          ]
        })
      });
    });

    await page.waitForTimeout(2000);

    // Verify progress
    await expect(page.locator('[data-testid="completed-count"]')).toContainText('3');
    await expect(page.locator('[data-testid="progress-percentage"]')).toContainText('60%');

    // Mock completion
    await page.route('**/api/automation/batch/**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          batchId: 'batch-test-id-123',
          status: 'completed',
          totalCount: 5,
          completedCount: 5,
          failedCount: 0,
          results: Array.from({ length: 5 }, (_, i) => ({
            plantId: `plant-${i + 1}`,
            status: 'completed',
            analysis: { diagnosis: `Analysis ${i + 1}` }
          }))
        })
      });
    });

    await page.waitForTimeout(2000);

    // Verify completion
    await expect(page.locator('[data-testid="batch-status"]')).toContainText('completed');
    await expect(page.locator('[data-testid="completed-count"]')).toContainText('5');
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Batch completed');
  });

  test('should schedule batch analysis for later', async ({ page }) => {
    await page.click('[data-testid="batch-analysis-tab"]');

    await page.click('[data-testid="select-all-plants"]');

    // Select scheduled analysis
    await page.click('[data-testid="schedule-later"]');

    // Set date and time
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow
    await page.fill('[name="scheduleDate"]', futureDate.toISOString().split('T')[0]);
    await page.fill('[name="scheduleTime"]', '10:00');

    // Set recurrence
    await page.selectOption('[name="recurrence"]', 'daily');

    await page.click('[data-testid="save-schedule"]');

    // Verify schedule saved
    await expect(page.locator('[data-testid="schedule-summary"]')).toContainText('daily');
    await expect(page.locator('[data-testid="next-run"]')).toBeVisible();
  });

  test('should filter and select specific plants', async ({ page }) => {
    await page.click('[data-testid="batch-analysis-tab"]');

    // Filter by strain
    await page.click('[data-testid="filter-strain"]');
    await page.click('[data-testid="strain-indica"]');

    // Verify filtered results
    await expect(page.locator('[data-testid="plant-list"]')).toContainText('Indica');

    // Select filtered plants
    await page.click('[data-testid="select-filtered-plants"]');
    const selectedCount = await page.locator('[data-testid="selected-count"]').textContent();
    expect(selectedCount).toBeTruthy();

    // Clear filter and select all
    await page.click('[data-testid="clear-filter"]');
    await page.click('[data-testid="select-all-plants"]');
  });

  test('should view batch analysis history', async ({ page }) => {
    await page.click('[data-testid="batch-analysis-tab"]');

    // Navigate to history
    await page.click('[data-testid="batch-history-tab"]');

    // Verify history table
    await expect(page.locator('[data-testid="history-table"]')).toBeVisible();
    await expect(page.locator('[data-testid="history-header"]')).toContainText('Batch ID');
    await expect(page.locator('[data-testid="history-header"]')).toContainText('Status');

    // Mock history data
    const historyItems = page.locator('[data-testid="history-item"]');
    await expect(historyItems.first()).toBeVisible();
  });

  test('should export batch results', async ({ page }) => {
    // Mock completed batch
    await page.route('**/api/automation/batch/**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          batchId: 'batch-test-id-123',
          status: 'completed',
          totalCount: 5,
          completedCount: 5,
          failedCount: 0,
          results: Array.from({ length: 5 }, (_, i) => ({
            plantId: `plant-${i + 1}`,
            plantName: `Plant ${i + 1}`,
            status: 'completed',
            analysis: { diagnosis: `Analysis ${i + 1}`, confidence: 90 + i }
          }))
        })
      });
    });

    await page.click('[data-testid="batch-analysis-tab"]');
    await page.click('[data-testid="batch-history-tab"]');

    // Select a batch to export
    await page.click('[data-testid="history-item"] .export-button');

    // Export as CSV
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="export-csv"]');
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/batch-results-\d+\.csv$/);

    // Export as PDF
    const downloadPromise2 = page.waitForEvent('download');
    await page.click('[data-testid="export-pdf"]');
    const download2 = await downloadPromise2;

    expect(download2.suggestedFilename()).toMatch(/batch-report-\d+\.pdf$/);
  });

  test('should handle batch analysis failures', async ({ page }) => {
    await page.click('[data-testid="batch-analysis-tab"]');

    await page.click('[data-testid="select-all-plants"]');

    // Start batch
    await page.click('[data-testid="start-batch-analysis"]');

    // Mock some failures
    await page.route('**/api/automation/batch/**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          batchId: 'batch-test-id-123',
          status: 'completed',
          totalCount: 5,
          completedCount: 3,
          failedCount: 2,
          results: [
            { plantId: 'plant-1', status: 'completed', analysis: {} },
            { plantId: 'plant-2', status: 'completed', analysis: {} },
            { plantId: 'plant-3', status: 'completed', analysis: {} },
            { plantId: 'plant-4', status: 'failed', error: 'AI provider unavailable' },
            { plantId: 'plant-5', status: 'failed', error: 'Invalid image format' }
          ]
        })
      });
    });

    await page.waitForTimeout(2000);

    // Verify failure handling
    await expect(page.locator('[data-testid="failed-count"]')).toContainText('2');
    await expect(page.locator('[data-testid="batch-status"]')).toContainText('completed with failures');

    // View failure details
    await page.click('[data-testid="view-failures"]');
    await expect(page.locator('[data-testid="failure-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="failure-item"]')).toHaveCount(2);
  });

  test('should cancel running batch', async ({ page }) => {
    await page.click('[data-testid="batch-analysis-tab"]');

    await page.click('[data-testid="select-all-plants"]');
    await page.click('[data-testid="start-batch-analysis"]');

    await expect(page.locator('[data-testid="batch-progress-modal"]')).toBeVisible();

    // Cancel batch
    await page.click('[data-testid="cancel-batch"]');

    // Mock cancellation
    await page.route('**/api/automation/batch/**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          batchId: 'batch-test-id-123',
          status: 'cancelled',
          totalCount: 5,
          completedCount: 2,
          failedCount: 0
        })
      });
    });

    await page.waitForTimeout(1000);

    // Verify cancellation
    await expect(page.locator('[data-testid="batch-status"]')).toContainText('cancelled');
    await expect(page.locator('[data-testid="cancellation-message"]')).toContainText('Batch cancelled');
  });

  test('should retry failed batch', async ({ page }) => {
    await page.click('[data-testid="batch-analysis-tab"]');
    await page.click('[data-testid="batch-history-tab"]');

    // Find failed batch
    await page.click('[data-testid="history-item"].failed');

    // Retry failed batch
    await page.click('[data-testid="retry-batch"]');

    // Confirm retry
    await page.click('[data-testid="confirm-retry"]');

    // Should show progress modal again
    await expect(page.locator('[data-testid="batch-progress-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="batch-status"]')).toContainText('pending');
  });

  test('should pause and resume batch', async ({ page }) => {
    await page.click('[data-testid="batch-analysis-tab"]');
    await page.click('[data-testid="select-all-plants"]');
    await page.click('[data-testid="start-batch-analysis"]');

    await expect(page.locator('[data-testid="batch-progress-modal"]')).toBeVisible();

    // Pause batch
    await page.click('[data-testid="pause-batch"]');
    await expect(page.locator('[data-testid="batch-status"]')).toContainText('paused');

    // Resume batch
    await page.click('[data-testid="resume-batch"]');
    await expect(page.locator('[data-testid="batch-status"]')).toContainText('running');
  });

  test('should configure batch notification settings', async ({ page }) => {
    await page.click('[data-testid="batch-analysis-tab"]');

    // Open notification settings
    await page.click('[data-testid="notification-settings"]');

    // Configure notifications
    await page.check('[data-testid="notify-on-start"]');
    await page.check('[data-testid="notify-on-progress"]');
    await page.check('[data-testid="notify-on-completion"]');
    await page.check('[data-testid="notify-on-failure"]');

    // Set email
    await page.fill('[name="notificationEmail"]', 'test@example.com');

    // Save settings
    await page.click('[data-testid="save-notification-settings"]');

    await expect(page.locator('[data-testid="save-success"]')).toContainText('Settings saved');
  });

  test('should display batch analytics', async ({ page }) => {
    await page.click('[data-testid="batch-analysis-tab"]');
    await page.click('[data-testid="batch-analytics-tab"]');

    // Verify analytics charts
    await expect(page.locator('[data-testid="success-rate-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="processing-time-chart"]')).toBeVisible();

    // Verify statistics
    await expect(page.locator('[data-testid="total-batches"]')).toBeVisible();
    await expect(page.locator('[data-testid="avg-processing-time"]')).toBeVisible();
    await expect(page.locator('[data-testid="success-rate"]')).toBeVisible();
  });

  test('should create batch template', async ({ page }) => {
    await page.click('[data-testid="batch-analysis-tab"]');

    // Create new template
    await page.click('[data-testid="create-template"]');
    await page.fill('[name="templateName"]', 'Daily Health Check');
    await page.fill('[name="templateDescription"]', 'Automated daily plant health analysis');

    // Configure template
    await page.selectOption('[name="analysisType"]', 'photo');
    await page.check('[name="includeImageAnalysis"]');
    await page.selectOption('[name="recurrence"]', 'daily');

    // Select all plants by default
    await page.check('[name="applyToAllPlants"]');

    // Save template
    await page.click('[data-testid="save-template"]');

    await expect(page.locator('[data-testid="template-saved"]')).toContainText('Template saved');
  });

  test('should use batch template', async ({ page }) => {
    await page.click('[data-testid="batch-analysis-tab"]');

    // Select existing template
    await page.click('[data-testid="template-selector"]');
    await page.click('[data-testid="template-daily-health-check"]');

    // Verify template applied
    await expect(page.locator('[data-testid="template-name"]')).toContainText('Daily Health Check');

    // Start batch with template
    await page.click('[data-testid="start-batch-from-template"]');

    await expect(page.locator('[data-testid="batch-progress-modal"]')).toBeVisible();
  });
});

test.describe('Batch Analysis - Error Handling', () => {
  test('should handle insufficient plants selected', async ({ page }) => {
    await page.click('[data-testid="batch-analysis-tab"]');

    // Don't select any plants
    await page.click('[data-testid="start-batch-analysis"]');

    // Should show error
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Select at least one plant');
  });

  test('should handle duplicate batch name', async ({ page }) => {
    await page.click('[data-testid="batch-analysis-tab"]');

    await page.click('[data-testid="select-all-plants"]');

    // Try to start batch with duplicate name
    await page.fill('[name="batchName"]', 'Duplicate Batch');
    await page.click('[data-testid="start-batch-analysis"]');

    // Mock duplicate error
    await page.route('**/api/automation/batch**', async route => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'A batch with this name already exists'
        })
      });
    });

    await expect(page.locator('[data-testid="error-message"]')).toContainText('already exists');
  });

  test('should handle AI provider quota exceeded', async ({ page }) => {
    await page.click('[data-testid="batch-analysis-tab"]');

    await page.click('[data-testid="select-all-plants"]');
    await page.click('[data-testid="start-batch-analysis"]');

    // Mock quota exceeded error
    await page.route('**/api/automation/batch**', async route => {
      await route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'AI provider quota exceeded'
        })
      });
    });

    await expect(page.locator('[data-testid="quota-error"]')).toContainText('quota exceeded');
    await expect(page.locator('[data-testid="upgrade-options"]')).toBeVisible();
  });
});
