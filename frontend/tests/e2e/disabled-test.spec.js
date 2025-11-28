import { test, expect } from '@playwright/test';

test.describe('Disabled Test Access', () => {
  test('should show error for disabled test', async ({ page }) => {
    // Navigate to disabled test (from seed data: slug 'disabled-test')
    await page.goto('/t/disabled-test');

    // Should show that test is disabled (the page shows "This test is disabled" message)
    await expect(page.locator('text=This test is disabled')).toBeVisible();

    // Should not show start button
    await expect(page.locator('button:has-text("Start Test")')).not.toBeVisible();
  });
});
