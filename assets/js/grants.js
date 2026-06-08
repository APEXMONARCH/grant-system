/**
 * grants.js — Grants management page (grants.html)
 *
 * PHP endpoints:
 *   GET    /api/grants?status=&category=&date=&q=&page=&limit=10
 *          returns: { data: { items:[...], total, page, pages } }
 *   POST   /api/grants   → redirects to create-grant.html
 *   DELETE /api/grants/{id}
 *   GET    /api/grants/{id}  (for edit modal)
 *   PUT    /api/grants/{id}
 */

let grantsState = { page: 1, total: 0, pages: 0 };

document.addEventListener('DOMContentLoaded', () => {
  if (!Auth.requireAdmin()) return;

  bindFilters();
  bindGrantButtons();
  loadGrants();
});

// ─── FILTERS ───────────────────────────────────────────────
function bindFilters() {
  ['statusFilter','categoryFilter','dateFilter'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', () => { grantsState.page = 1; loadGrants(); });
  });

  let searchTimer;
  document.getElementById('searchInput')?.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { grantsState.page = 1; loadGrants(); }, 400);
  });
}

function getFilterParams() {
  return {
    status:   document.getElementById('statusFilter')?.value   || '',
    category: document.getElementById('categoryFilter')?.value || '',
    date:     document.getElementById('dateFilter')?.value     || '',
    q:        document.getElementById('searchInput')?.value    || '',
    page:     grantsState.page,
    limit:    10,
  };
}

// ─── GRANT BUTTONS ─────────────────────────────────────────
function bindGrantButtons() {
  document.getElementById('addGrantBtn')?.addEventListener('click', () => {
    window.location.href = 'create-grant.html';
  });
  document.getElementById('emptyStateAddGrantBtn')?.addEventListener('click', () => {
    window.location.href = 'create-grant.html';
  });
}

// ─── LOAD GRANTS ───────────────────────────────────────────
async function loadGrants() {
  const tbody     = document.getElementById('grantsTableBody');
  const emptyState = document.getElementById('emptyState');
  const countEl   = document.getElementById('resultsCount');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:32px;"><i class="fas fa-spinner fa-spin" style="font-size:1.5rem;color:#1a56db;"></i></td></tr>';
  if (emptyState) emptyState.style.display = 'none';

  try {
    const res    = await API.get('/grants', getFilterParams());
    const grants = res.data?.items || [];
    grantsState.total = res.data?.total || 0;
    grantsState.pages = res.data?.pages || 1;

    if (countEl) countEl.textContent = grantsState.total;

    if (!grants.length) {
      tbody.innerHTML = '';
      if (emptyState) emptyState.style.display = 'flex';
      renderPagination(0, 0, 0);
      return;
    }

    tbody.innerHTML = grants.map(g => `
      <tr>
        <td>
          <div class="grant-name">${escapeHtml(g.title)}</div>
          <small style="color:#6b7280;">${escapeHtml(g.category || '')}</small>
        </td>
        <td class="amount">${formatCurrency(g.budget)}</td>
        <td>${g.applicants_count ?? 0}</td>
        <td>${statusBadge(g.status)}</td>
        <td>
          <div style="display:flex;gap:8px;">
            <button class="btn btn-secondary btn-small" onclick="editGrant(${g.id})">
              <i class="fas fa-pen"></i>
            </button>
            <button class="btn btn-small" style="background:#fef2f2;color:#ef4444;border:1px solid #fecaca;"
              onclick="deleteGrant(${g.id}, '${escapeHtml(g.title)}')">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>`).join('');

    renderPagination(grantsState.page, grantsState.pages, grantsState.total);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#ef4444;padding:24px;">${escapeHtml(err.message)}</td></tr>`;
  }
}

// ─── PAGINATION ────────────────────────────────────────────
function renderPagination(page, pages, total) {
  let container = document.getElementById('paginationContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'paginationContainer';
    container.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:16px 24px;border-top:1px solid #e5e7eb;';
    document.querySelector('.card .card-body')?.appendChild(container);
  }

  if (pages <= 1) { container.innerHTML = ''; return; }

  container.innerHTML = `
    <span style="color:#6b7280;font-size:.875rem;">
      Page ${page} of ${pages} (${total} total)
    </span>
    <div style="display:flex;gap:8px;">
      <button class="btn btn-secondary btn-small" onclick="changePage(${page - 1})" ${page <= 1 ? 'disabled' : ''}>
        <i class="fas fa-chevron-left"></i> Prev
      </button>
      <button class="btn btn-secondary btn-small" onclick="changePage(${page + 1})" ${page >= pages ? 'disabled' : ''}>
        Next <i class="fas fa-chevron-right"></i>
      </button>
    </div>`;
}

function changePage(p) {
  grantsState.page = p;
  loadGrants();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ─── EDIT GRANT ────────────────────────────────────────────
async function editGrant(id) {
  window.location.href = `create-grant.html?id=${id}`;
}

// ─── DELETE GRANT ──────────────────────────────────────────
async function deleteGrant(id, title) {
  if (!confirm(`Delete grant "${title}"? This cannot be undone.`)) return;
  try {
    await API.delete(`/grants/${id}`);
    showAlert('Grant deleted successfully.', 'success');
    loadGrants();
  } catch (err) {
    showAlert(err.message || 'Failed to delete grant.', 'error');
  }
}
