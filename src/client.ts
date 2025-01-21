import { Client, fetchExchange } from "@urql/core";
import { authExchange } from "@urql/exchange-auth";
import { APP_TOKEN, SALEOR_API_URL } from "./env";

const createClient = (token: string) => {
  return new Client({
    url: SALEOR_API_URL,
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

export const graphqlClient = createClient(APP_TOKEN);
