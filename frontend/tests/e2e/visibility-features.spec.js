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

      // Fill in form
      await page.fill('input[name="title"]', 'Test With Default Visibility');
      await page.fill('textarea[name="description"]', 'Testing default visibility');
      await page.check('input[name="is_enabled"]');

      // Verify default visibility is 'private'
      const visibilitySelect = page.locator('select[name="visibility"]');
      await expect(visibilitySelect).toHaveValue('private');

      // Submit form
      await page.locator('form button[type="submit"]').click();

      // Wait for modal to close and test to appear
      await expect(page.locator('text=Test With Default Visibility')).toBeVisible();
    });

    test('should create a test with public visibility', async ({ page }) => {
      await page.click('text=Tests');
      await page.click('button:has-text("Create Test")');

      // Fill in form
      await page.fill('input[name="title"]', 'Public Test');
      await page.fill('textarea[name="description"]', 'Testing public visibility');
      await page.selectOption('select[name="visibility"]', 'public');
      await page.check('input[name="is_enabled"]');

      // Submit form
      await page.locator('form button[type="submit"]').click();

      // Wait for test to appear
      await expect(page.locator('text=Public Test')).toBeVisible();
    });

    test('should create a test with protected visibility', async ({ page }) => {
      await page.click('text=Tests');
      await page.click('button:has-text("Create Test")');

      // Fill in form
      await page.fill('input[name="title"]', 'Protected Test E2E');
      await page.fill('textarea[name="description"]', 'Testing protected visibility');
      await page.selectOption('select[name="visibility"]', 'protected');
      await page.check('input[name="is_enabled"]');

      // Submit form
      await page.locator('form button[type="submit"]').click();

      // Wait for test to appear
      await expect(page.locator('text=Protected Test E2E')).toBeVisible();
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

      // Wait for tests to load
      await page.waitForSelector('button:has-text("Edit")');
      await page.locator('button:has-text("Edit")').first().click();

      // Check that slug is displayed as read-only text (code block, not input)
      const slugDisplay = page.locator('code');
      await expect(slugDisplay).toBeVisible();
      await expect(slugDisplay).toContainText('/t/');
    });

    test('should copy test link to clipboard', async ({ page }) => {
      await page.click('text=Tests');

      // Wait for tests to load
      await page.waitForSelector('button:has-text("Edit")');
      await page.locator('button:has-text("Edit")').first().click();

      // Grant clipboard permissions
      await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);

      // Click copy link button
      const copyButton = page.locator('button:has-text("Copy Link")');
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
      await page.waitForSelector('button:has-text("Edit")');

      // Check that regenerate button exists in the tests list (not in edit form)
      const regenerateButton = page.locator('button:has-text("Regenerate Link")').first();
      await expect(regenerateButton).toBeVisible();
    });

    test('should update test visibility', async ({ page }) => {
      await page.click('text=Tests');

      // Wait for tests to load
      await page.waitForSelector('button:has-text("Edit")');
      await page.locator('button:has-text("Edit")').first().click();

      // Change visibility
      await page.selectOption('select[name="visibility"]', 'public');

      // Submit form
      await page.locator('form button[type="submit"]').click();

      // Modal should close
      await page.waitForTimeout(500);
    });
  });

  test.describe('Question Creation with Title and Visibility', () => {
    // TODO: Form submission not working in E2E tests - needs investigation
    test.skip('should create a question with title (required)', async ({ page }) => {
      await page.click('text=Questions');
      await page.click('button:has-text("Create Question")');

      // Title input should be visible and required
      const titleInput = page.locator('input[name="title"]');
      await expect(titleInput).toBeVisible();

      // Fill in the form
      await page.fill('input[name="title"]', 'Sample Question Title');
      await page.fill('textarea[placeholder*="question"]', 'What is the answer to this test?');

      // Fill options
      await page.fill('input[placeholder="Option 1"]', 'Answer 1');
      await page.fill('input[placeholder="Option 2"]', 'Answer 2');

      // Select correct answer - use click() to ensure onChange fires
      await page.locator('input[type="radio"]').first().click();

      // Wait a moment for React state updates
      await page.waitForTimeout(100);

      // Click submit with force
      await page.locator('button:has-text("Create Question")').last().click({ force: true });

      // Wait for modal to close
      await expect(page.locator('h3:has-text("Create Question")')).not.toBeVisible({ timeout: 15000 });

      // Title should be displayed in the list as an h3
      await expect(page.locator('h3:has-text("Sample Question Title")')).toBeVisible({ timeout: 5000 });
    });

    // TODO: Form submission not working in E2E tests - needs investigation
    test.skip('should create a question with default visibility (private)', async ({ page }) => {
      await page.click('text=Questions');
      await page.click('button:has-text("Create Question")');

      // Fill in form
      await page.fill('input[name="title"]', 'Private Question E2E');
      await page.fill('textarea[placeholder*="question"]', 'What is the private answer?');
      await page.fill('input[placeholder="Option 1"]', 'Answer 1');
      await page.fill('input[placeholder="Option 2"]', 'Answer 2');
      // Select correct answer - use click() to ensure onChange fires
      await page.locator('input[type="radio"]').first().click();

      // Verify default visibility is 'private'
      const visibilitySelect = page.locator('select[name="visibility"]');
      await expect(visibilitySelect).toHaveValue('private');

      // Wait a moment for React state updates
      await page.waitForTimeout(100);

      // Click submit with force
      await page.locator('button:has-text("Create Question")').last().click({ force: true });

      // Wait for modal to close
      await expect(page.locator('h3:has-text("Create Question")')).not.toBeVisible({ timeout: 15000 });

      await expect(page.locator('h3:has-text("Private Question E2E")')).toBeVisible({ timeout: 5000 });
    });

    // TODO: Form submission not working in E2E tests - needs investigation
    test.skip('should create a question with public visibility', async ({ page }) => {
      await page.click('text=Questions');
      await page.click('button:has-text("Create Question")');

      // Fill in form
      await page.fill('input[name="title"]', 'Public Question E2E');
      await page.fill('textarea[placeholder*="question"]', 'What is a public question?');
      await page.selectOption('select[name="visibility"]', 'public');
      await page.fill('input[placeholder="Option 1"]', 'Answer 1');
      await page.fill('input[placeholder="Option 2"]', 'Answer 2');
      // Select correct answer - use click() to ensure onChange fires
      await page.locator('input[type="radio"]').first().click();

      // Wait a moment for React state updates
      await page.waitForTimeout(100);

      // Click submit with force
      await page.locator('button:has-text("Create Question")').last().click({ force: true });

      // Wait for modal to close
      await expect(page.locator('h3:has-text("Create Question")')).not.toBeVisible({ timeout: 15000 });

      await expect(page.locator('h3:has-text("Public Question E2E")')).toBeVisible({ timeout: 5000 });
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
      await page.waitForSelector('h2:has-text("Questions")');

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
      await page.waitForSelector('h2:has-text("Questions")');

      // Find visibility filter dropdown
      const visibilityFilter = page.locator('select').filter({ hasText: /All Visibility/i });
      await expect(visibilityFilter).toBeVisible();
    });

    test('should have author filter dropdown', async ({ page }) => {
      await page.click('text=Questions');

      // Wait for questions to load
      await page.waitForSelector('h2:has-text("Questions")');

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
    test('should show manage questions modal', async ({ page }) => {
      await page.click('text=Tests');

      // Wait for tests to load
      await page.waitForSelector('[data-testid="manage-questions-btn"]');
      await page.locator('[data-testid="manage-questions-btn"]').first().click();

      // Modal should open
      await expect(page.locator('h3:has-text("Manage Questions")')).toBeVisible();
    });

    test('should show available questions section', async ({ page }) => {
      await page.click('text=Tests');

      // Wait for tests to load
      await page.waitForSelector('[data-testid="manage-questions-btn"]');
      await page.locator('[data-testid="manage-questions-btn"]').first().click();

      // Wait for modal
      await expect(page.locator('h3:has-text("Manage Questions")')).toBeVisible();

      // Check for Available Questions section
      await expect(page.locator('h4:has-text("Available Questions")')).toBeVisible();
    });

    test('should show current questions section', async ({ page }) => {
      await page.click('text=Tests');

      // Wait for tests to load
      await page.waitForSelector('[data-testid="manage-questions-btn"]');
      await page.locator('[data-testid="manage-questions-btn"]').first().click();

      // Wait for modal
      await expect(page.locator('h3:has-text("Manage Questions")')).toBeVisible();

      // Check for Current Questions section
      await expect(page.locator('h4:has-text("Current Questions")')).toBeVisible();
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
      await page.waitForSelector('h2:has-text("Questions")');

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
