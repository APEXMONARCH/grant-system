/**
 * ai-check.js — AI Application Completeness Checker
 *
 * NEW FEATURE (Instruction item 1): Uses the /api/applications/ai-check
 * endpoint to validate the application before the user submits.
 *
 * Usage: include on user-apply-grant.html after api.js and auth.js.
 * Call AiCheck.run(formData) on step 6 (Review) or on final submit attempt.
 *
 *   <script src="assets/js/ai-check.js"></script>
 */

const AiCheck = (() => {

  // ── Run a completeness check against the backend ─────────
  async function run(formData) {
    const panel = document.getElementById('aiCheckPanel');
    if (!panel) return true; // panel not present — skip silently

    panel.innerHTML = `
      <div class="ai-check-loading">
        <i class="fas fa-robot fa-spin"></i>
        <span>AI is reviewing your application for completeness…</span>
      </div>`;
    panel.style.display = 'block';

    try {
      const res = await API.post('/applications/ai-check', formData);
      const { score, complete, issues, summary } = res.data;
      renderResult(panel, score, complete, issues, summary);
      return complete;
    } catch (err) {
      panel.innerHTML = `<p class="ai-check-warning"><i class="fas fa-exclamation-circle"></i>
        AI check unavailable — please review your application manually before submitting.</p>`;
      return true; // don't block submission if AI check itself fails
    }
  }

  // ── Render the check result ───────────────────────────────
  function renderResult(panel, score, complete, issues, summary) {
    const scoreColor = score >= 90 ? '#10b981' : score >= 70 ? '#f59e0b' : '#ef4444';
    const icon       = score >= 90 ? 'fa-check-circle' : score >= 70 ? 'fa-exclamation-circle' : 'fa-times-circle';

    const issueHtml = issues.length === 0
      ? '<p style="color:#10b981;margin:0;"><i class="fas fa-check"></i> No issues found.</p>'
      : issues.map(i => `
          <div class="ai-issue ai-issue-${i.severity}">
            <i class="fas ${i.severity === 'error' ? 'fa-times-circle' : 'fa-exclamation-triangle'}"></i>
            <span>${escapeHtml(i.message)}</span>
          </div>`).join('');

    panel.innerHTML = `
      <div class="ai-check-result">
        <div class="ai-check-header">
          <i class="fas fa-robot"></i>
          <strong>AI Completeness Check</strong>
        </div>
        <div class="ai-score-row">
          <div class="ai-score-circle" style="border-color:${scoreColor};color:${scoreColor};">
            <span class="ai-score-number">${score}</span>
            <span class="ai-score-label">/ 100</span>
          </div>
          <div>
            <p class="ai-summary"><i class="fas ${icon}" style="color:${scoreColor};"></i> ${escapeHtml(summary)}</p>
          </div>
        </div>
        <div class="ai-issues">${issueHtml}</div>
        ${!complete ? '<p class="ai-block-note"><i class="fas fa-info-circle"></i> Please fix the errors above before submitting.</p>' : ''}
      </div>`;
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  return { run };
})();

// ── CSS injected at runtime (avoids a separate file dependency) ──
(function injectStyles() {
  const style = document.createElement('style');
  style.textContent = `
    #aiCheckPanel { margin: 16px 0; border-radius: 10px; overflow: hidden; }
    .ai-check-loading { display:flex;align-items:center;gap:10px;padding:16px;background:#f0f4ff;border-radius:10px;color:#1a56db; }
    .ai-check-result { background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:20px; }
    .ai-check-header { display:flex;align-items:center;gap:8px;margin-bottom:12px;font-size:.95rem;color:#374151; }
    .ai-score-row { display:flex;align-items:center;gap:16px;margin-bottom:12px; }
    .ai-score-circle { width:64px;height:64px;border-radius:50%;border:4px solid;display:flex;flex-direction:column;align-items:center;justify-content:center;flex-shrink:0; }
    .ai-score-number { font-size:1.4rem;font-weight:700;line-height:1; }
    .ai-score-label { font-size:.65rem;color:#9ca3af; }
    .ai-summary { margin:0;font-size:.9rem;color:#374151; }
    .ai-issues { display:flex;flex-direction:column;gap:6px;margin-top:10px; }
    .ai-issue { display:flex;align-items:flex-start;gap:8px;padding:8px 10px;border-radius:6px;font-size:.85rem; }
    .ai-issue-error { background:#fef2f2;color:#991b1b; }
    .ai-issue-warning { background:#fffbeb;color:#92400e; }
    .ai-block-note { margin:12px 0 0;font-size:.83rem;color:#6b7280; }
    .ai-check-warning { padding:12px 16px;background:#fffbeb;border-radius:8px;color:#92400e;font-size:.875rem;margin:0; }
    :root.dark-mode .ai-check-result { background:#252b3b;border-color:#3a4160; }
    :root.dark-mode .ai-check-loading { background:#2d3448;color:#93c5fd; }
    :root.dark-mode .ai-issue-error { background:rgba(239,68,68,.15); }
    :root.dark-mode .ai-issue-warning { background:rgba(245,158,11,.15); }
  `;
  document.head.appendChild(style);
})();
