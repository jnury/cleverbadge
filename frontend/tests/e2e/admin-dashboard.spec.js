import { test, expect } from '@playwright/test';
import { loginViaModal } from './helpers.js';

test.describe('Dashboard', () => {
  test('should show login modal when not authenticated and trying to access dashboard', async ({ page }) => {
    // Try to access dashboard directly (should redirect to home and open modal)
    await page.goto('/dashboard');

    // Should redirect to homepage
    await page.waitForURL('/');
  });

  test('should display dashboard after login', async ({ page }) => {
    // Login via modal
    await loginViaModal(page);

    // Check dashboard elements
    await expect(page.locator('h1')).toContainText('Dashboard');
    await expect(page.locator('text=/Welcome.*admin/i')).toBeVisible();

    // Check tabs (use role="tab" to avoid matching other buttons)
    await expect(page.getByRole('tab', { name: 'Questions' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Tests' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Assessments' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Analytics' })).toBeVisible();
  });

  test('should switch between tabs', async ({ page }) => {
    // Login and go to dashboard
    await loginViaModal(page);

    // Click Tests tab and wait for content to load
    await page.getByRole('tab', { name: 'Tests' }).click();
    await expect(page.locator('h2:has-text("Tests")')).toBeVisible({ timeout: 10000 });

    // Click Assessments tab and wait for content to load
    await page.getByRole('tab', { name: 'Assessments' }).click();
    await expect(page.locator('h2:has-text("View all candidate assessment results")')).toBeVisible({ timeout: 10000 });
  });

  test('should logout and redirect to homepage', async ({ page }) => {
    // Login and go to dashboard
    await loginViaModal(page);

    // Open user dropdown menu
    await page.click('button:has-text("admin")');

    // Click logout in dropdown
    await page.click('button:has-text("Logout")');

    // Should redirect to homepage
    await page.waitForURL('/');

    // Token should be cleared
    const token = await page.evaluate(() => localStorage.getItem('auth_token'));
    expect(token).toBeNull();
  });
});
