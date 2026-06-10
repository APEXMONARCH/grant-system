/**
 * ai-check.js
 * Include on user-apply-grant.html AFTER user-dashboard.js:
 *   <script src="assets/js/ai-check.js"></script>
 *   <script src="assets/js/apply-ai-patch.js"></script>
 */

const AiCheck = (() => {

  async function run(formData) {
    const panel = document.getElementById('aiCheckPanel');
    if (!panel) return true;

    panel.style.display = 'block';
    panel.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;padding:16px;background:#f0f4ff;border-radius:10px;color:#1a56db;">
        <i class="fas fa-robot fa-spin"></i>
        <span>AI is reviewing your application for completeness…</span>
      </div>`;
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    try {
      const res = await API.post('/applications/ai-check', formData);
      const { score, complete, issues, summary } = res.data;
      renderResult(panel, score, complete, issues, summary);
      return complete;
    } catch {
      panel.innerHTML = `
        <div style="padding:12px 16px;background:#fffbeb;border-radius:8px;color:#92400e;">
          <i class="fas fa-exclamation-circle"></i>
          AI check unavailable — please review your application manually before submitting.
        </div>`;
      return true;
    }
  }

  function renderResult(panel, score, complete, issues, summary) {
    const color = score >= 90 ? '#10b981' : score >= 70 ? '#f59e0b' : '#ef4444';
    const icon  = score >= 90 ? 'fa-check-circle' : score >= 70 ? 'fa-exclamation-circle' : 'fa-times-circle';
    const issueHtml = issues.length === 0
      ? '<p style="color:#10b981;margin:8px 0 0;"><i class="fas fa-check"></i> No issues found.</p>'
      : issues.map(i => `
          <div style="display:flex;align-items:flex-start;gap:8px;padding:7px 10px;border-radius:6px;font-size:.85rem;margin-top:6px;
            background:${i.severity==='error'?'#fef2f2':'#fffbeb'};color:${i.severity==='error'?'#991b1b':'#92400e'};">
            <i class="fas ${i.severity==='error'?'fa-times-circle':'fa-exclamation-triangle'}" style="margin-top:2px;flex-shrink:0;"></i>
            <span>${escHtml(i.message)}</span>
          </div>`).join('');

    panel.innerHTML = `
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:20px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;font-weight:600;">
          <i class="fas fa-robot" style="color:#1a56db;"></i> AI Completeness Check
        </div>
        <div style="display:flex;align-items:center;gap:16px;margin-bottom:12px;">
          <div style="width:64px;height:64px;border-radius:50%;border:4px solid ${color};display:flex;flex-direction:column;align-items:center;justify-content:center;flex-shrink:0;">
            <span style="font-size:1.4rem;font-weight:700;color:${color};line-height:1;">${score}</span>
            <span style="font-size:.65rem;color:#9ca3af;">/100</span>
          </div>
          <p style="margin:0;font-size:.9rem;"><i class="fas ${icon}" style="color:${color};margin-right:6px;"></i>${escHtml(summary)}</p>
        </div>
        ${issueHtml}
        ${!complete ? '<p style="margin:12px 0 0;font-size:.82rem;color:#6b7280;"><i class="fas fa-info-circle"></i> Please fix the errors above before submitting.</p>' : ''}
      </div>`;
  }

  function escHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  return { run };
})();
