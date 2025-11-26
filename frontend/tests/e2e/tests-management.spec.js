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

    // Fill in form (slug is auto-generated now)
    await page.fill('input[name="title"]', 'E2E Test Assessment');
    await page.fill('textarea[name="description"]', 'Test description for E2E');
    await page.check('input[name="is_enabled"]');

    // Click the submit button inside the modal
    await page.locator('form button[type="submit"]').click();

    // Wait for modal to close and test to appear
    await expect(page.locator('text=E2E Test Assessment')).toBeVisible();
  });


  test('should edit a test', async ({ page }) => {
    // Wait for tests to load
    await page.waitForSelector('button:has-text("Edit")');

    await page.locator('button:has-text("Edit")').first().click();
    await page.fill('input[name="title"]', 'Updated Test Title');
    await page.fill('textarea[name="description"]', 'Updated description');
    await page.locator('form button[type="submit"]').click();

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
    // Wait for tests to load - look for copy link button by title
    await page.waitForSelector('button[title="Copy link"]');

    // Grant clipboard permissions
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);

    // Click the copy link button using the title attribute
    await page.locator('button[title="Copy link"]').first().click();

    // Wait for success message to appear (it's a green banner, not toast)
    await expect(page.locator('text=Test URL copied to clipboard!')).toBeVisible({ timeout: 3000 });
  });

  test('should open manage questions modal', async ({ page }) => {
    // Wait for tests to load
    await page.waitForSelector('[data-testid="manage-questions-btn"]');

    await page.locator('[data-testid="manage-questions-btn"]').first().click();

    // Modal should open with new structure
    await expect(page.locator('h3:has-text("Manage Questions")')).toBeVisible();
    await expect(page.locator('h4:has-text("Available Questions")')).toBeVisible();
    await expect(page.locator('h4:has-text("Current Questions")')).toBeVisible();
  });

  test('should add and remove question from test', async ({ page }) => {
    // Wait for tests to load
    await page.waitForSelector('[data-testid="manage-questions-btn"]');

    await page.locator('[data-testid="manage-questions-btn"]').first().click();

    // Wait for modal and available questions section to load
    await page.waitForSelector('h4:has-text("Available Questions")');

    // Check if there are available questions (look for Add buttons in available section)
    const addButtons = page.locator('h4:has-text("Available Questions")').locator('..').locator('button:has-text("Add")');
    const addButtonCount = await addButtons.count();

    if (addButtonCount > 0) {
      // Get the first available question's weight input and Add button
      const firstQuestionContainer = page.locator('h4:has-text("Available Questions")').locator('..').locator('button:has-text("Add")').first().locator('..');

      // Set weight in the input field for first question
      await firstQuestionContainer.locator('input[type="number"]').fill('5');

      // Click Add button
      await firstQuestionContainer.locator('button:has-text("Add")').click();

      // Wait for question to be added to current questions
      await page.waitForTimeout(500);

      // Question should appear in Current Questions section with Remove button
      await expect(page.locator('h4:has-text("Current Questions")').locator('..').locator('button:has-text("Remove")')).toBeVisible();

      // Remove the question
      page.on('dialog', async dialog => {
        await dialog.accept();
      });

      await page.locator('h4:has-text("Current Questions")').locator('..').locator('button:has-text("Remove")').first().click();

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

    await page.locator('button:has-text("Delete")').first().click();

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
