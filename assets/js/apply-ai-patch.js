/**
 * apply-ai-patch.js
 * Include on user-apply-grant.html AFTER user-dashboard.js and ai-check.js.
 * Injects the AI check results panel above the form actions.
 * Submit flow is handled by handleApplySubmit() in user-dashboard.js.
 */

document.addEventListener('DOMContentLoaded', injectAiPanel);

function injectAiPanel() {
  const actionsDiv = document.querySelector('.apply-form-actions') || document.querySelector('[class*="form-actions"]');
  if (!actionsDiv) return;
  const panel = document.createElement('div');
  panel.id    = 'aiCheckPanel';
  panel.style.display = 'none';
  panel.style.marginBottom = '16px';
  actionsDiv.parentNode.insertBefore(panel, actionsDiv);
}
