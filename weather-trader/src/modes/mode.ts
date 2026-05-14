export const BOT_MODES = ["disabled", "paper", "backtest", "live"] as const;

export type BotMode = (typeof BOT_MODES)[number];

export function isBotMode(value: string): value is BotMode {
  return (BOT_MODES as readonly string[]).includes(value);
}

export function describeMode(mode: BotMode): string {
  switch (mode) {
    case "disabled":
      return "Bot is configured but will not scan or place simulated orders.";
    case "paper":
      return "Bot may run local analysis and record simulated decisions only.";
    case "backtest":
      return "Bot may replay historical data and record simulated decisions only.";
    case "live":
      return "Live mode skeleton is configured; execution remains gated by strict checks and kill switch.";
  }
}
