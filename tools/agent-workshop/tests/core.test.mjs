import test from 'node:test';
import assert from 'node:assert/strict';
import cases from '../reference/tests/cases.json' with {type: 'json'};
import {createWorkflow, initialState, DEFAULT_CONFIG, validateConfig, validateDraft} from '../core.mjs';

for (const fixture of cases) test(`graph scenario: ${fixture.name}`, async () => {
  const events = [];
  const graph = createWorkflow(event => events.push(event));
  const config = {configurable: {thread_id: fixture.name}, recursionLimit: 30};
  let input = initialState({...DEFAULT_CONFIG, ...fixture.config});
  let snapshot;
  for (let steps = 0; steps < 25; steps++) {
    await graph.invoke(input, config); input = null;
    snapshot = await graph.getState(config);
    if (snapshot.next.includes('review')) {
      assert.equal(events.some(event => event.node === 'finish'), false);
      await graph.updateState(config, {decision: fixture.decision || 'approve'});
    }
    if (!snapshot.next.length) break;
  }
  assert.deepEqual(events.map(event => event.node), fixture.path);
  assert.equal(snapshot.values.status, fixture.status);
  if (fixture.status === 'blocked') {
    assert.equal(snapshot.values.result, ''); assert.ok(snapshot.values.reason);
  }
  assert.deepEqual(events[0].before.plan, [], 'trace input remains immutable');
});

test('invalid configurations and structured outputs are rejected', () => {
  for (const patch of [{query: ''}, {max_revisions: -1}, {top_k: true}, {min_sources: 9}, {fault: 'unknown'}])
    assert.throws(() => validateConfig({...DEFAULT_CONFIG, ...patch}));
  assert.ok(validateDraft([{text: 'Claim', source_id: 'invented'}], [{id: 'real'}], 1).length);
  assert.ok(validateDraft([{text: 5}], [], 1).length);
});

test('threads are isolated and a decision cannot be skipped', async () => {
  const graph = createWorkflow();
  const config = {configurable: {thread_id: 'one'}};
  await graph.invoke(initialState({...DEFAULT_CONFIG, fault: 'none'}), config);
  assert.deepEqual((await graph.getState({configurable: {thread_id: 'two'}})).values, {});
  while (!(await graph.getState(config)).next.includes('review')) await graph.invoke(null, config);
  await assert.rejects(graph.invoke(null, config), /Expected approve or reject/);
  assert.notEqual((await graph.getState(config)).values.status, 'approved');
});
