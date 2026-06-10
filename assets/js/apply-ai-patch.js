/**
 * apply-ai-patch.js
 * Include on user-apply-grant.html AFTER ai-check.js:
 *   <script src="assets/js/ai-check.js"></script>
 *   <script src="assets/js/apply-ai-patch.js"></script>
 *
 * Injects the AI check panel and intercepts the submit button
 * so the AI runs first before the form posts.
 */

document.addEventListener('DOMContentLoaded', () => {
  injectAiPanel();
  patchSubmit();
});

function injectAiPanel() {
  const actionsDiv = document.querySelector('.apply-form-actions') || document.querySelector('[class*="form-actions"]');
  if (!actionsDiv) return;
  const panel = document.createElement('div');
  panel.id    = 'aiCheckPanel';
  panel.style.display = 'none';
  panel.style.marginBottom = '16px';
  actionsDiv.parentNode.insertBefore(panel, actionsDiv);
}

function patchSubmit() {
  const btn = document.getElementById('submitApplicationBtn');
  if (!btn) return;

  btn.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopImmediatePropagation();

    const formData = {
      grant_id:          document.getElementById('selectedGrantId')?.value || document.querySelector('[name="grant_id"]')?.value || '',
      full_name:         document.getElementById('appFullName')?.value     || document.querySelector('[name="full_name"]')?.value || '',
      email:             document.getElementById('appEmail')?.value        || document.querySelector('[name="email"]')?.value || '',
      research_title:    document.getElementById('researchTitle')?.value   || '',
      objectives:        document.getElementById('objectives')?.value      || '',
      methodology:       document.getElementById('methodology')?.value     || '',
      digital_signature: document.getElementById('digitalSignature')?.value || document.querySelector('[name="digital_signature"]')?.value || '',
      budget_items:      collectBudget(),
    };

    const ok = await AiCheck.run(formData);
    if (ok) {
      // Dispatch a custom event so the original submit handler can proceed
      btn.dispatchEvent(new CustomEvent('aicheck:passed', { bubbles: true }));
      // Also directly call submitApplication if it exists in scope
      if (typeof submitApplication === 'function') {
        submitApplication(new Event('submit'));
      }
    }
  }, true);
}

function collectBudget() {
  const items = [];
  document.querySelectorAll('.budget-row, [data-budget-row]').forEach(row => {
    const item = row.querySelector('[name="budgetItem"], .budget-item')?.value || '';
    const desc = row.querySelector('[name="budgetDescription"], .budget-desc')?.value || '';
    const cost = parseFloat(row.querySelector('[name="budgetCost"], .budget-cost')?.value || 0);
    if (item) items.push({ item, description: desc, cost });
  });
  return items;
}
