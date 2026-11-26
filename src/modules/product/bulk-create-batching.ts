import { logger } from "../../lib/logger";
import { hasResponseWithStatus, isNetworkError } from "../../lib/utils/error-classification";

const DEFAULT_PRODUCT_BULK_BATCH_SIZE = 25;
const PRODUCT_BULK_BATCH_SIZE_ENV = "SALEOR_PRODUCT_BATCH_SIZE";

export const DEFAULT_TIMEOUT_POLL_INTERVAL_MS = 5_000;
export const DEFAULT_TIMEOUT_POLL_DEADLINE_MS = 60_000;

const UNCERTAIN_HTTP_STATUSES: ReadonlySet<number> = new Set([502, 503, 504]);
const TIMEOUT_MESSAGE_PATTERN = /\b(502|503|504)\b|gateway time-?out|timed?\s*out/i;

export interface ProductBulkCreateBatchOptions {
  readonly batchSize?: number;
  readonly pollIntervalMs?: number;
  readonly pollDeadlineMs?: number;
  readonly sleep?: (ms: number) => Promise<void>;
  readonly now?: () => number;
}

export function getProductBulkBatchSize(env: NodeJS.ProcessEnv = process.env): number {
  const raw = env[PRODUCT_BULK_BATCH_SIZE_ENV];
  if (raw === undefined) {
    return DEFAULT_PRODUCT_BULK_BATCH_SIZE;
  }

  const trimmed = raw.trim();
  if (/^\d+$/.test(trimmed)) {
    const parsed = Number.parseInt(trimmed, 10);
    if (parsed > 0) {
      return parsed;
    }
  }

  logger.warn(
    `Invalid positive integer "${raw}" for ${PRODUCT_BULK_BATCH_SIZE_ENV}, using default ${DEFAULT_PRODUCT_BULK_BATCH_SIZE}`
  );
  return DEFAULT_PRODUCT_BULK_BATCH_SIZE;
}

export function splitIntoBatches<T>(items: readonly T[], batchSize: number): T[][] {
  const size = Math.max(1, Math.floor(batchSize));
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    batches.push(items.slice(i, i + size));
  }
  return batches;
}

/**
 * Returns true when a bulk-create failure left the server outcome uncertain
 * (e.g. Saleor Cloud's 30s gateway 504 or a dropped connection), meaning Saleor
 * may still commit the transaction in the background and we must check by slug
 * before deciding whether to resend.
 */
export function isUncertainBulkCreateError(error: unknown): boolean {
  if (hasResponseWithStatus(error) && UNCERTAIN_HTTP_STATUSES.has(error.response.status)) {
    return true;
  }

  if (isNetworkError(error)) {
    return true;
  }

  if (error instanceof Error && TIMEOUT_MESSAGE_PATTERN.test(error.message)) {
    return true;
  }

  return false;
}
