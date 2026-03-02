import { describe, expect, it } from "vitest";
import { AttributeCache } from "../attribute/attribute-cache";
import { ModelAttributeResolver } from "./model-attribute-resolver";

describe("ModelAttributeResolver", () => {
  it("resolves dropdown, boolean, and date from cache", async () => {
    const cache = new AttributeCache();
    cache.populateContentAttributes([
      {
        id: "attr-cat",
        name: "Category",
        slug: "category",
        inputType: "DROPDOWN",
        entityType: null,
        choices: [{ id: "cat-news", name: "News", value: "news" }],
      },
      {
        id: "attr-featured",
        name: "Featured",
        slug: "featured",
        inputType: "BOOLEAN",
        entityType: null,
        choices: [],
      },
      {
        id: "attr-date",
        name: "Published",
        slug: "published",
        inputType: "DATE",
        entityType: null,
        choices: [],
      },
    ]);

    const resolver = new ModelAttributeResolver(cache);
    const result = await resolver.resolveAttributes({
      Category: "News",
      Featured: "true",
      Published: "2025-01-01",
    });

    expect(result).toContainEqual({ id: "attr-cat", dropdown: { id: "cat-news" } });
    expect(result).toContainEqual(expect.objectContaining({ id: "attr-featured", boolean: true }));
    expect(result).toContainEqual(
      expect.objectContaining({ id: "attr-date", date: "2025-01-01" })
    );
  });

  it("throws when attribute is not in cache", async () => {
    const cache = new AttributeCache();
    cache.populateContentAttributes([]); // empty

    const resolver = new ModelAttributeResolver(cache);
    await expect(resolver.resolveAttributes({ Missing: "value" })).rejects.toThrow(
      /not found in attribute cache/i
    );
  });
});
