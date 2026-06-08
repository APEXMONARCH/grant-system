/**
 * user-dashboard.js — Handles all user portal pages
 *
 * Routing is done via <body data-user-page="..."> attribute:
 *   dashboard    → user-index.html
 *   grants       → user-grants-browse.html
 *   apply        → user-apply-grant.html
 *   applications → user-applications.html
 *   messages     → user-messages.html
 *   profile      → user-profile.html
 *
 * PHP endpoints (prefix /api/):
 *   GET  /grants?status=open&category=&q=&page=&limit=
 *   GET  /applications/my?status=&q=&page=
 *   POST /applications                  (multipart/form-data)
 *   GET  /dashboard/user-summary
 *   GET  /messages?filter=&q=
 *   PATCH /messages/{id}/read
 *   POST  /messages/read-all
 *   GET  /profile
 *   PUT  /profile                       (multipart for avatar)
 *   GET  /notifications
 */

document.addEventListener('DOMContentLoaded', () => {
  if (!Auth.requireAuth()) return;
  populateUserShell();

  const page = document.body.dataset.userPage;
  switch (page) {
    case 'dashboard':    initUserDashboard();    break;
    case 'grants':       initBrowseGrants();     break;
    case 'apply':        initApplyForm();        break;
    case 'applications': initMyApplications();   break;
    case 'messages':     initMessages();         break;
    case 'profile':      initProfile();          break;
  }
});

// ─── SHELL SETUP ───────────────────────────────────────────
function populateUserShell() {
  const user = Auth.getUser();
  if (!user) return;
  const name = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.name || 'User';
  const miniEl = document.getElementById('userMiniName');
  if (miniEl) miniEl.textContent = name;

  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0b6bcb&color=fff`;
  const topAvatar = document.getElementById('topAvatar');
  if (topAvatar) topAvatar.src = user.avatar || avatarUrl;
}

// ══════════════════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════════════════
async function initUserDashboard() {
  const user = Auth.getUser();
  const greeting = document.getElementById('heroGreeting');
  if (greeting) greeting.textContent = `Welcome back, ${user?.first_name || 'there'} 👋`;

  try {
    const res  = await API.get('/dashboard/user-summary');
    const d    = res.data;
    const grid = document.getElementById('dashboardStats');

    if (grid) {
      grid.innerHTML = [
        { icon:'fa-folder-open', label:'My Applications', value: d.total_applications ?? 0,  color:'',          link:'user-applications.html' },
        { icon:'fa-check-circle',label:'Approved',         value: d.approved ?? 0,             color:'allocated', link:'user-applications.html?status=approved' },
        { icon:'fa-clock',       label:'Under Review',     value: d.under_review ?? 0,         color:'remaining', link:'user-applications.html?status=in-review' },
        { icon:'fa-compass',     label:'Open Grants',      value: d.open_grants ?? 0,          color:'',          link:'user-grants-browse.html' },
      ].map(s => `
        <a href="${s.link}" class="stat-card" style="text-decoration:none;display:block;">
          <div class="stat-icon ${s.color}"><i class="fas ${s.icon}"></i></div>
          <div class="stat-info">
            <h3>${s.label}</h3>
            <p class="stat-value">${s.value}</p>
          </div>
        </a>`).join('');
    }

    loadRecentApplicationsTable(d.recent_applications || []);
  } catch (err) {
    showAlert(err.message, 'error');
  }
}

function loadRecentApplicationsTable(apps) {
  const tbody = document.getElementById('dashboardRecentRows');
  if (!tbody) return;
  tbody.innerHTML = apps.length
    ? apps.map(a => applicationRow(a)).join('')
    : '<tr><td colspan="5" style="text-align:center;color:#9ca3af;padding:24px;">No applications yet. <a href="user-grants-browse.html">Browse grants</a></td></tr>';
}

// ══════════════════════════════════════════════════════════
// BROWSE GRANTS
// ══════════════════════════════════════════════════════════
let grantsPage = 1;

async function initBrowseGrants() {
  loadGrantsTable();

  let timer;
  document.getElementById('grantSearch')?.addEventListener('input', () => {
    clearTimeout(timer); timer = setTimeout(() => { grantsPage=1; loadGrantsTable(); }, 400);
  });
  document.getElementById('grantCategory')?.addEventListener('change', () => { grantsPage=1; loadGrantsTable(); });
  document.getElementById('grantStatus')?.addEventListener('change',   () => { grantsPage=1; loadGrantsTable(); });
  document.getElementById('clearGrantFilters')?.addEventListener('click', () => {
    ['grantSearch','grantCategory','grantStatus'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
    grantsPage = 1; loadGrantsTable();
  });
}

async function loadGrantsTable() {
  const tbody  = document.getElementById('grantsRows');
  const noteEl = document.getElementById('grantsResultNote');
  if (!tbody) return;
  tbody.innerHTML = skeletonRows(4, 6);

  const params = {
    status:   document.getElementById('grantStatus')?.value   || '',
    category: document.getElementById('grantCategory')?.value || '',
    q:        document.getElementById('grantSearch')?.value   || '',
    page:     grantsPage, limit: 12,
  };

  try {
    const res    = await API.get('/grants', params);
    const grants = res.data?.items || [];
    const total  = res.data?.total ?? grants.length;
    if (noteEl) noteEl.textContent = `${total} result${total !== 1 ? 's' : ''}`;

    tbody.innerHTML = grants.length
      ? grants.map(g => `
          <tr>
            <td>
              <div style="font-weight:600;">${escapeHtml(g.title)}</div>
              <small style="color:#6b7280;">${escapeHtml(g.description?.slice(0,80) || '')}...</small>
            </td>
            <td><span class="badge info">${escapeHtml(g.category)}</span></td>
            <td class="amount" style="font-weight:600;">${formatCurrency(g.max_per_applicant)}</td>
            <td style="color:${deadlineColor(g.deadline)}">${formatDate(g.deadline)}</td>
            <td>${statusBadge(g.status)}</td>
            <td>
              <a href="user-apply-grant.html?grant_id=${g.id}" class="btn btn-primary btn-small"
                ${g.status !== 'active' ? 'disabled style="opacity:.5;pointer-events:none;"' : ''}>
                Apply
              </a>
            </td>
          </tr>`).join('')
      : '<tr><td colspan="6" style="text-align:center;padding:32px;color:#9ca3af;">No grants match your filters</td></tr>';
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" style="color:#ef4444;padding:16px;">${escapeHtml(err.message)}</td></tr>`;
  }
}

function deadlineColor(dateStr) {
  if (!dateStr) return '#6b7280';
  const days = Math.ceil((new Date(dateStr) - new Date()) / 86400000);
  if (days < 0) return '#ef4444';
  if (days <= 7) return '#f59e0b';
  return '#10b981';
}

// ══════════════════════════════════════════════════════════
// APPLY FORM
// ══════════════════════════════════════════════════════════
let applyStep = 1;
const APPLY_STEPS = 6;
const budgetItems = [];

async function initApplyForm() {
  // Pre-select grant from URL param
  const grantId = new URLSearchParams(window.location.search).get('grant_id');
  if (grantId) prefillGrantContext(grantId);

  // Prefill user info from profile
  prefillApplicantInfo();

  // Step navigation
  document.getElementById('nextStepBtn')?.addEventListener('click', () => {
    if (validateApplyStep()) goApplyStep(applyStep + 1);
  });
  document.getElementById('prevStepBtn')?.addEventListener('click', () => goApplyStep(applyStep - 1));

  // Step pill clicks
  document.querySelectorAll('.apply-step-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const t = parseInt(pill.dataset.step);
      if (t < applyStep) goApplyStep(t);
    });
  });

  // Budget rows
  document.getElementById('addBudgetRow')?.addEventListener('click', addBudgetRow);

  // File upload dropzones
  document.querySelectorAll('.upload-dropzone').forEach(zone => {
    const inputId = zone.dataset.input;
    const nameId  = zone.dataset.name;
    zone.addEventListener('click', () => document.getElementById(inputId)?.click());
    zone.addEventListener('dragover', e => { e.preventDefault(); zone.style.borderColor = '#1a56db'; });
    zone.addEventListener('dragleave', () => zone.style.borderColor = '');
    zone.addEventListener('drop', e => {
      e.preventDefault();
      zone.style.borderColor = '';
      const file = e.dataTransfer.files[0];
      if (file) updateFileName(nameId, file.name);
    });
    document.getElementById(inputId)?.addEventListener('change', (e) => {
      if (e.target.files[0]) updateFileName(nameId, e.target.files[0].name);
    });
  });

  // Submit
  document.getElementById('applyForm')?.addEventListener('submit', submitApplication);

  goApplyStep(1);
}

async function prefillGrantContext(grantId) {
  try {
    const res = await API.get(`/grants/${grantId}`);
    const g   = res.data;
    const ctx = document.getElementById('applyGrantContext');
    if (ctx) {
      ctx.hidden = false;
      ctx.innerHTML = `
        <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:16px;margin-bottom:16px;">
          <strong style="color:#1a56db;">${escapeHtml(g.title)}</strong>
          <span style="margin-left:12px;color:#6b7280;font-size:.875rem;">Max: ${formatCurrency(g.max_per_applicant)} · Deadline: ${formatDate(g.application_deadline)}</span>
        </div>`;
    }
    // Hidden input for grant_id
    let hiddenInput = document.getElementById('hiddenGrantId');
    if (!hiddenInput) {
      hiddenInput = document.createElement('input');
      hiddenInput.type = 'hidden'; hiddenInput.id = 'hiddenGrantId'; hiddenInput.name = 'grant_id';
      document.getElementById('applyForm')?.appendChild(hiddenInput);
    }
    hiddenInput.value = grantId;
  } catch { /* ignore */ }
}

async function prefillApplicantInfo() {
  try {
    const res  = await API.get('/profile');
    const user = res.data;
    setVal('appFullName',   `${user.first_name || ''} ${user.last_name || ''}`.trim());
    setVal('appEmail',      user.email);
    setVal('appPhone',      user.phone);
    setVal('appInstitution',user.institution);
    setVal('appFaculty',    user.faculty);
    setVal('appRank',       user.academic_rank);
    setVal('appStaffId',    user.staff_id);
  } catch { /* use blank form */ }
}

function setVal(id, val) {
  const el = document.getElementById(id);
  if (el && val) el.value = val;
}

function updateFileName(nameId, name) {
  const el = document.getElementById(nameId);
  if (el) { el.textContent = name; el.style.color = '#10b981'; }
}

function goApplyStep(step) {
  if (step < 1 || step > APPLY_STEPS) return;
  if (step === APPLY_STEPS) populateApplyReview();
  applyStep = step;

  document.querySelectorAll('.apply-step-panel').forEach((p, i) => {
    const active = i + 1 === step;
    p.hidden = !active;
    if (!p.hidden) p.classList.add('active'); else p.classList.remove('active');
  });

  document.querySelectorAll('.apply-step-pill').forEach((p, i) => {
    p.classList.toggle('active', i + 1 === step);
  });

  const prevBtn   = document.getElementById('prevStepBtn');
  const nextBtn   = document.getElementById('nextStepBtn');
  const submitBtn = document.getElementById('submitApplicationBtn');

  if (prevBtn)   prevBtn.disabled   = step === 1;
  if (nextBtn)   nextBtn.hidden     = step === APPLY_STEPS;
  if (submitBtn) submitBtn.hidden   = step !== APPLY_STEPS;

  // Progress bar
  const bar  = document.getElementById('applyProgressBar');
  const text = document.getElementById('applyProgressText');
  if (bar)  bar.style.width  = `${(step / APPLY_STEPS) * 100}%`;
  if (text) text.textContent = `Step ${step} of ${APPLY_STEPS}`;
}

function validateApplyStep() {
  const panel = document.querySelector(`.apply-step-panel[data-step="${applyStep}"]`);
  if (!panel) return true;

  // Required file check on step 5
  if (applyStep === 5) {
    let missing = false;
    document.querySelectorAll('.upload-card[data-required="true"]').forEach(card => {
      const inputId = card.querySelector('.upload-dropzone')?.dataset.input;
      const input   = document.getElementById(inputId);
      if (!input?.files?.length) missing = true;
    });
    if (missing) { showAlert('Please upload all required documents.', 'warning'); return false; }
    return true;
  }

  const inputs = [...panel.querySelectorAll('[required]')];
  let valid = true;
  inputs.forEach(inp => {
    inp.classList.remove('input-error');
    if (!inp.value.trim()) { inp.classList.add('input-error'); valid = false; }
  });
  if (!valid) showAlert('Please complete all required fields.', 'warning');
  return valid;
}

// Budget rows
function addBudgetRow() {
  const tbody = document.getElementById('budgetRowsBody');
  const idx   = tbody.querySelectorAll('tr').length;
  const row   = document.createElement('tr');
  row.innerHTML = `
    <td><input class="form-input budget-item" data-field="item" placeholder="Item name" style="padding:6px 10px;"></td>
    <td><input class="form-input budget-desc" data-field="description" placeholder="Description" style="padding:6px 10px;"></td>
    <td><input class="form-input budget-cost" type="number" min="0" step="0.01" placeholder="0.00"
      style="padding:6px 10px;" oninput="recalcBudget()"></td>
    <td><button type="button" style="background:none;border:none;color:#ef4444;cursor:pointer;" onclick="this.closest('tr').remove();recalcBudget()">
      <i class="fas fa-times"></i></button></td>`;
  tbody.appendChild(row);
}

function recalcBudget() {
  const total = [...document.querySelectorAll('.budget-cost')]
    .reduce((s, i) => s + (parseFloat(i.value) || 0), 0);
  const el = document.getElementById('budgetTotal');
  if (el) el.textContent = total.toFixed(2);
}

// Review summary
function populateApplyReview() {
  const sum = document.getElementById('applyReviewSummary');
  if (!sum) return;
  sum.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
      ${reviewItem('Full Name',       document.getElementById('appFullName')?.value)}
      ${reviewItem('Email',           document.getElementById('appEmail')?.value)}
      ${reviewItem('Institution',     document.getElementById('appInstitution')?.value)}
      ${reviewItem('Research Title',  document.getElementById('researchTitle')?.value)}
      ${reviewItem('Research Area',   document.getElementById('researchArea')?.value)}
      ${reviewItem('Budget Total',    '$' + (document.getElementById('budgetTotal')?.textContent || '0'))}
    </div>`;
}

function reviewItem(label, val) {
  return `<div><strong style="font-size:.8rem;color:#6b7280;">${label}:</strong><br><span style="font-size:.9rem;">${escapeHtml(val || '—')}</span></div>`;
}

// Submit
async function submitApplication(e) {
  e.preventDefault();
  const btn = document.getElementById('submitApplicationBtn');

  if (!document.getElementById('declarationCheck')?.checked) {
    showAlert('Please check the declaration to confirm.', 'warning');
    return;
  }

  const fd = new FormData();

  // Text fields
  const fields = {
    grant_id:             document.getElementById('hiddenGrantId')?.value,
    full_name:            document.getElementById('appFullName')?.value,
    staff_id:             document.getElementById('appStaffId')?.value,
    institution:          document.getElementById('appInstitution')?.value,
    faculty:              document.getElementById('appFaculty')?.value,
    academic_rank:        document.getElementById('appRank')?.value,
    email:                document.getElementById('appEmail')?.value,
    phone:                document.getElementById('appPhone')?.value,
    research_title:       document.getElementById('researchTitle')?.value,
    research_area:        document.getElementById('researchArea')?.value,
    research_problem:     document.getElementById('researchProblem')?.value,
    research_outcomes:    document.getElementById('researchOutcomes')?.value,
    research_location:    document.getElementById('researchLocation')?.value,
    proposed_start_date:  document.getElementById('proposedStartDate')?.value,
    proposed_end_date:    document.getElementById('proposedEndDate')?.value,
    requested_amount:     document.getElementById('applyAmount')?.value,
    research_category:    document.getElementById('researchCategory')?.value,
    research_duration:    document.getElementById('researchDuration')?.value,
    objectives:           document.getElementById('researchObjectives')?.value,
    methodology:          document.getElementById('researchAbstract')?.value,
    impact_beneficiaries: document.getElementById('impactBeneficiaries')?.value,
    impact_societal:      document.getElementById('impactSocietal')?.value,
    impact_academic:      document.getElementById('impactAcademic')?.value,
    impact_innovation:    document.getElementById('impactInnovation')?.value,
    impact_risk:          document.getElementById('impactRisk')?.value,
    digital_signature:    document.getElementById('digitalSignature')?.value,
    declaration_date:     document.getElementById('declarationDate')?.value,
  };
  Object.entries(fields).forEach(([k, v]) => v != null && fd.append(k, v));

  // Budget rows as JSON
  const budgetRows = [...document.querySelectorAll('#budgetRowsBody tr')].map(row => ({
    item:        row.querySelector('.budget-item')?.value,
    description: row.querySelector('.budget-desc')?.value,
    cost:        row.querySelector('.budget-cost')?.value,
  }));
  fd.append('budget_items', JSON.stringify(budgetRows));

  // File uploads
  ['uploadProposal','uploadCv','uploadPublications','uploadApprovalLetter','uploadPreviousEvidence','uploadSupportingDocs'].forEach(id => {
    const input = document.getElementById(id);
    if (input?.files?.[0]) fd.append(id, input.files[0]);
  });

  setLoading(btn, true, 'Submitting...');
  try {
    await API.post('/applications', fd, true); // true = FormData
    showAlert('Application submitted successfully!', 'success');
    setTimeout(() => window.location.href = 'user-applications.html', 1500);
  } catch (err) {
    showAlert(err.message || 'Submission failed. Please try again.', 'error');
    if (err.errors) showFieldErrors(err.errors);
    setLoading(btn, false);
  }
}

// ══════════════════════════════════════════════════════════
// MY APPLICATIONS
// ══════════════════════════════════════════════════════════
let myAppsPage = 1;

async function initMyApplications() {
  loadMyApplications();

  let timer;
  document.getElementById('applicationSearch')?.addEventListener('input', () => {
    clearTimeout(timer); timer = setTimeout(() => { myAppsPage=1; loadMyApplications(); }, 400);
  });
  document.getElementById('applicationStatus')?.addEventListener('change', () => { myAppsPage=1; loadMyApplications(); });

  // Pre-filter from URL
  const urlStatus = new URLSearchParams(window.location.search).get('status');
  if (urlStatus) {
    const el = document.getElementById('applicationStatus');
    if (el) { el.value = urlStatus; loadMyApplications(); }
  }
}

async function loadMyApplications() {
  const tbody = document.getElementById('applicationsRows');
  if (!tbody) return;
  tbody.innerHTML = skeletonRows(3, 5);

  try {
    const res  = await API.get('/applications/my', {
      status: document.getElementById('applicationStatus')?.value || '',
      q:      document.getElementById('applicationSearch')?.value || '',
      page: myAppsPage, limit: 15,
    });
    const apps = res.data?.items || res.data || [];
    tbody.innerHTML = apps.length
      ? apps.map(a => applicationRow(a)).join('')
      : '<tr><td colspan="5" style="text-align:center;padding:32px;color:#9ca3af;">No applications found. <a href="user-grants-browse.html">Browse grants</a></td></tr>';
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" style="color:#ef4444;padding:16px;">${escapeHtml(err.message)}</td></tr>`;
  }
}

function applicationRow(a) {
  return `
    <tr>
      <td>
        <div style="font-weight:500;">${escapeHtml(a.grant_title)}</div>
        <small style="color:#6b7280;">${escapeHtml(a.research_title || '')}</small>
      </td>
      <td class="amount" style="font-weight:600;">${formatCurrency(a.requested_amount)}</td>
      <td>${statusBadge(a.status)}</td>
      <td style="color:#6b7280;">${formatDate(a.submitted_at)}</td>
      <td>
        <a href="user-apply-grant.html?view_id=${a.id}" class="btn btn-secondary btn-small">
          <i class="fas fa-eye"></i> View
        </a>
      </td>
    </tr>`;
}

// ══════════════════════════════════════════════════════════
// MESSAGES
// ══════════════════════════════════════════════════════════
let messages = [];
let activeMessageId = null;

async function initMessages() {
  await loadMessages();

  document.getElementById('markAllReadBtn')?.addEventListener('click', markAllRead);

  let timer;
  document.getElementById('messageSearch')?.addEventListener('input', () => {
    clearTimeout(timer); timer = setTimeout(() => renderThread(getFilteredMessages()), 300);
  });

  document.querySelectorAll('[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderThread(getFilteredMessages());
    });
  });
}

async function loadMessages() {
  try {
    const res = await API.get('/messages');
    messages  = res.data?.items || res.data || [];
    renderThread(messages);
  } catch (err) {
    document.getElementById('messageThread').innerHTML =
      `<p style="color:#ef4444;padding:16px;">${escapeHtml(err.message)}</p>`;
  }
}

function getFilteredMessages() {
  const q      = document.getElementById('messageSearch')?.value.toLowerCase() || '';
  const filter = document.querySelector('[data-filter].active')?.dataset.filter || 'all';
  return messages.filter(m => {
    const matchFilter = filter === 'all' || (filter === 'unread' && !m.read) || (filter === 'read' && m.read);
    const matchSearch = !q || m.subject?.toLowerCase().includes(q) || m.sender?.toLowerCase().includes(q) || m.message?.toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });
}

function renderThread(list) {
  const thread = document.getElementById('messageThread');
  const note   = document.getElementById('messageCountNote');
  if (!thread) return;
  if (note) note.textContent = `${list.length} item${list.length !== 1 ? 's' : ''}`;

  thread.innerHTML = list.length
    ? list.map(m => `
        <div class="message-item ${m.read ? '' : 'unread'}" onclick="openMessage(${m.id})"
          style="padding:14px 16px;border-bottom:1px solid #f3f4f6;cursor:pointer;background:${!m.read ? '#eff6ff' : '#fff'};${activeMessageId===m.id ? 'border-left:3px solid #1a56db;' : ''}">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
            <span style="font-weight:${m.read ? '400' : '600'};font-size:.9rem;">${escapeHtml(m.sender || 'System')}</span>
            <span style="font-size:.75rem;color:#9ca3af;">${formatDate(m.created_at)}</span>
          </div>
          <div style="font-size:.875rem;color:#374151;font-weight:${m.read ? '400' : '600'}">${escapeHtml(m.subject)}</div>
          <div style="font-size:.8rem;color:#9ca3af;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(m.message?.slice(0,80) || '')}</div>
        </div>`).join('')
    : '<p style="text-align:center;padding:32px;color:#9ca3af;">No messages</p>';
}

async function openMessage(id) {
  activeMessageId = id;
  const msg = messages.find(m => m.id === id);
  if (!msg) return;

  const detail = document.getElementById('messageDetail');
  if (detail) {
    detail.innerHTML = `
      <div style="padding:24px;">
        <h3 style="margin:0 0 4px;">${escapeHtml(msg.subject)}</h3>
        <div style="font-size:.8rem;color:#9ca3af;margin-bottom:20px;">
          From: ${escapeHtml(msg.sender || 'System')} · ${formatDate(msg.created_at)}
        </div>
        <div style="color:#374151;line-height:1.7;">${escapeHtml(msg.message)}</div>
      </div>`;
  }

  if (!msg.read) {
    try {
      await API.patch(`/messages/${id}/read`);
      msg.read = true;
      renderThread(getFilteredMessages());
      // Update notification count
      const unread = messages.filter(m => !m.read).length;
      document.querySelectorAll('#topNotificationCount').forEach(el => el.textContent = unread);
    } catch { /* ignore */ }
  }
}

async function markAllRead() {
  try {
    await API.post('/messages/read-all');
    messages.forEach(m => m.read = true);
    renderThread(getFilteredMessages());
    document.querySelectorAll('#topNotificationCount').forEach(el => { el.textContent = '0'; el.style.display = 'none'; });
    showAlert('All messages marked as read.', 'success');
  } catch (err) {
    showAlert(err.message, 'error');
  }
}

// ══════════════════════════════════════════════════════════
// PROFILE
// ══════════════════════════════════════════════════════════
let profileData = {};

async function initProfile() {
  try {
    const res  = await API.get('/profile');
    profileData = res.data;
    renderProfile(profileData);
    renderPreferences(profileData);
  } catch (err) {
    showAlert('Could not load profile: ' + err.message, 'error');
  }

  document.getElementById('editProfileBtn')?.addEventListener('click', openProfileModal);
}

function renderPreferences(u) {
  const list = document.getElementById('preferencesList');
  if (!list) return;

  const prefs = [
    { icon: 'fa-envelope',      label: 'Email Notifications',   value: 'Enabled',           id: 'pref-email'  },
    { icon: 'fa-bell',          label: 'Application Updates',    value: 'Enabled',           id: 'pref-apps'   },
    { icon: 'fa-calendar-alt',  label: 'Deadline Reminders',     value: 'Enabled',           id: 'pref-remind' },
    { icon: 'fa-language',      label: 'Language',               value: 'English',           id: 'pref-lang'   },
    { icon: 'fa-calendar-check',label: 'Member Since',           value: formatDate(u?.created_at), id: 'pref-since' },
    { icon: 'fa-shield-alt',    label: 'Account Status',         value: 'Active',            id: 'pref-status' },
  ];

  list.innerHTML = prefs.map(p => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid #f3f4f6;">
      <div style="display:flex;align-items:center;gap:12px;">
        <div style="width:36px;height:36px;background:#eff6ff;border-radius:8px;display:flex;align-items:center;justify-content:center;">
          <i class="fas ${p.icon}" style="color:#1a56db;font-size:.9rem;"></i>
        </div>
        <span style="font-size:.9rem;font-weight:500;color:#1f2937;">${p.label}</span>
      </div>
      <span style="font-size:.85rem;color:#6b7280;">${escapeHtml(p.value || '—')}</span>
    </div>`).join('');
}

function renderProfile(u) {
  const grid = document.getElementById('profileGrid');
  if (!grid) return;
  grid.innerHTML = [
    ['First Name',        u.first_name],
    ['Last Name',         u.last_name],
    ['Email',             u.email],
    ['Phone',             u.phone],
    ['Institution',       u.institution],
    ['Faculty',           u.faculty],
    ['Academic Rank',     u.academic_rank],
    ['Staff ID',          u.staff_id],
    ['Organization',      u.organization],
    ['Member Since',      formatDate(u.created_at)],
  ].map(([label, val]) => `
    <div>
      <div style="font-size:.75rem;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">${label}</div>
      <div style="font-size:.95rem;color:#1f2937;">${escapeHtml(val || '—')}</div>
    </div>`).join('');

  // Populate preferences section
  const prefList = document.getElementById('preferencesList');
  if (prefList) {
    const prefs = [
      { icon: 'fa-envelope',     label: 'Email Notifications',    desc: 'Updates on your applications via email',     key: 'email_notifications',  val: u.email_notifications !== false },
      { icon: 'fa-bell',         label: 'Application Alerts',     desc: 'Notified when your application status changes', key: 'app_alerts',           val: u.app_alerts !== false },
      { icon: 'fa-calendar-alt', label: 'Deadline Reminders',     desc: 'Reminders before grant deadlines',           key: 'deadline_reminders',   val: u.deadline_reminders !== false },
      { icon: 'fa-comment-dots', label: 'Reviewer Feedback',      desc: 'Receive notes when an admin reviews your application', key: 'reviewer_feedback', val: u.reviewer_feedback !== false },
    ];
    prefList.innerHTML = prefs.map(p => `
      <div class="pref-item">
        <div class="pref-info">
          <div class="pref-icon"><i class="fas ${p.icon}"></i></div>
          <div>
            <div class="pref-label">${p.label}</div>
            <div class="pref-desc">${p.desc}</div>
          </div>
        </div>
        <label class="toggle-switch" style="flex-shrink:0;">
          <input type="checkbox" ${p.val ? 'checked' : ''} data-pref="${p.key}"
            onchange="saveUserPref('${p.key}', this.checked)">
          <span class="toggle-slider"></span>
        </label>
      </div>`).join('');
  }
}


async function saveUserPref(key, value) {
  try {
    await API.patch('/profile/preferences', { [key]: value });
  } catch (err) {
    showAlert('Could not save preference.', 'error');
  }
}

function openProfileModal() {
  const u = profileData;
  const existing = document.getElementById('profileModal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'profileModal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:1000;display:flex;align-items:center;justify-content:center;padding:16px;overflow-y:auto;';
  modal.innerHTML = `
    <div style="background:#fff;border-radius:16px;width:100%;max-width:560px;padding:32px;position:relative;margin:auto;">
      <button onclick="document.getElementById('profileModal').remove()"
        style="position:absolute;top:16px;right:16px;background:none;border:none;font-size:1.2rem;cursor:pointer;color:#6b7280;">&times;</button>
      <h3 style="margin:0 0 24px;">Edit Profile</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
        ${profileField('First Name',    'editFirstName',  u.first_name)}
        ${profileField('Last Name',     'editLastName',   u.last_name)}
        ${profileField('Phone',         'editPhone',      u.phone,       'tel')}
        ${profileField('Institution',   'editInstitution',u.institution)}
        ${profileField('Faculty',       'editFaculty',    u.faculty)}
        ${profileField('Academic Rank', 'editRank',       u.academic_rank)}
        ${profileField('Staff ID',      'editStaffId',    u.staff_id)}
        ${profileField('Organization',  'editOrg',        u.organization)}
      </div>
      <div style="display:flex;gap:12px;margin-top:24px;">
        <button id="saveProfileBtn" class="btn btn-primary" style="flex:1;" onclick="saveProfile()">Save Changes</button>
        <button class="btn btn-secondary" style="flex:1;" onclick="document.getElementById('profileModal').remove()">Cancel</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
}

function profileField(label, id, val, type = 'text') {
  return `<div class="form-group" style="margin-bottom:0;">
    <label for="${id}" style="font-size:.8rem;color:#6b7280;font-weight:600;">${label}</label>
    <input id="${id}" type="${type}" class="form-input" value="${escapeHtml(val || '')}"
      style="padding:8px 12px;border:1px solid #d1d5db;border-radius:8px;width:100%;font-size:.9rem;">
  </div>`;
}

async function saveProfile() {
  const btn = document.getElementById('saveProfileBtn');
  const payload = {
    first_name:    document.getElementById('editFirstName')?.value.trim(),
    last_name:     document.getElementById('editLastName')?.value.trim(),
    phone:         document.getElementById('editPhone')?.value.trim(),
    institution:   document.getElementById('editInstitution')?.value.trim(),
    faculty:       document.getElementById('editFaculty')?.value.trim(),
    academic_rank: document.getElementById('editRank')?.value.trim(),
    staff_id:      document.getElementById('editStaffId')?.value.trim(),
    organization:  document.getElementById('editOrg')?.value.trim(),
  };

  setLoading(btn, true, 'Saving...');
  try {
    const res  = await API.put('/profile', payload);
    profileData = { ...profileData, ...payload };
    renderProfile(profileData);
    document.getElementById('profileModal')?.remove();
    showAlert('Profile updated successfully.', 'success');

    // Update stored user
    const user = Auth.getUser();
    if (user) {
      user.first_name = payload.first_name;
      user.last_name  = payload.last_name;
      localStorage.setItem('auth_user', JSON.stringify(user));
      populateUserShell();
    }
  } catch (err) {
    showAlert(err.message || 'Failed to update profile.', 'error');
    if (err.errors) showFieldErrors(err.errors);
    setLoading(btn, false);
  }
}

// ─── SHARED UTILITIES ──────────────────────────────────────
function skeletonRows(rows, cols) {
  return Array.from({ length: rows }, () => `
    <tr>${Array.from({ length: cols }, () =>
      `<td><div style="height:12px;background:#e5e7eb;border-radius:4px;animation:pulse 1.5s infinite;"></div></td>`
    ).join('')}</tr>`).join('');
}
