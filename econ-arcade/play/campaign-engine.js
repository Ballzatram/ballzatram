/* Deterministic, replayable campaign. Story/AI text has no authority over state. */
(function (root, factory) {
  const engine = factory(typeof module === 'object' && module.exports ? require('./campaign-data.js') : root.FamilyBusinessData);
  if (typeof module === 'object' && module.exports) module.exports = engine;
  else root.FamilyBusiness = engine;
})(typeof window === 'undefined' ? globalThis : window, function (D) {
  'use strict';
  const VERSION = 1, KEY = 'ballzatram:family-business:v1', MAX_EVENTS = 5000;
  const copy = value => JSON.parse(JSON.stringify(value));
  const round = value => Math.round((value + Number.EPSILON) * 100) / 100;
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  const money = value => `$${round(value).toFixed(2)}`;
  const check = (condition, message) => { if (!condition) throw new Error(message); };
  function initial() {
    return { version: VERSION, turn: 0, revision: 0, cash: 650, debt: 0, trust: 60, rank: 0,
      cursor: 0, stage: 0, phase: 'plan', completed: [], evidence: {}, practice: false, finished: false,
      policies: { deli: 'steady', bakery: 'steady', delivery: 'steady', warehouse: 'steady', district: 'steady', harbor: 'steady' },
      world: { cost: 1.6, traffic: 90, rate: .005, tariff: 1, fx: 1.15, capacity: 50, wage: 9, importShare: .8 },
      notes: {}, journal: [], latest: null, announcement: 'Rosa has left $650 in the till. Make it a good first day.' };
  }
  function mission(state) { return D.missions[state.cursor]; }
  function defaults(m) { return Object.fromEntries(m.controls.map(control => [control.id, control.value])); }
  function validateInput(m, raw) {
    check(raw && typeof raw === 'object' && !Array.isArray(raw), 'Choose a plan before opening the shutters.');
    check(Object.keys(raw).length === m.controls.length, 'This plan has missing or unexpected controls.');
    const input = {};
    for (const c of m.controls) {
      const v = raw[c.id];
      if (c.type === 'choice') check(c.options.some(option => option[0] === v), `Choose a valid ${c.label.toLowerCase()}.`);
      else {
        check(typeof v === 'number' && Number.isFinite(v) && v >= c.min && v <= c.max, `${c.label} must be between ${c.min} and ${c.max}.`);
        check(Math.abs((v - c.min) / c.step - Math.round((v - c.min) / c.step)) < 1e-7, `${c.label} changes in steps of ${c.step}.`);
      }
      input[c.id] = v;
    }
    return input;
  }
  function environment(state, m = mission(state)) { return copy(state.stage === 2 ? m.transfer : m.base); }
  // The reference and chosen plan always see the same state and environment.
  // A comparison is an isolated calculation: only the chosen plan enters the ledger.
  function evaluate(state, raw, m = mission(state), env = environment(state, m)) {
    const p = validateInput(m, raw);
    let value = 0, profit = 0, cost = 0, borrowing = 0, trust = 0, capacity = 0;
    let facts = [], story = '';
    const fact = (label, value) => facts.push({ label, value });
    switch (m.model) {
      case 'market': {
        const demand = Math.round(env.traffic * Math.pow(4 / p.price, 1.2));
        const sold = Math.min(p.stock, demand), waste = p.stock - sold, queue = demand - sold;
        cost = p.stock * env.cost + 25; profit = sold * p.price - cost;
        value = m.id === 'sunday-rush' ? sold : m.id === 'bread-on-monday' ? waste : profit;
        fact('Customers wanting a sandwich', demand); fact('Sandwiches sold', sold); fact('People turned away', queue);
        fact('Sandwiches wasted', waste); fact('Ingredient bill', money(p.stock * env.cost)); fact('Shift cost', '$25.00');
        story = queue ? `${queue} people leave without a sandwich. ${waste} sandwiches remain when Rosa closes.` : `${sold} customers eat. Rosa counts ${waste} sandwiches left on the counter.`;
        break;
      }
      case 'logistics': {
        const packed = (6 - p.drivers) * 16, space = p.drivers * env.pace;
        value = Math.min(packed, space); cost = 6 * 12; profit = value * 3 - cost;
        fact('Packing capacity', packed); fact('Driving capacity', space); fact('Crew wages', money(cost));
        story = packed > space ? 'Packed boxes wait by the door. The drivers are the bottleneck.' : 'The vans have room. Packing is now the bottleneck.';
        break;
      }
      case 'batch': {
        const sold = Math.min(p.batch, env.orders), fee = p.backup === 'express' ? 45 : 30;
        cost = p.batch * 1.3 + fee; profit = sold * 4 - cost; value = profit;
        fact('Rolls sold', sold); fact('Rolls wasted', p.batch - sold); fact('Delivery fee', money(fee)); fact('Average cost per roll ordered', money(cost / p.batch));
        story = `The invoice covers all ${p.batch} rolls. Only ${sold} go into paying customers’ bags. Express delivery does not add demand in this scenario.`;
        break;
      }
      case 'specialization': {
        const boost = p.training === 'yes' ? 1.2 : 1;
        const baked = Math.floor(p.baking * env.bake * boost), dispatched = Math.floor((8 - p.baking) * env.dispatch * boost);
        value = Math.min(baked, dispatched); cost = 64 + (p.training === 'yes' ? 35 : 0); profit = value * 4 - cost;
        fact('Baking capacity', baked); fact('Dispatch capacity', dispatched); fact('Crew and training', money(cost));
        story = `${value} complete orders leave the bakery. ${baked > dispatched ? 'Finished bread waits for dispatch.' : 'Dispatch waits for the oven.'}`;
        break;
      }
      case 'rivalry': {
        const quality = p.quality === 'premium' ? 1 : 0;
        const sold = Math.round(100 / (1 + Math.exp((p.price - env.rival - quality * 1.5) / 2)));
        cost = sold * (2 + quality) + 20; profit = sold * p.price - cost; value = profit;
        fact('Customers choosing your counter', sold); fact('Customers choosing Frankie', 100 - sold); fact('Frankie’s price', money(env.rival)); fact('Your operating costs', money(cost));
        story = `${sold} people choose your counter; ${100 - sold} cross the street. Rosa’s original deli still reports separately.`;
        break;
      }
      case 'trust': {
        const honor = p.deal === 'honor';
        const first = env.guarded ? (honor ? 0 : 10) : (honor ? 60 : 90);
        const second = honor ? 60 : 10;
        value = first + (p.term === 'repeat' ? second : 0); profit = value; trust = honor ? 8 : -12;
        fact('Round one earnings', money(first)); fact('Round two earnings', p.term === 'repeat' ? money(second) : 'No second round'); fact('Trust change', trust);
        story = honor ? 'Mara sees you keep your word. In a second round she honors the split.' : 'Mara guards her route after seeing you take the best deliveries. The next round pays less.';
        break;
      }
      case 'auction': {
        const won = p.bid >= env.competing, inspection = p.inspect === 'yes' ? 8 : 0;
        cost = (won ? p.bid : 0) + inspection; profit = (won ? env.value : 0) - cost; value = profit;
        fact('Contract awarded', won ? 'To the family' : 'To the other bidder'); fact('Net contract value', money(env.value)); fact('Competing bid', money(env.competing)); fact('Inspection bill', money(inspection));
        story = won ? `The contract is yours. After the bid and inspection, it leaves ${money(profit)}.` : 'The family walks away from the auction. No winning bid is paid.';
        break;
      }
      case 'credit': {
        borrowing = p.loan; cost = p.investment;
        const financing = p.loan * env.rate * 4;
        profit = p.investment * env.return - financing - 30; value = profit;
        // The investment returns its principal at settlement; upfront funding is still required.
        cost = p.investment + financing + 30;
        fact('Four-week investment gain', money(p.investment * env.return)); fact('New loan’s four-week interest', money(financing)); fact('Contract overhead', '$30.00'); fact('Principal still owed', money(p.loan));
        story = `The investment settles. ${money(p.loan)} of borrowed principal remains on the books; it is not part of the earned surplus.`;
        break;
      }
      case 'investment': {
        const added = p.ovens * 35 + (p.training === 'yes' ? 20 : 0);
        const extra = Math.max(0, Math.min(env.demand, 50 + added) - Math.min(env.demand, 50));
        cost = p.ovens * 160 + (p.training === 'yes' ? 60 : 0); profit = extra * 8 - cost; value = profit; capacity = p.ovens * 5;
        fact('Additional orders sold', extra); fact('Capacity offered for this contract', 50 + added); fact('Expansion bill', money(cost)); fact('Future bakery capacity added', capacity);
        story = `${extra} additional orders use the expansion. The family keeps equipment; ${capacity} capacity carries into the bakery’s later shifts.`;
        break;
      }
      case 'risk': {
        const reserve = 300 * p.reserve / 100, invested = 300 - reserve;
        const shipping = invested * p.shipping / 100, local = invested - shipping;
        const slump = reserve + local * (1 - env.slump) + shipping * .9;
        const closure = reserve + local * .95 + shipping * (1 - env.closure);
        const good = reserve + local * 1.15 + shipping * 1.2;
        value = Math.min(slump, closure); cost = 300; profit = value - 300;
        fact('Local slump balance', money(slump)); fact('Harbor closure balance', money(closure)); fact('Good-week comparison', money(good)); fact('Cash reserve', money(reserve));
        story = `The worse stress week leaves ${money(value)} of the $300 fund. In this exercise that worse week settles into the ledger; the good-week result is a comparison only.`;
        break;
      }
      case 'labor': {
        const applicants = Math.max(0, Math.floor((p.wage - env.threshold) * 2));
        value = Math.min(applicants, p.jobs); cost = value * p.wage; profit = value * 22 - cost;
        fact('Applicants', applicants); fact('Unfilled positions', p.jobs - value); fact('Wage bill', money(cost)); fact('Output value', money(value * 22));
        story = `${value} of ${p.jobs} shifts are filled. A vacancy does not produce anything until someone takes it.`;
        break;
      }
      case 'purchasing': {
        const affordable = Math.floor(env.budget / p.price);
        value = Math.min(affordable, p.stock); cost = p.stock * env.cost; profit = value * p.price - cost;
        fact('Baskets households can afford', affordable); fact('Baskets sold', value); fact('Unsold baskets', p.stock - value); fact('Ingredient bill', money(cost));
        story = `${value} households buy a basket. Money absorbed by rent and fuel cannot also be spent at the counter.`;
        break;
      }
      case 'externality': {
        const avoided = p.filter === 'yes' ? 18 : 0;
        value = clamp(state.trust - env.damage + avoided + p.cleanup * (1 + env.match) * .4, 0, 100);
        trust = value - state.trust; cost = (p.filter === 'yes' ? 55 : 0) + p.cleanup; profit = -cost;
        fact('Smoke pressure', env.damage); fact('Damage avoided by filter', avoided); fact('Neighbors’ matching cleanup', money(p.cleanup * env.match)); fact('Family contribution', money(cost));
        story = 'The street’s response enters family trust. That trust changes demand and delivery income on later turns.';
        break;
      }
      case 'trade': {
        const abroad = p.partner === 'alternate' ? 7.5 : 4 + env.tariff;
        value = (p.imports * abroad + (100 - p.imports) * 7) / 100;
        cost = value * 100; profit = 900 - cost;
        fact('Imported cost per crate', money(abroad)); fact('Local cost per crate', '$7.00'); fact('Total sourcing bill', money(cost)); fact('Contract revenue', '$900.00');
        story = `The 100-crate order arrives at ${money(value)} a crate. This sourcing mix and tariff now influence the older businesses’ flour bill.`;
        break;
      }
      case 'currency': {
        const rate = env.fx * (1 - p.hedge / 100) + p.hedge / 100;
        const fee = p.exports * p.hedge / 100 * .1;
        cost = p.exports + fee; profit = (100 - p.exports) * 2 + p.exports * (3 * rate - 1) - fee; value = profit;
        fact('Settlement dollars per euro', money(env.fx)); fact('Effective export conversion', money(rate)); fact('Hedge fee', money(fee)); fact('Local crates', 100 - p.exports);
        story = `The euro invoices convert at an effective ${money(rate)} per euro. The forward contract exchanges uncertain conversion for a fixed rate and a fee.`;
        break;
      }
      case 'system': {
        const arrived = (100 - p.backup) * env.arrival + p.backup;
        value = Math.min(100, Math.floor(arrived + p.buffer)); cost = 100 + p.backup * 1.4 + p.buffer * 1.1; profit = value * 4 - cost;
        fact('Crates arriving on supply routes', round(arrived)); fact('Reserve crates available', p.buffer); fact('Family orders missed', 100 - value); fact('Supply and resilience costs', money(cost));
        story = `${value} orders pass from warehouse to bakery to dispatch to counter. The same missing input can stop all four.`;
        break;
      }
      default: throw new Error('This episode has no simulation.');
    }
    return { value: round(value), profit: round(profit), cost: round(cost), borrowing, trust: round(trust), capacity, facts, story };
  }
  function direction(actual, reference) { return Math.abs(actual - reference) < .005 ? 'same' : actual > reference ? 'up' : 'down'; }
  function operations(state, m, available) {
    const lines = [], scale = { careful: .7, steady: 1, grow: 1.3 };
    for (const asset of D.assets.filter(asset => asset.rank <= state.rank)) {
      if (asset.id === 'deli' && ['market', 'purchasing'].includes(m.model)) continue;
      const policy = state.policies[asset.id], factor = scale[policy];
      let cost = 0, income = 0, detail = '';
      if (asset.id === 'deli') {
        const price = policy === 'careful' ? 5 : policy === 'grow' ? 4 : 4.5;
        const stock = Math.round(70 * factor);
        const demand = Math.round(state.world.traffic * Math.pow(4 / price, 1.2) * (.7 + state.trust / 200));
        const sold = Math.min(stock, demand);
        cost = stock * state.world.cost + 25; income = sold * price;
        detail = `${sold}/${stock} sandwiches sold at ${money(price)}. Flour ${money(state.world.cost)} each.`;
      } else if (asset.id === 'bakery') {
        const output = Math.min(Math.round(state.world.capacity * factor), Math.round(state.world.traffic * .75));
        cost = Math.round(state.world.capacity * factor) * state.world.cost * .5 + 20; income = output * 2.5;
        detail = `${output} bread orders; capacity, demand, and flour costs still matter.`;
      } else if (asset.id === 'delivery') {
        cost = 45 * factor; income = (70 + state.trust * .5) * Math.min(factor, 1.1);
        detail = `Contract income responds to family trust (${round(state.trust)}/100).`;
      } else if (asset.id === 'warehouse') {
        cost = 40 * factor; income = 65 * Math.min(factor, 1.1);
        detail = 'Storage fees earned after carrying costs.';
      } else if (asset.id === 'district') {
        cost = state.world.wage * 5 * factor; income = (60 + state.trust * .5) * Math.min(factor, 1.1);
        detail = `Five standard shifts; pay follows the latest ${money(state.world.wage)} offer.`;
      } else {
        cost = (30 + state.world.tariff * 3) * factor; income = 75 * state.world.fx * Math.min(factor, 1.1);
        detail = 'Harbor surplus responds to tariffs and the exchange rate.';
      }
      if (available < cost) {
        lines.push({ id: asset.id, name: asset.name, profit: 0, cost: 0, detail: 'Manager pauses this shift: not enough working cash for supplies.' });
      } else {
        const profit = round(income - cost); available += profit;
        lines.push({ id: asset.id, name: asset.name, profit, cost: round(cost), detail });
      }
    }
    return lines;
  }
  function updateWorld(state, m, p, env, outcome) {
    if (m.model === 'market') { state.world.cost = env.cost; state.world.traffic = env.traffic; }
    if (m.model === 'investment') state.world.capacity = Math.min(150, state.world.capacity + outcome.capacity);
    if (m.model === 'labor') state.world.wage = p.wage;
    if (m.model === 'purchasing') { state.world.cost = env.cost * .5; state.world.traffic = Math.floor(env.budget / 7); }
    if (m.model === 'trade') { state.world.tariff = env.tariff; state.world.importShare = p.imports / 100; state.world.cost = round(outcome.value * .3); }
    if (m.model === 'currency') state.world.fx = env.fx;
    if (m.model === 'system') state.world.traffic = Math.max(40, outcome.value);
    state.trust = round(clamp(state.trust + outcome.trust, 0, 100));
  }
  function reduce(previous, command) {
    check(command && typeof command === 'object' && !Array.isArray(command), 'Invalid campaign event.');
    const s = copy(previous), m = mission(s);
    s.announcement = '';
    switch (command.type) {
      case 'play': {
        check(s.phase === 'plan' && (!s.finished || s.practice), 'This shift has already settled. Continue from the result.');
        const input = validateInput(m, command.input);
        check(['up', 'same', 'down'].includes(command.forecast), 'Choose what you expect to happen compared with the standing order.');
        const env = environment(s), refInput = defaults(m);
        const reference = evaluate(s, refInput, m, env), actual = evaluate(s, input, m, env);
        check(actual.cost <= s.cash + actual.borrowing + .001, `This plan needs ${money(actual.cost)} up front. Adjust the plan or take a working-capital advance from the Ledger.`);
        const changed = m.controls.filter(c => input[c.id] !== refInput[c.id]).length;
        const expected = direction(actual.value, reference.value), correct = command.forecast === expected;
        const qualifies = s.stage === 0 || (correct && (s.stage === 1 ? changed === 1 && expected !== 'same' : expected === m.goal));
        const before = { cash: s.cash, debt: s.debt, trust: s.trust };
        const ongoing = operations(s, m, s.cash + actual.borrowing + actual.profit);
        const operatingProfit = round(ongoing.reduce((sum, line) => sum + line.profit, 0));
        const interestDue = round(s.debt * s.world.rate);
        const balance = round(Math.max(0, s.cash + actual.borrowing + actual.profit + operatingProfit));
        const interestPaid = Math.min(balance, interestDue), capitalized = round(interestDue - interestPaid);
        s.cash = round(balance - interestPaid); s.debt = round(s.debt + actual.borrowing + capitalized);
        updateWorld(s, m, input, env, actual);
        s.turn++; s.phase = 'result';
        s.evidence[m.id] ||= { observed: false, experiment: false, transfer: false };
        if (s.stage === 0) s.evidence[m.id].observed = true;
        if (s.stage === 1 && qualifies) s.evidence[m.id].experiment = true;
        if (s.stage === 2 && qualifies) s.evidence[m.id].transfer = true;
        s.latest = { mission: m.id, turn: s.turn, stage: s.stage, input, referenceInput: refInput, environment: env,
          forecast: command.forecast, expected, correct, qualifies, changed, actual, reference, ongoing, before,
          interestPaid, capitalized, operatingProfit, cashChange: round(s.cash - before.cash), after: { cash: s.cash, debt: s.debt, trust: s.trust } };
        s.journal.push({ ...copy(s.latest), title: m.title });
        if (s.journal.length > 80) s.journal.shift();
        break;
      }
      case 'continue': {
        check(s.phase === 'result', 'Open the business and observe a result first.');
        if (s.latest.qualifies) {
          if (s.stage < 2) { s.stage++; s.announcement = s.stage === 1 ? 'Now change one thing. See whether you can anticipate the difference.' : 'A different day. Use what you noticed under changed conditions.'; }
          else if (s.practice) { s.practice = false; s.cursor = Math.min(s.completed.length, 17); s.stage = 0; s.announcement = 'Rehearsal complete. The family ledger keeps the consequences.'; }
          else {
            if (!s.completed.includes(m.id)) s.completed.push(m.id);
            const nextRank = Math.min(5, Math.floor(s.completed.length / 3));
            if (nextRank > s.rank) {
              s.rank = nextRank; s.cash = round(s.cash + D.ranks[s.rank].grant);
              s.announcement = `${D.ranks[s.rank].name}. ${D.ranks[s.rank].unlock} The family contributes ${money(D.ranks[s.rank].grant)} in equity, with no new debt.`;
            } else s.announcement = 'The family noticed how you adapted. Your earlier responsibilities stay with you.';
            if (s.completed.length === D.missions.length) { s.finished = true; s.announcement = 'A seat at the table. Eighteen episodes, one connected family. Revisit any contract or explore the deeper labs.'; }
            else s.cursor++;
            s.stage = 0;
          }
        } else s.announcement = s.latest.correct ? 'That prediction matched, but the experiment still needs a different plan. Check the assignment before trying again.' : 'Keep the result in mind. Try another plan and prediction; a missed call never takes away earlier evidence.';
        s.phase = 'plan'; s.latest = null;
        break;
      }
      case 'policy': {
        check(s.phase === 'plan', 'Finish reviewing this shift before changing a manager’s instructions.');
        const asset = D.assets.find(a => a.id === command.asset);
        check(asset && asset.rank <= s.rank && s.rank >= 1, 'This business is not ready for delegation.');
        check(['careful', 'steady', 'grow'].includes(command.value), 'Choose a valid management policy.');
        s.policies[asset.id] = command.value;
        s.announcement = `${asset.manager} will follow the new policy on the next turn.`;
        break;
      }
      case 'loan':
        check(s.phase === 'plan', 'Review this shift before borrowing.');
        check(s.debt < 1000000, 'The credit limit is reached. Export the record and start a new family to explore a different path.');
        s.cash = round(s.cash + 500); s.debt = round(s.debt + 500);
        s.announcement = 'A $500 working-capital advance enters cash and debt. Existing debt costs 0.5% interest per campaign turn.';
        break;
      case 'note':
        check(typeof command.text === 'string' && command.text.length <= 600, 'Keep the field note within 600 characters.');
        s.notes[m.id] = command.text; break;
      case 'replay': {
        check(s.phase === 'plan', 'Review this shift before moving to another contract.');
        check(s.completed.includes(command.id), 'Complete this episode before revisiting it.');
        s.cursor = D.missions.findIndex(item => item.id === command.id); s.practice = true; s.stage = 0; s.latest = null;
        s.announcement = 'A new contract under familiar conditions. Cash, debt, and businesses carry forward; earned promotions stay with you.';
        break;
      }
      case 'leave':
        check(s.practice && s.phase === 'plan', 'Finish reviewing the current shift first.');
        s.practice = false; s.cursor = Math.min(17, s.completed.length); s.stage = 0; s.latest = null; break;
      default: throw new Error('Unknown campaign event. This backup may belong to a newer version.');
    }
    s.revision++;
    check(Number.isFinite(s.cash) && s.cash >= 0 && s.cash < 1e10 && Number.isFinite(s.debt) && s.debt < 1e10, 'The ledger is outside this model’s supported range.');
    return s;
  }
  function serialize(events) {
    check(Array.isArray(events) && events.length <= MAX_EVENTS, 'This save has reached its 5,000-event limit. Export it before starting a new family.');
    const raw = JSON.stringify({ campaign: 'the-family-business', version: VERSION, events });
    check(raw.length <= 2000000, 'This save has reached its 2 MB limit. Export it before starting a new family.');
    return raw;
  }
  function restore(raw) {
    check(typeof raw === 'string' && raw.length <= 2000000, 'Choose a Family Business backup smaller than 2 MB.');
    let file;
    try { file = JSON.parse(raw); } catch { throw new Error('This backup is not valid JSON. Your current family has not changed.'); }
    check(file && file.campaign === 'the-family-business' && file.version === VERSION && Array.isArray(file.events) && file.events.length <= MAX_EVENTS, 'This is not a supported Family Business backup.');
    let state = initial(); const events = [];
    for (const event of file.events) {
      // Whitelist event fields; imported metadata cannot enter AI context or saved state.
      const c = { type: event?.type };
      if (c.type === 'play') { c.input = event.input; c.forecast = event.forecast; }
      if (c.type === 'policy') { c.asset = event.asset; c.value = event.value; }
      if (c.type === 'note') c.text = event.text;
      if (c.type === 'replay') c.id = event.id;
      state = reduce(state, c); events.push(copy(c));
    }
    return { state, events };
  }
  function selectedContext(state, includeNote = false) {
    const m = mission(state);
    const context = { schemaVersion: 1, campaignVersion: VERSION, campaign: 'The Family Business', episodeId: m.id,
      revision: state.revision, turn: state.turn, phase: state.phase, practice: state.practice, finished: state.finished,
      rank: D.ranks[state.rank].name, episode: m.title,
      stage: ['observe', 'controlled experiment', 'transfer'][state.stage], brief: state.stage === 2 ? m.shift : m.brief,
      assignment: state.stage === 0 ? 'Experience a result and notice a pattern.' : state.stage === 1 ? `Change exactly one control and predict the direction of ${m.metric.toLowerCase()} versus the standing order.` : m.target,
      ledger: { cash: state.cash, debt: state.debt, trust: state.trust }, concepts: m.concepts,
      limits: 'Fictional deterministic teaching model. No random shocks, real forecasts, or complete model of an economy. No assistant may choose, execute, score, save, or promote on behalf of the player.' };
    if (state.latest) {
      const r = state.latest;
      context.selectedResult = { turn: r.turn, before: copy(r.before), plan: copy(r.input), comparisonPlan: copy(r.referenceInput), environment: copy(r.environment),
        forecast: r.forecast, observedDirection: r.expected, outcome: { metric: m.metric, value: r.actual.value, reference: r.reference.value, facts: copy(r.actual.facts), story: r.actual.story },
        businessReports: copy(r.ongoing), episodeSurplus: r.actual.profit, newBorrowing: r.actual.borrowing,
        interestPaid: r.interestPaid, unpaidInterest: r.capitalized, ledgerChange: r.cashChange,
        evidence: { predictionMatched: r.correct, experimentCompleted: r.qualifies } };
    }
    if (includeNote) context.selectedFieldNote = state.notes[m.id] || '';
    return context;
  }
  return { VERSION, KEY, MAX_EVENTS, initial, mission, defaults, environment, evaluate, operations, reduce, serialize, restore, direction, selectedContext, money, round };
});
