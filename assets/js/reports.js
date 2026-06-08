/**
 * reports.js — Reports & Analytics page (reports.html)
 *
 * PHP endpoints:
 *   GET /api/reports/summary?dateRange=last30&grantType=all&status=all
 *       returns: { data: { total_funds, total_disbursed, beneficiaries, approval_rate,
 *                          avg_grant_size, avg_processing_time, success_rate, total_applications } }
 *
 *   GET /api/reports/funds-distribution?dateRange=last30
 *       returns: { data: { labels:[], disbursed:[], allocated:[] } }
 *
 *   GET /api/reports/allocation?dateRange=last30&grantType=all
 *       returns: { data: [{ label, value }] }
 *
 *   GET /api/reports/approval-rate?dateRange=last30
 *       returns: { data: { labels:[], rates:[] } }
 *
 *   GET /api/reports/top-grants?dateRange=last30&limit=5
 *       returns: { data: [{ title, disbursed, applicants }] }
 *
 *   GET /api/reports/export?dateRange=last30&grantType=all&status=all
 *       returns: PDF/CSV file stream
 */

let charts = {};

document.addEventListener('DOMContentLoaded', () => {
  if (!Auth.requireAdmin()) return;

  document.getElementById('applyFiltersBtn')?.addEventListener('click', loadAll);
  document.getElementById('exportReportBtn')?.addEventListener('click', exportReport);
  loadAll();
});

function getFilters() {
  return {
    dateRange: document.getElementById('dateRange')?.value  || 'last30',
    grantType: document.getElementById('grantType')?.value  || 'all',
    status:    document.getElementById('statusFilter')?.value || 'all',
  };
}

async function loadAll() {
  const btn = document.getElementById('applyFiltersBtn');
  setLoading(btn, true, 'Loading...');

  await Promise.all([
    loadSummary(),
    loadFundsChart(),
    loadAllocationChart(),
    loadApprovalChart(),
    loadTopGrants(),
  ]);

  setLoading(btn, false);
}

// ─── SUMMARY STATS ─────────────────────────────────────────
async function loadSummary() {
  try {
    const res = await API.get('/reports/summary', getFilters());
    const d   = res.data;
    setText('totalFunds',         formatCurrency(d.total_funds));
    setText('totalDisbursed',     formatCurrency(d.total_disbursed));
    setText('totalBeneficiaries', d.beneficiaries);
    setText('approvalRate',       d.approval_rate + '%');
    setText('avgGrantSize',       formatCurrency(d.avg_grant_size));
    setText('totalApplications',  d.total_applications);
  } catch (err) {
    showAlert('Summary load failed: ' + err.message, 'error');
  }
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el && val != null) el.textContent = val;
}

// ─── FUNDS DISTRIBUTION CHART ──────────────────────────────
async function loadFundsChart() {
  const canvas = document.getElementById('fundsDistributionChart');
  if (!canvas) return;
  try {
    const res  = await API.get('/reports/funds-distribution', { dateRange: getFilters().dateRange });
    const data = res.data;
    if (charts.funds) charts.funds.destroy();
    charts.funds = new Chart(canvas, {
      type: 'line',
      data: {
        labels: data.labels,
        datasets: [
          { label: 'Disbursed',  data: data.disbursed,  borderColor: '#1a56db', backgroundColor: 'rgba(26,86,219,.1)',  tension: 0.4, fill: true },
          { label: 'Allocated',  data: data.allocated,  borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,.1)', tension: 0.4, fill: true },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' } },
        scales: { y: { ticks: { callback: v => '$' + (v/1000).toFixed(0) + 'k' } } },
      },
    });
  } catch { /* skip chart on error */ }
}

// ─── ALLOCATION BY CATEGORY CHART ──────────────────────────
async function loadAllocationChart() {
  const canvas = document.getElementById('allocationChart');
  if (!canvas) return;
  try {
    const res  = await API.get('/reports/allocation', getFilters());
    const items = res.data || [];
    const COLOURS = ['#1a56db','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4'];

    if (charts.alloc) charts.alloc.destroy();
    charts.alloc = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: items.map(i => i.label),
        datasets: [{ data: items.map(i => i.value), backgroundColor: COLOURS, borderWidth: 2, borderColor: '#fff' }],
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } },
    });

    const legend = document.getElementById('allocationLegend');
    if (legend) {
      legend.innerHTML = items.map((item, idx) => `
        <span style="display:inline-flex;align-items:center;gap:5px;margin:4px 8px;font-size:.8rem;">
          <span style="width:10px;height:10px;border-radius:50%;background:${COLOURS[idx]};"></span>
          ${escapeHtml(item.label)} (${formatCurrency(item.value)})
        </span>`).join('');
    }
  } catch { /* skip */ }
}

// ─── APPROVAL RATE CHART ───────────────────────────────────
async function loadApprovalChart() {
  const canvas = document.getElementById('approvalRateChart');
  if (!canvas) return;
  try {
    const res  = await API.get('/reports/approval-rate', { dateRange: getFilters().dateRange });
    const data = res.data;
    if (charts.approval) charts.approval.destroy();
    charts.approval = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: data.labels,
        datasets: [{ label: 'Approval %', data: data.rates, backgroundColor: 'rgba(26,86,219,.7)', borderRadius: 4 }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { min: 0, max: 100, ticks: { callback: v => v + '%' } } },
      },
    });
  } catch { /* skip */ }
}

// ─── TOP GRANTS LIST ───────────────────────────────────────
async function loadTopGrants() {
  const el = document.getElementById('topGrants');
  if (!el) return;
  try {
    const res   = await API.get('/reports/top-grants', { dateRange: getFilters().dateRange, limit: 5 });
    const grants = res.data || [];
    el.innerHTML = grants.map((g, i) => `
      <div class="insight-item" style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid #f3f4f6;">
        <span class="rank" style="width:24px;height:24px;background:#e0e7ff;color:#1a56db;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:.8rem;flex-shrink:0;">${i+1}</span>
        <div class="insight-details" style="flex:1;">
          <strong style="font-size:.9rem;">${escapeHtml(g.title)}</strong>
          <span style="display:block;color:#6b7280;font-size:.8rem;">${formatCurrency(g.disbursed)} disbursed</span>
        </div>
        <span class="insight-value" style="color:#6b7280;font-size:.8rem;white-space:nowrap;">${g.applicants} applicants</span>
      </div>`).join('') || '<p style="color:#9ca3af;">No data</p>';
  } catch { /* skip */ }
}

// ─── EXPORT ────────────────────────────────────────────────
function exportReport() {
  const filters = getFilters();
  const qs = Object.entries(filters).map(([k,v]) => `${k}=${encodeURIComponent(v)}`).join('&');
  const url = `${API.BASE_URL}/reports/export?${qs}&token=${API.getToken()}`;
  const a   = document.createElement('a');
  a.href = url;
  a.download = `report-${filters.dateRange}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
