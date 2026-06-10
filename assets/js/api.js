/**
 * api.js — Centralised HTTP client for PHP backend
 *
 * PHP backend should return JSON in this envelope:
 *   Success: { "success": true, "data": { ... }, "message": "..." }
 *   Error:   { "success": false, "message": "Human-readable error", "errors": { field: [msg] } }
 *
 * Configure BASE_URL to match your PHP server root, e.g.:
 *   Same origin  → '/api'
 *   Separate host → 'https://yourdomain.com/api'
 */

const API = (() => {
  // ─── CONFIG ────────────────────────────────────────────────
  const BASE_URL = '/grant-system/api'; // ← update this to match your PHP API path

  // ─── TOKEN HELPERS ─────────────────────────────────────────
  const getToken   = () => localStorage.getItem('auth_token');
  const setToken   = (t) => localStorage.setItem('auth_token', t);
  const clearToken = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  };

  // ─── BUILD HEADERS ─────────────────────────────────────────
  function buildHeaders(isFormData = false) {
    const h = {};
    const token = getToken();
    if (token) h['Authorization'] = `Bearer ${token}`;
    // Let browser set Content-Type automatically for FormData (multipart boundary)
    if (!isFormData) h['Content-Type'] = 'application/json';
    h['X-Requested-With'] = 'XMLHttpRequest'; // helps PHP detect AJAX
    return h;
  }

  // ─── CORE REQUEST ──────────────────────────────────────────
  async function request(method, endpoint, data = null, isFormData = false) {
    const config = { method, headers: buildHeaders(isFormData) };
    if (data) config.body = isFormData ? data : JSON.stringify(data);

    let res;
    try {
      res = await fetch(`${BASE_URL}${endpoint}`, config);
    } catch (networkErr) {
      throw { message: 'Network error. Please check your connection.', networkError: true };
    }

    // Always try to parse JSON first so we get the real server message
    let json;
    try {
      json = await res.json();
    } catch {
      throw { status: res.status, message: 'Unexpected server response. Check that the API is reachable.' };
    }

    // Token expired / not authenticated — bounce to login
    // Exception: auth endpoints (login/register) should NOT redirect on 401
    if (res.status === 401 && !endpoint.startsWith('/auth/')) {
      clearToken();
      window.location.href = 'login.html';
      return;
    }

    // For all error statuses, throw with the real message from the server
    if (!res.ok) {
      throw {
        status:  res.status,
        message: json.message || 'An error occurred.',
        errors:  json.errors  || {},
      };
    }

    return json; // { success, data, message }
  }

  // ─── BUILD QUERY STRING ────────────────────────────────────
  function qs(params = {}) {
    const p = Object.entries(params)
      .filter(([, v]) => v !== '' && v !== null && v !== undefined)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
    return p.length ? `?${p.join('&')}` : '';
  }

  // ─── PUBLIC API ────────────────────────────────────────────
  return {
    BASE_URL,
    getToken,
    setToken,
    clearToken,
    get:    (endpoint, params)   => request('GET',    endpoint + qs(params)),
    post:   (endpoint, data, fd) => request('POST',   endpoint, data, fd),
    put:    (endpoint, data)     => request('PUT',    endpoint, data),
    patch:  (endpoint, data)     => request('PATCH',  endpoint, data),
    delete: (endpoint)           => request('DELETE', endpoint),
  };
})();
