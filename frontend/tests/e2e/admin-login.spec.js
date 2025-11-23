import { test, expect } from '@playwright/test';

test.describe('Admin Login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/login');
  });

  test('should display login form', async ({ page }) => {
    await expect(page.locator('h2')).toContainText('Admin Login');
    await expect(page.locator('input#username')).toBeVisible();
    await expect(page.locator('input#password')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toContainText('Login');
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.fill('input#username', 'wronguser');
    await page.fill('input#password', 'wrongpass');
    await page.click('button[type="submit"]');

    await expect(page.locator('.bg-red-50')).toBeVisible();
    await expect(page.locator('.bg-red-50')).toContainText(/credentials/i);
  });

  test('should login with valid credentials', async ({ page }) => {
    // Use test admin credentials
    await page.fill('input#username', 'admin');
    await page.fill('input#password', 'admin123');
    await page.click('button[type="submit"]');

    // Should redirect to /admin
    await page.waitForURL('/admin');

    // Token should be stored
    const token = await page.evaluate(() => localStorage.getItem('auth_token'));
    expect(token).toBeTruthy();
  });

  test('should redirect if already logged in', async ({ page }) => {
    // Set up logged in state
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'test-token');
      localStorage.setItem('auth_user', JSON.stringify({ username: 'admin' }));
    });

    // Visit login page
    await page.goto('/admin/login');

    // Should redirect to /admin
    await page.waitForURL('/admin');
  });
});
