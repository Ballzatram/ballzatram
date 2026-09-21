/** Pure, dependency-free feed rules. No model calls, analytics or account state. */
export const TOPICS = Object.freeze({ai:'AI foundations',building:'Building systems',markets:'Markets & decisions',history:'History & evidence',ideas:'Learning & design'});
export const STORAGE_KEY = 'osiris-learning-feed-v1';
export const VERSION = 1;
export const emptyState = () => ({version:VERSION,saved:[],seen:[],answers:{},mix:'ai-first',lastCard:null});
export const escapeHTML = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function safeURL(value) {
  if (typeof value !== 'string') return null;
  try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password ? u.href : null; } catch { return null; }
}
export function validateCatalog(data) {
  if (!data || data.version !== VERSION || !Array.isArray(data.cards) || !data.cards.length || !Array.isArray(data.sources) || !Array.isArray(data.paths)) throw new Error('Unsupported or empty feed edition.');
  const unique = (items, name) => {
    const ids = new Set();
    for (const item of items) {
      if (!item || !/^[a-z0-9][a-z0-9-]{1,79}$/.test(item.id) || ids.has(item.id)) throw new Error(`Invalid or duplicate ${name} ID.`);
      ids.add(item.id);
    }
    return ids;
  };
  const sources = unique(data.sources,'source'), cards = unique(data.cards,'card');
  unique(data.paths,'path');
  const text = v => typeof v === 'string' && v.trim().length > 0;
  for (const s of data.sources) {
    if (!safeURL(s.url) || !['book','paper','article','course','documentation','video'].includes(s.type) || ![s.title,s.author,s.scope,s.access,s.date,s.checked].every(text)) throw new Error(`Invalid source ${s.id}.`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s.checked)) throw new Error(`Missing reference check date: ${s.id}.`);
  }
  for (const c of data.cards) {
    if (!Object.hasOwn(TOPICS,c.topic) || !['concept','exercise','resource','video'].includes(c.kind) || ![c.title,c.body,c.detail].every(text) || !Array.isArray(c.sources) || !c.sources.length || c.sources.some(id=>!sources.has(id))) throw new Error(`Invalid card ${c.id}.`);
    if (c.quiz && (!text(c.quiz.question) || !text(c.quiz.explanation) || !Array.isArray(c.quiz.options) || c.quiz.options.length < 2 || !c.quiz.options.every(text) || !Number.isInteger(c.quiz.answer) || c.quiz.answer < 0 || c.quiz.answer >= c.quiz.options.length)) throw new Error(`Invalid question ${c.id}.`);
    if (c.video && !/^[A-Za-z0-9_-]{11}$/.test(c.video)) throw new Error(`Invalid video ID: ${c.id}.`);
  }
  for (const p of data.paths) {
    if (![p.title,p.description].every(text) || !Array.isArray(p.cards) || !p.cards.length || new Set(p.cards).size !== p.cards.length || p.cards.some(id=>!cards.has(id))) throw new Error(`Invalid path ${p.id}.`);
  }
  return data;
}
export function normalizeState(raw, cards, strict = false) {
  if (!raw || raw.version !== VERSION || Array.isArray(raw)) {
    if (strict) throw new Error('Use an Osiris Feed version 1 progress export.');
    return emptyState();
  }
  if (strict && (!Array.isArray(raw.saved) || !Array.isArray(raw.seen) || !raw.answers || typeof raw.answers !== 'object' || Array.isArray(raw.answers) || !['ai-first','balanced'].includes(raw.mix))) throw new Error('Invalid progress fields. Nothing was imported.');
  const known = new Map(cards.map(c=>[c.id,c]));
  const ids = arr => Array.isArray(arr) ? [...new Set(arr.filter(id=>typeof id === 'string' && known.has(id)))] : [];
  const state = {...emptyState(),saved:ids(raw.saved),seen:ids(raw.seen),mix:raw.mix === 'balanced' ? 'balanced' : 'ai-first',lastCard:known.has(raw.lastCard) ? raw.lastCard : null};
  if (raw.answers && typeof raw.answers === 'object' && !Array.isArray(raw.answers)) {
    for (const [id,a] of Object.entries(raw.answers)) {
      const quiz = known.get(id)?.quiz;
      if (quiz && a && Number.isInteger(a.choice) && a.choice >= 0 && a.choice < quiz.options.length && Number.isInteger(a.attempts) && a.attempts > 0) state.answers[id] = {choice:a.choice,attempts:Math.min(a.attempts,10000)};
    }
  }
  return state;
}
export function loadState(storage,cards) {
  try {
    const value = storage.getItem(STORAGE_KEY);
    if (!value) return {state:emptyState(),warning:''};
    const raw = JSON.parse(value);
    if (raw.version !== VERSION) return {state:emptyState(),warning:'This saved progress version is not supported. Your old storage has not been changed.'};
    return {state:normalizeState(raw,cards,true),warning:''};
  } catch { return {state:emptyState(),warning:'Saved progress could not be read. This visit still works; export progress to keep a copy.'}; }
}
export function saveState(storage,state) { try { storage.setItem(STORAGE_KEY,JSON.stringify(state)); return true; } catch { return false; } }
export function importState(text,cards) {
  if (typeof text !== 'string' || text.length > 250000) throw new Error('Progress files must be smaller than 250 KB.');
  let raw;
  try { raw = JSON.parse(text); } catch { throw new Error('That file is not valid JSON. Nothing was imported.'); }
  return normalizeState(raw,cards,true);
}
export function toggleSaved(state,id) {
  state.saved = state.saved.includes(id) ? state.saved.filter(x=>x!==id) : [...state.saved,id];
}
export function recordAnswer(state,card,choice) {
  if (!card.quiz || !Number.isInteger(choice) || choice < 0 || choice >= card.quiz.options.length) throw new Error('Choose an answer first.');
  state.answers[card.id] = {choice,attempts:(state.answers[card.id]?.attempts || 0)+1};
  return choice === card.quiz.answer;
}
export function selectCards(cards,state,{topic='all',query='',saved=false,path=null}={}) {
  const q = query.trim().toLocaleLowerCase();
  let selected = cards.filter(c=>(topic === 'all' || c.topic === topic) && (!saved || state.saved.includes(c.id)) && (!path || path.includes(c.id)) && (!q || `${c.title} ${c.body} ${c.detail} ${TOPICS[c.topic]}`.toLocaleLowerCase().includes(q)));
  if (path) return selected.sort((a,b)=>path.indexOf(a.id)-path.indexOf(b.id));
  if (saved) return selected.sort((a,b)=>state.saved.indexOf(b.id)-state.saved.indexOf(a.id));
  const seen = new Set(state.seen);
  selected.sort((a,b)=>Number(seen.has(a.id))-Number(seen.has(b.id)));
  if (topic !== 'all') return selected;
  const pattern = state.mix === 'balanced' ? Object.keys(TOPICS) : ['ai','building','ai','history','ai','markets','building','ideas'];
  const buckets = Object.fromEntries(Object.keys(TOPICS).map(t=>[t,selected.filter(c=>c.topic === t)]));
  const result = [];
  while (result.length < selected.length) for (const t of pattern) if (buckets[t].length) result.push(buckets[t].shift());
  return result;
}
export function explanation(state,topic='all',path=false,saved=false) {
  if (saved) return 'You saved this card. Most recently saved cards come first.';
  if (path) return 'Part of your selected editorial path, in its planned order. This is not an adaptive assessment.';
  if (topic !== 'all') return `You selected ${TOPICS[topic]}. Unviewed cards come first; prior cards remain available.`;
  return `${state.mix === 'balanced' ? 'Balanced mix: topics alternate equally while available.' : 'AI-first mix: AI and building receive five of every eight slots while all topics are available.'} Unviewed cards come first within each topic. No inferred personality or model ranking.`;
}
export function softmax(scores) {
  if (!Array.isArray(scores) || !scores.length || !scores.every(Number.isFinite)) throw new Error('Scores must be finite numbers.');
  const max = Math.max(...scores), exps = scores.map(s=>Math.exp(s-max)), total = exps.reduce((a,b)=>a+b,0);
  return exps.map(e=>e/total);
}
