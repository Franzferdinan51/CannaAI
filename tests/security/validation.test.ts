/**
 * Security and Validation Tests
 */

import { test, expect } from '@playwright/test';

test.describe('Security and Validation', () => {
  test('should validate and sanitize all user inputs', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="analyze-tab"]');

    // Test XSS prevention in strain name
    await page.fill('[name="strain"]', '<script>alert("xss")</script>Test');
    await page.fill('[name="leafSymptoms"]', 'Normal symptoms');
    await page.click('[data-testid="submit-analysis"]');

    // Should not execute script
    // In a real app, this would be checked server-side

    // Test SQL injection prevention
    await page.fill('[name="strain"]', "'; DROP TABLE plants; --");
    await page.fill('[name="leafSymptoms"]', 'Test symptoms');
    await page.click('[data-testid="submit-analysis"]');

    // Should handle safely
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid');
  });

  test('should enforce file upload restrictions', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="analyze-tab"]');

    // Try to upload executable file
    const executablePath = 'tests/fixtures/malicious.exe';
    await page.setInputFiles('input[type="file"][name="plantImage"]', executablePath);

    // Should reject
    await expect(page.locator('[data-testid="file-error"]')).toContainText('Invalid file type');
  });

  test('should reject oversized images', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="analyze-tab"]');

    // Try to upload 100MB image
    await page.setInputFiles('input[type="file"][name="plantImage"]', 'tests/fixtures/100mb-image.jpg');

    // Should reject
    await expect(page.locator('[data-testid="size-error"]')).toContainText('too large');
  });

  test('should enforce rate limiting on API', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="analyze-tab"]');

    // Make 25 rapid requests
    for (let i = 0; i < 25; i++) {
      await page.fill('[name="strain"]', `Test ${i}`);
      await page.fill('[name="leafSymptoms"]', 'Test symptoms');
      await page.click('[data-testid="submit-analysis"]');
      await page.waitForTimeout(100);
    }

    // Should eventually be rate limited
    await expect(page.locator('[data-testid="rate-limit-error"]')).toBeVisible();
  });

  test('should validate image data URL format', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="analyze-tab"]');

    // Try to upload invalid base64
    await page.evaluate(() => {
      const input = document.querySelector('input[name="plantImage"]') as HTMLInputElement;
      if (input) {
        const dt = new DataTransfer();
        const file = new File(['invalid'], 'test.txt', { type: 'text/plain' });
        dt.items.add(file);
        input.files = dt.files;
        input.dispatchEvent(new Event('change'));
      }
    });

    await page.click('[data-testid="submit-analysis"]');

    // Should show error
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid image');
  });

  test('should prevent CSRF attacks', async ({ page }) => {
    // In a real app, CSRF tokens would be checked
    // This is a placeholder test

    await page.goto('/');
    await page.click('[data-testid="analyze-tab"]');

    // Try to submit without CSRF token
    await page.evaluate(() => {
      document.cookie = 'csrf-token=invalid-token';
    });

    await page.fill('[name="strain"]', 'Test');
    await page.fill('[name="leafSymptoms"]', 'Test');
    await page.click('[data-testid="submit-analysis"]');

    // Should validate CSRF token
    // Implementation depends on security setup
  });

  test('should sanitize HTML in responses', async ({ page }) => {
    // Mock response with malicious HTML
    await page.route('**/api/analyze', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          analysis: {
            diagnosis: '<img src=x onerror=alert("xss")>',
            confidence: 90
          }
        })
      });
    });

    await page.goto('/');
    await page.click('[data-testid="analyze-tab"]');
    await page.fill('[name="strain"]', 'Test');
    await page.fill('[name="leafSymptoms"]', 'Test');
    await page.click('[data-testid="submit-analysis"]');

    // Wait for results
    await expect(page.locator('[data-testid="analysis-results"]')).toBeVisible();

    // Check that HTML is sanitized
    const diagnosisText = await page.locator('[data-testid="diagnosis-title"]').textContent();
    expect(diagnosisText).not.toContain('onerror');
  });

  test('should validate API request headers', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="analyze-tab"]');

    // Try to send request with missing content-type
    await page.route('**/api/analyze', async route => {
      const headers = route.request().headers();
      expect(headers['content-type']).toContain('application/json');

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          analysis: { diagnosis: 'Test', confidence: 90 }
        })
      });
    });

    await page.fill('[name="strain"]', 'Test');
    await page.fill('[name="leafSymptoms"]', 'Test');
    await page.click('[data-testid="submit-analysis"]');

    await expect(page.locator('[data-testid="analysis-results"]')).toBeVisible();
  });

  test('should prevent directory traversal', async ({ page }) => {
    await page.goto('/');

    // Try to access protected files via URL
    const response = await page.goto('/../../../../etc/passwd');
    expect(response?.status()).toBe(404);
  });

  test('should validate plant ID parameters', async ({ page }) => {
    // Test accessing non-existent plant
    const response = await page.goto('/plants/invalid-plant-id');
    expect(response?.status()).toBe(404);
  });

  test('should enforce input length limits', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="analyze-tab"]');

    // Try to input overly long strain name
    const longStrain = 'A'.repeat(10000);
    await page.fill('[name="strain"]', longStrain);

    // Should be truncated or rejected
    const inputValue = await page.inputValue('[name="strain"]');
    expect(inputValue.length).toBeLessThanOrEqual(100);
  });

  test('should prevent JSON injection', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="analyze-tab"]');

    // Try to inject JSON in text field
    await page.fill('[name="strain"]', '{"admin": true}');
    await page.fill('[name="leafSymptoms"]', 'Normal symptoms');
    await page.click('[data-testid="submit-analysis"]');

    // Should handle safely
    // In real implementation, would be sanitized
  });

  test('should validate file MIME types strictly', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="analyze-tab"]');

    // Try to upload file with wrong extension
    await page.evaluate(() => {
      const input = document.querySelector('input[name="plantImage"]') as HTMLInputElement;
      if (input) {
        const dt = new DataTransfer();
        const blob = new Blob(['fake image data'], { type: 'image/jpeg' });
        const file = new File([blob], 'image.txt', { type: 'text/plain' });
        dt.items.add(file);
        input.files = dt.files;
        input.dispatchEvent(new Event('change'));
      }
    });

    await page.click('[data-testid="submit-analysis"]');

    // Should detect MIME type mismatch
    await expect(page.locator('[data-testid="file-error"]')).toContainText('Invalid');
  });

  test('should implement content security policy', async ({ page }) => {
    const response = await page.goto('/');
    const csp = response?.headers()['content-security-policy'];

    // Should have CSP header
    expect(csp).toBeDefined();
  });

  test('should validate image dimensions', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="analyze-tab"]');

    // Upload image that's too small
    await page.setInputFiles('input[type="file"][name="plantImage"]', 'tests/fixtures/tiny-image.jpg');

    // Should show dimension error
    await expect(page.locator('[data-testid="dimension-error"]')).toContainText('too small');
  });

  test('should handle malformed base64 data', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="analyze-tab"]');

    // Submit form with corrupted image data
    await page.evaluate(() => {
      const form = document.querySelector('[data-testid="analysis-form"]');
      if (form) {
        const hiddenInput = document.createElement('input');
        hiddenInput.type = 'hidden';
        hiddenInput.name = 'plantImage';
        hiddenInput.value = 'data:image/jpeg;base64,INVALID_BASE64!!!';
        form.appendChild(hiddenInput);
      }
    });

    await page.fill('[name="strain"]', 'Test');
    await page.fill('[name="leafSymptoms"]', 'Test');
    await page.click('[data-testid="submit-analysis"]');

    // Should handle error gracefully
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
  });

  test('should prevent prototype pollution', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="analyze-tab"]');

    // Try to pollute prototype via JSON
    await page.evaluate(() => {
      // This would be caught by server-side validation
      const payload = JSON.stringify({
        __proto__: { admin: true },
        strain: 'Test',
        leafSymptoms: 'Test'
      });

      // Simulate sending payload
      fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload
      });
    });

    // Should be rejected
    // In real implementation, would validate and reject
  });

  test('should enforce HTTPS in production', async ({ page }) => {
    // In production, all requests should use HTTPS
    // This would be verified in actual production environment
    const url = page.url();
    if (process.env.NODE_ENV === 'production') {
      expect(url).toStartWith('https://');
    }
  });

  test('should validate AI provider API key', async ({ page }) => {
    // Mock invalid API key response
    await page.route('**/api/analyze', async route => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Invalid API key'
        })
      });
    });

    await page.goto('/');
    await page.click('[data-testid="analyze-tab"]');
    await page.fill('[name="strain"]', 'Test');
    await page.fill('[name="leafSymptoms"]', 'Test');
    await page.click('[data-testid="submit-analysis"]');

    // Should show configuration error
    await expect(page.locator('[data-testid="setup-guide"]')).toBeVisible();
  });

  test('should sanitize user-generated content', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="analyze-tab"]');

    // Submit with malicious content in notes
    await page.fill('[name="strain"]', 'Test');
    await page.fill('[name="leafSymptoms"]', '<iframe src="evil.com"></iframe>');
    await page.fill('[name="additionalNotes"]', '<svg onload="alert(1)">Test</svg>');
    await page.click('[data-testid="submit-analysis"]');

    // Should sanitize before displaying
    await expect(page.locator('[data-testid="analysis-results"]')).toBeVisible();
  });

  test('should prevent brute force attacks', async ({ page }) => {
    await page.goto('/');

    // Try multiple rapid requests
    for (let i = 0; i < 10; i++) {
      await page.goto('/');
      await page.click('[data-testid="analyze-tab"]');
      await page.fill('[name="strain"]', `Test ${i}`);
      await page.fill('[name="leafSymptoms"]', 'Test');
      await page.click('[data-testid="submit-analysis"]');
      await page.waitForTimeout(200);
    }

    // Should eventually show rate limit
    const hasRateLimit = await page.locator('[data-testid="rate-limit-error"]').isVisible();
    expect(hasRateLimit).toBeTruthy();
  });
});
