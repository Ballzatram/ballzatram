/* Shared navigation. Resolve from this script so nested pages and project Pages work. */
(() => {
  const source = document.currentScript;
  if (!source) return;
  const base = new URL('../../', source.src);
  const url = path => new URL(path, base).href;
  const icon = name => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('icon95');
    svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS(svg.namespaceURI, 'use');
    use.setAttribute('href', url(`assets/win95/icons.svg#${name}`));
    svg.append(use);
    return svg;
  };
  const link = (text, path) => {
    const a = document.createElement('a');
    a.textContent = text;
    a.href = url(path);
    return a;
  };
  document.body.classList.add('has-desktop95');
  if (!document.querySelector('.desktop95, .directory95')) {
    const bar = document.createElement('nav');
    bar.className = 'site-bar95';
    bar.setAttribute('aria-label', 'Ballzatram desktop');
    const brand = document.createElement('strong');
    brand.append(link('Ballzatram 95', 'index.html'));
    bar.append(brand, link('All programs', 'tools/index.html'), link('Econ Arcade', 'econ-arcade/index.html'), link('Portfolio', 'devin/'));
    document.body.prepend(bar);
  }

  const taskbar = document.createElement('nav');
  taskbar.className = 'taskbar95';
  taskbar.setAttribute('aria-label', 'Desktop taskbar');
  const start = document.createElement('button');
  start.className = 'btn95 start95';
  start.type = 'button';
  start.setAttribute('aria-expanded', 'false');
  start.setAttribute('aria-controls', 'start-menu95');
  start.append(icon('computer'), document.createTextNode('Start'));
  const current = link(document.title.split('|')[0].trim(), 'index.html');
  current.className = 'btn95 task95';
  current.title = 'Return to desktop';
  const tray = document.createElement('div');
  tray.className = 'tray95';
  const label = document.createElement('span');
  label.className = 'tray-label95';
  label.textContent = 'Ballzatram 95';
  const clock = document.createElement('time');
  const tick = () => {
    const now = new Date();
    clock.dateTime = now.toISOString();
    clock.textContent = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };
  tick();
  const timer = setInterval(tick, 60000);
  addEventListener('pagehide', () => clearInterval(timer), { once: true });
  tray.append(label, clock);
  taskbar.append(start, current, tray);
  const menu = document.createElement('nav');
  menu.id = 'start-menu95';
  menu.className = 'start-menu95';
  menu.setAttribute('aria-label', 'Start menu');
  menu.hidden = true;
  for (const [text, path, name] of [
    ['Desktop', 'index.html', 'computer'], ['All programs', 'tools/index.html', 'folder'],
    ['Econ Arcade', 'econ-arcade/index.html', 'game'], ['Portfolio Lab', 'tools/portfolio/index.html', 'chart'],
    ['About Devin', 'devin/', 'person'], ['Community', 'community.html', 'book']
  ]) {
    const a = link(text, path);
    a.prepend(icon(name));
    menu.append(a);
  }
  function toggle(open, focus = false) {
    menu.hidden = !open;
    start.setAttribute('aria-expanded', String(open));
    if (focus) (open ? menu.querySelector('a') : start).focus();
  }
  start.addEventListener('click', () => toggle(menu.hidden));
  start.addEventListener('keydown', event => {
    if (event.key === 'ArrowDown') { event.preventDefault(); toggle(true, true); }
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !menu.hidden) toggle(false, true);
  });
  document.addEventListener('click', event => {
    if (!menu.contains(event.target) && !start.contains(event.target)) toggle(false);
  });
  document.addEventListener('focusin', event => {
    if (!menu.contains(event.target) && !start.contains(event.target)) toggle(false);
  });
  document.body.append(taskbar, menu);
})();
