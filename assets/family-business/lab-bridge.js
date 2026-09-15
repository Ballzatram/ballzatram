/* A visible route between the story and existing labs. No scores, money, or data transfer. */
(() => {
  const query = new URLSearchParams(location.search);
  if (query.get('family') !== '1') return;
  const rooms = [
    ['supply-demand', 'The market counter', 'What did the deli shift make you curious about? Change one condition and follow the consequences.'],
    ['invisible-hands', 'Market Street', 'A whole market has more than one decision-maker. Watch their choices meet.'],
    ['platform', 'The back room', 'The same agreement can behave differently when information, timing, or incentives change.'],
    ['prisoners-dilemma', 'The handshake', 'The family remembers. Find a strategy that still makes sense tomorrow.'],
    ['portfolio', 'The counting room', 'Different names on the books can still hide the same exposure.'],
    ['scenario', 'The rainy-day file', 'Make the assumptions visible. Then find where a shock travels.'],
    ['central-bank', 'Across town', 'A separate policy simulation: learn what the central bank can change and what the family must respond to.'],
    ['reports', 'The family record', 'Write down what the evidence supports and where the assumptions end.']
  ];
  const room = rooms.find(([slug]) => location.pathname.includes(slug));
  if (!room) return;
  document.body.classList.add('family-room');
  const strip = document.createElement('aside'); strip.className = 'family-room-bar'; strip.setAttribute('aria-label', 'The Family Business');
  const returnLink = document.createElement('a');
  returnLink.href = (location.pathname.includes('/legacy-econ-arcade/') || query.get('familyOrigin') === 'legacy') ? '/legacy-econ-arcade/play/#library' : '/econ-arcade/play/#library';
  returnLink.textContent = '← Return to the family';
  const title = document.createElement('strong'); title.textContent = room[1];
  const line = document.createElement('span'); line.textContent = room[2];
  strip.append(returnLink, title, line); document.body.prepend(strip);
})();
