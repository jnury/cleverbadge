import { test, expect } from '@playwright/test';

test.describe('Assessments List', () => {
  // Helper function to login
  async function login(page) {
    await page.goto('/admin/login');
    await page.fill('input#username', 'admin');
    await page.fill('input#password', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/admin');
  }

  test('should display assessments tab', async ({ page }) => {
    await login(page);

    // Click Assessments tab
    await page.click('button:has-text("Assessments")');

    // Check header
    await expect(page.locator('h2')).toContainText('Assessments');
    await expect(page.locator('text=/View all candidate assessment results/i')).toBeVisible();
  });

  test('should show empty state when no assessments', async ({ page }) => {
    await login(page);
    await page.click('button:has-text("Assessments")');

    // Wait for data to load
    await page.waitForTimeout(500);

    // Should show appropriate message (either no assessments or showing count)
    const pageContent = await page.textContent('body');
    expect(pageContent).toMatch(/(No assessments|Showing \d+ of \d+ assessments)/);
  });

  test('should display filter controls', async ({ page }) => {
    await login(page);
    await page.click('button:has-text("Assessments")');

    // Check filter controls exist
    await expect(page.locator('label:has-text("Filter by Test")')).toBeVisible();
    await expect(page.locator('label:has-text("Filter by Status")')).toBeVisible();
    await expect(page.locator('label:has-text("Sort by")')).toBeVisible();

    // Check dropdowns exist
    await expect(page.locator('select').nth(0)).toBeVisible(); // Test filter
    await expect(page.locator('select').nth(1)).toBeVisible(); // Status filter
    await expect(page.locator('select').nth(2)).toBeVisible(); // Sort
  });

  test('should filter by status', async ({ page }) => {
    await login(page);
    await page.click('button:has-text("Assessments")');

    // Wait for data to load
    await page.waitForTimeout(500);

    // Select COMPLETED status
    const statusFilter = page.locator('select').nth(1);
    await statusFilter.selectOption('COMPLETED');

    // Filter should be applied (value should be set)
    const selectedValue = await statusFilter.inputValue();
    expect(selectedValue).toBe('COMPLETED');
  });

  test('should filter by test', async ({ page }) => {
    await login(page);
    await page.click('button:has-text("Assessments")');

    // Wait for data to load
    await page.waitForTimeout(500);

    // Check if test filter dropdown has options
    const testFilter = page.locator('select').nth(0);
    await expect(testFilter).toBeVisible();

    // Check for "All Tests" option
    const options = await testFilter.locator('option').allTextContents();
    expect(options).toContain('All Tests');
  });

  test('should change sort order', async ({ page }) => {
    await login(page);
    await page.click('button:has-text("Assessments")');

    // Wait for data to load
    await page.waitForTimeout(500);

    // Select sort option
    const sortSelect = page.locator('select').nth(2);
    await sortSelect.selectOption('score-desc');

    // Verify selection
    const selectedValue = await sortSelect.inputValue();
    expect(selectedValue).toBe('score-desc');

    // Try another sort option
    await sortSelect.selectOption('name-asc');
    const newValue = await sortSelect.inputValue();
    expect(newValue).toBe('name-asc');
  });

  test('should display table headers when assessments exist', async ({ page }) => {
    await login(page);
    await page.click('button:has-text("Assessments")');

    // Wait for data to load
    await page.waitForTimeout(500);

    const pageContent = await page.textContent('body');

    // If there are assessments, check for table headers
    if (pageContent.includes('Showing') && !pageContent.includes('Showing 0 of 0')) {
      await expect(page.locator('th:has-text("Candidate")')).toBeVisible();
      await expect(page.locator('th:has-text("Test")')).toBeVisible();
      await expect(page.locator('th:has-text("Status")')).toBeVisible();
      await expect(page.locator('th:has-text("Score")')).toBeVisible();
      await expect(page.locator('th:has-text("Started")')).toBeVisible();
      await expect(page.locator('th:has-text("Completed")')).toBeVisible();
    }
  });

  test('should show count of filtered assessments', async ({ page }) => {
    await login(page);
    await page.click('button:has-text("Assessments")');

    // Wait for data to load
    await page.waitForTimeout(500);

    // Should show count
    await expect(page.locator('text=/Showing \\d+ of \\d+ assessments/i')).toBeVisible();
  });

  test('should handle loading state', async ({ page }) => {
    await login(page);

    // Navigate to assessments
    await page.click('button:has-text("Assessments")');

    // Loading spinner should appear briefly or data should load
    // We just verify the page doesn't error out
    await page.waitForTimeout(1000);

    // Page should be stable
    await expect(page.locator('h2:has-text("Assessments")')).toBeVisible();
  });
});
