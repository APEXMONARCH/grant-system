/**
 * applications.js — Kanban board (applications.html)
 *
 * PHP endpoints:
 *   GET /api/applications?status=submitted&limit=50
 *   GET /api/applications?status=under-review&limit=50
 *   GET /api/applications?status=approved&limit=50
 *   GET /api/applications?status=rejected&limit=50
 *
 *   Each item: { id, applicant_name, applicant_avatar?, grant_title,
 *                requested_amount, submitted_at, score?, status }
 */

document.addEventListener('DOMContentLoaded', () => {
  if (!Auth.requireAdmin()) return;
  loadAllColumns();
});

const COLUMNS = [
  { status: 'submitted',    colId: 'submittedColumn', countId: 'submittedCount' },
  { status: 'under-review', colId: 'reviewColumn',    countId: 'reviewCount'    },
  { status: 'approved',     colId: 'approvedColumn',  countId: 'approvedCount'  },
  { status: 'rejected',     colId: 'rejectedColumn',  countId: 'rejectedCount'  },
];

async function loadAllColumns() {
  const totalEl = document.querySelector('.stats-badge span');
  let grandTotal = 0;

  await Promise.all(COLUMNS.map(async (col) => {
    const colEl   = document.getElementById(col.colId);
    const countEl = document.getElementById(col.countId);
    if (!colEl) return;

    colEl.innerHTML = skeletonCards(3);

    try {
      const res   = await API.get('/applications', { status: col.status, limit: 50 });
      const items = res.data?.items || res.data || [];
      const count = res.data?.total ?? items.length;

      if (countEl) countEl.textContent = count;
      grandTotal += count;

      colEl.innerHTML = items.length
        ? items.map(app => renderCard(app)).join('')
        : `<div style="text-align:center;color:#9ca3af;padding:32px 16px;font-size:.875rem;">
             <i class="fas fa-inbox" style="font-size:1.5rem;display:block;margin-bottom:8px;"></i>
             No applications
           </div>`;
    } catch {
      colEl.innerHTML = `<div style="color:#ef4444;padding:16px;font-size:.875rem;text-align:center;">Failed to load</div>`;
    }
  }));

  if (totalEl) totalEl.textContent = `Total: ${grandTotal} applications`;
}

// ─── CARD TEMPLATE (uses design system CSS classes) ────────
function renderCard(app) {
  const initials   = (app.applicant_name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const score      = app.score ?? null;
  const scoreClass = score === null ? '' : score >= 80 ? 'score-high' : score >= 60 ? 'score-medium' : 'score-low';

  return `
    <div class="application-card" onclick="openApplication(${app.id})" role="button" tabindex="0"
      onkeydown="if(event.key==='Enter')openApplication(${app.id})">
      <div class="card-header-section">
        <div class="applicant-info">
          ${app.applicant_avatar
            ? `<img src="${escapeHtml(app.applicant_avatar)}" class="applicant-avatar" alt="${escapeHtml(app.applicant_name)}">`
            : `<div class="applicant-avatar">${initials}</div>`}
          <div class="applicant-details">
            <h4>${escapeHtml(app.applicant_name)}</h4>
            <p class="grant-name-text">${escapeHtml(app.grant_title)}</p>
          </div>
        </div>
        ${score !== null ? `<span class="score-badge ${scoreClass}">${score}</span>` : ''}
      </div>

      <div class="card-details">
        <div class="detail-item">
          <i class="fas fa-dollar-sign"></i>
          <span>${formatCurrency(app.requested_amount)}</span>
        </div>
        <div class="detail-item">
          <i class="fas fa-calendar-alt"></i>
          <span>${formatDate(app.submitted_at)}</span>
        </div>
      </div>

      <div class="card-actions">
        <button class="card-action-btn view-btn"
          onclick="event.stopPropagation(); openApplication(${app.id})">
          <i class="fas fa-eye"></i> View
        </button>
      </div>
    </div>`;
}

function openApplication(id) {
  window.location.href = `admin-application-details.html?id=${id}`;
}

// ─── SKELETON ──────────────────────────────────────────────
function skeletonCards(n) {
  return Array.from({ length: n }, () => `
    <div class="application-card" style="pointer-events:none;">
      <div style="display:flex;gap:10px;align-items:center;margin-bottom:14px;">
        <div style="width:40px;height:40px;border-radius:50%;background:#e5e7eb;animation:pulse 1.5s infinite;flex-shrink:0;"></div>
        <div style="flex:1;">
          <div style="height:12px;background:#e5e7eb;border-radius:4px;margin-bottom:6px;animation:pulse 1.5s infinite;"></div>
          <div style="height:10px;background:#e5e7eb;border-radius:4px;width:70%;animation:pulse 1.5s infinite;"></div>
        </div>
      </div>
      <div style="height:10px;background:#e5e7eb;border-radius:4px;margin-bottom:8px;animation:pulse 1.5s infinite;"></div>
      <div style="height:10px;background:#e5e7eb;border-radius:4px;width:60%;animation:pulse 1.5s infinite;"></div>
    </div>`).join('');
}
