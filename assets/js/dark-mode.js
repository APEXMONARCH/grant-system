/**
 * dark-mode.js
 * Add <script src="assets/js/dark-mode.js"></script> before </body> on every HTML page.
 */

const DarkMode = (() => {
  const KEY      = 'gms_dark_mode';
  const ROOT     = document.documentElement;
  const DARK_CLS = 'dark-mode';

  function init() {
    const saved      = localStorage.getItem(KEY);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const enabled    = saved !== null ? saved === 'true' : prefersDark;
    apply(enabled, false);

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
      if (localStorage.getItem(KEY) === null) apply(e.matches, false);
    });

    // Wait for DOM then inject button
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', injectButton);
    } else {
      injectButton();
    }
  }

  function apply(enable, save = true) {
    ROOT.classList.toggle(DARK_CLS, enable);
    if (save) localStorage.setItem(KEY, String(enable));
    document.querySelectorAll('[data-dark-toggle]').forEach(btn => {
      btn.setAttribute('aria-pressed', String(enable));
      btn.setAttribute('aria-label', enable ? 'Switch to light mode' : 'Switch to dark mode');
      const icon = btn.querySelector('i');
      if (icon) icon.className = enable ? 'fas fa-sun' : 'fas fa-moon';
    });
  }

  function toggle() { apply(!ROOT.classList.contains(DARK_CLS)); }

  function injectButton() {
    const topbarActions = document.querySelector('.topbar-actions');
    if (!topbarActions || topbarActions.querySelector('[data-dark-toggle]')) return;

    const btn           = document.createElement('button');
    btn.className       = 'icon-btn';
    btn.dataset.darkToggle = '1';
    btn.title           = 'Toggle dark mode';
    const isDark        = ROOT.classList.contains(DARK_CLS);
    btn.setAttribute('aria-pressed', String(isDark));
    btn.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
    btn.style.cssText   = 'background:none;border:none;cursor:pointer;padding:6px 8px;border-radius:8px;color:inherit;font-size:1rem;';
    btn.innerHTML       = `<i class="${isDark ? 'fas fa-sun' : 'fas fa-moon'}"></i>`;
    btn.addEventListener('click', toggle);

    const bell = topbarActions.querySelector('#notificationBtn');
    if (bell) topbarActions.insertBefore(btn, bell);
    else      topbarActions.prepend(btn);
  }

  return { init, toggle, apply };
})();

DarkMode.init();
