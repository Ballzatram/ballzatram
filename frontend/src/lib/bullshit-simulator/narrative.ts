export type NarrativeStats = {
  confidence: number;
  credibility: number;
  bullshitLevel: number;
  snackInventory: number;
};

export type NarrativeState = {
  sceneId: string;
  stats: NarrativeStats;
  visitedSceneIds: string[];
  lastConsequence?: string;
};

export type Consequence = {
  text: string;
  statChanges?: Partial<NarrativeStats>;
  nextSceneId: string;
};

export type Choice = {
  id: string;
  label: string;
  description: string;
  consequence: Consequence;
};

export type Scene = {
  id: string;
  title: string;
  location: string;
  body: string[];
  choices: Choice[];
};

export const initialNarrativeState: NarrativeState = {
  sceneId: "title",
  stats: {
    confidence: 72,
    credibility: 34,
    bullshitLevel: 41,
    snackInventory: 2,
  },
  visitedSceneIds: ["title"],
};

export const bullshitSimulatorScenes: Record<string, Scene> = {
  title: {
    id: "title",
    title: "Bullshit Simulator: Siege of South Gate Mall",
    location: "Emergency broadcast table, probably a pretzel kiosk",
    body: [
      "Playable prototype. First Stoney arc. More nonsense coming later.",
      "South Gate Mall is under siege. The Orange Julius has fallen. The food court is contested territory. Something is wrong near the old Sears.",
      "Stoney Baologna is reporting live despite having no credentials, no producer, and a laminated badge he made in 2009.",
    ],
    choices: [
      {
        id: "begin",
        label: "Begin live coverage",
        description: "Step into the mall and act like this was all part of your plan.",
        consequence: {
          text: "Stoney clears his throat, points at a dead directory screen, and declares the situation 'solvable by confidence alone.'",
          statChanges: { confidence: 5, bullshitLevel: 4 },
          nextSceneId: "food-court",
        },
      },
    ],
  },
  "food-court": {
    id: "food-court",
    title: "The Food Court Is Contested Territory",
    location: "Food court, between a shuttered teriyaki place and a suspicious fountain",
    body: [
      "A crowd has split into factions around the last working soda machine. Nobody agrees who controls the refills.",
      "A handwritten sign says ORANGE JULIUS HAS FALLEN. Someone underlined 'fallen' three times.",
      "Your live audience is six people, one confused mall cop, and a security camera that may or may not be recording.",
    ],
    choices: [
      {
        id: "declare-authority",
        label: "Declare yourself acting mall correspondent",
        description: "Authority is mostly posture plus nouns.",
        consequence: {
          text: "The crowd hesitates. You gain attention, but the mall cop writes 'not a real badge' in a tiny notebook.",
          statChanges: { confidence: 8, credibility: -4, bullshitLevel: 7 },
          nextSceneId: "directory",
        },
      },
      {
        id: "trade-snacks",
        label: "Trade snack inventory for information",
        description: "Spend one snack to learn what moved near the old Sears.",
        consequence: {
          text: "A pretzel witness accepts payment and whispers that the old Sears has been making dial-up noises since dawn.",
          statChanges: { credibility: 6, snackInventory: -1, bullshitLevel: -3 },
          nextSceneId: "old-sears",
        },
      },
      {
        id: "blame-incentives",
        label: "Blame the refill crisis on bad incentives",
        description: "It might even be true, which is dangerous for everyone.",
        consequence: {
          text: "A faction leader nods slowly. You accidentally explain scarcity, then immediately overclaim victory.",
          statChanges: { credibility: 4, confidence: 4, bullshitLevel: 3 },
          nextSceneId: "directory",
        },
      },
    ],
  },
  directory: {
    id: "directory",
    title: "The Directory Lies Politely",
    location: "Mall directory, glowing with discontinued stores",
    body: [
      "The mall map insists there is still a RadioShack, a KB Toys, and a place called Pants Palace II.",
      "Every route to the exit now points back to the old Sears. The directory blinks like it knows something.",
      "Stoney squints and announces that the map is 'directionally correct in the emotional sense.'",
    ],
    choices: [
      {
        id: "interrogate-map",
        label: "Interrogate the directory",
        description: "Ask the machine what it knows, loudly.",
        consequence: {
          text: "The directory emits a coupon for a store that closed twelve years ago. Your audience mistakes this for evidence.",
          statChanges: { credibility: 2, bullshitLevel: 6 },
          nextSceneId: "old-sears",
        },
      },
      {
        id: "invent-shortcut",
        label: "Invent a shortcut through seasonal decor",
        description: "March through the fake snow and hope symbolism counts.",
        consequence: {
          text: "You emerge covered in glitter beside the old Sears. Confidence rises. Credibility suffers structural damage.",
          statChanges: { confidence: 7, credibility: -5, bullshitLevel: 5 },
          nextSceneId: "old-sears",
        },
      },
      {
        id: "pause-broadcast",
        label: "Admit the map is confusing, then rephrase it as strategy",
        description: "Almost honesty, but with plausible deniability.",
        consequence: {
          text: "For one shining second, Stoney acknowledges uncertainty. Then he calls it 'advanced reconnaissance humility.'",
          statChanges: { credibility: 7, confidence: -2, bullshitLevel: -4 },
          nextSceneId: "old-sears",
        },
      },
    ],
  },
  "old-sears": {
    id: "old-sears",
    title: "Something Is Wrong Near The Old Sears",
    location: "Old Sears entrance, behind a barricade made of sale signs",
    body: [
      "The metal gate is half down. Inside, mannequins face the wrong direction. A speaker loops a back-to-school ad from a lost decade.",
      "A red light pulses behind the appliance section. The mall factions have gone quiet.",
      "Your live audience has doubled. Unfortunately, so has your responsibility.",
    ],
    choices: [
      {
        id: "broadcast-confidence",
        label: "Broadcast total confidence",
        description: "If you sound certain enough, maybe causality gets embarrassed.",
        consequence: {
          text: "The feed spikes. The crowd cheers. The red light gets brighter, as if nonsense is feeding it.",
          statChanges: { confidence: 10, credibility: -8, bullshitLevel: 12 },
          nextSceneId: "ending-loud",
        },
      },
      {
        id: "ask-witnesses",
        label: "Ask witnesses what they actually saw",
        description: "A radical experiment in not making things up immediately.",
        consequence: {
          text: "Three accounts conflict, but a pattern emerges: every rumor gets stronger near the old Sears.",
          statChanges: { credibility: 10, confidence: -3, bullshitLevel: -6 },
          nextSceneId: "ending-clearer",
        },
      },
      {
        id: "spend-last-snack",
        label: "Throw a snack into the dark",
        description: "Mall science requires sacrifice.",
        consequence: {
          text: "Something catches the snack. The gate rises six inches. Stoney calls this 'negotiation.'",
          statChanges: { snackInventory: -1, confidence: 4, credibility: 3 },
          nextSceneId: "ending-snack",
        },
      },
    ],
  },
  "ending-loud": {
    id: "ending-loud",
    title: "Ending: The Loud Explanation Wins, Briefly",
    location: "Broadcast table, now surrounded by unpaid interns of chaos",
    body: [
      "Stoney convinces the food court that he has identified the cause: 'a convergence of vibes, weak leadership, and suspicious Sears energy.'",
      "Nobody understands the explanation, but it travels fast. The siege continues. Your ratings are incredible.",
      "Prototype end. You survived by increasing the bullshit layer.",
    ],
    choices: [
      {
        id: "restart",
        label: "Restart the prototype",
        description: "Return to the title screen with a fresh snack budget.",
        consequence: {
          text: "Stoney resets the broadcast and denies that any previous version happened.",
          nextSceneId: "title",
        },
      },
    ],
  },
  "ending-clearer": {
    id: "ending-clearer",
    title: "Ending: The Truth Gets A Mall Map",
    location: "Old Sears threshold",
    body: [
      "You do not solve the siege, but you identify the system: rumors intensify where information is scarce and incentives are weird.",
      "Stoney immediately claims this was his theory from the beginning. The crowd is too tired to argue.",
      "Prototype end. You lowered the bullshit layer without completely destroying Stoney's brand.",
    ],
    choices: [
      {
        id: "restart",
        label: "Restart the prototype",
        description: "Return to the title screen with a fresh snack budget.",
        consequence: {
          text: "Stoney resets the broadcast and calls it a peer-reviewed do-over.",
          nextSceneId: "title",
        },
      },
    ],
  },
  "ending-snack": {
    id: "ending-snack",
    title: "Ending: Snack Diplomacy Opens A Gate",
    location: "Old Sears entrance, six inches closer to disaster",
    body: [
      "The gate rises just enough to reveal a trail of receipts, broken hangers, and one perfectly preserved pretzel wrapper.",
      "Whatever is inside accepts snacks. This is not reassuring, but it is a mechanic.",
      "Prototype end. More nonsense coming later.",
    ],
    choices: [
      {
        id: "restart",
        label: "Restart the prototype",
        description: "Return to the title screen with a fresh snack budget.",
        consequence: {
          text: "Stoney resets the broadcast and pockets an emergency pretzel.",
          nextSceneId: "title",
        },
      },
    ],
  },
};

export function applyConsequence(state: NarrativeState, consequence: Consequence): NarrativeState {
  if (consequence.nextSceneId === "title") {
    return {
      ...initialNarrativeState,
      lastConsequence: consequence.text,
    };
  }

  const nextStats = { ...state.stats };
  Object.entries(consequence.statChanges ?? {}).forEach(([key, change]) => {
    const statKey = key as keyof NarrativeStats;
    nextStats[statKey] = Math.max(0, Math.min(100, nextStats[statKey] + (change ?? 0)));
  });

  return {
    sceneId: consequence.nextSceneId,
    stats: nextStats,
    visitedSceneIds: [...new Set([...state.visitedSceneIds, consequence.nextSceneId])],
    lastConsequence: consequence.text,
  };
}
