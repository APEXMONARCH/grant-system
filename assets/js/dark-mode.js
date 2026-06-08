/**
 * dark-mode.js — Dark Mode & Accessibility Features
 *
 * NEW FEATURE (Instruction item 16): Dark mode toggle, accessible navigation,
 * persists user preference to localStorage.
 *
 * Include this script on every page BEFORE the closing </body> tag,
 * after app.js:
 *   <script src="assets/js/dark-mode.js"></script>
 */

const DarkMode = (() => {
  const KEY      = 'gms_dark_mode';
  const ROOT     = document.documentElement;
  const DARK_CLS = 'dark-mode';

  // ── Initialise ────────────────────────────────────────────
  function init() {
    // Respect saved preference, otherwise follow OS preference
    const saved = localStorage.getItem(KEY);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const enabled = saved !== null ? saved === 'true' : prefersDark;
    apply(enabled, false);

    // Listen for OS-level changes if no explicit preference saved
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (localStorage.getItem(KEY) === null) apply(e.matches, false);
    });

    injectToggleButton();
  }

  // ── Apply mode ────────────────────────────────────────────
  function apply(enable, save = true) {
    ROOT.classList.toggle(DARK_CLS, enable);
    if (save) localStorage.setItem(KEY, String(enable));

    // Update any toggle button icon/aria-label
    document.querySelectorAll('[data-dark-toggle]').forEach(btn => {
      btn.setAttribute('aria-pressed', String(enable));
      btn.setAttribute('aria-label', enable ? 'Switch to light mode' : 'Switch to dark mode');
      const icon = btn.querySelector('i');
      if (icon) {
        icon.className = enable ? 'fas fa-sun' : 'fas fa-moon';
      }
    });
  }

  // ── Toggle ────────────────────────────────────────────────
  function toggle() {
    apply(!ROOT.classList.contains(DARK_CLS));
  }

  // ── Inject toggle button into topbar if not already present ─
  function injectToggleButton() {
    const topbarActions = document.querySelector('.topbar-actions');
    if (!topbarActions || topbarActions.querySelector('[data-dark-toggle]')) return;

    const btn = document.createElement('button');
    btn.className     = 'icon-btn';
    btn.dataset.darkToggle = '1';
    btn.title         = 'Toggle dark mode';
    const isDark      = ROOT.classList.contains(DARK_CLS);
    btn.setAttribute('aria-pressed', String(isDark));
    btn.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
    btn.innerHTML     = `<i class="${isDark ? 'fas fa-sun' : 'fas fa-moon'}"></i>`;
    btn.addEventListener('click', toggle);

    // Insert before the notification bell
    const bell = topbarActions.querySelector('#notificationBtn');
    if (bell) topbarActions.insertBefore(btn, bell);
    else      topbarActions.prepend(btn);
  }

  return { init, toggle, apply };
})();

document.addEventListener('DOMContentLoaded', () => DarkMode.init());
