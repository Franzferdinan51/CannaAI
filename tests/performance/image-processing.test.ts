/**
 * Browser-level performance checks for the current photo-analysis workflow.
 * These checks use an in-memory fixture so CI remains hermetic.
 */
import { test, expect, type Page } from '@playwright/test';

const tinyPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

const upload = async (page: Page, name = 'plant.png') => {
  await page.goto('/photo-analysis');
  await page.locator('[data-testid="plant-image-input"]').setInputFiles({
    name,
    mimeType: 'image/png',
    buffer: tinyPng,
  });
  await expect(page.locator('[data-testid="image-preview"]')).toBeVisible();
};

test.describe('Photo analysis performance', () => {
  test('renders an uploaded image promptly', async ({ page }) => {
    const started = Date.now();
    await upload(page);
    expect(Date.now() - started).toBeLessThan(5000);
  });

  test('supports repeated uploads without losing the preview', async ({ page }) => {
    await page.goto('/photo-analysis');
    const input = page.locator('[data-testid="plant-image-input"]');

    for (let index = 0; index < 5; index += 1) {
      await input.setInputFiles({ name: `plant-${index}.png`, mimeType: 'image/png', buffer: tinyPng });
      await expect(page.locator('[data-testid="image-preview"]')).toBeVisible();
    }
  });

  test('handles concurrent photo preparation in separate sessions', async ({ browser }) => {
    const contexts = await Promise.all([browser.newContext(), browser.newContext(), browser.newContext()]);
    const pages = await Promise.all(contexts.map((context) => context.newPage()));
    const started = Date.now();

    try {
      await Promise.all(pages.map((page, index) => upload(page, `concurrent-${index}.png`)));
      expect(Date.now() - started).toBeLessThan(15000);
    } finally {
      await Promise.all(contexts.map((context) => context.close()));
    }
  });
});
