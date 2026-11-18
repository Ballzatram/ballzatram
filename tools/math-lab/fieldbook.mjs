import { chapters, lessons } from './lessons.mjs';
import { experiments } from './experiments.mjs';

const el = (id) => document.getElementById(id);
const ordered = chapters.flatMap(([, ids]) => ids);
const states = new Map();
let active = '',
  config,
  state,
  timer;
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
const fields = new Map();

function stop() {
  window.clearInterval(timer);
  timer = undefined;
  if (config) el('play').textContent = config.play;
}
function fresh() {
  return {
    ...Object.fromEntries(config.controls.map((c) => [c.key, c.start])),
    seed: 1729,
    frame: 0,
  };
}
function paint() {
  for (const control of config.controls) {
    const field = fields.get(control.key);
    field.input.value = state[control.key];
    const value = control.display(state[control.key]);
    field.output.textContent = value;
    field.input.setAttribute('aria-valuetext', value);
  }
  const [observed, readout] = config.render(el('plot'), state);
  el('observed').textContent = observed;
  el('readout').textContent = readout;
}
function announce() {
  el('announcement').textContent = el('observed').textContent;
}
function advance(manual) {
  if (manual && config.stepAction) {
    config.stepAction(state);
    return true;
  }
  if (config.advance) return config.advance(state);
  const [key, end, stride] = config.sweep;
  const ctrl = config.controls.find((c) => c.key === key);
  const step = manual ? ctrl.step : stride;
  state[key] = Math.min(end, Number((state[key] + step).toFixed(6)));
  return state[key] < end;
}
function restartSweepAtEnd() {
  if (!config.sweep) return;
  const [key, end] = config.sweep;
  if (state[key] >= end) state[key] = config.controls.find((c) => c.key === key).min;
}
el('play').onclick = () => {
  if (timer !== undefined) {
    stop();
    announce();
    return;
  }
  restartSweepAtEnd();
  state.frame = 0;
  el('play').textContent = 'Pause';
  function tick() {
    const more = advance(false);
    paint();
    if (!more) {
      stop();
      announce();
    }
  }
  timer = window.setInterval(tick, reduced.matches ? 650 : config.advance ? 290 : 120);
  tick();
};
el('step').onclick = () => {
  stop();
  if (!config.stepAction) restartSweepAtEnd();
  advance(true);
  paint();
  announce();
};
el('reset').onclick = () => {
  stop();
  state = fresh();
  states.set(active, state);
  paint();
  announce();
};
function makeControls() {
  el('controls').replaceChildren();
  fields.clear();
  for (const c of config.controls) {
    const field = document.createElement('div'),
      label = document.createElement('label');
    field.className = 'field';
    label.className = 'field-title';
    label.htmlFor = 'range-' + c.key;
    const name = document.createElement('span'),
      output = document.createElement('output');
    name.textContent = c.label;
    output.setAttribute('for', label.htmlFor);
    output.setAttribute('aria-hidden', 'true');
    label.append(name, output);
    const input = document.createElement('input');
    input.type = 'range';
    input.id = label.htmlFor;
    input.min = c.min;
    input.max = c.max;
    input.step = c.step;
    input.addEventListener('input', () => {
      stop();
      state[c.key] = input.valueAsNumber;
      paint();
    });
    input.addEventListener('change', announce);
    fields.set(c.key, { input, output });
    field.append(label, input);
    el('controls').append(field);
  }
}
function makeQuiz(lesson) {
  const [question, answers, correct, reason, hint] = lesson.quiz;
  el('check-title').textContent = question;
  el('feedback').textContent = '';
  el('choices').replaceChildren();
  answers.forEach((answer, i) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = answer;
    button.setAttribute('aria-pressed', 'false');
    button.onclick = () => {
      for (const option of el('choices').children)
        option.setAttribute('aria-pressed', String(option === button));
      el('feedback').textContent =
        i === correct ? 'Exactly. ' + reason : 'Try another angle. ' + hint;
    };
    el('choices').append(button);
  });
}
function makeMap() {
  chapters.forEach(([name, ids], i) => {
    const section = document.createElement('div');
    section.className = 'map-section';
    const chapter = document.createElement('div');
    chapter.className = 'map-topic';
    chapter.textContent = 'Chapter ' + String(i + 1).padStart(2, '0');
    const heading = document.createElement('h3');
    heading.textContent = name;
    section.append(chapter, heading);
    ids.forEach((id) => {
      const a = document.createElement('a');
      a.href = '#' + id;
      a.dataset.lesson = id;
      const no = document.createElement('small');
      no.textContent = String(ordered.indexOf(id) + 1).padStart(2, '0') + ' ';
      a.append(no, lessons[id].title);
      section.append(a);
    });
    el('map').append(section);
  });
}
function openLesson(id, focus = false) {
  stop();
  active = id;
  config = experiments[id];
  state = states.get(id) ?? fresh();
  states.set(id, state);
  const lesson = lessons[id],
    i = ordered.indexOf(id),
    chapter = chapters.find(([, ids]) => ids.includes(id));
  document.title = lesson.title + ' · Math Fieldbook';
  el('chapter').textContent =
    'Chapter ' + String(chapters.indexOf(chapter) + 1).padStart(2, '0') + ' / ' + chapter[0];
  el('folio').textContent = 'Lab ' + String(i + 1).padStart(2, '0') + ' / ' + ordered.length;
  for (const [element, key] of Object.entries({
    title: 'title',
    intro: 'intro',
    'note-heading': 'heading',
    intuition: 'intuition',
    challenge: 'challenge',
    formula: 'formula',
    terms: 'terms',
    example: 'example',
    python: 'python',
  })) {
    el(element).textContent = lesson[key];
  }
  el('reveal').open = false;
  el('announcement').textContent = '';
  el('plot-title').textContent = config.plotTitle;
  el('play').textContent = config.play;
  el('step').textContent = config.step;
  el('legend').replaceChildren();
  config.series.forEach(([style, label]) => {
    const entry = document.createElement('span'),
      swatch = document.createElement('i');
    swatch.className = style;
    swatch.setAttribute('aria-hidden', 'true');
    entry.append(swatch, label);
    el('legend').append(entry);
  });
  const prev = ordered[i - 1],
    next = ordered[i + 1];
  el('prev').href = prev ? '#' + prev : '#course-map';
  el('prev').textContent = prev ? '← ' + lessons[prev].title : '↓ Course map';
  el('next').href = next ? '#' + next : '#course-map';
  el('next').textContent = next ? lessons[next].title + ' →' : 'Return to course map ↓';
  for (const link of el('map').querySelectorAll('a')) {
    if (link.dataset.lesson === id) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  makeControls();
  makeQuiz(lesson);
  paint();
  if (focus) {
    el('title').focus({ preventScroll: true });
    el('lesson').scrollIntoView({ block: 'start' });
  }
}
function navigate(focus) {
  const hash = window.location.hash.slice(1);
  if (ordered.includes(hash)) {
    openLesson(hash, focus);
    return;
  }
  if (!active) openLesson(ordered[0]);
  if (hash === 'course-map') {
    stop();
    el('course-map').scrollIntoView();
  }
}
makeMap();
navigate(false);
window.addEventListener('hashchange', () => navigate(true));
document.addEventListener('click', (event) => {
  const anchor = event.target.closest('a');
  if (anchor && anchor.hash === '#' + active && window.location.hash === anchor.hash) {
    el('lesson').scrollIntoView();
    el('title').focus({ preventScroll: true });
  }
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) stop();
});
new ResizeObserver(() => {
  if (config) paint();
}).observe(el('plot'));
