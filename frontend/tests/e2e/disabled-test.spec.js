import { test, expect } from '@playwright/test';

test.describe('Disabled Test Access', () => {
  test('should show error for disabled test', async ({ page }) => {
    // Navigate to disabled test (from seed data: slug 'disabled-test')
    await page.goto('/t/disabled-test');

    try {
      // Should show error page since disabled tests now return 404
      await expect(page.locator('h1:has-text("Error")')).toBeVisible({ timeout: 5000 });
      await expect(page.getByText('Test not found or disabled')).toBeVisible();

      // Should not show start button
      await expect(page.locator('button:has-text("Start Test")')).not.toBeVisible();
    } catch (e) {
      console.log('Test failed. Page content:');
      console.log(await page.content());
      try {
        const apiUrlText = await page.locator('p:has-text("API:")').textContent();
        console.log('API URL on page:', apiUrlText);
      } catch (err) {
        console.log('API URL element not found');
      }
      throw e;
    }
  });
});
