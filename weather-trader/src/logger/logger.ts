export const LOG_LEVELS = ["debug", "info", "warn", "error"] as const;

export type LogLevel = (typeof LOG_LEVELS)[number];

type LogContext = Record<string, unknown>;

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
}

export function isLogLevel(value: string): value is LogLevel {
  return (LOG_LEVELS as readonly string[]).includes(value);
}

export function createLogger(minLevel: LogLevel = "info"): Logger {
  function write(level: LogLevel, message: string, context?: LogContext): void {
    if (LOG_LEVEL_PRIORITY[level] < LOG_LEVEL_PRIORITY[minLevel]) {
      return;
    }

    const event = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(context && Object.keys(context).length > 0 ? { context } : {}),
    };

    const serialized = JSON.stringify(event);
    if (level === "error") {
      console.error(serialized);
      return;
    }

    if (level === "warn") {
      console.warn(serialized);
      return;
    }

    console.log(serialized);
  }

  return {
    debug: (message, context) => write("debug", message, context),
    info: (message, context) => write("info", message, context),
    warn: (message, context) => write("warn", message, context),
    error: (message, context) => write("error", message, context),
  };
}
