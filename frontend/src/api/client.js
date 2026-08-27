/**
 * API client with automatic JWT token attachment, 401 refresh rotation, and unified error handling.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

class ApiClient {
  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  getTokens() {
    try {
      const stored = localStorage.getItem('ahoum_auth_tokens');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  setTokens(tokens) {
    if (tokens) {
      localStorage.setItem('ahoum_auth_tokens', JSON.stringify(tokens));
    } else {
      localStorage.removeItem('ahoum_auth_tokens');
    }
  }

  async refreshToken() {
    const tokens = this.getTokens();
    if (!tokens || !tokens.refresh) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(`${this.baseUrl}/auth/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: tokens.refresh }),
    });

    if (!response.ok) {
      this.setTokens(null);
      window.dispatchEvent(new CustomEvent('auth:expired'));
      throw new Error('Session expired. Please log in again.');
    }

    const data = await response.json();
    const newTokens = {
      ...tokens,
      access: data.access,
      refresh: data.refresh || tokens.refresh,
    };
    this.setTokens(newTokens);
    return newTokens.access;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    let tokens = this.getTokens();
    if (tokens && tokens.access) {
      headers['Authorization'] = `Bearer ${tokens.access}`;
    }

    let response = await fetch(url, {
      ...options,
      headers,
    });

    // Handle Token Expiry & Automatic Refresh on 401
    if (response.status === 401 && tokens && tokens.refresh && !options._retry) {
      try {
        const newAccessToken = await this.refreshToken();
        headers['Authorization'] = `Bearer ${newAccessToken}`;
        response = await fetch(url, {
          ...options,
          headers,
          _retry: true,
        });
      } catch {
        // Refresh failed; propagate original 401
      }
    }

    // Parse JSON response or return empty
    let responseData = null;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json();
    } else if (response.status !== 204) {
      responseData = await response.text();
    }

    if (!response.ok) {
      const error = new Error(this.extractErrorMessage(responseData, response.status));
      error.status = response.status;
      error.data = responseData;
      throw error;
    }

    return responseData;
  }

  extractErrorMessage(data, status) {
    if (!data) return `Request failed with status ${status}`;
    if (typeof data === 'string') return data;
    if (data.error) return typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
    if (data.detail) return data.detail;
    if (Array.isArray(data)) return data.join(', ');
    if (typeof data === 'object') {
      const firstKey = Object.keys(data)[0];
      const val = data[firstKey];
      if (Array.isArray(val)) return `${firstKey}: ${val.join(' ')}`;
      if (typeof val === 'string') return `${firstKey}: ${val}`;
      return JSON.stringify(data);
    }
    return `Server error (${status})`;
  }

  // Convenience methods
  get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  post(endpoint, body, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  patch(endpoint, body, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  put(endpoint, body, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }
}

export const api = new ApiClient();
