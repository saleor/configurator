export const RETRYABLE_TRANSPORT_STATUSES: ReadonlySet<number> = new Set([429, 502, 503, 504]);

const IDEMPOTENT_MUTATION_KEYWORDS = [
  "Update",
  "Delete",
  "BulkUpdate",
  "ChannelListingUpdate",
  "UpdateMetadata",
] as const;

export function isRetryableTransportStatus(status: number): boolean {
  return RETRYABLE_TRANSPORT_STATUSES.has(status);
}

export function isIdempotentMutation(operationName: string | null | undefined): boolean {
  if (!operationName) return false;
  return IDEMPOTENT_MUTATION_KEYWORDS.some((keyword) => operationName.includes(keyword));
}

export type GraphQLOperationKind = "query" | "mutation" | "subscription";

export function shouldRetryOperation(
  operationKind: GraphQLOperationKind | string | undefined,
  operationName: string | null | undefined
): boolean {
  if (operationKind === "query") {
    return true;
  }

  if (operationKind === "mutation") {
    return isIdempotentMutation(operationName);
  }

  return false;
}
