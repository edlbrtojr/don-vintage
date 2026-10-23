/* Movimento compartilhado: revelação no scroll, contagem de números e vibração curta.
   Carregar depois de data.js. Tudo respeita prefers-reduced-motion. */
(function () {
  document.documentElement.classList.add('js');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* [data-reveal]: entra com fade + subida quando 15% do elemento aparece.
     Irmãos com data-reveal ganham --i automático (máx. 6) para escalonar sem passar de ~420ms. */
  function reveal(root) {
    const els = [...(root || document).querySelectorAll('[data-reveal]:not(.is-in)')];
    if (!els.length) return;
    const groups = new Map();
    els.forEach(el => {
      const p = el.parentElement;
      const n = groups.get(p) || 0;
      if (!el.style.getPropertyValue('--i')) el.style.setProperty('--i', Math.min(n, 6));
      groups.set(p, n + 1);
    });
    if (reduce.matches || !('IntersectionObserver' in window)) { els.forEach(el => el.classList.add('is-in')); return; }
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
    els.forEach(el => io.observe(el));
  }

  /* Conta de `from` até `to` em ~600ms com ease-out-expo. fmt formata o valor a cada frame. */
  function countUp(el, to, fmt, from) {
    const start = from == null ? (+el.dataset.v || 0) : from;
    el.dataset.v = to;
    if (reduce.matches || start === to) { el.textContent = fmt(to); return; }
    cancelAnimationFrame(el._raf);
    const t0 = performance.now(), dur = 600;
    const ease = t => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));
    const step = now => {
      const t = Math.min(1, (now - t0) / dur);
      el.textContent = fmt(start + (to - start) * ease(t));
      if (t < 1) el._raf = requestAnimationFrame(step);
    };
    el._raf = requestAnimationFrame(step);
  }

  // Vibração só depois de um toque real; navegadores bloqueiam (e logam erro) antes disso.
  let touched = false;
  window.addEventListener('pointerdown', () => { touched = true; }, { once: true, capture: true });
  function haptic(ms) { if (touched && navigator.vibrate && !reduce.matches) navigator.vibrate(ms || 10); }

  window.DV = window.DV || {};
  DV.motion = { reveal, countUp, haptic, reduced: () => reduce.matches };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => reveal());
  else reveal();
})();
