import { test, expect } from '@playwright/test';

test.describe('Disabled Test Access', () => {
  test('should show error for disabled test', async ({ page }) => {
    // Navigate to disabled test (from seed data: slug 'disabled-test')
    await page.goto('/t/disabled-test');

    // Should show error message
    await expect(page.locator('text=/disabled|not available/i')).toBeVisible();

    // Should not show start button
    await expect(page.locator('button:has-text("Start Test")')).not.toBeVisible();
  });
});
