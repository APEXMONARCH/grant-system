/**
 * admin-application-details.js — Application review page
 *
 * PHP endpoints:
 *   GET   /api/applications/{id}           → full application object
 *   PATCH /api/applications/{id}/status    body: { status, reason }
 *   GET   /api/applications/{id}/download  → file stream
 */

let currentApp = null;

document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.requireAdmin()) return;
  const id = new URLSearchParams(window.location.search).get('id');
  if (!id) { window.location.href = 'applications.html'; return; }
  await loadApplication(id);
  bindDownload(id);
});

// ─── LOAD ──────────────────────────────────────────────────
async function loadApplication(id) {
  const root = document.getElementById('applicationDetailRoot');
  if (!root) return;

  root.innerHTML = `
    <div style="text-align:center;padding:64px 24px;">
      <i class="fas fa-spinner fa-spin" style="font-size:2rem;color:#1a56db;"></i>
      <p style="margin-top:12px;color:#6b7280;font-size:.9rem;">Loading application...</p>
    </div>`;

  try {
    const res  = await API.get(`/applications/${id}`);
    currentApp = res.data;
    renderDetail(currentApp);
  } catch (err) {
    root.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-exclamation-circle" style="color:#ef4444;"></i>
        <h3>Failed to load</h3>
        <p>${escapeHtml(err.message)}</p>
        <a href="applications.html" class="btn-secondary">Back to Applications</a>
      </div>`;
  }
}

// ─── RENDER ────────────────────────────────────────────────
function renderDetail(app) {
  const root = document.getElementById('applicationDetailRoot');
  const avatarUrl = app.applicant_avatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(app.applicant_name)}&background=ffffff&color=1a56db&size=64`;

  root.innerHTML = `
    <!-- Hero banner -->
    <div class="detail-hero">
      <div class="detail-hero-left">
        <img src="${escapeHtml(avatarUrl)}" class="detail-hero-avatar" alt="${escapeHtml(app.applicant_name)}">
        <div>
          <h2 class="detail-hero-name">${escapeHtml(app.applicant_name)}</h2>
          <p class="detail-hero-grant">${escapeHtml(app.grant_title)}</p>
        </div>
      </div>
      <div class="detail-hero-right">
        <p class="detail-hero-label">Requested Amount</p>
        <div class="detail-hero-amount">${formatCurrency(app.requested_amount)}</div>
        <div style="margin-top:10px;">${statusBadge(app.status)}</div>
      </div>
    </div>

    <!-- Applicant + Research -->
    <div class="detail-grid-2">
      ${sectionCard('Applicant Information', [
        ['Full Name',           app.applicant_name],
        ['Staff ID',            app.staff_id],
        ['Institution',         app.institution],
        ['Faculty / Department',app.faculty],
        ['Academic Rank',       app.academic_rank],
        ['Email',               app.email],
        ['Phone',               app.phone],
        ['Date Submitted',      formatDate(app.submitted_at)],
      ])}
      ${sectionCard('Research Information', [
        ['Research Title',      app.research_title],
        ['Research Area',       app.research_area],
        ['Category',            app.research_category],
        ['Duration',            app.research_duration ? app.research_duration + ' months' : null],
        ['Objectives',          app.objectives],
        ['Methodology',         app.methodology],
      ])}
    </div>

    <!-- Budget -->
    <div class="detail-grid-1">
      ${sectionCard('Budget Breakdown', null, budgetTable(app.budget_items))}
    </div>

    <!-- Impact + Documents -->
    <div class="detail-grid-2">
      ${sectionCard('Research Impact', [
        ['Target Beneficiaries', app.impact_beneficiaries],
        ['Societal Impact',      app.impact_societal],
        ['Academic Contribution',app.impact_academic],
        ['Innovation / Originality', app.impact_innovation],
        ['Risk Assessment',      app.impact_risk],
      ])}
      ${sectionCard('Submitted Documents', null, documentsList(app.documents))}
    </div>

    <!-- Review actions -->
    <div class="card" id="reviewActionsCard">
      <div class="card-header"><h2>Review Decision</h2></div>
      <div class="card-body">
        <div class="form-group">
          <label for="reviewNotes">Reviewer Notes</label>
          <textarea id="reviewNotes" class="review-notes-area"
            placeholder="Add notes, feedback, or reason for decision..."
          >${escapeHtml(app.reviewer_notes || '')}</textarea>
        </div>
        <div class="review-action-row">
          <button id="btnApprove" class="btn-approve" onclick="updateStatus('approved')">
            <i class="fas fa-check-circle"></i> Approve
          </button>
          <button id="btnMarkReview" class="btn-mark-review" onclick="updateStatus('under-review')">
            <i class="fas fa-eye"></i> Under Review
          </button>
          <button id="btnReject" class="btn-reject" onclick="updateStatus('rejected')">
            <i class="fas fa-times-circle"></i> Reject
          </button>
        </div>
      </div>
    </div>`;
}

// ─── STATUS UPDATE ─────────────────────────────────────────
async function updateStatus(status) {
  if (!currentApp) return;
  const notes = document.getElementById('reviewNotes')?.value.trim();

  if (status === 'rejected' && !notes) {
    showAlert('Please add a reason before rejecting.', 'warning');
    document.getElementById('reviewNotes')?.focus();
    return;
  }

  const btns = ['btnApprove','btnMarkReview','btnReject'].map(id => document.getElementById(id));
  btns.forEach(b => b && (b.disabled = true));

  try {
    await API.patch(`/applications/${currentApp.id}/status`, { status, reason: notes });
    showAlert(`Application marked as ${status.replace('-', ' ')}.`, 'success');
    currentApp.status = status;
    // Refresh the hero badge
    const heroBadge = document.querySelector('.detail-hero .badge');
    if (heroBadge) heroBadge.outerHTML = statusBadge(status);
    setTimeout(() => window.location.href = 'applications.html', 1500);
  } catch (err) {
    showAlert(err.message || 'Failed to update status.', 'error');
    btns.forEach(b => b && (b.disabled = false));
  }
}

// ─── DOWNLOAD ──────────────────────────────────────────────
function bindDownload(id) {
  document.getElementById('downloadApplicationBtn')?.addEventListener('click', () => {
    const url = `${API.BASE_URL}/applications/${id}/download?token=${API.getToken()}`;
    const a   = Object.assign(document.createElement('a'), { href: url, download: `application-${id}.pdf` });
    document.body.appendChild(a); a.click(); a.remove();
  });
}

// ─── SECTION CARD BUILDER ──────────────────────────────────
function sectionCard(title, rows, customBody = '') {
  const body = customBody || (rows || []).map(([label, val]) =>
    val ? `<div class="detail-field">
             <div class="detail-field-label">${escapeHtml(label)}</div>
             <div class="detail-field-value">${escapeHtml(String(val))}</div>
           </div>` : ''
  ).join('');
  return `
    <div class="card">
      <div class="card-header"><h2>${escapeHtml(title)}</h2></div>
      <div class="card-body">${body || '<p style="color:#9ca3af;margin:0;">No data provided.</p>'}</div>
    </div>`;
}

// ─── BUDGET TABLE ──────────────────────────────────────────
function budgetTable(items = []) {
  if (!items?.length) return '<p style="color:#9ca3af;margin:0;">No budget breakdown provided.</p>';
  const total = items.reduce((s, i) => s + (parseFloat(i.cost) || 0), 0);
  return `
    <table class="detail-budget-table">
      <thead>
        <tr><th>Item</th><th>Description</th><th style="text-align:right;">Amount</th></tr>
      </thead>
      <tbody>
        ${items.map(i => `
          <tr>
            <td>${escapeHtml(i.item || '')}</td>
            <td>${escapeHtml(i.description || '')}</td>
            <td class="amount-cell">${formatCurrency(i.cost)}</td>
          </tr>`).join('')}
        <tr class="total-row">
          <td colspan="2">Total</td>
          <td class="amount-cell">${formatCurrency(total)}</td>
        </tr>
      </tbody>
    </table>`;
}

// ─── DOCUMENTS LIST ────────────────────────────────────────
function documentsList(docs = []) {
  if (!docs?.length) return '<p style="color:#9ca3af;margin:0;">No documents uploaded.</p>';
  return docs.map(d => `
    <div class="detail-doc-item">
      <i class="fas fa-file-pdf detail-doc-icon"></i>
      <div class="detail-doc-info">
        <p class="detail-doc-name">${escapeHtml(d.label || d.name || 'Document')}</p>
        <p class="detail-doc-filename">${escapeHtml(d.file_name || '')}</p>
      </div>
      <a href="${API.BASE_URL}/uploads/${d.file_id}?token=${API.getToken()}"
         target="_blank" class="btn-secondary btn-small" style="white-space:nowrap;">
        <i class="fas fa-download"></i> View
      </a>
    </div>`).join('');
}
