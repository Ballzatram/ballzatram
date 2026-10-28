/* Scroll animates the scenery only; links, native scrolling and reduced-motion fallback remain usable. */
(() => {
  const ride = document.querySelector('.frontier-ride');
  if (!ride || !('requestAnimationFrame' in window)) return;

  const signs = [...ride.querySelectorAll('.ride-sign')];
  const preference = window.matchMedia?.('(prefers-reduced-motion: reduce)') ??
    { matches: true, addEventListener() {} };
  let active = false;
  let queued = false;

  const clamp = value => Math.max(0, Math.min(1, value));
  const ease = value => {
    const t = clamp(value);
    return t * t * (3 - 2 * t);
  };

  function moveSign(sign, progress) {
    const start = Number(sign.dataset.start);
    const end = Number(sign.dataset.end);
    const visible = progress >= start && progress < end;
    // Each sign gets a short entrance, a reading moment and a clear departure.
    // The long stretches between windows are intentionally empty.
    const phase = clamp((progress - start) / (end - start));
    const enter = ease(phase / .23);
    const leave = ease((1 - phase) / .23);
    const opacity = Math.min(enter, leave);
    const offset = phase < .23 ? 76 * (1 - enter) :
      phase > .77 ? -115 * (1 - leave) : 0;

    sign.style.setProperty('--sign-shift', `${offset.toFixed(2)}vw`);
    sign.style.setProperty('--sign-opacity', opacity.toFixed(3));
    sign.classList.toggle('is-current', visible);
    sign.inert = !visible;
  }

  function update() {
    queued = false;
    if (!active) return;
    const rect = ride.getBoundingClientRect();
    const distance = Math.max(1, rect.height - window.innerHeight);
    const progress = clamp(-rect.top / distance);
    ride.style.setProperty('--ride-progress', progress.toFixed(4));
    ride.classList.toggle(
      'is-riding',
      progress > .025 && progress < .98 &&
        rect.bottom > 0 && rect.top < window.innerHeight
    );
    signs.forEach(sign => moveSign(sign, progress));
  }

  function onScroll() {
    if (active && !queued) {
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
        sign.style.removeProperty('--sign-shift');
        sign.style.removeProperty('--sign-opacity');
      });
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  preference.addEventListener?.('change', configure);
  configure();
})();
