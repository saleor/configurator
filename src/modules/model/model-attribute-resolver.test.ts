import { describe, expect, it, vi } from "vitest";
import type { AttributeOperations } from "../attribute/repository";
import { ModelAttributeResolver } from "./model-attribute-resolver";

const mockAttributeRepo: AttributeOperations = {
  createAttribute: vi.fn(),
  updateAttribute: vi.fn(),
  getAttributesByNames: vi.fn(),
  bulkCreateAttributes: vi.fn(),
  bulkUpdateAttributes: vi.fn(),
};

describe("ModelAttributeResolver", () => {
  it("resolves dropdown and boolean and date as typed payloads", async () => {
    vi.mocked(mockAttributeRepo.getAttributesByNames).mockResolvedValue([
      {
        id: "attr-cat",
        name: "Category",
        inputType: "DROPDOWN",
        choices: { edges: [{ node: { id: "cat-news", name: "News" } }] },
      } as any,
      { id: "attr-featured", name: "Featured", inputType: "BOOLEAN" } as any,
      { id: "attr-date", name: "Published", inputType: "DATE" } as any,
    ]);

    const resolver = new ModelAttributeResolver(mockAttributeRepo);
    const result = await resolver.resolveAttributes({
      Category: "News",
      Featured: "true",
      Published: "2025-01-01",
    });

    expect(result).toContainEqual({ id: "attr-cat", dropdown: { id: "cat-news" } });
    expect(result).toContainEqual({ id: "attr-featured", boolean: true } as any);
    expect(result).toContainEqual({ id: "attr-date", date: "2025-01-01" } as any);
  });
});
