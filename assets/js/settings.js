/**
 * settings.js — System settings page (settings.html)
 *
 * PHP endpoints:
 *   GET    /api/users                       → list all system users
 *   POST   /api/users                       body: { name, email, role, status }
 *   PUT    /api/users/{id}                  body: { name, email, role, status }
 *   DELETE /api/users/{id}
 *
 *   GET    /api/roles                       → list roles with permissions
 *
 *   GET    /api/settings/notifications      → current user's notification prefs
 *   PUT    /api/settings/notifications      body: { email_notifications, system_alerts, ... }
 */

document.addEventListener('DOMContentLoaded', () => {
  if (!Auth.requireAdmin()) return;

  initTabs();
  loadUsers();
  loadRoles();
  loadNotificationPrefs();

  document.getElementById('addUserBtn')?.addEventListener('click', () => openUserModal());
  document.getElementById('saveNotificationsBtn')?.addEventListener('click', saveNotifications);
});

// ─── TABS ──────────────────────────────────────────────────
function initTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`${btn.dataset.tab}-tab`)?.classList.add('active');
    });
  });
}

// ─── USERS TABLE ───────────────────────────────────────────
async function loadUsers() {
  const tbody = document.getElementById('usersTableBody');
  if (!tbody) return;

  tbody.innerHTML = skeletonRows(3, 5);
  try {
    const res   = await API.get('/users');
    const users = res.data?.items || res.data || [];

    tbody.innerHTML = users.length
      ? users.map(u => `
          <tr>
            <td>
              <div style="display:flex;align-items:center;gap:10px;">
                <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=1a56db&color=fff&size=36"
                  style="width:36px;height:36px;border-radius:50%;" alt="">
                <span style="font-weight:500;">${escapeHtml(u.name)}</span>
              </div>
            </td>
            <td style="color:#6b7280;">${escapeHtml(u.email)}</td>
            <td><span class="badge info">${escapeHtml(u.role)}</span></td>
            <td>${statusBadge(u.status)}</td>
            <td>
              <div style="display:flex;gap:8px;">
                <button class="btn btn-secondary btn-small" onclick="openUserModal(${JSON.stringify(u).replace(/"/g,'&quot;')})">
                  <i class="fas fa-pen"></i>
                </button>
                <button class="btn btn-small" style="background:#fef2f2;color:#ef4444;border:1px solid #fecaca;"
                  onclick="deleteUser(${u.id}, '${escapeHtml(u.name)}')">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </td>
          </tr>`).join('')
      : '<tr><td colspan="5" style="text-align:center;padding:24px;color:#9ca3af;">No users found</td></tr>';
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" style="color:#ef4444;padding:16px;">${escapeHtml(err.message)}</td></tr>`;
  }
}

// ─── USER MODAL ────────────────────────────────────────────
function openUserModal(user = null) {
  const existing = document.getElementById('userModal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'userModal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:1000;display:flex;align-items:center;justify-content:center;padding:16px;';
  modal.innerHTML = `
    <div style="background:#fff;border-radius:16px;width:100%;max-width:480px;padding:32px;position:relative;">
      <button onclick="document.getElementById('userModal').remove()"
        style="position:absolute;top:16px;right:16px;background:none;border:none;font-size:1.2rem;cursor:pointer;color:#6b7280;">&times;</button>
      <h3 style="margin:0 0 24px;">${user ? 'Edit User' : 'Add New User'}</h3>
      <div class="form-group">
        <label>Full Name</label>
        <input id="modalUserName" class="form-input" value="${escapeHtml(user?.name || '')}" placeholder="Full name">
      </div>
      <div class="form-group">
        <label>Email Address</label>
        <input id="modalUserEmail" type="email" class="form-input" value="${escapeHtml(user?.email || '')}" placeholder="email@example.com">
      </div>
      ${!user ? `<div class="form-group">
        <label>Password</label>
        <input id="modalUserPassword" type="password" class="form-input" placeholder="Temporary password">
      </div>` : ''}
      <div class="form-group">
        <label>Role</label>
        <select id="modalUserRole" class="form-select">
          <option value="admin"       ${user?.role==='admin'       ? 'selected':''}>Admin</option>
          <option value="reviewer"    ${user?.role==='reviewer'    ? 'selected':''}>Reviewer</option>
          <option value="applicant"   ${user?.role==='applicant'   ? 'selected':''}>Applicant</option>
        </select>
      </div>
      <div class="form-group">
        <label>Status</label>
        <select id="modalUserStatus" class="form-select">
          <option value="active"   ${(user?.status||'active')==='active'   ? 'selected':''}>Active</option>
          <option value="inactive" ${user?.status==='inactive' ? 'selected':''}>Inactive</option>
        </select>
      </div>
      <div style="display:flex;gap:12px;margin-top:8px;">
        <button id="saveUserBtn" class="btn-primary" style="flex:1;" onclick="saveUser(${user?.id || 'null'})">
          ${user ? 'Save Changes' : 'Create User'}
        </button>
        <button class="btn-secondary" style="flex:1;" onclick="document.getElementById('userModal').remove()">Cancel</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
}

async function saveUser(id) {
  const btn = document.getElementById('saveUserBtn');
  const payload = {
    name:   document.getElementById('modalUserName')?.value.trim(),
    email:  document.getElementById('modalUserEmail')?.value.trim(),
    role:   document.getElementById('modalUserRole')?.value,
    status: document.getElementById('modalUserStatus')?.value,
  };
  if (!id) payload.password = document.getElementById('modalUserPassword')?.value;

  if (!payload.name || !payload.email) { showAlert('Name and email are required.', 'warning'); return; }

  setLoading(btn, true, id ? 'Saving...' : 'Creating...');
  try {
    if (id) {
      await API.put(`/users/${id}`, payload);
      showAlert('User updated.', 'success');
    } else {
      await API.post('/users', payload);
      showAlert('User created.', 'success');
    }
    document.getElementById('userModal')?.remove();
    loadUsers();
  } catch (err) {
    showAlert(err.message || 'Failed to save user.', 'error');
    if (err.errors) showFieldErrors(err.errors);
    setLoading(btn, false);
  }
}

async function deleteUser(id, name) {
  if (!confirm(`Remove user "${name}"?`)) return;
  try {
    await API.delete(`/users/${id}`);
    showAlert('User removed.', 'success');
    loadUsers();
  } catch (err) {
    showAlert(err.message, 'error');
  }
}

// ─── ROLES ─────────────────────────────────────────────────
async function loadRoles() {
  const grid = document.getElementById('rolesGrid');
  if (!grid) return;

  try {
    const res   = await API.get('/roles');
    const roles = res.data || [];

    grid.innerHTML = roles.map(r => `
      <div class="card" style="padding:24px;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
          <div style="width:40px;height:40px;background:#e0e7ff;border-radius:10px;display:flex;align-items:center;justify-content:center;">
            <i class="fas fa-${r.icon || 'shield-alt'}" style="color:#1a56db;"></i>
          </div>
          <div>
            <h3 style="margin:0;font-size:1rem;">${escapeHtml(r.name)}</h3>
            <small style="color:#6b7280;">${r.users_count ?? 0} users</small>
          </div>
        </div>
        <ul style="margin:0;padding-left:16px;color:#374151;font-size:.875rem;">
          ${(r.permissions || []).map(p => `<li style="margin-bottom:4px;">${escapeHtml(p)}</li>`).join('')}
        </ul>
      </div>`).join('');
  } catch {
    grid.innerHTML = '<p style="color:#9ca3af;padding:16px;">Roles unavailable.</p>';
  }
}

// ─── NOTIFICATION PREFERENCES ──────────────────────────────
const NOTIF_FIELDS = ['emailNotifications','systemAlerts','newApplications','statusUpdates','deadlineReminders','weeklyReports'];

async function loadNotificationPrefs() {
  try {
    const res   = await API.get('/settings/notifications');
    const prefs = res.data || {};
    NOTIF_FIELDS.forEach(f => {
      const el = document.getElementById(f);
      if (el) el.checked = prefs[f] !== false; // default on if not explicitly false
    });
  } catch { /* use HTML defaults */ }
}

async function saveNotifications() {
  const btn = document.getElementById('saveNotificationsBtn');
  const payload = Object.fromEntries(NOTIF_FIELDS.map(f => [f, document.getElementById(f)?.checked ?? false]));

  setLoading(btn, true, 'Saving...');
  try {
    await API.put('/settings/notifications', payload);
    showAlert('Notification preferences saved.', 'success');
  } catch (err) {
    showAlert(err.message || 'Failed to save preferences.', 'error');
  }
  setLoading(btn, false);
}

// ─── HELPERS ───────────────────────────────────────────────
function skeletonRows(rows, cols) {
  return Array.from({ length: rows }, () => `
    <tr>${Array.from({ length: cols }, () =>
      `<td><div style="height:12px;background:#e5e7eb;border-radius:4px;animation:pulse 1.5s infinite;"></div></td>`
    ).join('')}</tr>`).join('');
}
