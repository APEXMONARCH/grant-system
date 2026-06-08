/**
 * dashboard.js — Admin dashboard (index.html)
 *
 * PHP endpoints:
 *   GET /api/dashboard/summary
 *     returns: { data: {
 *       total_funds, allocated_funds, remaining_funds,
 *       funds_trend, allocated_trend, remaining_trend,
 *       chart: { labels:[], allocated:[], available:[], disbursed:[] }
 *     }}
 *
 *   GET /api/grants?status=active&limit=5
 *   GET /api/applications?limit=5&sort=date_desc
 */

document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.requireAdmin()) return;

  await Promise.all([
    loadSummary(),
    loadActiveGrants(),
    loadRecentApplications(),
  ]);
});

// ─── SUMMARY STATS ─────────────────────────────────────────
async function loadSummary() {
  try {
    const res = await API.get('/dashboard/summary');
    const d   = res.data;

    setText('statTotalFunds',     formatCurrency(d.total_funds));
    setText('statAllocatedFunds', formatCurrency(d.allocated_funds));
    setText('statRemainingFunds', formatCurrency(d.remaining_funds));

    setTrend('trendTotal',     d.funds_trend);
    setTrend('trendAllocated', d.allocated_trend);
    setTrend('trendRemaining', d.remaining_trend);

    if (d.chart) initFundsChart(d.chart);
  } catch (err) {
    showAlert(err.message || 'Failed to load dashboard data.', 'error');
  }
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function setTrend(id, val) {
  const el = document.getElementById(id);
  if (!el || val == null) return;
  const positive = parseFloat(val) >= 0;
  el.className = `stat-trend ${positive ? 'positive' : 'negative'}`;
  el.innerHTML = `<i class="fas fa-arrow-${positive ? 'up' : 'down'}"></i> ${Math.abs(val)}%`;
}

// ─── FUNDS CHART ───────────────────────────────────────────
function initFundsChart(chartData) {
  const canvas = document.getElementById('fundsChart');
  if (!canvas) return;
  if (window.fundsChartInstance) window.fundsChartInstance.destroy();

  window.fundsChartInstance = new Chart(canvas, {
    type: 'line',
    data: {
      labels: chartData.labels,
      datasets: [
        { label: 'Allocated',  data: chartData.allocated,  borderColor: '#1a56db', backgroundColor: 'rgba(26,86,219,.08)',  tension: 0.4, fill: true },
        { label: 'Available',  data: chartData.available,  borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,.08)', tension: 0.4, fill: true },
        { label: 'Disbursed',  data: chartData.disbursed,  borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,.08)',  tension: 0.4, fill: true },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom' } },
      scales: {
        y: { ticks: { callback: v => '$' + (v/1000).toFixed(0) + 'k' } },
      },
    },
  });
}

// ─── ACTIVE GRANTS TABLE ───────────────────────────────────
async function loadActiveGrants() {
  const tbody = document.querySelector('.data-table:first-of-type tbody');
  if (!tbody) return;
  try {
    const res    = await API.get('/grants', { status: 'active', limit: 5 });
    const grants = res.data?.items || res.data || [];
    tbody.innerHTML = grants.length
      ? grants.map(g => `
          <tr>
            <td class="grant-name">${escapeHtml(g.title)}</td>
            <td class="amount">${formatCurrency(g.budget)}</td>
            <td>${g.applicants_count ?? 0}</td>
            <td>${statusBadge(g.status)}</td>
          </tr>`).join('')
      : '<tr><td colspan="4" style="text-align:center;color:#6b7280;">No active grants</td></tr>';
  } catch {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#ef4444;">Failed to load</td></tr>';
  }
}

// ─── RECENT APPLICATIONS TABLE ─────────────────────────────
async function loadRecentApplications() {
  const tables = document.querySelectorAll('.data-table');
  const tbody  = tables[1]?.querySelector('tbody');
  if (!tbody) return;
  try {
    const res  = await API.get('/applications', { limit: 5, sort: 'date_desc' });
    const apps = res.data?.items || res.data || [];
    tbody.innerHTML = apps.length
      ? apps.map(a => `
          <tr>
            <td class="applicant-name">${escapeHtml(a.applicant_name)}</td>
            <td>${escapeHtml(a.grant_title)}</td>
            <td>${statusBadge(a.status)}</td>
            <td>${formatDate(a.submitted_at)}</td>
          </tr>`).join('')
      : '<tr><td colspan="4" style="text-align:center;color:#6b7280;">No applications yet</td></tr>';
  } catch {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#ef4444;">Failed to load</td></tr>';
  }
}
