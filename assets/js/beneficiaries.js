/**
 * beneficiaries.js — Beneficiaries page (beneficiaries.html)
 *
 * PHP endpoints:
 *   GET /api/beneficiaries?page=&limit=20
 *       returns: { data: { items:[{ id, name, grant_title, amount, status, date }],
 *                          total, total_disbursed, pending_payments } }
 *
 *   GET /api/beneficiaries/stats
 *       returns: { data: { by_category:[{label,value}], approval_rate:{labels[],approved[],rejected[]} } }
 *
 *   GET /api/beneficiaries/export
 *       returns: CSV file stream
 */

let benePage = 1;

document.addEventListener('DOMContentLoaded', () => {
  if (!Auth.requireAdmin()) return;
  loadBeneficiaries();
  loadCharts();
  document.getElementById('exportBtn')?.addEventListener('click', exportData);
});

// ─── TABLE ─────────────────────────────────────────────────
async function loadBeneficiaries() {
  const tbody   = document.getElementById('beneficiariesTableBody');
  const countEl = document.getElementById('beneficiariesCount');
  if (!tbody) return;

  tbody.innerHTML = skeletonRows(5, 5);

  try {
    const res   = await API.get('/beneficiaries', { page: benePage, limit: 20 });
    const items = res.data?.items || [];
    const total = res.data?.total ?? items.length;

    // Summary cards
    setText('totalBeneficiaries', total);
    setText('totalDisbursed',     formatCurrency(res.data?.total_disbursed));
    setText('pendingPayments',    res.data?.pending_payments ?? 0);
    if (countEl) countEl.textContent = total;

    tbody.innerHTML = items.length
      ? items.map(b => `
          <tr>
            <td>
              <div style="font-weight:500;">${escapeHtml(b.name)}</div>
              <small style="color:#6b7280;">${escapeHtml(b.email || '')}</small>
            </td>
            <td>${escapeHtml(b.grant_title)}</td>
            <td class="amount" style="font-weight:600;">${formatCurrency(b.amount)}</td>
            <td>${statusBadge(b.status)}</td>
            <td style="color:#6b7280;">${formatDate(b.date)}</td>
          </tr>`).join('')
      : '<tr><td colspan="5" style="text-align:center;padding:32px;color:#9ca3af;">No beneficiaries found</td></tr>';
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#ef4444;padding:24px;">${escapeHtml(err.message)}</td></tr>`;
  }
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el && val != null) el.textContent = val;
}

// ─── CHARTS ────────────────────────────────────────────────
async function loadCharts() {
  try {
    const res  = await API.get('/beneficiaries/stats');
    const data = res.data;
    if (data?.by_category)  renderAllocationChart(data.by_category);
    if (data?.approval_rate) renderApprovalChart(data.approval_rate);
  } catch { /* charts optional */ }
}

function renderAllocationChart(categories = []) {
  const canvas = document.getElementById('allocationChart');
  if (!canvas || !categories.length) return;

  const COLOURS = ['#1a56db','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4'];
  const labels  = categories.map(c => c.label);
  const values  = categories.map(c => c.value);

  new Chart(canvas, {
    type: 'doughnut',
    data: { labels, datasets: [{ data: values, backgroundColor: COLOURS.slice(0, labels.length), borderWidth: 2, borderColor: '#fff' }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom' } },
    },
  });

  const legend = document.getElementById('allocationLegend');
  if (legend) {
    legend.innerHTML = labels.map((l, i) => `
      <span style="display:inline-flex;align-items:center;gap:5px;margin:4px 8px;font-size:.8rem;">
        <span style="width:10px;height:10px;border-radius:50%;background:${COLOURS[i]};"></span>${escapeHtml(l)}
      </span>`).join('');
  }
}

function renderApprovalChart(data = {}) {
  const canvas = document.getElementById('approvalChart');
  if (!canvas || !data.labels) return;

  new Chart(canvas, {
    type: 'bar',
    data: {
      labels: data.labels,
      datasets: [
        { label: 'Approved', data: data.approved, backgroundColor: 'rgba(16,185,129,.8)' },
        { label: 'Rejected', data: data.rejected, backgroundColor: 'rgba(239,68,68,.8)' },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom' } },
      scales: { x: { stacked: false }, y: { beginAtZero: true, ticks: { stepSize: 1 } } },
    },
  });
}

// ─── EXPORT ────────────────────────────────────────────────
function exportData() {
  const url = `${API.BASE_URL}/beneficiaries/export?token=${API.getToken()}`;
  const a   = document.createElement('a');
  a.href = url;
  a.download = 'beneficiaries.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// ─── HELPERS ───────────────────────────────────────────────
function skeletonRows(rows, cols) {
  return Array.from({ length: rows }, () => `
    <tr>${Array.from({ length: cols }, () =>
      `<td><div style="height:12px;background:#e5e7eb;border-radius:4px;animation:pulse 1.5s infinite;"></div></td>`
    ).join('')}</tr>`).join('');
}
