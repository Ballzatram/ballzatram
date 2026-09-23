/* Original editorial/fiction starter editions. Not live AI output or objective rankings. */
(function (root, factory) {
  const value = factory();
  if (typeof module === 'object' && module.exports) module.exports = value;
  else root.BecketsSeeds = value;
})(typeof window === 'undefined' ? globalThis : window, function () {
  'use strict';
  function edition(id, category, title, hook, rankingBasis, entries, nextTopics, sources = []) {
    return { schemaVersion: 1, id: `seed-${id}`, origin: 'starter', category, title, hook, rankingBasis, nextTopics, sources,
      items: entries.map(([title, detail, why], index) => ({ rank: 10 - index, title, detail, why })) };
  }
  return [
    edition('movie-worlds', 'Cinema', '10 movie worlds to get completely lost in', 'Some movies end. Their worlds do not. Which one owns the penthouse in your imagination?', 'An editorial ranking of atmosphere, world-building, and the urge to explore. Not a critics’ consensus. Spoiler-light.', [
      ['The Grand Budapest Hotel', 'A candy-colored hotel that makes every corridor feel like the beginning of an extremely polite conspiracy.', 'A miniature world with enormous personality.'],
      ['Ghostbusters', 'Imagine your ordinary city, except the suspicious noise in the apartment really is a ghost.', 'The extraordinary lives right next door.'],
      ['The Fifth Element', 'A maximalist future that feels like someone gave a comic book the keys to an entire city.', 'Every corner suggests another strange story.'],
      ['Jurassic Park', 'Wonder and terrible management decisions: a destination you want to visit until you consider the exit plan.', 'The dream and nightmare arrive together.'],
      ['Mad Max: Fury Road', 'Even a steering wheel feels like an artifact from a civilization built on movement and obsession.', 'World-building you can practically hear.'],
      ['Star Wars', 'A battered spaceship, a strange cantina, and the conviction that adventure waits one jump away.', 'A galaxy built for side quests.'],
      ['Blade Runner', 'Rain, neon, and the uncomfortable feeling that the city knows something about you that you do not.', 'Atmosphere becomes part of the argument.'],
      ['Spirited Away', 'A doorway into a place where the rules feel ancient, peculiar, and completely indifferent to your confusion.', 'Mystery without explaining the magic away.'],
      ['The Matrix', 'Your boring Tuesday could be the cover story. That idea changes the texture of every ordinary room.', 'It makes reality itself feel explorable.'],
      ['The Lord of the Rings', 'A world that invites you to follow the road, then makes even the walk home feel meaningful.', 'Immensity with a deeply human center.']
    ], ['Movie villains who almost had a point', 'Fictional cities with the strongest personality', 'Science fiction worlds you would refuse to live in']),
    edition('reality-questions', 'Mindbenders', '10 questions that turn reality sideways', 'No trivia test. No correct score. Just ten tiny trapdoors underneath things you thought were obvious.', 'Original hypothetical questions, ordered by how deeply they challenge identity and certainty. These are thought experiments, not scientific claims.', [
      ['The door with no outside', 'You find a door that opens only from your side. What would convince you something exists beyond it?', 'A small mystery with very large edges.'],
      ['The last original piece', 'You replace every part of a treasured object. Is the story holding it together now?', 'The familiar becomes unexpectedly slippery.'],
      ['The borrowed memory', 'Someone gives you a perfect memory of an adventure you never had. Did you gain an experience?', 'Possession is not the same as living.'],
      ['The honest prediction', 'A machine predicts your next choice, then shows you its prediction. What exactly can it predict now?', 'Knowing becomes part of the experiment.'],
      ['The extra minute', 'Everyone freezes for one minute, except you. Without a clock, how would you prove the minute happened?', 'Measurement suddenly needs a witness.'],
      ['The invisible audience', 'Your life is identical, but nobody will ever remember it. Which choices change?', 'Meaning loses its applause track.'],
      ['The perfect translation', 'A device translates every word correctly but never understands a joke. What is it missing?', 'Accuracy and understanding pull apart.'],
      ['The painless reset', 'You can undo one decision, but every friendship caused by it disappears. Is that a correction?', 'Consequences include the things you love.'],
      ['The two originals', 'A perfect copy of you wakes up beside you. Which one gets to say the other is the copy?', 'Identity has no obvious referee.'],
      ['The certainty button', 'A button makes you absolutely certain of everything you believe. It changes no facts. Would you press it?', 'The feeling of truth is not truth.']
    ], ['Thought experiments about time travel', 'Questions about consciousness without easy answers', 'Moral dilemmas for a science fiction story']),
    edition('ai-mental-models', 'AI', '10 mental models that make AI click', 'Less alphabet soup. More “oh, THAT is what it is doing.” Start with the pieces. Finish with the trap.', 'An introductory editorial learning sequence, ranked by usefulness for interpreting language-model behavior. Simplified explanations, not a complete technical account.', [
      ['Tokens: the pieces, not the words', 'Think of text entering a machine in chunks; a chunk can be smaller than a whole word.', 'Start with the actual unit.'],
      ['Embeddings: a learned coordinate system', 'Representations place patterns into numerical spaces; useful relationships can become easier for a model to work with.', 'Meaning gets a mathematical representation.'],
      ['Context: the working desk', 'A model’s current input has limited room. A larger desk is not the same as perfect memory.', 'Availability is not reliable recall.'],
      ['Training: practice changes the machinery', 'Training adjusts model parameters; asking a question is not generally the same as retraining those parameters.', 'Learning and using are different stages.'],
      ['Attention: information can look around', 'Attention combines information from different positions, with weights that depend on the representations being processed.', 'Context becomes part of the computation.'],
      ['Retrieval: bring the open book', 'A retrieval system supplies relevant material to a model instead of relying only on information in its parameters.', 'Useful evidence can enter at answer time.'],
      ['Tools: a separate pair of hands', 'A model can request a calculator or another tool; the tool executes the operation outside the model.', 'Suggestion and execution are not identical.'],
      ['Hallucination: fluency without a receipt', 'A convincing sentence can still be unsupported. Confidence in the wording is not independent evidence.', 'Style cannot authenticate a claim.'],
      ['Evaluation: test the job, not the vibe', 'Define success for the actual task, then inspect representative failures instead of collecting impressive demonstrations.', 'A good demo is not a guarantee.'],
      ['Prediction is not a truth detector', 'Generating a plausible answer and verifying a claim are different jobs. Build the workflow to respect that gap.', 'The most useful boundary to remember.']
    ], ['AI concepts explained through everyday analogies', 'Failure modes to test in an AI assistant', 'Ways to evaluate an AI project'], [
      { label: 'Background: Attention Is All You Need', url: 'https://arxiv.org/abs/1706.03762' },
      { label: 'Background: retrieval-augmented generation', url: 'https://arxiv.org/abs/2005.11401' }
    ]),
    edition('impossible-places', 'Story fuel', '10 impossible places that deserve a game', 'A travel guide for places that absolutely do not exist. Your imagination can ignore the zoning laws.', 'Original fictional settings, ranked by how many stories and game mechanics they suggest. No real destinations are being described.', [
      ['The motel between seconds', 'Every guest checks in during a different moment. The night clerk has been twelve for a century.', 'One lobby, endless incompatible timelines.'],
      ['The library of unfinished dreams', 'Books keep writing themselves while their dreamers sleep. The forbidden wing is full of people who woke up.', 'A mystery changes while you read it.'],
      ['The desert beneath the sea', 'Cowboys ride across an air pocket under the ocean, following the shadows of enormous things overhead.', 'A western with a terrifying ceiling.'],
      ['The city that changes its mind', 'Streets rearrange whenever the city regrets something. Your map is an apology, not a promise.', 'Navigation becomes a relationship.'],
      ['The orchard of spare moons', 'Gardeners grow replacement moons, and someone has stolen the only seed that controls the tides.', 'A tiny theft with planetary consequences.'],
      ['The railway through paintings', 'Each station belongs to a different artistic style. Bring the wrong shadow and you cannot board.', 'The art direction becomes the rules.'],
      ['The underwater sun', 'A drowned kingdom survives around a small, sinking star. Every rescue mission makes it burn a little faster.', 'Hope is also the resource limit.'],
      ['The courthouse for forgotten gods', 'Deities defend their right to exist. You are the overworked public defender assigned to the god of lost buttons.', 'Cosmic stakes meet wonderfully petty cases.'],
      ['The mountain with a heartbeat', 'An expedition climbs a sleeping creature, arguing over whether reaching the summit is worth waking it.', 'The landscape is also a character.'],
      ['The labyrinth that remembers you', 'Every shortcut is built from a decision you avoided. The exit looks suspiciously like a conversation.', 'The level design knows your history.']
    ], ['Plot twists for a space western', 'Side quests for a city that changes its mind', 'Monsters for a library of unfinished dreams']),
    edition('tiny-quests', 'Wildcard', '10 tiny quests with absurdly enormous stakes', 'The job sounded simple. That was your first warning. Original story hooks, ranked by escalation.', 'Original fictional prompts, ordered by contrast between a small task and its consequences.', [
      ['Return one library book', 'It is overdue by three hundred years. The librarian is charging interest in seasons.', 'A late fee with weather consequences.'],
      ['Fix the elevator', 'It has started stopping at floors that the building has not grown yet.', 'Maintenance meets an unwanted prophecy.'],
      ['Deliver the pizza', 'The customer is a dragon. The last driver forgot the extra basil.', 'An ordinary service job, unusually dangerous.'],
      ['Watch the neighbor’s cat', 'The cat is keeping the moon in orbit. It is also refusing its new food.', 'Pet care becomes celestial diplomacy.'],
      ['Find a missing sock', 'It is the only thing blocking a portal at the back of the washing machine.', 'Domestic chaos gets a literal doorway.'],
      ['Water the office plant', 'Its roots are holding the company’s entire alternate timeline together.', 'The intern has acquired real responsibility.'],
      ['Win the spelling bee', 'Every misspelled word permanently changes the object it describes.', 'A small mistake can redesign reality.'],
      ['Make one person laugh', 'An exhausted giant is holding up the sky. Laughter is the only thing keeping it awake.', 'The worst possible audience pressure.'],
      ['Apologize before sunset', 'Two cities share one shadow. Your argument has made it choose sides.', 'Emotional repair becomes infrastructure policy.'],
      ['Bring yourself home', 'Your future self called for a ride. They will not tell you what they are running from.', 'A favor becomes a question about fate.']
    ], ['Fictional heists with impossible stakes', 'Tiny robots with enormous responsibilities', 'Unusual mysteries for a retro detective game'])
  ];
});
