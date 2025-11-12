import { Client, fetchExchange } from "@urql/core";
import { authExchange } from "@urql/exchange-auth";
import { retryExchange } from "@urql/exchange-retry";
import { logger } from "../logger";

export const createClient = (token: string, url: string) => {
  return new Client({
    url,
    requestPolicy: "network-only",
    exchanges: [
      authExchange(async (utils) => {
        return {
          async refreshAuth() {},
          didAuthError(error, _operation) {
            return error.graphQLErrors.some((e) => e.extensions?.code === "FORBIDDEN");
          },
          addAuthToOperation(operation) {
            if (!token) return operation;
            return utils.appendHeaders(operation, {
              Authorization: `Bearer ${token}`,
            });
          },
        };
      }),
      // Add retry exchange for handling rate limiting and network errors
      retryExchange({
        initialDelayMs: 1000,
        maxDelayMs: 15000,
        randomDelay: true,
        maxNumberAttempts: 3,
        retryIf: (error, operation) => {
          // Check for rate limiting (429 status)
          if (error && "response" in error && error.response?.status === 429) {
            logger.warn(`Rate limited on operation ${operation.kind}, retrying...`);
            return true;
          }

          // Check for network errors
          if (error && "networkError" in error && error.networkError) {
            logger.warn(`Network error on operation ${operation.kind}, retrying...`);
            return true;
          }

          // Check for specific GraphQL errors that indicate rate limiting
          if (
            error?.graphQLErrors?.some(
              (e) =>
                e.message?.toLowerCase().includes("too many requests") ||
                e.extensions?.code === "TOO_MANY_REQUESTS"
            )
          ) {
            logger.warn(`GraphQL rate limit error on operation ${operation.kind}, retrying...`);
            return true;
          }

          return false;
        },
      }),
      fetchExchange,
    ],
  });
};
