/**
 * create-grant.js — Multi-step grant creation / edit form
 *
 * PHP endpoints:
 *   POST /api/grants          body: JSON grant object → create
 *   GET  /api/grants/{id}     → prefill form when editing
 *   PUT  /api/grants/{id}     body: JSON grant object → update
 */

let currentStep  = 1;
const TOTAL_STEPS = 5;
let editId = null; // set when editing an existing grant

document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.requireAdmin()) return;

  // Check if editing an existing grant
  const params = new URLSearchParams(window.location.search);
  editId = params.get('id') || null;

  if (editId) {
    document.querySelector('.page-header h2').textContent  = 'Edit Grant Program';
    document.querySelector('.page-description').textContent = 'Update the details of this grant program';
    document.getElementById('publishBtn').innerHTML = '<i class="fas fa-save"></i> Save Changes';
    await prefillForm(editId);
  }

  bindNavButtons();
  bindPublishButton();
  showStep(1);
});

// ─── PREFILL FORM (edit mode) ──────────────────────────────
async function prefillForm(id) {
  try {
    const res = await API.get(`/grants/${id}`);
    const g   = res.data;

    setVal('grantTitle',          g.title);
    setVal('description',         g.description);
    setVal('category',            g.category);
    setVal('location', g.eligibility_location);
    setVal('totalBudget',         g.total_budget);
    setVal('maxPerApplicant',     g.max_per_applicant);
    setVal('minPerApplicant',     g.min_per_applicant);
    setVal('applicationDeadline', g.application_deadline?.split('T')[0]);
    setVal('reviewPeriod',        g.review_period?.split('T')[0]);
    setVal('disbursementDate',    g.disbursement_date?.split('T')[0]);
    setVal('announcementDate',    g.announcement_date?.split('T')[0]);

    // Tick requirement checkboxes
    if (Array.isArray(g.requirements)) {
      g.requirements.forEach(r => {
        const cb = document.querySelector(`.requirement-checkbox[value="${r}"]`);
        if (cb) cb.checked = true;
      });
    }
  } catch (err) {
    showAlert('Could not load grant data: ' + err.message, 'error');
  }
}

function setVal(id, val) {
  const el = document.getElementById(id);
  if (el && val != null) el.value = val;
}

// ─── STEP NAVIGATION ───────────────────────────────────────
function bindNavButtons() {
  document.getElementById('nextBtn')?.addEventListener('click', () => {
    if (validateCurrentStep()) goToStep(currentStep + 1);
  });
  document.getElementById('prevBtn')?.addEventListener('click', () => {
    goToStep(currentStep - 1);
  });

  // Step indicator clicks
  document.querySelectorAll('.step-item').forEach(item => {
    item.addEventListener('click', () => {
      const target = parseInt(item.dataset.step);
      if (target < currentStep) goToStep(target);
    });
  });
}

function goToStep(step) {
  if (step < 1 || step > TOTAL_STEPS) return;
  if (step === TOTAL_STEPS) populateReview();
  currentStep = step;
  showStep(step);
}

function showStep(step) {
  document.querySelectorAll('.form-step').forEach((el, i) => {
    el.classList.toggle('active', i + 1 === step);
  });
  document.querySelectorAll('.step-item').forEach((el, i) => {
    el.classList.toggle('active',    i + 1 === step);
    el.classList.toggle('completed', i + 1 < step);
  });

  const prevBtn    = document.getElementById('prevBtn');
  const nextBtn    = document.getElementById('nextBtn');
  const publishBtn = document.getElementById('publishBtn');

  if (prevBtn)    prevBtn.style.display    = step === 1 ? 'none' : '';
  if (nextBtn)    nextBtn.style.display    = step === TOTAL_STEPS ? 'none' : '';
  if (publishBtn) publishBtn.style.display = step === TOTAL_STEPS ? '' : 'none';
}

// ─── PER-STEP VALIDATION ───────────────────────────────────
function validateCurrentStep() {
  const step = document.getElementById(`step${currentStep}`);
  if (!step) return true;

  const inputs = step.querySelectorAll('[required]');
  let valid = true;

  inputs.forEach(input => {
    input.classList.remove('input-error');
    if (!input.value.trim()) {
      input.classList.add('input-error');
      valid = false;
    }
  });

  if (!valid) showAlert('Please fill in all required fields before continuing.', 'warning');
  return valid;
}

// ─── REVIEW SUMMARY ────────────────────────────────────────
function populateReview() {
  const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val || '—'; };

  setText('reviewTitle',          document.getElementById('grantTitle')?.value);
  setText('reviewCategory',       document.getElementById('category')?.value);
  setText('reviewDescription',    document.getElementById('description')?.value);
  setText('reviewTotalBudget',    formatCurrency(document.getElementById('totalBudget')?.value));
  setText('reviewMaxPerApplicant',formatCurrency(document.getElementById('maxPerApplicant')?.value));
  setText('reviewMinPerApplicant',formatCurrency(document.getElementById('minPerApplicant')?.value));
  setText('reviewLocation',       document.getElementById('location')?.value);
  setText('reviewDeadline',       formatDate(document.getElementById('applicationDeadline')?.value));
  setText('reviewReviewPeriod',   formatDate(document.getElementById('reviewPeriod')?.value));
  setText('reviewDisbursement',   formatDate(document.getElementById('disbursementDate')?.value));

  const reqList = document.getElementById('reviewRequirements');
  if (reqList) {
    const checked = [...document.querySelectorAll('.requirement-checkbox:checked')].map(cb =>
      `<li>${escapeHtml(cb.nextElementSibling?.textContent || cb.value)}</li>`
    );
    reqList.innerHTML = checked.length ? checked.join('') : '<li>None selected</li>';
  }
}

// ─── PUBLISH / SAVE ────────────────────────────────────────
function bindPublishButton() {
  const btn = document.getElementById('publishBtn');
  btn?.addEventListener('click', async () => {
    const payload = collectFormData();
    setLoading(btn, true, editId ? 'Saving...' : 'Publishing...');
    try {
      if (editId) {
        await API.put(`/grants/${editId}`, payload);
        showAlert('Grant updated successfully.', 'success');
      } else {
        await API.post('/grants', payload);
        showAlert('Grant published successfully.', 'success');
      }
      setTimeout(() => window.location.href = 'grants.html', 1200);
    } catch (err) {
      showAlert(err.message || 'Failed to save grant.', 'error');
      if (err.errors) showFieldErrors(err.errors);
      setLoading(btn, false);
    }
  });
}

function collectFormData() {
  return {
    title:                  document.getElementById('grantTitle')?.value.trim(),
    description:            document.getElementById('description')?.value.trim(),
    category:               document.getElementById('category')?.value,
    eligibility_location:   document.getElementById('location')?.value.trim(),
    total_budget:           parseFloat(document.getElementById('totalBudget')?.value) || 0,
    max_per_applicant:      parseFloat(document.getElementById('maxPerApplicant')?.value) || 0,
    min_per_applicant:      parseFloat(document.getElementById('minPerApplicant')?.value) || 0,
    application_deadline:   document.getElementById('applicationDeadline')?.value,
    review_period:          document.getElementById('reviewPeriod')?.value,
    disbursement_date:      document.getElementById('disbursementDate')?.value,
    announcement_date:      document.getElementById('announcementDate')?.value,
    requirements:           [...document.querySelectorAll('.requirement-checkbox:checked')].map(cb => cb.value),
    status:                 'active',
  };
}
