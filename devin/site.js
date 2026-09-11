const projectCards = [...document.querySelectorAll('[data-project]')];
const search = document.querySelector('#project-search');
const filters = [...document.querySelectorAll('[data-filter]')];
const count = document.querySelector('#project-count');
const empty = document.querySelector('#empty-state');
let category = 'all';

function filterProjects() {
  const query = search.value.trim().toLocaleLowerCase();
  let visible = 0;
  for (const card of projectCards) {
    const matches = (category === 'all' || card.dataset.category === category)
      && card.textContent.toLocaleLowerCase().includes(query);
    card.hidden = !matches;
    if (matches) visible += 1;
  }
  count.textContent = `${visible} of ${projectCards.length} projects`;
  empty.hidden = visible !== 0;
}

if (search) {
  document.querySelector('#project-controls').hidden = false;
  search.addEventListener('input', filterProjects);
  for (const button of filters) {
    button.addEventListener('click', () => {
      category = button.dataset.filter;
      for (const item of filters) item.setAttribute('aria-pressed', String(item === button));
      filterProjects();
    });
  }
  document.querySelector('#reset-search').addEventListener('click', () => {
    search.value = '';
    filters[0].click();
    search.focus();
  });
  filterProjects();
}

const printButton = document.querySelector('#print-resume');
if (printButton) {
  printButton.hidden = false;
  printButton.addEventListener('click', () => window.print());
}
