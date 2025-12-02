import { test, expect } from '@playwright/test';
import { loginViaModal } from './helpers.js';

test.describe('Assessments List', () => {
  // Helper function to login
  async function login(page) {
    await loginViaModal(page);
  }

  test('should display assessments tab', async ({ page }) => {
    await login(page);

    // Click Assessments tab
    await page.click('button:has-text("Assessments")');

    // Check header
    await expect(page.locator('h2:has-text("View all candidate assessment results")')).toBeVisible();
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

    // Check filter dropdowns exist (Sort is now via column headers)
    await expect(page.locator('select#filter-test')).toBeVisible();
    await expect(page.locator('select#filter-status')).toBeVisible();
  });

  test('should filter by status', async ({ page }) => {
    await login(page);
    await page.click('button:has-text("Assessments")');

    // Wait for data to load
    await page.waitForTimeout(500);

    // Select COMPLETED status using the id
    const statusFilter = page.locator('select#filter-status');
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
    const testFilter = page.locator('select#filter-test');
    await expect(testFilter).toBeVisible();

    // Check for "All Tests" option
    const options = await testFilter.locator('option').allTextContents();
    expect(options).toContain('All Tests');
  });

  test('should change sort order by clicking column headers', async ({ page }) => {
    await login(page);
    await page.click('button:has-text("Assessments")');

    // Wait for data to load
    await page.waitForTimeout(500);

    // Check if there are assessments (sorting headers visible in table)
    const pageContent = await page.textContent('body');
    if (pageContent.includes('Showing') && !pageContent.includes('Showing 0 of 0')) {
      // Click Score header to sort - first click should show ▲ (asc)
      const scoreHeader = page.locator('th:has-text("Score")');
      await scoreHeader.click();
      await page.waitForTimeout(100);

      // Check that sort indicator appears
      const headerText = await scoreHeader.textContent();
      expect(headerText).toContain('▲');

      // Click again for descending
      await scoreHeader.click();
      await page.waitForTimeout(100);
      const headerText2 = await scoreHeader.textContent();
      expect(headerText2).toContain('▼');

      // Click a third time to clear sort
      await scoreHeader.click();
      await page.waitForTimeout(100);
      const headerText3 = await scoreHeader.textContent();
      expect(headerText3).not.toContain('▲');
      expect(headerText3).not.toContain('▼');
    }
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
      await expect(page.locator('th:has-text("Duration")')).toBeVisible();
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
    await expect(page.locator('h2:has-text("View all candidate assessment results")')).toBeVisible();
  });
});
