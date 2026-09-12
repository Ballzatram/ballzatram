declare const panel: {
  open(request: { tool: string; prompt: string; context: unknown }, options?: { connectionOnly?: boolean }): void;
};
export = panel;
