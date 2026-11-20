type Variables = Record<string, unknown>;
type PayloadError = { field?: string | null; message?: string | null };

/**
 * Reads Saleor directly, independent of the CLI under test. Throws on GraphQL errors and on
 * any mutation payload `errors`, which Saleor reports as data rather than as a failure.
 */
export async function gql<T>(
  apiUrl: string,
  query: string,
  variables: Variables = {},
  token?: string
): Promise<T> {
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
  });
  const body = (await response.json()) as { data?: T; errors?: { message: string }[] };
  if (!response.ok || body.errors?.length || !body.data) {
    throw new Error(`Saleor request failed (${response.status}): ${JSON.stringify(body.errors)}`);
  }
  const payloadErrors = Object.entries(body.data as Record<string, unknown>).flatMap(
    ([name, payload]) => {
      const errors = (payload as { errors?: PayloadError[] } | null)?.errors ?? [];
      return errors.map((error) => `${name}: ${error.field ?? ""} ${error.message ?? ""}`);
    }
  );
  if (payloadErrors.length > 0) {
    throw new Error(`Saleor mutation failed: ${payloadErrors.join("; ")}`);
  }
  return body.data;
}
