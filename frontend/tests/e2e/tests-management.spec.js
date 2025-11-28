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
    // Wait for page to be fully loaded - wait for Create Test button
    await page.waitForSelector('button:has-text("Create Test")');

    await page.click('button:has-text("Create Test")');

    // Modal should open - wait for modal content to be visible
    await page.waitForSelector('h3:has-text("Create Test")');

    // Fill in form (slug is auto-generated now)
    await page.fill('input[name="title"]', 'E2E Test Assessment');
    await page.fill('textarea[name="description"]', 'Test description for E2E');
    await page.check('input[name="is_enabled"]');

    // Click the Save button in modal footer (more specific selector)
    await page.locator('button:has-text("Create Test")').last().click();

    // Wait for modal to close and test to appear in table
    await expect(page.locator('td:has-text("E2E Test Assessment")')).toBeVisible();
  });


  test('should edit a test', async ({ page }) => {
    // Wait for table to load
    await page.waitForSelector('table tbody tr');

    // Click the edit icon (first one in the table)
    await page.locator('button[title="Edit test"]').first().click();

    // Modal should open on Settings tab
    await page.waitForSelector('h3:has-text("Edit Test")');

    // Use a unique timestamp-based title
    const uniqueTitle = `Updated Test ${Date.now()}`;
    await page.fill('input[name="title"]', uniqueTitle);
    await page.fill('textarea[name="description"]', 'Updated description');

    // Click Save Changes button
    await page.click('button:has-text("Save Changes")');

    // Wait for update to complete and verify in table
    await expect(page.locator(`td:has-text("${uniqueTitle}")`)).toBeVisible();
  });

  test('should toggle test enabled status', async ({ page }) => {
    // Wait for table to load
    await page.waitForSelector('table tbody tr');

    // Get the first test's status before toggle
    const firstRow = page.locator('tbody tr').first();
    const firstStatusBadge = firstRow.locator('span:has-text("Enabled"), span:has-text("Disabled")');
    const initialStatus = await firstStatusBadge.textContent();

    // Click the toggle icon (enable/disable) - it's in the actions column
    const toggleButton = firstRow.locator('button[title="Disable test"], button[title="Enable test"]');
    await toggleButton.click();

    // Wait for the status to change by waiting for opposite status badge
    if (initialStatus.includes('Enabled')) {
      await expect(firstRow.locator('span:has-text("Disabled")')).toBeVisible({ timeout: 3000 });
    } else {
      await expect(firstRow.locator('span:has-text("Enabled")')).toBeVisible({ timeout: 3000 });
    }
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

  test('should open test modal with questions tab', async ({ page }) => {
    // Wait for table to load
    await page.waitForSelector('table tbody tr');

    // Click the edit icon to open modal
    await page.locator('button[title="Edit test"]').first().click();

    // Modal should open - wait for modal to be visible
    await page.waitForSelector('h3:has-text("Edit Test")');

    // Click on Questions tab - use more specific selector within modal
    const modal = page.locator('div[role="dialog"], .z-50');
    await modal.locator('button:has-text("Questions")').click();

    // Questions tab content should be visible
    await expect(page.locator('h4:has-text("Available Questions")')).toBeVisible();
    await expect(page.locator('h4:has-text("Selected Questions")')).toBeVisible();

    // Close modal
    await page.click('button:has-text("Cancel")');
  });

  test('should add and remove question from test', async ({ page }) => {
    // Wait for table to load
    await page.waitForSelector('table tbody tr');

    // Click the edit icon to open modal
    await page.locator('button[title="Edit test"]').first().click();

    // Wait for modal to be visible
    await page.waitForSelector('h3:has-text("Edit Test")');

    // Switch to Questions tab - use more specific selector within modal
    const modal = page.locator('div[role="dialog"], .z-50');
    await modal.locator('button:has-text("Questions")').click();

    // Wait for questions to load
    await page.waitForSelector('h4:has-text("Available Questions")');

    // Check if there are available questions with checkboxes
    const availableCheckboxes = page.locator('h4:has-text("Available Questions")').locator('~div').locator('input[type="checkbox"]');
    const checkboxCount = await availableCheckboxes.count();

    if (checkboxCount > 0) {
      // Click the first available checkbox to select a question
      await availableCheckboxes.first().click();

      // Wait for question to be added to selected questions
      await page.waitForTimeout(500);

      // Question should appear in Selected Questions section
      const selectedCheckboxes = page.locator('h4:has-text("Selected Questions")').locator('~div').locator('button[title="Remove question"]');
      await expect(selectedCheckboxes.first()).toBeVisible();

      // Click remove button to deselect
      await selectedCheckboxes.first().click();

      // Wait for removal
      await page.waitForTimeout(500);
    }

    // Close modal
    await page.click('button:has-text("Cancel")');
  });

  test('should delete a test', async ({ page }) => {
    // Wait for table to load
    await page.waitForSelector('table tbody tr');

    // Set up dialog handler before clicking
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('sure');
      await dialog.accept();
    });

    // Click the delete icon (last action icon in the row)
    await page.locator('button[title="Delete test"]').first().click();

    // Wait for deletion to complete
    await page.waitForTimeout(500);
  });

  test('should display question count for each test', async ({ page }) => {
    // Wait for table to load
    await page.waitForSelector('table tbody tr');

    // Question count should be visible in the Questions column (4th column)
    const questionCountCell = page.locator('tbody tr').first().locator('td').nth(3);
    await expect(questionCountCell).toBeVisible();
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

  test('should preview test questions', async ({ page }) => {
    // Wait for table to load
    await page.waitForSelector('table tbody tr');

    // Find a test with questions (question_count > 0)
    // Click preview icon on first test with questions
    const previewButtons = page.locator('button[title="Preview test"]:not([disabled])');
    const previewButtonCount = await previewButtons.count();

    if (previewButtonCount > 0) {
      await previewButtons.first().click();

      // Modal should open on Preview tab
      await page.waitForSelector('h3:has-text("Edit Test")');

      // Check that Preview tab is active
      const previewTab = page.locator('button:has-text("Preview")').first();
      await expect(previewTab).toBeVisible();

      // Should show question navigation (more specific selector)
      await expect(page.locator('text=Question 1 of')).toBeVisible();

      // Should have Show Answers checkbox label
      await expect(page.locator('text=Show Answers')).toBeVisible();

      // Close modal
      await page.click('button:has-text("Cancel")');
    }
  });

  test('should bulk enable/disable tests', async ({ page }) => {
    // Wait for table to load
    await page.waitForSelector('table tbody tr');

    // Check if we have at least 2 tests
    const rowCount = await page.locator('tbody tr').count();

    if (rowCount >= 2) {
      // Select first two tests
      await page.locator('tbody tr').first().locator('input[type="checkbox"]').check();
      await page.locator('tbody tr').nth(1).locator('input[type="checkbox"]').check();

      // Verify selection count is shown
      await expect(page.locator('text=2 selected')).toBeVisible();

      // Click Bulk Actions dropdown
      await page.click('button:has-text("Bulk Actions")');

      // Click Enable selected
      await page.click('text=Enable selected');

      // Confirmation modal should appear
      await expect(page.locator('text=Are you sure')).toBeVisible();

      // Click Enable button in confirmation modal
      await page.click('button:has-text("Enable")');

      // Wait for success message
      await page.waitForTimeout(500);

      // Should show success message
      await expect(page.locator('text=Enabled 2 test')).toBeVisible({ timeout: 3000 });
    }
  });
});
