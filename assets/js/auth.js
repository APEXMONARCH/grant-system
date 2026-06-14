/**
 * auth.js — Authentication helpers
 *
 * ┌─────────────────────────────────────────────────────────┐
 *  DEV_MODE = true   → Seeds a mock admin session so you can
 *                      browse all pages without a PHP backend.
 *                      API calls will show "Network error" in
 *                      the UI but no redirects will happen.
 *
 *  DEV_MODE = false  → Full auth enforced. Requires a working
 *                      PHP backend returning JWT tokens.
 * └─────────────────────────────────────────────────────────┘
 *
 * PHP endpoints expected:
 *   POST /api/auth/login     body: { email, password }
 *                            returns: { success, data: { token, user: { id, first_name, last_name, email, role } } }
 *
 *   POST /api/auth/register  body: { first_name, last_name, email, password, organization? }
 *                            returns: { success, data: { token, user } }
 *
 *   POST /api/auth/logout    header: Authorization: Bearer {token}
 *                            returns: { success, message }
 */

// ─── CHANGE THIS TO false WHEN YOUR PHP BACKEND IS READY ───
const DEV_MODE = false;

// ─── MOCK SESSION (only used when DEV_MODE = true) ─────────
const DEV_ADMIN = {
  id: 1, first_name: 'Admin', last_name: 'User',
  email: 'admin@example.com', role: 'admin', avatar: null,
};
const DEV_USER = {
  id: 2, first_name: 'Applicant', last_name: 'User',
  email: 'user@example.com', role: 'applicant', avatar: null,
};

// Seed mock session in DEV_MODE so route guards pass
if (DEV_MODE && !localStorage.getItem('auth_token')) {
  localStorage.setItem('auth_token', 'dev_mock_token');
  localStorage.setItem('auth_user', JSON.stringify(DEV_ADMIN));
}

const Auth = (() => {
  const getUser    = () => { try { return JSON.parse(localStorage.getItem('auth_user')); } catch { return null; } };
  const setUser    = (u) => localStorage.setItem('auth_user', JSON.stringify(u));
  const isLoggedIn = () => DEV_MODE || (!!API.getToken() && !!getUser());
  const isAdmin    = () => { const u = getUser(); return u && u.role === 'admin'; };

  function requireAuth()  { if (DEV_MODE) return true; if (!isLoggedIn()) { window.location.href = 'login.html'; return false; } return true; }
  function requireAdmin() { if (DEV_MODE) return true; if (!isLoggedIn()) { window.location.href = 'login.html'; return false; } if (!isAdmin()) { window.location.href = 'user-index.html'; return false; } return true; }
  function requireUser()  { if (DEV_MODE) return true; if (!isLoggedIn()) { window.location.href = 'login.html'; return false; } if (isAdmin()) { window.location.href = 'admin-dashboard.html'; return false; } return true; }

  async function login(email, password) {
    if (DEV_MODE) {
      const mockUser = email === 'admin@example.com' ? DEV_ADMIN : DEV_USER;
      API.setToken('dev_mock_token');
      setUser(mockUser);
      return mockUser;
    }
    const res = await API.post('/auth/login', { email, password });
    API.setToken(res.data.token);
    setUser(res.data.user);
    return res.data.user;
  }

  async function register(userData) {
    if (DEV_MODE) {
      const mockUser = { ...DEV_USER, first_name: userData.first_name, last_name: userData.last_name, email: userData.email };
      API.setToken('dev_mock_token');
      setUser(mockUser);
      return mockUser;
    }
    const res = await API.post('/auth/register', userData);
    API.setToken(res.data.token);
    setUser(res.data.user);
    return res.data.user;
  }

  async function logout() {
    if (!DEV_MODE) { try { await API.post('/auth/logout'); } catch { /* ignore */ } }
    API.clearToken();
    window.location.href = 'index.html';
  }

  return { login, register, logout, getUser, isLoggedIn, isAdmin, requireAuth, requireAdmin, requireUser };
})();

function handleLogout(e) {
  e.preventDefault();
  Auth.logout();
}
