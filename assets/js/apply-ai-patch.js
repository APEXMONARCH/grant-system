/**
 * apply-ai-patch.js — Patches user-apply-grant to use AI Check on step 6
 *
 * Include AFTER user-dashboard.js and ai-check.js on user-apply-grant.html:
 *   <script src="assets/js/ai-check.js"></script>
 *   <script src="assets/js/apply-ai-patch.js"></script>
 *
 * This file is intentionally separate so the core user-dashboard.js
 * doesn't need to be modified — it hooks in via event listeners.
 */

document.addEventListener('DOMContentLoaded', () => {
  injectAiCheckPanel();
  patchSubmitButton();
});

function injectAiCheckPanel() {
  // Insert the AI check panel just before the form action buttons in step 6
  const step6 = document.querySelector('[data-step="6"]');
  if (!step6) return;

  const actionsDiv = document.querySelector('.apply-form-actions');
  if (!actionsDiv) return;

  const panel = document.createElement('div');
  panel.id    = 'aiCheckPanel';
  panel.style.display = 'none';
  actionsDiv.parentNode.insertBefore(panel, actionsDiv);
}

function patchSubmitButton() {
  const submitBtn = document.getElementById('submitApplicationBtn');
  if (!submitBtn) return;

  // Intercept the submit click to run AI check first
  submitBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopImmediatePropagation();

    // Gather form fields for AI check
    const formData = {
      grant_id:         document.getElementById('selectedGrantId')?.value  || '',
      full_name:        document.getElementById('fullName')?.value         || '',
      email:            document.getElementById('applicantEmail')?.value   || '',
      research_title:   document.getElementById('researchTitle')?.value    || '',
      objectives:       document.getElementById('objectives')?.value       || '',
      methodology:      document.getElementById('methodology')?.value      || '',
      digital_signature:document.getElementById('digitalSignature')?.value || '',
      budget_items:     collectBudgetItems(),
    };

    const panel = document.getElementById('aiCheckPanel');
    if (panel) panel.style.display = 'block';

    // Scroll to panel so user sees the result
    panel?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    const ok = await AiCheck.run(formData);

    if (ok) {
      // Re-trigger the original form submission handler
      const form = submitBtn.closest('form');
      if (form) {
        const customEvent = new CustomEvent('aicheck:passed', { bubbles: true });
        form.dispatchEvent(customEvent);
      }
    }
  }, true); // capture phase so it runs before existing listeners
}

function collectBudgetItems() {
  const rows = document.querySelectorAll('.budget-row');
  const items = [];
  rows.forEach(row => {
    const item = row.querySelector('[name="budgetItem"]')?.value        || '';
    const desc = row.querySelector('[name="budgetDescription"]')?.value || '';
    const cost = row.querySelector('[name="budgetCost"]')?.value        || 0;
    if (item) items.push({ item, description: desc, cost: parseFloat(cost) || 0 });
  });
  return items;
}
