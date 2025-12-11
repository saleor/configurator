import { Logger } from "tslog";
import { isCiOutputMode } from "./ci-mode";
import { LOG_LEVEL } from "./env";
import { EnvironmentVariableError } from "./errors/shared";

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

// In CI output mode, suppress all logs for clean output
const effectiveLogLevel = isCiOutputMode() ? "fatal" : LOG_LEVEL;
const mappedLogLevel = logLevelMap[effectiveLogLevel as LogLevel];

if (mappedLogLevel === undefined) {
  throw new EnvironmentVariableError(
    `Invalid LOG_LEVEL: "${LOG_LEVEL}". Must be one of: ${Object.keys(logLevelMap).join(", ")}`
  );
}

export const logger = new Logger({
  name: "saleor-configurator",
  type: "pretty",
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

// Log the current log level on startup
logger.debug("Logger initialized", { level: LOG_LEVEL });
