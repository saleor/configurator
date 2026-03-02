import { describe, expect, it } from "vitest";
import {
  AttributeNotFoundError,
  InlineAttributeError,
  WrongAttributeTypeError,
} from "./validation-errors";

describe("InlineAttributeError", () => {
  it("formats message with entity type, name, and inline attributes", () => {
    const error = new InlineAttributeError(
      "productTypes",
      "Apparel",
      ["Color", "Size"],
      "productAttributes"
    );
    expect(error.message).toContain('productTypes "Apparel"');
    expect(error.message).toContain("Color, Size");
    expect(error.message).toContain("no longer supported");
  });

  it("returns 3 recovery suggestions", () => {
    const error = new InlineAttributeError(
      "productTypes",
      "Apparel",
      ["Color"],
      "productAttributes"
    );
    const suggestions = error.getRecoverySuggestions();
    expect(suggestions).toHaveLength(3);
    expect(suggestions[0]).toContain("introspect");
    expect(suggestions[1]).toContain("productAttributes");
    expect(suggestions[2]).toContain("attribute");
  });

  it("has correct error code", () => {
    const error = new InlineAttributeError("pageTypes", "Blog", ["Author"], "contentAttributes");
    expect(error.code).toBe("INLINE_ATTRIBUTE_ERROR");
  });
});

describe("AttributeNotFoundError", () => {
  it("formats message with attribute name and expected section", () => {
    const error = new AttributeNotFoundError(
      "Color",
      "productAttributes",
      "productTypes",
      "Apparel"
    );
    expect(error.message).toContain('"Color"');
    expect(error.message).toContain("productAttributes");
    expect(error.message).toContain('productTypes "Apparel"');
  });

  it("does not include 'did you mean' when similarNames is empty", () => {
    const error = new AttributeNotFoundError(
      "Color",
      "productAttributes",
      "productTypes",
      "Apparel",
      []
    );
    const suggestions = error.getRecoverySuggestions();
    expect(suggestions.every((s) => !s.includes("Did you mean"))).toBe(true);
  });

  it("includes 'did you mean' with truncation to 3 for similar names", () => {
    const error = new AttributeNotFoundError(
      "Colr",
      "productAttributes",
      "productTypes",
      "Apparel",
      ["Color", "Colour", "Size", "Material"]
    );
    const suggestions = error.getRecoverySuggestions();
    const didYouMean = suggestions.find((s) => s.includes("Did you mean"));
    expect(didYouMean).toBeDefined();
    // Should truncate to 3 names
    expect(didYouMean).toContain("Color");
    expect(didYouMean).toContain("Colour");
    expect(didYouMean).toContain("Size");
    expect(didYouMean).not.toContain("Material");
  });

  it("has correct error code", () => {
    const error = new AttributeNotFoundError(
      "Color",
      "productAttributes",
      "productTypes",
      "Apparel"
    );
    expect(error.code).toBe("ATTRIBUTE_NOT_FOUND_ERROR");
  });
});

describe("WrongAttributeTypeError", () => {
  it("says 'product attribute' when found in productAttributes", () => {
    const error = new WrongAttributeTypeError(
      "Color",
      "productAttributes",
      "contentAttributes",
      "pageTypes",
      "BlogPost"
    );
    expect(error.message).toContain("product attribute");
    expect(error.message).toContain("not a content attribute");
  });

  it("says 'content attribute' when found in contentAttributes", () => {
    const error = new WrongAttributeTypeError(
      "Author",
      "contentAttributes",
      "productAttributes",
      "productTypes",
      "Apparel"
    );
    expect(error.message).toContain("content attribute");
    expect(error.message).toContain("not a product attribute");
  });

  it("has correct error code", () => {
    const error = new WrongAttributeTypeError(
      "Color",
      "productAttributes",
      "contentAttributes",
      "pageTypes",
      "BlogPost"
    );
    expect(error.code).toBe("WRONG_ATTRIBUTE_TYPE_ERROR");
  });

  it("returns 3 recovery suggestions", () => {
    const error = new WrongAttributeTypeError(
      "Color",
      "productAttributes",
      "contentAttributes",
      "pageTypes",
      "BlogPost"
    );
    const suggestions = error.getRecoverySuggestions();
    expect(suggestions).toHaveLength(3);
  });
});
