/**
 * applications.js — Admin Kanban board (applications.html)
 *
 * PHP endpoints:
 *   GET /api/applications?status=submitted&limit=50
 *   GET /api/applications?status=under-review&limit=50
 *   GET /api/applications?status=approved&limit=50
 *   GET /api/applications?status=rejected&limit=50
 *
 * IMPROVEMENT: Auto-polls every 30 seconds so new applicant
 * submissions appear on the board without a page refresh.
 * The notification bell badge is also refreshed on each poll.
 */

document.addEventListener('DOMContentLoaded', () => {
  if (!Auth.requireAdmin()) return;
  loadAllColumns();

  // Auto-refresh: poll for new submissions every 30 seconds
  setInterval(() => {
    loadAllColumns(true); // silent = true (no skeleton flash)
    if (typeof loadNotifications === 'function') loadNotifications();
  }, 30000);
});

const COLUMNS = [
  { status: 'submitted',    colId: 'submittedColumn', countId: 'submittedCount' },
  { status: 'under-review', colId: 'reviewColumn',    countId: 'reviewCount'    },
  { status: 'approved',     colId: 'approvedColumn',  countId: 'approvedCount'  },
  { status: 'rejected',     colId: 'rejectedColumn',  countId: 'rejectedCount'  },
];

// Track current counts to detect new arrivals
const _prevCounts = { submitted: 0, 'under-review': 0, approved: 0, rejected: 0 };

async function loadAllColumns(silent = false) {
  const totalEl  = document.querySelector('.stats-badge span');
  let grandTotal = 0;

  await Promise.all(COLUMNS.map(async (col) => {
    const colEl   = document.getElementById(col.colId);
    const countEl = document.getElementById(col.countId);
    if (!colEl) return;

    // Only show skeleton on first load, not on silent background refresh
    if (!silent) colEl.innerHTML = skeletonCards(3);

    try {
      const res   = await API.get('/applications', { status: col.status, limit: 50 });
      const items = res.data?.items || res.data || [];
      const count = res.data?.total ?? items.length;

      // Highlight if new submissions arrived since last poll
      if (silent && col.status === 'submitted' && count > _prevCounts['submitted']) {
        showAlert(`${count - _prevCounts['submitted']} new application(s) received!`, 'info');
      }
      _prevCounts[col.status] = count;

      if (countEl) countEl.textContent = count;
      grandTotal += count;

      colEl.innerHTML = items.length
        ? items.map(app => renderCard(app)).join('')
        : `<div class="empty-column">
             <i class="fas fa-inbox" style="font-size:1.5rem;display:block;margin-bottom:8px;"></i>
             No applications
           </div>`;
    } catch {
      if (!silent) colEl.innerHTML = `<div style="color:#ef4444;padding:16px;font-size:.875rem;text-align:center;">Failed to load</div>`;
    }
  }));

  if (totalEl) totalEl.textContent = `Total: ${grandTotal} applications`;
}

// ─── CARD TEMPLATE ─────────────────────────────────────────
function renderCard(app) {
  const initials   = (app.applicant_name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const score      = app.score ?? null;
  const scoreClass = score === null ? '' : score >= 80 ? 'score-high' : score >= 60 ? 'score-medium' : 'score-low';
  const amount     = typeof formatCurrency === 'function'
    ? formatCurrency(app.requested_amount)
    : '₦' + Number(app.requested_amount || 0).toLocaleString();
  const date       = app.submitted_at ? new Date(app.submitted_at).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : '';

  return `
    <div class="application-card" onclick="openApplication(${app.id})"
         role="button" tabindex="0"
         onkeydown="if(event.key==='Enter')openApplication(${app.id})">

      <div class="card-header-section">
        <div class="applicant-info">
          ${app.applicant_avatar
            ? `<img src="${escapeHtml(app.applicant_avatar)}" class="applicant-avatar" alt="${escapeHtml(app.applicant_name)}">`
            : `<div class="applicant-avatar">${initials}</div>`}
          <div class="applicant-details">
            <h4>${escapeHtml(app.applicant_name || 'Unknown')}</h4>
            <p class="grant-name-text">${escapeHtml(app.grant_title || '')}</p>
          </div>
        </div>
        ${score !== null ? `<span class="score-badge ${scoreClass}">${score}</span>` : ''}
      </div>

      <div class="card-details">
        <span class="detail-item">
          <i class="fas fa-money-bill-wave"></i> ${amount}
        </span>
        ${date ? `<span class="detail-item"><i class="fas fa-calendar"></i> ${date}</span>` : ''}
      </div>

      <div class="card-actions">
        <button class="card-action-btn view-btn" onclick="event.stopPropagation();openApplication(${app.id})">
          <i class="fas fa-eye"></i> View
        </button>
        ${app.status === 'submitted' ? `
        <button class="card-action-btn review-btn" onclick="event.stopPropagation();quickStatus(${app.id},'under-review')">
          <i class="fas fa-search"></i> Review
        </button>` : ''}
        ${app.status !== 'approved' ? `
        <button class="card-action-btn approve-btn" onclick="event.stopPropagation();quickStatus(${app.id},'approved')">
          <i class="fas fa-check"></i> Approve
        </button>` : ''}
        ${app.status !== 'rejected' ? `
        <button class="card-action-btn reject-btn" onclick="event.stopPropagation();quickStatus(${app.id},'rejected')">
          <i class="fas fa-times"></i> Reject
        </button>` : ''}
      </div>
    </div>`;
}

// ─── QUICK STATUS CHANGE (from card buttons) ───────────────
async function quickStatus(appId, status) {
  try {
    await API.patch(`/applications/${appId}/status`, { status });
    showAlert(`Application marked as ${status.replace('-', ' ')}.`, 'success');
    loadAllColumns(true);
  } catch (err) {
    showAlert(err.message || 'Failed to update status.', 'error');
  }
}

// ─── OPEN DETAIL PAGE ──────────────────────────────────────
function openApplication(id) {
  window.location.href = `admin-application-details.html?id=${id}`;
}

// ─── SKELETON CARDS ────────────────────────────────────────
function skeletonCards(n) {
  return Array(n).fill(0).map(() => `
    <div class="application-card" style="pointer-events:none;">
      <div style="display:flex;gap:10px;margin-bottom:12px;">
        <div style="width:40px;height:40px;border-radius:50%;background:#f0f0f0;animation:pulse 1.5s infinite;"></div>
        <div style="flex:1;">
          <div style="height:12px;background:#f0f0f0;border-radius:4px;margin-bottom:6px;animation:pulse 1.5s infinite;"></div>
          <div style="height:10px;background:#f0f0f0;border-radius:4px;width:70%;animation:pulse 1.5s infinite;"></div>
        </div>
      </div>
      <div style="height:10px;background:#f0f0f0;border-radius:4px;margin-bottom:8px;animation:pulse 1.5s infinite;"></div>
      <div style="height:32px;background:#f0f0f0;border-radius:6px;animation:pulse 1.5s infinite;"></div>
    </div>`).join('');
}
