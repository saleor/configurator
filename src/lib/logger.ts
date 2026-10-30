import { AsyncLocalStorage } from "node:async_hooks";
import { Logger } from "tslog";
import { isCiOutputMode, isNonInteractiveEnvironment } from "./ci-mode";
import { LOG_LEVEL } from "./env";
import { EnvironmentVariableError } from "./errors/shared";
import { globalLogCollector } from "./json-log-collector";

const silentScope = new AsyncLocalStorage<boolean>();

/** Suppress output only for this operation and its asynchronous descendants. */
export function withoutLogging<T>(run: () => T): T {
  return silentScope.run(true, run);
}

function createLogger() {
  // Map string log levels to numbers as required by tslog
  const logLevelMap = {
    silly: 0,
    trace: 1,
    debug: 2,
    info: 3,
    warn: 4,
    error: 5,
    fatal: 6,
  } as const;

  type LogLevel = keyof typeof logLevelMap;

  // --text overrides automatic/explicit JSON, but GitHub comment output must
  // remain free of logs even with --text (the Action uses this combination).
  const githubCommentOutput = process.argv.some(
    (arg) => arg === "--github-comment" || arg === "--githubComment"
  );
  const machineReadableOutput =
    githubCommentOutput ||
    (!process.argv.includes("--text") && (isCiOutputMode() || isNonInteractiveEnvironment()));
  const mappedLogLevel = logLevelMap[LOG_LEVEL as LogLevel];

  if (mappedLogLevel === undefined) {
    throw new EnvironmentVariableError(
      `Invalid LOG_LEVEL: "${LOG_LEVEL}". Must be one of: ${Object.keys(logLevelMap).join(", ")}`
    );
  }

  const logger = new Logger({
    name: "saleor-configurator",
    type: machineReadableOutput ? "hidden" : "pretty",
    minLevel: mappedLogLevel,
    prettyLogTemplate:
      "{{yyyy}}-{{mm}}-{{dd}} {{hh}}:{{MM}}:{{ss}}:{{ms}} {{logLevelName}} [{{name}}] ",
    prettyLogTimeZone: "local",
    prettyLogStyles: {
      logLevelName: {
        "*": ["bold", "black", "bgWhiteBright", "dim"],
        SILLY: ["bold", "white"],
        TRACE: ["bold", "whiteBright"],
        DEBUG: ["bold", "green"],
        INFO: ["bold", "blue"],
        WARN: ["bold", "yellow"],
        ERROR: ["bold", "red"],
        FATAL: ["bold", "redBright"],
      },
    },
    prettyErrorLoggerNameDelimiter: " ",
    prettyErrorParentNamesSeparator: ":",
    hideLogPositionForProduction: process.env.NODE_ENV === "production",
  });

  // In non-interactive mode, also collect logs for JSON envelope embedding
  if (machineReadableOutput || isNonInteractiveEnvironment()) {
    const levelMap: Record<number, "debug" | "info" | "warn" | "error"> = {
      2: "debug",
      3: "info",
      4: "warn",
      5: "error",
      6: "error",
    };

    logger.attachTransport((logObj) => {
      const level = levelMap[logObj._meta.logLevelId as number];
      if (level) {
        const message =
          logObj[0] && typeof logObj[0] === "string" ? logObj[0] : JSON.stringify(logObj);
        globalLogCollector.add(level, message);
      }
    });
  }

  // Log the current log level on startup
  logger.debug("Logger initialized", { level: LOG_LEVEL });
  return logger;
}

// Lazy construction keeps importing the engine independent of CLI logging settings.
let cliLogger: ReturnType<typeof createLogger> | undefined;
export const logger = new Proxy(
  Object.create(Logger.prototype) as ReturnType<typeof createLogger>,
  {
    get(_target, key) {
      if (silentScope.getStore()) return () => undefined;
      if (Object.hasOwn(_target, key)) return Reflect.get(_target, key);
      cliLogger ??= createLogger();
      const value = Reflect.get(cliLogger, key);
      return typeof value === "function" ? value.bind(cliLogger) : value;
    },
  }
);
