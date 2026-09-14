/* Optional page tools. The browser/AI host owns inference; this page never calls a model. */
(() => {
  'use strict';
  const lab = window.SupplyDemandLab;
  const engine = window.SupplyDemandEngine;
  const button = document.querySelector('[data-osiris-feature="supplyDemand"]');
  if (button && lab) {
    // Read the visible run at the moment of selection, including when storage is blocked.
    button.removeAttribute('data-osiris-context-key');
    button.addEventListener('click', event => {
      event.stopImmediatePropagation();
      window.OsirisPanel.open({ tool: 'supplyDemand', prompt: 'Give me one small hint or diagnostic question about this run.', context: lab.selectedRun() });
    });
  }
  const host = document.modelContext;
  if (window.parent !== window || !host?.registerTool || !lab || !engine) return;
  const annotations = { readOnlyHint: true, destructiveHint: false, openWorldHint: false };
  const result = data => ({ content: [{ type: 'text', text: JSON.stringify(data) }] });
  const definitions = [
    {
      name: 'read_supply_demand_selection',
      description: 'Read the currently visible Supply & Demand teaching simulation, its input sequence, revision, and limitations. Does not read storage or other projects.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations,
      execute: async () => result(lab.selectedRun())
    },
    {
      name: 'simulate_supply_demand',
      description: 'Compare a separate deterministic Supply & Demand example. Does not change the visible run, predictions, or scores. Tax and controls apply to one move; shifts persist.',
      inputSchema: { type: 'object', properties: {
        scenarioId: { type: 'string', enum: engine.scenarios.map(row => row.id) },
        mode: { type: 'string', enum: ['challenge', 'sandbox'] },
        challengeId: { type: 'string', enum: engine.challenges.map(row => row.id) },
        actions: { type: 'array', maxItems: engine.LIMIT, items: { type: 'string', enum: engine.actions.map(row => row.id) } }
      }, additionalProperties: false }, annotations,
      execute: async input => result(engine.simulate(input))
    }
  ];
  const registered = [];
  try {
    for (const definition of definitions) { host.registerTool(definition); registered.push(definition.name); }
    const status = document.querySelector('[data-osiris-launch-status]');
    if (status) status.textContent = 'This browser can share the visible lab with its AI assistant when you ask.';
  } catch {
    for (const name of registered) { try { host.unregisterTool?.(name); } catch {} }
  }
})();
