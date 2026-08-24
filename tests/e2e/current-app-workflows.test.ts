import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const imageBuffer = () => Buffer.from(
  fs.readFileSync(path.join(process.cwd(), 'tests/fixtures/report-quality-sample.png.base64'), 'utf8').trim(),
  'base64',
);

const analysisResponse = {
  success: true,
  analysis: {
    diagnosis: 'Healthy Plant',
    confidence: 95,
    healthScore: 95,
    identifiedIssues: [],
    recommendations: { immediate: ['Continue the current regimen'], shortTerm: [], longTerm: [] },
  },
  imageInfo: { format: 'PNG', dimensions: '1x1' },
};

test.describe('Current CannaAI workflows', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/plants', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { plants: [] } }),
      });
    });
    await page.goto('/photo-analysis');
    await expect(page).toHaveTitle('CannaAI');
    await expect(page.getByText('Analyze Your Plant')).toBeVisible();
  });

  test('runs a mocked photo analysis and records local history', async ({ page }) => {
    await page.route('**/api/analyze', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(analysisResponse) });
    });

    await page.locator('[data-testid="plant-image-input"]').setInputFiles({
      name: 'plant.png',
      mimeType: 'image/png',
      buffer: imageBuffer(),
    });
    await expect(page.locator('[data-testid="image-preview"]')).toBeVisible();
    await page.fill('[name="strain"]', 'Granddaddy Purple');
    await page.fill('[name="leafSymptoms"]', 'Healthy green leaves');
    await page.click('[data-testid="submit-analysis"]');

    await expect(page.locator('[data-testid="analysis-results"]')).toBeVisible();
    await expect(page.locator('[data-testid="diagnosis-title"]')).toHaveText('Healthy Plant');
    await page.getByRole('button', { name: /History/ }).click();
    await expect(page.locator('[data-testid="analysis-results"]').getByText('Confidence: 95%')).toBeVisible();
  });

  test('surfaces invalid uploads and provider errors without crashing', async ({ page }) => {
    await page.locator('[data-testid="plant-image-input"]').setInputFiles({
      name: 'notes.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('not an image'),
    });
    await expect(page.locator('[data-testid="error-message"]')).toContainText('image file');

    await page.locator('[data-testid="plant-image-input"]').setInputFiles({
      name: 'plant.png',
      mimeType: 'image/png',
      buffer: imageBuffer(),
    });
    await page.route('**/api/analyze', async (route) => {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, error: { message: 'Local vision provider timed out' } }),
      });
    });
    await page.click('[data-testid="submit-analysis"]');
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Local vision provider timed out');
  });

  test('analyzes multiple photos sequentially with progress', async ({ page }) => {
    await page.route('**/api/analyze', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(analysisResponse) });
    });

    await page.locator('[data-testid="batch-image-input"]').setInputFiles([
      { name: 'plant-one.png', mimeType: 'image/png', buffer: imageBuffer() },
      { name: 'plant-two.png', mimeType: 'image/png', buffer: imageBuffer() },
    ]);
    await expect(page.locator('[data-testid="batch-image-card"]')).toHaveCount(2);
    await page.click('[data-testid="batch-analyze"]');
    await expect(page.locator('[data-testid="batch-image-status-complete"]')).toHaveCount(2, { timeout: 30000 });
  });
});
