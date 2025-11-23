import { test, expect } from '@playwright/test';

test.describe('Candidate Test Taking Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Assume backend is seeded with math-geo test
    await page.goto('/t/math-geo');
  });

  test('should complete full happy path with 100% score', async ({ page }) => {
    // Landing page
    await expect(page.locator('h1')).toContainText('Math & Geography Test');
    await expect(page.locator('text=Test your math and geography knowledge')).toBeVisible();

    // Enter candidate name
    await page.fill('input#name', 'Perfect Test Candidate');
    await page.click('button:has-text("Start Test")');

    // Wait for navigation to question runner
    await page.waitForURL('**/t/math-geo/run');

    // Question 1 (SINGLE: What is 2 + 2?)
    await expect(page.locator('h2')).toContainText('What is 2 + 2?');
    await expect(page.locator('text=Question 1 of 3')).toBeVisible();

    // Verify it's a radio button (SINGLE choice)
    const question1Radio = page.locator('input[type="radio"]').first();
    await expect(question1Radio).toBeVisible();

    // Select "4" (index 1)
    await page.locator('input[type="radio"]').nth(1).click();
    await page.click('button:has-text("Next")');

    // Question 2 (SINGLE: Capital of France?)
    await expect(page.locator('h2')).toContainText('capital of France');
    await expect(page.locator('text=Question 2 of 3')).toBeVisible();

    // Verify it's a radio button (SINGLE choice)
    const question2Radio = page.locator('input[type="radio"]').first();
    await expect(question2Radio).toBeVisible();

    // Select "Paris" (index 1)
    await page.locator('input[type="radio"]').nth(1).click();
    await page.click('button:has-text("Next")');

    // Question 3 (MULTIPLE: Even numbers)
    await expect(page.locator('h2')).toContainText('even numbers');
    await expect(page.locator('text=Question 3 of 3')).toBeVisible();
    await expect(page.locator('text=Select all that apply')).toBeVisible();

    // Verify it's checkboxes (MULTIPLE choice)
    const question3Checkbox = page.locator('input[type="checkbox"]').first();
    await expect(question3Checkbox).toBeVisible();

    // Select "2" (index 1) and "4" (index 3)
    await page.locator('input[type="checkbox"]').nth(1).click();
    await page.locator('input[type="checkbox"]').nth(3).click();

    // Submit test with confirmation
    page.once('dialog', dialog => dialog.accept());
    await page.click('button:has-text("Submit Test")');

    // Wait for results page
    await page.waitForURL('**/t/math-geo/result');

    // Results page - verify 100% score
    await expect(page.locator('text=Test Completed!')).toBeVisible();
    await expect(page.locator('text=Perfect Test Candidate')).toBeVisible();
    await expect(page.locator('text=100.0%')).toBeVisible();
    await expect(page.locator('text=PASSED')).toBeVisible();
  });

  test('should handle disabled test', async ({ page }) => {
    await page.goto('/t/disabled-test');

    // Should show error message
    await expect(page.locator('h1:has-text("Error")')).toBeVisible();
    await expect(page.locator('text=/not found|disabled|not available/i')).toBeVisible();
  });

  test('should handle non-existent test', async ({ page }) => {
    await page.goto('/t/non-existent-slug-12345');

    // Should show error message
    await expect(page.locator('h1:has-text("Error")')).toBeVisible();
    await expect(page.locator('text=/not found|doesn\'t exist/i')).toBeVisible();
  });

  test('should allow navigation back and forth between questions', async ({ page }) => {
    // Start test
    await page.fill('input#name', 'Navigation Tester');
    await page.click('button:has-text("Start Test")');
    await page.waitForURL('**/t/math-geo/run');

    // Answer Q1 - select index 1 ("4")
    await page.locator('input[type="radio"]').nth(1).click();
    await page.click('button:has-text("Next")');

    // Answer Q2 - select index 2 ("Berlin")
    await page.locator('input[type="radio"]').nth(2).click();
    await page.click('button:has-text("Next")');

    // On Q3 - go back to Q2
    await page.click('button:has-text("Previous")');

    // Verify we're on Q2 and answer persisted (index 2 should be checked)
    await expect(page.locator('h2')).toContainText('capital of France');
    await expect(page.locator('input[type="radio"]').nth(2)).toBeChecked();

    // Go back to Q1
    await page.click('button:has-text("Previous")');

    // Verify Q1 answer persisted (index 1 should be checked)
    await expect(page.locator('h2')).toContainText('What is 2 + 2?');
    await expect(page.locator('input[type="radio"]').nth(1)).toBeChecked();

    // Previous button should be disabled on first question
    await expect(page.locator('button:has-text("Previous")')).toBeDisabled();

    // Navigate forward to Q2
    await page.click('button:has-text("Next")');
    await expect(page.locator('h2')).toContainText('capital of France');
  });

  test('should show correct progress indicators', async ({ page }) => {
    await page.fill('input#name', 'Progress Checker');
    await page.click('button:has-text("Start Test")');
    await page.waitForURL('**/t/math-geo/run');

    // Check progress text on Q1
    await expect(page.locator('text=Question 1 of 3')).toBeVisible();

    // Check progress bar exists (should be ~33%)
    const progressBar = page.locator('.bg-tech.h-2');
    await expect(progressBar).toHaveCount(1);

    // Navigate to Q2
    await page.locator('input[type="radio"]').first().click();
    await page.click('button:has-text("Next")');

    // Check progress text on Q2
    await expect(page.locator('text=Question 2 of 3')).toBeVisible();

    // Navigate to Q3
    await page.locator('input[type="radio"]').first().click();
    await page.click('button:has-text("Next")');

    // Check progress text on Q3
    await expect(page.locator('text=Question 3 of 3')).toBeVisible();
  });

  test('should handle partial answers and calculate correct score', async ({ page }) => {
    // Start test
    await page.fill('input#name', 'Partial Answerer');
    await page.click('button:has-text("Start Test")');
    await page.waitForURL('**/t/math-geo/run');

    // Q1: Answer correctly (select "4" - index 1)
    // Weight: 1
    await page.locator('input[type="radio"]').nth(1).click();
    await page.click('button:has-text("Next")');

    // Q2: Answer incorrectly (select "London" - index 0)
    // Weight: 2
    await page.locator('input[type="radio"]').nth(0).click();
    await page.click('button:has-text("Next")');

    // Q3: Answer incorrectly - only select one correct option out of two (MULTIPLE)
    // Weight: 2
    // Correct answers are indices 1 and 3, we'll only select 1
    await page.locator('input[type="checkbox"]').nth(1).click();

    // Submit test
    page.once('dialog', dialog => dialog.accept());
    await page.click('button:has-text("Submit Test")');
    await page.waitForURL('**/t/math-geo/result');

    // Calculate expected score:
    // Q1 correct: 1 point, Q2 wrong: 0 points, Q3 wrong (partial): 0 points
    // Score = (1 / 5) * 100 = 20%
    await expect(page.locator('text=Test Completed!')).toBeVisible();
    await expect(page.locator('text=20.0%')).toBeVisible();
    await expect(page.locator('text=/NEEDS IMPROVEMENT/i')).toBeVisible();
  });

  test('should test SINGLE choice questions work correctly', async ({ page }) => {
    await page.fill('input#name', 'Single Choice Tester');
    await page.click('button:has-text("Start Test")');
    await page.waitForURL('**/t/math-geo/run');

    // Q1 is SINGLE choice
    await expect(page.locator('h2')).toContainText('What is 2 + 2?');

    // Should have radio buttons
    const radioButtons = page.locator('input[type="radio"]');
    await expect(radioButtons.first()).toBeVisible();

    // Select first option
    await radioButtons.nth(0).click();
    await expect(radioButtons.nth(0)).toBeChecked();

    // Select second option - first should become unchecked
    await radioButtons.nth(1).click();
    await expect(radioButtons.nth(1)).toBeChecked();
    await expect(radioButtons.nth(0)).not.toBeChecked();
  });

  test('should test MULTIPLE choice questions work correctly', async ({ page }) => {
    await page.fill('input#name', 'Multiple Choice Tester');
    await page.click('button:has-text("Start Test")');
    await page.waitForURL('**/t/math-geo/run');

    // Navigate to Q3 which is MULTIPLE choice
    await page.locator('input[type="radio"]').first().click();
    await page.click('button:has-text("Next")');
    await page.locator('input[type="radio"]').first().click();
    await page.click('button:has-text("Next")');

    // Q3 is MULTIPLE choice
    await expect(page.locator('h2')).toContainText('even numbers');
    await expect(page.locator('text=Select all that apply')).toBeVisible();

    // Should have checkboxes
    const checkboxes = page.locator('input[type="checkbox"]');
    await expect(checkboxes.first()).toBeVisible();

    // Select first option
    await checkboxes.nth(0).click();
    await expect(checkboxes.nth(0)).toBeChecked();

    // Select second option - first should remain checked
    await checkboxes.nth(1).click();
    await expect(checkboxes.nth(1)).toBeChecked();
    await expect(checkboxes.nth(0)).toBeChecked();

    // Uncheck first option
    await checkboxes.nth(0).click();
    await expect(checkboxes.nth(0)).not.toBeChecked();
    await expect(checkboxes.nth(1)).toBeChecked();
  });

  test('should prevent submission without candidate name', async ({ page }) => {
    // Try to start without entering name
    const startButton = page.locator('button:has-text("Start Test")');

    // Click start button without filling name
    await startButton.click();

    // Should still be on landing page due to HTML5 validation or alert
    // The candidateName field has validation, so we should see alert or stay on page
    await expect(page).toHaveURL(/\/t\/math-geo$/);
  });

  test('should display candidate name throughout the test', async ({ page }) => {
    const candidateName = 'Display Name Tester';

    await page.fill('input#name', candidateName);
    await page.click('button:has-text("Start Test")');
    await page.waitForURL('**/t/math-geo/run');

    // Candidate name should be visible in question runner
    await expect(page.locator(`text=${candidateName}`)).toBeVisible();

    // Complete the test
    await page.locator('input[type="radio"]').first().click();
    await page.click('button:has-text("Next")');
    await page.locator('input[type="radio"]').first().click();
    await page.click('button:has-text("Next")');
    await page.locator('input[type="checkbox"]').first().click();

    page.once('dialog', dialog => dialog.accept());
    await page.click('button:has-text("Submit Test")');
    await page.waitForURL('**/t/math-geo/result');

    // Candidate name should be visible in results
    await expect(page.locator(`text=${candidateName}`)).toBeVisible();
  });

  test('should show submit confirmation dialog', async ({ page }) => {
    await page.fill('input#name', 'Confirmation Tester');
    await page.click('button:has-text("Start Test")');
    await page.waitForURL('**/t/math-geo/run');

    // Navigate to last question
    await page.locator('input[type="radio"]').first().click();
    await page.click('button:has-text("Next")');
    await page.locator('input[type="radio"]').first().click();
    await page.click('button:has-text("Next")');
    await page.locator('input[type="checkbox"]').first().click();

    // Setup dialog handler to dismiss (cancel)
    page.once('dialog', dialog => {
      expect(dialog.message()).toContain('Are you sure');
      dialog.dismiss();
    });

    await page.click('button:has-text("Submit Test")');

    // Should still be on question runner (not submitted)
    await expect(page).toHaveURL(/\/t\/math-geo\/run$/);
    await expect(page.locator('h2')).toContainText('even numbers');
  });

  test('should calculate weighted scoring correctly', async ({ page }) => {
    // This test verifies the weighted scoring formula
    // Weights: Q1=1, Q2=2, Q3=2
    // Total weight = 5

    await page.fill('input#name', 'Weighted Score Tester');
    await page.click('button:has-text("Start Test")');
    await page.waitForURL('**/t/math-geo/run');

    // Q1: Correct (weight 1)
    await page.locator('input[type="radio"]').nth(1).click();
    await page.click('button:has-text("Next")');

    // Q2: Correct (weight 2)
    await page.locator('input[type="radio"]').nth(1).click();
    await page.click('button:has-text("Next")');

    // Q3: Wrong (weight 2)
    await page.locator('input[type="checkbox"]').nth(0).click();

    page.once('dialog', dialog => dialog.accept());
    await page.click('button:has-text("Submit Test")');
    await page.waitForURL('**/t/math-geo/result');

    // Score = (1 + 2) / 5 * 100 = 60%
    await expect(page.locator('text=60.0%')).toBeVisible();
    await expect(page.locator('text=/GOOD/i')).toBeVisible();
  });

  test('should handle zero score correctly', async ({ page }) => {
    await page.fill('input#name', 'Zero Score Tester');
    await page.click('button:has-text("Start Test")');
    await page.waitForURL('**/t/math-geo/run');

    // Q1: Wrong - select "3" (index 0)
    await page.locator('input[type="radio"]').nth(0).click();
    await page.click('button:has-text("Next")');

    // Q2: Wrong - select "London" (index 0)
    await page.locator('input[type="radio"]').nth(0).click();
    await page.click('button:has-text("Next")');

    // Q3: Wrong - select wrong options
    await page.locator('input[type="checkbox"]').nth(0).click();

    page.once('dialog', dialog => dialog.accept());
    await page.click('button:has-text("Submit Test")');
    await page.waitForURL('**/t/math-geo/result');

    // Score = 0%
    await expect(page.locator('text=0.0%')).toBeVisible();
    await expect(page.locator('text=/NEEDS IMPROVEMENT/i')).toBeVisible();
  });
});
