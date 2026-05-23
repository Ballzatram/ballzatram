// js/veil.js — simple global-clear veil (80%), no per-pane click-through
(() => {
  const stage = document.getElementById('stage');
  const page  = document.getElementById('page');
  const veil  = document.getElementById('veil');
  const veilHint = document.getElementById('veil-hint');
  if (!stage || !page || !veil) return;

  const ctx = veil.getContext('2d', { willReadFrequently: true });

  // ----- Config (global-only gating) -----
  const GLOBAL_DONE = 0.80;          // ~80% cleared retires the veil
  const LS_CLEARED  = 'veil:cleared';

  // Dev overrides (index.html?veil=reset or ?veil=show)
  const params = new URLSearchParams(location.search);
  const forceReset = params.get('veil') === 'reset';
  const forceShow  = params.get('veil') === 'show';
  try { if (forceReset) localStorage.removeItem(LS_CLEARED); } catch {}

  // Brush
  const isTouch = matchMedia('(pointer: coarse)').matches;
  const BRUSH_RADIUS = isTouch ? 70 : 45;
  const STAMP_STEP   = BRUSH_RADIUS * 0.6;

  // Optional dev helper
  let autoReveal = false;

  // Texture
  const parchment = new Image();
  parchment.src = 'assets/parchment.png';

  // ---- Utilities ----
  function fitCanvasToPage() {
    const rect = page.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    if (veil.width !== w || veil.height !== h) {
      veil.width = w; veil.height = h;
    }
  }

  function paintVeil() {
    ctx.clearRect(0, 0, veil.width, veil.height);
    const w = veil.width, h = veil.height;
    if (parchment.complete && parchment.naturalWidth) {
      const iw = parchment.naturalWidth, ih = parchment.naturalHeight;
      const scale = Math.max(w/iw, h/ih);
      const dw = iw*scale, dh = ih*scale;
      const dx = (w - dw) / 2, dy = (h - dh) / 2;
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(parchment, dx, dy, dw, dh);
    } else {
      ctx.fillStyle = '#e8d4ac';
      ctx.fillRect(0, 0, w, h);
    }
  }

  // Soft radial eraser
  function stamp(x, y) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, BRUSH_RADIUS);
    g.addColorStop(0.0, 'rgba(0,0,0,1.0)');
    g.addColorStop(0.7, 'rgba(0,0,0,0.35)');
    g.addColorStop(1.0, 'rgba(0,0,0,0.0)');
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, BRUSH_RADIUS, 0, Math.PI*2);
    ctx.fill();
  }

  // Pointer helpers
  let isDown = false, lastX = null, lastY = null;
  function canvasPoint(evt) {
    const rect = veil.getBoundingClientRect();
    const t = evt.touches && evt.touches[0];
    const clientX = t ? t.clientX : evt.clientX;
    const clientY = t ? t.clientY : evt.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top, clientX, clientY };
  }
  function onDown(evt) {
    if (veil.classList.contains('is-done')) return;
    isDown = true;
    const { x, y } = canvasPoint(evt);
    lastX = x; lastY = y;
    stamp(x, y);
    maybeCheck();
  }
  function onMove(evt) {
    if (!isDown || veil.classList.contains('is-done')) return;
    const { x, y } = canvasPoint(evt);
    const dx = x - lastX, dy = y - lastY;
    const dist = Math.hypot(dx, dy);
    const steps = Math.max(1, Math.floor(dist / STAMP_STEP));
    for (let i = 1; i <= steps; i++) {
      const px = lastX + (dx * i / steps);
      const py = lastY + (dy * i / steps);
      stamp(px, py);
    }
    lastX = x; lastY = y;
    maybeCheck();
  }
  function onUp() { isDown = false; lastX = lastY = null; }

  // Global reveal ratio only
  function revealedRatio(sampleStep = 6) {
    const { width:w, height:h } = veil;
    const data = ctx.getImageData(0,0,w,h).data;
    let total = 0, cleared = 0;
    for (let y = 0; y < h; y += sampleStep) {
      for (let x = 0; x < w; x += sampleStep) {
        const a = data[((y*w)+x)*4 + 3];
        total++;
        if (a < 8) cleared++;
      }
    }
    return cleared / Math.max(1,total);
  }

  // Lock/unlock helpers (supports pane as <a> or pane containing <a>)
  function setLockedAll(locked) {
    document.querySelectorAll('.pane').forEach(p => {
      p.setAttribute('data-locked', locked ? '1' : '0');
      const link = p.matches('a.pane') ? p : p.querySelector('a');
      if (link) {
        if (locked) { link.setAttribute('aria-disabled','true'); link.setAttribute('tabindex','-1'); }
        else { link.removeAttribute('aria-disabled'); link.removeAttribute('tabindex'); }
      }
    });
  }

  function retireVeil() {
    if (veilHint) veilHint.textContent = 'The path is open.';
    setLockedAll(false);
    veil.classList.add('is-done');
    veil.style.cursor = 'auto';
    try { localStorage.setItem(LS_CLEARED, '1'); } catch {}
  }

  let checkRAF = 0;
  function maybeCheck() {
    if (checkRAF) return;
    checkRAF = requestAnimationFrame(() => {
      checkRAF = 0;
      const global = revealedRatio(6);
      if (global >= GLOBAL_DONE) retireVeil();
    });
  }

  // Observe layout: if veil already cleared, unlock panes once they mount
  const layout = document.getElementById('layout');
  if (layout) {
    const mo = new MutationObserver(() => {
      if (localStorage.getItem(LS_CLEARED) === '1') setLockedAll(false);
    });
    mo.observe(layout, { childList: true, subtree: true });
  }

  // ----- Init -----
  fitCanvasToPage();

  // If previously cleared (and not force-show), unlock & hide veil immediately
  let alreadyCleared = false;
  try { alreadyCleared = (localStorage.getItem(LS_CLEARED) === '1'); } catch {}
  if (alreadyCleared && !forceShow) {
    setLockedAll(false);
    veil.classList.add('is-done');
    veil.style.cursor = 'auto';
    if (veilHint) veilHint.textContent = 'The manuscript remembers.';
    return;
  }

  // Start with panes locked while veil is visible
  setLockedAll(true);

  parchment.decode?.().catch(()=>{}).finally(() => {
    paintVeil();
    // No per-pane checks — just global threshold
  });

  // Keep veil aligned on resize
  window.addEventListener('resize', () => {
    const wasDone = veil.classList.contains('is-done');
    fitCanvasToPage();
    paintVeil();
    if (wasDone) veil.classList.add('is-done');
  });

  // Pointer events
  veil.addEventListener('mousedown', onDown);
  veil.addEventListener('mousemove', onMove);
  veil.addEventListener('mouseup', onUp);
  veil.addEventListener('mouseleave', onUp);
  veil.addEventListener('touchstart', (e) => { e.preventDefault(); onDown(e); }, { passive:false });
  veil.addEventListener('touchmove',  (e) => { e.preventDefault(); onMove(e); }, { passive:false });

  // (Optional) dev: hold Space to auto-reveal quickly
  function tickAutoReveal() {
    if (!autoReveal || veil.classList.contains('is-done')) return;
    const w = veil.width, h = veil.height;
    for (let y = BRUSH_RADIUS; y < h; y += BRUSH_RADIUS * 1.2) {
      for (let x = BRUSH_RADIUS; x < w; x += BRUSH_RADIUS * 1.2) {
        stamp(x, y);
      }
    }
    maybeCheck();
    requestAnimationFrame(tickAutoReveal);
  }
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') { autoReveal = true; tickAutoReveal(); }
  });
  window.addEventListener('keyup', (e) => {
    if (e.code === 'Space') { autoReveal = false; }
  });
})();
