/* Scroll only drives a decorative scene. Native page scrolling and links always work. */
(() => {
  const ride = document.querySelector('.frontier-ride');
  if (!ride || !('requestAnimationFrame' in window)) return;
  const signs = [...ride.querySelectorAll('.ride-sign')];
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  let active = false;
  let queued = false;

  function update() {
    queued = false;
    if (!active) return;
    const rect = ride.getBoundingClientRect();
    const distance = Math.max(1, rect.height - window.innerHeight);
    const progress = Math.max(0, Math.min(1, -rect.top / distance));
    ride.style.setProperty('--ride-progress', progress.toFixed(4));
    ride.classList.toggle('is-riding', progress > 0.025 && progress < .98 && rect.bottom > 0 && rect.top < innerHeight);
    signs.forEach(sign => {
      const start = Number(sign.dataset.start);
      const end = Number(sign.dataset.end);
      const visible = progress >= start && progress < end;
      sign.classList.toggle('is-current', visible);
      sign.inert = !visible;
    });
  }

  function onScroll() {
    if (!queued) {
      queued = true;
      requestAnimationFrame(update);
    }
  }

  function configure() {
    active = !preference.matches;
    ride.classList.toggle('has-ride-motion', active);
    ride.classList.remove('is-riding');
    if (active) {
      onScroll();
    } else {
      ride.style.removeProperty('--ride-progress');
      signs.forEach(sign => {
        sign.inert = false;
        sign.classList.remove('is-current');
      });
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  preference.addEventListener?.('change', configure);
  configure();
})();