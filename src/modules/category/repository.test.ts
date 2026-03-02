import type { Client } from "@urql/core";
import { describe, expect, it, vi } from "vitest";
import { CategoryRepository } from "./repository";

const createMockClient = (): Client =>
  ({
    query: vi.fn(),
    mutation: vi.fn(),
    subscribe: vi.fn(),
  }) as unknown as Client;

describe("CategoryRepository", () => {
  it("paginates getAllCategories and caches the complete result", async () => {
    const client = createMockClient();
    const repository = new CategoryRepository(client);

    const queryMock = vi.mocked(client.query);
    queryMock
      .mockResolvedValueOnce({
        data: {
          categories: {
            edges: [
              {
                node: { id: "cat-1", name: "Cat 1", slug: "cat-1", level: 0, parent: null },
              },
            ],
            pageInfo: { hasNextPage: true, endCursor: "cursor-1" },
          },
        },
      } as any)
      .mockResolvedValueOnce({
        data: {
          categories: {
            edges: [
              {
                node: { id: "cat-2", name: "Cat 2", slug: "cat-2", level: 0, parent: null },
              },
            ],
            pageInfo: { hasNextPage: false, endCursor: null },
          },
        },
      } as any);

    const first = await repository.getAllCategories();
    const second = await repository.getAllCategories();

    expect(first).toHaveLength(2);
    expect(second).toHaveLength(2);
    expect(queryMock).toHaveBeenCalledTimes(2);
    expect(queryMock.mock.calls[0][1]).toEqual({ after: null });
    expect(queryMock.mock.calls[1][1]).toEqual({ after: "cursor-1" });
  });

  it("does not short-circuit slug lookup when cache exists but is incomplete", async () => {
    const client = createMockClient();
    const repository = new CategoryRepository(client);

    (repository as any).allCategoriesCache = [];
    (repository as any).allCategoriesCacheComplete = false;

    vi.mocked(client.query).mockResolvedValue({
      data: {
        category: { id: "cat-3", name: "Cat 3", slug: "cat-3", level: 0, parent: null },
      },
    } as any);

    const category = await repository.getCategoryBySlug("cat-3");

    expect(category?.slug).toBe("cat-3");
    expect(client.query).toHaveBeenCalledTimes(1);
  });
});
