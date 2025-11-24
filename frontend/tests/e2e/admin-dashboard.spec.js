import { test, expect } from '@playwright/test';

test.describe('Admin Dashboard', () => {
  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/admin');

    // Should redirect to login
    await page.waitForURL('/admin/login');
    await expect(page.locator('h2')).toContainText('Admin Login');
  });

  test('should display dashboard after login', async ({ page }) => {
    // Login first
    await page.goto('/admin/login');
    await page.fill('input#username', 'admin');
    await page.fill('input#password', 'admin123');
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL('/admin');

    // Check dashboard elements
    await expect(page.locator('h1')).toContainText('Admin Dashboard');
    await expect(page.locator('text=/Welcome.*admin/i')).toBeVisible();

    // Check tabs
    await expect(page.locator('button:has-text("Tests")')).toBeVisible();
    await expect(page.locator('button:has-text("Questions")')).toBeVisible();
    await expect(page.locator('button:has-text("Assessments")')).toBeVisible();
    await expect(page.locator('button:has-text("Analytics")')).toBeVisible();
  });

  test('should switch between tabs', async ({ page }) => {
    // Login and go to dashboard
    await page.goto('/admin/login');
    await page.fill('input#username', 'admin');
    await page.fill('input#password', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/admin');

    // Click Questions tab and wait for content to load
    await page.locator('button:has-text("Questions")').click();
    await expect(page.locator('h2:has-text("Questions")')).toBeVisible({ timeout: 10000 });

    // Click Assessments tab and wait for content to load
    await page.locator('button:has-text("Assessments")').click();
    await expect(page.locator('h2:has-text("Assessments")')).toBeVisible({ timeout: 10000 });
  });

  test('should logout and redirect to login', async ({ page }) => {
    // Login and go to dashboard
    await page.goto('/admin/login');
    await page.fill('input#username', 'admin');
    await page.fill('input#password', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/admin');

    // Click logout
    await page.click('button:has-text("Logout")');

    // Should redirect to login
    await page.waitForURL('/admin/login');

    // Token should be cleared
    const token = await page.evaluate(() => localStorage.getItem('auth_token'));
    expect(token).toBeNull();
  });
});
