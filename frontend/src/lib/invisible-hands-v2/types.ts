export type GameLayer = "micro" | "macro" | "global";
export type EndState = "Soft Landing" | "Fragile Recovery" | "Stagflation Trap" | "Financial Crisis" | "Trade Breakdown" | "Growth Boom" | "Political Backlash";

export type Stats = Pick<GameState, "inflation"|"unemployment"|"output"|"publicConfidence"|"financialStability"|"currencyStrength"|"supplyStress"|"energyPrice"|"foodPrice"|"tradeBalance"|"marketVolatility"|"policyCredibility"|"fiscalSpace"|"stabilityScore">;

export type ActorVisual = { icon: string; zoneLabel: string; mapRole: string; normalState: string; stressedState: string };
export type Actor = { id:string; name:string; layer:GameLayer; type:string; description:string; stress:number; stats:Record<string,number>; incentives:string[]; respondsTo:string[]; currentStrategy:string; connectedActorIds:string[]; conceptTags:string[]; visual?: ActorVisual };
export type RouteKind = "exports"|"imports"|"strategic-resources"|"energy"|"shipping"|"capital"|"tariff"|"sanction";
export type MapRoute = { id:string; layer:GameLayer; from:string; to:string; label:string; kind:RouteKind; intensityStat?:keyof GameState; stressStat?:keyof GameState };
export type ActionPreview = { affectedActorIds:string[]; affectedRouteIds:string[]; expectedDeltas:Array<{label:string;value:string;direction:"up"|"down"|"mixed"|"neutral"}>; pendingEvents:string[] };

export type GameAction = { id:string; name:string; layer:GameLayer; description:string; upside:string; downside:string; affectedStats:Partial<Record<keyof GameState,number>>; affectedActors:string[]; concept:string; conceptExplanation:string; preview?: ActionPreview };
export type GameEvent = { id:string; turn:number; title:string; body:string; affectedActors:string[]; affectedStats:string[]; severity:"low"|"medium"|"high"; concept?:string };
export type Scenario = { id:string; name:string; briefing:string; objective:string; startingState:Partial<GameState>; recommendedConcepts:string[]; pressureProfile:Partial<Record<keyof GameState,number>> };
export type TurnHistory = { turn:number; layer:GameLayer; actionIds:string[]; statSnapshot:Stats; eventIds:string[] };

export type GameState = { turn:number; layer:GameLayer; scenarioId:string; inflation:number; unemployment:number; output:number; publicConfidence:number; financialStability:number; currencyStrength:number; supplyStress:number; energyPrice:number; foodPrice:number; tradeBalance:number; marketVolatility:number; policyCredibility:number; fiscalSpace:number; stabilityScore:number; selectedActorId?:string; selectedActionIds:string[]; actors:Actor[]; activeEvents:GameEvent[]; history:TurnHistory[]; endState?:EndState };
