import { Annotation, StateGraph, START, END, MemorySaver } from '@langchain/langgraph/web';
import SOURCES from './reference/sources.json' with { type: 'json' };

export { SOURCES };
export const NODES = ['intake', 'retrieve', 'draft', 'check', 'revise', 'review', 'finish', 'blocked'];
export const DEFAULT_CONFIG = {query: 'Explain agent orchestration', top_k: 3, min_sources: 2, max_revisions: 2, fault: 'once'};

export function validateConfig(input) {
  if (!input || typeof input !== 'object' || typeof input.query !== 'string' || !input.query.trim() || input.query.length > 500)
    throw new Error('Enter a question between 1 and 500 characters.');
  for (const [key, min, max] of [['top_k', 1, 4], ['min_sources', 1, 4], ['max_revisions', 0, 3]]) {
    if (!Number.isInteger(input[key]) || input[key] < min || input[key] > max) throw new Error(`${key} must be an integer from ${min} to ${max}.`);
  }
  if (!['none', 'once', 'always'].includes(input.fault)) throw new Error('Unknown fault setting.');
  return {query: input.query.trim(), top_k: input.top_k, min_sources: input.min_sources, max_revisions: input.max_revisions, fault: input.fault};
}

export function retrieve(query, topK) {
  const words = [...new Set(query.toLowerCase().match(/[a-z0-9]+/g) || [])];
  return SOURCES.map((doc, index) => ({doc, index, score: words.filter(w => doc.keywords.split(' ').includes(w)).length}))
    .filter(item => item.score > 0).sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, topK).map(({doc}) => ({...doc}));
}

export function validateDraft(claims, evidence, minSources) {
  const issues = [];
  const known = new Set(evidence.map(item => item.id));
  const cited = new Set();
  if (!Array.isArray(claims) || !claims.length) return ['The draft has no claims.'];
  for (const [i, claim] of claims.entries()) {
    if (!claim || typeof claim.text !== 'string' || !claim.text.trim() || claim.text.length > 2000 || typeof claim.source_id !== 'string') {
      issues.push(`Claim ${i + 1} does not match the output schema.`); continue;
    }
    if (!known.has(claim.source_id)) issues.push(`Claim ${i + 1} cites an unavailable source: ${claim.source_id}.`);
    else cited.add(claim.source_id);
  }
  if (cited.size < minSources) issues.push(`Need ${minSources} distinct sources; found ${cited.size}.`);
  return issues;
}

// This is an intentionally deterministic stand-in for a model, not AI inference.
export function practiceWriter(state, isRevision = false) {
  const claims = state.evidence.map(doc => ({text: doc.text, source_id: doc.id}));
  if (claims.length && (state.config.fault === 'always' || (!isRevision && state.config.fault === 'once'))) claims[0].source_id = 'missing';
  return claims;
}

export function routeAfterCheck(state) {
  if (!state.issues.length) return 'review';
  if (state.revisions >= state.config.max_revisions) return 'blocked';
  return 'revise';
}

export function createWorkflow(onEvent = () => {}) {
  const State = Annotation.Root(Object.fromEntries(
    ['query', 'config', 'plan', 'evidence', 'claims', 'issues', 'revisions', 'decision', 'approved', 'status', 'result', 'reason'].map(key => [key, Annotation()])
  ));
  const traced = (node, fn) => async state => {
    const before = structuredClone(state);
    const start = performance.now();
    const patch = await fn(state);
    onEvent({node, before, patch: structuredClone(patch), after: {...before, ...structuredClone(patch)}, duration_ms: Math.round((performance.now() - start) * 100) / 100});
    return patch;
  };
  const graph = new StateGraph(State)
    .addNode('intake', traced('intake', state => ({plan: ['Search bundled notes', 'Draft cited claims', 'Validate and repair within budget', 'Ask for human review'], status: 'running'})))
    .addNode('retrieve', traced('retrieve', state => {
      const evidence = retrieve(state.query, state.config.top_k);
      return {evidence, reason: evidence.length ? '' : 'No bundled note matched. Try a question about agents, state, or human review.'};
    }))
    .addNode('draft', traced('draft', state => ({claims: practiceWriter(state)})))
    .addNode('check', traced('check', state => ({issues: validateDraft(state.claims, state.evidence, state.config.min_sources)})))
    .addNode('revise', traced('revise', state => ({claims: practiceWriter(state, true), revisions: state.revisions + 1})))
    .addNode('review', traced('review', state => {
      // Browser uses static checkpoint boundaries + updateState, avoiding Node's
      // AsyncLocalStorage requirement. Python demonstrates dynamic interrupt().
      const decision = state.decision;
      if (!['approve', 'reject'].includes(decision)) throw new Error('Expected approve or reject.');
      return {approved: decision === 'approve'};
    }))
    .addNode('finish', traced('finish', state => ({status: state.approved ? 'approved' : 'rejected', result: state.approved ? state.claims.map(claim => `${claim.text} [${claim.source_id}]`).join('\n\n') : 'Draft rejected. Nothing was published.'})))
    .addNode('blocked', traced('blocked', state => ({status: 'blocked', reason: state.evidence.length ? `Repair budget exhausted. ${state.issues.join(' ')}` : state.reason})))
    .addEdge(START, 'intake').addEdge('intake', 'retrieve')
    .addConditionalEdges('retrieve', state => state.evidence.length ? 'draft' : 'blocked', ['draft', 'blocked'])
    .addEdge('draft', 'check')
    .addConditionalEdges('check', routeAfterCheck, ['review', 'revise', 'blocked'])
    .addEdge('revise', 'check').addEdge('review', 'finish')
    .addEdge('finish', END).addEdge('blocked', END);
  return graph.compile({checkpointer: new MemorySaver(), interruptAfter: NODES});
}

export function initialState(config) {
  const checked = validateConfig(config);
  return {query: checked.query, config: checked, plan: [], evidence: [], claims: [], issues: [], revisions: 0, decision: '', approved: false, status: 'ready', result: '', reason: ''};
}
