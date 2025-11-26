// backend/utils/visibility.js

/**
 * Visibility hierarchy (from least to most restrictive):
 * public (0) < private (1) < protected (2)
 */
const VISIBILITY_LEVEL = {
  'public': 0,
  'private': 1,
  'protected': 2
};

/**
 * Check if a question with given visibility can be added to a test with given visibility.
 * Rule: Question can only be in tests with equal or higher restriction level.
 *
 * @param {string} questionVisibility - 'public', 'private', or 'protected'
 * @param {string} testVisibility - 'public', 'private', or 'protected'
 * @returns {boolean}
 */
export function canQuestionBeInTest(questionVisibility, testVisibility) {
  const questionLevel = VISIBILITY_LEVEL[questionVisibility];
  const testLevel = VISIBILITY_LEVEL[testVisibility];

  // Question can be in test if test is at least as restrictive
  return testLevel >= questionLevel;
}

/**
 * Get questions that are incompatible with a given test visibility.
 *
 * @param {Array} questions - Array of question objects with visibility property
 * @param {string} testVisibility - Target test visibility
 * @returns {Array} Questions that cannot be in the test
 */
export function getIncompatibleQuestions(questions, testVisibility) {
  return questions.filter(q => !canQuestionBeInTest(q.visibility, testVisibility));
}

/**
 * Check if question visibility can be changed given the tests it's used in.
 *
 * @param {string} currentVisibility - Current question visibility
 * @param {string} newVisibility - Desired new visibility
 * @param {Array} testsUsingQuestion - Tests that contain this question
 * @returns {{ allowed: boolean, blockedBy?: Array }}
 */
export function canChangeQuestionVisibility(currentVisibility, newVisibility, testsUsingQuestion) {
  // Find tests that would become incompatible
  const blockedBy = testsUsingQuestion.filter(test =>
    !canQuestionBeInTest(newVisibility, test.visibility)
  );

  if (blockedBy.length > 0) {
    return {
      allowed: false,
      blockedBy: blockedBy.map(t => ({ id: t.id, title: t.title, visibility: t.visibility }))
    };
  }

  return { allowed: true };
}

/**
 * Check if test visibility can be changed given its questions.
 *
 * @param {string} currentVisibility - Current test visibility
 * @param {string} newVisibility - Desired new visibility
 * @param {Array} questionsInTest - Questions assigned to this test
 * @returns {{ allowed: boolean, blockedBy?: Array }}
 */
export function canChangeTestVisibility(currentVisibility, newVisibility, questionsInTest) {
  // Find questions that would become incompatible
  const incompatible = getIncompatibleQuestions(questionsInTest, newVisibility);

  if (incompatible.length > 0) {
    return {
      allowed: false,
      blockedBy: incompatible.map(q => ({ id: q.id, title: q.title, visibility: q.visibility }))
    };
  }

  return { allowed: true };
}
