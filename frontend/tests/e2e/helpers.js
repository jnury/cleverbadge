// E2E test helper functions

/**
 * Login via the modal on the homepage and navigate to dashboard
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} username - Username (default: 'admin')
 * @param {string} password - Password (default: 'admin123')
 */
export async function loginViaModal(page, username = 'admin', password = 'admin123') {
  // Go to homepage first
  await page.goto('/');

  // Click Login button in navigation
  await page.getByRole('navigation').getByRole('button', { name: 'Login' }).click();

  // Wait for modal to be visible
  await page.waitForSelector('h2:has-text("Login")');

  // Fill in credentials
  await page.fill('input#login-username', username);
  await page.fill('input#login-password', password);

  // Submit form
  await page.click('button[type="submit"]:has-text("Login")');

  // Wait for auth to complete - Dashboard link appears in navigation
  await page.waitForSelector('nav a:has-text("Dashboard")', { timeout: 10000 });

  // Navigate to dashboard
  await page.goto('/dashboard');
  await page.waitForURL('/dashboard');
}
