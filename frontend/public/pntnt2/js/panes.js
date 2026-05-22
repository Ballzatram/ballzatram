// js/panes.js — panes as anchors; hrefs fixed; respects veil persistence
const assets = {
  hymns:    'assets/pane_hymns.png',
  crusades: 'assets/pane_crusades.png',
  relics:   'assets/pane_relics.png',
};

(function mount(){
  const root = document.getElementById('layout');
  if (!root) return;

  // If the veil was already cleared once, start unlocked
  let startUnlocked = false;
  try { startUnlocked = (localStorage.getItem('veil:cleared') === '1'); } catch {}

  function pane(id, href, src, cls){
    const a = document.createElement('a');
    a.className = `pane ${cls}`;
    a.href = href;

    // lock state (a11y too)
    const locked = !startUnlocked;
    a.setAttribute('data-locked', locked ? '1' : '0');
    if (locked) {
      a.setAttribute('aria-disabled', 'true');
      a.setAttribute('tabindex', '-1');
    }

    const img = document.createElement('img');
    img.src = src;
    img.alt = id;
    img.loading = 'eager';
    a.appendChild(img);

    root.appendChild(a);
    return a;
  }

  // Create the three panes (relative links to your subpages)
  pane('hymns',    'hymns.html',    assets.hymns,    'pane--hymns');
  pane('crusades', 'crusades.html', assets.crusades, 'pane--crusades');
  pane('relics',   'relics.html',   assets.relics,   'pane--relics');
})();
