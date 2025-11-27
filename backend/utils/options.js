/**
 * Options utility functions for the new options format
 * Options are stored as: { "0": { text, is_correct, explanation? }, "1": { ... } }
 */

/**
 * Convert array of option objects to dict format
 * @param {Array} options - Array of { text, is_correct, explanation? }
 * @returns {Object} Dict with string keys "0", "1", etc.
 */
export function convertArrayToDict(options) {
  const dict = {};
  options.forEach((opt, index) => {
    dict[String(index)] = { ...opt };
  });
  return dict;
}

/**
 * Shuffle options and return array with id and text only (for candidates)
 * @param {Object} options - Dict format options
 * @returns {Array} Shuffled array of { id, text }
 */
export function shuffleOptions(options) {
  const entries = Object.entries(options).map(([id, opt]) => ({
    id,
    text: opt.text
  }));

  // Fisher-Yates shuffle
  for (let i = entries.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [entries[i], entries[j]] = [entries[j], entries[i]];
  }

  return entries;
}

/**
 * Strip is_correct and explanation from options (for sending to candidates)
 * @param {Object} options - Dict format options
 * @returns {Object} Dict with only { text } per option
 */
export function stripAnswersFromOptions(options) {
  const stripped = {};
  for (const [id, opt] of Object.entries(options)) {
    stripped[id] = { text: opt.text };
  }
  return stripped;
}

/**
 * Get array of option IDs that are correct
 * @param {Object} options - Dict format options
 * @returns {Array} Array of string IDs
 */
export function getCorrectOptionIds(options) {
  return Object.entries(options)
    .filter(([_, opt]) => opt.is_correct)
    .map(([id]) => id);
}

/**
 * Validate options format and correctness rules
 * @param {Object} options - Dict format options
 * @param {string} type - 'SINGLE' or 'MULTIPLE'
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateOptionsFormat(options, type) {
  const errors = [];
  const entries = Object.entries(options);

  // Check option count
  if (entries.length < 2 || entries.length > 10) {
    errors.push('Questions must have between 2 and 10 options');
  }

  // Check each option has text
  for (const [id, opt] of entries) {
    if (!opt.text || typeof opt.text !== 'string') {
      errors.push(`Option ${id} is missing text`);
    }
    if (typeof opt.is_correct !== 'boolean') {
      errors.push(`Option ${id} is missing is_correct boolean`);
    }
  }

  // Check correct answer count based on type
  const correctCount = entries.filter(([_, opt]) => opt.is_correct).length;

  if (type === 'SINGLE' && correctCount !== 1) {
    errors.push('SINGLE type questions must have exactly 1 correct answer');
  }

  if (type === 'MULTIPLE' && correctCount < 1) {
    errors.push('MULTIPLE type questions must have at least 1 correct answer');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
