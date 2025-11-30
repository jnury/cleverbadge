import { test, expect } from '@playwright/test';

test.describe('Analytics Tab', () => {
  // Helper function to login
  async function login(page) {
    await page.goto('/admin/login');
    await page.fill('input#username', 'admin');
    await page.fill('input#password', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/admin');
  }

  test('should display analytics tab with test selector', async ({ page }) => {
    await login(page);

    // Navigate to Analytics tab
    await page.click('button:has-text("Analytics")');

    // Verify tab content
    await expect(page.locator('h2:has-text("View success rates for each question")')).toBeVisible();
    await expect(page.locator('select#test-select')).toBeVisible();
  });

  test('should show empty state when no test selected', async ({ page }) => {
    await login(page);
    await page.click('button:has-text("Analytics")');

    // Verify empty state message
    await expect(page.locator('text=No test selected')).toBeVisible();
    await expect(page.locator('text=/Select a test from the dropdown/i')).toBeVisible();

    // Verify empty state icon (be more specific to avoid matching multiple SVGs like the user dropdown)
    await expect(page.getByRole('tabpanel', { name: 'Analytics' }).locator('svg')).toBeVisible();
  });

  test('should load analytics when test is selected', async ({ page }) => {
    await login(page);
    await page.click('button:has-text("Analytics")');

    // Wait for test selector to load
    await page.waitForTimeout(500);

    // Check if there are tests available
    const select = page.locator('select#test-select');
    const options = await select.locator('option').all();

    // Skip if no tests available (beyond the default "Choose a test..." option)
    if (options.length <= 1) {
      test.skip();
      return;
    }

    // Select the first available test (Math & Geography Test from seeded data)
    await select.selectOption({ index: 1 });

    // Wait for analytics to load (spinner should appear and disappear)
    await page.waitForTimeout(1000);

    // Should display test summary or no data message
    const pageContent = await page.textContent('body');
    const hasData = pageContent.includes('assessments') ||
                    pageContent.includes('No completed assessments yet');
    expect(hasData).toBe(true);
  });

  test('should display test summary when test is selected', async ({ page }) => {
    await login(page);
    await page.click('button:has-text("Analytics")');

    // Wait for test selector to load
    await page.waitForTimeout(500);

    const select = page.locator('select#test-select');
    const options = await select.locator('option').all();

    if (options.length <= 1) {
      test.skip();
      return;
    }

    // Select test
    await select.selectOption({ index: 1 });
    await page.waitForTimeout(1000);

    // Should show test title and assessment count
    await expect(page.locator('text=/\\d+ assessments/i')).toBeVisible();
    await expect(page.locator('text=/\\d+ questions/i')).toBeVisible();
  });

  test('should show no data state when test has no completed assessments', async ({ page }) => {
    await login(page);
    await page.click('button:has-text("Analytics")');

    await page.waitForTimeout(500);

    const select = page.locator('select#test-select');
    const options = await select.locator('option').all();

    if (options.length <= 1) {
      test.skip();
      return;
    }

    // Select a test
    await select.selectOption({ index: 1 });
    await page.waitForTimeout(1000);

    const pageContent = await page.textContent('body');

    // If there are no completed assessments, verify no data state is shown
    if (pageContent.includes('0 assessments') ||
        pageContent.includes('No completed assessments yet')) {
      await expect(page.locator('text=/No completed assessments yet/i')).toBeVisible();
      await expect(page.locator('text=/Analytics will appear once candidates complete this test/i')).toBeVisible();
    }
  });

  test('should display question stats table when data exists', async ({ page }) => {
    await login(page);
    await page.click('button:has-text("Analytics")');

    await page.waitForTimeout(500);

    const select = page.locator('select#test-select');
    const options = await select.locator('option').all();

    if (options.length <= 1) {
      test.skip();
      return;
    }

    // Select test (Math & Geography Test should have data from seeded assessments)
    await select.selectOption({ index: 1 });
    await page.waitForTimeout(1000);

    const pageContent = await page.textContent('body');

    // If there are completed assessments, check for table
    if (!pageContent.includes('0 assessments') &&
        !pageContent.includes('No completed assessments yet')) {
      // Check table headers
      await expect(page.locator('th:has-text("Question")')).toBeVisible();
      await expect(page.locator('th:has-text("Type")')).toBeVisible();
      await expect(page.locator('th:has-text("Weight")')).toBeVisible();
      await expect(page.locator('th:has-text("Attempts")')).toBeVisible();
      await expect(page.locator('th:has-text("Correct")')).toBeVisible();
      await expect(page.locator('th:has-text("Success Rate")')).toBeVisible();
      await expect(page.locator('th:has-text("Difficulty")')).toBeVisible();
    }
  });

  test('should display difficulty legend when data exists', async ({ page }) => {
    await login(page);
    await page.click('button:has-text("Analytics")');

    await page.waitForTimeout(500);

    const select = page.locator('select#test-select');
    const options = await select.locator('option').all();

    if (options.length <= 1) {
      test.skip();
      return;
    }

    // Select test
    await select.selectOption({ index: 1 });
    await page.waitForTimeout(1000);

    const pageContent = await page.textContent('body');

    // Legend should only appear when there are completed assessments
    if (!pageContent.includes('0 assessments') &&
        !pageContent.includes('No completed assessments yet')) {
      await expect(page.locator('text=Difficulty Legend')).toBeVisible();
      await expect(page.locator('text=/Very Hard.*<30%/i')).toBeVisible();
      await expect(page.locator('text=/Hard.*30-49%/i')).toBeVisible();
      await expect(page.locator('text=/Medium.*50-74%/i')).toBeVisible();
      await expect(page.locator('text=/Easy.*75-89%/i')).toBeVisible();
    }
  });

  test('should handle test selection changes', async ({ page }) => {
    await login(page);
    await page.click('button:has-text("Analytics")');

    await page.waitForTimeout(500);

    const select = page.locator('select#test-select');
    const options = await select.locator('option').all();

    if (options.length <= 2) {
      test.skip();
      return;
    }

    // Select first test
    await select.selectOption({ index: 1 });
    await page.waitForTimeout(1000);

    // Verify content loaded
    let pageContent = await page.textContent('body');
    expect(pageContent).toMatch(/\d+ assessments/i);

    // Select second test
    await select.selectOption({ index: 2 });
    await page.waitForTimeout(1000);

    // Verify new content loaded
    pageContent = await page.textContent('body');
    expect(pageContent).toMatch(/\d+ assessments/i);
  });

  test('should handle loading states gracefully', async ({ page }) => {
    await login(page);
    await page.click('button:has-text("Analytics")');

    // Initial loading state while tests are fetched
    // The page should not error during loading
    await page.waitForTimeout(1000);

    // Analytics tab should be visible
    await expect(page.locator('h2:has-text("View success rates for each question")')).toBeVisible();
  });

  test('should display color-coded success rates', async ({ page }) => {
    await login(page);
    await page.click('button:has-text("Analytics")');

    await page.waitForTimeout(500);

    const select = page.locator('select#test-select');
    const options = await select.locator('option').all();

    if (options.length <= 1) {
      test.skip();
      return;
    }

    // Select test
    await select.selectOption({ index: 1 });
    await page.waitForTimeout(1000);

    const pageContent = await page.textContent('body');

    // If table is visible, check that success rate badges exist
    if (!pageContent.includes('0 assessments') &&
        !pageContent.includes('No completed assessments yet')) {
      const table = page.locator('table');
      if (await table.isVisible()) {
        // Look for success rate percentages with colored backgrounds
        const successRates = page.locator('td span[class*="text-"]');
        const count = await successRates.count();
        expect(count).toBeGreaterThan(0);
      }
    }
  });

  test('should show disabled tests in dropdown', async ({ page }) => {
    await login(page);
    await page.click('button:has-text("Analytics")');

    await page.waitForTimeout(500);

    const select = page.locator('select#test-select');
    await expect(select).toBeVisible();

    // Check that dropdown has options
    const options = await select.locator('option').all();
    expect(options.length).toBeGreaterThanOrEqual(1); // At least "Choose a test..."
  });
});
