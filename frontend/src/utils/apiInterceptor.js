/**
 * Global API Interceptor for handling 401 errors
 * - Automatically logs out user when token expires
 * - Prevents showing raw error messages to users
 * - Redirects to login page on unauthorized access
 */

import { store } from '../store/store';
import { logout, setUserDetails } from '../store/userSlice';
import { toUserSafeMessage, USER_MESSAGE } from './userSafeMessage';

const getBackendBaseUrl = () => {
  if (process.env.NODE_ENV !== 'development') return '';
  if (typeof window === 'undefined') return 'http://localhost:5001';
  return `${window.location.protocol}//${window.location.hostname}:5001`;
};

const getStoredToken = () => {
  const token = localStorage.getItem('token');

  if (!token || token === 'null' || token === 'undefined') {
    return null;
  }

  return token;
};

let isRefreshing = false;
let refreshSubscribers = [];

const subscribeTokenRefresh = (cb) => {
  refreshSubscribers.push(cb);
};

const onTokenRefreshed = (token) => {
  refreshSubscribers.map((cb) => cb(token));
  refreshSubscribers = [];
};

/**
 * Attempt to refresh access token using refresh token cookie
 */
const attemptTokenRefresh = async () => {
  if (isRefreshing) {
    return new Promise((resolve) => {
      subscribeTokenRefresh((token) => {
        resolve(!!token);
      });
    });
  }

  isRefreshing = true;

  try {
    const response = await fetch(`${getBackendBaseUrl()}/api/refresh-token`, {
      method: 'POST',
      credentials: 'include',
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.accessToken) {
        localStorage.setItem('token', data.accessToken);
        onTokenRefreshed(data.accessToken);
        return true;
      }
    }
  } catch (error) {
    console.error('[API] Refresh error:', error);
  } finally {
    isRefreshing = false;
  }

  onTokenRefreshed(null);
  return false;
};

/**
 * Enhanced fetch wrapper with automatic 401 handling
 * @param {string} url - API endpoint URL
 * @param {object} options - fetch options
 * @returns {Promise<Response>} - fetch response
 */
export const apiFetch = async (url, options = {}) => {
  try {
    const token = getStoredToken();
    const csrfToken = localStorage.getItem('csrfToken');

    const response = await fetch(url, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
        ...options.headers,
      },
    });

    // Capture CSRF token from headers if provided by server
    const newCsrf = response.headers.get('X-CSRF-Token');
    if (newCsrf) {
      localStorage.setItem('csrfToken', newCsrf);
    }

    // Handle 401 Unauthorized - Token expired or invalid
    if (response.status === 401) {
      // Don't attempt refresh if already on login/signup or for refresh-token itself
      const publicPaths = ['/login', '/signup', '/api/refresh-token'];
      if (!publicPaths.some((p) => url.includes(p))) {
        const refreshed = await attemptTokenRefresh();
        if (refreshed) {
          // Retry the original request with new token
          return apiFetch(url, options);
        }
      }

      handleUnauthorized();
      return response;
    }

    // Handle 403 Forbidden
    if (response.status === 403) {
      console.warn('[API] Access forbidden (403)');
      return response;
    }

    // Handle 500+ server errors
    if (response.status >= 500) {
      console.error(`[API] Server error (${response.status})`);
    }

    return response;
  } catch (error) {
    console.error('[API] Fetch error:', error.message);
    throw error;
  }
};

/**
 * Handle unauthorized (401) response
 * - Clear user state
 * - Clear localStorage
 * - Redirect to login
 */
export const handleUnauthorized = () => {
  console.warn('[API] User unauthorized (401) - Logging out...');

  // Dispatch logout action to Redux
  store.dispatch(logout());
  store.dispatch(setUserDetails(null));

  // Clear localStorage
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('userData');

  // Clear any session-related data
  sessionStorage.clear();

  // Redirect to login page
  const publicPaths = ['/login', '/signup'];
  if (!publicPaths.includes(window.location.pathname)) {
    window.location.href = '/login?session=expired';
  }
};

/**
 * Check if response is a 401 error
 * @param {Response} response - fetch response
 * @returns {boolean}
 */
export const isUnauthorized = (response) => {
  return response?.status === 401;
};

/**
 * Check if response is successful
 * @param {Response} response - fetch response
 * @returns {boolean}
 */
export const isSuccess = (response) => {
  return response?.ok || (response?.status >= 200 && response?.status < 300);
};

/**
 * Get user-friendly error message based on status code
 * @param {number} status - HTTP status code
 * @param {string} defaultMessage - default error message
 * @returns {string}
 */
export const getErrorMessage = (status, defaultMessage) => {
  return toUserSafeMessage('', defaultMessage || USER_MESSAGE.DEFAULT, {
    status,
  });
};

/**
 * Centralized API response handler
 * @param {Response} response - fetch response
 * @returns {Promise<object>} - parsed response or error object
 */
export const handleApiResponse = async (response) => {
  // 401 is already handled in apiFetch to avoid duplicate logout flows
  if (isUnauthorized(response)) {
    return {
      success: false,
      error: getErrorMessage(401),
      status: 401,
    };
  }

  try {
    const data = await response.json();

    if (isSuccess(response)) {
      return data;
    } else {
      const rawMessage = data?.message || data?.error;
      const errorMessage = toUserSafeMessage(
        rawMessage,
        getErrorMessage(response.status),
        { status: response.status },
      );
      console.error(
        `[API] Error ${response.status}:`,
        rawMessage || 'No message',
      );
      return {
        success: false,
        error: errorMessage,
        message: errorMessage,
        status: response.status,
      };
    }
  } catch (error) {
    console.error('[API] Failed to parse response:', error.message);
    return {
      success: false,
      error: getErrorMessage(response.status),
      message: getErrorMessage(response.status),
      status: response.status,
    };
  }
};

/**
 * Example usage in components:
 *
 * const response = await apiFetch('/api/endpoint', {
 *   method: 'GET',
 * });
 *
 * const data = await handleApiResponse(response);
 *
 * if (data.success) {
 *   // Handle success
 * } else {
 *   // Handle error (without showing raw error)
 *   console.error(data.error);
 * }
 */

const apiInterceptor = {
  apiFetch,
  handleUnauthorized,
  isUnauthorized,
  isSuccess,
  getErrorMessage,
  handleApiResponse,
};

export default apiInterceptor;
