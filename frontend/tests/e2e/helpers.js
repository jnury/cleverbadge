// E2E test helper functions

/**
 * Login via the login page and navigate to dashboard
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} username - Username (default: 'admin')
 * @param {string} password - Password (default: 'admin123')
 */
export async function loginViaPage(page, username = 'admin', password = 'admin123') {
  // Go to login page
  await page.goto('/login');

  // Wait for login form to be visible (h2 with "Welcome back" text)
  await page.waitForSelector('h2:has-text("Welcome back")');

  // Fill in credentials using placeholder selectors
  await page.fill('input[placeholder="you@example.com"]', username);
  await page.fill('input[placeholder="Enter your password"]', password);

  // Submit form (button text is "Sign in")
  await page.click('button[type="submit"]:has-text("Sign in")');

  // Wait for redirect to dashboard
  await page.waitForURL('/dashboard', { timeout: 10000 });
}

// Alias for backward compatibility
export const loginViaModal = loginViaPage;
