/* Progressive enhancement: every program remains a normal link without JS. */
(() => {
  const search = document.getElementById('program-search');
  if (!search) return;
  const cards = [...document.querySelectorAll('.program95')];
  const filters = [...document.querySelectorAll('[data-filter]')];
  let category = 'all';

  function update() {
    const query = search.value.trim().toLocaleLowerCase();
    let count = 0;
    for (const card of cards) {
      card.hidden = !(category === 'all' || card.dataset.category === category) || !card.dataset.search.toLocaleLowerCase().includes(query);
      if (!card.hidden) count += 1;
    }
    document.getElementById('no-programs').hidden = count !== 0;
    document.getElementById('program-count').textContent = `${count} ${count === 1 ? 'program' : 'programs'}${query || category !== 'all' ? ` of ${cards.length}` : ''}`;
  }

  filters.forEach(button => button.addEventListener('click', () => {
    category = button.dataset.filter;
    filters.forEach(filter => filter.setAttribute('aria-pressed', String(filter === button)));
    update();
  }));
  search.addEventListener('input', update);
  document.querySelectorAll('[data-enhanced]').forEach(element => { element.hidden = false; });
})();
