import { test, expect } from '@playwright/test';
import { loginViaModal } from './helpers.js';

test.describe('Change Password', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await loginViaModal(page);
    // Wait for dashboard to be fully loaded
    await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible();
  });

  test('should open change password modal from dropdown', async ({ page }) => {
    // Click user dropdown
    await page.click('button:has-text("admin")');

    // Click Change Password option
    await page.click('button:has-text("Change Password")');

    // Modal should be visible
    await expect(page.locator('h3:has-text("Change Password")')).toBeVisible();
    await expect(page.locator('input#currentPassword')).toBeVisible();
    await expect(page.locator('input#newPassword')).toBeVisible();
    await expect(page.locator('input#confirmPassword')).toBeVisible();
  });

  test('should show error when passwords do not match', async ({ page }) => {
    // Open modal
    await page.click('button:has-text("admin")');
    await page.click('button:has-text("Change Password")');

    // Fill form with mismatched passwords
    await page.fill('input#currentPassword', 'admin123');
    await page.fill('input#newPassword', 'newpass123');
    await page.fill('input#confirmPassword', 'different');

    // Submit
    await page.click('button[type="submit"]:has-text("Change Password")');

    // Error should be visible
    await expect(page.locator('.bg-red-50')).toContainText('New passwords do not match');

    // Close modal to cleanup for next test
    await page.click('button:has-text("Cancel")');
  });

  test('should show error for incorrect current password', async ({ page }) => {
    // Open modal
    await page.click('button:has-text("admin")');
    await page.click('button:has-text("Change Password")');

    // Wait for modal to be visible
    await expect(page.locator('h3:has-text("Change Password")')).toBeVisible();

    // Fill form with wrong current password
    await page.fill('input#currentPassword', 'wrongpassword');
    await page.fill('input#newPassword', 'newpass123');
    await page.fill('input#confirmPassword', 'newpass123');

    // Submit
    await page.click('button[type="submit"]:has-text("Change Password")');

    // Error should be visible (wait for API response)
    await expect(page.locator('.bg-red-50')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.bg-red-50')).toContainText('Current password is incorrect');
  });

  test('should successfully change password and login with new password', async ({ page }) => {
    // Open modal
    await page.click('button:has-text("admin")');
    await page.click('button:has-text("Change Password")');

    // Fill form with valid data
    await page.fill('input#currentPassword', 'admin123');
    await page.fill('input#newPassword', 'newadmin456');
    await page.fill('input#confirmPassword', 'newadmin456');

    // Submit
    await page.click('button[type="submit"]:has-text("Change Password")');

    // Success message should appear
    await expect(page.locator('.bg-green-50')).toContainText('Password changed successfully');

    // Modal should close automatically
    await expect(page.locator('h3:has-text("Change Password")')).not.toBeVisible({ timeout: 3000 });

    // Logout
    await page.click('button:has-text("admin")');
    await page.click('button:has-text("Logout")');

    // Should redirect to homepage
    await page.waitForURL('/');

    // Login with new password via modal
    await page.getByRole('navigation').getByRole('button', { name: 'Login' }).click();
    await page.waitForSelector('h2:has-text("Login")');
    await page.fill('input#login-username', 'admin');
    await page.fill('input#login-password', 'newadmin456');
    await page.click('button[type="submit"]:has-text("Login")');

    // Should succeed - Dashboard link appears
    await page.waitForSelector('nav a:has-text("Dashboard")', { timeout: 10000 });
    await page.goto('/dashboard');
    await page.waitForURL('/dashboard');

    // Change password back to original for other tests
    await page.click('button:has-text("admin")');
    await page.click('button:has-text("Change Password")');
    await page.fill('input#currentPassword', 'newadmin456');
    await page.fill('input#newPassword', 'admin123');
    await page.fill('input#confirmPassword', 'admin123');
    await page.click('button[type="submit"]:has-text("Change Password")');
    await expect(page.locator('.bg-green-50')).toContainText('Password changed successfully');
  });

  test('should close modal when Cancel is clicked', async ({ page }) => {
    // Open modal
    await page.click('button:has-text("admin")');
    await page.click('button:has-text("Change Password")');

    // Modal should be visible
    await expect(page.locator('h3:has-text("Change Password")')).toBeVisible();

    // Click Cancel
    await page.click('button:has-text("Cancel")');

    // Modal should be closed
    await expect(page.locator('h3:has-text("Change Password")')).not.toBeVisible();
  });

  test('should close dropdown when clicking outside', async ({ page }) => {
    // Click user dropdown
    await page.click('button:has-text("admin")');

    // Dropdown should be visible
    await expect(page.locator('button:has-text("Change Password")')).toBeVisible();

    // Click outside
    await page.click('h1:has-text("Dashboard")');

    // Dropdown should be closed
    await expect(page.locator('.absolute.right-0.mt-2')).not.toBeVisible();
  });
});
