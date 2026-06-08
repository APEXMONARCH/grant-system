/**
 * app.js — Shared UI for every page
 * Handles: sidebar · dropdown · toasts · notifications panel ·
 *          topbar user name · page loader · utility CSS injection
 */

// ─── UTILITY CSS INJECTION ─────────────────────────────────
// All CSS that JS components depend on but may not be in styles.css
(function injectUtilityStyles() {
  if (document.getElementById('gmsUtilityStyles')) return;
  const s = document.createElement('style');
  s.id = 'gmsUtilityStyles';
  s.textContent = `
    /* Page loader bar */
    #pageLoader{position:fixed;top:0;left:0;height:3px;background:#1a56db;z-index:9999;width:0;opacity:0;transition:width .4s ease,opacity .3s ease;}
    #pageLoader.loading{opacity:1;}

    /* Skeleton pulse */
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}

    /* Field validation error */
    .input-error{border-color:#ef4444!important;box-shadow:0 0 0 3px rgba(239,68,68,.15)!important;}

    /* Charts - must have a height or canvas collapses to 0 */
    .responsive-chart{width:100%!important;height:280px!important;min-height:200px!important;display:block!important;}
    .chart-body{display:flex;flex-direction:column;gap:16px;}

    /* ── Application detail page ── */
    .detail-hero{background:linear-gradient(135deg,#0a2b4e,#1a56db);border-radius:16px;padding:28px 32px;margin-bottom:24px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px;}
    .detail-hero-left{display:flex;align-items:center;gap:16px;}
    .detail-hero-avatar{width:64px;height:64px;border-radius:50%;border:3px solid rgba(255,255,255,.3);object-fit:cover;flex-shrink:0;}
    .detail-hero-name{margin:0;font-size:1.35rem;font-weight:700;color:#fff;}
    .detail-hero-grant{margin:4px 0 0;opacity:.8;font-size:.875rem;color:rgba(255,255,255,.9);}
    .detail-hero-right{text-align:right;}
    .detail-hero-amount{font-size:1.75rem;font-weight:700;color:#fff;}
    .detail-hero-label{font-size:.8rem;color:rgba(255,255,255,.75);margin-bottom:6px;}
    .detail-grid-2{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:24px;}
    .detail-grid-1{margin-bottom:24px;}
    .detail-field{margin-bottom:14px;}
    .detail-field-label{font-size:.72rem;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.6px;margin-bottom:3px;}
    .detail-field-value{color:#1f2937;font-size:.875rem;line-height:1.6;}
    .detail-budget-table{width:100%;border-collapse:collapse;font-size:.875rem;}
    .detail-budget-table th{padding:10px 12px;text-align:left;border-bottom:1px solid #e5e7eb;background:#f9fafb;font-weight:600;color:#374151;}
    .detail-budget-table td{padding:10px 12px;border-bottom:1px solid #f3f4f6;color:#374151;}
    .detail-budget-table .total-row td{font-weight:600;background:#f9fafb;}
    .detail-budget-table .amount-cell{text-align:right;font-weight:500;}
    .detail-doc-item{display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:8px;transition:background .15s;}
    .detail-doc-item:hover{background:#f9fafb;}
    .detail-doc-icon{color:#ef4444;font-size:1.1rem;flex-shrink:0;}
    .detail-doc-info{flex:1;min-width:0;}
    .detail-doc-name{font-weight:500;font-size:.875rem;margin:0;color:#1f2937;}
    .detail-doc-filename{font-size:.75rem;color:#6b7280;margin:2px 0 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
    .review-notes-area{width:100%;padding:10px 14px;border:1px solid #d1d5db;border-radius:8px;font-family:inherit;font-size:.9rem;resize:vertical;min-height:100px;box-sizing:border-box;transition:border .2s,box-shadow .2s;}
    .review-notes-area:focus{outline:none;border-color:#1a56db;box-shadow:0 0 0 3px rgba(26,86,219,.1);}
    .review-action-row{display:flex;gap:12px;flex-wrap:wrap;margin-top:16px;}
    .btn-approve{background:#10b981;color:#fff;border:none;padding:10px 20px;border-radius:8px;cursor:pointer;font-size:.875rem;font-weight:500;display:inline-flex;align-items:center;gap:8px;transition:all .2s;}
    .btn-approve:hover:not(:disabled){background:#059669;transform:translateY(-1px);}
    .btn-mark-review{background:#f9fafb;color:#374151;border:1px solid #d1d5db;padding:10px 20px;border-radius:8px;cursor:pointer;font-size:.875rem;font-weight:500;display:inline-flex;align-items:center;gap:8px;transition:all .2s;}
    .btn-mark-review:hover:not(:disabled){background:#f3f4f6;}
    .btn-reject{background:#ef4444;color:#fff;border:none;padding:10px 20px;border-radius:8px;cursor:pointer;font-size:.875rem;font-weight:500;display:inline-flex;align-items:center;gap:8px;transition:all .2s;}
    .btn-reject:hover:not(:disabled){background:#dc2626;transform:translateY(-1px);}
    .btn-approve:disabled,.btn-mark-review:disabled,.btn-reject:disabled{opacity:.6;cursor:not-allowed;transform:none!important;}

    /* ── Notification panel ── */
    .notif-panel-wrap{position:relative;}
    .notif-panel{position:absolute;top:calc(100% + 8px);right:0;width:340px;background:#fff;border:1px solid #e5e7eb;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.12);z-index:500;overflow:hidden;max-height:420px;display:flex;flex-direction:column;}
    .notif-panel-head{padding:14px 16px;border-bottom:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;}
    .notif-panel-title{font-weight:600;font-size:.925rem;margin:0;color:#1f2937;}
    .notif-mark-all{font-size:.78rem;color:#1a56db;background:none;border:none;cursor:pointer;padding:0;}
    .notif-list{overflow-y:auto;flex:1;}
    .notif-item{padding:12px 16px;border-bottom:1px solid #f3f4f6;cursor:pointer;transition:background .15s;}
    .notif-item:hover{background:#f9fafb;}
    .notif-item.unread{background:#eff6ff;}
    .notif-item.unread:hover{background:#dbeafe;}
    .notif-item-title{font-weight:600;font-size:.85rem;color:#1f2937;margin:0 0 2px;}
    .notif-item-msg{font-size:.8rem;color:#6b7280;margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
    .notif-item-time{font-size:.72rem;color:#9ca3af;margin:4px 0 0;}
    .notif-empty{padding:28px 16px;text-align:center;color:#9ca3af;font-size:.875rem;}
    .notif-panel-foot{padding:10px;text-align:center;border-top:1px solid #e5e7eb;flex-shrink:0;}
    .notif-panel-foot a{font-size:.8rem;color:#1a56db;text-decoration:none;}

    /* Topbar name next to avatar */
    .topbar-user-name{font-size:.85rem;font-weight:500;color:#374151;white-space:nowrap;max-width:120px;overflow:hidden;text-overflow:ellipsis;}

    @media(max-width:768px){
      .detail-grid-2{grid-template-columns:1fr;}
      .detail-hero{flex-direction:column;align-items:flex-start;}
      .detail-hero-right{text-align:left;}
      .notif-panel{width:calc(100vw - 32px);right:-60px;}
      .topbar-user-name{display:none;}
    }
  `;
  document.head.appendChild(s);
})();

// ─── PAGE LOADER ───────────────────────────────────────────
(function initPageLoader() {
  const bar = document.createElement('div');
  bar.id = 'pageLoader';
  document.body.prepend(bar);
})();

function showPageLoader() {
  const bar = document.getElementById('pageLoader');
  if (!bar) return;
  bar.style.width = '0';
  bar.classList.add('loading');
  requestAnimationFrame(() => { bar.style.width = '70%'; });
}
function hidePageLoader() {
  const bar = document.getElementById('pageLoader');
  if (!bar) return;
  bar.style.width = '100%';
  setTimeout(() => { bar.classList.remove('loading'); bar.style.width = '0'; }, 400);
}

// ─── INIT ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  showPageLoader();
  initSidebar();
  initProfileDropdown();
  initToastContainer();
  populateTopbar();
  initNotificationPanel();
  // Hide loader after initial render
  setTimeout(hidePageLoader, 600);
});

// ─── SIDEBAR ───────────────────────────────────────────────
function initSidebar() {
  const sidebar   = document.getElementById('sidebar');
  const overlay   = document.getElementById('sidebarOverlay');
  const mobileBtn = document.getElementById('mobileMenuBtn');
  const toggleBtn = document.getElementById('sidebarToggle');
  const open  = () => { sidebar?.classList.add('open');   overlay?.classList.add('show'); };
  const close = () => { sidebar?.classList.remove('open'); overlay?.classList.remove('show'); };
  mobileBtn?.addEventListener('click', open);
  toggleBtn?.addEventListener('click', close);
  overlay?.addEventListener('click', close);
}

// ─── PROFILE DROPDOWN ──────────────────────────────────────
function initProfileDropdown() {
  const btn  = document.getElementById('profileBtn');
  const menu = document.getElementById('profileDropdown');
  if (!btn || !menu) return;
  btn.addEventListener('click', (e) => { e.stopPropagation(); menu.classList.toggle('show'); });
  document.addEventListener('click', () => menu.classList.remove('show'));
}

// ─── TOPBAR USER INFO ──────────────────────────────────────
function populateTopbar() {
  const user = Auth?.getUser?.();
  if (!user) return;
  const name    = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.name || 'User';
  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1a56db&color=fff`;

  // Avatar images
  document.querySelectorAll('.profile-btn .avatar').forEach(img => {
    img.src = user.avatar || avatarUrl;
    img.alt = name;
  });

  // Show name next to avatar in topbar (admin pages)
  document.querySelectorAll('.profile-btn').forEach(btn => {
    if (btn.querySelector('.topbar-user-name')) return;
    const nameEl = document.createElement('span');
    nameEl.className = 'topbar-user-name';
    nameEl.textContent = name;
    const chevron = btn.querySelector('.fa-chevron-down');
    if (chevron) btn.insertBefore(nameEl, chevron);
  });

  // User portal elements
  const miniName = document.getElementById('userMiniName');
  if (miniName) miniName.textContent = name;

  const topAvatar = document.getElementById('topAvatar');
  if (topAvatar) {
    topAvatar.src = user.avatar || avatarUrl.replace('1a56db', '0b6bcb');
    topAvatar.alt = name;
  }

  // Sidebar footer admin name
  const adminMini = document.querySelector('.sidebar-footer .user-info-mini span');
  if (adminMini && !document.querySelector('[data-user-page]')) adminMini.textContent = name;
}

// ─── NOTIFICATION PANEL ────────────────────────────────────
function initNotificationPanel() {
  const btn = document.getElementById('notificationBtn');
  if (!btn) return;

  // Wrap btn in relative container so panel positions correctly
  if (!btn.parentElement.classList.contains('notif-panel-wrap')) {
    const wrap = document.createElement('div');
    wrap.className = 'notif-panel-wrap';
    btn.parentNode.insertBefore(wrap, btn);
    wrap.appendChild(btn);
  }

  btn.addEventListener('click', async (e) => {
    e.stopPropagation();
    const existing = document.getElementById('notifPanel');
    if (existing) { existing.remove(); return; }
    openNotifPanel(btn.closest('.notif-panel-wrap'));
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.notif-panel-wrap')) {
      document.getElementById('notifPanel')?.remove();
    }
  });
}

async function openNotifPanel(wrap) {
  const panel = document.createElement('div');
  panel.id = 'notifPanel';
  panel.className = 'notif-panel';
  panel.innerHTML = `
    <div class="notif-panel-head">
      <h3 class="notif-panel-title">Notifications</h3>
      <button class="notif-mark-all" onclick="markAllNotificationsRead()">Mark all read</button>
    </div>
    <div class="notif-list" id="notifList">
      <div class="notif-empty"><i class="fas fa-spinner fa-spin"></i></div>
    </div>
    <div class="notif-panel-foot"><a href="#">View all</a></div>`;
  wrap.appendChild(panel);

  try {
    const res = await API.get('/notifications');
    renderNotifList(res?.data?.items || []);
    // Update badge
    const count = res?.data?.unread_count ?? 0;
    document.querySelectorAll('.topbar-actions .badge, #topNotificationCount').forEach(el => {
      el.textContent = count;
      el.style.display = count > 0 ? '' : 'none';
    });
  } catch {
    document.getElementById('notifList').innerHTML = '<div class="notif-empty">Could not load notifications.</div>';
  }
}

function renderNotifList(items) {
  const list = document.getElementById('notifList');
  if (!list) return;
  list.innerHTML = items.length
    ? items.map(n => `
        <div class="notif-item ${n.read ? '' : 'unread'}" onclick="readNotification(${n.id}, this)">
          <p class="notif-item-title">${escapeHtml(n.title)}</p>
          <p class="notif-item-msg">${escapeHtml(n.message)}</p>
          <p class="notif-item-time">${formatDate(n.created_at)}</p>
        </div>`).join('')
    : '<div class="notif-empty">You\'re all caught up!</div>';
}

async function readNotification(id, el) {
  el.classList.remove('unread');
  try { await API.patch(`/notifications/${id}/read`); } catch { /* ignore */ }
}

async function markAllNotificationsRead() {
  try {
    await API.post('/notifications/read-all');
    document.querySelectorAll('.notif-item').forEach(el => el.classList.remove('unread'));
    document.querySelectorAll('.topbar-actions .badge, #topNotificationCount').forEach(el => {
      el.textContent = '0'; el.style.display = 'none';
    });
  } catch (err) { showAlert(err.message, 'error'); }
}

async function loadNotificationCount() {
  try {
    const res = await API.get('/notifications');
    const count = res?.data?.unread_count ?? 0;
    document.querySelectorAll('.topbar-actions .badge, #topNotificationCount').forEach(el => {
      el.textContent = count;
      el.style.display = count > 0 ? '' : 'none';
    });
  } catch { /* fail silently */ }
}

// ─── TOAST ALERTS ──────────────────────────────────────────
function initToastContainer() {
  if (document.getElementById('toastContainer')) return;
  const el = document.createElement('div');
  el.id = 'toastContainer';
  el.style.cssText = 'position:fixed;top:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:10px;pointer-events:none;';
  document.body.appendChild(el);
}

function showAlert(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const colours = { success:'#10b981', error:'#ef4444', warning:'#f59e0b', info:'#3b82f6' };
  const icons   = { success:'fa-check-circle', error:'fa-times-circle', warning:'fa-exclamation-circle', info:'fa-info-circle' };
  const toast = document.createElement('div');
  toast.style.cssText = `display:flex;align-items:center;gap:10px;background:#fff;border-left:4px solid ${colours[type]};padding:14px 18px;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.12);font-size:.875rem;color:#1f2937;max-width:360px;pointer-events:all;animation:toastIn .25s ease;`;
  toast.innerHTML = `<i class="fas ${icons[type]}" style="color:${colours[type]};font-size:1rem;flex-shrink:0;"></i><span style="flex:1;">${escapeHtml(message)}</span><button onclick="this.parentElement.remove()" style="background:none;border:none;cursor:pointer;color:#9ca3af;font-size:1.1rem;padding:0;line-height:1;">&times;</button>`;
  if (!document.getElementById('toastAnim')) {
    const a = document.createElement('style');
    a.id = 'toastAnim';
    a.textContent = '@keyframes toastIn{from{transform:translateX(120%);opacity:0}to{transform:translateX(0);opacity:1}}';
    document.head.appendChild(a);
  }
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 5000);
}

// ─── FIELD ERRORS ──────────────────────────────────────────
function showFieldErrors(errors = {}) {
  document.querySelectorAll('.field-error').forEach(el => el.remove());
  document.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
  Object.entries(errors).forEach(([field, messages]) => {
    const msg   = Array.isArray(messages) ? messages[0] : messages;
    const input = document.getElementById(field) || document.querySelector(`[name="${field}"]`);
    if (!input) return;
    input.classList.add('input-error');
    const err = document.createElement('span');
    err.className = 'field-error';
    err.style.cssText = 'color:#ef4444;font-size:.78rem;margin-top:4px;display:block;';
    err.textContent = msg;
    input.parentElement.appendChild(err);
  });
}

function setLoading(btn, loading, text = '') {
  if (!btn) return;
  if (loading) {
    btn.dataset.originalText = btn.innerHTML;
    btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${text || 'Loading...'}`;
    btn.disabled = true;
  } else {
    btn.innerHTML = btn.dataset.originalText || btn.innerHTML;
    btn.disabled = false;
  }
}

// ─── UTILITIES ─────────────────────────────────────────────
function escapeHtml(str) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(String(str ?? '')));
  return d.innerHTML;
}

function formatCurrency(val) {
  const n = parseFloat(val) || 0;
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' });
}

function statusBadge(status) {
  const map = {
    active:'success', approved:'success', open:'success', paid:'success', disbursed:'success',
    'under-review':'warning', 'in-review':'warning', pending:'warning', 'not-paid':'warning',
    draft:'info', submitted:'info',
    closed:'danger', rejected:'danger',
  };
  const cls = map[status?.toLowerCase()] || 'info';
  return `<span class="badge ${cls}">${escapeHtml(status || '—')}</span>`;
}
