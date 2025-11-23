/**
 * Scoring utility functions for assessment evaluation
 */

/**
 * Checks if a candidate's answer is correct based on question type
 * @param {string} questionType - Either 'SINGLE' or 'MULTIPLE'
 * @param {number[]} selectedOptions - Array of selected option indices
 * @param {number[]} correctAnswers - Array of correct option indices
 * @returns {boolean} - True if answer is correct
 */
export function isAnswerCorrect(questionType, selectedOptions, correctAnswers) {
  if (questionType === 'SINGLE') {
    // SINGLE: correct if selected_options has exactly 1 item AND it's in correct_answers
    return selectedOptions.length === 1 && correctAnswers.includes(selectedOptions[0]);
  } else {
    // MULTIPLE: arrays must match (order-independent)
    const selectedSorted = [...selectedOptions].sort((a, b) => a - b);
    const correctSorted = [...correctAnswers].sort((a, b) => a - b);
    return JSON.stringify(selectedSorted) === JSON.stringify(correctSorted);
  }
}

/**
 * Calculates the overall score percentage based on weighted questions
 * @param {Array} questions - Array of question objects with {id, type, correct_answers, weight}
 * @param {Object} answers - Object mapping question IDs to selected options arrays
 * @returns {number} - Score percentage (0-100)
 */
export function calculateScore(questions, answers) {
  let totalScore = 0;
  let maxScore = 0;

  for (const question of questions) {
    maxScore += question.weight;

    // Get selected options for this question (default to empty array if not answered)
    const selectedOptions = answers[question.id] || [];

    // Check if answer is correct
    const correct = isAnswerCorrect(question.type, selectedOptions, question.correct_answers);

    if (correct) {
      totalScore += question.weight;
    }
  }

  // Calculate percentage
  return maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
}
