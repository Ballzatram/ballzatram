export type PlayerId = string;
export type ActionId = string;

export interface ScenarioDefinition<TParams = Record<string, unknown>> {
  id: string;
  worldId: string;
  labId: string;
  title: string;
  conceptTags: string[];
  parameters: TParams;
  players: Array<{ id: PlayerId; role: string; isAI?: boolean }>;
  informationSets: Array<{ id: string; visibleTo: PlayerId[]; description: string }>;
}

export interface Observation<TPublic = unknown, TPrivate = unknown> {
  playerId: PlayerId;
  publicState: TPublic;
  privateState?: TPrivate;
  legalActions: ActionId[];
}

export interface AgentPolicy<TMemory = unknown> {
  id: string;
  name: string;
  archetype: string;
  chooseAction(observation: Observation, memory: TMemory): Promise<ActionId> | ActionId;
}

export interface TransitionResult<TState = unknown> {
  state: TState;
  payoffs: Record<PlayerId, number>;
  replayFrame: ReplayFrame;
  learningEvents: LearningEvent[];
  isTerminal: boolean;
}

export interface ReplayFrame {
  sequence: number;
  timestamp: string;
  publicState: unknown;
  revealedActions?: Record<PlayerId, ActionId>;
  visualization: Record<string, unknown>;
}

export interface LearningEvent {
  conceptTag: string;
  severity: "info" | "success" | "warning";
  title: string;
  explanation: string;
  counterfactualPrompt?: string;
}

export interface Debrief {
  equilibriumFrame: string;
  mistakeAnalysis: string[];
  counterfactuals: string[];
  nextExperiment: string;
  masterySignals: Record<string, number>;
}

export interface SimulationEngine<TCommand = unknown, TState = unknown> {
  definition: ScenarioDefinition;
  initialState(seed: string): TState;
  observe(state: TState, playerId: PlayerId): Observation;
  transition(state: TState, commands: TCommand[]): TransitionResult<TState>;
  debrief(state: TState): Debrief;
}
