import type { AgentResponse, GameState, PolicyAction } from "./types";

export function runAgentResponses(state: GameState, action: PolicyAction): AgentResponse[] {
  const responses: AgentResponse[] = [];
  const tariffAction = action.id.includes("tariff") || action.id === "steel_import_quota" || action.id === "local_content_requirement";

  if (state.economy.tariffLevel >= 20 || state.economy.retaliationRisk >= 45) {
    responses.push({
      agent: "Eastport",
      tone: "negative",
      message: "Eastport escalates trade warnings and redirects retaliation pressure toward agriculture exports.",
      effects: { economy: { exportAccess: -4, eastportRelationship: -4, retaliationRisk: 5 }, sectors: { agriculture: { output: -3, stress: 7 } } },
    });
  } else if (action.id === "negotiate_with_eastport" || action.id === "reduce_trade_barriers") {
    responses.push({
      agent: "Eastport",
      tone: "positive",
      message: "Eastport reads the move as cooperative and lowers near-term retaliation pressure.",
      effects: { economy: { eastportRelationship: 4, retaliationRisk: -4, exportAccess: 2 } },
    });
  }

  if (tariffAction || action.id === "steel_modernization_subsidy") {
    responses.push({
      agent: "Steel Lobby",
      tone: "positive",
      message: "Steel executives praise the administration and mobilize workers in support.",
      effects: { economy: { approval: 2 }, sectors: { steel: { lobbyPower: 1, stress: -2 } } },
    });
  } else if (action.id === "reduce_trade_barriers" || action.id === "no_action") {
    responses.push({
      agent: "Steel Lobby",
      tone: "negative",
      message: "The steel lobby calls the policy a surrender to foreign producers.",
      effects: { economy: { approval: -2, crisisRisk: 2 }, sectors: { steel: { stress: 4 } } },
    });
  }

  if (tariffAction) {
    responses.push({
      agent: "Auto Sector",
      tone: "negative",
      message: "Auto firms delay hiring plans as steel input costs and sourcing uncertainty rise.",
      effects: { sectors: { autos: { output: -2, stress: 4 } }, economy: { gdpGrowth: -0.1, supplyChainStress: 2 } },
    });
  } else if (action.id === "auto_supply_chain_support" || action.id === "reduce_trade_barriers" || action.id === "negotiate_with_eastport") {
    responses.push({
      agent: "Auto Sector",
      tone: "positive",
      message: "Auto suppliers report better planning visibility and fewer emergency procurement premiums.",
      effects: { sectors: { autos: { stress: -3, output: 1 } }, economy: { supplyChainStress: -2 } },
    });
  }

  if (state.economy.inflation > 5 || state.economy.unemployment > 6.2) {
    responses.push({
      agent: "Consumers / Voters",
      tone: "negative",
      message: "Voters punish the visible combination of expensive essentials and labor-market anxiety.",
      effects: { economy: { approval: -3, welfare: -2, crisisRisk: 2 } },
    });
  } else if (action.id === "worker_adjustment_aid" || action.id === "consumer_rebate") {
    responses.push({
      agent: "Consumers / Voters",
      tone: "positive",
      message: "Households reward visible relief, though analysts ask whether it is temporary or durable.",
      effects: { economy: { approval: 2, welfare: 1 } },
    });
  }

  if (state.economy.inflationExpectations > 4.4 || state.economy.debtToGdp > 78 || state.economy.centralBankCredibility < 52 || state.economy.crisisRisk > 45) {
    responses.push({
      agent: "Markets",
      tone: "negative",
      message: "Markets demand a higher risk premium for inflation, debt, credibility, or crisis risk.",
      effects: { economy: { bondYield: 0.18, equityIndex: -3, marketConfidence: -4, currencyIndex: -1 } },
    });
  } else if (action.id === "negotiate_with_eastport" || action.id === "austerity_package" || action.id === "hawkish_guidance") {
    responses.push({
      agent: "Markets",
      tone: "positive",
      message: "Investors mark down tail risk after a policy move that looks stabilizing or credible.",
      effects: { economy: { bondYield: -0.08, equityIndex: 2, marketConfidence: 3 } },
    });
  }

  const lastAction = state.actionHistory[state.actionHistory.length - 1];
  const contradictsGuidance =
    (lastAction === "hawkish_guidance" && (action.id === "cut_rate" || action.id === "dovish_guidance")) ||
    (lastAction === "dovish_guidance" && (action.id === "hike_rate" || action.id === "hawkish_guidance"));

  if (contradictsGuidance) {
    responses.push({
      agent: "Central Bank Credibility",
      tone: "negative",
      message: "Observers spot a contradiction between recent guidance and action; signaling power weakens.",
      effects: { economy: { centralBankCredibility: -5, inflationExpectations: 0.15 } },
    });
  } else if ((action.id === "hike_rate" || action.id === "hawkish_guidance") && state.economy.inflationExpectations >= 3.3) {
    responses.push({
      agent: "Central Bank Credibility",
      tone: "positive",
      message: "The bank's message and macro conditions line up, making its signal more believable.",
      effects: { economy: { centralBankCredibility: 2, inflationExpectations: -0.08 } },
    });
  }

  return responses;
}
