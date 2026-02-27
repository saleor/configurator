import Bottleneck from "bottleneck";
import { logger } from "../logger";
import { delay } from "../utils/resilience";

const DEFAULT_MAX_CONCURRENCY = 4;
const DEFAULT_INTERVAL_CAP = 20;
const DEFAULT_INTERVAL_MS = 1000;
const DEFAULT_FALLBACK_COOLDOWN_MS = 3000;
const MAX_COOLDOWN_WAIT_MS = 600_000; // 10 minutes absolute maximum

function parseBoolean(value: string | undefined, defaultValue: boolean, envName?: string): boolean {
  if (value === undefined) return defaultValue;
  const normalized = value.trim().toLowerCase();
  if (normalized === "1" || normalized === "true" || normalized === "yes") return true;
  if (normalized === "0" || normalized === "false" || normalized === "no") return false;
  if (envName) {
    logger.warn(`Invalid boolean value "${value}" for ${envName}, using default ${defaultValue}`);
  }
  return defaultValue;
}

function parsePositiveInteger(
  value: string | undefined,
  defaultValue: number,
  envName?: string
): number {
  if (value === undefined) return defaultValue;
  const parsed = Number.parseInt(value, 10);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  if (envName) {
    logger.warn(
      `Invalid positive integer "${value}" for ${envName}, using default ${defaultValue}`
    );
  }
  return defaultValue;
}

function parseNonNegativeInteger(
  value: string | undefined,
  defaultValue: number,
  envName?: string
): number {
  if (value === undefined) return defaultValue;
  const parsed = Number.parseInt(value, 10);
  if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  if (envName) {
    logger.warn(
      `Invalid non-negative integer "${value}" for ${envName}, using default ${defaultValue}`
    );
  }
  return defaultValue;
}

export interface GraphQLGovernorConfig {
  readonly enabled: boolean;
  readonly maxConcurrent: number;
  readonly intervalCap: number;
  readonly intervalMs: number;
  readonly fallbackCooldownMs: number;
}

export interface GraphQLGovernorStats {
  readonly queued: number;
  readonly running: number;
  readonly cooldownMs: number;
}

export function getGraphQLGovernorConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env
): GraphQLGovernorConfig {
  return {
    enabled: parseBoolean(env.GRAPHQL_GOVERNOR_ENABLED, true, "GRAPHQL_GOVERNOR_ENABLED"),
    maxConcurrent: parsePositiveInteger(
      env.GRAPHQL_MAX_CONCURRENCY,
      DEFAULT_MAX_CONCURRENCY,
      "GRAPHQL_MAX_CONCURRENCY"
    ),
    intervalCap: parsePositiveInteger(
      env.GRAPHQL_INTERVAL_CAP,
      DEFAULT_INTERVAL_CAP,
      "GRAPHQL_INTERVAL_CAP"
    ),
    intervalMs: parsePositiveInteger(
      env.GRAPHQL_INTERVAL_MS,
      DEFAULT_INTERVAL_MS,
      "GRAPHQL_INTERVAL_MS"
    ),
    fallbackCooldownMs: parseNonNegativeInteger(
      env.GRAPHQL_FALLBACK_COOLDOWN_MS,
      DEFAULT_FALLBACK_COOLDOWN_MS,
      "GRAPHQL_FALLBACK_COOLDOWN_MS"
    ),
  };
}

export class GraphQLGovernor {
  private readonly limiter: Bottleneck | null;
  private cooldownUntilMs = 0;
  private queuedCount = 0;
  private runningCount = 0;

  constructor(private readonly config: GraphQLGovernorConfig) {
    this.limiter = config.enabled
      ? new Bottleneck({
          maxConcurrent: config.maxConcurrent,
          minTime: 0,
          reservoir: config.intervalCap,
          reservoirRefreshAmount: config.intervalCap,
          reservoirRefreshInterval: config.intervalMs,
        })
      : null;
  }

  async schedule<T>(fn: () => Promise<T>): Promise<T> {
    if (!this.config.enabled || !this.limiter) {
      return fn();
    }

    let started = false;
    this.queuedCount++;

    return this.limiter
      .schedule(async () => {
        started = true;
        this.queuedCount = Math.max(0, this.queuedCount - 1);
        await this.waitForCooldown();
        this.runningCount++;

        try {
          return await fn();
        } finally {
          this.runningCount = Math.max(0, this.runningCount - 1);
        }
      })
      .catch((error) => {
        if (!started) {
          this.queuedCount = Math.max(0, this.queuedCount - 1);
        }
        throw error;
      });
  }

  registerRateLimit(retryAfterMs: number | null): void {
    if (!this.config.enabled) return;

    const requestedCooldownMs = retryAfterMs ?? this.config.fallbackCooldownMs;
    const normalizedCooldownMs = Math.max(0, requestedCooldownMs);

    if (normalizedCooldownMs === 0) return;

    const cooldownUntilMs = Date.now() + normalizedCooldownMs;
    if (cooldownUntilMs > this.cooldownUntilMs) {
      this.cooldownUntilMs = cooldownUntilMs;
    }

    logger.warn("GraphQL governor cooldown updated", {
      retryAfterMs,
      appliedCooldownMs: normalizedCooldownMs,
      cooldownMs: this.getCooldownRemainingMs(),
      queued: this.queuedCount,
      running: this.runningCount,
    });
  }

  getCooldownRemainingMs(): number {
    return Math.max(0, this.cooldownUntilMs - Date.now());
  }

  getStats(): GraphQLGovernorStats {
    return {
      queued: this.queuedCount,
      running: this.runningCount,
      cooldownMs: this.getCooldownRemainingMs(),
    };
  }

  async stop(): Promise<void> {
    if (!this.limiter) return;
    await this.limiter.disconnect(false);
  }

  private async waitForCooldown(): Promise<void> {
    const startedAt = Date.now();

    while (true) {
      const remainingMs = this.getCooldownRemainingMs();
      if (remainingMs <= 0) {
        return;
      }

      const elapsed = Date.now() - startedAt;
      if (elapsed > MAX_COOLDOWN_WAIT_MS) {
        throw new Error(
          `Governor cooldown exceeded maximum wait time of ${MAX_COOLDOWN_WAIT_MS}ms (elapsed: ${elapsed}ms, remaining cooldown: ${remainingMs}ms). API is persistently rate-limiting requests.`
        );
      }

      logger.debug(`Waiting ${remainingMs}ms for governor cooldown`, {
        elapsed,
        remainingMs,
      });
      await delay(remainingMs);
    }
  }
}
