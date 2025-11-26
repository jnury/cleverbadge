import { test, expect } from '@playwright/test';

test.describe('Markdown Rendering in Questions', () => {
  // Helper function to navigate to a specific question by going through the test
  const navigateToMarkdownQuestion = async (page) => {
    await page.goto('/t/markdown-test');
    await page.fill('input#name', 'Test Candidate');
    await page.click('button:has-text("Start Test")');

    // Navigate through questions until we find the markdown question with code block
    for (let i = 0; i < 5; i++) {
      const codeBlock = page.locator('.markdown-content code').filter({ hasText: 'const sum' });
      if (await codeBlock.count() > 0) {
        return; // Found the markdown question
      }
      // Try to go to next question if available
      const nextButton = page.locator('button:has-text("Next")');
      if (await nextButton.count() > 0 && await nextButton.isEnabled()) {
        await nextButton.click();
        await page.waitForTimeout(300);
      } else {
        break;
      }
    }
  };

  test('renders bold text in question', async ({ page }) => {
    await navigateToMarkdownQuestion(page);
    const bold = page.locator('.markdown-content strong').first();
    await expect(bold).toBeVisible();
    await expect(bold).toHaveText('What does this code do?');
  });

  test('renders code block with JavaScript syntax highlighting', async ({ page }) => {
    await navigateToMarkdownQuestion(page);
    // SyntaxHighlighter renders code blocks - look for code element containing the snippet
    const codeBlock = page.locator('.markdown-content code').filter({ hasText: 'const sum' }).first();
    await expect(codeBlock).toBeVisible();
    await expect(codeBlock).toContainText('const sum');
  });

  test('code block has brand color background', async ({ page }) => {
    await navigateToMarkdownQuestion(page);
    // SyntaxHighlighter renders code blocks with the const sum content - find that specific code element
    const codeBlock = page.locator('.markdown-content code').filter({ hasText: 'const sum' }).first();
    const bgColor = await codeBlock.evaluate(el => {
      // Check the element and its parent for the background color (inline styles from theme)
      const style = window.getComputedStyle(el);
      if (style.backgroundColor !== 'rgba(0, 0, 0, 0)') {
        return style.backgroundColor;
      }
      // Check parent if element has transparent background
      const parentStyle = window.getComputedStyle(el.parentElement);
      return parentStyle.backgroundColor;
    });
    // Deep Teal #1D4E5A = rgb(29, 78, 90)
    expect(bgColor).toBe('rgb(29, 78, 90)');
  });

  test('renders inline code in options', async ({ page }) => {
    await navigateToMarkdownQuestion(page);
    // The markdown question has options with inline code like `reduce()`
    const option = page.locator('label').filter({ hasText: 'reduce()' }).first();
    const code = option.locator('code').first();
    await expect(code).toBeVisible();
    await expect(code).toHaveText('reduce()');
  });

  test('test landing shows markdown description', async ({ page }) => {
    await page.goto('/t/markdown-test');
    const description = page.locator('.markdown-content').first();
    await expect(description.locator('strong').first()).toHaveText('markdown rendering');
    await expect(description.locator('code').first()).toHaveText('code syntax');
  });
});
