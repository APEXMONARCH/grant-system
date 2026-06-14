/**
 * landing.js — Public landing page interactions
 */

document.addEventListener('DOMContentLoaded', () => {
  // Redirect logged-in users straight to their portal
  if (typeof Auth !== 'undefined' && Auth.isLoggedIn()) {
    window.location.href = Auth.isAdmin() ? 'admin-dashboard.html' : 'user-index.html';
    return;
  }

  // Sticky nav shadow on scroll
  const nav = document.getElementById('landingNav');
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 10);
  }, { passive: true });

  // Mobile menu toggle
  const menuToggle = document.getElementById('menuToggle');
  const navLinks   = document.getElementById('navLinks');
  const navActions = document.querySelector('.landing-nav-actions');

  if (menuToggle) {
    menuToggle.addEventListener('click', () => {
      navLinks.classList.toggle('open');
      navActions.classList.toggle('open');
      const icon = menuToggle.querySelector('i');
      const open = navLinks.classList.contains('open');
      icon.classList.toggle('fa-bars', !open);
      icon.classList.toggle('fa-xmark', open);
    });
  }

  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const target = document.querySelector(link.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      navLinks.classList.remove('open');
      navActions.classList.remove('open');
    });
  });
});
