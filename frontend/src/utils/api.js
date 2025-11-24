const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * Make an API request with automatic JWT inclusion
 * @param {string} endpoint - API endpoint (e.g., '/api/questions')
 * @param {object} options - Fetch options
 * @returns {Promise<any>} Response data
 */
export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('auth_token');

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  // Add Authorization header if token exists
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers
    });

    const data = await response.json();

    if (!response.ok) {
      // Handle auth errors
      if (response.status === 401) {
        // Token expired or invalid - clear it
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');

        // Redirect to login if not already there
        if (!window.location.pathname.includes('/admin/login')) {
          window.location.href = '/admin/login';
        }
      }

      throw new Error(data.error || `HTTP ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

/**
 * Login and store JWT
 * @param {string} username
 * @param {string} password
 * @returns {Promise<object>} User data and token
 */
export async function login(username, password) {
  const data = await apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });

  // Store token and user in localStorage
  localStorage.setItem('auth_token', data.token);
  localStorage.setItem('auth_user', JSON.stringify(data.user));

  return data;
}

/**
 * Logout and clear stored data
 */
export function logout() {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_user');
}

/**
 * Get current user from localStorage
 * @returns {object|null} User data or null if not logged in
 */
export function getCurrentUser() {
  const userJson = localStorage.getItem('auth_user');
  return userJson ? JSON.parse(userJson) : null;
}

/**
 * Check if user is logged in
 * @returns {boolean}
 */
export function isLoggedIn() {
  return !!localStorage.getItem('auth_token');
}

/**
 * Change password for authenticated user
 * @param {string} currentPassword
 * @param {string} newPassword
 * @returns {Promise<object>} Success message
 */
export async function changePassword(currentPassword, newPassword) {
  return await apiRequest('/api/auth/password', {
    method: 'PUT',
    body: JSON.stringify({ currentPassword, newPassword })
  });
}

// ============ Tests API ============

/**
 * Get all tests
 * @returns {Promise<object>} Tests list
 */
export async function getTests() {
  return apiRequest('/api/tests');
}

// ============ Analytics API ============

/**
 * Get per-question analytics for a test
 * @param {string} testId - Test UUID
 * @returns {Promise<object>} Analytics data with question stats
 */
export async function getQuestionAnalytics(testId) {
  return apiRequest(`/api/tests/${testId}/analytics/questions`);
}
