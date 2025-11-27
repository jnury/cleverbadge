/**
 * LocalStorage utility for persisting assessment progress
 * Enables candidates to resume in-progress assessments
 */

const STORAGE_PREFIX = 'cleverbadge_assessment_';

/**
 * Get the storage key for a test
 * @param {string} testSlug - The test slug
 * @returns {string} - The storage key
 */
export function getStorageKey(testSlug) {
  return `${STORAGE_PREFIX}${testSlug}`;
}

/**
 * Save assessment progress to LocalStorage
 * @param {string} testSlug - The test slug
 * @param {Object} data - Assessment data to save
 */
export function saveAssessment(testSlug, data) {
  const key = getStorageKey(testSlug);
  localStorage.setItem(key, JSON.stringify({
    ...data,
    savedAt: new Date().toISOString()
  }));
}

/**
 * Load assessment progress from LocalStorage
 * @param {string} testSlug - The test slug
 * @returns {Object|null} - Assessment data or null if not found/expired
 */
export function loadAssessment(testSlug) {
  const key = getStorageKey(testSlug);
  const data = localStorage.getItem(key);
  if (!data) return null;

  try {
    const parsed = JSON.parse(data);

    // Check if expired (24 hours)
    const savedAt = new Date(parsed.savedAt);
    const now = new Date();
    const hoursDiff = (now - savedAt) / (1000 * 60 * 60);

    if (hoursDiff > 24) {
      clearAssessment(testSlug);
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

/**
 * Clear assessment progress from LocalStorage
 * @param {string} testSlug - The test slug
 */
export function clearAssessment(testSlug) {
  const key = getStorageKey(testSlug);
  localStorage.removeItem(key);
}
