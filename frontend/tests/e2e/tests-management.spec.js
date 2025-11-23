import { test, expect } from '@playwright/test';

test.describe('Tests Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/admin/login');
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/admin');

    // Navigate to Tests tab (should be default)
    await page.click('text=Tests');
  });

  test('should display tests list', async ({ page }) => {
    await expect(page.locator('h2:has-text("Tests")')).toBeVisible();
  });

  test('should create a new test', async ({ page }) => {
    await page.click('button:has-text("Create Test")');

    // Fill in form
    await page.fill('input[name="title"]', 'E2E Test Assessment');
    await page.fill('textarea[name="description"]', 'Test description for E2E');
    await page.fill('input[name="slug"]', 'e2e-test-assessment');
    await page.check('input[name="is_enabled"]');

    await page.click('button:has-text("Create Test")');

    // Wait for modal to close and test to appear
    await expect(page.locator('text=E2E Test Assessment')).toBeVisible();
  });

  test('should generate slug from title', async ({ page }) => {
    await page.click('button:has-text("Create Test")');

    await page.fill('input[name="title"]', 'JavaScript Basics 101');
    await page.click('button:has-text("Generate")');

    const slugValue = await page.inputValue('input[name="slug"]');
    expect(slugValue).toBe('javascript-basics-101');
  });

  test('should edit a test', async ({ page }) => {
    // Wait for tests to load
    await page.waitForSelector('button:has-text("Edit")');

    await page.click('button:has-text("Edit")').first();
    await page.fill('input[name="title"]', 'Updated Test Title');
    await page.fill('textarea[name="description"]', 'Updated description');
    await page.click('button:has-text("Update Test")');

    await expect(page.locator('text=Updated Test Title')).toBeVisible();
  });

  test('should toggle test enabled status', async ({ page }) => {
    // Wait for tests to load
    await page.waitForSelector('button:has-text("Enable"), button:has-text("Disable")');

    // Find the first enable/disable button and click it
    const toggleButton = page.locator('button:has-text("Enable"), button:has-text("Disable")').first();
    const initialText = await toggleButton.textContent();

    await toggleButton.click();

    // Wait for the status to change
    await page.waitForTimeout(500);

    // Verify the button text changed
    const newText = await toggleButton.textContent();
    expect(newText).not.toBe(initialText);
  });

  test('should copy test URL', async ({ page }) => {
    // Wait for tests to load
    await page.waitForSelector('button:has-text("Copy URL")');

    // Grant clipboard permissions
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);

    await page.click('button:has-text("Copy URL")').first();

    // Check that alert appeared
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('copied');
      await dialog.accept();
    });
  });

  test('should open manage questions modal', async ({ page }) => {
    // Wait for tests to load
    await page.waitForSelector('button:has-text("Questions")');

    await page.click('button:has-text("Questions")').first();

    // Modal should open
    await expect(page.locator('h3:has-text("Manage Questions")')).toBeVisible();
    await expect(page.locator('h4:has-text("Add Question to Test")')).toBeVisible();
    await expect(page.locator('h4:has-text("Current Questions")')).toBeVisible();
  });

  test('should add and remove question from test', async ({ page }) => {
    // Wait for tests to load
    await page.waitForSelector('button:has-text("Questions")');

    await page.click('button:has-text("Questions")').first();

    // Wait for modal and questions to load
    await page.waitForSelector('select');

    // Check if there are available questions
    const selectOptions = await page.locator('select option').count();

    if (selectOptions > 1) { // More than just "Select a question..."
      // Select first available question
      await page.selectOption('select', { index: 1 });

      // Set weight
      await page.fill('input[type="number"]', '5');

      // Add question
      await page.click('button:has-text("Add")');

      // Wait for question to be added
      await page.waitForTimeout(500);

      // Question should appear in list
      await expect(page.locator('button:has-text("Remove")')).toBeVisible();

      // Remove the question
      page.on('dialog', async dialog => {
        await dialog.accept();
      });

      await page.click('button:has-text("Remove")').first();

      // Wait for removal
      await page.waitForTimeout(500);
    }

    await page.click('button:has-text("Done")');
  });

  test('should delete a test', async ({ page }) => {
    // Wait for tests to load
    await page.waitForSelector('button:has-text("Delete")');

    // Set up dialog handler before clicking
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('sure');
      await dialog.accept();
    });

    await page.click('button:has-text("Delete")').first();

    // Wait for deletion to complete
    await page.waitForTimeout(500);
  });

  test('should display question count for each test', async ({ page }) => {
    // Wait for tests to load
    await page.waitForSelector('text=Questions:');

    // At least one test should show question count
    await expect(page.locator('text=Questions:').first()).toBeVisible();
  });

  test('should show empty state when no tests', async ({ page }) => {
    // This test assumes database might be empty after all deletions
    // If tests exist, this will be skipped
    const noTestsMessage = page.locator('text=No tests yet');
    const createFirstButton = page.locator('button:has-text("Create Your First Test")');

    if (await noTestsMessage.isVisible()) {
      await expect(createFirstButton).toBeVisible();
    }
  });
});
