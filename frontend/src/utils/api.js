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

        // Redirect to homepage if accessing dashboard
        if (window.location.pathname.startsWith('/dashboard')) {
          window.location.href = '/';
        }
      }

      // Create error object that preserves status and code
      const error = new Error(data.error || `HTTP ${response.status}`);
      error.status = response.status;
      error.code = data.code;
      throw error;
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

/**
 * Register a new user
 * @param {string} email
 * @param {string} displayName
 * @param {string} password
 * @returns {Promise<object>} Registration result
 */
export async function register(email, displayName, password) {
  return await apiRequest('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, displayName, password })
  });
}

/**
 * Verify email with token
 * @param {string} token
 * @returns {Promise<object>} Verification result
 */
export async function verifyEmail(token) {
  return await apiRequest('/api/auth/verify-email', {
    method: 'POST',
    body: JSON.stringify({ token })
  });
}

/**
 * Request password reset email
 * @param {string} email
 * @returns {Promise<object>} Result message
 */
export async function forgotPassword(email) {
  return await apiRequest('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email })
  });
}

/**
 * Reset password with token
 * @param {string} token
 * @param {string} newPassword
 * @returns {Promise<object>} Result message
 */
export async function resetPassword(token, newPassword) {
  return await apiRequest('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, newPassword })
  });
}

/**
 * Resend verification email
 * @param {string} email
 * @returns {Promise<object>} Result message
 */
export async function resendVerification(email) {
  return await apiRequest('/api/auth/resend-verification', {
    method: 'POST',
    body: JSON.stringify({ email })
  });
}

/**
 * Login with email (new auth flow)
 * @param {string} email
 * @param {string} password
 * @returns {Promise<object>} User data and token
 */
export async function loginWithEmail(email, password) {
  const data = await apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });

  // Store token and user in localStorage
  localStorage.setItem('auth_token', data.token);
  localStorage.setItem('auth_user', JSON.stringify(data.user));

  return data;
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

// ============ Assessments API ============

/**
 * Verify if an assessment can be resumed
 * @param {string} assessmentId - Assessment UUID
 * @returns {Promise<object>} Verification result
 */
export async function verifyAssessment(assessmentId) {
  const response = await fetch(`${API_URL}/api/assessments/${assessmentId}/verify`);
  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.error || `HTTP ${response.status}`);
    error.status = response.status;
    error.code = data.code;
    throw error;
  }

  return data;
}
