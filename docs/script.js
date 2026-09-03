(() => {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Mobile nav
  const burger = document.getElementById('navBurger');
  const navMobile = document.getElementById('navMobile');

  burger.addEventListener('click', () => {
    const open = navMobile.classList.toggle('open');
    burger.classList.toggle('active');
    burger.setAttribute('aria-expanded', open);
  });

  navMobile.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      navMobile.classList.remove('open');
      burger.classList.remove('active');
    });
  });

  // Scroll-reveal
  if (!reducedMotion) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          observer.unobserve(e.target);
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.feature-card, .how-step, .proof-stat, .show-row').forEach(el => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(16px)';
      el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
      observer.observe(el);
    });

    // Style for .visible
    const style = document.createElement('style');
    style.textContent = '.visible{opacity:1!important;transform:none!important}';
    document.head.appendChild(style);
  }
})();
