/**
 * Scoring utility functions for assessment evaluation
 */

/**
 * Check if a candidate's answer is correct
 * @param {string} type - 'SINGLE' or 'MULTIPLE'
 * @param {Array<string>} selectedOptions - Array of option IDs selected by candidate
 * @param {Array<string>} correctOptions - Array of correct option IDs
 * @returns {boolean}
 */
export function isAnswerCorrect(type, selectedOptions, correctOptions) {
  // Normalize to arrays of strings
  const selected = selectedOptions.map(String).sort();
  const correct = correctOptions.map(String).sort();

  if (type === 'SINGLE') {
    // For single choice, must select exactly one and it must be correct
    return selected.length === 1 && selected[0] === correct[0];
  }

  // For multiple choice, must select exactly the correct options
  if (selected.length !== correct.length) {
    return false;
  }

  return selected.every((val, idx) => val === correct[idx]);
}

/**
 * Calculate weighted score percentage
 * @param {Array<{isCorrect: boolean, weight: number}>} answers
 * @returns {number} Percentage 0-100
 */
export function calculateScore(answers) {
  if (answers.length === 0) return 0;

  const totalWeight = answers.reduce((sum, a) => sum + a.weight, 0);
  const earnedWeight = answers
    .filter(a => a.isCorrect)
    .reduce((sum, a) => sum + a.weight, 0);

  return totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;
}
