import { Client, fetchExchange } from "@urql/core";
import { authExchange } from "@urql/exchange-auth";

export const createClient = (token: string, url: string) => {
  return new Client({
    url,
    requestPolicy: "network-only",
    exchanges: [
      authExchange(async (utils) => {
        return {
          async refreshAuth() {},
          didAuthError(error, _operation) {
            return error.graphQLErrors.some(
              (e) => e.extensions?.code === "FORBIDDEN"
            );
          },
          addAuthToOperation(operation) {
            if (!token) return operation;
            return utils.appendHeaders(operation, {
              Authorization: `Bearer ${token}`,
            });
          },
        };
      }),
      fetchExchange,
    ],
  });
};
