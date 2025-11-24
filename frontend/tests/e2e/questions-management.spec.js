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
    await page.click('text=Create Question');

    await page.fill('textarea[placeholder*="question"]', 'What is 2+2?');
    await page.selectOption('select', 'SINGLE');

    // Fill options
    await page.fill('input[placeholder="Option 1"]', '3');
    await page.fill('input[placeholder="Option 2"]', '4');

    // Select correct answer
    const correctRadio = page.locator('input[type="radio"]').nth(1);
    await correctRadio.check();

    await page.fill('input[placeholder*="tags"]', 'math, easy');

    await page.locator('form button[type="submit"]').click();

    await expect(page.locator('text=Question created successfully')).toBeVisible();
    await expect(page.locator('text=What is 2+2?')).toBeVisible();
  });

  test('should filter questions by type', async ({ page }) => {
    // Wait for questions to load
    await page.waitForSelector('select');

    // Select the filter dropdown (first select is for filtering)
    await page.locator('select').first().selectOption('SINGLE');

    // Verify filtered results - should show count
    await expect(page.locator('text=/Showing \\d+ of \\d+ questions/')).toBeVisible();
  });

  test('should edit a question', async ({ page }) => {
    await page.locator('button:has-text("Edit")').first().click();
    await page.fill('textarea[placeholder*="question"]', 'Updated question text');
    await page.locator('button:has-text("Update Question")').click();
    await expect(page.locator('text=Question updated successfully')).toBeVisible();
  });

  test('should delete a question', async ({ page }) => {
    await page.locator('button:has-text("Delete")').first().click();
    await page.locator('button:has-text("Delete Question")').click();
    await expect(page.locator('text=Question deleted successfully')).toBeVisible();
  });
});
