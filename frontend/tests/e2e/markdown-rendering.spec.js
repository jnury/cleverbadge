import { test, expect } from '@playwright/test';

test.describe('Markdown Rendering in Questions', () => {
  test.beforeEach(async ({ page }) => {
    // Assumes test data with markdown questions exists
    // This will be seeded in a later task
    await page.goto('/t/markdown-test');
    await page.fill('input[placeholder*="name"]', 'Test Candidate');
    await page.click('button:has-text("Start Test")');
  });

  test('renders bold text in question', async ({ page }) => {
    await expect(page.locator('strong').first()).toBeVisible();
  });

  test('renders inline code in question', async ({ page }) => {
    await expect(page.locator('code').first()).toBeVisible();
  });

  test('renders code block with syntax highlighting', async ({ page }) => {
    await expect(page.locator('.markdown-content pre')).toBeVisible();
  });

  test('renders markdown in answer options', async ({ page }) => {
    const option = page.locator('label').filter({ hasText: '`code`' }).first();
    await expect(option.locator('code')).toBeVisible();
  });
});
