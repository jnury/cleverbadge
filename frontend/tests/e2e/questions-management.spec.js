import { test, expect } from '@playwright/test';

test.describe('Questions Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/admin/login');
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/admin');

    // Navigate to Questions tab
    await page.click('text=Questions');
  });

  test('should display questions list', async ({ page }) => {
    // Wait for the tab content to load
    await page.waitForSelector('h2:has-text("Questions")');
    await expect(page.locator('h2:has-text("Questions")')).toBeVisible();
  });

  test('should create a new question', async ({ page }) => {
    // Use unique title to avoid conflicts with previous test runs
    const uniqueTitle = `E2E Question ${Date.now()}`;

    // Click Create Question button in header
    await page.getByRole('button', { name: 'Create Question' }).first().click();

    // Wait for modal to open
    await expect(page.getByRole('heading', { name: 'Create Question' })).toBeVisible({ timeout: 5000 });

    // Fill in title (required field)
    await page.getByRole('textbox', { name: /Capital of France/i }).fill(uniqueTitle);

    // Fill question text
    await page.getByRole('textbox', { name: 'Enter your question...' }).fill('What is 2+2?');

    // Type is SINGLE by default, no need to change

    // Fill options
    await page.getByRole('textbox', { name: 'Option 1' }).fill('3');
    await page.getByRole('textbox', { name: 'Option 2' }).fill('4');

    // Select correct answer (option 2 = "4")
    await page.locator('input[type="radio"]').nth(1).click();

    // Fill tags
    await page.getByRole('textbox', { name: /tags/i }).fill('math, easy');

    // Submit the form - use the button inside the form (not the header button)
    await page.locator('form').getByRole('button', { name: 'Create Question' }).click();

    // Wait for success message or modal to close
    await expect(page.getByText('Question created successfully')).toBeVisible({ timeout: 10000 });

    // Verify question appears in the table
    await expect(page.getByRole('cell', { name: uniqueTitle })).toBeVisible({ timeout: 5000 });
  });

  test('should filter questions by type', async ({ page }) => {
    // Wait for questions to load
    await page.waitForSelector('select');

    // Select the filter dropdown (first select is for filtering)
    await page.locator('select').first().selectOption('SINGLE');

    // Verify filtered results - should show count
    await expect(page.locator('text=/Showing \\d+ of \\d+ questions/')).toBeVisible();
  });

  test('should edit a question text', async ({ page }) => {
    // Wait for questions table to load
    await page.waitForSelector('table', { timeout: 5000 });

    // Click Edit on first question in the Actions column (icon button with title="Edit")
    const editButtons = page.locator('table button[title="Edit"]');
    await editButtons.first().click();

    // Wait for modal to open - check for heading
    await expect(page.locator('h3:has-text("Question")')).toBeVisible({ timeout: 5000 });

    // Wait for textarea to be visible
    const textarea = page.locator('textarea[placeholder*="question"]');
    await expect(textarea).toBeVisible({ timeout: 5000 });

    // Clear and type new text
    await textarea.fill('Edited E2E question text');

    // Wait for Update Question button to appear (only shows when changes detected)
    await expect(page.locator('button:has-text("Update Question")')).toBeVisible({ timeout: 5000 });
    await page.locator('button:has-text("Update Question")').click();

    // Wait for success toast and modal to close
    await expect(page.getByText('Question updated successfully')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('h3:has-text("Question")')).not.toBeVisible({ timeout: 5000 });

    // Reopen the edit modal to verify the change was saved
    await editButtons.first().click();
    await expect(page.locator('h3:has-text("Question")')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('textarea[placeholder*="question"]')).toHaveValue('Edited E2E question text', { timeout: 5000 });
  });

  test('should edit a question and preserve correct answers', async ({ page }) => {
    // This test verifies the fix for sending correct_answers as strings (not indices)
    // Wait for table to load
    await page.waitForSelector('table', { timeout: 5000 });

    // Click Edit on first question in the table
    const editButtons = page.locator('table button[title="Edit"]');
    await editButtons.first().click();

    // Wait for modal to open
    await expect(page.locator('h3:has-text("Question")')).toBeVisible({ timeout: 5000 });

    // Wait for the form to load
    await page.waitForSelector('textarea[placeholder*="question"]', { timeout: 5000 });

    // Change the question title slightly
    const titleInput = page.locator('input[name="title"]');
    const currentTitle = await titleInput.inputValue();
    await titleInput.fill(currentTitle + ' (edited)');

    // Wait for Update button and click
    await expect(page.locator('button:has-text("Update Question")')).toBeVisible({ timeout: 5000 });
    await page.locator('button:has-text("Update Question")').click();

    // Wait for success toast
    await expect(page.getByText('Question updated successfully')).toBeVisible({ timeout: 5000 });

    // Wait for modal to close - should not get a 400 error
    await expect(page.locator('h3:has-text("Question")')).not.toBeVisible({ timeout: 5000 });

    // Verify the updated title appears in the list
    await expect(page.locator(`text=${currentTitle} (edited)`)).toBeVisible({ timeout: 5000 });
  });

  test('should delete a question', async ({ page }) => {
    // Wait for table to load
    await page.waitForSelector('table', { timeout: 5000 });

    // Get the title of the first question (second cell of first data row)
    const firstRow = page.locator('table tbody tr').first();
    const firstQuestionTitle = await firstRow.locator('td').nth(1).textContent();

    // Click Delete on first question (icon-only button with title attribute)
    await page.getByRole('button', { name: 'Delete' }).first().click();

    // Wait for confirmation modal
    await expect(page.getByRole('heading', { name: 'Confirm Delete' })).toBeVisible({ timeout: 5000 });

    // Confirm deletion
    await page.getByRole('button', { name: 'Delete Question' }).click();

    // Wait for modal to close and deletion to complete
    await expect(page.getByRole('heading', { name: 'Confirm Delete' })).not.toBeVisible({ timeout: 5000 });

    // Verify the deleted question title is no longer in the table
    await expect(page.getByRole('cell', { name: firstQuestionTitle })).not.toBeVisible({ timeout: 5000 });
  });
});
