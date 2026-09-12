declare const client: {
  stageRequest(request: { tool: string; prompt: string; context: unknown }): boolean;
};
export = client;
