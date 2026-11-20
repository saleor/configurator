import { describe, expect, it, vi } from "vitest";
import { fetchAllPages } from "./fetch-all-pages";

describe("fetchAllPages", () => {
  it("follows the cursor until the last page", async () => {
    const fetchPage = vi.fn(async (after: string | null) => {
      if (after === null) {
        return { pageInfo: { endCursor: "c1", hasNextPage: true }, edges: [1, 2] };
      }
      if (after === "c1") {
        return { pageInfo: { endCursor: "c2", hasNextPage: true }, edges: [3] };
      }
      return { pageInfo: { endCursor: null, hasNextPage: false }, edges: [4] };
    });

    await expect(fetchAllPages(fetchPage)).resolves.toEqual([1, 2, 3, 4]);
    expect(fetchPage.mock.calls.map(([after]) => after)).toEqual([null, "c1", "c2"]);
  });

  it("continues from the given cursor", async () => {
    const fetchPage = vi.fn(async () => ({
      pageInfo: { endCursor: null, hasNextPage: false },
      edges: ["rest"],
    }));

    await expect(fetchAllPages(fetchPage, "c9")).resolves.toEqual(["rest"]);
    expect(fetchPage).toHaveBeenCalledWith("c9");
  });

  it("returns no edges when the connection is missing", async () => {
    await expect(fetchAllPages(async () => null)).resolves.toEqual([]);
  });

  it("fails when a page returns a cursor it already returned", async () => {
    const fetchPage = vi.fn(async (after: string | null) => {
      if (fetchPage.mock.calls.length > 5) throw new Error("kept paging");
      return { pageInfo: { endCursor: after ?? "c1", hasNextPage: true }, edges: [1] };
    });

    await expect(fetchAllPages(fetchPage)).rejects.toThrow('returned cursor "c1" again');
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  it("stops when a page reports more results but no cursor", async () => {
    const fetchPage = vi.fn(async () => ({
      pageInfo: { endCursor: null, hasNextPage: true },
      edges: [1],
    }));

    await expect(fetchAllPages(fetchPage)).resolves.toEqual([1]);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });
});
