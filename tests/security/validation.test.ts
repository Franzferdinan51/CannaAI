/** Browser-level validation checks for the shipped photo-analysis UI. */
import { test, expect, Page } from '@playwright/test';

const tinyPng = {
  name: 'plant.png',
  mimeType: 'image/png',
  buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64')
};

async function openAnalysis(page: Page) {
  await page.goto('/photo-analysis');
  await expect(page.getByText('Analyze Your Plant', { exact: true })).toBeVisible({ timeout: 15000 });
}

test.describe('Photo analysis security and validation', () => {
  test('rejects non-image uploads in the browser', async ({ page }) => {
    await openAnalysis(page);
    await page.locator('input[name="plantImage"]').setInputFiles({ name: 'payload.exe', mimeType: 'application/octet-stream', buffer: Buffer.from('not an image') });
    await expect(page.getByTestId('error-message')).toContainText('upload an image');
  });

  test('rejects uploads over the 10MB UI limit', async ({ page }) => {
    await openAnalysis(page);
    await page.locator('input[name="plantImage"]').setInputFiles({ name: 'large.jpg', mimeType: 'image/jpeg', buffer: Buffer.alloc(10 * 1024 * 1024 + 1) });
    await expect(page.getByTestId('error-message')).toContainText('less than 10MB');
  });

  test('enforces client-side length limits before submission', async ({ page }) => {
    await openAnalysis(page);
    const strain = page.locator('input[name="strain"]');
    await strain.fill('A'.repeat(10000));
    expect((await strain.inputValue()).length).toBeLessThanOrEqual(100);
    const symptoms = page.locator('textarea[name="leafSymptoms"]');
    await symptoms.fill('B'.repeat(2000));
    expect((await symptoms.inputValue()).length).toBeLessThanOrEqual(1000);
  });

  test('does not render response HTML as markup', async ({ page }) => {
    await page.route('**/api/analyze', async route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, analysis: { diagnosis: '<img src=x onerror=alert(1)>', confidence: 90, healthScore: 80 } }) }));
    await openAnalysis(page);
    await page.locator('input[name="plantImage"]').setInputFiles(tinyPng);
    await page.getByTestId('submit-analysis').click();
    await expect(page.getByTestId('diagnosis-title')).toContainText('<img');
    await expect(page.locator('[onerror]')).toHaveCount(0);
  });

  test('sends JSON with the required content type', async ({ page }) => {
    let contentType = '';
    await page.route('**/api/analyze', async route => {
      contentType = route.request().headers()['content-type'] || '';
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, analysis: { diagnosis: 'Test', confidence: 90 } }) });
    });
    await openAnalysis(page);
    await page.locator('input[name="plantImage"]').setInputFiles(tinyPng);
    await page.getByTestId('submit-analysis').click();
    await expect(page.getByTestId('analysis-results')).toBeVisible();
    expect(contentType).toContain('application/json');
  });

  test('shows API validation failures without exposing a stack trace', async ({ page }) => {
    await page.route('**/api/analyze', async route => route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ success: false, error: 'Invalid image format' }) }));
    await openAnalysis(page);
    await page.locator('input[name="plantImage"]').setInputFiles(tinyPng);
    await page.getByTestId('submit-analysis').click();
    await expect(page.getByTestId('error-message')).toContainText('Invalid image format');
    await expect(page.getByTestId('error-message')).not.toContainText(' at ');
  });

  test('rejects malformed image data at the API boundary', async ({ request }) => {
    const response = await request.post('/api/analyze', { data: { strain: 'Test', leafSymptoms: 'Test', plantImage: 'data:image/jpeg;base64,INVALID!!!' }, headers: { 'content-type': 'application/json' } });
    expect([400, 422, 500, 503]).toContain(response.status());
    expect((await response.json()).success).toBe(false);
  });

  test('serves security headers for the application page', async ({ page }) => {
    const response = await page.goto('/photo-analysis');
    const headers = response?.headers() || {};
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(['DENY', 'SAMEORIGIN']).toContain(headers['x-frame-options']);
    expect(headers['content-security-policy']).toBeTruthy();
  });
});
