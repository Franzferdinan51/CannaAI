/**
 * Performance Tests for Image Processing
 */

import { test, expect } from '@playwright/test';
import { measureAsyncOperation } from '@/tests/utils/test-utils';

test.describe('Image Processing Performance', () => {
  test('should process small images quickly', async ({ page }) => {
    const startTime = Date.now();

    // Upload small image
    await page.goto('/');
    await page.click('[data-testid="analyze-tab"]');
    await page.fill('[name="strain"]', 'Performance Test');
    await page.fill('[name="leafSymptoms"]', 'Test symptoms');

    const smallImagePath = 'tests/fixtures/small-image.jpg';
    await page.setInputFiles('input[type="file"][name="plantImage"]', smallImagePath);

    // Wait for image processing to complete
    await expect(page.locator('[data-testid="image-preview"]')).toBeVisible();

    const processingTime = Date.now() - startTime;

    // Small images should be processed in under 2 seconds
    expect(processingTime).toBeLessThan(2000);
  });

  test('should process medium images within acceptable time', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/');
    await page.click('[data-testid="analyze-tab"]');
    await page.fill('[name="strain"]', 'Medium Image Test');
    await page.fill('[name="leafSymptoms"]', 'Test symptoms');

    const mediumImagePath = 'tests/fixtures/medium-image.jpg';
    await page.setInputFiles('input[type="file"][name="plantImage"]', mediumImagePath);

    await expect(page.locator('[data-testid="image-preview"]')).toBeVisible();

    const processingTime = Date.now() - startTime;

    // Medium images should be processed in under 5 seconds
    expect(processingTime).toBeLessThan(5000);
  });

  test('should handle large images efficiently', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/');
    await page.click('[data-testid="analyze-tab"]');
    await page.fill('[name="strain"]', 'Large Image Test');
    await page.fill('[name="leafSymptoms"]', 'Test symptoms');

    const largeImagePath = 'tests/fixtures/large-image.jpg';
    await page.setInputFiles('input[type="file"][name="plantImage"]', largeImagePath);

    // Wait with longer timeout
    await expect(page.locator('[data-testid="image-preview"]')).toBeVisible({ timeout: 10000 });

    const processingTime = Date.now() - startTime;

    // Large images should be processed in under 10 seconds
    expect(processingTime).toBeLessThan(10000);
  });

  test('should compress images efficiently', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="analyze-tab"]');

    const largeImagePath = 'tests/fixtures/5mb-image.jpg';
    await page.setInputFiles('input[type="file"][name="plantImage"]', largeImagePath);

    await expect(page.locator('[data-testid="image-preview"]')).toBeVisible();

    // Get compressed size from UI
    const compressedSizeText = await page.locator('[data-testid="compressed-size"]').textContent();
    const originalSizeText = await page.locator('[data-testid="original-size"]').textContent();

    // Parse sizes (e.g., "512 KB", "5 MB")
    const parseSize = (text: string) => {
      const match = text?.match(/([\d.]+)\s*(\w+)/);
      if (!match) return 0;
      const value = parseFloat(match[1]);
      const unit = match[2].toUpperCase();
      const multipliers: Record<string, number> = {
        'B': 1,
        'KB': 1024,
        'MB': 1024 * 1024,
        'GB': 1024 * 1024 * 1024
      };
      return value * (multipliers[unit] || 1);
    };

    const compressedSize = parseSize(compressedSizeText || '');
    const originalSize = parseSize(originalSizeText || '');

    // Should achieve at least 50% compression
    const compressionRatio = (1 - compressedSize / originalSize) * 100;
    expect(compressionRatio).toBeGreaterThan(50);
  });

  test('should handle multiple image uploads sequentially', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/');
    await page.click('[data-testid="analyze-tab"]');

    // Upload 5 images sequentially
    for (let i = 1; i <= 5; i++) {
      await page.fill('[name="strain"]', `Image ${i}`);
      await page.fill('[name="leafSymptoms"]', 'Test symptoms');

      const imagePath = `tests/fixtures/sample-image-${i}.jpg`;
      await page.setInputFiles('input[type="file"][name="plantImage"]', imagePath);

      await expect(page.locator('[data-testid="image-preview"]')).toBeVisible();

      // Clear form for next upload
      await page.reload();
      await page.click('[data-testid="analyze-tab"]');
    }

    const totalTime = Date.now() - startTime;

    // Should handle 5 images in under 30 seconds
    expect(totalTime).toBeLessThan(30000);
  });

  test('should show loading states during processing', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="analyze-tab"]');

    // Mock slow image processing
    await page.route('**/api/analyze', async route => {
      await new Promise(resolve => setTimeout(resolve, 3000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          analysis: { diagnosis: 'Test', confidence: 90 }
        })
      });
    });

    await page.fill('[name="strain"]', 'Loading Test');
    await page.fill('[name="leafSymptoms"]', 'Test symptoms');

    const imagePath = 'tests/fixtures/sample-image.jpg';
    await page.setInputFiles('input[type="file"][name="plantImage"]', imagePath);

    // Should show processing indicator
    await expect(page.locator('[data-testid="processing-indicator"]')).toBeVisible();

    // Should show progress
    const progressText = await page.locator('[data-testid="processing-progress"]').textContent();
    expect(progressText).toContain('Processing');
  });

  test('should handle HEIC conversion efficiently', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/');
    await page.click('[data-testid="analyze-tab"]');
    await page.fill('[name="strain"]', 'HEIC Test');
    await page.fill('[name="leafSymptoms"]', 'Test symptoms');

    const heicImagePath = 'tests/fixtures/sample-image.heic';
    await page.setInputFiles('input[type="file"][name="plantImage"]', heicImagePath);

    await expect(page.locator('[data-testid="image-preview"]')).toBeVisible();

    const conversionTime = Date.now() - startTime;

    // HEIC conversion should complete within 5 seconds
    expect(conversionTime).toBeLessThan(5000);
  });

  test('should prevent memory leaks with image uploads', async ({ page }) => {
    const initialMemory = await page.evaluate(() => performance.memory?.usedJSHeapSize || 0);

    // Upload and process many images
    for (let i = 0; i < 10; i++) {
      await page.goto('/');
      await page.click('[data-testid="analyze-tab"]');

      await page.fill('[name="strain"]', `Memory Test ${i}`);
      await page.fill('[name="leafSymptoms"]', 'Test symptoms');

      const imagePath = 'tests/fixtures/sample-image.jpg';
      await page.setInputFiles('input[type="file"][name="plantImage"]', imagePath);

      await expect(page.locator('[data-testid="image-preview"]')).toBeVisible();
    }

    // Force garbage collection if available
    await page.evaluate(() => {
      if (window.gc) {
        window.gc();
      }
    });

    const finalMemory = await page.evaluate(() => performance.memory?.usedJSHeapSize || 0);
    const memoryIncrease = finalMemory - initialMemory;

    // Memory increase should be reasonable (< 100MB)
    expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
  });

  test('should handle concurrent image uploads', async ({ browser }) => {
    // Create 3 browser contexts for concurrent uploads
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const context3 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    const page3 = await context3.newPage();

    // Start all uploads simultaneously
    const startTime = Date.now();

    const uploadPromise1 = page1.goto('/');
    const uploadPromise2 = page2.goto('/');
    const uploadPromise3 = page3.goto('/');

    await Promise.all([uploadPromise1, uploadPromise2, uploadPromise3]);

    // Each page uploads an image
    await Promise.all([
      (async () => {
        await page1.click('[data-testid="analyze-tab"]');
        await page1.fill('[name="strain"]', 'Concurrent 1');
        const imagePath = 'tests/fixtures/sample-image.jpg';
        await page1.setInputFiles('input[type="file"][name="plantImage"]', imagePath);
        await expect(page1.locator('[data-testid="image-preview"]')).toBeVisible();
      })(),
      (async () => {
        await page2.click('[data-testid="analyze-tab"]');
        await page2.fill('[name="strain"]', 'Concurrent 2');
        const imagePath = 'tests/fixtures/sample-image.jpg';
        await page2.setInputFiles('input[type="file"][name="plantImage"]', imagePath);
        await expect(page2.locator('[data-testid="image-preview"]')).toBeVisible();
      })(),
      (async () => {
        await page3.click('[data-testid="analyze-tab"]');
        await page3.fill('[name="strain"]', 'Concurrent 3');
        const imagePath = 'tests/fixtures/sample-image.jpg';
        await page3.setInputFiles('input[type="file"][name="plantImage"]', imagePath);
        await expect(page3.locator('[data-testid="image-preview"]')).toBeVisible();
      })()
    ]);

    const totalTime = Date.now() - startTime;

    // Concurrent uploads should complete efficiently
    expect(totalTime).toBeLessThan(15000);

    await context1.close();
    await context2.close();
    await context3.close();
  });

  test('should optimize images for web display', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="analyze-tab"]');

    const largeImagePath = 'tests/fixtures/large-image.jpg';
    await page.setInputFiles('input[type="file"][name="plantImage"]', imagePath);

    await expect(page.locator('[data-testid="image-preview"]')).toBeVisible();

    // Check if image is optimized
    const imageElement = page.locator('[data-testid="image-preview"] img');
    const imageSrc = await imageElement.getAttribute('src');

    // Should be using webp or compressed jpeg
    if (imageSrc) {
      expect(imageSrc).toMatch(/\.(webp|jpe?g)/);
    }
  });

  test('should maintain image quality during processing', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="analyze-tab"]');

    const testImagePath = 'tests/fixtures/high-quality-image.jpg';
    await page.setInputFiles('input[type="file"][name="plantImage"]', imagePath);

    await expect(page.locator('[data-testid="image-preview"]')).toBeVisible();

    // Check quality indicator
    const qualityText = await page.locator('[data-testid="image-quality"]').textContent();
    const quality = parseInt(qualityText || '0');

    // Should maintain reasonable quality (80%+)
    expect(quality).toBeGreaterThanOrEqual(80);
  });
});
