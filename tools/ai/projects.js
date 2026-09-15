(() => {
  'use strict';
  const list = document.getElementById('project-list');
  for (const feature of window.BallzatramAIFeatures.features) {
    const card = document.createElement('article'); card.className = 'project-card';
    const badge = document.createElement('span'); badge.className = `pill${feature.enabled ? '' : ' needs-design'}`; badge.textContent = feature.status;
    const title = document.createElement('h2'); title.textContent = feature.name;
    const context = document.createElement('p'); context.textContent = feature.context;
    const next = document.createElement('p'); next.className = 'next'; next.textContent = `Next conversation: ${feature.next}`;
    const support = document.createElement('p'); support.className = 'fine';
    support.textContent = window.BallzatramAIFeatures.capabilities(feature.id).hostTools ? feature.id === 'econ-world' ? 'Osiris’s desk: review your episode, decisions, and ledger; request a nudge or debrief in your AI app.' : 'Interactive AI-app tools: explore the Supply & Demand simulation with your own AI account.' : feature.enabled ? 'Selected context is ready to share. Interactive AI-app tools are not available for this project yet.' : 'No AI context sharing enabled.';
    card.append(badge, title, context, support, next);
    if (feature.path && feature.id !== 'page-guide') { const link = document.createElement('a'); link.href = feature.path; link.textContent = 'Open project →'; card.append(link); }
    list.append(card);
  }
})();
