import { test, expect } from '@playwright/test';

// Helper function to select a radio option by its label text
async function selectRadioByText(page, text) {
  await page.locator(`label:has-text("${text}") input[type="radio"]`).click();
}

// Helper function to select a checkbox option by its label text
async function selectCheckboxByText(page, text) {
  await page.locator(`label:has-text("${text}") input[type="checkbox"]`).click();
}

// Helper function to verify a radio is checked by its label text
async function expectRadioChecked(page, text) {
  await expect(page.locator(`label:has-text("${text}") input[type="radio"]`)).toBeChecked();
}

// Helper function to verify a checkbox is checked by its label text
async function expectCheckboxChecked(page, text) {
  await expect(page.locator(`label:has-text("${text}") input[type="checkbox"]`)).toBeChecked();
}

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
    await expect(page.getByText('What is 2 + 2?')).toBeVisible();
    await expect(page.locator('text=Question 1 of 3')).toBeVisible();

    // Verify it's a radio button (SINGLE choice)
    const question1Radio = page.locator('input[type="radio"]').first();
    await expect(question1Radio).toBeVisible();

    // Select "4" (correct answer) by text
    await selectRadioByText(page, '4');
    await page.click('button:has-text("Next")');

    // Question 2 (SINGLE: Capital of France?)
    await expect(page.getByText(/capital of France/i)).toBeVisible();
    await expect(page.locator('text=Question 2 of 3')).toBeVisible();

    // Verify it's a radio button (SINGLE choice)
    const question2Radio = page.locator('input[type="radio"]').first();
    await expect(question2Radio).toBeVisible();

    // Select "Paris" (correct answer) by text
    await selectRadioByText(page, 'Paris');
    await page.click('button:has-text("Next")');

    // Question 3 (MULTIPLE: Even numbers)
    await expect(page.getByRole('heading', { name: 'Even Numbers' })).toBeVisible();
    await expect(page.locator('text=Question 3 of 3')).toBeVisible();
    await expect(page.locator('text=Select all that apply')).toBeVisible();

    // Verify it's checkboxes (MULTIPLE choice)
    const question3Checkbox = page.locator('input[type="checkbox"]').first();
    await expect(question3Checkbox).toBeVisible();

    // Select "2" and "4" (correct answers) by text
    await selectCheckboxByText(page, '2');
    await selectCheckboxByText(page, '4');

    // Submit test with confirmation
    page.once('dialog', dialog => dialog.accept());
    await page.click('button:has-text("Submit Test")');

    // Wait for results page
    await page.waitForURL('**/t/math-geo/result');

    // Results page - verify 100% score
    await expect(page.locator('text=Test Completed!')).toBeVisible();
    await expect(page.locator('text=Perfect Test Candidate')).toBeVisible();
    await expect(page.locator('text=100%')).toBeVisible();
    await expect(page.locator('text=PASSED')).toBeVisible();
  });

  test('should handle disabled test', async ({ page }) => {
    await page.goto('/t/disabled-test');

    // Should show that test is disabled (page renders but shows disabled message in red)
    await expect(page.locator('p.text-red-600:has-text("This test is disabled")')).toBeVisible();

    // Should not show start button when test is disabled
    await expect(page.locator('button:has-text("Start Test")')).not.toBeVisible();
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

    // Answer Q1 - select "4" (correct)
    await selectRadioByText(page, '4');
    await page.click('button:has-text("Next")');

    // Answer Q2 - select "Berlin" (wrong)
    await selectRadioByText(page, 'Berlin');
    await page.click('button:has-text("Next")');

    // On Q3 - go back to Q2
    await page.click('button:has-text("Previous")');

    // Verify we're on Q2 and answer persisted (Berlin should be checked)
    await expect(page.getByText(/capital of France/i)).toBeVisible();
    await expectRadioChecked(page, 'Berlin');

    // Go back to Q1
    await page.click('button:has-text("Previous")');

    // Verify Q1 answer persisted ("4" should be checked)
    await expect(page.getByText('What is 2 + 2?')).toBeVisible();
    await expectRadioChecked(page, '4');

    // Previous button should be disabled on first question
    await expect(page.locator('button:has-text("Previous")')).toBeDisabled();

    // Navigate forward to Q2
    await page.click('button:has-text("Next")');
    await expect(page.getByText(/capital of France/i)).toBeVisible();
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

    // Q1: Answer correctly (select "4")
    // Weight: 1
    await selectRadioByText(page, '4');
    await page.click('button:has-text("Next")');

    // Q2: Answer incorrectly (select "London")
    // Weight: 2
    await selectRadioByText(page, 'London');
    await page.click('button:has-text("Next")');

    // Q3: Answer incorrectly - only select one correct option out of two (MULTIPLE)
    // Weight: 2
    // Correct answers are "2" and "4", we'll only select "2"
    await selectCheckboxByText(page, '2');

    // Submit test
    page.once('dialog', dialog => dialog.accept());
    await page.click('button:has-text("Submit Test")');
    await page.waitForURL('**/t/math-geo/result');

    // Calculate expected score:
    // Q1 correct: 1 point, Q2 wrong: 0 points, Q3 wrong (partial): 0 points
    // Score = (1 / 5) * 100 = 20%
    await expect(page.locator('text=Test Completed!')).toBeVisible();
    await expect(page.locator('text=20%')).toBeVisible();
    await expect(page.locator('text=/NOT PASSED/i')).toBeVisible();
  });

  test('should test SINGLE choice questions work correctly', async ({ page }) => {
    await page.fill('input#name', 'Single Choice Tester');
    await page.click('button:has-text("Start Test")');
    await page.waitForURL('**/t/math-geo/run');

    // Q1 is SINGLE choice
    await expect(page.getByText('What is 2 + 2?')).toBeVisible();

    // Should have radio buttons
    const radioButtons = page.locator('input[type="radio"]');
    await expect(radioButtons.first()).toBeVisible();

    // Select "3" (first visible option - wrong answer)
    await selectRadioByText(page, '3');
    await expectRadioChecked(page, '3');

    // Select "4" - "3" should become unchecked
    await selectRadioByText(page, '4');
    await expectRadioChecked(page, '4');
    await expect(page.locator('label:has-text("3") input[type="radio"]')).not.toBeChecked();
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
    await expect(page.getByRole('heading', { name: 'Even Numbers' })).toBeVisible();
    await expect(page.locator('text=Select all that apply')).toBeVisible();

    // Should have checkboxes
    const checkboxes = page.locator('input[type="checkbox"]');
    await expect(checkboxes.first()).toBeVisible();

    // Select "1" (odd number)
    await selectCheckboxByText(page, '1');
    await expectCheckboxChecked(page, '1');

    // Select "2" - "1" should remain checked (multiple allowed)
    await selectCheckboxByText(page, '2');
    await expectCheckboxChecked(page, '2');
    await expectCheckboxChecked(page, '1');

    // Uncheck "1"
    await selectCheckboxByText(page, '1');
    await expect(page.locator('label:has-text("1") input[type="checkbox"]')).not.toBeChecked();
    await expectCheckboxChecked(page, '2');
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
    await expect(page.getByRole('heading', { name: 'Even Numbers' })).toBeVisible();
  });

  test('should calculate weighted scoring correctly', async ({ page }) => {
    // This test verifies the weighted scoring formula
    // Weights: Q1=1, Q2=2, Q3=2
    // Total weight = 5

    await page.fill('input#name', 'Weighted Score Tester');
    await page.click('button:has-text("Start Test")');
    await page.waitForURL('**/t/math-geo/run');

    // Q1: Correct (select "4", weight 1)
    await selectRadioByText(page, '4');
    await page.click('button:has-text("Next")');

    // Q2: Correct (select "Paris", weight 2)
    await selectRadioByText(page, 'Paris');
    await page.click('button:has-text("Next")');

    // Q3: Wrong (select "1" which is odd, weight 2)
    await selectCheckboxByText(page, '1');

    page.once('dialog', dialog => dialog.accept());
    await page.click('button:has-text("Submit Test")');
    await page.waitForURL('**/t/math-geo/result');

    // Score = (1 + 2) / 5 * 100 = 60%
    await expect(page.locator('text=60%')).toBeVisible();
    await expect(page.locator('text=/NOT PASSED/i')).toBeVisible();
  });

  test('should handle zero score correctly', async ({ page }) => {
    await page.fill('input#name', 'Zero Score Tester');
    await page.click('button:has-text("Start Test")');
    await page.waitForURL('**/t/math-geo/run');

    // Q1: Wrong - select "3" (incorrect)
    await selectRadioByText(page, '3');
    await page.click('button:has-text("Next")');

    // Q2: Wrong - select "London" (incorrect)
    await selectRadioByText(page, 'London');
    await page.click('button:has-text("Next")');

    // Q3: Wrong - select "1" (odd number, incorrect)
    await selectCheckboxByText(page, '1');

    page.once('dialog', dialog => dialog.accept());
    await page.click('button:has-text("Submit Test")');
    await page.waitForURL('**/t/math-geo/result');

    // Score = 0%
    await expect(page.locator('text=0%')).toBeVisible();
    await expect(page.locator('text=/NOT PASSED/i')).toBeVisible();
  });
});
