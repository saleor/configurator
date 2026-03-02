import { beforeEach, describe, expect, it } from "vitest";
import { AttributeCache, type CachedAttribute, cachedToResolverAttribute } from "./attribute-cache";

describe("AttributeCache", () => {
  let cache: AttributeCache;

  const sampleProductAttributes: CachedAttribute[] = [
    {
      id: "attr1",
      name: "Publisher",
      slug: "publisher",
      inputType: "PLAIN_TEXT",
      entityType: null,
      choices: [],
    },
    {
      id: "attr2",
      name: "Genre",
      slug: "genre",
      inputType: "DROPDOWN",
      entityType: null,
      choices: [],
    },
    {
      id: "attr3",
      name: "Condition",
      slug: "condition",
      inputType: "DROPDOWN",
      entityType: null,
      choices: [],
    },
  ];

  const sampleContentAttributes: CachedAttribute[] = [
    {
      id: "attr4",
      name: "Author",
      slug: "author",
      inputType: "PLAIN_TEXT",
      entityType: null,
      choices: [],
    },
    {
      id: "attr5",
      name: "Scent Family",
      slug: "scent-family",
      inputType: "DROPDOWN",
      entityType: null,
      choices: [],
    },
  ];

  beforeEach(() => {
    cache = new AttributeCache();
  });

  describe("populate", () => {
    it("should populate product attributes", () => {
      cache.populateProductAttributes(sampleProductAttributes);

      expect(cache.hasProductAttribute("Publisher")).toBe(true);
      expect(cache.hasProductAttribute("Genre")).toBe(true);
      expect(cache.hasProductAttribute("Condition")).toBe(true);
    });

    it("should populate content attributes", () => {
      cache.populateContentAttributes(sampleContentAttributes);

      expect(cache.hasContentAttribute("Author")).toBe(true);
      expect(cache.hasContentAttribute("Scent Family")).toBe(true);
    });

    it("should support multiple populate calls (appends)", () => {
      cache.populateProductAttributes([sampleProductAttributes[0]]);
      cache.populateProductAttributes([sampleProductAttributes[1]]);

      expect(cache.hasProductAttribute("Publisher")).toBe(true);
      expect(cache.hasProductAttribute("Genre")).toBe(true);
    });
  });

  describe("lookup", () => {
    beforeEach(() => {
      cache.populateProductAttributes(sampleProductAttributes);
      cache.populateContentAttributes(sampleContentAttributes);
    });

    it("should return attribute by name for product attributes", () => {
      const attr = cache.getProductAttribute("Publisher");

      expect(attr).toBeDefined();
      expect(attr?.id).toBe("attr1");
      expect(attr?.name).toBe("Publisher");
      expect(attr?.slug).toBe("publisher");
      expect(attr?.inputType).toBe("PLAIN_TEXT");
    });

    it("should return attribute by name for content attributes", () => {
      const attr = cache.getContentAttribute("Author");

      expect(attr).toBeDefined();
      expect(attr?.id).toBe("attr4");
      expect(attr?.name).toBe("Author");
    });

    it("should return undefined for non-existent product attribute", () => {
      const attr = cache.getProductAttribute("NonExistent");
      expect(attr).toBeUndefined();
    });

    it("should return undefined for non-existent content attribute", () => {
      const attr = cache.getContentAttribute("NonExistent");
      expect(attr).toBeUndefined();
    });

    it("should not find product attribute in content section", () => {
      expect(cache.getContentAttribute("Publisher")).toBeUndefined();
    });

    it("should not find content attribute in product section", () => {
      expect(cache.getProductAttribute("Author")).toBeUndefined();
    });
  });

  describe("findAttributeInWrongSection", () => {
    beforeEach(() => {
      cache.populateProductAttributes(sampleProductAttributes);
      cache.populateContentAttributes(sampleContentAttributes);
    });

    it("should find content attribute when looking for product attribute", () => {
      const result = cache.findAttributeInWrongSection("Author", "product");

      expect(result.found).toBe(true);
      if (result.found) {
        expect(result.actualSection).toBe("content");
        expect(result.attribute.name).toBe("Author");
      }
    });

    it("should find product attribute when looking for content attribute", () => {
      const result = cache.findAttributeInWrongSection("Publisher", "content");

      expect(result.found).toBe(true);
      if (result.found) {
        expect(result.actualSection).toBe("product");
        expect(result.attribute.name).toBe("Publisher");
      }
    });

    it("should return found=false when attribute does not exist in either section", () => {
      const result = cache.findAttributeInWrongSection("NonExistent", "product");

      expect(result.found).toBe(false);
    });

    it("should return found=false when attribute is in correct section", () => {
      // Looking for "Publisher" in wrong section (content), but it's actually in product
      // The method should only return found=true if it's in the OTHER section
      const result = cache.findAttributeInWrongSection("Publisher", "product");

      // Publisher is in product section, so when we look in content (wrong section)
      // we should not find it
      expect(result.found).toBe(false);
    });
  });

  describe("getStats", () => {
    it("should return correct counts for empty cache", () => {
      const stats = cache.getStats();

      expect(stats.productAttributeCount).toBe(0);
      expect(stats.contentAttributeCount).toBe(0);
      expect(stats.totalCount).toBe(0);
    });

    it("should return correct counts after populating", () => {
      cache.populateProductAttributes(sampleProductAttributes);
      cache.populateContentAttributes(sampleContentAttributes);

      const stats = cache.getStats();

      expect(stats.productAttributeCount).toBe(3);
      expect(stats.contentAttributeCount).toBe(2);
      expect(stats.totalCount).toBe(5);
    });
  });

  describe("clear", () => {
    it("should clear all cached data", () => {
      cache.populateProductAttributes(sampleProductAttributes);
      cache.populateContentAttributes(sampleContentAttributes);

      cache.clear();

      expect(cache.hasProductAttribute("Publisher")).toBe(false);
      expect(cache.hasContentAttribute("Author")).toBe(false);
      expect(cache.getStats().totalCount).toBe(0);
    });
  });

  describe("getAllAttributeNames", () => {
    beforeEach(() => {
      cache.populateProductAttributes(sampleProductAttributes);
      cache.populateContentAttributes(sampleContentAttributes);
    });

    it("should return all product attribute names", () => {
      const names = cache.getAllProductAttributeNames();

      expect(names).toContain("Publisher");
      expect(names).toContain("Genre");
      expect(names).toContain("Condition");
      expect(names).toHaveLength(3);
    });

    it("should return all content attribute names", () => {
      const names = cache.getAllContentAttributeNames();

      expect(names).toContain("Author");
      expect(names).toContain("Scent Family");
      expect(names).toHaveLength(2);
    });
  });
});

describe("cachedToResolverAttribute", () => {
  it("should convert cached attribute with choices to resolver shape", () => {
    const cached: CachedAttribute = {
      id: "attr2",
      name: "Genre",
      slug: "genre",
      inputType: "DROPDOWN",
      entityType: null,
      choices: [
        { id: "genre-fiction", name: "Fiction", value: "fiction" },
        { id: "genre-nonfiction", name: "Non-Fiction", value: "nonfiction" },
      ],
    };
    const result = cachedToResolverAttribute(cached);
    expect(result.id).toBe("attr2");
    expect(result.name).toBe("Genre");
    expect(result.inputType).toBe("DROPDOWN");
    expect(result.entityType).toBeNull();
    expect(result.choices?.edges).toHaveLength(2);
    expect(result.choices?.edges?.[0].node.id).toBe("genre-fiction");
  });

  it("should convert cached attribute with entityType for references", () => {
    const cached: CachedAttribute = {
      id: "attr-ref",
      name: "Related Product",
      slug: "related-product",
      inputType: "REFERENCE",
      entityType: "PRODUCT",
      choices: [],
    };
    const result = cachedToResolverAttribute(cached);
    expect(result.entityType).toBe("PRODUCT");
  });

  it("should handle empty choices array", () => {
    const cached: CachedAttribute = {
      id: "attr1",
      name: "Publisher",
      slug: "publisher",
      inputType: "PLAIN_TEXT",
      entityType: null,
      choices: [],
    };
    const result = cachedToResolverAttribute(cached);
    expect(result.choices?.edges).toHaveLength(0);
  });
});
