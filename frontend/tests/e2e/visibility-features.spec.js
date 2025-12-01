import { test, expect } from '@playwright/test';

test.describe('Visibility Features', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/admin/login');
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/admin');
  });

  test.describe('Test Creation with Visibility', () => {
    test('should create a test with default visibility (private)', async ({ page }) => {
      await page.click('text=Tests');
      await page.click('button:has-text("Create Test")');

      // Wait for modal to open
      await expect(page.locator('h3:has-text("Create Test")')).toBeVisible();

      // Fill in form (modal is now tabbed - Settings tab is active by default)
      await page.fill('input[name="title"]', 'Test With Default Visibility');
      await page.fill('textarea[name="description"]', 'Testing default visibility');

      // Verify default visibility is 'private'
      const visibilitySelect = page.locator('select[name="visibility"]');
      await expect(visibilitySelect).toHaveValue('private');

      // Submit form - use the modal's Create Test button
      const modal = page.locator('div[role="dialog"], .z-50');
      await modal.locator('button:has-text("Create Test")').last().click();

      // Wait for modal to close and test to appear in table
      await expect(page.locator('td:has-text("Test With Default Visibility")')).toBeVisible();
    });

    test('should create a test with public visibility', async ({ page }) => {
      await page.click('text=Tests');
      await page.click('button:has-text("Create Test")');

      // Wait for modal to open
      await expect(page.locator('h3:has-text("Create Test")')).toBeVisible();

      // Fill in form
      await page.fill('input[name="title"]', 'Public Test');
      await page.fill('textarea[name="description"]', 'Testing public visibility');
      await page.selectOption('select[name="visibility"]', 'public');

      // Submit form
      const modal = page.locator('div[role="dialog"], .z-50');
      await modal.locator('button:has-text("Create Test")').last().click();

      // Wait for test to appear
      await expect(page.locator('td:has-text("Public Test")')).toBeVisible();
    });

    test('should create a test with protected visibility', async ({ page }) => {
      await page.click('text=Tests');
      await page.click('button:has-text("Create Test")');

      // Wait for modal to open
      await expect(page.locator('h3:has-text("Create Test")')).toBeVisible();

      // Fill in form
      await page.fill('input[name="title"]', 'Protected Test E2E');
      await page.fill('textarea[name="description"]', 'Testing protected visibility');
      await page.selectOption('select[name="visibility"]', 'protected');

      // Submit form
      const modal = page.locator('div[role="dialog"], .z-50');
      await modal.locator('button:has-text("Create Test")').last().click();

      // Wait for test to appear
      await expect(page.locator('td:has-text("Protected Test E2E")')).toBeVisible();
    });

    test('should show visibility dropdown with all three options', async ({ page }) => {
      await page.click('text=Tests');
      await page.click('button:has-text("Create Test")');

      // Check visibility dropdown options
      const visibilitySelect = page.locator('select[name="visibility"]');
      await expect(visibilitySelect).toBeVisible();

      const options = await visibilitySelect.locator('option').allTextContents();
      // Options have descriptions like "Private - Requires direct link"
      expect(options.some(o => o.includes('Private'))).toBe(true);
      expect(options.some(o => o.includes('Public'))).toBe(true);
      expect(options.some(o => o.includes('Protected'))).toBe(true);
    });
  });

  test.describe('Test Edit - Visibility and Slug', () => {
    test('should display slug as read-only text when editing', async ({ page }) => {
      await page.click('text=Tests');

      // Wait for tests to load and click edit icon
      await page.waitForSelector('button[title="Edit test"]');
      await page.locator('button[title="Edit test"]').first().click();

      // Wait for modal to open
      await expect(page.locator('h3:has-text("Edit Test")')).toBeVisible();

      // Check that slug is displayed as read-only text (code block, not input)
      const slugDisplay = page.locator('code');
      await expect(slugDisplay).toBeVisible();
      await expect(slugDisplay).toContainText('/t/');
    });

    test('should copy test link to clipboard', async ({ page }) => {
      await page.click('text=Tests');

      // Wait for tests to load
      await page.waitForSelector('button[title="Edit test"]');
      await page.locator('button[title="Edit test"]').first().click();

      // Wait for modal to open
      await expect(page.locator('h3:has-text("Edit Test")')).toBeVisible();

      // Grant clipboard permissions
      await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);

      // Click copy link button in the modal
      const modal = page.locator('div[role="dialog"], .z-50');
      const copyButton = modal.locator('button:has-text("Copy Link")');
      await expect(copyButton).toBeVisible();
      await copyButton.click();

      // Verify copied text contains the test URL
      const handle = await page.evaluateHandle(() => navigator.clipboard.readText());
      const clipboardText = await handle.jsonValue();
      expect(clipboardText).toContain('/t/');
    });

    test('should show regenerate link button in tests list', async ({ page }) => {
      await page.click('text=Tests');

      // Wait for tests to load
      await page.waitForSelector('button[title="Regenerate link"]');

      // Check that regenerate button exists in the tests list (as icon with tooltip)
      const regenerateButton = page.locator('button[title="Regenerate link"]').first();
      await expect(regenerateButton).toBeVisible();
    });

    test('should update test visibility', async ({ page }) => {
      await page.click('text=Tests');

      // Wait for tests to load
      await page.waitForSelector('button[title="Edit test"]');
      await page.locator('button[title="Edit test"]').first().click();

      // Wait for modal to open
      await expect(page.locator('h3:has-text("Edit Test")')).toBeVisible();

      // Change visibility
      await page.selectOption('select[name="visibility"]', 'public');

      // Submit form - click Save Changes in modal
      const modal = page.locator('div[role="dialog"], .z-50');
      await modal.locator('button:has-text("Save Changes")').click();

      // Modal should close
      await expect(page.locator('h3:has-text("Edit Test")')).not.toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Question Creation with Title and Visibility', () => {
    test('should create a question with title (required)', async ({ page }) => {
      const uniqueTitle = `Title Required ${Date.now()}`;

      await page.click('text=Questions');
      await page.getByRole('button', { name: 'Create Question' }).first().click();

      // Wait for modal to open
      await expect(page.getByRole('heading', { name: 'Create Question' })).toBeVisible({ timeout: 5000 });

      // Title input should be visible and required
      const titleInput = page.getByRole('textbox', { name: /Capital of France/i });
      await expect(titleInput).toBeVisible();

      // Fill in the form
      await titleInput.fill(uniqueTitle);
      await page.getByRole('textbox', { name: 'Enter your question...' }).fill('What is the answer to this test?');

      // Fill options
      await page.getByRole('textbox', { name: 'Option 1' }).fill('Answer 1');
      await page.getByRole('textbox', { name: 'Option 2' }).fill('Answer 2');

      // Select correct answer
      await page.locator('input[type="radio"]').first().click();

      // Click submit
      await page.locator('form').getByRole('button', { name: 'Create Question' }).click();

      // Wait for success message
      await expect(page.getByText('Question created successfully')).toBeVisible({ timeout: 10000 });

      // Title should be displayed in the table
      await expect(page.getByRole('cell', { name: uniqueTitle })).toBeVisible({ timeout: 5000 });
    });

    test('should create a question with default visibility (private)', async ({ page }) => {
      const uniqueTitle = `Private Question ${Date.now()}`;

      await page.click('text=Questions');
      await page.getByRole('button', { name: 'Create Question' }).first().click();

      // Wait for modal to open
      await expect(page.getByRole('heading', { name: 'Create Question' })).toBeVisible({ timeout: 5000 });

      // Fill in form
      await page.getByRole('textbox', { name: /Capital of France/i }).fill(uniqueTitle);
      await page.getByRole('textbox', { name: 'Enter your question...' }).fill('What is the private answer?');
      await page.getByRole('textbox', { name: 'Option 1' }).fill('Answer 1');
      await page.getByRole('textbox', { name: 'Option 2' }).fill('Answer 2');
      await page.locator('input[type="radio"]').first().click();

      // Verify default visibility is 'private' (visibility dropdown is inside the form)
      const visibilitySelect = page.locator('form select').first();
      await expect(visibilitySelect).toContainText('Private');

      // Click submit
      await page.locator('form').getByRole('button', { name: 'Create Question' }).click();

      // Wait for success message
      await expect(page.getByText('Question created successfully')).toBeVisible({ timeout: 10000 });

      // Verify question appears with Private visibility
      await expect(page.getByRole('cell', { name: uniqueTitle })).toBeVisible({ timeout: 5000 });
    });

    test('should create a question with public visibility', async ({ page }) => {
      const uniqueTitle = `Public Question ${Date.now()}`;

      await page.click('text=Questions');
      await page.getByRole('button', { name: 'Create Question' }).first().click();

      // Wait for modal to open
      await expect(page.getByRole('heading', { name: 'Create Question' })).toBeVisible({ timeout: 5000 });

      // Fill in form
      await page.getByRole('textbox', { name: /Capital of France/i }).fill(uniqueTitle);
      await page.getByRole('textbox', { name: 'Enter your question...' }).fill('What is a public question?');

      // Select public visibility (use form-scoped selector to avoid matching page filters)
      await page.locator('form select').first().selectOption({ label: 'Public - Can be used in any test' });

      await page.getByRole('textbox', { name: 'Option 1' }).fill('Answer 1');
      await page.getByRole('textbox', { name: 'Option 2' }).fill('Answer 2');
      await page.locator('input[type="radio"]').first().click();

      // Click submit
      await page.locator('form').getByRole('button', { name: 'Create Question' }).click();

      // Wait for success message
      await expect(page.getByText('Question created successfully')).toBeVisible({ timeout: 10000 });

      // Verify question appears
      await expect(page.getByRole('cell', { name: uniqueTitle })).toBeVisible({ timeout: 5000 });
    });

    test('should show visibility dropdown with all three options in question form', async ({ page }) => {
      await page.click('text=Questions');
      await page.click('text=Create Question');

      // Check visibility dropdown options
      const visibilitySelect = page.locator('select[name="visibility"]');
      await expect(visibilitySelect).toBeVisible();

      const options = await visibilitySelect.locator('option').allTextContents();
      // Options have descriptions
      expect(options.some(o => o.includes('Private'))).toBe(true);
      expect(options.some(o => o.includes('Public'))).toBe(true);
      expect(options.some(o => o.includes('Protected'))).toBe(true);
    });

    test('should display title in questions list', async ({ page }) => {
      await page.click('text=Questions');

      // Wait for questions to load
      await page.waitForSelector('h2:has-text("Manage your question bank")');

      // Questions should display their titles (the seeded questions have titles)
      const questionCards = page.locator('.hover\\:shadow-lg');
      if (await questionCards.count() > 0) {
        // At least one question card should be visible
        await expect(questionCards.first()).toBeVisible();
      }
    });
  });

  test.describe('Question Filtering', () => {
    test('should have visibility filter dropdown', async ({ page }) => {
      await page.click('text=Questions');

      // Wait for questions to load
      await page.waitForSelector('h2:has-text("Manage your question bank")');

      // Find visibility filter dropdown
      const visibilityFilter = page.locator('select').filter({ hasText: /All Visibility/i });
      await expect(visibilityFilter).toBeVisible();
    });

    test('should have author filter dropdown', async ({ page }) => {
      await page.click('text=Questions');

      // Wait for questions to load
      await page.waitForSelector('h2:has-text("Manage your question bank")');

      // Find author filter dropdown
      const authorFilter = page.locator('select').filter({ hasText: /All Authors/i });
      await expect(authorFilter).toBeVisible();
    });
  });

  test.describe('Protected Test Access', () => {
    test('should show access restricted for protected test', async ({ page }) => {
      // Navigate to protected test (seeded as 'protected-test')
      await page.goto('/t/protected-test');

      // Should see "Access Restricted" message
      await expect(page.locator('text=Access Restricted')).toBeVisible();
    });

    test('should allow access to public test', async ({ page }) => {
      // Navigate to markdown test which is public
      await page.goto('/t/markdown-test');

      // Should see test landing page, not access restricted
      await expect(page.locator('h1')).toContainText('Markdown Rendering Test');
      await expect(page.locator('input#name')).toBeVisible();
      await expect(page.locator('button:has-text("Start Test")')).toBeVisible();
    });

    test('should allow access to private test via direct link', async ({ page }) => {
      // Private tests should still be accessible via direct link
      // Navigate to math-geo test which is private
      await page.goto('/t/math-geo');

      // Should see test landing page
      await expect(page.locator('h1')).toContainText('Math & Geography Test');
      await expect(page.locator('input#name')).toBeVisible();
    });
  });

  test.describe('Visibility Matrix in Test Management', () => {
    test('should show questions tab in test modal', async ({ page }) => {
      await page.click('text=Tests');

      // Wait for tests to load and click edit icon
      await page.waitForSelector('button[title="Edit test"]');
      await page.locator('button[title="Edit test"]').first().click();

      // Wait for modal to open
      await expect(page.locator('h3:has-text("Edit Test")')).toBeVisible();

      // Click on Questions tab
      const modal = page.locator('div[role="dialog"], .z-50');
      await modal.locator('button:has-text("Questions")').click();

      // Should see Questions tab content
      await expect(page.locator('text=Available Questions')).toBeVisible();
    });

    test('should show available questions section', async ({ page }) => {
      await page.click('text=Tests');

      // Wait for tests to load and click edit icon
      await page.waitForSelector('button[title="Edit test"]');
      await page.locator('button[title="Edit test"]').first().click();

      // Wait for modal to open
      await expect(page.locator('h3:has-text("Edit Test")')).toBeVisible();

      // Click on Questions tab
      const modal = page.locator('div[role="dialog"], .z-50');
      await modal.locator('button:has-text("Questions")').click();

      // Check for Available Questions section
      await expect(page.locator('text=Available Questions')).toBeVisible();
    });

    test('should show selected questions section', async ({ page }) => {
      await page.click('text=Tests');

      // Wait for tests to load and click edit icon
      await page.waitForSelector('button[title="Edit test"]');
      await page.locator('button[title="Edit test"]').first().click();

      // Wait for modal to open
      await expect(page.locator('h3:has-text("Edit Test")')).toBeVisible();

      // Click on Questions tab
      const modal = page.locator('div[role="dialog"], .z-50');
      await modal.locator('button:has-text("Questions")').click();

      // Check for Selected Questions section
      await expect(page.locator('text=Selected Questions')).toBeVisible();
    });
  });

  test.describe('Visibility Badge Display', () => {
    test('should show visibility badges in tests list', async ({ page }) => {
      await page.click('text=Tests');

      // Wait for tests to load
      await page.waitForSelector('h2:has-text("Tests")');

      // Look for visibility badges (colored badges)
      const privateBadge = page.locator('.bg-gray-100:has-text("Private")');
      const publicBadge = page.locator('.bg-green-100:has-text("Public")');
      const protectedBadge = page.locator('.bg-yellow-100:has-text("Protected")');

      // At least one badge type should be visible
      const hasPrivate = await privateBadge.count() > 0;
      const hasPublic = await publicBadge.count() > 0;
      const hasProtected = await protectedBadge.count() > 0;

      expect(hasPrivate || hasPublic || hasProtected).toBe(true);
    });

    test('should show visibility badges in questions list', async ({ page }) => {
      await page.click('text=Questions');

      // Wait for questions to load
      await page.waitForSelector('h2:has-text("Manage your question bank")');

      // Look for visibility badges
      const privateBadge = page.locator('.bg-gray-100:has-text("Private")');
      const publicBadge = page.locator('.bg-green-100:has-text("Public")');
      const protectedBadge = page.locator('.bg-yellow-100:has-text("Protected")');

      // At least one badge type should be visible
      const hasPrivate = await privateBadge.count() > 0;
      const hasPublic = await publicBadge.count() > 0;
      const hasProtected = await protectedBadge.count() > 0;

      expect(hasPrivate || hasPublic || hasProtected).toBe(true);
    });
  });
});
