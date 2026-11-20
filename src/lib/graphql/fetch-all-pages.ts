import { GraphQLError } from "../errors/graphql";

/** Largest page size Saleor accepts for a connection. */
export const MAX_PAGE_SIZE = 100;

export interface ConnectionPage<TEdge> {
  pageInfo?: { endCursor?: string | null; hasNextPage: boolean } | null;
  edges?: readonly TEdge[] | null;
}

const PAGE_DELAY_MS = 50;

/**
 * Follows a GraphQL connection's cursor until the last page and returns every edge.
 * `fetchPage` receives the cursor to continue from (`null` for the first page) and
 * returns the connection, or null/undefined when there is nothing to read.
 * Throws if Saleor returns a cursor it already returned, which would otherwise loop forever.
 */
export async function fetchAllPages<TEdge>(
  fetchPage: (after: string | null) => Promise<ConnectionPage<TEdge> | null | undefined>,
  startAfter: string | null = null
): Promise<TEdge[]> {
  const edges: TEdge[] = [];
  let after = startAfter;
  const seenCursors = new Set(startAfter ? [startAfter] : []);

  for (;;) {
    const page = await fetchPage(after);
    edges.push(...(page?.edges ?? []));

    if (!page?.pageInfo?.hasNextPage || !page.pageInfo.endCursor) {
      return edges;
    }
    after = page.pageInfo.endCursor;
    if (seenCursors.has(after)) {
      throw new GraphQLError(`Stopped paging: Saleor returned cursor "${after}" again`);
    }
    seenCursors.add(after);

    // Spaces out page requests to avoid rate limiting, like the other paginated fetches.
    await new Promise((resolve) => setTimeout(resolve, PAGE_DELAY_MS));
  }
}
