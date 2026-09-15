/* Fictional scenarios. All numbers belong to this teaching model, not a real economy. */
(function (root, factory) {
  const data = factory();
  if (typeof module === 'object' && module.exports) module.exports = data;
  else root.FamilyBusinessData = data;
})(typeof window === 'undefined' ? globalThis : window, function () {
  'use strict';
  const number = (id, label, min, max, step, value, unit = '') => ({ id, label, min, max, step, value, unit, type: 'number' });
  const choice = (id, label, value, options) => ({ id, label, value, options, type: 'choice' });
  const ranks = [
    { name: 'Associate', place: 'Bellafiore Deli', responsibility: 'Keep the shutters open.', unlock: 'The family trusts you with the deli.', grant: 0, asset: 'deli' },
    { name: 'Soldier', place: 'The supply route', responsibility: 'Keep the block moving.', unlock: 'Rosa takes the deli counter. You take the bakery and delivery route.', grant: 450, asset: 'bakery' },
    { name: 'Capo', place: 'The social club', responsibility: 'Make agreements that last.', unlock: 'Vito runs deliveries. You manage the neighborhood relationships.', grant: 500, asset: 'delivery' },
    { name: 'Underboss', place: 'The counting room', responsibility: 'Decide what the family can afford.', unlock: 'Lena manages the books. Expansion, debt, and reserves are now yours.', grant: 700, asset: 'warehouse' },
    { name: 'Boss', place: 'The whole neighborhood', responsibility: 'Answer for the effects on everyone.', unlock: 'The district is yours to look after. Wages, prices, and reputation travel together.', grant: 850, asset: 'district' },
    { name: 'Commission', place: 'The waterfront', responsibility: 'See the connections across borders.', unlock: 'The harbor opens. Every business you built now depends on a wider world.', grant: 1000, asset: 'harbor' }
  ];
  const missions = [
    {
      id: 'sunday-rush', title: 'The Sunday Rush', place: 'Bellafiore Deli', character: 'Rosa · the one who actually runs this place',
      line: 'The festival starts at noon. The bread does not last until Monday. Your call, kid.',
      brief: 'A street festival is bringing customers to the deli. Set the sandwich price and morning batch, then watch the line and the leftovers.',
      shift: 'The second festival is bigger. At the old $4 price, 120 customers would like a sandwich. The same counter can leave more people hungry.',
      concepts: ['Scarcity', 'Supply and demand', 'Capacity'], model: 'market', metric: 'Customers served', unit: 'people', goal: 'up', target: 'Serve more people than the standing order.',
      controls: [number('price', 'Sandwich price', 2, 9, .5, 4, '$'), number('stock', 'Sandwiches prepared', 20, 160, 10, 70)],
      base: { traffic: 90, cost: 1.6 }, transfer: { traffic: 120, cost: 1.6 },
      hints: ['Look at the people still waiting and the bread left on the counter.', 'A lower price can bring people in. The kitchen still has to feed them.', 'Try changing just the batch. Keep the price at $4 so you can see what the extra bread does.'],
      takeaway: 'Demand is not the same as sales. A crowded sidewalk cannot buy sandwiches you never made.'
    },
    {
      id: 'price-of-a-regular', title: 'The Price of a Regular', place: 'Bellafiore Deli', character: 'Rosa',
      line: 'A full shop looks good. Paying the flour bill looks better.',
      brief: 'The queue is familiar now. Find out whether a cheaper sandwich really leaves more in the till after ingredients and the shift are paid.',
      shift: 'Flour is dearer and the festival has moved on. Ingredient cost rises to $2.80; traffic at $4 falls to 80. Yesterday’s margin is gone.',
      concepts: ['Elasticity', 'Revenue and profit', 'Marginal decisions'], model: 'market', metric: 'Deli surplus', unit: '$', goal: 'up', target: 'Keep more after costs than the standing order.',
      controls: [number('price', 'Sandwich price', 3, 9, .5, 3, '$'), number('stock', 'Sandwiches prepared', 30, 150, 10, 110)],
      base: { traffic: 90, cost: 1.6 }, transfer: { traffic: 80, cost: 2.8 },
      hints: ['Count the money left after making every sandwich, including the ones nobody bought.', 'Changing the price changes both the margin and how many customers want to buy.', 'Compare $3 with $5 while keeping the batch fixed. Watch both sales and costs.'],
      takeaway: 'More sales can leave you with less money. Price changes the margin and the number of buyers at the same time.'
    },
    {
      id: 'bread-on-monday', title: 'Bread on Monday', place: 'Bellafiore Deli', character: 'Rosa',
      line: 'Yesterday’s bread has a very short résumé.',
      brief: 'The celebration is over. Unsold sandwiches spoil at closing. Match a perishable batch to a quieter street without forgetting the people you turn away.',
      shift: 'Rain cuts the street traffic to 45 customers at $4. The bakery still offers the same large batch.',
      concepts: ['Inventory', 'Opportunity cost', 'Uncertainty'], model: 'market', metric: 'Sandwiches wasted', unit: 'sandwiches', goal: 'down', target: 'Waste fewer sandwiches than the standing order.',
      controls: [number('price', 'Sandwich price', 3, 8, .5, 4, '$'), number('stock', 'Sandwiches prepared', 20, 160, 10, 120)],
      base: { traffic: 75, cost: 1.8 }, transfer: { traffic: 45, cost: 2 },
      hints: ['Empty shelves and full bins tell different stories.', 'A smaller batch saves ingredients, but it can also turn people away.', 'Change only the batch first. Compare waste, unserved customers, and the till together.'],
      takeaway: 'Unsold inventory has a cost. So does the sale you could have made. The right batch depends on the day.'
    },
    {
      id: 'six-pairs-of-hands', title: 'Six Pairs of Hands', place: 'The delivery yard', character: 'Vito · dispatch',
      line: 'Six people. Two jobs. No, I cannot hire your imaginary cousin.',
      brief: 'Split six workers between packing and driving. A packed order earns nothing until it reaches a customer.',
      shift: 'Roadworks halve the driver’s pace to 11 orders per shift. Packers still prepare 16 each. Find the new bottleneck.',
      concepts: ['Opportunity cost', 'Bottlenecks', 'Resource allocation'], model: 'logistics', metric: 'Orders delivered', unit: 'orders', goal: 'up', target: 'Deliver more than the standing allocation.',
      controls: [number('drivers', 'Workers driving · 6 total', 1, 5, 1, 2)],
      base: { pace: 22 }, transfer: { pace: 11 },
      hints: ['Look for the smaller pile: orders packed, or orders the vans can carry.', 'Moving someone to a van also takes them away from packing.', 'Try three drivers. Then check whether another driver would leave enough packers.'],
      takeaway: 'A resource earns its value in the job where it helps most. Fixing one bottleneck can create another.'
    },
    {
      id: 'cheap-by-the-crate', title: 'Cheap by the Crate', place: 'The flour depot', character: 'Vito',
      line: 'He says buying twice as much saves money. Funny how he is the one selling it.',
      brief: 'One delivery costs $30 however large the order. Bigger batches spread that fee, but unsold fresh rolls still spoil.',
      shift: 'A nearby office closes for repairs. Demand falls from 75 rolls to 40. A cheap unit is still expensive if it goes in the bin.',
      concepts: ['Economies of scale', 'Inventory', 'Fixed and variable costs'], model: 'batch', metric: 'Bakery surplus', unit: '$', goal: 'up', target: 'Improve the bakery surplus after delivery and waste.',
      controls: [number('batch', 'Fresh rolls ordered', 20, 150, 10, 120), choice('backup', 'Delivery service', 'standard', [['standard', 'Standard · $30'], ['express', 'Express · $45']])],
      base: { orders: 75 }, transfer: { orders: 40 },
      hints: ['Separate the fee for the van from the cost of every roll.', 'Compare the unit cost with the total bill and the rolls actually sold.', 'Reduce the batch while keeping delivery service the same.'],
      takeaway: 'Spreading fixed costs helps only if the extra output is useful. Low average cost does not guarantee a good decision.'
    },
    {
      id: 'the-right-job', title: 'The Right Job', place: 'Rosa’s bakery', character: 'Rosa',
      line: 'I can bake. Vito can drive. You can stop making us swap every ten minutes.',
      brief: 'Allocate eight crew-hours between baking and dispatch. Finished deliveries require both. A training session costs $35 and lifts both teams’ output by 20%.',
      shift: 'The new oven lifts baking to 13 orders an hour, but dock checks slow dispatch to 7. The old division of labor no longer fits.',
      concepts: ['Specialization', 'Productivity', 'Comparative advantage'], model: 'specialization', metric: 'Complete orders', unit: 'orders', goal: 'up', target: 'Complete more orders than the standing allocation.',
      controls: [number('baking', 'Crew-hours baking · 8 total', 1, 7, 1, 4), choice('training', 'Train the crew', 'no', [['no', 'No session'], ['yes', 'Session · $35']])],
      base: { bake: 8, dispatch: 12 }, transfer: { bake: 13, dispatch: 7 },
      hints: ['Compare what each team can finish in an hour.', 'A faster oven can make dispatch the limiting job.', 'When baking gets faster, try moving one hour from baking to dispatch.'],
      takeaway: 'Better equipment changes how scarce hours should be used. Yesterday’s efficient assignment can become today’s bottleneck.'
    },
    {
      id: 'across-the-street', title: 'Across the Street', place: 'Market Street', character: 'Frankie · the rival with the immaculate apron',
      line: 'Lovely neighborhood. Plenty of room for two delis. Probably.',
      brief: 'Frankie’s sandwiches are $6. Customers compare both shops. Test a price or a quality upgrade while Rosa keeps your old counter running.',
      shift: 'Frankie cuts his price to $4. Your old price is now competing with a different offer.',
      concepts: ['Competition', 'Strategic interdependence', 'Differentiation'], model: 'rivalry', metric: 'New counter surplus', unit: '$', goal: 'up', target: 'Improve surplus against the rival’s new offer.',
      controls: [number('price', 'New counter price', 4, 10, .5, 8, '$'), choice('quality', 'Ingredients', 'standard', [['standard', 'Standard'], ['premium', 'Premium · +$1 per sale']])],
      base: { rival: 6 }, transfer: { rival: 4 },
      hints: ['A price makes sense next to the alternatives a customer can actually buy.', 'A higher margin is no help when almost everyone crosses the street.', 'Hold ingredients fixed and compare a $6 sandwich with the $8 standing price.'],
      takeaway: 'Your best choice can change when someone else changes theirs. The market remembers there is another deli.'
    },
    {
      id: 'tomorrows-handshake', title: 'Tomorrow’s Handshake', place: 'Bellafiore Social Club', character: 'Mara · freight partner',
      line: 'We can split the route fairly. Or spend every morning checking each other’s locks.',
      brief: 'Sharing a route earns each partner $60 per round. Taking the best deliveries earns you $90 now, but a partner who was undercut protects their route next time. Two guarded partners earn $10 each.',
      shift: 'Mara starts guarded after a bad deal elsewhere. Honoring the first round earns you nothing immediately, but she reciprocates in the next round.',
      concepts: ['Repeated games', 'Trust', 'Incentives'], model: 'trust', metric: 'Your contract earnings', unit: '$', goal: 'up', target: 'Improve earnings across the whole agreement.',
      controls: [choice('deal', 'Your commitment', 'cut', [['cut', 'Take the best deliveries'], ['honor', 'Honor the split']]), choice('term', 'Contract length', 'repeat', [['short', 'One round'], ['repeat', 'Two rounds']])],
      base: { guarded: false }, transfer: { guarded: true },
      hints: ['Read the second round before you celebrate the first.', 'The partner responds to what you did in the previous round.', 'Compare both rounds of honoring the split with both rounds of taking the best deliveries.'],
      takeaway: 'A deal changes the next deal. An immediate advantage can cost more when the other side gets another turn.'
    },
    {
      id: 'a-beautiful-bad-deal', title: 'A Beautiful Bad Deal', place: 'The contract auction', character: 'Lena · the books',
      line: 'You won. That is not the same sentence as “you made money.”',
      brief: 'Bid for a delivery contract worth $105 after operating costs. The competing sealed bid is $80; matching it wins in this exercise. Optional inspection costs $8 and confirms the valuation.',
      shift: 'A canceled event cuts the contract value to $70, and the competing bid falls to $60. The old $100 bid would still win.',
      concepts: ['Auctions', 'Winner’s curse', 'Value of information'], model: 'auction', metric: 'Contract surplus', unit: '$', goal: 'up', target: 'Keep more value after the winning bid and inspection.',
      controls: [number('bid', 'Your sealed bid', 20, 140, 10, 100, '$'), choice('inspect', 'Inspection', 'no', [['no', 'Use the stated estimate'], ['yes', 'Confirm value · $8']])],
      base: { value: 105, competing: 80 }, transfer: { value: 70, competing: 60 },
      hints: ['Winning buys the contract at your bid, not at its value.', 'Walking away can be better than winning at a loss.', 'Compare the standing bid with one close to the competing bid. Here the values are disclosed, so inspection adds a cost without new information.'],
      takeaway: 'Winning is only useful at a price worth paying. Information is valuable when it changes a decision, not just because it sounds thorough.'
    },
    {
      id: 'the-money-isnt-free', title: 'The Money Isn’t Free', place: 'The counting room', character: 'Lena',
      line: 'The lender sends flowers with the first check. The second envelope has no flowers.',
      brief: 'Choose a loan and a four-week stock investment. In this scenario stock earns a 50% surplus before financing. Borrowed principal stays on the family ledger after this contract.',
      shift: 'The quote rises to 5% interest per week and slower trade reduces the four-week investment surplus to 20%. Cash in hand is not free money.',
      concepts: ['Credit', 'Interest', 'Opportunity cost'], model: 'credit', metric: 'Four-week operating surplus', unit: '$', goal: 'up', target: 'Improve the surplus after the quoted borrowing cost.',
      controls: [number('loan', 'New borrowing', 0, 600, 200, 400, '$'), number('investment', 'Stock investment', 0, 400, 200, 200, '$')],
      base: { rate: .02, return: .5 }, transfer: { rate: .05, return: .2 },
      hints: ['Keep the borrowed principal separate from the money the investment earns.', 'Compare the added investment return with the interest attached to the loan.', 'Try reducing borrowing while holding the investment fixed, if the family can fund it.'],
      takeaway: 'A loan increases cash and obligations together. Whether borrowing helps depends on what the funds earn and what they cost.'
    },
    {
      id: 'one-more-oven', title: 'One More Oven', place: 'Rosa’s bakery', character: 'Rosa',
      line: 'I like ovens. Customers, however, eat bread.',
      brief: 'The bakery can fill 50 orders. Each $160 oven adds space for 35. This contract earns $8 for each extra order you can actually serve; demand is 80.',
      shift: 'The office district slows to 45 orders. Existing capacity is enough for those customers. Expansion now needs a different argument.',
      concepts: ['Investment', 'Diminishing returns', 'Sunk costs'], model: 'investment', metric: 'Expansion surplus', unit: '$', goal: 'up', target: 'Improve the return on this expansion decision.',
      controls: [number('ovens', 'Additional ovens', 0, 2, 1, 2), choice('training', 'Productivity session', 'no', [['no', 'No session'], ['yes', '+20 capacity · $60']])],
      base: { demand: 80 }, transfer: { demand: 45 },
      hints: ['Measure the additional orders, not the total capacity on the brochure.', 'The first oven and the second oven may earn very different amounts.', 'Compare one oven with two; then ask whether any new capacity is needed in the quieter district.'],
      takeaway: 'Expansion pays for additional demand it can serve. An earlier purchase does not make another purchase worthwhile.'
    },
    {
      id: 'a-rainy-day-fund', title: 'A Rainy-Day Fund', place: 'The counting room', character: 'Lena',
      line: 'Three businesses that all need the same dock are a single bad Tuesday wearing three hats.',
      brief: 'Allocate a $300 fund between cash and two businesses. A local slump hurts the shops most; a harbor closure hurts shipping most. Protect the balance in the worse of those two weeks.',
      shift: 'The slump deepens: shops lose 65% in that scenario. Harbor closures now cost shipping 60%. Revisit how much of the fund can afford either shock.',
      concepts: ['Diversification', 'Correlation', 'Liquidity'], model: 'risk', metric: 'Worst-week fund balance', unit: '$', goal: 'up', target: 'Protect more of the fund in its worse stress scenario.',
      controls: [number('reserve', 'Cash reserve', 0, 100, 10, 20, '%'), number('shipping', 'Shipping share of invested funds', 0, 100, 10, 0, '%')],
      base: { slump: .45, closure: .5 }, transfer: { slump: .65, closure: .6 },
      hints: ['Count shared exposures, not the number of names on the deeds.', 'Cash cushions both shocks but misses the good-week gains.', 'Hold cash fixed and spread invested funds between shops and shipping. Compare both stress balances.'],
      takeaway: 'Diversification is about how losses move together. Reserves buy resilience at the cost of some upside.'
    },
    {
      id: 'help-wanted', title: 'Help Wanted', place: 'The neighborhood', character: 'Rosa',
      line: 'The sign says “competitive pay.” The empty kitchen disagrees.',
      brief: 'Staff a new neighborhood shift. Higher wages bring more applicants, but each filled shift adds to the wage bill. Each worker produces $22 of value in this exercise.',
      shift: 'Commuting and living costs rise. Workers now start applying above $10 rather than $7. The old nominal wage buys less.',
      concepts: ['Labor markets', 'Real wages', 'Productivity'], model: 'labor', metric: 'Shifts filled', unit: 'workers', goal: 'up', target: 'Fill more shifts than the standing offer.',
      controls: [number('wage', 'Pay per shift', 8, 16, 1, 9, '$'), number('jobs', 'Positions offered', 3, 8, 1, 6)],
      base: { threshold: 7 }, transfer: { threshold: 10 },
      hints: ['A vacancy is not the same thing as a worker.', 'Compare the pay offer with what it costs someone to take the job.', 'Raise pay while leaving positions unchanged. Watch applicants and the wage bill together.'],
      takeaway: 'Labor supply responds to the alternatives and costs workers face. Posting more vacancies cannot fix an unattractive offer.'
    },
    {
      id: 'the-same-dollar', title: 'The Same Dollar', place: 'Market Street', character: 'Osiris',
      line: 'The notes in the till look exactly the same. That is how they get away with it.',
      brief: 'Households have $640 in total to spend at the neighborhood counter. Their basket budget and your available stock both limit sales. Ingredients cost $3 per basket.',
      shift: 'Rent and fuel absorb more household income. Only $430 remains for your counter, while ingredients rise to $4. The central bank’s response is outside your control.',
      concepts: ['Inflation', 'Purchasing power', 'Market power'], model: 'purchasing', metric: 'Household baskets served', unit: 'baskets', goal: 'up', target: 'Serve more households without ignoring the thinner margin.',
      controls: [number('price', 'Basket price', 4, 10, .5, 8, '$'), number('stock', 'Baskets prepared', 40, 160, 10, 100)],
      base: { budget: 640, cost: 3 }, transfer: { budget: 430, cost: 4 },
      hints: ['The household budget puts a limit on how many baskets can be bought.', 'A higher price can raise revenue per sale while excluding more households.', 'Compare $6 with $8 at the same stock level. Include ingredients when you check the family’s margin.'],
      takeaway: 'Nominal cash tells only part of the story. Price changes affect what families can buy and what businesses can afford to supply.'
    },
    {
      id: 'smoke-over-the-block', title: 'Smoke over the Block', place: 'The neighborhood council', character: 'Mrs. Bellafiore · founder',
      line: 'Your name is on the bakery. It is also on the smoke coming out of it.',
      brief: 'The growing bakery imposes costs on neighbors. A $55 filter reduces the damage; a cleanup fund helps the street. Reputation affects the older businesses on later turns.',
      shift: 'A still week traps more smoke. Other shops contribute less to the shared cleanup. Private output and neighborhood well-being are drifting further apart.',
      concepts: ['Externalities', 'Public goods', 'Collective action'], model: 'externality', metric: 'Neighborhood trust', unit: '/100', goal: 'up', target: 'Leave neighbors better off than the standing arrangement.',
      controls: [choice('filter', 'Bakery filter', 'no', [['no', 'No filter'], ['yes', 'Fit a filter · $55']]), number('cleanup', 'Street cleanup contribution', 0, 40, 10, 0, '$')],
      base: { damage: 20, match: .6 }, transfer: { damage: 30, match: .2 },
      hints: ['Some costs appear on someone else’s doorstep, not on your invoice.', 'A filter reduces the source; cleanup deals with the shared consequences.', 'Keep the cleanup contribution fixed and compare fitting the filter with doing nothing.'],
      takeaway: 'A profitable activity can impose costs outside its own books. Shared benefits also make it tempting to wait for someone else to contribute.'
    },
    {
      id: 'flour-from-afar', title: 'Flour from Afar', place: 'Meridian Harbor', character: 'Mara',
      line: 'The sea is free. Every desk between the ship and your oven charges a fee.',
      brief: 'Local flour costs $7 a crate. Imported flour costs $4 plus a $1 tariff. A second trade partner offers $7.50 delivered. Source 100 crates for the family’s businesses.',
      shift: 'The tariff rises to $5 a crate. The domestic price stays $7 and the second partner’s delivered price stays $7.50. An old advantage has changed.',
      concepts: ['Trade', 'Tariffs', 'Comparative advantage'], model: 'trade', metric: 'Delivered cost per crate', unit: '$', goal: 'down', target: 'Lower delivered cost under the new trade conditions.',
      controls: [number('imports', 'Crates sourced abroad', 0, 100, 10, 80, '%'), choice('partner', 'Foreign supplier', 'original', [['original', 'Original partner'], ['alternate', 'Second partner']])],
      base: { tariff: 1 }, transfer: { tariff: 5 },
      hints: ['Compare the price at the bakery door, not at the foreign mill.', 'The tariff changes the imported cost without changing the mill’s productivity.', 'Keep the supplier fixed and reduce the import share after the tariff rises.'],
      takeaway: 'Trade depends on relative delivered costs. A tariff can redirect sourcing, with effects reaching businesses far from the border.'
    },
    {
      id: 'two-kinds-of-money', title: 'Two Kinds of Money', place: 'The export desk', character: 'Lena',
      line: 'They paid exactly what they promised. In a currency worth less than when they promised it.',
      brief: 'Sell 100 crates locally or abroad. Local surplus is $2 each. Export revenue is €3 with $1 cost. A forward contract locks $1 per euro for a $0.10 fee per hedged crate.',
      shift: 'The euro settles at $0.65 instead of $1.15. The same foreign invoice converts into fewer dollars. The forward rate is still $1.',
      concepts: ['Exchange rates', 'Hedging', 'Risk and return'], model: 'currency', metric: 'Settlement surplus', unit: '$', goal: 'up', target: 'Improve dollar surplus at the changed settlement rate.',
      controls: [number('exports', 'Crates sold abroad', 0, 100, 10, 50, '%'), number('hedge', 'Export receipts hedged', 0, 100, 10, 0, '%')],
      base: { fx: 1.15 }, transfer: { fx: .65 },
      hints: ['The invoice amount and the amount reaching your dollar account are different quantities.', 'The forward contract gives up favorable currency moves as well as protecting against unfavorable ones.', 'Keep exports fixed and compare hedged receipts with unhedged receipts in the weaker currency.'],
      takeaway: 'A business can perform as promised and still lose on conversion. Hedging changes exposure; it does not create a free gain in every future.'
    },
    {
      id: 'when-the-harbor-stops', title: 'When the Harbor Stops', place: 'The Commission table', character: 'Osiris',
      line: 'Remember the first sandwich? Follow its bread back far enough and you end up here.',
      brief: 'A harbor disruption reaches the warehouse, bakery, drivers, and deli. Allocate backup sourcing and inventory to keep 100 family orders moving. Buffers cost money even when they sit still.',
      shift: 'Only 30% of the exposed supply arrives, down from 60%. The shock is larger, and every business still needs the same basic ingredients.',
      concepts: ['Interdependence', 'Systemic risk', 'Resilience'], model: 'system', metric: 'Family orders delivered', unit: 'orders', goal: 'up', target: 'Keep more family orders moving through the disruption.',
      controls: [number('backup', 'Supply on a backup route', 0, 100, 10, 0, '%'), number('buffer', 'Crates held in reserve', 0, 80, 10, 0)],
      base: { arrival: .6 }, transfer: { arrival: .3 },
      hints: ['Trace the same missing crate through every business that needs it.', 'An extra van cannot deliver bread the bakery could not make.', 'Hold reserves fixed and add a backup route. Then compare the added deliveries with the extra cost.'],
      takeaway: 'Local efficiency and system resilience are different goals. Shared dependencies can turn one disruption into trouble everywhere.'
    }
  ].map((mission, index) => ({ ...mission, rank: Math.floor(index / 3), number: index + 1 }));
  const assets = [
    { id: 'deli', name: 'Bellafiore Deli', manager: 'Rosa', rank: 0, description: 'The first counter. Prices, batches, and reputation still matter.' },
    { id: 'bakery', name: 'Rosa’s Bakery', manager: 'Nico', rank: 1, description: 'Fresh bread for the block. Inventory and flour costs follow you.' },
    { id: 'delivery', name: 'Vito’s Dispatch', manager: 'Vito', rank: 2, description: 'The route connects the shops. Trust affects the contracts.' },
    { id: 'warehouse', name: 'The Warehouse', manager: 'Lena', rank: 3, description: 'Storage, carrying costs, and interest are now part of every turn.' },
    { id: 'district', name: 'Market Street', manager: 'Rosa', rank: 4, description: 'Workers and neighbors respond to how the family operates.' },
    { id: 'harbor', name: 'Meridian Harbor', manager: 'Mara', rank: 5, description: 'Trade costs and exchange rates reach the whole family.' }
  ];
  const labs = [
    { title: 'The market counter', name: 'Supply & Demand Lab', rank: 0, href: '../../tools/supply-demand/index.html', text: 'Investigate shifts, shortages, taxes, and price controls after the deli shift.', concepts: 'Supply · demand · welfare' },
    { title: 'Market Street', name: 'Invisible Hands', rank: 0, href: '../invisible-hands.html', text: 'See how independent buyers and sellers find a price.', concepts: 'Equilibrium · coordination' },
    { title: 'The back room', name: 'Strategy Studio', rank: 2, href: '../platform.html', text: 'Eight engines for choice, conflict, dynamic strategy, information, auctions, signals, bargaining, and mechanism design.', concepts: 'The full game theory collection' },
    { title: 'The handshake', name: 'Prisoner’s Dilemma', rank: 2, href: '../prisoners-dilemma.html', text: 'Face different partner strategies over repeated rounds. Test what survives a second meeting.', concepts: 'Trust · incentives · repetition' },
    { title: 'The counting room', name: 'Portfolio Lab', rank: 3, href: '../../tools/portfolio/index.html', text: 'Use demo or your own historical data to inspect concentration and shared risk.', concepts: 'Returns · correlation · diversification' },
    { title: 'The rainy-day file', name: 'Scenario Stress Lab', rank: 3, href: '../../tools/scenario/index.html', text: 'Stress a portfolio under explicit assumptions and see which exposures move together.', concepts: 'Shocks · sensitivities · assumptions' },
    { title: 'Across town', name: 'Central Banker', rank: 4, href: '../../games/central-bank.html', text: 'Step into a separate policy simulation to understand the decisions the family has to live with.', concepts: 'Interest rates · policy lags · inflation' },
    { title: 'The family record', name: 'Reports', rank: 5, href: '../../tools/reports/index.html', text: 'Turn saved analysis from the labs into a report. Campaign journal and backup stay in your Ledger.', concepts: 'Evidence · assumptions · explanation' }
  ];
  return { ranks, missions, assets, labs };
});
