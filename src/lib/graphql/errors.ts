import type { CombinedError } from "@urql/core";

type GraphQLError = NonNullable<CombinedError["graphQLErrors"]>[number] & {
  extensions?: {
    exception?: {
      code?: string;
    };
  };
};

function formatPermissionError(error: GraphQLError): string {
  const path = error.path?.join(".") ?? "unknown path";
  const requiredPermissions = error.message.match(/permissions: (.+)$/)?.[1];
  return `Missing permissions for ${path}. Required: ${requiredPermissions}`;
}

function getErrorsByCode(error: CombinedError, code: string): GraphQLError[] {
  return (error.graphQLErrors as GraphQLError[]).filter(
    (error) => error.extensions?.exception?.code === code
  );
}

class PermissionDeniedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PermissionDeniedError";
  }
}

export function handleGraphQLErrors(error: CombinedError): never {
  const permissionErrors = getErrorsByCode(error, "PermissionDenied");
  if (permissionErrors.length > 0) {
    throw new PermissionDeniedError(
      permissionErrors.map(formatPermissionError).join("\n")
    );
  }

  throw new Error(error.graphQLErrors.map((error) => error.message).join("\n"));
}
