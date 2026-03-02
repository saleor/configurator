import type { Client } from "@urql/core";
import { describe, expect, it, vi } from "vitest";
import { ProductRepository } from "./repository";

const createMockClient = (): Client =>
  ({
    query: vi.fn(),
    mutation: vi.fn(),
    subscribe: vi.fn(),
  }) as unknown as Client;

const buildProductNode = (slug: string) => ({
  id: `id-${slug}`,
  name: `Product ${slug}`,
  slug,
  productType: { id: "pt-1", name: "Book" },
  category: { id: "cat-1", name: "Fiction", slug: "fiction" },
  media: [],
});

describe("ProductRepository", () => {
  it("chunks slug lookup requests at 100 items", async () => {
    const client = createMockClient();
    const repository = new ProductRepository(client);

    const slugs = Array.from({ length: 101 }, (_, i) => `product-${i + 1}`);
    const firstChunkSlugs = slugs.slice(0, 100);
    const secondChunkSlugs = slugs.slice(100);

    const queryMock = vi.mocked(client.query);
    queryMock
      .mockResolvedValueOnce({
        data: {
          products: {
            edges: firstChunkSlugs.map((slug) => ({ node: buildProductNode(slug) })),
          },
        },
      } as any)
      .mockResolvedValueOnce({
        data: {
          products: {
            edges: secondChunkSlugs.map((slug) => ({ node: buildProductNode(slug) })),
          },
        },
      } as any);

    const products = await repository.getProductsBySlugs(slugs);

    expect(queryMock).toHaveBeenCalledTimes(2);
    expect((queryMock.mock.calls[0][1] as { slugs: string[] }).slugs).toHaveLength(100);
    expect((queryMock.mock.calls[1][1] as { slugs: string[] }).slugs).toHaveLength(1);
    expect(products).toHaveLength(101);
  });
});
