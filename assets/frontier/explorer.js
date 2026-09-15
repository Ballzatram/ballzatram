/* Real links first. Search, filters, and optional ambient motion enhance the homepage. */
(() => {
  const root = document.querySelector('.frontier-home');
  const search = document.getElementById('program-search');
  if (!root || !search) return;
  const cards = [...root.querySelectorAll('.frontier-program')];
  const filters = [...root.querySelectorAll('[data-filter]')];
  const empty = document.getElementById('no-programs');
  const countLabel = document.getElementById('program-count');
  let category = 'all';

  function update() {
    const query = search.value.trim().toLocaleLowerCase();
    let count = 0;
    for (const card of cards) {
      card.hidden = !(category === 'all' || card.dataset.category === category)
        || !card.dataset.search.toLocaleLowerCase().includes(query);
      if (!card.hidden) count += 1;
    }
    empty.hidden = count !== 0;
    countLabel.textContent = `${count} ${count === 1 ? 'project' : 'projects'}${query || category !== 'all' ? ` of ${cards.length}` : ''}`;
    filters.forEach(filter => filter.setAttribute('aria-pressed', String(filter.dataset.filter === category)));
  }

  filters.forEach(button => button.addEventListener('click', () => {
    category = button.dataset.filter;
    update();
  }));
  search.addEventListener('input', update);
  search.addEventListener('keydown', event => {
    if (event.key === 'Escape') { search.value = ''; update(); }
  });
  document.getElementById('clear-filters').addEventListener('click', () => {
    search.value = '';
    category = 'all';
    update();
    search.focus();
  });

  const motion = document.getElementById('frontier-motion');
  const reducedMotion = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
  function setMotion(enabled) {
    const active = enabled && !reducedMotion?.matches;
    root.dataset.motion = active ? 'on' : 'off';
    motion.setAttribute('aria-pressed', String(active));
    motion.textContent = `Desert breeze: ${active ? 'on' : 'off'}`;
  }
  motion.addEventListener('click', () => setMotion(root.dataset.motion !== 'on'));
  reducedMotion?.addEventListener('change', () => setMotion(false));
  root.querySelectorAll('[data-enhanced]').forEach(element => { element.hidden = false; });
})();
