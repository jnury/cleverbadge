import { test, expect } from '@playwright/test';

// Helper function to select an option by its text
// Options are rendered as div.p-4.border-2.rounded-lg with the option text inside
async function selectOptionByText(page, text) {
  await page.locator(`div.p-4.border-2.rounded-lg`).filter({ hasText: new RegExp(`^${text}$`) }).click();
}

// Helper function to verify an option is selected by its text
// Selected options have a span with border-tech bg-tech classes
async function expectOptionSelected(page, text) {
  const optionDiv = page.locator(`div.p-4.border-2.rounded-lg`).filter({ hasText: new RegExp(`^${text}$`) });
  // Selected option has border-tech class on the parent div
  await expect(optionDiv).toHaveClass(/border-tech/);
}

// Helper function to verify an option is NOT selected
async function expectOptionNotSelected(page, text) {
  const optionDiv = page.locator(`div.p-4.border-2.rounded-lg`).filter({ hasText: new RegExp(`^${text}$`) });
  await expect(optionDiv).not.toHaveClass(/border-tech/);
}

// Backwards compatibility aliases
const selectRadioByText = selectOptionByText;
const selectCheckboxByText = selectOptionByText;
const expectRadioChecked = expectOptionSelected;
const expectCheckboxChecked = expectOptionSelected;

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

    // Verify options are visible (styled div elements)
    const question1Option = page.locator('div.p-4.border-2.rounded-lg').first();
    await expect(question1Option).toBeVisible();

    // Select "4" (correct answer) by text
    await selectRadioByText(page, '4');
    await page.click('button:has-text("Next")');

    // Question 2 (SINGLE: Capital of France?)
    await expect(page.getByText(/capital of France/i)).toBeVisible();
    await expect(page.locator('text=Question 2 of 3')).toBeVisible();

    // Verify options are visible (styled div elements)
    const question2Option = page.locator('div.p-4.border-2.rounded-lg').first();
    await expect(question2Option).toBeVisible();

    // Select "Paris" (correct answer) by text
    await selectRadioByText(page, 'Paris');
    await page.click('button:has-text("Next")');

    // Question 3 (MULTIPLE: Even numbers)
    await expect(page.getByRole('heading', { name: 'Even Numbers' })).toBeVisible();
    await expect(page.locator('text=Question 3 of 3')).toBeVisible();
    await expect(page.locator('text=Select all that apply')).toBeVisible();

    // Verify options are visible (styled div elements)
    const question3Option = page.locator('div.p-4.border-2.rounded-lg').first();
    await expect(question3Option).toBeVisible();

    // Select "2" and "4" (correct answers) by text
    await selectCheckboxByText(page, '2');
    await selectCheckboxByText(page, '4');

    // Submit test - click Submit Test button to open modal
    await page.click('button:has-text("Submit Test")');

    // Wait for confirmation modal and click Submit Test button in modal
    await expect(page.locator('h3:has-text("Submit Test?")')).toBeVisible();
    await page.locator('div.fixed button:has-text("Submit Test")').click();

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
    // Use class selector since description also contains "This test is disabled"
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
    await page.locator('div.p-4.border-2.rounded-lg').first().click();
    await page.click('button:has-text("Next")');

    // Check progress text on Q2
    await expect(page.locator('text=Question 2 of 3')).toBeVisible();

    // Navigate to Q3
    await page.locator('div.p-4.border-2.rounded-lg').first().click();
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

    // Submit test - click Submit Test button to open modal
    await page.click('button:has-text("Submit Test")');
    await expect(page.locator('h3:has-text("Submit Test?")')).toBeVisible();
    await page.locator('div.fixed button:has-text("Submit Test")').click();
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

    // Should have option divs
    const optionDivs = page.locator('div.p-4.border-2.rounded-lg');
    await expect(optionDivs.first()).toBeVisible();

    // Select "3" (wrong answer)
    await selectRadioByText(page, '3');
    await expectRadioChecked(page, '3');

    // Select "4" - "3" should become deselected
    await selectRadioByText(page, '4');
    await expectRadioChecked(page, '4');
    await expectOptionNotSelected(page, '3');
  });

  test('should test MULTIPLE choice questions work correctly', async ({ page }) => {
    await page.fill('input#name', 'Multiple Choice Tester');
    await page.click('button:has-text("Start Test")');
    await page.waitForURL('**/t/math-geo/run');

    // Navigate to Q3 which is MULTIPLE choice
    await page.locator('div.p-4.border-2.rounded-lg').first().click();
    await page.click('button:has-text("Next")');
    await page.locator('div.p-4.border-2.rounded-lg').first().click();
    await page.click('button:has-text("Next")');

    // Q3 is MULTIPLE choice
    await expect(page.getByRole('heading', { name: 'Even Numbers' })).toBeVisible();
    await expect(page.locator('text=Select all that apply')).toBeVisible();

    // Should have option divs
    const optionDivs = page.locator('div.p-4.border-2.rounded-lg');
    await expect(optionDivs.first()).toBeVisible();

    // Select "1" (odd number)
    await selectCheckboxByText(page, '1');
    await expectCheckboxChecked(page, '1');

    // Select "2" - "1" should remain checked (multiple allowed)
    await selectCheckboxByText(page, '2');
    await expectCheckboxChecked(page, '2');
    await expectCheckboxChecked(page, '1');

    // Uncheck "1"
    await selectCheckboxByText(page, '1');
    await expectOptionNotSelected(page, '1');
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
    await page.locator('div.p-4.border-2.rounded-lg').first().click();
    await page.click('button:has-text("Next")');
    await page.locator('div.p-4.border-2.rounded-lg').first().click();
    await page.click('button:has-text("Next")');
    await page.locator('div.p-4.border-2.rounded-lg').first().click();

    await page.click('button:has-text("Submit Test")');
    await expect(page.locator('h3:has-text("Submit Test?")')).toBeVisible();
    await page.locator('div.fixed button:has-text("Submit Test")').click();
    await page.waitForURL('**/t/math-geo/result');

    // Candidate name should be visible in results
    await expect(page.locator(`text=${candidateName}`)).toBeVisible();
  });

  test('should show submit confirmation modal', async ({ page }) => {
    await page.fill('input#name', 'Confirmation Tester');
    await page.click('button:has-text("Start Test")');
    await page.waitForURL('**/t/math-geo/run');

    // Navigate to last question
    await page.locator('div.p-4.border-2.rounded-lg').first().click();
    await page.click('button:has-text("Next")');
    await page.locator('div.p-4.border-2.rounded-lg').first().click();
    await page.click('button:has-text("Next")');
    await page.locator('div.p-4.border-2.rounded-lg').first().click();

    // Click Submit Test to open modal
    await page.click('button:has-text("Submit Test")');

    // Modal should be visible with confirmation message
    await expect(page.locator('h3:has-text("Submit Test?")')).toBeVisible();
    await expect(page.locator('text=Are you sure you want to submit')).toBeVisible();

    // Click Cancel button in modal
    await page.locator('div.fixed button:has-text("Cancel")').click();

    // Modal should be closed, should still be on question runner (not submitted)
    await expect(page.locator('h3:has-text("Submit Test?")')).not.toBeVisible();
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

    await page.click('button:has-text("Submit Test")');
    await expect(page.locator('h3:has-text("Submit Test?")')).toBeVisible();
    await page.locator('div.fixed button:has-text("Submit Test")').click();
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

    await page.click('button:has-text("Submit Test")');
    await expect(page.locator('h3:has-text("Submit Test?")')).toBeVisible();
    await page.locator('div.fixed button:has-text("Submit Test")').click();
    await page.waitForURL('**/t/math-geo/result');

    // Score = 0%
    await expect(page.locator('text=0%')).toBeVisible();
    await expect(page.locator('text=/NOT PASSED/i')).toBeVisible();
  });
});
