import { test, expect } from '@playwright/test';

test.describe('Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('should display login page with form elements', async ({ page }) => {
    // Page should be visible (h2 with "Welcome back" text)
    await expect(page.locator('h2:has-text("Welcome back")')).toBeVisible();
    await expect(page.locator('input[placeholder="you@example.com"]')).toBeVisible();
    await expect(page.locator('input[placeholder="Enter your password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]:has-text("Sign in")')).toBeVisible();
  });

  test('should have link to register page', async ({ page }) => {
    // Should have link to register
    await expect(page.locator('a[href="/register"]')).toBeVisible();
  });

  test('should have link to forgot password page', async ({ page }) => {
    // Should have link to forgot password
    await expect(page.locator('a[href="/forgot-password"]')).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    // Fill in wrong credentials
    await page.fill('input[placeholder="you@example.com"]', 'wronguser');
    await page.fill('input[placeholder="Enter your password"]', 'wrongpass');
    await page.click('button[type="submit"]:has-text("Sign in")');

    // Should show error message
    await expect(page.locator('.bg-red-50')).toBeVisible();
    await expect(page.locator('.bg-red-50')).toContainText(/credentials/i);
  });

  test('should login with valid credentials', async ({ page }) => {
    // Use test admin credentials
    await page.fill('input[placeholder="you@example.com"]', 'admin');
    await page.fill('input[placeholder="Enter your password"]', 'admin123');
    await page.click('button[type="submit"]:has-text("Sign in")');

    // Should redirect to dashboard
    await page.waitForURL('/dashboard', { timeout: 10000 });

    // Token should be stored
    const token = await page.evaluate(() => localStorage.getItem('auth_token'));
    expect(token).toBeTruthy();
  });

  test('should redirect to dashboard if already logged in', async ({ page }) => {
    // Set up logged in state
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'test-token');
      localStorage.setItem('auth_user', JSON.stringify({ username: 'admin' }));
    });

    // Go to login page
    await page.goto('/login');

    // Should redirect to dashboard
    await page.waitForURL('/dashboard', { timeout: 5000 });
  });

  test('should show Dashboard button when already logged in on homepage', async ({ page }) => {
    // Set up logged in state
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'test-token');
      localStorage.setItem('auth_user', JSON.stringify({ username: 'admin' }));
    });

    // Go to homepage
    await page.goto('/');

    // Should show Dashboard button in navigation instead of Login
    await expect(page.getByRole('navigation').getByRole('link', { name: 'Dashboard' })).toBeVisible();
  });
});
